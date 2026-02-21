import type {
  FilterCondition,
  FilterGroup,
  FilterOperator,
} from "@/types/filters";
import type {
  Token,
  FilterChipToken,
  AndToken,
  OrToken,
  OpenParenToken,
  CloseParenToken,
  TokenFilterOperator,
} from "@/types/tokens";
import {
  isChipToken,
  isConnectorToken,
  isOpenParen,
  isCloseParen,
  isOrToken,
} from "@/types/tokens";
import { getFieldByKey } from "./filter-schema";

/**
 * Generate a unique token ID.
 */
export function generateTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a unique pair ID for matching open/close parens.
 */
export function generatePairId(): string {
  return crypto.randomUUID();
}

/**
 * Convert a flat token sequence into an expression tree for engine evaluation.
 *
 * Algorithm:
 * 1. Scan left-to-right
 * 2. Use a stack for paren handling
 * 3. Collect sequences of chips with their connectors
 * 4. OR-connected chips within parens form OR groups
 * 5. AND-connected chips (or implicit AND) form top-level AND children
 *
 * Graceful: never throws, returns empty group for invalid/empty input.
 */
export function tokensToExpressionTree(tokens: Token[]): FilterGroup {
  const root: FilterGroup = {
    id: "root",
    connector: "AND",
    children: [],
  };

  if (tokens.length === 0) return root;

  // Filter out structural tokens to get a simplified view
  const result = parseTokenSequence(tokens, 0);
  root.children = result.children;

  return root;
}

interface ParseResult {
  children: (FilterCondition | FilterGroup)[];
  consumed: number;
}

function parseTokenSequence(tokens: Token[], startIndex: number): ParseResult {
  const children: (FilterCondition | FilterGroup)[] = [];
  let currentOrGroup: FilterCondition[] | null = null;
  let i = startIndex;
  let lastConnectorWasOr = false;

  function flushOrGroup() {
    if (currentOrGroup && currentOrGroup.length > 0) {
      if (currentOrGroup.length === 1) {
        children.push(currentOrGroup[0]);
      } else {
        const group: FilterGroup = {
          id: generateTokenId(),
          connector: "OR",
          children: [...currentOrGroup],
        };
        children.push(group);
      }
      currentOrGroup = null;
    }
  }

  while (i < tokens.length) {
    const token = tokens[i];

    if (isCloseParen(token)) {
      // End of this paren group
      flushOrGroup();
      return { children, consumed: i - startIndex + 1 };
    }

    if (isOpenParen(token)) {
      // Recurse into paren group
      flushOrGroup();
      lastConnectorWasOr = false;
      const inner = parseTokenSequence(tokens, i + 1);
      const consumed = inner.consumed;

      if (inner.children.length > 0) {
        // If the paren group has multiple children connected by OR,
        // wrap them in an OR group
        if (inner.children.length > 1) {
          // Check if the paren content was OR-connected
          // by looking at connectors inside the parens
          const hasOrConnector = hasOrBetweenChips(tokens, i + 1, i + 1 + consumed - 1);
          const group: FilterGroup = {
            id: generateTokenId(),
            connector: hasOrConnector ? "OR" : "AND",
            children: inner.children,
          };
          children.push(group);
        } else {
          children.push(inner.children[0]);
        }
      }

      i += consumed + 1; // +1 for the open paren
      continue;
    }

    if (isConnectorToken(token)) {
      lastConnectorWasOr = isOrToken(token);
      i++;
      continue;
    }

    if (isChipToken(token)) {
      const condition = chipTokenToCondition(token);

      if (lastConnectorWasOr) {
        // Start or continue OR group
        if (!currentOrGroup) {
          // Pull last child back into the OR group
          const lastChild = children.pop();
          currentOrGroup = [];
          if (lastChild && isCondition(lastChild)) {
            currentOrGroup.push(lastChild);
          } else if (lastChild) {
            // Put non-condition back and start fresh
            children.push(lastChild);
            currentOrGroup = [];
          }
        }
        currentOrGroup.push(condition);
      } else {
        flushOrGroup();
        children.push(condition);
      }

      lastConnectorWasOr = false;
      i++;
      continue;
    }

    // Skip unknown token types
    i++;
  }

  flushOrGroup();
  return { children, consumed: i - startIndex };
}

function hasOrBetweenChips(tokens: Token[], start: number, end: number): boolean {
  let depth = 0;
  for (let i = start; i < end && i < tokens.length; i++) {
    if (isOpenParen(tokens[i])) depth++;
    if (isCloseParen(tokens[i])) {
      if (depth === 0) break;
      depth--;
    }
    if (isOrToken(tokens[i]) && depth === 0) return true;
  }
  return false;
}

function chipTokenToCondition(token: FilterChipToken): FilterCondition {
  return {
    id: token.id,
    field: token.field,
    fieldLabel: token.fieldLabel,
    operator: token.operator as FilterOperator,
    values: [...token.values],
  };
}

function isCondition(
  node: FilterCondition | FilterGroup,
): node is FilterCondition {
  return "field" in node;
}

/**
 * Convert an expression tree back into a flat token sequence.
 * Used for legacy URL migration: old URL → tree → tokens.
 */
export function expressionTreeToTokens(group: FilterGroup): Token[] {
  const tokens: Token[] = [];

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];

    // Insert AND connector between top-level children (except before first)
    if (i > 0) {
      tokens.push(createAndToken());
    }

    if (isCondition(child)) {
      tokens.push(conditionToChipToken(child));
    } else {
      // It's a FilterGroup — wrap in parens if OR
      const subGroup = child as FilterGroup;
      if (subGroup.connector === "OR") {
        const pairId = generatePairId();
        tokens.push(createOpenParenToken(pairId));

        for (let j = 0; j < subGroup.children.length; j++) {
          if (j > 0) {
            tokens.push(createOrToken());
          }
          const subChild = subGroup.children[j];
          if (isCondition(subChild)) {
            tokens.push(conditionToChipToken(subChild));
          } else {
            // Nested groups — recurse
            const nested = expressionTreeToTokens(subChild as FilterGroup);
            tokens.push(...nested);
          }
        }

        tokens.push(createCloseParenToken(pairId));
      } else {
        // AND subgroup — emit children directly
        const nested = expressionTreeToTokens(subGroup);
        // Remove the first AND that expressionTreeToTokens might add
        tokens.push(...nested);
      }
    }
  }

  return tokens;
}

function conditionToChipToken(condition: FilterCondition): FilterChipToken {
  return {
    type: "filter_chip",
    id: condition.id,
    field: condition.field,
    fieldLabel: condition.fieldLabel,
    operator: condition.operator as TokenFilterOperator,
    values: [...condition.values],
  };
}

function createAndToken(): AndToken {
  return { type: "and", id: generateTokenId() };
}

function createOrToken(): OrToken {
  return { type: "or", id: generateTokenId() };
}

function createOpenParenToken(pairId: string): OpenParenToken {
  return { type: "open_paren", id: generateTokenId(), pairId };
}

function createCloseParenToken(pairId: string): CloseParenToken {
  return { type: "close_paren", id: generateTokenId(), pairId };
}
