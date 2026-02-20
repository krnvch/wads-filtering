import type {
  FilterCondition,
  FilterGroup,
  FilterOperator,
  FilterState,
} from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";
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
        return child.id === conditionId ? { ...child, values } : child;
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

// --- Group operations ---

/**
 * Wrap two adjacent root-level conditions into an OR group.
 * Inserts the group at the position of the first condition.
 */
export function createGroup(
  state: FilterState,
  conditionId1: string,
  conditionId2: string,
): FilterState {
  const children = state.expression.children;
  const idx1 = children.findIndex(
    (c) => isFilterCondition(c) && c.id === conditionId1,
  );
  const idx2 = children.findIndex(
    (c) => isFilterCondition(c) && c.id === conditionId2,
  );

  if (idx1 === -1 || idx2 === -1) return state;

  const c1 = children[idx1];
  const c2 = children[idx2];

  const group: FilterGroup = {
    id: generateFilterId(),
    connector: "OR",
    children: [c1, c2],
  };

  const minIdx = Math.min(idx1, idx2);
  const maxIdx = Math.max(idx1, idx2);

  const newChildren = [
    ...children.slice(0, minIdx),
    group,
    ...children.slice(minIdx + 1, maxIdx),
    ...children.slice(maxIdx + 1),
  ];

  return {
    expression: { ...state.expression, children: newChildren },
  };
}

/**
 * Promote all children of a group to the root level at the group's position.
 */
export function ungroupChildren(
  state: FilterState,
  groupId: string,
): FilterState {
  const children = state.expression.children;
  const idx = children.findIndex(
    (c) => isFilterGroup(c) && c.id === groupId,
  );

  if (idx === -1) return state;

  const group = children[idx] as FilterGroup;

  const newChildren = [
    ...children.slice(0, idx),
    ...group.children,
    ...children.slice(idx + 1),
  ];

  return {
    expression: { ...state.expression, children: newChildren },
  };
}

/**
 * Toggle the connector between two adjacent root-level children.
 *
 * - If both children[leftIndex] and children[leftIndex+1] are conditions:
 *   wrap them into an OR group (createGroup).
 * - If children[leftIndex] is an OR group:
 *   ungroup its children (ungroupChildren), effectively toggling OR→AND.
 */
export function toggleConnector(
  state: FilterState,
  leftIndex: number,
): FilterState {
  const children = state.expression.children;

  if (leftIndex < 0 || leftIndex >= children.length) return state;

  const left = children[leftIndex];

  // If left is an OR group, ungroup it (OR→AND toggle) — works even as sole child
  if (isFilterGroup(left) && left.connector === "OR") {
    return ungroupChildren(state, left.id);
  }

  // For creating new groups, we need a right neighbor
  if (leftIndex >= children.length - 1) return state;

  const right = children[leftIndex + 1];

  // If both are conditions, group them into OR
  if (isFilterCondition(left) && isFilterCondition(right)) {
    return createGroup(state, left.id, right.id);
  }

  return state;
}
