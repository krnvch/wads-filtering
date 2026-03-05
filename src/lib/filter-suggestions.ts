import type { FilterFieldDef } from "@/types/filters";
import type { TokenFilterOperator } from "@/types/tokens";
import { OPERATOR_LABELS } from "@/types/tokens";

export interface FilterSuggestion {
  field: string;
  fieldLabel: string;
  operator: TokenFilterOperator;
  operatorLabel: string;
  values: string[];
}

/**
 * Generate complete filter suggestions from matching fields and search text.
 *
 * Algorithm:
 * 1. Exclude numeric fields (can't guess values)
 * 2. Prioritize: enum fields with value-match > other enum > date > text (only if search >= 2 chars)
 * 3. Round-robin across fields — each field contributes max 1 suggestion
 * 4. Per field type:
 *    - Enum: operator "is", value = first enum value matching search text (fallback: first value)
 *    - Text: operator "contains", value = search text
 *    - Date: operator "in_the_last", value = "7d"
 */
export function generateSuggestions(
  matchingFields: FilterFieldDef[],
  searchText: string,
  maxSuggestions: number = 3,
): FilterSuggestion[] {
  if (!searchText || matchingFields.length === 0) return [];

  const q = searchText.toLowerCase();

  // Separate by type, exclude numeric
  const enumWithMatch: { field: FilterFieldDef; matchedValue: string }[] = [];
  const enumWithoutMatch: FilterFieldDef[] = [];
  const dateFields: FilterFieldDef[] = [];
  const textFields: FilterFieldDef[] = [];

  for (const f of matchingFields) {
    if (f.type === "numeric") continue;
    if (f.type === "ip") continue;

    if (f.type === "enum") {
      const matchedValue = f.values?.find((v) =>
        v.toLowerCase().includes(q),
      );
      if (matchedValue) {
        enumWithMatch.push({ field: f, matchedValue });
      } else {
        enumWithoutMatch.push(f);
      }
    } else if (f.type === "date") {
      dateFields.push(f);
    } else if (f.type === "text") {
      // Only include text fields when search is at least 2 chars
      if (searchText.length >= 2) {
        textFields.push(f);
      }
    }
  }

  const suggestions: FilterSuggestion[] = [];

  // Priority order: enum with value-match, enum without, date, text
  const buckets: (() => FilterSuggestion | null)[] = [];

  for (const { field, matchedValue } of enumWithMatch) {
    buckets.push(() => ({
      field: field.key,
      fieldLabel: field.label,
      operator: "is",
      operatorLabel: OPERATOR_LABELS.is,
      values: [matchedValue],
    }));
  }

  for (const field of enumWithoutMatch) {
    const firstValue = field.values?.[0];
    if (!firstValue) continue;
    buckets.push(() => ({
      field: field.key,
      fieldLabel: field.label,
      operator: "is",
      operatorLabel: OPERATOR_LABELS.is,
      values: [firstValue],
    }));
  }

  for (const field of dateFields) {
    buckets.push(() => ({
      field: field.key,
      fieldLabel: field.label,
      operator: "in_the_last",
      operatorLabel: OPERATOR_LABELS.in_the_last,
      values: ["7d"],
    }));
  }

  for (const field of textFields) {
    buckets.push(() => ({
      field: field.key,
      fieldLabel: field.label,
      operator: "contains",
      operatorLabel: OPERATOR_LABELS.contains,
      values: [searchText],
    }));
  }

  for (const generate of buckets) {
    if (suggestions.length >= maxSuggestions) break;
    const suggestion = generate();
    if (suggestion) suggestions.push(suggestion);
  }

  return suggestions;
}
