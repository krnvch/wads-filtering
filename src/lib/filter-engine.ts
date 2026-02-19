import type {
  FilterCondition,
  FilterGroup,
  FilterState,
} from "@/types/filters";
import { isFilterCondition } from "@/types/filters";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function matchesCondition(
  record: Record<string, unknown>,
  condition: FilterCondition,
): boolean {
  const rawValue = getNestedValue(record, condition.field);
  const { operator, values } = condition;

  // Handle array fields (e.g., sources.countries)
  if (Array.isArray(rawValue)) {
    switch (operator) {
      case "is":
        return rawValue.some((v) => values.includes(String(v)));
      case "is_not":
        return !rawValue.some((v) => values.includes(String(v)));
      case "contains":
        return rawValue.some((v) =>
          values.some((filterVal) => String(v).includes(filterVal)),
        );
      case "does_not_contain":
        return !rawValue.some((v) =>
          values.some((filterVal) => String(v).includes(filterVal)),
        );
    }
  }

  const stringValue = String(rawValue ?? "");

  switch (operator) {
    case "is":
      return values.includes(stringValue);
    case "is_not":
      return !values.includes(stringValue);
    case "contains":
      return values.some((v) => stringValue.includes(v));
    case "does_not_contain":
      return !values.some((v) => stringValue.includes(v));
  }
}

function evaluateGroup(
  data: Record<string, unknown>[],
  group: FilterGroup,
): Record<string, unknown>[] {
  if (group.children.length === 0) return data;

  if (group.connector === "AND") {
    return group.children.reduce(
      (result, child) => {
        if (isFilterCondition(child)) {
          return result.filter((record) => matchesCondition(record, child));
        }
        return evaluateGroup(result, child);
      },
      [...data],
    );
  }

  // OR: union results of each child
  const matchedIds = new Set<number>();
  const results: Record<string, unknown>[] = [];

  for (const child of group.children) {
    const childResults = isFilterCondition(child)
      ? data.filter((record) => matchesCondition(record, child))
      : evaluateGroup(data, child);

    for (const record of childResults) {
      const idx = data.indexOf(record);
      if (!matchedIds.has(idx)) {
        matchedIds.add(idx);
        results.push(record);
      }
    }
  }

  return results;
}

export function evaluateExpression(
  data: Record<string, unknown>[],
  filterState: FilterState,
): Record<string, unknown>[] {
  return evaluateGroup(data, filterState.expression);
}
