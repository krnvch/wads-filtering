export type FilterOperator = "is" | "is_not" | "contains" | "does_not_contain";

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

export type FilterFieldType = "enum" | "text";

export interface FilterFieldDef {
  key: string;
  label: string;
  category: "Attack characteristics" | "Target & Context";
  type: FilterFieldType;
  values?: string[];
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
