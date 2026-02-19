import type {
  FilterCondition,
  FilterGroup,
  FilterOperator,
  FilterState,
} from "@/types/filters";
import { isFilterCondition } from "@/types/filters";
import { getFieldByKey } from "./filter-schema";

export function generateFilterId(): string {
  return crypto.randomUUID();
}

export function createEmptyExpression(): FilterGroup {
  return {
    id: generateFilterId(),
    connector: "AND",
    children: [],
  };
}

export function createEmptyState(): FilterState {
  return { expression: createEmptyExpression() };
}

export function createCondition(
  field: string,
  values: string[],
  operator: FilterOperator = "is",
): FilterCondition {
  const fieldDef = getFieldByKey(field);
  return {
    id: generateFilterId(),
    field,
    fieldLabel: fieldDef?.label ?? field,
    operator,
    values,
  };
}

export function addCondition(
  state: FilterState,
  condition: FilterCondition,
): FilterState {
  return {
    expression: {
      ...state.expression,
      children: [...state.expression.children, condition],
    },
  };
}

export function removeCondition(
  state: FilterState,
  conditionId: string,
): FilterState {
  return {
    expression: {
      ...state.expression,
      children: state.expression.children.filter((child) => {
        if (isFilterCondition(child)) {
          return child.id !== conditionId;
        }
        return true;
      }),
    },
  };
}

export function updateConditionValues(
  state: FilterState,
  conditionId: string,
  values: string[],
): FilterState {
  if (values.length === 0) {
    return removeCondition(state, conditionId);
  }

  return {
    expression: {
      ...state.expression,
      children: state.expression.children.map((child) => {
        if (isFilterCondition(child) && child.id === conditionId) {
          return { ...child, values };
        }
        return child;
      }),
    },
  };
}

export function updateConditionOperator(
  state: FilterState,
  conditionId: string,
  operator: FilterOperator,
): FilterState {
  return {
    expression: {
      ...state.expression,
      children: state.expression.children.map((child) => {
        if (isFilterCondition(child) && child.id === conditionId) {
          return { ...child, operator };
        }
        return child;
      }),
    },
  };
}
