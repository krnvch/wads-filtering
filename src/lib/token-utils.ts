import type {
  Token,
  TokenFilterState,
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
  isAndToken,
  isParenToken,
} from "@/types/tokens";
import { getFieldByKey } from "./filter-schema";
import { generateTokenId, generatePairId } from "./token-parser";

/** Insert a token at a specific index, or append at end if undefined. */
function spliceInsert(tokens: Token[], token: Token, atIndex?: number): Token[] {
  if (atIndex === undefined || atIndex >= tokens.length) {
    return [...tokens, token];
  }
  const idx = Math.max(0, atIndex);
  return [...tokens.slice(0, idx), token, ...tokens.slice(idx)];
}

/**
 * Create an empty token filter state.
 */
export function createEmptyTokenState(): TokenFilterState {
  return { tokens: [] };
}

/**
 * Add a filter chip token at a specific position (defaults to end).
 * No auto-connector — connectors must be added explicitly.
 */
export function addChipToken(
  state: TokenFilterState,
  field: string,
  values: string[],
  operator?: TokenFilterOperator,
  atIndex?: number,
): TokenFilterState {
  const fieldDef = getFieldByKey(field);
  const defaultOp = operator ?? getDefaultOperator(field);

  const chip: FilterChipToken = {
    type: "filter_chip",
    id: generateTokenId(),
    field,
    fieldLabel: fieldDef?.label ?? field,
    operator: defaultOp,
    values,
  };

  return { tokens: spliceInsert(state.tokens, chip, atIndex) };
}

/**
 * Remove a token by ID with cascade rules:
 * - Remove chip → also remove one adjacent connector (prefer left, fallback right)
 * - Remove connector → just remove it (chips become implicitly AND-joined)
 * - Remove paren → also remove paired paren
 * - Remove chip from 2-chip paren group → remove parens + connector + chip, keep remaining chip
 */
export function removeToken(
  state: TokenFilterState,
  tokenId: string,
): TokenFilterState {
  const tokens = state.tokens;
  const idx = tokens.findIndex((t) => t.id === tokenId);
  if (idx === -1) return state;

  const token = tokens[idx];

  // Remove a connector — just remove it
  if (isConnectorToken(token)) {
    return { tokens: tokens.filter((_, i) => i !== idx) };
  }

  // Remove a paren — also remove paired paren
  if (isParenToken(token)) {
    const pairId = token.pairId;
    return { tokens: tokens.filter((t) => !(isParenToken(t) && t.pairId === pairId)) };
  }

  // Remove a chip — cascade logic
  if (isChipToken(token)) {
    return removeChipWithCascade(state, idx);
  }

  return state;
}

function removeChipWithCascade(
  state: TokenFilterState,
  chipIdx: number,
): TokenFilterState {
  const tokens = [...state.tokens];
  const indicesToRemove = new Set<number>([chipIdx]);

  // Check if this chip is inside a paren group with only 2 chips
  const parenInfo = findEnclosingParenGroup(tokens, chipIdx);
  if (parenInfo) {
    const { openIdx, closeIdx, chipIndices } = parenInfo;
    if (chipIndices.length <= 2) {
      // Remove the entire paren structure, connectors inside, and this chip
      // Keep the other chip
      for (let i = openIdx; i <= closeIdx; i++) {
        if (i !== chipIdx || chipIndices.length <= 2) {
          if (!isChipToken(tokens[i]) || i === chipIdx) {
            indicesToRemove.add(i);
          }
        }
      }

      // Also remove one adjacent connector outside the parens
      if (openIdx > 0 && isConnectorToken(tokens[openIdx - 1])) {
        indicesToRemove.add(openIdx - 1);
      } else if (closeIdx < tokens.length - 1 && isConnectorToken(tokens[closeIdx + 1])) {
        indicesToRemove.add(closeIdx + 1);
      }

      const result = tokens.filter((_, i) => !indicesToRemove.has(i));
      return { tokens: result };
    }
  }

  // Standard chip removal: remove chip + one adjacent connector
  // Prefer left connector, fallback to right
  if (chipIdx > 0 && isConnectorToken(tokens[chipIdx - 1])) {
    indicesToRemove.add(chipIdx - 1);
  } else if (
    chipIdx < tokens.length - 1 &&
    isConnectorToken(tokens[chipIdx + 1])
  ) {
    indicesToRemove.add(chipIdx + 1);
  }

  const result = tokens.filter((_, i) => !indicesToRemove.has(i));
  return { tokens: result };
}

interface ParenGroupInfo {
  openIdx: number;
  closeIdx: number;
  chipIndices: number[];
}

function findEnclosingParenGroup(
  tokens: Token[],
  chipIdx: number,
): ParenGroupInfo | null {
  // Search backwards for nearest open paren at depth 0
  let depth = 0;
  let openIdx = -1;

  for (let i = chipIdx - 1; i >= 0; i--) {
    if (isCloseParen(tokens[i])) depth++;
    if (isOpenParen(tokens[i])) {
      if (depth === 0) {
        openIdx = i;
        break;
      }
      depth--;
    }
  }

  if (openIdx === -1) return null;

  // Find matching close paren
  const openToken = tokens[openIdx] as OpenParenToken;
  const closeIdx = tokens.findIndex(
    (t) => isCloseParen(t) && (t as CloseParenToken).pairId === openToken.pairId,
  );

  if (closeIdx === -1 || chipIdx > closeIdx) return null;

  // Count chips in this group
  const chipIndices: number[] = [];
  for (let i = openIdx + 1; i < closeIdx; i++) {
    if (isChipToken(tokens[i])) chipIndices.push(i);
  }

  return { openIdx, closeIdx, chipIndices };
}

/**
 * Update chip values by ID. Auto-upgrades operator if needed.
 * Removes chip if values become empty (for non-unary operators).
 */
export function updateChipValues(
  state: TokenFilterState,
  chipId: string,
  values: string[],
): TokenFilterState {
  if (values.length === 0) {
    return removeToken(state, chipId);
  }

  return {
    tokens: state.tokens.map((t) => {
      if (isChipToken(t) && t.id === chipId) {
        const newOp = tokenAutoUpgradeOperator(t.operator, values.length);
        return { ...t, values, operator: newOp };
      }
      return t;
    }),
  };
}

/**
 * Update chip operator by ID.
 */
export function updateChipOperator(
  state: TokenFilterState,
  chipId: string,
  operator: TokenFilterOperator,
): TokenFilterState {
  return {
    tokens: state.tokens.map((t) => {
      if (isChipToken(t) && t.id === chipId) {
        return { ...t, operator };
      }
      return t;
    }),
  };
}

/**
 * Insert a connector token at a specific position (defaults to end).
 */
export function insertConnectorToken(
  state: TokenFilterState,
  connectorType: "and" | "or",
  atIndex?: number,
): TokenFilterState {
  const token: AndToken | OrToken =
    connectorType === "and"
      ? { type: "and", id: generateTokenId() }
      : { type: "or", id: generateTokenId() };

  return { tokens: spliceInsert(state.tokens, token, atIndex) };
}

/**
 * Insert a paren token at a specific position (defaults to end).
 * For open parens, generates a new pairId.
 * For close parens, tries to match the most recent unmatched open paren.
 */
export function insertParenToken(
  state: TokenFilterState,
  parenType: "open_paren" | "close_paren",
  atIndex?: number,
): TokenFilterState {
  if (parenType === "open_paren") {
    const pairId = generatePairId();
    const token: OpenParenToken = {
      type: "open_paren",
      id: generateTokenId(),
      pairId,
    };
    return { tokens: spliceInsert(state.tokens, token, atIndex) };
  }

  // Close paren: find most recent unmatched open paren
  const unmatchedOpenPairIds: string[] = [];
  for (const t of state.tokens) {
    if (isOpenParen(t)) {
      unmatchedOpenPairIds.push(t.pairId);
    } else if (isCloseParen(t)) {
      const idx = unmatchedOpenPairIds.lastIndexOf(t.pairId);
      if (idx !== -1) unmatchedOpenPairIds.splice(idx, 1);
    }
  }

  const pairId =
    unmatchedOpenPairIds.length > 0
      ? unmatchedOpenPairIds[unmatchedOpenPairIds.length - 1]
      : generatePairId();

  const token: CloseParenToken = {
    type: "close_paren",
    id: generateTokenId(),
    pairId,
  };
  return { tokens: spliceInsert(state.tokens, token, atIndex) };
}

/**
 * Toggle a connector type: AND ↔ OR.
 *
 * AND→OR: wraps the two adjacent chips in parentheses (if at top level)
 * OR→AND: unwraps parentheses if the only OR within a group
 */
export function toggleConnectorType(
  state: TokenFilterState,
  connectorId: string,
): TokenFilterState {
  const tokens = state.tokens;
  const idx = tokens.findIndex((t) => t.id === connectorId);
  if (idx === -1 || !isConnectorToken(tokens[idx])) return state;

  const connector = tokens[idx];

  if (isAndToken(connector)) {
    // AND → OR: wrap adjacent chips in parens
    return toggleAndToOr(state, idx);
  } else {
    // OR → AND: just swap the connector type
    return toggleOrToAnd(state, idx);
  }
}

function toggleAndToOr(state: TokenFilterState, connectorIdx: number): TokenFilterState {
  const tokens = [...state.tokens];

  // Check if already inside parens
  const depth = getParenDepth(tokens, connectorIdx);
  if (depth > 0) {
    // Already inside parens, just swap to OR
    tokens[connectorIdx] = { type: "or", id: tokens[connectorIdx].id };
    return { tokens };
  }

  // Find left operand (chip or close paren)
  const leftIdx = findLeftOperand(tokens, connectorIdx);
  // Find right operand (chip or open paren)
  const rightIdx = findRightOperand(tokens, connectorIdx);

  if (leftIdx === -1 || rightIdx === -1) {
    // Can't wrap, just swap type
    tokens[connectorIdx] = { type: "or", id: tokens[connectorIdx].id };
    return { tokens };
  }

  // Wrap: insert ( before left operand and ) after right operand
  const pairId = generatePairId();
  const openParen: OpenParenToken = {
    type: "open_paren",
    id: generateTokenId(),
    pairId,
  };
  const closeParen: CloseParenToken = {
    type: "close_paren",
    id: generateTokenId(),
    pairId,
  };

  // Swap connector to OR
  tokens[connectorIdx] = { type: "or", id: tokens[connectorIdx].id };

  // Insert close paren after right operand
  tokens.splice(rightIdx + 1, 0, closeParen);
  // Insert open paren before left operand
  tokens.splice(leftIdx, 0, openParen);

  return { tokens };
}

function toggleOrToAnd(state: TokenFilterState, connectorIdx: number): TokenFilterState {
  const tokens = [...state.tokens];

  // Check if this is the only OR inside a paren group
  const parenInfo = findEnclosingParenGroupByIndex(tokens, connectorIdx);
  if (parenInfo) {
    const { openIdx, closeIdx } = parenInfo;
    // Count OR connectors inside this group
    let orCount = 0;
    for (let i = openIdx + 1; i < closeIdx; i++) {
      if (isOrToken(tokens[i])) orCount++;
    }

    if (orCount === 1) {
      // This is the only OR — swap to AND and remove parens
      tokens[connectorIdx] = { type: "and", id: tokens[connectorIdx].id };
      // Remove close paren first (higher index)
      tokens.splice(closeIdx, 1);
      // Remove open paren
      tokens.splice(openIdx, 1);
      return { tokens };
    }
  }

  // Just swap to AND
  tokens[connectorIdx] = { type: "and", id: tokens[connectorIdx].id };
  return { tokens };
}

function getParenDepth(tokens: Token[], idx: number): number {
  let depth = 0;
  for (let i = 0; i < idx; i++) {
    if (isOpenParen(tokens[i])) depth++;
    if (isCloseParen(tokens[i])) depth--;
  }
  return depth;
}

function findLeftOperand(tokens: Token[], idx: number): number {
  // Walk left to find the start of the left operand
  let i = idx - 1;
  if (i < 0) return -1;

  // If it's a close paren, find matching open
  if (isCloseParen(tokens[i])) {
    let depth = 1;
    i--;
    while (i >= 0 && depth > 0) {
      if (isCloseParen(tokens[i])) depth++;
      if (isOpenParen(tokens[i])) depth--;
      i--;
    }
    return i + 1;
  }

  // If it's a chip, return its index
  if (isChipToken(tokens[i])) return i;

  return -1;
}

function findRightOperand(tokens: Token[], idx: number): number {
  let i = idx + 1;
  if (i >= tokens.length) return -1;

  // If it's an open paren, find matching close
  if (isOpenParen(tokens[i])) {
    let depth = 1;
    i++;
    while (i < tokens.length && depth > 0) {
      if (isOpenParen(tokens[i])) depth++;
      if (isCloseParen(tokens[i])) depth--;
      i++;
    }
    return i - 1;
  }

  // If it's a chip, return its index
  if (isChipToken(tokens[i])) return i;

  return -1;
}

function findEnclosingParenGroupByIndex(
  tokens: Token[],
  idx: number,
): { openIdx: number; closeIdx: number } | null {
  let depth = 0;
  let openIdx = -1;

  for (let i = idx - 1; i >= 0; i--) {
    if (isCloseParen(tokens[i])) depth++;
    if (isOpenParen(tokens[i])) {
      if (depth === 0) {
        openIdx = i;
        break;
      }
      depth--;
    }
  }

  if (openIdx === -1) return null;

  const openToken = tokens[openIdx] as OpenParenToken;
  const closeIdx = tokens.findIndex(
    (t) => isCloseParen(t) && (t as CloseParenToken).pairId === openToken.pairId,
  );

  if (closeIdx === -1 || idx > closeIdx) return null;

  return { openIdx, closeIdx };
}

/**
 * Auto-upgrade operator based on value count:
 * - 1 value: is_any_of → is, is_none_of → is_not
 * - 2+ values: is → is_any_of, is_not → is_none_of
 */
export function tokenAutoUpgradeOperator(
  operator: TokenFilterOperator,
  valueCount: number,
): TokenFilterOperator {
  if (valueCount <= 1) {
    if (operator === "is_any_of") return "is";
    if (operator === "is_none_of") return "is_not";
  } else {
    if (operator === "is") return "is_any_of";
    if (operator === "is_not") return "is_none_of";
  }
  return operator;
}

/**
 * Get the default operator for a field type.
 */
function getDefaultOperator(fieldKey: string): TokenFilterOperator {
  const field = getFieldByKey(fieldKey);
  if (!field) return "is";

  switch (field.type) {
    case "enum":
      return "is";
    case "text":
      return "contains";
    case "date":
      return "in_the_last";
    case "numeric":
      return "equals";
    case "ip":
      return "in";
    default:
      return "is";
  }
}

/**
 * Count the number of chip tokens in the state.
 */
export function countChipTokens(state: TokenFilterState): number {
  return state.tokens.filter(isChipToken).length;
}

/**
 * Clear all tokens.
 */
export function clearAllTokens(): TokenFilterState {
  return { tokens: [] };
}
