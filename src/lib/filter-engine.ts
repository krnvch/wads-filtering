import type {
  FilterCondition,
  FilterGroup,
  FilterState,
} from "@/types/filters";
import { isFilterCondition } from "@/types/filters";
import { ipMatchesCidr, isValidCIDR } from "@/lib/ip-utils";

/**
 * Parse a duration string like "24h", "7d", "30d" into milliseconds.
 * Supports: Nh (hours), Nd (days), Nw (weeks), Nm (months as 30d).
 * Returns null for invalid input.
 */
function parseDurationMs(duration: string): number | null {
  const match = duration.match(/^(\d+)([hdwm])$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const MS_HOUR = 3_600_000;
  const MS_DAY = 86_400_000;
  switch (unit) {
    case "h":
      return value * MS_HOUR;
    case "d":
      return value * MS_DAY;
    case "w":
      return value * 7 * MS_DAY;
    case "m":
      return value * 30 * MS_DAY;
    default:
      return null;
  }
}

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

  // Unary operators (no values needed)
  if (operator === "is_set") {
    return rawValue != null && rawValue !== "";
  }
  if (operator === "is_not_set") {
    return rawValue == null || rawValue === "";
  }

  // IP operators (in / not_in) — work with both individual IPs and CIDR ranges
  if (operator === "in" || operator === "not_in") {
    const ips: string[] = Array.isArray(rawValue)
      ? rawValue.map(String)
      : rawValue != null
        ? [String(rawValue)]
        : [];

    const matches = ips.some((ip) =>
      values.some((filterVal) =>
        isValidCIDR(filterVal)
          ? ipMatchesCidr(ip, filterVal)
          : ip === filterVal,
      ),
    );

    return operator === "in" ? matches : !matches;
  }

  // Handle array fields (e.g., sources.countries)
  if (Array.isArray(rawValue)) {
    switch (operator) {
      case "is":
      case "is_any_of":
        return rawValue.some((v) => values.includes(String(v)));
      case "is_not":
      case "is_none_of":
        return !rawValue.some((v) => values.includes(String(v)));
      case "contains":
        return rawValue.some((v) =>
          values.some((filterVal) => String(v).includes(filterVal)),
        );
      case "does_not_contain":
        return !rawValue.some((v) =>
          values.some((filterVal) => String(v).includes(filterVal)),
        );
      case "starts_with":
        return rawValue.some((v) =>
          values.some((filterVal) => String(v).startsWith(filterVal)),
        );
      case "ends_with":
        return rawValue.some((v) =>
          values.some((filterVal) => String(v).endsWith(filterVal)),
        );
      default:
        return false;
    }
  }

  const stringValue = String(rawValue ?? "");

  // Text operators
  switch (operator) {
    case "is":
    case "is_any_of":
      return values.includes(stringValue);
    case "is_not":
    case "is_none_of":
      return !values.includes(stringValue);
    case "contains":
      return values.some((v) => stringValue.includes(v));
    case "does_not_contain":
      return !values.some((v) => stringValue.includes(v));
    case "starts_with":
      return values.some((v) => stringValue.startsWith(v));
    case "ends_with":
      return values.some((v) => stringValue.endsWith(v));
  }

  // Numeric operators
  const numericValue = Number(rawValue);
  if (!Number.isNaN(numericValue)) {
    switch (operator) {
      case "equals":
        return values.some((v) => numericValue === Number(v));
      case "not_equals":
        return values.every((v) => numericValue !== Number(v));
      case "gt":
        return values.some((v) => numericValue > Number(v));
      case "gte":
        return values.some((v) => numericValue >= Number(v));
      case "lt":
        return values.some((v) => numericValue < Number(v));
      case "lte":
        return values.some((v) => numericValue <= Number(v));
      case "in_between": {
        if (values.length < 2) return false;
        const low = Number(values[0]);
        const high = Number(values[1]);
        return numericValue >= low && numericValue <= high;
      }
    }
  }

  // Date operators
  const dateValue = new Date(String(rawValue));
  if (!Number.isNaN(dateValue.getTime())) {
    const dateMs = dateValue.getTime();
    switch (operator) {
      case "before":
        return values.some((v) => dateMs < new Date(v).getTime());
      case "after":
        return values.some((v) => dateMs > new Date(v).getTime());
      case "on": {
        return values.some((v) => {
          const target = new Date(v);
          return (
            dateValue.getFullYear() === target.getFullYear() &&
            dateValue.getMonth() === target.getMonth() &&
            dateValue.getDate() === target.getDate()
          );
        });
      }
      case "not_on": {
        return values.every((v) => {
          const target = new Date(v);
          return !(
            dateValue.getFullYear() === target.getFullYear() &&
            dateValue.getMonth() === target.getMonth() &&
            dateValue.getDate() === target.getDate()
          );
        });
      }
      case "in_the_last": {
        if (values.length === 0) return false;
        const ms = parseDurationMs(values[0]);
        if (ms === null) return false;
        const now = Date.now();
        return dateMs >= now - ms && dateMs <= now;
      }
      case "not_in_the_last": {
        if (values.length === 0) return false;
        const ms = parseDurationMs(values[0]);
        if (ms === null) return false;
        const now = Date.now();
        return dateMs < now - ms;
      }
      case "between_dates": {
        if (values.length < 2) return false;
        const start = new Date(values[0]).getTime();
        const end = new Date(values[1]).getTime();
        return dateMs >= start && dateMs <= end;
      }
    }
  }

  return false;
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
