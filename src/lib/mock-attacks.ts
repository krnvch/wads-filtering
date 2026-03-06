export interface Attack {
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
  timeline: { last_seen: string; first_detected: string };
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export const MOCK_ATTACKS: Attack[] = [
  { id: "atk_01", name: "XSS in query.filter", type: "XSS", status: "Blocked", impact: "High", response_code: 200, host: "api.example.com", endpoints: "GET /v1/api/search", parameter: "query.filter", blocking_status: "Active blocking", sources: { countries: ["US", "UK"], ips: ["44.209.156.240"] }, timeline: { last_seen: hoursAgo(2), first_detected: hoursAgo(480) } },
  { id: "atk_02", name: "SQL Injection in login", type: "SQL Injection", status: "Monitored", impact: "High", response_code: 401, host: "auth.example.com", endpoints: "POST /v1/auth/login", parameter: "body.username", blocking_status: "Passive monitoring", sources: { countries: ["Italy"], ips: ["44.209.157.242"] }, timeline: { last_seen: hoursAgo(6), first_detected: hoursAgo(1200) } },
  { id: "atk_03", name: "BOLA on orders endpoint", type: "BOLA Attack", status: "Blocked", impact: "High", response_code: 403, host: "orders.example.com", endpoints: "GET /v1/api/orders/{id}", parameter: "path.id", blocking_status: "Active blocking", sources: { countries: ["China"], ips: ["44.209.156.192"] }, timeline: { last_seen: hoursAgo(18), first_detected: hoursAgo(360) } },
  { id: "atk_04", name: "Scraper bot on catalog", type: "Scraper Bot", status: "Started", impact: "Low", response_code: 200, host: "shop.example.com", endpoints: "GET /v1/catalog", parameter: "query.page", blocking_status: "Not configured", sources: { countries: ["Russia"], ips: ["192.168.1.50"] }, timeline: { last_seen: hoursAgo(30), first_detected: hoursAgo(72) } },
  { id: "atk_05", name: "Brute force login attempts", type: "Brute Force", status: "Monitored", impact: "Medium", response_code: 401, host: "auth.example.com", endpoints: "POST /v1/auth/login", parameter: "body.password", blocking_status: "Passive monitoring", sources: { countries: ["Brazil"], ips: ["192.168.1.100"] }, timeline: { last_seen: hoursAgo(48), first_detected: hoursAgo(2160) } },
  { id: "atk_06", name: "Path traversal in uploads", type: "Path Traversal", status: "Blocked", impact: "High", response_code: 403, host: "files.example.com", endpoints: "POST /v1/upload", parameter: "body.filename", blocking_status: "Active blocking", sources: { countries: ["US"], ips: ["10.0.0.6"] }, timeline: { last_seen: hoursAgo(72), first_detected: hoursAgo(720) } },
  { id: "atk_07", name: "CSRF on password change", type: "CSRF", status: "Monitored", impact: "Medium", response_code: 200, host: "account.example.com", endpoints: "POST /v1/account/password", parameter: "header.referer", blocking_status: "Passive monitoring", sources: { countries: ["Germany"], ips: ["10.0.0.7"] }, timeline: { last_seen: hoursAgo(120), first_detected: hoursAgo(4320) } },
  { id: "atk_08", name: "XXE in XML parser", type: "XXE", status: "Blocked", impact: "High", response_code: 500, host: "api.example.com", endpoints: "POST /v1/import", parameter: "body.xml", blocking_status: "Active blocking", sources: { countries: ["Japan"], ips: ["10.0.0.8"] }, timeline: { last_seen: hoursAgo(1), first_detected: hoursAgo(24) } },
  { id: "atk_09", name: "Rate limit bypass via headers", type: "Rate Limit Bypass", status: "Started", impact: "Low", response_code: 200, host: "api.example.com", endpoints: "GET /v1/api/data", parameter: "header.x-forwarded-for", blocking_status: "Not configured", sources: { countries: ["India"], ips: ["10.0.0.9"] }, timeline: { last_seen: hoursAgo(168), first_detected: hoursAgo(1440) } },
  { id: "atk_10", name: "Command injection in exec", type: "Command Injection", status: "Blocked", impact: "High", response_code: 500, host: "admin.example.com", endpoints: "POST /v1/admin/exec", parameter: "body.command", blocking_status: "Active blocking", sources: { countries: ["US", "Canada"], ips: ["10.0.0.10"] }, timeline: { last_seen: hoursAgo(4), first_detected: hoursAgo(168) } },
  { id: "atk_11", name: "LDAP injection in search", type: "LDAP Injection", status: "Monitored", impact: "Medium", response_code: 200, host: "directory.example.com", endpoints: "GET /v1/ldap/search", parameter: "query.filter", blocking_status: "Passive monitoring", sources: { countries: ["France"], ips: ["10.0.0.11"] }, timeline: { last_seen: hoursAgo(240), first_detected: hoursAgo(8640) } },
  { id: "atk_12", name: "SSTI in template engine", type: "SSTI", status: "Blocked", impact: "High", response_code: 500, host: "render.example.com", endpoints: "POST /v1/render", parameter: "body.template", blocking_status: "Active blocking", sources: { countries: ["UK"], ips: ["10.0.0.12"] }, timeline: { last_seen: hoursAgo(12), first_detected: hoursAgo(96) } },
  { id: "atk_13", name: "IDOR on user profiles", type: "IDOR", status: "Monitored", impact: "Medium", response_code: 200, host: "users.example.com", endpoints: "GET /v1/users/{id}", parameter: "path.id", blocking_status: "Passive monitoring", sources: { countries: ["Australia"], ips: ["10.0.0.13"] }, timeline: { last_seen: hoursAgo(336), first_detected: hoursAgo(5040) } },
  { id: "atk_14", name: "JWT token forgery", type: "JWT Attack", status: "Blocked", impact: "High", response_code: 401, host: "auth.example.com", endpoints: "POST /v1/auth/refresh", parameter: "header.authorization", blocking_status: "Active blocking", sources: { countries: ["China", "Russia"], ips: ["10.0.0.14"] }, timeline: { last_seen: hoursAgo(500), first_detected: hoursAgo(6480) } },
  { id: "atk_15", name: "GraphQL depth abuse", type: "GraphQL Abuse", status: "Started", impact: "Medium", response_code: 200, host: "graphql.example.com", endpoints: "POST /graphql", parameter: "body.query", blocking_status: "Not configured", sources: { countries: ["US"], ips: ["10.0.0.15"] }, timeline: { last_seen: hoursAgo(96), first_detected: hoursAgo(240) } },
  { id: "atk_16", name: "Mass assignment on user", type: "Mass Assignment", status: "Monitored", impact: "Medium", response_code: 200, host: "api.example.com", endpoints: "PUT /v1/users/{id}", parameter: "body.role", blocking_status: "Passive monitoring", sources: { countries: ["Nigeria"], ips: ["10.0.0.16"] }, timeline: { last_seen: hoursAgo(720), first_detected: hoursAgo(8760) } },
  { id: "atk_17", name: "Prototype pollution in merge", type: "Prototype Pollution", status: "Blocked", impact: "High", response_code: 500, host: "api.example.com", endpoints: "POST /v1/config/merge", parameter: "body.__proto__", blocking_status: "Active blocking", sources: { countries: ["US"], ips: ["10.0.0.17"] }, timeline: { last_seen: hoursAgo(8), first_detected: hoursAgo(48) } },
  { id: "atk_18", name: "HTTP response splitting", type: "HTTP Response Splitting", status: "Monitored", impact: "Low", response_code: 200, host: "proxy.example.com", endpoints: "GET /redirect", parameter: "query.url", blocking_status: "Passive monitoring", sources: { countries: ["South Korea"], ips: ["10.0.0.18"] }, timeline: { last_seen: hoursAgo(36), first_detected: hoursAgo(504) } },
  { id: "atk_19", name: "Logic bypass in checkout", type: "Logic Bypass", status: "Blocked", impact: "High", response_code: 200, host: "shop.example.com", endpoints: "POST /v1/checkout", parameter: "body.discount_code", blocking_status: "Active blocking", sources: { countries: ["US", "Mexico"], ips: ["10.0.0.19"] }, timeline: { last_seen: hoursAgo(200), first_detected: hoursAgo(3360) } },
  { id: "atk_20", name: "XML bomb denial of service", type: "XML Bomb", status: "Started", impact: "Medium", response_code: 500, host: "api.example.com", endpoints: "POST /v1/import", parameter: "body.xml", blocking_status: "Not configured", sources: { countries: ["Iran"], ips: ["10.0.0.20"] }, timeline: { last_seen: hoursAgo(0.5), first_detected: hoursAgo(6) } },
];

export const statusColors: Record<string, string> = {
  Blocked: "text-red-600 dark:text-red-400",
  Monitored: "text-yellow-600 dark:text-yellow-400",
  Started: "text-blue-600 dark:text-blue-400",
};

export const impactColors: Record<string, string> = {
  High: "text-red-600 dark:text-red-400",
  Medium: "text-yellow-600 dark:text-yellow-400",
  Low: "text-green-600 dark:text-green-400",
};

export function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function computeTextSuggestions(attacks: Attack[]): Record<string, string[]> {
  return {
    endpoints: [...new Set(attacks.map((a) => a.endpoints))],
    host: [...new Set(attacks.map((a) => a.host))],
    parameter: [...new Set(attacks.map((a) => a.parameter))],
    "sources.ips": [...new Set(attacks.flatMap((a) => a.sources.ips))],
  };
}
