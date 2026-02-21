import type { FilterFieldDef } from "@/types/filters";

export const FILTER_FIELDS: FilterFieldDef[] = [
  // Attack characteristics
  {
    key: "type",
    label: "Attack type",
    category: "Attack characteristics",
    type: "enum",
    operators: ["is", "is_not", "is_any_of", "is_none_of", "is_set", "is_not_set"],
    values: [
      "XSS",
      "SQL Injection",
      "BOLA Attack",
      "Scraper Bot",
      "Brute Force",
      "Path Traversal",
      "Command Injection",
      "CSRF",
      "XXE",
      "Rate Limit Bypass",
      "LDAP Injection",
      "SSTI",
      "IDOR",
      "HTTP Response Splitting",
      "Logic Bypass",
      "XML Bomb",
      "Prototype Pollution",
      "JWT Attack",
      "GraphQL Abuse",
      "Mass Assignment",
    ],
  },
  {
    key: "status",
    label: "Status",
    category: "Attack characteristics",
    type: "enum",
    operators: ["is", "is_not", "is_any_of", "is_none_of", "is_set", "is_not_set"],
    values: ["Blocked", "Monitored", "Started"],
  },
  {
    key: "blocking_status",
    label: "Blocking status",
    category: "Attack characteristics",
    type: "enum",
    operators: ["is", "is_not", "is_any_of", "is_none_of", "is_set", "is_not_set"],
    values: ["Active blocking", "Passive monitoring", "Not configured"],
  },
  {
    key: "http_status_code",
    label: "HTTP status code",
    category: "Attack characteristics",
    type: "enum",
    operators: ["is", "is_not", "is_any_of", "is_none_of", "is_set", "is_not_set"],
    values: ["200", "401", "403", "404", "500"],
  },
  {
    key: "impact",
    label: "Impact",
    category: "Attack characteristics",
    type: "enum",
    operators: ["is", "is_not", "is_any_of", "is_none_of", "is_set", "is_not_set"],
    values: ["High", "Medium", "Low"],
  },
  // Target & Context
  {
    key: "endpoints",
    label: "Endpoint",
    category: "Target & Context",
    type: "text",
    operators: ["is", "is_not", "contains", "does_not_contain", "starts_with", "ends_with", "is_set", "is_not_set"],
  },
  {
    key: "host",
    label: "Hostname",
    category: "Target & Context",
    type: "text",
    operators: ["is", "is_not", "contains", "does_not_contain", "starts_with", "ends_with", "is_set", "is_not_set"],
  },
  {
    key: "parameter",
    label: "Parameter",
    category: "Target & Context",
    type: "text",
    operators: ["is", "is_not", "contains", "does_not_contain", "starts_with", "ends_with", "is_set", "is_not_set"],
  },
  // Temporal
  {
    key: "timeline.last_seen",
    label: "Last seen",
    category: "Temporal",
    type: "date",
    operators: ["in_the_last", "not_in_the_last", "before", "after", "on", "not_on", "between_dates", "is_set", "is_not_set"],
  },
  {
    key: "timeline.first_detected",
    label: "First detected",
    category: "Temporal",
    type: "date",
    operators: ["in_the_last", "not_in_the_last", "before", "after", "on", "not_on", "between_dates", "is_set", "is_not_set"],
  },
  {
    key: "response_code",
    label: "Response code",
    category: "Attack characteristics",
    type: "numeric",
    operators: ["equals", "not_equals", "gt", "gte", "lt", "lte", "in_between", "is_set", "is_not_set"],
  },
];

export function getFieldByKey(key: string): FilterFieldDef | undefined {
  return FILTER_FIELDS.find((f) => f.key === key);
}

export function getFieldsByCategory(
  category: FilterFieldDef["category"],
): FilterFieldDef[] {
  return FILTER_FIELDS.filter((f) => f.category === category);
}

export function getEnumFields(): FilterFieldDef[] {
  return FILTER_FIELDS.filter((f) => f.type === "enum");
}

export function getTextFields(): FilterFieldDef[] {
  return FILTER_FIELDS.filter((f) => f.type === "text");
}

export function getDateFields(): FilterFieldDef[] {
  return FILTER_FIELDS.filter((f) => f.type === "date");
}

export function getNumericFields(): FilterFieldDef[] {
  return FILTER_FIELDS.filter((f) => f.type === "numeric");
}
