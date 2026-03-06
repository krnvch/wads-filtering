import type {
  Token,
  TokenError,
} from "@/types/tokens";
import {
  isChipToken,
  isConnectorToken,
  isOpenParen,
  isCloseParen,
  isOrToken,
  isAndToken,
  UNARY_OPERATORS,
} from "@/types/tokens";
import { getFieldByKey } from "./filter-schema";
import { isValidIpValue } from "./ip-utils";

/**
 * Validate a token sequence and return a new array with `error` fields populated.
 * Does NOT mutate the input — returns a new array.
 *
 * Runs ALL validation rules (eager + deferred). Use `validateTokensEager` for
 * per-token errors that should show immediately, and `validateTokensDeferred`
 * for group-level errors that should only show on search initiation.
 */
export function validateTokens(tokens: Token[]): Token[] {
  if (tokens.length === 0) return [];
  const result = cloneAndClear(tokens);
  runEagerChecks(result);
  runDeferredChecks(result);
  return result;
}

/**
 * Eager validation — runs on every token change.
 * Catches: consecutive connectors, missing connectors, chip validity (field/operator/values/enum/ip).
 */
export function validateTokensEager(tokens: Token[]): Token[] {
  if (tokens.length === 0) return [];
  const result = cloneAndClear(tokens);
  runEagerChecks(result);
  return result;
}

/**
 * Deferred validation — runs only when search is initiated.
 * Catches: top-level OR, unbalanced parens, empty/single-child groups.
 * Should be applied ON TOP of eager-validated tokens.
 */
export function validateTokensDeferred(tokens: Token[]): Token[] {
  if (tokens.length === 0) return [];
  // Don't clone again — caller passes already-cloned eager tokens
  const result = tokens.map((t) => ({ ...t }));
  runDeferredChecks(result);
  return result;
}

function cloneAndClear(tokens: Token[]): Token[] {
  const result: Token[] = tokens.map((t) => ({ ...t }));
  for (const t of result) {
    delete t.error;
  }
  return result;
}

function runEagerChecks(result: Token[]): void {
  // Consecutive connectors
  checkConsecutiveConnectors(result);
  // Missing connectors between operands
  checkMissingConnectors(result);
  // Chip field/operator/value validity
  checkChipValidity(result);
}

function runDeferredChecks(result: Token[]): void {
  // Top-level OR
  checkTopLevelOr(result);
  // Unbalanced parens
  checkUnbalancedParens(result);
  // Empty/single-child groups
  checkGroupContent(result);
}

function setError(token: Token, error: TokenError): void {
  // Only set first error per token
  if (!token.error) {
    token.error = error;
  }
}

function checkTopLevelOr(tokens: Token[]): void {
  let depth = 0;
  for (const token of tokens) {
    if (isOpenParen(token)) {
      depth++;
    } else if (isCloseParen(token)) {
      depth = Math.max(0, depth - 1);
    } else if (isOrToken(token) && depth === 0) {
      setError(token, {
        code: "TOP_LEVEL_OR",
        message: "OR is not allowed at top level. Wrap in parentheses or use AND.",
      });
    }
  }
}

function checkUnbalancedParens(tokens: Token[]): void {
  const openStack: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (isOpenParen(token)) {
      openStack.push(i);
    } else if (isCloseParen(token)) {
      if (openStack.length === 0) {
        setError(token, {
          code: "UNBALANCED_PAREN",
          message: "Closing parenthesis has no matching opening parenthesis.",
        });
      } else {
        openStack.pop();
      }
    }
  }

  // Mark unmatched open parens
  for (const idx of openStack) {
    setError(tokens[idx], {
      code: "UNBALANCED_PAREN",
      message: "Opening parenthesis has no matching closing parenthesis.",
    });
  }
}

function checkConsecutiveConnectors(tokens: Token[]): void {
  for (let i = 1; i < tokens.length; i++) {
    if (isConnectorToken(tokens[i]) && isConnectorToken(tokens[i - 1])) {
      setError(tokens[i], {
        code: "CONSECUTIVE_CONNECTOR",
        message: "Two connectors cannot appear in a row.",
      });
    }
  }
}

function isOperand(token: Token): boolean {
  return isChipToken(token) || isCloseParen(token);
}

function isOperandStart(token: Token): boolean {
  return isChipToken(token) || isOpenParen(token);
}

function checkMissingConnectors(tokens: Token[]): void {
  for (let i = 1; i < tokens.length; i++) {
    if (isOperand(tokens[i - 1]) && isOperandStart(tokens[i])) {
      const error: TokenError = {
        code: "MISSING_CONNECTOR",
        message: "Missing operator between filters. Add AND or OR.",
      };
      setError(tokens[i - 1], error);
      setError(tokens[i], { ...error });
    }
  }
}

function checkLeadingConnector(tokens: Token[]): void {
  // Check start of sequence
  if (tokens.length > 0 && isConnectorToken(tokens[0])) {
    setError(tokens[0], {
      code: "LEADING_CONNECTOR",
      message: "Connector cannot appear at the start.",
    });
  }

  // Check after open parens
  for (let i = 0; i < tokens.length - 1; i++) {
    if (isOpenParen(tokens[i]) && isConnectorToken(tokens[i + 1])) {
      setError(tokens[i + 1], {
        code: "LEADING_CONNECTOR",
        message: "Connector cannot appear at the start of a group.",
      });
    }
  }
}

function checkTrailingConnector(tokens: Token[]): void {
  // Check end of sequence
  if (tokens.length > 0 && isConnectorToken(tokens[tokens.length - 1])) {
    setError(tokens[tokens.length - 1], {
      code: "TRAILING_CONNECTOR",
      message: "Connector cannot appear at the end.",
    });
  }

  // Check before close parens
  for (let i = 1; i < tokens.length; i++) {
    if (isCloseParen(tokens[i]) && isConnectorToken(tokens[i - 1])) {
      setError(tokens[i - 1], {
        code: "TRAILING_CONNECTOR",
        message: "Connector cannot appear at the end of a group.",
      });
    }
  }
}

function checkGroupContent(tokens: Token[]): void {
  const openIndices: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (isOpenParen(token)) {
      openIndices.push(i);
    } else if (isCloseParen(token) && openIndices.length > 0) {
      const openIdx = openIndices.pop()!;
      // Count chips between parens
      let chipCount = 0;
      for (let j = openIdx + 1; j < i; j++) {
        if (isChipToken(tokens[j])) chipCount++;
      }

      if (chipCount === 0) {
        setError(tokens[openIdx], {
          code: "EMPTY_GROUP",
          message: "Group contains no filters.",
        });
        setError(tokens[i], {
          code: "EMPTY_GROUP",
          message: "Group contains no filters.",
        });
      } else if (chipCount === 1) {
        setError(tokens[openIdx], {
          code: "SINGLE_CHILD_GROUP",
          message: "Group with single filter is unnecessary. Remove parentheses.",
        });
        setError(tokens[i], {
          code: "SINGLE_CHILD_GROUP",
          message: "Group with single filter is unnecessary. Remove parentheses.",
        });
      }
    }
  }
}

function checkChipValidity(tokens: Token[]): void {
  for (const token of tokens) {
    if (!isChipToken(token)) continue;

    // Rule 8: UNKNOWN_FIELD
    const fieldDef = getFieldByKey(token.field);
    if (!fieldDef) {
      setError(token, {
        code: "UNKNOWN_FIELD",
        message: `Unknown field: "${token.field}".`,
      });
      continue;
    }

    // Rule 9: INVALID_OPERATOR
    if (fieldDef.operators && !fieldDef.operators.includes(token.operator)) {
      setError(token, {
        code: "INVALID_OPERATOR",
        message: `Operator "${token.operator}" is not valid for field "${fieldDef.label}".`,
      });
      continue;
    }

    // Rule 10: EMPTY_VALUES (skip for unary operators)
    if (!UNARY_OPERATORS.has(token.operator) && token.values.length === 0) {
      setError(token, {
        code: "EMPTY_VALUES",
        message: "Filter must have at least one value.",
      });
      continue;
    }

    // Rule 11: INVALID_ENUM_VALUE — enum chip has values not in the allowed set
    if (fieldDef.type === "enum" && fieldDef.values && token.values.length > 0) {
      const invalid = token.values.filter((v) => !fieldDef.values!.includes(v));
      if (invalid.length > 0) {
        setError(token, {
          code: "INVALID_ENUM_VALUE",
          message: `Invalid value${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}`,
          invalidValues: invalid,
        });
      }
    }

    // Rule 12: INVALID_IP_VALUE — IP chip has values that aren't valid IPv4/CIDR
    if (fieldDef.type === "ip" && token.values.length > 0) {
      const invalid = token.values.filter((v) => !isValidIpValue(v));
      if (invalid.length > 0) {
        setError(token, {
          code: "INVALID_IP_VALUE",
          message: `Invalid IP${invalid.length > 1 ? " addresses" : " address"}: ${invalid.join(", ")}`,
          invalidValues: invalid,
        });
      }
    }
  }
}

/**
 * Check whether any token in the array has errors.
 */
export function hasTokenErrors(tokens: Token[]): boolean {
  return tokens.some((t) => t.error != null);
}

/**
 * Get a summary of all errors in a token array.
 */
export function getTokenErrorSummary(tokens: Token[]): {
  count: number;
  messages: string[];
} {
  const errors = tokens
    .filter((t) => t.error != null)
    .map((t) => t.error!.message);
  return { count: errors.length, messages: errors };
}
