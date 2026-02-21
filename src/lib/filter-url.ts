import type {
  FilterCondition,
  FilterGroup,
  FilterOperator,
  FilterState,
} from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";
import { FILTER_FIELDS, getFieldByKey } from "./filter-schema";
import { sanitizeExpression } from "./filter-validation";

const VALID_OPERATORS = new Set<FilterOperator>([
  "is",
  "is_not",
  "is_set",
  "is_not_set",
  "is_any_of",
  "is_none_of",
  "contains",
  "does_not_contain",
  "starts_with",
  "ends_with",
  "equals",
  "not_equals",
  "gt",
  "gte",
  "lt",
  "lte",
  "in_between",
  "before",
  "after",
  "on",
  "not_on",
  "in_the_last",
  "not_in_the_last",
  "between_dates",
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
 * Serialize a single condition to URL params with an optional prefix.
 */
function serializeCondition(
  params: URLSearchParams,
  condition: FilterCondition,
  prefix: string,
): void {
  const { field, operator, values } = condition;
  if (values.length === 0) return;

  params.set(`${prefix}${field}`, values.join(","));

  const defaultOp = getDefaultOperator(field);
  if (operator !== defaultOp) {
    params.set(`${prefix}${field}__op`, operator);
  }
}

/**
 * Serialize filter state to URL search params.
 *
 * Format (ADR-001 Hybrid):
 *  - Field values: `?status=Blocked,Monitored`
 *  - Operator override (non-default only): `?status__op=is_not`
 *  - Groups: `?g1.status=Blocked&g1.type=XSS&g1__op=OR`
 *
 * Backward compatible: AND-only flat conditions have no prefix.
 */
export function serializeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  let groupIndex = 1;

  for (const child of state.expression.children) {
    if (isFilterCondition(child)) {
      serializeCondition(params, child, "");
    } else if (isFilterGroup(child)) {
      const prefix = `g${groupIndex}.`;

      for (const groupChild of child.children) {
        if (isFilterCondition(groupChild)) {
          serializeCondition(params, groupChild, prefix);
        }
      }

      // Write group connector (only OR is meaningful — AND is default)
      if (child.connector === "OR") {
        params.set(`g${groupIndex}__op`, "OR");
      }

      groupIndex++;
    }
  }

  return params;
}

/**
 * Deserialize URL search params to filter state.
 *
 * - Parses `field=val1,val2` + optional `field__op=operator`
 * - Parses `g{N}.field=val` + `g{N}__op=OR` for groups
 * - Skips unknown fields
 * - Falls back to default operator for invalid `__op` values
 * - Uses deterministic IDs (`filter_${field}`, `group_${N}`)
 * - Sanitizes the result (promotes single-child groups, removes empty groups)
 */
export function deserializeFilterState(params: URLSearchParams): FilterState {
  const rootConditions: FilterCondition[] = [];
  const groupData = new Map<
    number,
    { conditions: FilterCondition[]; connector: "AND" | "OR" }
  >();

  // Classify params into root-level and group-level
  for (const [key, value] of params.entries()) {
    // Skip operator override params
    if (key.endsWith("__op")) continue;

    // Check for group prefix: g{N}.field
    const groupMatch = key.match(/^g(\d+)\.(.+)$/);

    if (groupMatch) {
      const groupNum = parseInt(groupMatch[1], 10);
      const fieldKey = groupMatch[2];

      if (!KNOWN_FIELD_KEYS.has(fieldKey)) continue;

      const values = value.split(",").filter(Boolean);
      if (values.length === 0) continue;

      const opParam = params.get(`g${groupNum}.${fieldKey}__op`);
      const defaultOp = getDefaultOperator(fieldKey);
      const operator: FilterOperator =
        opParam && VALID_OPERATORS.has(opParam as FilterOperator)
          ? (opParam as FilterOperator)
          : defaultOp;

      const fieldDef = getFieldByKey(fieldKey);
      const condition: FilterCondition = {
        id: `filter_g${groupNum}_${fieldKey}`,
        field: fieldKey,
        fieldLabel: fieldDef?.label ?? fieldKey,
        operator,
        values,
      };

      if (!groupData.has(groupNum)) {
        // Read group connector
        const groupOpParam = params.get(`g${groupNum}__op`);
        const connector = groupOpParam === "OR" ? "OR" : "AND";
        groupData.set(groupNum, { conditions: [], connector });
      }

      groupData.get(groupNum)!.conditions.push(condition);
    } else {
      // Root-level condition
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

      rootConditions.push({
        id: `filter_${key}`,
        field: key,
        fieldLabel: fieldDef?.label ?? key,
        operator,
        values,
      });
    }
  }

  // Build children: root conditions first, then groups in order
  const children: (FilterCondition | FilterGroup)[] = [...rootConditions];

  const sortedGroupNums = [...groupData.keys()].sort((a, b) => a - b);
  for (const groupNum of sortedGroupNums) {
    const data = groupData.get(groupNum)!;
    if (data.conditions.length === 0) continue;

    const group: FilterGroup = {
      id: `group_${groupNum}`,
      connector: data.connector,
      children: data.conditions,
    };
    children.push(group);
  }

  const state: FilterState = {
    expression: {
      id: "root",
      connector: "AND",
      children,
    },
  };

  return sanitizeExpression(state);
}
