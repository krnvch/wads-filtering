import type { FilterGroup, FilterState } from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";

export interface ValidationError {
  type: "TOP_LEVEL_OR" | "EMPTY_GROUP" | "SINGLE_CHILD_GROUP";
  message: string;
  nodeId: string;
}

/**
 * Validate a filter expression and return all validation errors.
 *
 * Rules:
 * - Top-level OR is not allowed (root connector must be AND)
 * - Empty groups (no children) are invalid
 * - Single-child groups should be promoted (auto-ungrouped)
 */
export function validateExpression(state: FilterState): ValidationError[] {
  const errors: ValidationError[] = [];
  const { expression } = state;

  if (expression.connector === "OR") {
    errors.push({
      type: "TOP_LEVEL_OR",
      message: "Top-level OR is not allowed. Use groups for OR logic.",
      nodeId: expression.id,
    });
  }

  for (const child of expression.children) {
    if (isFilterGroup(child)) {
      validateGroup(child, errors);
    }
  }

  return errors;
}

function validateGroup(group: FilterGroup, errors: ValidationError[]): void {
  if (group.children.length === 0) {
    errors.push({
      type: "EMPTY_GROUP",
      message: "Group has no conditions.",
      nodeId: group.id,
    });
  }

  if (group.children.length === 1) {
    errors.push({
      type: "SINGLE_CHILD_GROUP",
      message: "Group has only one condition and should be ungrouped.",
      nodeId: group.id,
    });
  }

  for (const child of group.children) {
    if (isFilterGroup(child)) {
      validateGroup(child, errors);
    }
  }
}

/**
 * Check whether a filter expression is valid (has no validation errors).
 */
export function isValidExpression(state: FilterState): boolean {
  return validateExpression(state).length === 0;
}

/**
 * Sanitize a filter expression by fixing common issues:
 * - Flip root OR to AND
 * - Remove empty groups
 * - Promote single-child groups (replace group with its only child)
 */
export function sanitizeExpression(state: FilterState): FilterState {
  const expression = sanitizeGroup(state.expression);

  // Flip root OR → AND
  const sanitizedRoot: FilterGroup =
    expression.connector === "OR"
      ? { ...expression, connector: "AND" }
      : expression;

  return { expression: sanitizedRoot };
}

function sanitizeGroup(group: FilterGroup): FilterGroup {
  const sanitizedChildren: FilterGroup["children"] = [];

  for (const child of group.children) {
    if (isFilterCondition(child)) {
      sanitizedChildren.push(child);
    } else if (isFilterGroup(child)) {
      const sanitizedChild = sanitizeGroup(child);

      // Remove empty groups
      if (sanitizedChild.children.length === 0) {
        continue;
      }

      // Promote single-child groups
      if (sanitizedChild.children.length === 1) {
        sanitizedChildren.push(sanitizedChild.children[0]);
        continue;
      }

      sanitizedChildren.push(sanitizedChild);
    }
  }

  return { ...group, children: sanitizedChildren };
}
