import type {
  Token,
  FilterChipToken,
  TokenFilterOperator,
} from "@/types/tokens";
import {
  isChipToken,
  isConnectorToken,
  isOpenParen,
  isCloseParen,
  isAndToken,
} from "@/types/tokens";
import { getFieldByKey } from "./filter-schema";
import { deserializeFilterState } from "./filter-url";
import { expressionTreeToTokens, generateTokenId, generatePairId } from "./token-parser";

// Separator tokens in URL format
const TOKEN_SEP = "~";
const VALUE_SEP = ",";
const FIELD_OP_SEP = ".";

/**
 * Encode a single value for URL use.
 * Escapes ~, ., and , characters.
 */
function encodeValue(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/~/g, "%7E")
    .replace(/\./g, "%2E")
    .replace(/,/g, "%2C");
}

/**
 * Decode a single value from URL format.
 */
function decodeValue(encoded: string): string {
  return encoded
    .replace(/%2C/gi, ",")
    .replace(/%2E/gi, ".")
    .replace(/%7E/gi, "~")
    .replace(/%25/g, "%");
}

/**
 * Serialize a token array into the new URL format.
 *
 * Format: `status.is_any_of.Blocked,Monitored~AND~(~type.is.XSS~OR~status.is.Blocked~)`
 *
 * - Filter chips: `field.operator.value1,value2`
 * - Connectors: `AND` or `OR`
 * - Parens: `(` and `)`
 * - All separated by `~`
 */
export function serializeTokens(tokens: Token[]): string {
  if (tokens.length === 0) return "";

  const parts: string[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "filter_chip": {
        const chip = token as FilterChipToken;
        const encodedValues = chip.values.map(encodeValue).join(VALUE_SEP);
        parts.push(
          `${encodeValue(chip.field)}${FIELD_OP_SEP}${chip.operator}${FIELD_OP_SEP}${encodedValues}`,
        );
        break;
      }
      case "and":
        parts.push("AND");
        break;
      case "or":
        parts.push("OR");
        break;
      case "open_paren":
        parts.push("(");
        break;
      case "close_paren":
        parts.push(")");
        break;
    }
  }

  return parts.join(TOKEN_SEP);
}

/**
 * Deserialize a token URL string back into a Token array.
 */
export function deserializeTokens(q: string): Token[] {
  if (!q || q.trim() === "") return [];

  const parts = q.split(TOKEN_SEP);
  const tokens: Token[] = [];

  // Track open parens so we can assign pairIds
  const parenStack: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "") continue;

    if (trimmed === "AND") {
      tokens.push({ type: "and", id: generateTokenId() });
      continue;
    }

    if (trimmed === "OR") {
      tokens.push({ type: "or", id: generateTokenId() });
      continue;
    }

    if (trimmed === "(") {
      const pairId = generatePairId();
      parenStack.push(pairId);
      tokens.push({ type: "open_paren", id: generateTokenId(), pairId });
      continue;
    }

    if (trimmed === ")") {
      const pairId = parenStack.pop() ?? generatePairId();
      tokens.push({ type: "close_paren", id: generateTokenId(), pairId });
      continue;
    }

    // Must be a filter chip: field.operator.values
    const chip = parseChipPart(trimmed);
    if (chip) {
      tokens.push(chip);
    }
  }

  return tokens;
}

function parseChipPart(part: string): FilterChipToken | null {
  // Format: field.operator.value1,value2
  // Need at least field.operator (unary operators may have no values)
  const firstDot = part.indexOf(FIELD_OP_SEP);
  if (firstDot === -1) return null;

  const field = decodeValue(part.slice(0, firstDot));
  const rest = part.slice(firstDot + 1);

  const secondDot = rest.indexOf(FIELD_OP_SEP);

  let operator: TokenFilterOperator;
  let values: string[];

  if (secondDot === -1) {
    // field.operator (no values — unary operator)
    operator = rest as TokenFilterOperator;
    values = [];
  } else {
    operator = rest.slice(0, secondDot) as TokenFilterOperator;
    const valuesStr = rest.slice(secondDot + 1);
    values = valuesStr
      .split(VALUE_SEP)
      .map(decodeValue)
      .filter((v) => v !== "");
  }

  const fieldDef = getFieldByKey(field);

  return {
    type: "filter_chip",
    id: generateTokenId(),
    field,
    fieldLabel: fieldDef?.label ?? field,
    operator,
    values,
  };
}

/**
 * Detect whether URL params use the legacy format (field=value&field__op=operator).
 * Legacy format does NOT have a `q` parameter and has at least one known field param.
 */
export function isLegacyUrlFormat(params: URLSearchParams): boolean {
  // If `q` param exists, it's new format
  if (params.has("q")) return false;

  // Check if any param key matches a known field
  for (const key of params.keys()) {
    // Skip operator override params
    if (key.endsWith("__op")) continue;
    // Skip group prefix params
    if (/^g\d+\./.test(key)) return true;
    // Check if it's a known field
    if (getFieldByKey(key)) return true;
  }

  return false;
}

/**
 * Migrate legacy URL format to token array.
 * Uses existing deserializeFilterState() → expressionTreeToTokens().
 */
export function migrateLegacyToTokens(params: URLSearchParams): Token[] {
  const state = deserializeFilterState(params);
  return expressionTreeToTokens(state.expression);
}
