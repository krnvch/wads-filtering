import type {
  FilterCondition,
  FilterGroup,
  FilterOperator,
  FilterState,
} from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";
import { getFieldByKey } from "./filter-schema";

export function autoUpgradeOperator(operator: FilterOperator, valueCount: number): FilterOperator {
  if (valueCount <= 1) {
    if (operator === "is_any_of") return "is";
    if (operator === "is_none_of") return "is_not";
  } else {
    if (operator === "is") return "is_any_of";
    if (operator === "is_not") return "is_none_of";
  }
  return operator;
}

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

// --- Recursive helpers ---

/**
 * Recursively remove a condition by id from a group's children.
 * If a group drops to 1 child after removal, promote that child (auto-ungroup).
 * If a group drops to 0 children, remove it entirely.
 */
function removeFromGroup(
  group: FilterGroup,
  conditionId: string,
): FilterGroup {
  const newChildren: FilterGroup["children"] = [];

  for (const child of group.children) {
    if (isFilterCondition(child)) {
      if (child.id !== conditionId) {
        newChildren.push(child);
      }
    } else if (isFilterGroup(child)) {
      const updated = removeFromGroup(child, conditionId);
      if (updated.children.length === 0) {
        // Drop empty group
        continue;
      }
      if (updated.children.length === 1) {
        // Auto-ungroup: promote the single child
        newChildren.push(updated.children[0]);
        continue;
      }
      newChildren.push(updated);
    }
  }

  return { ...group, children: newChildren };
}

/**
 * Recursively update a condition's values by id.
 */
function updateValuesInGroup(
  group: FilterGroup,
  conditionId: string,
  values: string[],
): FilterGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if (isFilterCondition(child)) {
        if (child.id === conditionId) {
          const newOp = autoUpgradeOperator(child.operator, values.length);
          return { ...child, values, operator: newOp };
        }
        return child;
      }
      return updateValuesInGroup(child, conditionId, values);
    }),
  };
}

/**
 * Recursively update a condition's operator by id.
 */
function updateOperatorInGroup(
  group: FilterGroup,
  conditionId: string,
  operator: FilterOperator,
): FilterGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if (isFilterCondition(child)) {
        return child.id === conditionId ? { ...child, operator } : child;
      }
      return updateOperatorInGroup(child, conditionId, operator);
    }),
  };
}

// --- Public API ---

export function removeCondition(
  state: FilterState,
  conditionId: string,
): FilterState {
  return {
    expression: removeFromGroup(state.expression, conditionId),
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
    expression: updateValuesInGroup(state.expression, conditionId, values),
  };
}

export function updateConditionOperator(
  state: FilterState,
  conditionId: string,
  operator: FilterOperator,
): FilterState {
  return {
    expression: updateOperatorInGroup(state.expression, conditionId, operator),
  };
}

