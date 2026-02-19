"use client";

import { Suspense, useMemo } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { useFilterUrlState } from "@/hooks/use-filter-url-state";
import { evaluateExpression } from "@/lib/filter-engine";

interface Attack {
  id: string;
  name: string;
  type: string;
  status: "Blocked" | "Monitored" | "Started";
  impact: "High" | "Medium" | "Low";
  response_code: number;
  host: string;
  endpoints: string;
  parameter: string;
  blocking_status: string;
  sources: { countries: string[]; ips: string[] };
}

const MOCK_ATTACKS: Attack[] = [
  { id: "atk_01", name: "XSS in query.filter", type: "XSS", status: "Blocked", impact: "High", response_code: 200, host: "api.example.com", endpoints: "GET /v1/api/search", parameter: "query.filter", blocking_status: "Active blocking", sources: { countries: ["US", "UK"], ips: ["10.0.0.1"] } },
  { id: "atk_02", name: "SQL Injection in login", type: "SQL Injection", status: "Monitored", impact: "High", response_code: 401, host: "auth.example.com", endpoints: "POST /v1/auth/login", parameter: "body.username", blocking_status: "Passive monitoring", sources: { countries: ["Italy"], ips: ["10.0.0.2"] } },
  { id: "atk_03", name: "BOLA on orders endpoint", type: "BOLA Attack", status: "Blocked", impact: "High", response_code: 403, host: "orders.example.com", endpoints: "GET /v1/api/orders/{id}", parameter: "path.id", blocking_status: "Active blocking", sources: { countries: ["China"], ips: ["10.0.0.3"] } },
  { id: "atk_04", name: "Scraper bot on catalog", type: "Scraper Bot", status: "Started", impact: "Low", response_code: 200, host: "shop.example.com", endpoints: "GET /v1/catalog", parameter: "query.page", blocking_status: "Not configured", sources: { countries: ["Russia"], ips: ["10.0.0.4"] } },
  { id: "atk_05", name: "Brute force login attempts", type: "Brute Force", status: "Monitored", impact: "Medium", response_code: 401, host: "auth.example.com", endpoints: "POST /v1/auth/login", parameter: "body.password", blocking_status: "Passive monitoring", sources: { countries: ["Brazil"], ips: ["10.0.0.5"] } },
  { id: "atk_06", name: "Path traversal in uploads", type: "Path Traversal", status: "Blocked", impact: "High", response_code: 403, host: "files.example.com", endpoints: "POST /v1/upload", parameter: "body.filename", blocking_status: "Active blocking", sources: { countries: ["US"], ips: ["10.0.0.6"] } },
  { id: "atk_07", name: "CSRF on password change", type: "CSRF", status: "Monitored", impact: "Medium", response_code: 200, host: "account.example.com", endpoints: "POST /v1/account/password", parameter: "header.referer", blocking_status: "Passive monitoring", sources: { countries: ["Germany"], ips: ["10.0.0.7"] } },
  { id: "atk_08", name: "XXE in XML parser", type: "XXE", status: "Blocked", impact: "High", response_code: 500, host: "api.example.com", endpoints: "POST /v1/import", parameter: "body.xml", blocking_status: "Active blocking", sources: { countries: ["Japan"], ips: ["10.0.0.8"] } },
  { id: "atk_09", name: "Rate limit bypass via headers", type: "Rate Limit Bypass", status: "Started", impact: "Low", response_code: 200, host: "api.example.com", endpoints: "GET /v1/api/data", parameter: "header.x-forwarded-for", blocking_status: "Not configured", sources: { countries: ["India"], ips: ["10.0.0.9"] } },
  { id: "atk_10", name: "Command injection in exec", type: "Command Injection", status: "Blocked", impact: "High", response_code: 500, host: "admin.example.com", endpoints: "POST /v1/admin/exec", parameter: "body.command", blocking_status: "Active blocking", sources: { countries: ["US", "Canada"], ips: ["10.0.0.10"] } },
  { id: "atk_11", name: "LDAP injection in search", type: "LDAP Injection", status: "Monitored", impact: "Medium", response_code: 200, host: "directory.example.com", endpoints: "GET /v1/ldap/search", parameter: "query.filter", blocking_status: "Passive monitoring", sources: { countries: ["France"], ips: ["10.0.0.11"] } },
  { id: "atk_12", name: "SSTI in template engine", type: "SSTI", status: "Blocked", impact: "High", response_code: 500, host: "render.example.com", endpoints: "POST /v1/render", parameter: "body.template", blocking_status: "Active blocking", sources: { countries: ["UK"], ips: ["10.0.0.12"] } },
  { id: "atk_13", name: "IDOR on user profiles", type: "IDOR", status: "Monitored", impact: "Medium", response_code: 200, host: "users.example.com", endpoints: "GET /v1/users/{id}", parameter: "path.id", blocking_status: "Passive monitoring", sources: { countries: ["Australia"], ips: ["10.0.0.13"] } },
  { id: "atk_14", name: "JWT token forgery", type: "JWT Attack", status: "Blocked", impact: "High", response_code: 401, host: "auth.example.com", endpoints: "POST /v1/auth/refresh", parameter: "header.authorization", blocking_status: "Active blocking", sources: { countries: ["China", "Russia"], ips: ["10.0.0.14"] } },
  { id: "atk_15", name: "GraphQL depth abuse", type: "GraphQL Abuse", status: "Started", impact: "Medium", response_code: 200, host: "graphql.example.com", endpoints: "POST /graphql", parameter: "body.query", blocking_status: "Not configured", sources: { countries: ["US"], ips: ["10.0.0.15"] } },
  { id: "atk_16", name: "Mass assignment on user", type: "Mass Assignment", status: "Monitored", impact: "Medium", response_code: 200, host: "api.example.com", endpoints: "PUT /v1/users/{id}", parameter: "body.role", blocking_status: "Passive monitoring", sources: { countries: ["Nigeria"], ips: ["10.0.0.16"] } },
  { id: "atk_17", name: "Prototype pollution in merge", type: "Prototype Pollution", status: "Blocked", impact: "High", response_code: 500, host: "api.example.com", endpoints: "POST /v1/config/merge", parameter: "body.__proto__", blocking_status: "Active blocking", sources: { countries: ["US"], ips: ["10.0.0.17"] } },
  { id: "atk_18", name: "HTTP response splitting", type: "HTTP Response Splitting", status: "Monitored", impact: "Low", response_code: 200, host: "proxy.example.com", endpoints: "GET /redirect", parameter: "query.url", blocking_status: "Passive monitoring", sources: { countries: ["South Korea"], ips: ["10.0.0.18"] } },
  { id: "atk_19", name: "Logic bypass in checkout", type: "Logic Bypass", status: "Blocked", impact: "High", response_code: 200, host: "shop.example.com", endpoints: "POST /v1/checkout", parameter: "body.discount_code", blocking_status: "Active blocking", sources: { countries: ["US", "Mexico"], ips: ["10.0.0.19"] } },
  { id: "atk_20", name: "XML bomb denial of service", type: "XML Bomb", status: "Started", impact: "Medium", response_code: 500, host: "api.example.com", endpoints: "POST /v1/import", parameter: "body.xml", blocking_status: "Not configured", sources: { countries: ["Iran"], ips: ["10.0.0.20"] } },
];

const statusColors: Record<string, string> = {
  Blocked: "text-red-600 dark:text-red-400",
  Monitored: "text-yellow-600 dark:text-yellow-400",
  Started: "text-blue-600 dark:text-blue-400",
};

const impactColors: Record<string, string> = {
  High: "text-red-600 dark:text-red-400",
  Medium: "text-yellow-600 dark:text-yellow-400",
  Low: "text-green-600 dark:text-green-400",
};

function computeTextSuggestions(attacks: Attack[]): Record<string, string[]> {
  return {
    endpoints: [...new Set(attacks.map((a) => a.endpoints))],
    host: [...new Set(attacks.map((a) => a.host))],
    parameter: [...new Set(attacks.map((a) => a.parameter))],
  };
}

function HomeContent() {
  const {
    filterState,
    addFilter,
    removeFilter,
    updateFilterValues,
    updateOperator,
    clearAll,
  } = useFilterUrlState();

  const textSuggestions = useMemo(
    () => computeTextSuggestions(MOCK_ATTACKS),
    [],
  );

  const filteredAttacks = useMemo(
    () =>
      evaluateExpression(
        MOCK_ATTACKS as unknown as Record<string, unknown>[],
        filterState,
      ) as unknown as Attack[],
    [filterState],
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Attacks:{" "}
          <span className="text-muted-foreground">
            {filteredAttacks.length}
          </span>
        </h1>
      </div>

      <FilterBar
        filterState={filterState}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onUpdateFilterValues={updateFilterValues}
        onUpdateOperator={updateOperator}
        onClearAll={clearAll}
        textSuggestions={textSuggestions}
        className="mb-4"
      />

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Attack Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Impact</th>
              <th className="px-4 py-3 text-left font-medium">HTTP Status</th>
              <th className="px-4 py-3 text-left font-medium">Hostname</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttacks.map((attack) => (
              <tr
                key={attack.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3 font-medium">{attack.name}</td>
                <td className="px-4 py-3">{attack.type}</td>
                <td className={`px-4 py-3 ${statusColors[attack.status]}`}>
                  {attack.status}
                </td>
                <td className={`px-4 py-3 ${impactColors[attack.impact]}`}>
                  {attack.impact}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {attack.response_code}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {attack.host}
                </td>
              </tr>
            ))}
            {filteredAttacks.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No attacks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>
      </main>
    </div>
  );
}
