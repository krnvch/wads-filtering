// Token error — attached to individual tokens
export interface TokenError {
  code:
    | "TOP_LEVEL_OR"
    | "UNBALANCED_PAREN"
    | "CONSECUTIVE_CONNECTOR"
    | "LEADING_CONNECTOR"
    | "TRAILING_CONNECTOR"
    | "EMPTY_GROUP"
    | "SINGLE_CHILD_GROUP"
    | "UNKNOWN_FIELD"
    | "INVALID_OPERATOR"
    | "EMPTY_VALUES"
    | "MISSING_CONNECTOR"
    | "INVALID_ENUM_VALUE"
    | "INVALID_IP_VALUE";
  message: string;
  invalidValues?: string[];
}

// Expanded operator set for token-based system (20+ operators)
export type TokenFilterOperator =
  // Universal
  | "is"
  | "is_not"
  | "is_set"
  | "is_not_set"
  // Enum multi-value
  | "is_any_of"
  | "is_none_of"
  // Text
  | "contains"
  | "does_not_contain"
  | "starts_with"
  | "ends_with"
  // Numeric
  | "equals"
  | "not_equals"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in_between"
  // Date
  | "before"
  | "after"
  | "on"
  | "not_on"
  | "in_the_last"
  | "not_in_the_last"
  | "between_dates"
  // IP
  | "in"
  | "not_in";

// Token discriminated union
export interface FilterChipToken {
  type: "filter_chip";
  id: string;
  field: string;
  fieldLabel: string;
  operator: TokenFilterOperator;
  values: string[];
  error?: TokenError;
}

export interface AndToken {
  type: "and";
  id: string;
  error?: TokenError;
}

export interface OrToken {
  type: "or";
  id: string;
  error?: TokenError;
}

export interface OpenParenToken {
  type: "open_paren";
  id: string;
  pairId: string;
  error?: TokenError;
}

export interface CloseParenToken {
  type: "close_paren";
  id: string;
  pairId: string;
  error?: TokenError;
}

export type Token =
  | FilterChipToken
  | AndToken
  | OrToken
  | OpenParenToken
  | CloseParenToken;

// New top-level state
export interface TokenFilterState {
  tokens: Token[];
}

// Expanded field type
export type TokenFilterFieldType = "enum" | "text" | "date" | "numeric" | "ip";

// Operator display labels
export const OPERATOR_LABELS: Record<TokenFilterOperator, string> = {
  is: "is",
  is_not: "is not",
  is_set: "is set",
  is_not_set: "is not set",
  is_any_of: "is any of",
  is_none_of: "is not any of",
  contains: "contains",
  does_not_contain: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  equals: "=",
  not_equals: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  in_between: "is between",
  before: "is before",
  after: "is after",
  on: "is on",
  not_on: "is not on",
  in_the_last: "in the last",
  not_in_the_last: "not in the last",
  between_dates: "is between",
  in: "in",
  not_in: "not in",
};

// Operators that require no values (unary)
export const UNARY_OPERATORS: Set<TokenFilterOperator> = new Set([
  "is_set",
  "is_not_set",
]);

// Operators that require exactly 2 values (range)
export const RANGE_OPERATORS: Set<TokenFilterOperator> = new Set([
  "in_between",
  "between_dates",
]);

// Operators by field type (progressive disclosure: primary first, then advanced)
export const OPERATORS_BY_FIELD_TYPE: Record<
  TokenFilterFieldType,
  { primary: TokenFilterOperator[]; advanced: TokenFilterOperator[] }
> = {
  enum: {
    primary: ["is", "is_not", "is_any_of", "is_none_of"],
    advanced: ["is_set", "is_not_set"],
  },
  text: {
    primary: ["is", "is_not", "contains", "does_not_contain"],
    advanced: ["starts_with", "ends_with", "is_set", "is_not_set"],
  },
  date: {
    primary: ["in_the_last", "not_in_the_last", "before", "after"],
    advanced: ["on", "not_on", "between_dates", "is_set", "is_not_set"],
  },
  numeric: {
    primary: ["equals", "not_equals", "gt", "lt"],
    advanced: ["gte", "lte", "in_between", "is_set", "is_not_set"],
  },
  ip: {
    primary: ["in", "not_in"],
    advanced: ["is_set", "is_not_set"],
  },
};

// Type guards
export function isChipToken(t: Token): t is FilterChipToken {
  return t.type === "filter_chip";
}

export function isConnectorToken(t: Token): t is AndToken | OrToken {
  return t.type === "and" || t.type === "or";
}

export function isParenToken(
  t: Token,
): t is OpenParenToken | CloseParenToken {
  return t.type === "open_paren" || t.type === "close_paren";
}

export function isAndToken(t: Token): t is AndToken {
  return t.type === "and";
}

export function isOrToken(t: Token): t is OrToken {
  return t.type === "or";
}

export function isOpenParen(t: Token): t is OpenParenToken {
  return t.type === "open_paren";
}

export function isCloseParen(t: Token): t is CloseParenToken {
  return t.type === "close_paren";
}
