import type { FilterFieldDef } from "@/types/filters";

export const FILTER_FIELDS: FilterFieldDef[] = [
  // Attack characteristics
  {
    key: "type",
    label: "Attack type",
    category: "Attack characteristics",
    type: "enum",
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
    values: ["Blocked", "Monitored", "Started"],
  },
  {
    key: "blocking_status",
    label: "Blocking status",
    category: "Attack characteristics",
    type: "enum",
    values: ["Active blocking", "Passive monitoring", "Not configured"],
  },
  {
    key: "http_status_code",
    label: "HTTP status code",
    category: "Attack characteristics",
    type: "enum",
    values: ["200", "401", "403", "404", "500"],
  },
  {
    key: "impact",
    label: "Impact",
    category: "Attack characteristics",
    type: "enum",
    values: ["High", "Medium", "Low"],
  },
  // Target & Context
  {
    key: "endpoints",
    label: "Endpoint",
    category: "Target & Context",
    type: "text",
  },
  {
    key: "host",
    label: "Hostname",
    category: "Target & Context",
    type: "text",
  },
  {
    key: "parameter",
    label: "Parameter",
    category: "Target & Context",
    type: "text",
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
