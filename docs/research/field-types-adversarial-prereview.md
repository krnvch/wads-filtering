# Field Type Expansion: Adversarial Pre-Review

**Date**: 2026-03-05
**Author**: Principal UX Researcher (Adversarial / Red Hat)
**Status**: Pre-emptive challenge before any implementation begins
**Scope**: Proposed expansion from 4 field types (enum, text, date, numeric) to potentially 10+ (adding IP, UUID, URL, hash, CIDR, port, CVE, regex, etc.)

---

## 1. Steel-Man: The Case FOR Expanding Field Types

I will argue this case as strongly as I can before I tear it apart.

**The argument**: Security operations analysts work with structured data that has well-defined formats. An IP address is not arbitrary text. A CVE ID follows a strict pattern (CVE-YYYY-NNNNN). A SHA-256 hash is exactly 64 hex characters. Treating these as generic "text" fields means:

- **No format validation**: A typo like `192.168.1.256` (invalid octet) becomes a filter that silently returns zero results. In a security context, a missed attack due to a typo is an actual vulnerability.
- **No specialized operators**: "Source IP is in subnet 10.0.0.0/8" is a meaningful security query that `contains "10."` cannot replicate correctly (it would match `210.x.x.x` and `10.x.x.x` alike).
- **No input affordances**: A text field with a placeholder is a weaker affordance than an input that actively shows "invalid IPv4 format" as you type.
- **Professional credibility**: SOC analysts use tools like Splunk, QRadar, and Sentinel that have typed fields. A tool that treats IPs as text looks unsophisticated.
- **Backend contract alignment**: If the backend API has IP-specific query operators (`cidr_match`, `in_subnet`), the frontend must expose them. A `text` type cannot carry `in_subnet` as an operator.

This is a real argument and it has merit. The question is whether the merit justifies the cost.

---

## 2. Critical Risks of Expansion

### Risk 2.1: The Combinatorial Explosion

This is the single biggest threat. Let me be precise about the numbers.

**Current state** (4 types):

| Surface | Count | Formula |
|---------|-------|---------|
| Field types | 4 | -- |
| Operators across all types | 23 | 6 + 8 + 9 + 9 (with overlaps) |
| Type-specific operator groups | 8 | 4 types x (primary + advanced) |
| Value selector components | 4 | EnumValueSelector, TextValueInput, DateValueSelector, NumericValueInput |
| OPERATORS_BY_FIELD_TYPE entries | 4 | One per type |
| Token validation paths | ~10 | Per error code |
| Test files directly touched by types | ~12 | Schema, validation, URL, chip, each selector, operator selector... |

**After adding 5 new types** (IP, UUID, URL, hash, port):

| Surface | Count | Growth |
|---------|-------|--------|
| Field types | 9 | +125% |
| New operators needed | est. 8-12 | `in_subnet`, `matches_cidr`, `is_private`, `is_public`, `matches_regex`, `matches_pattern`, `in_port_range`, `is_well_known_port`... |
| Total operators | est. 31-35 | +35-52% |
| Value selector components | 7-9 | +75-125% |
| OPERATORS_BY_FIELD_TYPE entries | 9 | +125% |
| OPERATOR_LABELS entries | 31-35 | +35-52% |
| Test coverage matrix | ~54+ type-operator combos | +125% from ~24 |

Each new type touches at minimum **7 files**:

1. `types/tokens.ts` -- `TokenFilterFieldType` union, `TokenFilterOperator` union, `OPERATOR_LABELS`, `OPERATORS_BY_FIELD_TYPE`
2. `types/filters.ts` -- `FilterFieldType` union
3. `lib/filter-schema.ts` -- new field definitions
4. `lib/token-validation.ts` -- operator validity checking (already dynamic, but tests must cover)
5. `components/filters/FilterChip.tsx` -- switch statement for value selector
6. `components/filters/OperatorSelector.tsx` -- relies on `OPERATORS_BY_FIELD_TYPE` (dynamic, but new operators need labels)
7. A **new** `XxxValueInput.tsx` component (or proof that an existing one suffices)
8. Tests for all of the above

**The switch statement in FilterChip.tsx (line 107-165) is the smoking gun.** Every new type that needs a different value input means another case branch, another component import, another set of props to wire. This is already 4 cases. At 9 types, it is a maintenance liability that will cause bugs when any cross-cutting change occurs (like the `onConfirm(overrideValues)` stale-closure pattern that already burned the team once with all 4 selectors).

### Risk 2.2: IP Addresses Are Harder Than They Look

The team likely imagines: "add an IP field type, validate it's a valid IPv4, add `in_subnet` operator." Here is what actually happens:

**Format diversity**:
- IPv4: `192.168.1.1`
- IPv6: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`
- IPv6 abbreviated: `2001:db8::8a2e:370:7334`
- IPv4-mapped IPv6: `::ffff:192.168.1.1`
- IPv4 with port (in logs): `192.168.1.1:8080`
- CIDR notation: `10.0.0.0/8`

A single "IP" type must handle ALL of these or arbitrarily exclude some. Which ones? Has anyone asked SOC analysts whether they filter by IPv6? What if the dashboard data contains IPv4-mapped IPv6 addresses from containerized services?

**CIDR matching is a server-side computation**:
The frontend cannot validate whether `192.168.1.50` is in `192.168.1.0/24`. Well -- technically it *can*, with a bit math library. But should it? The frontend's job is to capture intent: "the user wants IPs in this subnet." The backend does the matching. Adding frontend CIDR validation means:
- Shipping a CIDR math library (or writing one)
- Maintaining parity between frontend validation and backend query semantics
- What happens when the frontend says "valid CIDR" but the backend rejects it? Or vice versa?

**The "contains" shortcut**:
A SOC analyst who wants all traffic from `192.168.1.*` can type `contains "192.168.1."` in a text field. This is not as precise as CIDR (it would miss `192.168.10.x` if the dot is correctly placed, but catch nothing wrong if they type `192.168.1` without the trailing dot). But it works for 80%+ of cases. Is the remaining 20% worth a dedicated type?

**My challenge**: Before building an IP type, the team must answer: what percentage of filter queries against IP fields use CIDR/subnet operators? If the answer is "we don't know," then we are building for an imaginary use case.

### Risk 2.3: UUIDs Are Just Text

I challenge the team to name a single operator for UUIDs that does not already exist in the `text` type.

| Text operator | UUID use case |
|--------------|---------------|
| `is` | Exact match (paste full UUID from log) |
| `is_not` | Exclude specific entity |
| `contains` | Partial match (first segment of UUID) |
| `starts_with` | Match by UUID prefix (version indicator) |
| `is_set` / `is_not_set` | Check presence |

The only thing UUID "gains" from being a dedicated type is format validation -- ensuring the user typed a valid UUID format. But consider:

- SOC analysts paste UUIDs from log entries. They don't type them by hand. Paste errors are not typos.
- If someone pastes a partial UUID (from a truncated log line), strict UUID validation would REJECT it. The analyst would then have to use `contains` with a text field anyway.
- UUID v4 vs v7 vs other versions -- does validation need to understand versions? If so, which versions are valid?

**My challenge**: UUID as a type is a validation trap. It adds a type with zero new operators, and its validation actively blocks valid use cases (partial UUIDs, truncated log entries).

### Risk 2.4: The Semantic Validation Trap

This deserves its own section because it is the deepest architectural mistake the team could make.

**The trap**: "If we know the field is an IP address, we should validate that the user entered a valid IP address."

**Why it's a trap**:

1. **Partial searches are legitimate**. A SOC analyst might search for `192.168` across all source IPs to find all traffic from a subnet. Strict IPv4 validation rejects this. The analyst has to know to switch to `contains` operator first, then type the partial. This is friction for a common operation.

2. **The frontend validates, the backend doesn't care**. Most search backends (Elasticsearch, ClickHouse, Postgres with trigram indexes) happily accept partial strings for IP fields. The backend does `WHERE source_ip LIKE '%192.168%'`. The frontend is the one saying "no, that's not a valid IP." We are building a wall between the user and the data that the data layer does not require.

3. **Format evolution**. Today's IPv4-only validation is tomorrow's bug report: "Why can't I filter by IPv6?" Then: "Why can't I filter by IPv4-mapped IPv6?" Then: "Why doesn't it accept link-local addresses?" Each format expansion is a validation update, a test suite update, and a potential regression.

4. **False confidence**. A green checkmark next to an IP input does NOT mean the filter will return correct results. It means the string looks like an IP. The backend might still return nothing (wrong field, stale data, network boundary differences). Semantic validation creates a false sense of correctness.

**Counter-argument I anticipate**: "But what about preventing the user from accidentally filtering `source_ip is "hello"`?" My response: so what? The query returns zero results. The user sees zero results, realizes they typed nonsense, and fixes it. This is self-correcting. No validation needed. No new type needed.

### Risk 2.5: Server-Side Concerns Masquerading as Frontend Types

Operators like `in_subnet`, `matches_cidr`, `matches_regex` are server-side query semantics. They describe what the BACKEND should do with the value. The frontend's role is:

1. Let the user pick the operator from a list
2. Let the user type a value
3. Serialize and send to the backend

The frontend does NOT need to validate whether `10.0.0.0/8` is a valid CIDR range. The backend will accept or reject it and return an error or results. Building frontend validation for server-side semantics means:

- **Duplicated logic**: The backend already validates CIDR. The frontend validates CIDR. Now two implementations must stay in sync.
- **Impedance mismatch**: What if the backend supports CIDR shorthand (`10/8`) but the frontend validator doesn't? The user types a valid backend query and the frontend rejects it.
- **Maintenance burden**: Backend API changes (new CIDR syntax, relaxed validation) require frontend updates too.

**The correct architecture**: The frontend sends the query. The backend validates semantics. If the backend rejects the query, the frontend shows the backend's error message. This is how Grafana, Kibana, and every mature query tool works.

### Risk 2.6: The 80/20 Question

Without usage data, I will construct a reasonable model based on competitive analysis and SOC workflow research.

**Estimated distribution of filter queries in a SOC dashboard**:

| Filter pattern | Est. % of all queries |
|---------------|----------------------|
| Status = Blocked/Monitored | 35% |
| Time range (last 24h, 7d) | 25% |
| Attack type = specific types | 15% |
| Impact = High | 10% |
| Specific IP (exact match) | 5% |
| Endpoint contains "/api/..." | 4% |
| CIDR/subnet filter | 1-2% |
| Specific UUID | <1% |
| Port range | <1% |
| CVE ID | <1% |
| Regex match | <0.5% |
| Hash match | <0.5% |

The top 4 filters (status, time, type, impact) account for ~85% of queries and they are ALL already covered by existing types (enum + date).

IP exact match is ~5% and is perfectly served by the `text` type with `is` operator.

CIDR/subnet is ~1-2% and is the ONLY use case that genuinely requires a new type (because `text` operators cannot express it).

Everything else is below 1% and is either served by `text` or so rare that building dedicated types is premature optimization.

**My challenge**: We are proposing to double the type system's complexity (from 4 to 8-9 types) to serve use cases that collectively represent less than 5% of query volume. The ROI is negative unless we have data proving otherwise.

---

## 3. Alternative Architectures

### Alternative A: "Text with Input Hints"

Instead of new types, extend `FilterFieldDef` with optional metadata:

```typescript
interface FilterFieldDef {
  key: string;
  label: string;
  category: string;
  type: FilterFieldType; // Still only 4 types
  values?: string[];
  operators?: FilterOperator[];

  // NEW: optional input metadata
  inputHint?: "ipv4" | "ipv6" | "ip" | "uuid" | "url" | "hash" | "cidr" | "cve" | "port";
  placeholder?: string;       // "e.g., 192.168.1.1"
  validationPattern?: RegExp; // Optional client-side format check
  validationMessage?: string; // "Must be a valid IPv4 address"
}
```

**How it works**:
- `type: "text"` with `inputHint: "ipv4"` -- renders `TextValueInput` with a custom placeholder and optional format validation
- No new value selector components
- No new operator groups
- No new entries in OPERATORS_BY_FIELD_TYPE
- No changes to FilterChip.tsx switch statement
- No changes to token-validation.ts
- No changes to token-url.ts serialization

**What you get**:
- Placeholders: "e.g., 192.168.1.1" or "e.g., CVE-2024-12345"
- Optional soft validation: amber underline if format doesn't match, but VALUE IS STILL ACCEPTED (no blocking)
- Zero new components, zero new operators, zero changes to the type system

**What you lose**:
- No CIDR-specific operators (but that's a <2% use case)
- No format-enforced validation (but strict validation is a trap, per Risk 2.4)
- Looks less "sophisticated" (but correctness > appearance)

**Verdict**: This is the 80/20 solution. It covers format hints without the combinatorial explosion.

### Alternative B: "Text + One New Type (IP)"

If the team insists on CIDR support, add exactly ONE new type: `ip`.

```typescript
type FilterFieldType = "enum" | "text" | "date" | "numeric" | "ip";
```

IP gets:
- All text operators (is, is_not, contains, starts_with, etc.)
- Two new operators: `in_subnet` (CIDR) and `not_in_subnet`
- One new value input component: `IpValueInput` -- a text input with optional CIDR notation support and a format hint (not blocking validation)
- IPv4 + IPv6 support from day one (or explicitly documented as IPv4-only)

Everything else (UUIDs, hashes, CVEs, URLs, ports) stays as `text` with `inputHint`.

**Cost**: 1 new type, 2 new operators, 1 new component. Manageable. The switch in FilterChip grows from 4 to 5 cases.

**Verdict**: This is the correct trade-off IF AND ONLY IF the backend API already has CIDR query operators and SOC analysts have explicitly requested subnet filtering.

### Alternative C: "Server-Side Operator Extension"

Do not add new frontend types at all. Instead, make the operator list per-field dynamic and allow the backend to declare field-specific operators.

```typescript
interface FilterFieldDef {
  key: string;
  label: string;
  category: string;
  type: FilterFieldType; // Still 4 types
  values?: string[];
  operators: FilterOperator[]; // Make this required, not optional
  // Backend can declare ANY operators for a field, including custom ones
}
```

The schema definition for `source_ip` would be:

```typescript
{
  key: "source_ip",
  label: "Source IP",
  category: "Network",
  type: "text",  // Still text!
  operators: ["is", "is_not", "contains", "starts_with", "in_subnet", "not_in_subnet", "is_set", "is_not_set"],
}
```

`in_subnet` and `not_in_subnet` are added to the `TokenFilterOperator` union, `OPERATOR_LABELS`, etc. -- but they are NOT associated with a type. They are associated with a specific field.

**The value input for `in_subnet` is still a text input.** The user types `10.0.0.0/8`. The frontend sends it to the backend. The backend validates CIDR syntax. If invalid, the backend returns an error. The frontend shows the error.

**Cost**: Add 2 operators, 2 labels. No new types. No new components. No new switch cases. The `TextValueInput` handles everything.

**Verdict**: This is the most architecturally sound approach. It separates "what the field looks like in the UI" (text input) from "what operators the backend supports" (per-field operator list). It scales to any number of server-side operators without frontend type proliferation.

---

## 4. Recommendation

### Do NOT expand field types comprehensively.

The risks (combinatorial explosion, semantic validation trap, testing burden, maintenance cost) vastly outweigh the benefits for a <5% query share.

### Expand cautiously, if at all.

**Recommended approach: Alternative C ("Server-Side Operator Extension") + Alternative A ("Input Hints")**

1. **Make `operators` required on `FilterFieldDef` and per-field.** Remove the assumption that type determines operators. A field's operators come from its schema definition, which should ultimately come from the backend.

2. **Add `inputHint` and `placeholder` to `FilterFieldDef`.** This gives IP fields a professional look (placeholder, format hints) without new types.

3. **Add new OPERATORS to the union as needed** (`in_subnet`, `not_in_subnet`, `matches_pattern`), with labels and appropriate categorization. These operators are available to specific fields, not to all fields of a type.

4. **Do NOT add new value input components** unless the new operator requires a fundamentally different input paradigm (not just a text field with different validation). CIDR notation is still text. UUID is still text. CVE IDs are still text. Port numbers are numeric (already handled).

5. **If and only if** there is proven demand (usage data, user interviews, explicit backend API support), consider a single new type: `ip` with CIDR value input. Not before.

### The Minimum Viable Type System

The smallest expansion that covers 90%+ of use cases:

| Current type | Covers | No change needed |
|-------------|--------|------------------|
| `enum` | Status, Attack type, Impact, Blocking status, HTTP status code | Already done |
| `text` | Endpoint, Hostname, Parameter, **Source IP**, **Request ID (UUID)**, **URL**, **Hash**, **CVE ID** | Already done, just add fields |
| `date` | Last seen, First detected | Already done |
| `numeric` | Response code, **Port**, **Request count**, **Payload size** | Already done, just add fields |

**New operators** (added to `TokenFilterOperator` union, field-specific assignment):

| Operator | Label | Used by fields | Value input |
|----------|-------|----------------|-------------|
| `in_subnet` | "is in subnet" | Source IP | TextValueInput (user types CIDR notation) |
| `not_in_subnet` | "is not in subnet" | Source IP | TextValueInput |
| `matches_pattern` | "matches pattern" | Any text field that opts in | TextValueInput (user types regex/glob) |

That is 2-3 new operators, 0 new types, 0 new value input components, 3 new labels. The `FilterChip.tsx` switch statement stays at 4 cases. The `OPERATORS_BY_FIELD_TYPE` map stays at 4 entries (new operators are per-field, not per-type). Test coverage grows linearly (3 new operators to test) not quadratically (no new type-operator matrix).

**Total new code**: ~30 lines in `tokens.ts`, ~10 lines in `filter-schema.ts` per new field, 0 new components.

Compare this to the comprehensive approach: ~500+ lines of new type definitions, 5+ new components, 30+ new type-operator test cases.

---

## 5. Open Challenges for the Team

These are questions I expect the team to answer before ANY type expansion work begins:

### Q1: Where is the usage data?
Do we have analytics on what fields SOC analysts actually filter by? If not, we are designing for imagined use cases. Ship `text` fields for everything first, add telemetry, and let data drive the type expansion.

### Q2: What does the backend API look like?
Does the backend already have CIDR query operators? If the backend just does `WHERE source_ip = $value`, then `in_subnet` on the frontend is a lie -- it sends an operator the backend cannot execute. The frontend type system must not outrun the backend capability.

### Q3: Who is requesting this?
Is the request coming from (a) actual SOC analysts who use the product, (b) the product team speculating about what SOC analysts want, or (c) engineers who think typed fields are technically elegant? These are very different motivations with very different urgency levels.

### Q4: What is the rollback plan?
If we add 5 new types and discover 3 of them are unused, can we remove them? Types that are serialized into URLs become API contracts. `?q=source_ip.in_subnet.10.0.0.0/8` in a bookmark cannot break when we remove the `ip` type. Think about backwards compatibility before expanding.

### Q5: Have we talked to even 3 SOC analysts?
Not product managers. Not engineers. Not hypothetical personas. Three actual humans who triage security incidents daily. Ask them: "How do you filter by IP address in your current tools?" If the answer is "I paste the exact IP from the alert," then the `text` type with `is` operator is sufficient.

---

## 6. Summary of Positions

| Position | Approach | New types | New operators | New components | Risk | Recommended? |
|----------|----------|-----------|---------------|----------------|------|-------------|
| Comprehensive expansion | Add ip, uuid, url, hash, port, cve, regex types | 7 | 12+ | 5-7 | EXTREME | NO |
| Moderate expansion | Add ip and uuid types | 2 | 4-6 | 1-2 | HIGH | NO |
| Conservative expansion | Add ip type only | 1 | 2 | 1 | MODERATE | ONLY with proven demand |
| Input hints + operators (recommended) | Keep 4 types, add per-field operators + hints | 0 | 2-3 | 0 | LOW | YES |
| Do nothing | Ship text fields, collect data | 0 | 0 | 0 | NONE | YES (as Phase 1) |

**My recommendation in one sentence**: Ship new fields as `text` or `numeric` with `inputHint` metadata, add 2-3 per-field operators (`in_subnet`, `matches_pattern`), collect usage data for 90 days, and then decide whether dedicated types are justified by actual analyst behavior rather than engineering assumptions.

---

## Appendix: Full Impact Inventory Per New Type

For any engineer who thinks "adding a type is easy," here is the exhaustive list of touchpoints for ONE new type:

1. `src/types/filters.ts` -- add to `FilterFieldType` union
2. `src/types/tokens.ts` -- add to `TokenFilterFieldType` union
3. `src/types/tokens.ts` -- add new operators to `TokenFilterOperator` union
4. `src/types/tokens.ts` -- add labels to `OPERATOR_LABELS` record
5. `src/types/tokens.ts` -- add entry to `OPERATORS_BY_FIELD_TYPE` record
6. `src/types/tokens.ts` -- potentially update `UNARY_OPERATORS` or `RANGE_OPERATORS` sets
7. `src/lib/filter-schema.ts` -- add field definitions using new type
8. `src/lib/token-validation.ts` -- verify operator validity checking covers new operators (currently dynamic, but tests needed)
9. `src/components/filters/FilterChip.tsx` -- add case to switch statement (line 107)
10. `src/components/filters/NewTypeValueInput.tsx` -- create new value selector component
11. `src/components/filters/OperatorSelector.tsx` -- verify renders new operators correctly (currently dynamic)
12. `src/lib/token-url.ts` -- verify serialization/deserialization works with new operators (currently generic, but edge cases with special characters in values like CIDR `/` or IPv6 `:`)
13. `src/lib/token-parser.ts` -- verify expression tree conversion handles new operators
14. `src/lib/__tests__/filter-schema.test.ts` -- test new field definitions
15. `src/lib/__tests__/token-validation.test.ts` -- test new operator validation
16. `src/lib/__tests__/token-url.test.ts` -- test URL serialization with new operator/value patterns (CIDR slashes, IPv6 colons)
17. `src/components/filters/__tests__/FilterChip.test.tsx` -- test new type renders correct selector
18. `src/components/filters/__tests__/NewTypeValueInput.test.tsx` -- full component test suite
19. `src/components/filters/__tests__/OperatorSelector.test.tsx` -- test new operator group renders
20. `src/components/filters/__tests__/FilterBar.test.tsx` -- integration test with new field type
21. `src/components/filters/__tests__/FilterFlow.test.tsx` -- end-to-end flow test
22. URL encoding edge cases: CIDR `/` must not collide with URL path separators. IPv6 `:` must not collide with field.operator.value separator. The current `encodeValue` escapes `~`, `.`, `,` but NOT `/` or `:`. These characters would pass through to the URL unescaped, potentially breaking `deserializeTokens` parsing.
23. Accessibility: new value input must have `aria-label`, `role`, keyboard navigation, screen reader announcements
24. Dark mode: new value input must work in both themes
25. Recent filters: `RecentLabel` must render new operator labels correctly
26. Error messages: `INVALID_OPERATOR` message must make sense for new type ("in_subnet is not valid for text fields" -- is this right?)

That is **26 touchpoints** per new type. Multiply by 5-7 new types. That is 130-182 individual changes that all must be correct, tested, and maintained indefinitely.

The "input hints + per-field operators" approach has **7 touchpoints** total, regardless of how many new fields are added.

The math is not close.
