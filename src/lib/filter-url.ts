import type { FilterOperator, FilterState } from "@/types/filters";
import { FILTER_FIELDS, getFieldByKey } from "./filter-schema";

const VALID_OPERATORS = new Set<FilterOperator>([
  "is",
  "is_not",
  "contains",
  "does_not_contain",
]);

const DEFAULT_OPERATOR: Record<string, FilterOperator> = {
  enum: "is",
  text: "contains",
};

function getDefaultOperator(fieldKey: string): FilterOperator {
  const field = getFieldByKey(fieldKey);
  return DEFAULT_OPERATOR[field?.type ?? "enum"] ?? "is";
}

const KNOWN_FIELD_KEYS = new Set(FILTER_FIELDS.map((f) => f.key));

/**
 * Serialize filter state to URL search params.
 *
 * Format (ADR-001 Hybrid):
 *  - Field values: `?status=Blocked,Monitored`
 *  - Operator override (non-default only): `?status__op=is_not`
 *  - Omits `__op` param when operator matches the field's default
 *
 * Phase 2 scope: AND-only flat conditions.
 */
export function serializeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  for (const child of state.expression.children) {
    if (!("field" in child)) continue;

    const { field, operator, values } = child;
    if (values.length === 0) continue;

    params.set(field, values.join(","));

    const defaultOp = getDefaultOperator(field);
    if (operator !== defaultOp) {
      params.set(`${field}__op`, operator);
    }
  }

  return params;
}

/**
 * Deserialize URL search params to filter state.
 *
 * - Parses `field=val1,val2` + optional `field__op=operator`
 * - Skips unknown fields
 * - Falls back to default operator for invalid `__op` values
 * - Uses deterministic IDs (`filter_${field}`) for stable references
 */
export function deserializeFilterState(params: URLSearchParams): FilterState {
  const children: FilterState["expression"]["children"] = [];

  for (const [key, value] of params.entries()) {
    // Skip operator override params — they're consumed with their field
    if (key.endsWith("__op")) continue;

    // Skip unknown fields
    if (!KNOWN_FIELD_KEYS.has(key)) continue;

    const values = value.split(",").filter(Boolean);
    if (values.length === 0) continue;

    const opParam = params.get(`${key}__op`);
    const defaultOp = getDefaultOperator(key);
    const operator: FilterOperator =
      opParam && VALID_OPERATORS.has(opParam as FilterOperator)
        ? (opParam as FilterOperator)
        : defaultOp;

    const fieldDef = getFieldByKey(key);

    children.push({
      id: `filter_${key}`,
      field: key,
      fieldLabel: fieldDef?.label ?? key,
      operator,
      values,
    });
  }

  return {
    expression: {
      id: "root",
      connector: "AND",
      children,
    },
  };
}
