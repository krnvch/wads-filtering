# Field Type System — Unified Recommendations

**Date**: 2026-03-05
**Status**: Team consensus after cross-agent research + adversarial review
**Input documents**:
1. `semantic-field-types-competitive.md` — UX Researcher (10-product, 14-data-type competitive analysis)
2. `field-type-system-design.md` — Interaction Designer (type taxonomy, operator matrix, component specs)
3. `field-types-adversarial-prereview.md` — Red Hat Researcher (stress-test of the expansion idea itself)

---

## Executive Summary

The team analyzed 13 candidate data types (IP, UUID, URL, hash, port, CIDR, country code, CVE, user agent, email, duration, version, tags) across 10 security/observability products. The finding is unanimous:

**Only IP addresses justify a new dedicated field type.** Everything else maps to existing types (`text`, `numeric`, `enum`) with a semantic validation layer on top.

The Red Hat review challenges even the IP type, proposing an alternative: keep IP as `text` with per-field operators (the backend handles CIDR matching). This is the key unresolved tension.

---

## The Three-Question Test

Every candidate type was evaluated against:

1. **Does it need operators that no existing type provides?** → Only IP (subnet matching)
2. **Does it need a fundamentally different input component?** → Nothing does
3. **Is query frequency high enough to justify investment?** → IP yes, everything else <5%

---

## Decisions

### Decision 1: Type System — 5 Core Types (Add IP Only)

| Type | Status | Fields |
|------|--------|--------|
| `enum` | **Existing** | Status, Type, Impact, Blocking Status, HTTP Status Code, Country |
| `text` | **Existing** | Endpoints, Host, Parameter, UUID fields, hash fields, CVE/CWE, email, user agent |
| `numeric` | **Existing** | Response Code, ports, request/session counts |
| `date` | **Existing** | Last Seen, First Detected |
| `ip` | **NEW** | Source IPs, destination IPs |

**Why only IP?** Subnet/CIDR matching (`is_in_subnet`, `is_not_in_subnet`) cannot be expressed by any existing text operator. `starts_with "192.168"` is NOT equivalent to `in_subnet "192.168.0.0/16"` — the former matches `192.168.x.x` only, while the latter also matches addresses in the /16 range that don't start with that prefix. This is the only genuinely new semantic that requires a dedicated type.

**Why not UUID, hash, CVE, etc.?** Zero new operators needed. Every operation on UUIDs (exact match, prefix, contains) already exists in `text`. Adding a type for validation alone is over-engineering — validation goes in the semantic layer.

### Decision 2: Semantic Validation Layer (Text Formats)

Instead of creating new types, add **format metadata** to `FilterFieldDef`:

```typescript
interface FilterFieldDef {
  key: string;
  label: string;
  category: string;
  type: FilterFieldType; // "enum" | "text" | "numeric" | "date" | "ip"
  values?: string[];
  operators: TokenFilterOperator[];

  // NEW: Semantic metadata (optional)
  format?: TextFormat;           // "uuid" | "hash_md5" | "hash_sha256" | "cve" | "cwe" | "email" | "url"
  placeholder?: string;          // "e.g., 192.168.1.1"
  displayLabels?: Record<string, string>;  // For enum: "US" → "United States (US)"
  namedValues?: Record<string, string>;    // For numeric: "80" → "HTTP"
  constraints?: {
    min?: number;
    max?: number;
  };
}
```

**Format validators registry**:
```typescript
const FORMAT_VALIDATORS: Record<TextFormat, FormatValidator> = {
  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    message: "Must be a valid UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)",
    placeholder: "e.g., 550e8400-e29b-41d4-...",
    normalize: (v) => v.toLowerCase(),
  },
  hash_sha256: {
    pattern: /^[0-9a-f]{64}$/i,
    message: "Must be a 64-character hex string",
    placeholder: "e.g., a1b2c3d4...",
    normalize: (v) => v.toLowerCase(),
  },
  cve: {
    pattern: /^CVE-\d{4}-\d{4,}$/,
    message: "Must be a CVE ID (e.g., CVE-2024-1234)",
    placeholder: "e.g., CVE-2024-1234",
  },
  cwe: {
    pattern: /^CWE-\d+$/,
    message: "Must be a CWE ID (e.g., CWE-79)",
    placeholder: "e.g., CWE-79",
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Must be a valid email address",
    placeholder: "e.g., user@example.com",
  },
};
```

**Key principle (from Red Hat)**: Format validation is a **hint**, not a gate. If the user types a partial UUID or a non-standard format, the system should **warn** (amber inline text: "This doesn't look like a UUID") but NOT **block**. The backend search may still match. Strict blocking creates a wall between user and data.

**Cost comparison (from Red Hat appendix)**:

| Approach | Touchpoints per new data shape | Total effort |
|----------|-------------------------------|--------------|
| New dedicated type | ~26 files/changes | 2-3 days per type |
| Format validator | ~7 changes | 1-2 hours per format |

### Decision 3: IP Type — Operators and Input

**New operators for `ip` type only**:

| Operator | Display Label | Description | Example |
|----------|--------------|-------------|---------|
| `is` | is | Exact IP match | `192.168.1.1` |
| `is_not` | is not | Exclude specific IP | `192.168.1.1` |
| `is_any_of` | is any of | Match any from list | `192.168.1.1, 10.0.0.1` |
| `is_none_of` | is not any of | Exclude list | `192.168.1.1, 10.0.0.1` |
| `is_in_subnet` | is in subnet | **NEW** — CIDR match | `192.168.0.0/24` |
| `is_not_in_subnet` | is not in subnet | **NEW** — CIDR exclusion | `10.0.0.0/8` |
| `starts_with` | starts with | IP prefix match | `192.168.` |
| `contains` | contains | Substring match | `168.1` |
| `is_set` | is set | Has any value | — |
| `is_not_set` | is not set | Has no value | — |

**Primary**: `is`, `is_not`, `is_in_subnet`, `is_not_in_subnet`
**Advanced**: `is_any_of`, `is_none_of`, `starts_with`, `contains`, `is_set`, `is_not_set`

**Input component: `IpValueInput`**:
- Text input (reuses `TextValueInput` architecture with tag-style badges)
- Placeholder: "e.g., 192.168.1.1 or 10.0.0.0/24"
- **Format validation**: Warn (not block) on invalid IP format
- For `is_in_subnet`: validate CIDR notation (`address/prefix`) — this IS blocking because the backend needs valid CIDR
- For `is`/`is_not`: accept any IP format (IPv4, IPv6, abbreviated)
- Autocomplete: from indexed data (backend endpoint) if available, else none

**Key tension (from Red Hat)**:

> CIDR matching is a server-side computation. The frontend's job is to capture intent and send it. Frontend CIDR validation means duplicated logic with inevitable drift.

**Resolution**: The frontend validates CIDR **format** only (is `10.0.0.0/24` syntactically valid CIDR notation?), NOT **semantics** (is IP X actually in subnet Y?). Format validation prevents obvious typos like `10.0.0.0/33` (invalid prefix length). The backend handles actual matching.

### Decision 4: Each Data Type — Where It Lands

| Data Type | Field Type | Format | New Operators? | New Component? | Notes |
|-----------|-----------|--------|---------------|----------------|-------|
| **IP addresses** | `ip` (NEW) | — | `is_in_subnet`, `is_not_in_subnet` | `IpValueInput` (reuses TextValueInput pattern) | Only new type |
| **UUIDs / Client IDs** | `text` | `uuid` | None | No | Paste-friendly, format hint only |
| **URLs / Endpoints** | `text` | — | None | No | Already implemented |
| **Hashes (MD5, SHA-256)** | `text` | `hash_md5` / `hash_sha256` | None | No | Case normalization, length hint |
| **Ports** | `numeric` | — | None | No | Optional `namedValues` for display (80 → "HTTP") |
| **CIDR ranges** | N/A | N/A | N/A | N/A | CIDR is an operator value on IP, not a type |
| **Country codes** | `enum` | — | None | No | `displayLabels` for "US" → "United States (US)" |
| **CVE IDs** | `text` | `cve` | None | No | Format validation, autocomplete from data |
| **CWE IDs** | `text` | `cwe` | None | No | Format validation |
| **User agents** | `text` | — | None | No | Very long strings, no special handling |
| **Email addresses** | `text` | `email` | None | No | Format hint, domain extraction is backend |
| **Duration / time spans** | `numeric` | — | None | Enhanced `NumericValueInput` with unit picker | Units: ms, s, m, h. Value stored as ms. |
| **Version strings** | `text` | — | None | No | Semver comparison is backend concern |
| **Tags / Labels** | — | — | — | — | Structural pattern, not a scalar type. Decompose into individual fields. |
| **Regular expressions** | — | — | `matches_regex` (cross-type) | No | Power-user operator, not a type. Defer to v3. |

### Decision 5: The `http_status_code` Reclassification

**Critical fix from adversarial review (C1 in validation doc)**:

`http_status_code` is currently `type: "enum"` with only 5 values: `["200", "401", "403", "404", "500"]`. This is incorrect — HTTP status codes are effectively open-ended (dozens of standard codes, plus custom codes from proxies/CDNs).

**Reclassification**: Change `http_status_code` from `enum` to `numeric` with constraints.

```typescript
{
  key: "response_code",  // already exists as numeric
  label: "Response Code",
  type: "numeric",
  constraints: { min: 100, max: 599 },
  namedValues: {
    "200": "OK",
    "301": "Moved Permanently",
    "400": "Bad Request",
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "Not Found",
    "429": "Too Many Requests",
    "500": "Internal Server Error",
    "502": "Bad Gateway",
    "503": "Service Unavailable",
  },
}
```

Remove the duplicate `http_status_code` enum field. The `response_code` numeric field already exists and is the correct model.

### Decision 6: New Error Code — `INVALID_VALUE_FORMAT`

Add one new validation rule for the semantic layer:

```typescript
{
  code: "INVALID_VALUE_FORMAT",
  message: "Value doesn't match expected format for {fieldLabel}.",
  severity: "warning",  // Warn, don't block — backend may still accept it
  recovery: "Check the format. Expected: {formatDescription}",
}
```

This fires when a chip's values don't match the field's `format` validator (e.g., a CVE field with value "not-a-cve"). It's a **warning** (amber), not an error — because the backend might still handle it, and blocking the user would violate the permissive-for-text principle.

---

## The 80/20 Argument (Red Hat Summary)

The Red Hat review makes a powerful case:

> Status + time range + attack type + impact cover ~85% of filter queries. IP exact match is ~5% and works fine with `text`. CIDR/subnet is ~1-2%. Everything else is below 1%.

**The team's response**: We agree. This is why we're adding only 1 new type (IP) and a lightweight format validation layer. We are NOT building 10 types. The total new code is:
- 1 new type (`ip`) with 2 new operators
- 1 new component (`IpValueInput`, heavily reusing TextValueInput)
- 1 format validator registry (~50 lines)
- 1 new error code (`INVALID_VALUE_FORMAT`)

**Total estimated effort**: 3-4 days (vs. 12-18 days if we'd created 6 new types).

---

## The "Per-Field Operators" Alternative (Red Hat Alternative C)

The Red Hat proposes a radical simplification:

> Make operators per-field, not per-type. The `source_ip` field can have `in_subnet` as an operator while remaining `type: "text"`. This separates UI rendering (text input) from backend query semantics (CIDR matching).

**Team assessment**: This is architecturally elegant but creates a confusing mental model. If `source_ip` is `type: "text"` but has an `in_subnet` operator that no other text field has, the type system loses its predictive power. Users (and developers) expect all text fields to behave the same way.

**Decision**: We keep per-type operators as the primary model. But the `operators` array on `FilterFieldDef` is already per-field (it's a subset of the type's operator set). If a future text field needs a unique operator, we can add it to that field's `operators` array without changing the type. This is a pragmatic middle ground.

---

## Implementation Phases

### Phase 1: Semantic Layer Foundation
1. Add `format`, `placeholder`, `displayLabels`, `namedValues`, `constraints` to `FilterFieldDef`
2. Create `format-validators.ts` with `FORMAT_VALIDATORS` registry
3. Add `INVALID_VALUE_FORMAT` error code (warning severity)
4. Add format validation to `TextValueInput` (inline warning when format doesn't match)
5. Reclassify `http_status_code` from enum to numeric (remove duplicate field)

### Phase 2: IP Type
6. Add `"ip"` to `TokenFilterFieldType` and `FilterFieldType` unions
7. Add `is_in_subnet` and `is_not_in_subnet` operators with labels
8. Add `OPERATORS_BY_FIELD_TYPE.ip` entry
9. Create `IpValueInput` component (reuses TextValueInput pattern + CIDR format check)
10. Add `source_ip` field to filter schema (type: `ip`)
11. Add IP format validation (IPv4, IPv6, CIDR notation)
12. Add FilterChip switch case for `ip` type
13. Tests for all above

### Phase 3: Enhanced Display
14. Add `namedValues` display to `NumericValueInput` (port → "HTTP")
15. Add `displayLabels` to `EnumValueSelector` (country code → "United States (US)")
16. Add unit picker to `NumericValueInput` for duration fields (ms, s, m, h)

---

## Open Items

| ID | Question | Priority |
|----|----------|----------|
| O1 | Does the backend API support CIDR/subnet query operators? If not, `ip` type is premature. | P0 — Must answer before Phase 2 |
| O2 | What IP fields exist in the actual data model? (`sources.ips`? `destination_ip`?) | P0 |
| O3 | Should format validation be a warning (amber) or just a placeholder hint (no visual)? | P1 — Test with users |
| O4 | Do we need `matches_regex` as a cross-type operator? (Power user request likely) | P2 — Defer to v3 |
| O5 | Should duration fields have a unit picker in the numeric input? | P2 |
| O6 | Tags/labels: when do we need key-value pair filtering? | P3 |

---

## Cross-Reference: How This Updates Validation Research

The field type expansion interacts with the validation unified recommendations in these ways:

| Validation Decision | Impact from Field Type Research |
|--------------------|---------------------------------|
| Decision 1 (Hybrid strict/permissive) | **Extended**: Format validation for text fields is a new "soft strict" layer — warn but don't block |
| Decision 3 (Error severity) | **New code**: `INVALID_VALUE_FORMAT` added as warning severity |
| Decision 4 (Error surfaces) | **Inline format hints**: TextValueInput shows format validation inline (amber text, not blocking) |
| Decision 5 (Numeric range) | **Enhanced**: `namedValues` adds display names to numeric selectors |
| Known limitation C1 (enum data drift) | **Partially resolved**: `http_status_code` reclassified to numeric. Other enums still need backend-fetched values. |

---

## Anti-Patterns to Avoid

1. **Don't create a type for every regex.** UUID, hash, CVE, email — these differ only in format pattern, not in operators or input UX. One `text` type with pluggable format validators handles all of them.

2. **Don't validate semantics on the frontend.** CIDR matching, subnet containment, regex execution — these are backend operations. The frontend validates syntax/format only.

3. **Don't treat client IDs as special.** SOC analysts paste UUIDs from logs. They don't type them. A text input with "paste a UUID" placeholder is all they need.

4. **Don't add types preemptively.** Ship with `text` + format hints. If users consistently struggle with a particular field, THEN consider promoting it to a dedicated type. Let usage data drive type expansion.

5. **Don't confuse "the backend has a type" with "the frontend needs a type."** Elasticsearch has 30+ field types. Kibana's filter UI uses ~5 input components. The frontend type system is a UX concern, not a data model mirror.

6. **Don't block valid queries with frontend validation.** A partial IP like `192.168` is a valid `contains` search. A truncated UUID is a valid `starts_with` search. Format validation should warn, not block.
