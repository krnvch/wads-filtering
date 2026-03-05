export type FilterOperator =
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

export interface FilterCondition {
  id: string;
  field: string;
  fieldLabel: string;
  operator: FilterOperator;
  values: string[];
}

export interface FilterGroup {
  id: string;
  connector: "AND" | "OR";
  children: (FilterCondition | FilterGroup)[];
}

export interface FilterState {
  expression: FilterGroup;
}

export type FilterFieldType = "enum" | "text" | "date" | "numeric" | "ip";

export interface FilterFieldDef {
  key: string;
  label: string;
  category: "Attack characteristics" | "Target & Context" | "Temporal";
  type: FilterFieldType;
  values?: string[];
  operators?: FilterOperator[];
}

export function isFilterCondition(
  node: FilterCondition | FilterGroup,
): node is FilterCondition {
  return "field" in node;
}

export function isFilterGroup(
  node: FilterCondition | FilterGroup,
): node is FilterGroup {
  return "connector" in node;
}
