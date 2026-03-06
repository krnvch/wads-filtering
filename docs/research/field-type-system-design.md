# Field Type System Design: Comprehensive Specification

**Author**: Principal Interaction Designer
**Date**: 2026-03-05
**Status**: Design document for team review
**Scope**: Field type taxonomy, operator matrix, value input specs, extensibility architecture

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Current System Audit](#2-current-system-audit)
3. [Candidate Data Types Analysis](#3-candidate-data-types-analysis)
4. [Proposed Type Taxonomy](#4-proposed-type-taxonomy)
5. [Detailed Type Specifications](#5-detailed-type-specifications)
6. [Operator Matrix](#6-operator-matrix)
7. [Value Input Component Specs](#7-value-input-component-specs)
8. [Semantic Validation Layer](#8-semantic-validation-layer)
9. [State Machine Integration](#9-state-machine-integration)
10. [Migration Plan](#10-migration-plan)
11. [What NOT To Do](#11-what-not-to-do)
12. [Decision Log](#12-decision-log)

---

## 1. Design Philosophy

### The Type Proliferation Problem

Every new field type in this system carries real cost:

1. **Type definition** in `TokenFilterFieldType` and `FilterFieldType` unions
2. **Operators entry** in `OPERATORS_BY_FIELD_TYPE` with primary/advanced split
3. **Value input component** — a new React component with Popover, validation, keyboard handling
4. **FilterChip switch branch** — a new `case` in the `switch (fieldDef.type)` routing in `FilterChip.tsx`
5. **State machine sub-states** — new SELECTING VALUES sub-states for the creation flow
6. **URL serialization** — values must round-trip through `?q=` URL encoding
7. **Tests** — unit tests for the component, integration tests for the flow, validation tests for the operators
8. **Operator labels** — entries in `OPERATOR_LABELS` for every new operator
9. **Token validation** — `checkChipValidity()` must handle the type's constraints
10. **Filter suggestions** — `filter-suggestions.ts` must handle the type in typeahead

This is roughly **10 integration points per new type**. A type that does not justify all 10 should not exist.

### The Decision Framework

For each candidate data type, apply this three-question test:

**Q1: Does it need operators that no existing type provides?**
If the answer is "no" — the operators it needs already exist in `text`, `enum`, `numeric`, or `date` — then it does not need a new type. It needs the right existing type, possibly with a semantic validation layer.

**Q2: Does it need a value input component that is fundamentally different from all 4 existing components?**
- `EnumValueSelector`: checkbox list from predefined values
- `TextValueInput`: freeform text input with badge tags
- `NumericValueInput`: number input (single or range)
- `DateValueSelector`: presets + calendar picker

If the answer is "the same as TextValueInput but with format validation" — that is not a new component. That is TextValueInput with a `validation` prop.

**Q3: Is the data volume and query frequency high enough that the UX cost of a generic fallback is unacceptable?**
A field used 50 times per day by power users needs a polished, type-specific experience. A field used twice a week can tolerate a generic text input.

### Core Principles

**P1: Minimize type count.** Each new type must pass all three questions above. The ideal system has the fewest types that cover the most data shapes.

**P2: Semantic validation over structural types.** When a data shape differs only in format (IP address vs UUID vs CVE ID), use a single base type with pluggable format validation. Do not create a type for every regex.

**P3: Composition over proliferation.** A `text` field with `{ format: "ip" }` metadata is better than an `ip` field type. The text input component already exists, already handles keyboard, already has suggestions — it just needs a validation function.

**P4: Operators are the real differentiator.** If two data shapes need different operators (e.g., "is in subnet" vs "contains"), they are genuinely different types. If they need the same operators with different validation, they are the same type with different format constraints.

**P5: Progressive disclosure applies to types too.** Start with the minimum viable set. Add types when real user data demands it, not when theoretical completeness suggests it.

---

## 2. Current System Audit

### Existing Types

| Type | Operators | Value Input | Fields Using It |
|------|-----------|-------------|-----------------|
| `enum` | is, is_not, is_any_of, is_none_of, is_set, is_not_set | Checkbox list (`EnumValueSelector`) | type, status, blocking_status, http_status_code, impact (5 fields) |
| `text` | is, is_not, contains, does_not_contain, starts_with, ends_with, is_set, is_not_set | Freeform text with tags (`TextValueInput`) | endpoints, host, parameter (3 fields) |
| `date` | in_the_last, not_in_the_last, before, after, on, not_on, between_dates, is_set, is_not_set | Presets + Calendar (`DateValueSelector`) | timeline.last_seen, timeline.first_detected (2 fields) |
| `numeric` | equals, not_equals, gt, gte, lt, lte, in_between, is_set, is_not_set | Number input with range (`NumericValueInput`) | response_code (1 field) |

### Touch Points (Where Types Are Referenced)

From codebase analysis, these are every file that switches on or references field types:

| File | How Type Is Used |
|------|-----------------|
| `src/types/filters.ts` | `FilterFieldType` union definition |
| `src/types/tokens.ts` | `TokenFilterFieldType` union, `OPERATORS_BY_FIELD_TYPE` map |
| `src/lib/filter-schema.ts` | `type` property on each `FilterFieldDef`, helper functions by type |
| `src/components/filters/FilterChip.tsx` | `switch (fieldDef.type)` routes to value selector component |
| `src/components/filters/OperatorSelector.tsx` | Reads `OPERATORS_BY_FIELD_TYPE[fieldType]` for operator list |
| `src/lib/filter-suggestions.ts` | `if (f.type === "enum")` / `"date"` / `"text"` for typeahead |
| `src/lib/token-validation.ts` | `checkChipValidity()` validates operator against field type |

### Fields From the Data Model Not Yet in Filter Schema

From `attacks-SPEC.md`, these fields exist in the data model but have no filter field definition:

| Data Field | Current Type | Proposed Type | Notes |
|-----------|-------------|--------------|-------|
| `sources.ips` | `string[]` | IP addresses | CIDR matching, subnet filtering |
| `sources.countries` | `string[]` | Country codes (ISO 3166-1) | Finite set, ~249 entries |
| `security.cwe` | `string[]` | Formatted IDs (CWE-NNN) | Pattern: `CWE-\d+` |
| `security.api_owasp` | `string[]` | Formatted IDs (API1:2021) | Pattern: `API\d+:\d{4}` |
| `stats.requests` | `number` | Numeric | Already covered by `numeric` type |
| `stats.sessions` | `number` | Numeric | Already covered |
| `name` | `string` | Text | Already covered |
| `stamp` | `string` | Enum or text | Depends on cardinality |

---

## 3. Candidate Data Types Analysis

For each candidate from the problem statement, applying the three-question test:

### 3.1 IP Addresses

**Data examples**: `192.168.1.1`, `2001:db8::1`, `10.0.0.0/24`
**Format**: IPv4 (`\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}`), IPv6 (complex), CIDR (`/\d{1,3}` suffix)

**Q1 — Unique operators?** YES.
- `is_in_subnet` (192.168.1.5 matches 192.168.0.0/16) — no existing type has this
- `is_not_in_subnet` — negation of above
- Text operators like `starts_with` can partially simulate prefix matching, but CIDR subnet matching is fundamentally different: `192.168.1.5` is in `192.168.0.0/16` but does NOT start with `192.168.0`

**Q2 — Unique input component?** PARTIALLY.
- The input is still text-based (type an IP)
- But it benefits from: CIDR notation helper, subnet autocomplete from indexed data, IPv4/IPv6 format validation inline
- This is TextValueInput with format validation and specialized suggestions — not a fundamentally new component

**Q3 — High frequency?** YES. SOC analysts filter by source IP constantly. It is arguably the most common investigative filter in security operations.

**VERDICT: NEW TYPE (`ip`).** The subnet operators (`is_in_subnet`, `is_not_in_subnet`) do not exist in any current type and cannot be simulated by text operators without false positives/negatives. The query frequency justifies the investment.

---

### 3.2 UUIDs / Client IDs

**Data examples**: `550e8400-e29b-41d4-a716-446655440000`
**Format**: `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` (case-insensitive)

**Q1 — Unique operators?** NO.
- Exact match → `is` (already in text)
- Prefix match → `starts_with` (already in text)
- Contains → `contains` (already in text)
- Set/not set → `is_set`, `is_not_set` (already in text)
- No operator exists that is specific to UUID semantics

**Q2 — Unique input component?** NO.
- It is a text input. You paste or type a UUID.
- Format validation (is it a valid UUID?) is the only addition — and that is a validation function, not a component

**Q3 — High frequency?** MEDIUM. Used for investigating specific sessions or clients, but not for broad dashboard filtering.

**VERDICT: TEXT + SEMANTIC VALIDATION (`text` with `format: "uuid"`).** Use `TextValueInput` with a format validation function that checks UUID pattern and shows inline error for malformed UUIDs. No new type, no new operators, no new component.

---

### 3.3 URLs / Endpoints

**Data examples**: `/api/v1/users`, `POST /v1/api/orders/ORD-9005`, `https://example.com/path`
**Format**: Freeform path strings, sometimes with HTTP method prefix

**Q1 — Unique operators?** NO.
- Path prefix → `starts_with` (exists in text)
- Domain match → `contains` or `is` (exists in text)
- Wildcard matching → not currently supported, but would be a cross-type feature, not URL-specific
- All needed operators already exist in `text`

**Q2 — Unique input component?** NO.
- This IS the current `TextValueInput` for the `endpoints` and `host` fields
- It is already implemented and working

**Q3 — High frequency?** YES, but already handled.

**VERDICT: NO CHANGES NEEDED.** This is already `text` type. The `endpoints` and `host` fields already use text operators. No new type, no new operators.

---

### 3.4 Hashes (MD5, SHA-1, SHA-256)

**Data examples**: `a1b2c3d4e5f6...` (32/40/64 hex chars)
**Format**: `[0-9a-fA-F]{32}` (MD5), `{40}` (SHA-1), `{64}` (SHA-256)

**Q1 — Unique operators?** NO.
- Exact match (case-insensitive) → `is` with case normalization
- Prefix match → `starts_with`
- Set/not set → already exists
- No hash-specific operation exists

**Q2 — Unique input component?** NO.
- Paste a hash into a text input. That is it.

**Q3 — High frequency?** LOW in this context. The attacks data model does not include hash fields.

**VERDICT: TEXT + SEMANTIC VALIDATION (`text` with `format: "hash"`), if/when a hash field is added.** Not needed now. When needed, use TextValueInput with a hex validation function.

---

### 3.5 Ports

**Data examples**: `80`, `443`, `8080`, `0-65535`
**Format**: Integer in range 0-65535

**Q1 — Unique operators?** NO.
- All needed operators already exist in `numeric`: `equals`, `not_equals`, `gt`, `lt`, `in_between`
- Named equivalents (HTTP=80, HTTPS=443) are a display/suggestion concern, not an operator concern

**Q2 — Unique input component?** PARTIALLY.
- It IS a numeric input, but could benefit from named port suggestions ("HTTP (80)", "HTTPS (443)")
- This is `NumericValueInput` with a suggestions overlay — not a new component

**Q3 — High frequency?** MEDIUM. Port filtering is common but typically through a small set of well-known values.

**VERDICT: NUMERIC + ENHANCED SUGGESTIONS.** Use `numeric` type. Optionally add a `namedValues` property to `FilterFieldDef` for suggestion overlays (e.g., `{ "80": "HTTP", "443": "HTTPS" }`). No new type. Implementation: add optional `namedValues` map to NumericValueInput that shows clickable suggestions above the number input.

---

### 3.6 CIDR Ranges

**Data examples**: `192.168.0.0/24`, `10.0.0.0/8`, `2001:db8::/32`
**Format**: IP address + `/` + prefix length

**Q1 — Unique operators?** This IS the value format for the `is_in_subnet` operator on IP fields.

**VERDICT: SUBSUMED BY IP TYPE.** CIDR is not a field type — it is a value format used as the operand of the `is_in_subnet` operator on `ip` fields. When a user writes `Source IP is_in_subnet 192.168.0.0/24`, the CIDR notation is the value, not the field type. The field type is `ip`.

---

### 3.7 Country Codes

**Data examples**: `US`, `DE`, `JP`, `CN`
**Format**: ISO 3166-1 alpha-2 (249 entries)

**Q1 — Unique operators?** NO.
- `is`, `is_not`, `is_any_of`, `is_none_of` — all exist in `enum`
- No country-specific operations

**Q2 — Unique input component?** PARTIALLY.
- It IS an enum selector, but with 249 values, it desperately needs search (already planned in validation recommendations Decision 2)
- Flag icons next to country names would be nice UX — but that is styling, not a structural type difference

**Q3 — High frequency?** HIGH for geo-based attack analysis. SOC analysts routinely filter by source country.

**VERDICT: ENUM (large cardinality).** Use `enum` type. The `EnumValueSelector` already supports scrollable lists, and the planned search feature (Decision 2 in unified recommendations) will handle the 249-item list. Add the `sources.countries` field as `type: "enum"` with all 249 country codes. Consider the `displayLabels` enhancement (section 8) to show "United States (US)" while storing "US".

---

### 3.8 CVE IDs

**Data examples**: `CVE-2024-1234`, `CVE-2023-44228`
**Format**: `CVE-\d{4}-\d{4,}` (year + sequential ID)

**Q1 — Unique operators?** NO.
- Exact match → `is`
- Year-based filtering → `starts_with` with `CVE-2024` prefix
- Set/not set → already exists
- No CVE-specific operation

**Q2 — Unique input component?** NO.
- Text input with format validation

**Q3 — High frequency?** MEDIUM. Important for vulnerability correlation but not a primary filter.

**VERDICT: TEXT + SEMANTIC VALIDATION (`text` with `format: "cve"`).** Use TextValueInput. Add format validation that checks the CVE pattern. Autocomplete from indexed CVE data would be valuable but is a suggestion concern, not a type concern.

---

### 3.9 User Agents

**Data examples**: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...`
**Format**: Freeform strings, very long (100+ chars)

**Q1 — Unique operators?** NO.
- `contains` handles most user agent queries ("find all Chrome traffic")
- Parsed component matching (browser, OS, version) would require structured decomposition — that is a backend concern, not a filter type concern

**Q2 — Unique input component?** NO.
- Text input. Very long values would benefit from a wider popover, but that is styling.

**Q3 — High frequency?** LOW for manual filtering. Usually handled by bot detection systems.

**VERDICT: TEXT, NO CHANGES.** Not even in the current data model. If added, use `text` type with `contains` as the primary operator. Parsed components (browser, OS) should be separate enum fields if needed, not parsed client-side from the user agent string.

---

### 3.10 Email Addresses

**Data examples**: `user@example.com`, `admin@company.org`
**Format**: RFC 5322 (simplified: `\S+@\S+\.\S+`)

**Q1 — Unique operators?** PARTIALLY.
- Domain extraction (`@example.com` part) would be useful, but `contains "@example.com"` or `ends_with "@example.com"` already handle this
- No genuinely unique operator

**Q2 — Unique input component?** NO.

**Q3 — High frequency?** LOW. Not in the current data model. Attacks are not typically filtered by email.

**VERDICT: TEXT + SEMANTIC VALIDATION, if/when needed.** Not relevant to current data model.

---

### 3.11 Durations (Time Spans)

**Data examples**: `5s`, `2m`, `1h`, `500ms`
**Format**: Number + unit suffix (ms, s, m, h, d)

**Q1 — Unique operators?** NO.
- Comparison operators (`>`, `<`, `between`) already exist in `numeric`
- The difference is that the VALUE has a unit suffix — but that is a value format concern, not an operator concern

**Q2 — Unique input component?** YES, PARTIALLY.
- A number input with a unit selector dropdown (ms/s/m/h/d) is meaningfully different from plain `NumericValueInput`
- However, this can be built as a variant of NumericValueInput with an added unit selector — not a wholly new component

**Q3 — High frequency?** LOW in this context. The attacks data model does not include duration fields (response time could be added later).

**VERDICT: NUMERIC + UNIT SELECTOR VARIANT (deferred).** When a duration field is needed, extend `NumericValueInput` to accept an optional `units` array. The field definition would carry `units: ["ms", "s", "m", "h", "d"]`. Operators remain the same as `numeric`. No new type.

---

### 3.12 Version Strings

**Data examples**: `1.2.3`, `2.0.0-beta.1`
**Format**: Semantic versioning (`\d+\.\d+\.\d+(-\w+)?`)

**Q1 — Unique operators?** PARTIALLY.
- Semantic comparison (`> 1.2.3`) requires version-aware comparison, not numeric comparison
- But this is a backend evaluation concern — the filter UI just sends `gt` with a version string value, and the backend interprets it

**Q2 — Unique input component?** NO. Text input.

**Q3 — High frequency?** LOW. Not in the current data model.

**VERDICT: TEXT + SEMANTIC VALIDATION, if/when needed.** The backend handles version comparison. The frontend just needs format validation.

---

### 3.13 Tags / Labels (Key-Value Pairs)

**Data examples**: `env:production`, `team:security`, `severity:critical`
**Format**: `key:value` or `key=value`

**Q1 — Unique operators?** YES.
- `has_tag` (existence check by key regardless of value)
- `tag_value_is` (check specific key's value)
- These are genuinely different from text operators — `contains "env"` would match `environment:staging` which is wrong

**Q2 — Unique input component?** YES.
- Two-part input: key selector (from known keys) + value input (from known values for that key, or freeform)
- This is structurally different from any existing component

**Q3 — High frequency?** LOW. Not in the current data model. Tags/labels are more common in infrastructure monitoring (Datadog, Grafana) than security attack data.

**VERDICT: DEFERRED.** Tags are a genuine new type with unique operators and unique input UX. But they are not in the data model, and the effort is significant. If the data model adds a tags field, this becomes a real type with its own spec. Do not preemptively build it.

---

## 4. Proposed Type Taxonomy

Based on the analysis above, the system should evolve from 4 types to **5 types** (adding only `ip`), plus a **semantic validation layer** for format-constrained text fields.

### Type Hierarchy

```
Field Types (5 structural types)
├── enum        — predefined finite set, checkbox selection
├── text        — freeform string, tag-style input
│   ├── format: "plain"    (default, no validation)
│   ├── format: "uuid"     (UUID pattern validation)
│   ├── format: "cve"      (CVE-YYYY-NNNN pattern)
│   ├── format: "hash"     (hex string, length-checked)
│   ├── format: "email"    (RFC 5322 simplified)
│   └── format: "owasp"    (APINN:YYYY pattern)
├── date        — temporal, presets + calendar
├── numeric     — numbers, comparison operators
│   ├── constraints: { min, max }           (value bounds)
│   ├── namedValues: { "80": "HTTP", ... }  (suggestion labels)
│   └── units: ["ms", "s", "m", "h"]       (unit selector, future)
└── ip          — IP addresses, subnet matching  ← NEW
```

### Why Only One New Type

The analysis found that out of 13 candidate data types:

| Count | Verdict | Examples |
|-------|---------|---------|
| **1** | New dedicated type | IP addresses (unique operators: subnet matching) |
| **0** | Existing type, no changes | URLs/endpoints (already text), user agents (already text) |
| **5** | Existing type + semantic validation | UUID, CVE, hash, email, OWASP IDs |
| **3** | Existing type + enhanced config | Ports (numeric + suggestions), countries (enum, large), durations (numeric + units) |
| **2** | Subsumed by another proposal | CIDR (part of IP type), version strings (text + backend comparison) |
| **2** | Deferred (not in data model or significant effort) | Tags/labels, user agents |

Only IP addresses justify a new type because `is_in_subnet` / `is_not_in_subnet` are genuinely new operators with no equivalent in any existing type. Everything else is a variation on text, enum, or numeric that can be handled through configuration and validation.

---

## 5. Detailed Type Specifications

### 5.1 Type: `ip` (NEW)

#### Definition

| Property | Value |
|----------|-------|
| Type key | `ip` |
| Represents | IPv4 addresses, IPv6 addresses, CIDR ranges |
| Example values | `192.168.1.1`, `2001:db8::1`, `10.0.0.0/24` |
| Format | IPv4: `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}` (each octet 0-255); IPv6: standard notation; CIDR: IP + `/\d{1,3}` |

#### Operators

| Operator Key | Display Label | Category | Arity | Value Format | Description |
|-------------|--------------|----------|-------|-------------|-------------|
| `is` | is | primary | single value | IP address | Exact IP match |
| `is_not` | is not | primary | single value | IP address | Exclude exact IP |
| `is_any_of` | is any of | primary | multi value | IP addresses | Match any listed IP |
| `is_none_of` | is not any of | primary | multi value | IP addresses | Exclude all listed IPs |
| `is_in_subnet` | is in subnet | primary | single value | CIDR notation | IP falls within CIDR range |
| `is_not_in_subnet` | is not in subnet | advanced | single value | CIDR notation | IP outside CIDR range |
| `starts_with` | starts with | advanced | single value | IP prefix | Prefix match (e.g., `192.168.`) |
| `is_set` | is set | advanced | unary | — | Field has a value |
| `is_not_set` | is not set | advanced | unary | — | Field is empty/null |

#### Value Input Component: `IpValueInput`

**Base**: Extends `TextValueInput` pattern (text input with tag-style badges for multi-value operators).

**Differences from TextValueInput**:
- Format validation on Enter: check IP/CIDR format before adding as tag
- Inline error for malformed input: "Invalid IP address format" or "Invalid CIDR notation"
- For `is_in_subnet` / `is_not_in_subnet`: show a CIDR helper hint below the input: `"e.g., 192.168.0.0/24"`
- Suggestions from indexed source IP data (backend-provided)
- Placeholder text varies by operator:
  - Default: `"Type IP address..."`
  - Subnet operators: `"Type CIDR range (e.g., 10.0.0.0/8)..."`

**Validation rules**:
- IPv4: each octet 0-255, 4 octets separated by dots
- IPv6: valid hexadecimal groups separated by colons
- CIDR: valid IP + `/` + prefix length (0-32 for IPv4, 0-128 for IPv6)
- Reject on Enter if format is invalid; show inline error message

**Keyboard behavior**: Identical to TextValueInput (Enter to add, Cmd+Enter to apply, Backspace to remove last tag).

#### Why This Justifies a New Type

The `is_in_subnet` operator requires:
1. A CIDR value as input (not a plain IP)
2. Backend evaluation that performs bitwise subnet matching
3. Contextual placeholder and validation that differs based on operator selection

This cannot be achieved by `text` with `starts_with`. Consider: `192.168.1.5` IS in subnet `192.168.0.0/16`, but it does NOT start with `192.168.0`. The semantic gap between prefix matching and subnet matching is unbridgeable without a dedicated operator.

---

### 5.2 Enhanced Type: `enum` (Large Cardinality)

No new type is needed, but `FilterFieldDef` gains an optional property:

```typescript
interface FilterFieldDef {
  // ... existing properties
  displayLabels?: Record<string, string>;  // value → display label
}
```

**Use case**: Country codes. Store `"US"`, display `"United States (US)"`. The `EnumValueSelector` search would match against both the value and the display label.

**Implementation**: `EnumValueSelector` renders `displayLabels[value] ?? value` for each item. Search filters against both the stored value and the display label.

**No new operators**. No new component. The `EnumValueSelector` with the planned search feature (Decision 2 from unified recommendations) handles 249-item lists adequately.

---

### 5.3 Enhanced Type: `numeric` (Named Values)

No new type. Add an optional property to `FilterFieldDef`:

```typescript
interface FilterFieldDef {
  // ... existing properties
  namedValues?: Record<string, string>;  // numeric value → human label
  constraints?: { min?: number; max?: number };  // value bounds
}
```

**Use case**: Ports. `namedValues: { "80": "HTTP", "443": "HTTPS", "8080": "HTTP Alt", "3306": "MySQL", "5432": "PostgreSQL" }`.

**Implementation**: `NumericValueInput` shows a clickable suggestion list above the number input when `namedValues` is present. Clicking a suggestion fills the input. The suggestion list filters as the user types.

**Constraints**: `constraints: { min: 0, max: 65535 }` for ports. `constraints: { min: 100, max: 599 }` for HTTP status codes. The `NumericValueInput` validates against constraints and shows inline error: "Value must be between 0 and 65535."

---

### 5.4 Enhanced Type: `text` (Semantic Validation)

The core enhancement. No new type. Add an optional `format` property to `FilterFieldDef`:

```typescript
type TextFormat = "plain" | "uuid" | "cve" | "hash" | "email" | "owasp";

interface FilterFieldDef {
  // ... existing properties
  format?: TextFormat;  // only meaningful when type === "text"
}
```

**Implementation**: `TextValueInput` receives `fieldDef.format` and applies format-specific validation on Enter (before adding a value as a tag):

| Format | Validation Regex | Error Message | Placeholder |
|--------|-----------------|---------------|-------------|
| `plain` | None (default) | — | `"Type {field label}..."` |
| `uuid` | `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | `"Invalid UUID format"` | `"Type UUID (e.g., 550e8400-e29b-...)..."` |
| `cve` | `/^CVE-\d{4}-\d{4,}$/i` | `"Invalid CVE format (expected CVE-YYYY-NNNN)"` | `"Type CVE ID (e.g., CVE-2024-1234)..."` |
| `hash` | `/^[0-9a-f]{32,128}$/i` | `"Invalid hash format (expected hex string)"` | `"Type hash value..."` |
| `email` | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `"Invalid email format"` | `"Type email address..."` |
| `owasp` | `/^API\d+:\d{4}$/i` | `"Invalid OWASP format (expected APINN:YYYY)"` | `"Type OWASP ID (e.g., API1:2021)..."` |

**Validation timing**: On Enter (when adding a value), not on keystroke. Follows the established pattern from the unified recommendations (Luke Wroblewski's timing research). Invalid values are not added; the inline error message appears below the input and clears when the user resumes typing.

**Case normalization**: For `uuid` and `hash`, values are lowercased before storage. For `cve` and `owasp`, values are uppercased. This is transparent to the user.

**Operators**: Identical to `text`. No new operators. The format validation is orthogonal to operators.

---

## 6. Operator Matrix

### Complete Matrix: All Types x All Operators

Legend:
- **P** = Primary (shown by default)
- **A** = Advanced (shown in "More" section)
- **U** = Unary (no value needed)
- **R** = Range (requires 2 values)
- `—` = Not applicable to this type

| Operator | Display Label | `enum` | `text` | `date` | `numeric` | `ip` (NEW) |
|----------|--------------|--------|--------|--------|-----------|------------|
| `is` | is | P | P | — | — | P |
| `is_not` | is not | P | P | — | — | P |
| `is_any_of` | is any of | P | — | — | — | P |
| `is_none_of` | is not any of | P | — | — | — | P |
| `is_set` | is set | A, U | A, U | A, U | A, U | A, U |
| `is_not_set` | is not set | A, U | A, U | A, U | A, U | A, U |
| `contains` | contains | — | P | — | — | — |
| `does_not_contain` | does not contain | — | P | — | — | — |
| `starts_with` | starts with | — | A | — | — | A |
| `ends_with` | ends with | — | A | — | — | — |
| `equals` | = | — | — | — | P | — |
| `not_equals` | != | — | — | — | P | — |
| `gt` | > | — | — | — | P | — |
| `gte` | >= | — | — | — | A | — |
| `lt` | < | — | — | — | P | — |
| `lte` | <= | — | — | — | A | — |
| `in_between` | is between | — | — | — | A, R | — |
| `before` | is before | — | — | P | — | — |
| `after` | is after | — | — | P | — | — |
| `on` | is on | — | — | A | — | — |
| `not_on` | is not on | — | — | A | — | — |
| `in_the_last` | in the last | — | — | P | — | — |
| `not_in_the_last` | not in the last | — | — | P | — | — |
| `between_dates` | is between | — | — | A, R | — | — |
| `is_in_subnet` | is in subnet | — | — | — | — | **P (NEW)** |
| `is_not_in_subnet` | is not in subnet | — | — | — | — | **A (NEW)** |

### New Operators Summary

Only 2 genuinely new operators:

| Operator Key | Display Label | Type | Value Format |
|-------------|--------------|------|-------------|
| `is_in_subnet` | is in subnet | `ip` | CIDR notation (`192.168.0.0/24`) |
| `is_not_in_subnet` | is not in subnet | `ip` | CIDR notation |

These operators are added to `TokenFilterOperator` union and `OPERATOR_LABELS`.

### Reused Operators on IP Type

The IP type reuses 7 existing operators (`is`, `is_not`, `is_any_of`, `is_none_of`, `starts_with`, `is_set`, `is_not_set`) without modification. The only change is that they are now listed in `OPERATORS_BY_FIELD_TYPE.ip`.

---

## 7. Value Input Component Specs

### 7.1 New Component: `IpValueInput`

```
┌─────────────────────────────────────────┐
│  [192.168.1.1] [x]  [10.0.0.1] [x]    │   ← selected values (badges)
├─────────────────────────────────────────┤
│  Type IP address...                     │   ← text input
├─────────────────────────────────────────┤
│  ⚠ Invalid IP address format            │   ← inline error (conditional)
├─────────────────────────────────────────┤
│  Suggestions:                           │   ← from indexed data (conditional)
│    192.168.1.100                        │
│    192.168.1.200                        │
│    10.0.0.0/8                           │
├─────────────────────────────────────────┤
│  ↵ to add · ⌘ ↵ to apply              │   ← keyboard hint
└─────────────────────────────────────────┘
```

**For subnet operators** (`is_in_subnet`, `is_not_in_subnet`):

```
┌─────────────────────────────────────────┐
│  Type CIDR range (e.g., 10.0.0.0/8)... │   ← placeholder changes
├─────────────────────────────────────────┤
│  Common subnets:                        │   ← helper suggestions
│    10.0.0.0/8      (Private Class A)    │
│    172.16.0.0/12   (Private Class B)    │
│    192.168.0.0/16  (Private Class C)    │
├─────────────────────────────────────────┤
│  ↵ to apply                            │   ← single value, no multi
└─────────────────────────────────────────┘
```

**Key behaviors**:
- Subnet operators accept a single value (not multi-value). The input does not show badge tags for subnet operators.
- Non-subnet operators (`is`, `is_any_of`, etc.) accept multiple IP values, same as TextValueInput.
- `starts_with` on IP type accepts partial IPs (e.g., `192.168.`) — useful for prefix-based filtering.

**Component signature**:

```typescript
interface IpValueInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: TokenFilterOperator;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onConfirm: (overrideValues?: string[]) => void;
  suggestions?: string[];
  children: React.ReactNode;
}
```

This matches the pattern of all existing value selectors (Popover wrapper with trigger child).

---

### 7.2 Enhanced Component: `TextValueInput` (Format Validation)

No new component. Add format validation to the existing `TextValueInput`.

**New prop**:

```typescript
interface TextValueInputProps {
  // ... existing props
  format?: TextFormat;  // from fieldDef.format
}
```

**Behavior change in `addValue` callback**:

```typescript
const addValue = useCallback((value: string) => {
  const trimmed = value.trim();
  if (!trimmed || selectedValues.includes(trimmed)) return;

  // Format validation (NEW)
  if (format && format !== "plain") {
    const error = validateTextFormat(trimmed, format);
    if (error) {
      setFormatError(error);  // show inline error
      return;  // do NOT add the value
    }
  }

  // Case normalization (NEW)
  const normalized = normalizeForFormat(trimmed, format);
  onSelectionChange([...selectedValues, normalized]);
  setInputValue("");
  setFormatError(null);
}, [selectedValues, onSelectionChange, format]);
```

**Inline error display**: Below the input, using the same error styling from the unified recommendations:

```tsx
{formatError && (
  <p className="text-xs text-destructive flex items-center gap-1 px-3 py-1">
    <AlertCircle className="size-3 shrink-0" />
    {formatError}
  </p>
)}
```

**Error clears**: On the next keystroke in the input (user is correcting).

---

### 7.3 Enhanced Component: `NumericValueInput` (Named Values + Constraints)

No new component. Add optional named value suggestions and constraint validation.

**New props**:

```typescript
interface NumericValueInputProps {
  // ... existing props
  namedValues?: Record<string, string>;  // "80" → "HTTP"
  constraints?: { min?: number; max?: number };
}
```

**Named values UI**: Shown above the number input when `namedValues` is provided and the input is empty or matches a suggestion:

```
┌─────────────────────────────────┐
│  Quick select:                  │
│    HTTP (80)                    │   ← click to fill input
│    HTTPS (443)                  │
│    HTTP Alt (8080)              │
├─────────────────────────────────┤
│  Value                          │
│  [  443  ]                      │
├─────────────────────────────────┤
│  [ Apply ]                      │
└─────────────────────────────────┘
```

**Constraint validation**: On Apply, if value is outside bounds:

```
│  [ 99999 ]                      │
│  ⚠ Value must be between 0      │
│    and 65535                     │
│  [ Apply ] (disabled)           │
```

---

### 7.4 Enhanced Component: `EnumValueSelector` (Display Labels)

No new component. Handle `displayLabels` in rendering.

**Change**: When `fieldDef.displayLabels` exists, render the display label instead of the raw value, but store the raw value.

```tsx
// Current
<span>{value}</span>

// Enhanced
<span>{fieldDef.displayLabels?.[value] ?? value}</span>
```

**Search**: Match against both the raw value AND the display label:

```typescript
const matchesSearch = (value: string, query: string) => {
  const lower = query.toLowerCase();
  return value.toLowerCase().includes(lower) ||
    (fieldDef.displayLabels?.[value]?.toLowerCase().includes(lower) ?? false);
};
```

---

## 8. Semantic Validation Layer

### Architecture

The semantic validation layer sits between the value input and the token system. It does NOT create new types — it adds format-aware validation to existing types.

```
User Input → Format Validation → Token Creation → Structural Validation
                 ↑                                       ↑
            NEW (per-format)                    EXISTING (token-validation.ts)
```

### Validation Registry

```typescript
// src/lib/format-validators.ts

export type TextFormat = "plain" | "uuid" | "cve" | "hash" | "email" | "owasp";

interface FormatValidator {
  pattern: RegExp;
  errorMessage: string;
  placeholder: string;
  normalize?: (value: string) => string;  // case normalization
}

export const FORMAT_VALIDATORS: Record<TextFormat, FormatValidator | null> = {
  plain: null,  // no validation
  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    errorMessage: "Invalid UUID format",
    placeholder: "Type UUID (e.g., 550e8400-e29b-...)",
    normalize: (v) => v.toLowerCase(),
  },
  cve: {
    pattern: /^CVE-\d{4}-\d{4,}$/i,
    errorMessage: "Invalid CVE format (expected CVE-YYYY-NNNN)",
    placeholder: "Type CVE ID (e.g., CVE-2024-1234)",
    normalize: (v) => v.toUpperCase(),
  },
  hash: {
    pattern: /^[0-9a-f]{32,128}$/i,
    errorMessage: "Invalid hash (expected 32-128 hex characters)",
    placeholder: "Type hash value",
    normalize: (v) => v.toLowerCase(),
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: "Invalid email format",
    placeholder: "Type email address",
  },
  owasp: {
    pattern: /^API\d+:\d{4}$/i,
    errorMessage: "Invalid OWASP ID (expected APINN:YYYY)",
    placeholder: "Type OWASP ID (e.g., API1:2021)",
    normalize: (v) => v.toUpperCase(),
  },
};

export function validateTextFormat(
  value: string,
  format: TextFormat,
): string | null {
  const validator = FORMAT_VALIDATORS[format];
  if (!validator) return null;
  return validator.pattern.test(value) ? null : validator.errorMessage;
}

export function normalizeForFormat(
  value: string,
  format?: TextFormat,
): string {
  if (!format) return value;
  const validator = FORMAT_VALIDATORS[format];
  return validator?.normalize?.(value) ?? value;
}
```

### IP Validation (Separate, For New Type)

```typescript
// src/lib/ip-validators.ts

export function isValidIPv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

export function isValidIPv6(value: string): boolean {
  // Simplified: delegate to URL constructor trick or full regex
  try {
    // Check basic structure: 1-8 groups of hex, :: allowed
    const expanded = expandIPv6(value);
    return expanded !== null;
  } catch {
    return false;
  }
}

export function isValidCIDR(value: string): boolean {
  const [ip, prefix] = value.split("/");
  if (!prefix) return false;
  const prefixNum = parseInt(prefix, 10);

  if (isValidIPv4(ip)) {
    return prefixNum >= 0 && prefixNum <= 32;
  }
  if (isValidIPv6(ip)) {
    return prefixNum >= 0 && prefixNum <= 128;
  }
  return false;
}

export function isValidIPOrCIDR(value: string): boolean {
  return isValidIPv4(value) || isValidIPv6(value) || isValidCIDR(value);
}

export function isValidIPInput(value: string, operator: string): string | null {
  if (operator === "is_in_subnet" || operator === "is_not_in_subnet") {
    return isValidCIDR(value) ? null : "Invalid CIDR notation (e.g., 192.168.0.0/24)";
  }
  if (operator === "starts_with") {
    // Partial IPs allowed for prefix matching
    return /^[\d.:a-fA-F]+$/.test(value) ? null : "Invalid IP prefix";
  }
  return isValidIPv4(value) || isValidIPv6(value)
    ? null
    : "Invalid IP address format";
}
```

---

## 9. State Machine Integration

### How `ip` Type Integrates with the Existing State Machine

The validation state machine (from `validation-state-machine.md`) defines three phases:

1. **Pre-Chip Validation** (creation flow)
2. **Chip-Level Validation** (post-creation)
3. **Structural Validation** (expression-level)

The `ip` type integrates as follows:

#### Phase 1: Pre-Chip (Value Selection)

New sub-state in SELECTING VALUES:

```
SELECTING VALUES
    │
    ├── Enum Selector         (existing)
    ├── Text Input            (existing)
    ├── Date Selector         (existing)
    ├── Numeric Input         (existing)
    └── IP Input              (NEW)
          States: COMPOSING → VALIDATING_FORMAT → ADDING_VALUE → COMMITTING
                                ↓ (fail)
                         FORMAT_ERROR (inline, non-blocking)
```

**Timing**: Validation fires on Enter (not on keystroke). Follows the same pattern as all text-based inputs.

**State transitions**:
- `COMPOSING`: User is typing. No validation.
- Enter pressed → `VALIDATING_FORMAT`: Check IP/CIDR format.
  - Valid → `ADDING_VALUE`: Add as tag. Return to `COMPOSING`.
  - Invalid → `FORMAT_ERROR`: Show inline error. Stay in `COMPOSING` (user can continue editing).
- Cmd+Enter pressed → `COMMITTING`: Validate current input (if any), add if valid, commit all values.

#### Phase 2: Chip-Level Validation

`checkChipValidity()` in `token-validation.ts` already validates:
- Rule 8: `UNKNOWN_FIELD` — works as-is (schema lookup)
- Rule 9: `INVALID_OPERATOR` — needs update to include `ip` operators in allowed set
- Rule 10: `EMPTY_VALUES` — works as-is

**New validation rule**: `INVALID_VALUE_FORMAT`

For `ip` type fields, validate that stored values match the expected format for the operator:
- `is_in_subnet` / `is_not_in_subnet`: value must be valid CIDR
- Other operators: value must be valid IP address

This catches values that were entered via URL manipulation or legacy migration.

#### Phase 3: Structural Validation

No changes. The `ip` type has no impact on structural validation (parens, connectors, groups). Structural rules are type-agnostic.

### New Error Codes

| Error Code | Severity | Message Template | Applies To |
|-----------|----------|-----------------|-----------|
| `INVALID_VALUE_FORMAT` | error | `"{value}" is not a valid {format description}.` | `ip` type chips, `text` type chips with format |

**Implementation**: Add to `TokenError.code` union:

```typescript
export interface TokenError {
  code:
    | "TOP_LEVEL_OR"
    | "UNBALANCED_PAREN"
    | "CONSECUTIVE_CONNECTOR"
    | "LEADING_CONNECTOR"
    | "TRAILING_CONNECTOR"
    | "EMPTY_GROUP"
    | "SINGLE_CHILD_GROUP"
    | "UNKNOWN_FIELD"
    | "INVALID_OPERATOR"
    | "EMPTY_VALUES"
    | "INVALID_VALUE_FORMAT";  // NEW
  message: string;
}
```

**Validation logic addition** to `checkChipValidity()`:

```typescript
// After existing Rule 10 (EMPTY_VALUES):

// Rule 11: INVALID_VALUE_FORMAT (ip and formatted text fields)
if (fieldDef.type === "ip") {
  for (const val of token.values) {
    const error = isValidIPInput(val, token.operator);
    if (error) {
      setError(token, {
        code: "INVALID_VALUE_FORMAT",
        message: `"${val}" is not a valid ${token.operator === "is_in_subnet" || token.operator === "is_not_in_subnet" ? "CIDR range" : "IP address"}.`,
      });
      break;
    }
  }
} else if (fieldDef.type === "text" && fieldDef.format && fieldDef.format !== "plain") {
  for (const val of token.values) {
    const error = validateTextFormat(val, fieldDef.format);
    if (error) {
      setError(token, {
        code: "INVALID_VALUE_FORMAT",
        message: `"${val}": ${error}`,
      });
      break;
    }
  }
}
```

---

## 10. Migration Plan

### Phase 1: Foundation (Low Risk)

**Goal**: Add the semantic validation layer and FilterFieldDef enhancements without changing any existing behavior.

**Changes**:

1. **Add `format` to `FilterFieldDef`**:
   ```typescript
   interface FilterFieldDef {
     key: string;
     label: string;
     category: "Attack characteristics" | "Target & Context" | "Temporal" | "Source & Network" | "Security";
     type: FilterFieldType;
     values?: string[];
     operators?: FilterOperator[];
     format?: TextFormat;           // NEW
     displayLabels?: Record<string, string>;  // NEW
     namedValues?: Record<string, string>;    // NEW
     constraints?: { min?: number; max?: number };  // NEW
   }
   ```

2. **Create `src/lib/format-validators.ts`** with the `FORMAT_VALIDATORS` registry.

3. **Enhance `TextValueInput`** to accept `format` prop and show inline validation errors.

4. **Enhance `NumericValueInput`** to accept `namedValues` and `constraints` props.

5. **Enhance `EnumValueSelector`** to handle `displayLabels`.

6. **Add new fields to `FILTER_FIELDS`** that use existing types:
   ```typescript
   { key: "security.cwe", label: "CWE", category: "Security", type: "text",
     format: "cve", operators: [...textOperators] },
   { key: "security.api_owasp", label: "OWASP", category: "Security", type: "text",
     format: "owasp", operators: [...textOperators] },
   { key: "sources.countries", label: "Source country", category: "Source & Network", type: "enum",
     values: COUNTRY_CODES, displayLabels: COUNTRY_LABELS, operators: [...enumOperators] },
   { key: "stats.requests", label: "Requests", category: "Attack characteristics", type: "numeric",
     constraints: { min: 0 }, operators: [...numericOperators] },
   { key: "stats.sessions", label: "Sessions", category: "Attack characteristics", type: "numeric",
     constraints: { min: 0 }, operators: [...numericOperators] },
   ```

**Risk**: Zero. All changes are additive. No existing behavior changes. Existing tests continue to pass.

**Test additions**: Unit tests for format validators. Enhanced component tests for TextValueInput with format prop.

### Phase 2: IP Type (Medium Risk)

**Goal**: Add the `ip` field type with subnet operators.

**Changes**:

1. **Add `"ip"` to type unions**:
   - `FilterFieldType` in `src/types/filters.ts`
   - `TokenFilterFieldType` in `src/types/tokens.ts`

2. **Add new operators to `TokenFilterOperator`**:
   - `is_in_subnet`
   - `is_not_in_subnet`

3. **Add operator entries**:
   - `OPERATOR_LABELS`: `is_in_subnet: "is in subnet"`, `is_not_in_subnet: "is not in subnet"`
   - `OPERATORS_BY_FIELD_TYPE.ip`: primary and advanced split

4. **Create `src/lib/ip-validators.ts`**.

5. **Create `src/components/filters/IpValueInput.tsx`**.

6. **Add `case "ip":` to `FilterChip.tsx`** switch statement.

7. **Add `INVALID_VALUE_FORMAT` to `TokenError.code`** union.

8. **Enhance `checkChipValidity()`** with Rule 11.

9. **Add IP field to `FILTER_FIELDS`**:
   ```typescript
   { key: "sources.ips", label: "Source IP", category: "Source & Network", type: "ip",
     operators: ["is", "is_not", "is_any_of", "is_none_of", "is_in_subnet",
                 "is_not_in_subnet", "starts_with", "is_set", "is_not_set"] },
   ```

10. **Handle `ip` in `filter-suggestions.ts`** typeahead logic.

11. **Handle `ip` in URL serialization** (values may contain `/` for CIDR — ensure URL encoding handles this).

**Risk**: Medium. New type touches all 10 integration points. Requires thorough testing. But the architecture is designed for additive types (the `switch` in FilterChip already has a `default` fallback), so the blast radius is contained.

**Test additions**:
- Unit: IP/CIDR validation functions
- Unit: IP type operators in OPERATORS_BY_FIELD_TYPE
- Component: IpValueInput rendering, validation, keyboard
- Integration: IP field creation flow through palette
- URL: CIDR values in URL round-trip (encoding of `/`)

### Phase 3: Enhanced Suggestions (Low Risk)

**Goal**: Wire up backend-provided suggestions for IP fields, CWE autocomplete, country flag icons.

This phase is entirely about data integration and visual polish. No structural changes.

### Non-Phase: Types That Are NOT Built

The following are explicitly deferred and should NOT be built unless the data model adds fields that require them:

- **Tags/Labels** — needs unique operators (`has_tag`, `tag_value_is`) and a two-part input. Build only if the data model adds a `tags` field.
- **Duration** — needs a unit selector on NumericValueInput. Build only if the data model adds a latency/duration field.
- **Version strings** — backend handles comparison. Build only if the data model adds a version field.

---

## 11. What NOT To Do

### Anti-Pattern 1: Type Per Regex

**Do not** create types named `uuid`, `cve`, `hash`, `email`, `owasp`. These are all text fields with different validation regexes. If you create a type for each, you get:

- 6 entries in `OPERATORS_BY_FIELD_TYPE` that are all identical (text operators)
- 6 value input components that are all `TextValueInput` with a different regex
- 6 branches in the `FilterChip.tsx` switch that all render the same component

This is type explosion for no behavioral difference. Use `text` with `format`.

### Anti-Pattern 2: Type For Cardinality

**Do not** create a `large_enum` or `searchable_enum` type for country codes. The difference between a 5-item enum and a 249-item enum is not structural — it is a UX concern handled by search in the selector. The `EnumValueSelector` with search (already planned) handles both.

### Anti-Pattern 3: Client-Side Semantic Operators

**Do not** build operators like `is_same_domain_as` (email), `is_older_than` (version), or `parsed_browser_is` (user agent) in the frontend. These require semantic parsing that belongs in the backend evaluation engine. The frontend filter system is a query builder, not a query executor. Send the simplest possible operator and let the backend interpret it.

### Anti-Pattern 4: Premature Abstraction

**Do not** build a "field type plugin system" with dynamic component registration, operator inheritance hierarchies, or a DSL for defining field types. The system has 5 types. A switch statement with 5 cases is simpler, more debuggable, and more maintainable than a plugin registry. If we ever reach 10+ types, revisit this. At 5, a switch is correct.

### Anti-Pattern 5: Validation That Blocks

**Do not** prevent the user from creating a chip with an invalid-format value. Show the error, but let the chip exist. Reasons:

1. The user might be pasting from a system that formats differently
2. Backend format acceptance might be more lenient than frontend regex
3. Blocking creation contradicts the established principle: "Prevention at creation, flagging after creation" applies to structural validity, not format validity. Format validation is a hint, not a gate.

**Exception**: The pre-chip inline error in `TextValueInput` and `IpValueInput` DOES prevent adding a tag — but that is input-level validation (the tag is never created), not chip-level validation (the chip is never created). The distinction matters: the user can still close the popover and the chip will be created with whatever valid values were already added.

### Anti-Pattern 6: Overloading Operators

**Do not** add operators like `matches_regex` or `matches_glob` as a "catch-all" for advanced users. These operators:
1. Have enormous security implications (ReDoS, injection)
2. Make the expression tree untranslatable to efficient database queries
3. Confuse 95% of users who do not think in regex
4. Are never used in any of the 10 products analyzed in the competitive study

If power users need regex, it belongs in an advanced query language mode (KQL, SPL), not in the visual filter builder.

---

## 12. Decision Log

### Decision: IP as the Only New Field Type

- **Date**: 2026-03-05
- **Decided by**: Principal Interaction Designer
- **Context**: 13 candidate data types analyzed for potential new field types
- **Options considered**:
  - Option A: Add 6 new types (ip, uuid, cve, hash, port, tag)
  - Option B: Add 2 new types (ip, tag) — others as text+validation
  - Option C: Add 1 new type (ip) — everything else as text+validation or enum
  - Option D: Add 0 new types — handle everything with text/numeric
- **Decision**: Option C. Only IP addresses have genuinely unique operators (subnet matching). All other candidates map to existing types with format validation or enhanced configuration.
- **Dissent expected from**: Product Manager may push for `tag` type given Datadog/Grafana precedent. Counter: tags are not in the data model. Build when needed.
- **Revisit if**: Data model adds a `tags` field with key-value structure, or user research shows SOC analysts need subnet filtering in the visual builder (vs. command-line query language).

### Decision: Semantic Validation as a Layer, Not Types

- **Date**: 2026-03-05
- **Decided by**: Principal Interaction Designer
- **Context**: Multiple text-like data formats (UUID, CVE, hash, email, OWASP) need validation but share identical operator sets
- **Options considered**:
  - Option A: New type per format (type explosion)
  - Option B: `text` with `format` property and validation registry (semantic layer)
  - Option C: No validation, rely on backend to reject bad values
- **Decision**: Option B. The `format` property on `FilterFieldDef` enables per-format validation without creating new types. The validation registry (`FORMAT_VALIDATORS`) is a simple map of regex + error message + placeholder. Adding a new format is one object literal, not a new type with 10 integration points.
- **Dissent expected from**: Backend engineers may argue validation belongs entirely server-side. Counter: inline validation on Enter prevents round-trip latency and gives immediate feedback. The backend still validates; the frontend is a courtesy.
- **Revisit if**: A text format needs operators beyond the standard text set (would require promoting to a new type).

### Decision: FilterFieldDef Enhancement Over New Interfaces

- **Date**: 2026-03-05
- **Decided by**: Principal Interaction Designer
- **Context**: Need to add displayLabels, namedValues, constraints, format to field definitions
- **Options considered**:
  - Option A: Add optional properties to existing `FilterFieldDef`
  - Option B: Create discriminated union types (`EnumFieldDef`, `TextFieldDef`, `NumericFieldDef`, etc.)
  - Option C: Create a separate `FieldMetadata` interface referenced by `FilterFieldDef`
- **Decision**: Option A. Optional properties on the flat interface. Reasons: the current codebase passes `FilterFieldDef` through many layers (palette, chip, value selectors). Changing the type to a discriminated union would require updating every consumer. Optional properties are additive and backward-compatible.
- **Dissent expected from**: Frontend engineers may prefer type safety of discriminated unions. Counter: the `type` field already discriminates behavior at runtime (the switch in FilterChip). TypeScript narrowing on `type` gives adequate safety. The optional properties are only used by the component that cares about them.
- **Revisit if**: The number of type-specific properties exceeds 5, making the flat interface unwieldy.

---

## Appendix A: Proposed Updated Type Definitions

### `src/types/filters.ts` (changes marked)

```typescript
export type FilterFieldType = "enum" | "text" | "date" | "numeric" | "ip";  // + ip

export type TextFormat = "plain" | "uuid" | "cve" | "hash" | "email" | "owasp";  // NEW

export interface FilterFieldDef {
  key: string;
  label: string;
  category: "Attack characteristics" | "Target & Context" | "Temporal"
    | "Source & Network"  // NEW category
    | "Security";         // NEW category
  type: FilterFieldType;
  values?: string[];
  operators?: FilterOperator[];
  format?: TextFormat;                      // NEW: for text fields
  displayLabels?: Record<string, string>;   // NEW: for enum fields
  namedValues?: Record<string, string>;     // NEW: for numeric fields
  constraints?: { min?: number; max?: number };  // NEW: for numeric fields
}
```

### `src/types/tokens.ts` (changes marked)

```typescript
export type TokenFilterFieldType = "enum" | "text" | "date" | "numeric" | "ip";  // + ip

export type TokenFilterOperator =
  // ... all existing operators ...
  | "is_in_subnet"       // NEW
  | "is_not_in_subnet";  // NEW

// Add to OPERATOR_LABELS:
export const OPERATOR_LABELS: Record<TokenFilterOperator, string> = {
  // ... all existing entries ...
  is_in_subnet: "is in subnet",
  is_not_in_subnet: "is not in subnet",
};

// Add to OPERATORS_BY_FIELD_TYPE:
export const OPERATORS_BY_FIELD_TYPE: Record<
  TokenFilterFieldType,
  { primary: TokenFilterOperator[]; advanced: TokenFilterOperator[] }
> = {
  // ... all existing entries ...
  ip: {
    primary: ["is", "is_not", "is_any_of", "is_none_of", "is_in_subnet"],
    advanced: ["is_not_in_subnet", "starts_with", "is_set", "is_not_set"],
  },
};

// Add to TokenError.code:
export interface TokenError {
  code:
    | "TOP_LEVEL_OR"
    | "UNBALANCED_PAREN"
    | "CONSECUTIVE_CONNECTOR"
    | "LEADING_CONNECTOR"
    | "TRAILING_CONNECTOR"
    | "EMPTY_GROUP"
    | "SINGLE_CHILD_GROUP"
    | "UNKNOWN_FIELD"
    | "INVALID_OPERATOR"
    | "EMPTY_VALUES"
    | "INVALID_VALUE_FORMAT";  // NEW
  message: string;
}
```

### Proposed New Fields in `filter-schema.ts`

```typescript
// Source & Network
{
  key: "sources.ips",
  label: "Source IP",
  category: "Source & Network",
  type: "ip",
  operators: ["is", "is_not", "is_any_of", "is_none_of", "is_in_subnet",
              "is_not_in_subnet", "starts_with", "is_set", "is_not_set"],
},
{
  key: "sources.countries",
  label: "Source country",
  category: "Source & Network",
  type: "enum",
  values: COUNTRY_CODES,  // ISO 3166-1 alpha-2
  displayLabels: COUNTRY_LABELS,  // "US" → "United States (US)"
  operators: ["is", "is_not", "is_any_of", "is_none_of", "is_set", "is_not_set"],
},

// Security
{
  key: "security.cwe",
  label: "CWE",
  category: "Security",
  type: "text",
  format: "cve",
  operators: ["is", "is_not", "contains", "does_not_contain",
              "starts_with", "ends_with", "is_set", "is_not_set"],
},
{
  key: "security.api_owasp",
  label: "OWASP API",
  category: "Security",
  type: "text",
  format: "owasp",
  operators: ["is", "is_not", "contains", "does_not_contain",
              "starts_with", "ends_with", "is_set", "is_not_set"],
},

// Additional Attack characteristics
{
  key: "stats.requests",
  label: "Requests",
  category: "Attack characteristics",
  type: "numeric",
  constraints: { min: 0 },
  operators: ["equals", "not_equals", "gt", "gte", "lt", "lte",
              "in_between", "is_set", "is_not_set"],
},
{
  key: "stats.sessions",
  label: "Sessions",
  category: "Attack characteristics",
  type: "numeric",
  constraints: { min: 0 },
  operators: ["equals", "not_equals", "gt", "gte", "lt", "lte",
              "in_between", "is_set", "is_not_set"],
},
```

---

## Appendix B: Cost Analysis

### Adding IP Type — Full Work Estimate

| Work Item | Effort | Files Changed |
|-----------|--------|--------------|
| Type union updates | Trivial | `filters.ts`, `tokens.ts` |
| 2 new operators + labels | Small | `tokens.ts` |
| `OPERATORS_BY_FIELD_TYPE.ip` | Small | `tokens.ts` |
| `IpValueInput` component | Medium | New file |
| `FilterChip.tsx` case branch | Small | `FilterChip.tsx` |
| IP validation functions | Medium | New file |
| `checkChipValidity` Rule 11 | Small | `token-validation.ts` |
| `filter-suggestions.ts` IP handling | Small | `filter-suggestions.ts` |
| URL encoding for CIDR `/` | Small | `token-url.ts` |
| New field in `filter-schema.ts` | Trivial | `filter-schema.ts` |
| Unit tests: validators | Medium | New test file |
| Component tests: IpValueInput | Medium | New test file |
| Integration tests: IP flow | Medium | Existing test file |
| URL round-trip tests | Small | Existing test file |

**Total estimate**: ~2-3 days of engineering effort.

### Adding Semantic Validation Layer — Full Work Estimate

| Work Item | Effort | Files Changed |
|-----------|--------|--------------|
| `format-validators.ts` | Small | New file |
| `TextValueInput` format prop | Small | Existing file |
| `NumericValueInput` enhancements | Small | Existing file |
| `EnumValueSelector` displayLabels | Small | Existing file |
| `FilterFieldDef` optional props | Trivial | `filters.ts` |
| New fields in schema | Small | `filter-schema.ts` |
| Validator unit tests | Small | New test file |
| Enhanced component tests | Medium | Existing test files |

**Total estimate**: ~1-2 days of engineering effort.

### Comparison: If We Had Created 6 New Types Instead

6 types x ~2-3 days each = **12-18 days**. Plus ongoing maintenance of 6 value input components, 6 operator sets, 6 switch branches, 6 test suites. The semantic validation approach achieves the same user experience for format-constrained text fields at ~10% of the cost.
