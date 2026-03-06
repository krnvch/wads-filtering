# Semantic Field Types in Security & Observability Filtering Systems

## Competitive Research: How Leading Products Handle Complex Data Types

**Researcher**: Principal UX Researcher
**Date**: 2026-03-05
**Scope**: 10 products, 14 data types, operator and UI analysis
**Purpose**: Determine whether complex security data types (IP addresses, UUIDs, hashes, CIDR ranges, etc.) require dedicated field types with specialized operators/UI, or can map to existing generic types with semantic validation.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Per-Data-Type Findings](#2-per-data-type-findings)
3. [Product-by-Product Type System Analysis](#3-product-by-product-type-system-analysis)
4. [Type System Taxonomy](#4-type-system-taxonomy)
5. [Operator Matrix](#5-operator-matrix)
6. [UI Input Patterns](#6-ui-input-patterns)
7. [Recommendations](#7-recommendations)
8. [Sources](#8-sources)

---

## 1. Executive Summary

After researching 10 leading security and observability products (Datadog, Sentry, Splunk, Elastic/Kibana, Grafana Loki, AWS CloudWatch, Wireshark, CrowdStrike Falcon, Microsoft Sentinel, Suricata/Snort), a clear pattern emerges:

**The industry consensus is a tiered approach: a small number of core field types (5-8) with semantic subtypes layered on top for validation and specialized operators.**

Key findings:

1. **Only IP addresses consistently warrant a dedicated field type.** Elasticsearch, Wireshark, KQL, and Loki all have first-class IP types with CIDR/subnet operators that cannot be reduced to string or numeric operations.

2. **Most "complex" types map to string (keyword) with semantic validation.** UUIDs, hashes, CVE IDs, email addresses, and user agents are all stored and filtered as strings. The difference is in validation rules and autocomplete behavior, not in the type system itself.

3. **Ports map cleanly to numeric with semantic enrichment.** Port numbers are integers with optional name resolution (80 = HTTP). No product creates a dedicated "port" type.

4. **Version strings are the only type where Elasticsearch broke from convention** by creating a dedicated `version` field type for semver-aware sorting and range queries. Most other products treat versions as strings.

5. **Tags/labels are a structural pattern, not a scalar type.** They represent key-value pairs and require a different UI paradigm (nested input) rather than a different field type.

6. **Regex support is the great divider.** Wireshark, Splunk, Grafana/Loki, and KQL all support regex as a filter operator. Sentry, Datadog, and Kibana KQL do not (or have very limited support). This is a power-vs-safety tradeoff.

---

## 2. Per-Data-Type Findings

### 2.1 IP Addresses (IPv4, IPv6)

**Verdict: DEDICATED FIELD TYPE warranted**

This is the single most consistently specialized type across all products researched. IP addresses require operators that do not exist in string or numeric domains (CIDR matching, subnet containment, range matching across octets).

| Product | Type System | Operators | Input UI | Validation |
|---------|-----------|-----------|----------|------------|
| **Elasticsearch** | Dedicated `ip` field type; also `ip_range` | Term match, CIDR notation (`192.168.0.0/16`), range queries (gt, lt, gte, lte) | Text input; Kibana Options List control with prefix/contains/exact search modes | Format validated at index time; supports IPv4 and IPv6 |
| **Datadog** | No dedicated type; facet on `@network.client.ip` attribute | `CIDR()` operator: `CIDR(@network.client.ip, "192.168.0.0/16")`, exact match, wildcard | Text input in search bar; autocomplete from indexed values | CIDR notation validated in query parser |
| **Splunk** | No dedicated type; string field | `cidrmatch()` function, `where` clause, `IN` operator with CIDR notation, wildcard (`10.1.2.*`) | Text input; SPL query language | Validated by `cidrmatch()` at search time; supports IPv4 and IPv6 |
| **Grafana Loki** | No dedicated type but dedicated `ip()` function | `ip("192.0.2.0")` single, `ip("192.168.0.1-192.189.10.12")` range, `ip("192.51.100.0/24")` CIDR; operators `\|=`, `!=` for line filters; `=`, `!=` for label filters | Text input; Grafana query builder has IP filter option | Pattern validated by LogQL parser; supports IPv4 and IPv6 |
| **Wireshark** | Dedicated `IPv4 address` and `IPv6 address` field types | `==`, `!=`, `>`, `<`, `>=`, `<=`, CIDR notation (`ip.addr == 1.2.3.0/24`), bitwise operations, layer operator (`ip.src#1`) | Text input with autocomplete from protocol fields | Strict format validation at parse time |
| **Microsoft Sentinel (KQL)** | `string` type but rich IP functions | `ipv4_is_match()`, `ipv4_is_in_range()`, `ipv4_is_in_any_range()`, `ipv4_compare()`, `ipv4_is_private()`, `has_ipv4()`, `has_ipv4_prefix()`, `parse_ipv4()` | Text input in KQL query editor | Functions handle format validation; return null on invalid input |
| **CrowdStrike FQL** | String property | Exact match, wildcard (`*`), negation (`!`) | Text input in API filter | No CIDR-specific operator found in public docs |
| **Suricata/Snort** | Dedicated IP address fields in rule headers | CIDR notation (`192.168.1.0/24`), negation (`!`), IP groups (`[192.168.1.0/24,10.1.1.0/24]`), variables (`$HOME_NET`) | Rule definition syntax; no visual UI | Validated at rule parse time |
| **AWS CloudWatch** | No dedicated type | Regex matching (`\.10\.0\.1`), `like` operator with patterns | Text input in Logs Insights query | No native CIDR operator; requires regex |

**Key insight**: Products that index/store data (Elasticsearch, Wireshark) tend to have dedicated IP types. Products that are query-layer tools (Datadog, Splunk, KQL) achieve the same via functions/operators applied to string fields. The *user-facing behavior* is the same: CIDR matching, subnet containment, and range queries are universally expected for IP fields.

**Operators unique to IP type**:
- `in_subnet` / CIDR match (e.g., `192.168.0.0/24`)
- IP range (e.g., `192.168.0.1-192.168.0.255`)
- `is_private` / `is_public` (KQL)
- Comparison operators applied to IP ordering (Wireshark, Elasticsearch)

---

### 2.2 UUIDs / IDs (Client ID, Session ID, Trace ID, Request ID)

**Verdict: STRING type with format validation**

No product researched has a dedicated UUID/GUID field type for filtering purposes (Wireshark has a GUID display type, and KQL has a `guid` scalar type, but these are for display/storage, not for providing different filter operators).

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Elasticsearch** | `keyword` field type | Term (exact match), prefix, wildcard | UUID format not validated at index time; treated as opaque string |
| **Datadog** | String attribute (e.g., `trace_id`) | Exact match, wildcard (`*`) | Reserved attributes like `trace_id` don't need `@` prefix |
| **Sentry** | String property (`trace`, `id`) | Exact match, `*` wildcard | Trace searched using UUID generated by SDK |
| **Splunk** | String field | Exact match, wildcard, regex | No special UUID handling |
| **KQL** | `guid` scalar type exists | String operators (`==`, `has`, `contains`, `startswith`) | GUID type is for parsing/casting, not for specialized operators |
| **Wireshark** | `Globally Unique Identifier` display type | `==`, `!=` | One of ~25 display filter types; mostly exact match |
| **CrowdStrike FQL** | String property (`aid`, `cid`) | Exact match, wildcard, negation | Agent ID filtered as plain string |

**Key insight**: UUIDs are universally treated as exact-match strings. The only useful addition is **format validation** (to catch typos in UUID format) and **prefix matching** (to find all IDs starting with a pattern). No product provides UUID-specific operators like "same session" or "same trace."

**Recommended operators**: `equals`, `not_equals`, `starts_with`, `ends_with`, `contains`, `is_empty`

---

### 2.3 URLs / Endpoints

**Verdict: STRING type with optional structural parsing**

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Elasticsearch** | `keyword` or `text` with custom analyzers | Exact match, wildcard, regex (via Query DSL) | Can use `uax_url_email` tokenizer to index URL components separately |
| **Datadog** | String attribute (`http.url`) | Exact match, wildcard (`service:web*`), `CIDR()` on extracted IP portions | URL automatically parsed; query string redacted by default for security |
| **Sentry** | String property (`url`, `transaction`) | Contains, starts with, ends with, wildcard | Transaction name is the primary URL-like filter |
| **Splunk** | String field + URL Toolbox add-on | Exact, wildcard, regex; URL Toolbox provides `url_domain`, `url_path` extraction | URL Toolbox parses TLDs using Mozilla Suffix List |
| **AWS CloudWatch** | String field | `like`, regex matching | No URL-specific parsing |
| **CrowdStrike FQL** | String property | Exact match, wildcard | No URL-specific operators |

**Key insight**: URLs are always stored as strings but often **decomposed into components** (scheme, domain, path, query parameters) at ingestion time. The filtering then happens on the components, not on the raw URL. This is an enrichment-time concern, not a field-type concern.

**Recommended operators**: `equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `matches_regex` (if supported)

---

### 2.4 Hashes (MD5, SHA-256, Fingerprints)

**Verdict: STRING type with format validation only**

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Elasticsearch** | `keyword` field | Term (exact match), prefix | Case-insensitive via normalizer |
| **Datadog** | String attribute | Exact match | Threat intelligence uses hash matching against known IOCs |
| **CrowdStrike** | String property (IOC hashes) | Exact match, wildcard | Used heavily in IOC detection |
| **Microsoft Sentinel** | String | `==`, `has`, `in` | Used in threat intelligence matching |

**Key insight**: Hashes are **always exact-match strings**. No product provides partial hash matching (because it would be meaningless for cryptographic hashes). The only considerations are:
- **Case normalization**: SHA-256 `a1b2...` should match `A1B2...`
- **Length validation**: MD5 = 32 hex chars, SHA-256 = 64 hex chars
- **Prefix matching**: Useful for shortened hash displays (e.g., git commit hashes)

**Recommended operators**: `equals`, `not_equals`, `starts_with` (for prefix matching), `is_any_of` (for IOC list matching)

---

### 2.5 Ports

**Verdict: NUMERIC type with name resolution enrichment**

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Wireshark** | Unsigned integer (16-bit) | `==`, `!=`, `>`, `<`, `>=`, `<=`, range, `in` list | Port fields are strictly numeric; well-known port names resolved at display time |
| **Suricata/Snort** | Integer in rule headers | Exact, range (`:` operator), negation (`!`), groups (`[80,443]`) | Port variables (`$HTTP_PORTS`) map names to numbers |
| **Elasticsearch** | `integer` or `short` | All numeric operators | Port is just a number; service name is a separate field |
| **Splunk** | Numeric field | All numeric comparisons, `IN` list | Port-to-service mapping via lookup tables |
| **Datadog** | Numeric measure | `>`, `<`, `>=`, `<=`, exact | Part of network monitoring attributes |

**Key insight**: Every product treats ports as plain numbers. Service name resolution (80 = HTTP, 443 = HTTPS) is done either at display time or via separate lookup/enrichment. No product creates a "port" type; they use numeric with a name-resolution layer.

**Recommended operators**: `equals`, `not_equals`, `greater_than`, `less_than`, `between` (range), `is_any_of` (for port lists)

---

### 2.6 CIDR Ranges

**Verdict: Not a separate type; CIDR is an OPERATOR on the IP type**

CIDR is universally treated as an **operator or function** applied to IP address fields, not as a standalone field type.

| Product | CIDR Syntax |
|---------|------------|
| **Elasticsearch** | `{ "term": { "ip_addr": "192.168.0.0/16" } }` |
| **Datadog** | `CIDR(@network.client.ip, "192.168.0.0/16")` |
| **Splunk** | `\| where cidrmatch("192.168.0.0/16", src_ip)` or `src_ip IN (192.168.0.0/16)` |
| **Grafana Loki** | `\|= ip("192.51.100.0/24")` |
| **Wireshark** | `ip.addr == 1.2.3.0/24` |
| **KQL** | `\| where ipv4_is_in_range(IpAddress, "192.168.0.0/16")` |
| **Suricata** | `192.168.1.0/24` in rule header source/destination |

**Key insight**: The user input is a text field where the user types a CIDR notation string. Validation confirms `address/prefix_length` format. No product provides a visual CIDR calculator UI for filtering; they all rely on the user knowing CIDR notation.

---

### 2.7 Country Codes / Geo

**Verdict: ENUM type populated via IP-to-geo enrichment**

| Product | Handling | Population Method |
|---------|----------|------------------|
| **Elasticsearch** | `geo_point` field type + GeoIP processor | MaxMind GeoLite2 database lookup at ingest; enriches with `country_iso_code`, `country_name`, `city_name`, `region_name`, `continent_code` |
| **Datadog** | Enum-like facet | Automatic geo enrichment from IP; country codes appear as facet values |
| **Splunk** | String/enum field | `iplocation` command enriches with country, city, region |
| **Microsoft Sentinel** | String field | GeoIP enrichment functions |

**Key insight**: Country codes are never entered by users directly as a "geo type." They are:
1. Enriched from IP addresses at ingestion time
2. Stored as enum-like string fields (ISO country codes)
3. Filtered using standard enum operators (is, is not, is any of)

The only specialized UI is an optional **map visualization** for selecting countries, which is a presentation concern, not a type concern.

**Recommended operators**: Standard enum operators (`is`, `is_not`, `is_any_of`, `is_none_of`)

---

### 2.8 CVE / CWE Identifiers

**Verdict: STRING type with format validation and autocomplete**

| Product | Handling | Notes |
|---------|----------|-------|
| **CrowdStrike Falcon Spotlight** | String property (`cve.id`) | FQL exact match filter; used in vulnerability management dashboards; supports filtering by CVE ID, severity, base score |
| **Elasticsearch** | `keyword` | No special CVE type; indexed as plain keyword |
| **Microsoft Sentinel** | String | Queried via standard string operators |

**Key insight**: CVE IDs (`CVE-YYYY-NNNNN`) have a well-defined format (regex: `CVE-\d{4}-\d{4,}`), which makes them ideal candidates for **format validation** and **autocomplete from known CVE databases**. However, no product creates a dedicated field type for them. They are strings with semantic knowledge applied at the application layer.

**Recommended operators**: `equals`, `not_equals`, `is_any_of`, `starts_with` (for year-based filtering like `CVE-2025-*`)

---

### 2.9 User Agents

**Verdict: STRING type, with pre-parsed sub-fields**

| Product | Handling | Notes |
|---------|----------|-------|
| **Datadog** | String attribute + parsed sub-fields | RUM SDK auto-parses UA into device type, browser name/version, OS |
| **Sentry** | Parsed into separate properties | `browser`, `browser.name`, `os`, `os.name`, `device`, `device.family` are distinct searchable properties |
| **Elasticsearch** | `text` or `keyword` + `user_agent` ingest processor | Processor parses UA string into `name`, `version`, `os.name`, `os.version`, `device.name` |
| **Wireshark** | String field | `matches` (regex) operator for pattern matching |

**Key insight**: Raw user agent strings are never filtered as-is in production UIs. They are **always decomposed** into structured sub-fields (browser name, browser version, OS name, OS version, device type) at ingestion/enrichment time. Each sub-field is then filtered as an enum or string.

**Recommended approach**: Parse into enum sub-fields at ingestion; do not expose raw UA string to users.

---

### 2.10 Email Addresses

**Verdict: STRING type with optional domain extraction**

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Sentry** | String property (`user.email`) | Exact, wildcard (`*`), starts with, ends with, contains | Discussed in forums: `*@domain.com` pattern matching |
| **Elasticsearch** | `keyword` or `text` with `uax_url_email` tokenizer | Term, prefix, custom analyzer can extract domain part | Plugin available for email-specific tokenization |
| **Datadog** | String attribute | Exact match, wildcard | Part of sensitive data scanner patterns |

**Key insight**: Email addresses are strings. The main advanced need is **domain matching** (e.g., "all emails from @company.com"). This is achievable with `ends_with` or `contains` operators. Elasticsearch goes further by allowing custom analyzers to extract and index the domain separately.

**Recommended operators**: `equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `matches_domain` (syntactic sugar for `ends_with @domain`)

---

### 2.11 Duration / Time Spans

**Verdict: NUMERIC type with unit awareness**

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Datadog** | Numeric measure with units | `duration:>20ms`, `duration:>1s` | Supports time units (ms, s) in query syntax; slider UI for measures |
| **Sentry** | Numeric with comparison operators | `>`, `<`, `>=`, `<=` | Used for transaction duration filtering |
| **Splunk** | Numeric field | All comparison operators | Timespan/timescale syntax (`s`, `m`, `h`, `d`) |
| **KQL** | `timespan` scalar type | Arithmetic operators, comparison, `between` | Native timespan type: `2h`, `3d`, `500ms` |
| **Wireshark** | `Time offset` field type | `==`, `!=`, `>`, `<`, `>=`, `<=` | Dedicated type for time deltas |

**Key insight**: Duration/timespan is treated as a **numeric type with unit parsing**. The UX pattern is: user enters a number + unit selector (or types "500ms" in a query language). The system normalizes to a base unit for comparison. KQL is the most sophisticated with a native `timespan` type.

**Recommended operators**: Same as numeric (`greater_than`, `less_than`, `between`, `equals`) but with unit awareness in the input UI.

---

### 2.12 Version Strings

**Verdict: STRING type with optional semver-aware comparison**

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Elasticsearch** | Dedicated `version` field type | Same as keyword (term, prefix, wildcard) PLUS semver-aware sorting and range queries | `2.0.0 < 11.0.0` works correctly (not lexicographic); supports non-standard versions like `1.2` or `1.4.6.123.12` |
| **Sentry** | String property (`release`) | Exact match, `release:latest` shorthand | No semver comparison operators |
| **Datadog** | String tag (`version`) | Exact match, wildcard | Part of tag system |

**Key insight**: Elasticsearch is the only product that created a dedicated version field type, and it did so because **lexicographic sorting breaks semver** (e.g., "9.0" > "10.0" lexicographically). For filtering (as opposed to sorting), version strings can be treated as keywords. The semver comparison is only valuable for range queries ("versions between 2.0 and 3.0").

**Recommended approach**: Treat as string for filtering. If range queries are needed, implement semver-aware comparison in the filter engine.

---

### 2.13 Tags / Labels (Key-Value Pairs)

**Verdict: STRUCTURAL PATTERN, not a scalar type**

| Product | Handling | Operators | Notes |
|---------|----------|-----------|-------|
| **Datadog** | First-class tag system: `key:value` format | `env:prod`, `service:web*`, wildcard on values, Boolean combos, `IN` for multiple values, negation | Tags are fundamental to Datadog's data model; autocomplete from indexed tag keys and values |
| **Grafana/Loki** | Labels: `{app="api-gateway"}` | `=`, `!=`, `=~` (regex), `!~` (negative regex) | Labels are the primary selection mechanism for log streams |
| **Elasticsearch** | Nested objects or `keyword` multi-fields | All keyword operators on each sub-field | No native key-value type; modeled as object properties |
| **Splunk** | Tags and event types | Search on `tag::fieldname=value` | Tags are knowledge objects applied at search time |
| **CrowdStrike** | Tags as string properties | Exact match, wildcard | Host tags filterable via FQL |

**Key insight**: Tags/labels are a **compound input pattern** requiring two selections (key, then value). They are not a scalar field type. In a filter UI, this means:
1. First dropdown/autocomplete for the key
2. Second dropdown/autocomplete for values of that key
3. Standard string operators on the resolved value

This is already handled by our current field selection pattern (attribute picker in palette), so tags map to multiple individual fields, each with their own type.

---

### 2.14 Regular Expressions

**Verdict: OPERATOR, not a field type**

| Product | Regex Support | Notes |
|---------|--------------|-------|
| **Wireshark** | Yes: `matches` / `~` operator (PCRE2) | Only on string and protocol fields; not on numeric/IP |
| **Splunk** | Yes: `match()` function, `regex` command | PCRE syntax |
| **Grafana Loki** | Yes: `=~` and `!~` operators (RE2 syntax) | Label matchers and line filters |
| **KQL** | Yes: `matches regex` operator | PCRE-like; available on string fields |
| **Elasticsearch** | Yes: via Query DSL `regexp` query | Not available in KQL (Kibana); only in advanced Query DSL |
| **AWS CloudWatch** | Yes: `=~` operator with regex | RE2-like syntax |
| **Datadog** | Limited: wildcard only in search bar; regex in log parsing/redaction | No user-facing regex in log search queries |
| **Sentry** | No | Feature requested but not implemented |
| **CrowdStrike FQL** | No | Only wildcard (`*`) |

**Key insight**: Regex is a **cross-cutting operator** that applies to string-type fields, not a field type. Half the products support it; half don't. The split correlates with the product's audience: tools targeting engineers/analysts (Wireshark, Splunk, Loki) support regex; tools targeting broader audiences (Sentry, Datadog search bar) use wildcards only. Regex introduces significant UX and security risks (ReDoS, user confusion).

---

## 3. Product-by-Product Type System Analysis

### 3.1 Elasticsearch (Most Comprehensive Type System)

Elasticsearch has the richest type system in the industry with 30+ field types:

**Core types**: `text`, `keyword`, `constant_keyword`, `wildcard`, `long`, `integer`, `short`, `byte`, `double`, `float`, `half_float`, `scaled_float`, `date`, `date_nanos`, `boolean`, `binary`, `integer_range`, `float_range`, `long_range`, `double_range`, `date_range`, `ip_range`

**Specialized types**: `ip`, `version`, `completion` (autocomplete), `token_count`

**Geo types**: `geo_point`, `geo_shape`

**Complex types**: `object`, `nested`, `flattened`, `join`

**Vector types**: `dense_vector`, `sparse_vector`

**Key takeaway**: Even Elasticsearch, with the most granular type system, only has 3 "semantic" types beyond core primitives: `ip`, `version`, and `completion`. Everything else (UUIDs, hashes, emails, URLs, CVEs) is `keyword`.

### 3.2 Wireshark (Most Granular Display Type System)

Wireshark has ~25 display filter field types, including dedicated types for:
- `IPv4 address`, `IPv6 address` (with CIDR support)
- `Ethernet or other MAC address`, `EUI64 address`
- `Globally Unique Identifier`
- `IPX network number`, `VINES address`, `Fibre Channel WWN`
- `ASN.1 object identifier`
- `Date and time`, `Time offset`
- `Frame number`
- `Protocol`, `Label`
- Multiple integer widths, floating point, boolean, bytes, string, character

**Key takeaway**: Wireshark's type granularity is driven by packet protocol analysis needs (MAC addresses, fiber channel WWN, etc.). Most of these types only provide `==`/`!=` operators and format-aware display. Only IP addresses get CIDR-specific operators.

### 3.3 KQL / Microsoft Sentinel

KQL has a compact but well-designed type system:
- Scalar types: `bool`, `datetime`, `decimal`, `dynamic`, `guid`, `int`, `long`, `real`, `string`, `timespan`
- IP operations via functions: `has_ipv4()`, `ipv4_is_match()`, `ipv4_is_in_range()`, `ipv4_is_private()`, `ipv4_compare()`, `parse_ipv4()`
- String operators: `==`, `!=`, `has`, `!has`, `has_any`, `has_all`, `contains`, `!contains`, `startswith`, `endswith`, `matches regex`, `in`, `!in`

**Key takeaway**: KQL takes the "functions over types" approach. IP addresses are stored as strings but have 8+ dedicated functions. This keeps the core type system small while providing rich IP-specific capabilities.

### 3.4 Datadog

Datadog has a minimal explicit type system:
- **Facets** (qualitative): String values with top-list autocomplete
- **Measures** (quantitative): Integer or double values with slider/range UI, unit support
- **Reserved attributes**: `host`, `source`, `status`, `service`, `trace_id`, `message` (no `@` prefix needed)
- **Tags**: `key:value` format, first-class citizens
- **Special operators**: `CIDR()` function for IP filtering, wildcard (`*`, `?`)

**Key takeaway**: Datadog's approach is "everything is a string facet or a numeric measure." Specialization comes from operators (`CIDR()`) and attribute conventions (reserved names), not from the type system.

### 3.5 Sentry

Sentry has the simplest type system:
- String properties with: `equals`, `not equals`, `contains`, `starts with`, `ends with`, wildcard (`*`)
- Numeric properties with: comparison operators (`>`, `<`, `>=`, `<=`)
- No dedicated IP, UUID, or other semantic types
- No regex support

**Key takeaway**: Sentry proves that a simple string + numeric type system is sufficient for a successful developer tool. Specialization happens through **curated property names** and **operator availability per property**, not through a rich type system.

---

## 4. Type System Taxonomy

Based on the research, here is a proposed field type taxonomy organized into three tiers:

### Tier 1: Core Types (Engine-level)
These are the fundamental types that determine operator availability and comparison semantics.

| Type | Description | Comparison Semantics |
|------|-------------|---------------------|
| **enum** | Finite set of known values | Equality, set membership |
| **text** | Free-form string | Equality, substring, pattern matching |
| **numeric** | Integer or floating-point number | Equality, ordering, range |
| **date** | Point in time | Equality, ordering, range, relative ("last 7 days") |
| **ip** | IPv4 or IPv6 address | Equality, CIDR/subnet containment, range |

### Tier 2: Semantic Subtypes (Validation + UX layer)
These map to Tier 1 types but add format validation, specialized autocomplete, and optional enriched operators.

| Semantic Subtype | Maps To | Validation | Special Operators | Autocomplete |
|-----------------|---------|------------|-------------------|--------------|
| **uuid** | text | UUID format regex (`[0-9a-f]{8}-...`) | (none beyond text) | From indexed values |
| **hash_md5** | text | 32 hex chars | (none beyond text) | From indexed values |
| **hash_sha256** | text | 64 hex chars | (none beyond text) | From indexed values |
| **url** | text | URL format | (none beyond text) | From indexed values |
| **email** | text | Email format | `matches_domain` (sugar) | From indexed values |
| **cve_id** | text | `CVE-\d{4}-\d{4,}` | (none beyond text) | From CVE database |
| **user_agent** | text | (no strict format) | (none beyond text) | Prefer parsed sub-fields |
| **version** | text | Semver-like format | `semver_gt`, `semver_lt` (optional) | From indexed values |
| **port** | numeric | 0-65535 range | (none beyond numeric) | Well-known port names |
| **duration** | numeric | Non-negative + unit | (none beyond numeric) | Unit picker (ms, s, m, h) |
| **country_code** | enum | ISO 3166-1 alpha-2 | (none beyond enum) | Country name + flag |
| **cidr** | ip (input format) | `address/prefix` format | (treated as IP operator) | Subnet suggestions |

### Tier 3: Structural Patterns (UI composition layer)
These are not scalar types but require specialized UI composition.

| Pattern | Description | UI Approach |
|---------|-------------|-------------|
| **tags / labels** | Key-value pairs | Two-stage picker: key first, then values |
| **nested fields** | Hierarchical data | Dot-notation field paths |
| **multi-value** | Array of values | Multi-select with "any of" / "all of" operators |

---

## 5. Operator Matrix

This matrix shows which operators are available for each Tier 1 core type and which are added by Tier 2 semantic subtypes.

### Core Operators by Type

| Operator | enum | text | numeric | date | ip |
|----------|------|------|---------|------|-----|
| equals / is | Y | Y | Y | Y | Y |
| not_equals / is_not | Y | Y | Y | Y | Y |
| is_any_of | Y | Y | - | - | Y |
| is_none_of | Y | Y | - | - | Y |
| contains | - | Y | - | - | - |
| not_contains | - | Y | - | - | - |
| starts_with | - | Y | - | - | - |
| ends_with | - | Y | - | - | - |
| matches_regex | - | Y* | - | - | - |
| greater_than | - | - | Y | Y | - |
| less_than | - | - | Y | Y | - |
| between | - | - | Y | Y | - |
| in_last / relative | - | - | - | Y | - |
| in_subnet (CIDR) | - | - | - | - | Y |
| not_in_subnet | - | - | - | - | Y |
| in_range (IP range) | - | - | - | - | Y |
| is_empty | Y | Y | Y | Y | Y |
| is_not_empty | Y | Y | Y | Y | Y |

*`matches_regex` is a power-user feature; half of products researched do not support it.

### Semantic Subtype Additional Operators

| Semantic Subtype | Additional Operators Beyond Base Type |
|-----------------|--------------------------------------|
| uuid | (none) |
| hash | (none; prefix match via `starts_with` covers git-short-hash use case) |
| url | (none; `contains` covers path matching, `starts_with` covers domain matching) |
| email | `matches_domain` (optional sugar for `ends_with @domain`) |
| cve_id | (none; `starts_with CVE-2025` covers year filtering) |
| version | `semver_gt`, `semver_lt`, `semver_between` (optional, only if range queries are needed) |
| port | (none; well-known port name resolution is a display/autocomplete concern) |
| duration | (none; unit parsing is an input concern) |
| country_code | (none; standard enum operators suffice) |
| cidr | (not a subtype; CIDR is an IP operator) |

---

## 6. UI Input Patterns

### Pattern 1: Free Text with Validation (Most Common)
**Used by**: Datadog, Splunk, Sentry, CloudWatch, CrowdStrike
**For types**: All text-based semantic subtypes (UUID, hash, URL, email, CVE)
**Behavior**: Plain text input. Validation runs on blur/submit. Error shown if format is invalid. Autocomplete suggests from indexed values.

### Pattern 2: Specialized Text with Format Hints
**Used by**: Kibana filter controls, Grafana query builder
**For types**: IP addresses, CIDR
**Behavior**: Text input with placeholder showing expected format (e.g., `192.168.0.0/24`). Input mask or live validation as user types. Autocomplete from indexed IP values.

### Pattern 3: Numeric with Unit Selector
**Used by**: Datadog (measures), Sentry (duration), Wireshark (time offset)
**For types**: Duration, port
**Behavior**: Numeric input paired with unit dropdown (ms, s, m, h, d). The system normalizes to base unit for comparison.

### Pattern 4: Dropdown/Select with Search (Enum)
**Used by**: All products for enum fields
**For types**: Country codes, status values, severity levels
**Behavior**: Searchable dropdown populated from known values or indexed data. Multi-select for "is any of" operators.

### Pattern 5: Slider with Range
**Used by**: Datadog (measures facet), Kibana (range filter)
**For types**: Numeric ranges, port ranges
**Behavior**: Dual-handle slider showing min/max from data. Combined with direct numeric input.

### Pattern 6: Query Language Expression
**Used by**: Splunk SPL, KQL, LogQL, Wireshark display filters
**For types**: All types (IP with CIDR, regex patterns, complex expressions)
**Behavior**: Free-form text input with syntax highlighting, autocomplete, and error reporting. Supports the full power of the query language.

---

## 7. Recommendations

### 7.1 Add IP as a Fifth Core Field Type

**Recommendation**: YES -- add `ip` as a dedicated field type.

**Rationale**: The research is unambiguous. IP addresses need operators that don't exist in string or numeric domains:
- `in_subnet` (CIDR matching): `192.168.0.0/24` matches `192.168.0.42`
- `not_in_subnet`: negation of CIDR
- `in_range`: `192.168.0.1 - 192.168.0.255`

These cannot be cleanly expressed as text operators (contains/starts_with don't handle subnet math) or numeric operators (IP addresses aren't single numbers).

**Implementation**:
- Core type: `ip`
- Operators: `equals`, `not_equals`, `in_subnet`, `not_in_subnet`, `in_range`, `is_any_of`, `is_none_of`, `is_empty`, `is_not_empty`
- Input UI: Text input with placeholder `e.g., 192.168.1.0/24`; live validation for IPv4/IPv6 format
- Validation: IPv4 (`\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}`), IPv6, optional CIDR suffix (`/0-128`)
- Autocomplete: From indexed IP values (most common IPs seen)

### 7.2 Do NOT Create Dedicated Types for UUIDs, Hashes, URLs, Emails, CVEs

**Recommendation**: Keep these as `text` type with **semantic validation annotations**.

**Rationale**: The research shows that no product (including Elasticsearch with 30+ types) creates dedicated types for these. They all use string/keyword with:
1. Format validation (regex)
2. Specialized autocomplete (from indexed data or external databases)
3. Standard text operators (equals, contains, starts_with, ends_with)

**Implementation**: Add a `semanticType` property to `FilterFieldDef`:

```typescript
interface FilterFieldDef {
  field: string;
  label: string;
  type: 'enum' | 'text' | 'numeric' | 'date' | 'ip';  // 5 core types
  semanticType?: 'uuid' | 'hash_md5' | 'hash_sha256' | 'url' | 'email' | 'cve_id' | 'port' | 'version';
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    message?: string;
  };
}
```

The `semanticType` controls:
- Validation pattern (UUID format, hash length, email format, etc.)
- Placeholder text in input UI ("e.g., CVE-2025-12345")
- Autocomplete source (indexed values, external database, etc.)
- Case sensitivity (hashes are case-insensitive)

The `type` determines available operators (text operators for text, numeric operators for port, etc.).

### 7.3 Duration: Extend Numeric with Unit Awareness

**Recommendation**: Add `duration` as a semantic subtype of `numeric`, not a new core type.

**Rationale**: Duration values use the same operators as numeric (greater_than, less_than, between). The only addition is unit parsing in the input UI (converting "500ms" to 0.5 or "2h" to 7200).

**Implementation**:
- `type: 'numeric'`
- `semanticType: 'duration'`
- Add `unit` config: `{ options: ['ms', 's', 'm', 'h', 'd'], default: 's' }`
- Input UI: Number input + unit dropdown

### 7.4 Country Codes: Standard Enum

**Recommendation**: Use `enum` type with ISO 3166 values.

**Rationale**: Country codes are a finite, well-known set. They are enriched from IP addresses at data ingestion time. Standard enum operators (is, is not, is any of) are sufficient.

### 7.5 Tags: Not a Type Problem

**Recommendation**: Model as multiple fields, not as a single "tags" type.

**Rationale**: Tags are decomposed at ingestion into individual fields (e.g., `tag.env`, `tag.service`, `tag.version`). Each field is then filtered using its appropriate type (enum for known values, text for free-form).

### 7.6 Regex: Support as Optional Power-User Operator

**Recommendation**: Add `matches_regex` as an operator on text fields, but keep it hidden behind a "power user" toggle or advanced mode.

**Rationale**: Half the products researched support regex; half don't. The split correlates with audience sophistication. For a security operations dashboard, the users are technical enough to benefit from regex. However, regex introduces:
- UX complexity (most users don't know regex syntax)
- Security risks (ReDoS denial of service with pathological patterns)
- Performance concerns (regex matching is slower than indexed lookups)

**Mitigation**: Use RE2 syntax (no backtracking, guaranteed linear time). Show regex as an advanced option, not in the default operator list.

### 7.7 Proposed Final Type System

```
Core Types (5):
  enum     -- finite set of known values
  text     -- free-form string
  numeric  -- integer or float
  date     -- point in time with relative support
  ip       -- IPv4/IPv6 address with CIDR support

Semantic Subtypes (10):
  text:uuid         -- UUID format validation
  text:hash         -- hex string validation (configurable length)
  text:url          -- URL format validation
  text:email        -- email format validation
  text:cve          -- CVE-YYYY-NNNNN format validation
  text:version      -- semver-like format, optional semver comparison
  text:user_agent   -- no validation; prefer parsed sub-fields
  numeric:port      -- 0-65535 range, well-known name resolution
  numeric:duration  -- non-negative + unit picker
  enum:country      -- ISO 3166-1 alpha-2 values

Structural Patterns (not types):
  tags/labels       -- modeled as multiple fields
  nested fields     -- dot-notation paths
```

### 7.8 Priority Ranking for Implementation

If implementing incrementally, this is the order based on user value vs. implementation cost:

| Priority | Type/Feature | User Value | Implementation Cost | Rationale |
|----------|-------------|------------|-------------------|-----------|
| **P0** | `ip` core type | Very High | Medium | CIDR matching is essential for security ops; cannot be faked with text operators |
| **P1** | `semanticType` annotation system | High | Low | Framework for all semantic subtypes; mostly validation + placeholder text |
| **P1** | `text:hash` subtype | High | Low | Very common in security (IOC matching); just needs hex format validation |
| **P1** | `text:cve` subtype | High | Low | Core to vulnerability management; format validation + autocomplete |
| **P2** | `numeric:port` subtype | Medium | Low | Just range validation (0-65535) + name resolution lookup |
| **P2** | `numeric:duration` subtype | Medium | Medium | Needs unit picker UI component |
| **P2** | `text:uuid` subtype | Medium | Low | Format validation only |
| **P3** | `text:email` subtype | Low | Low | Format validation; `ends_with` covers domain matching |
| **P3** | `text:url` subtype | Low | Low | Format validation; standard text operators suffice |
| **P3** | `text:version` subtype | Low | Medium-High | Semver comparison is complex; low ROI unless range queries are needed |
| **P3** | `matches_regex` operator | Medium | Medium | Powerful but risky; needs RE2 engine and UX safeguards |

---

## 8. Sources

### Datadog
- [Use CIDR notation queries to filter your network traffic logs](https://www.datadoghq.com/blog/cidr-queries-datadog-log-management/)
- [Log Search Syntax](https://docs.datadoghq.com/logs/explorer/search_syntax/)
- [Log Facets](https://docs.datadoghq.com/logs/explorer/facets/)
- [Trace Explorer Query Syntax](https://docs.datadoghq.com/tracing/trace_explorer/query_syntax/)
- [Using Tags](https://docs.datadoghq.com/getting_started/tagging/using_tags/)
- [Advanced Filtering](https://docs.datadoghq.com/metrics/advanced-filtering/)
- [Attributes and Aliasing](https://docs.datadoghq.com/logs/log_configuration/attributes_naming_convention/)

### Sentry
- [Search](https://docs.sentry.io/concepts/search/)
- [Searchable Properties](https://docs.sentry.io/concepts/search/searchable-properties/)
- [Event Properties](https://docs.sentry.io/concepts/search/searchable-properties/events/)
- [Issue Properties](https://docs.sentry.io/concepts/search/searchable-properties/issues/)
- [Inbound Filters](https://docs.sentry.io/concepts/data-management/filtering/)

### Splunk
- [How does one search for a CIDR range of addresses?](https://community.splunk.com/t5/Splunk-Search/How-does-one-search-for-a-CIDR-range-of-addresses/m-p/118317)
- [Comparison and Conditional functions (cidrmatch)](https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.0/evaluation-functions/comparison-and-conditional-functions)
- [Evaluation functions](https://docs.splunk.com/Documentation/Splunk/9.0.3/SearchReference/CommonEvalFunctions)
- [When Splunk software extracts fields](https://help.splunk.com/en/splunk-enterprise/manage-knowledge-objects/knowledge-management-manual/9.1/fields-and-field-extractions/when-splunk-software-extracts-fields)
- [Domain Parsing with URL Toolbox](https://www.splunk.com/en_us/blog/security/domain-parsing-url-toolbox.html)
- [Specifying time spans](https://docs.splunk.com/Documentation/SCS/current/Search/Specifytimespans)

### Elasticsearch / Kibana
- [IP field type](https://www.elastic.co/guide/en/elasticsearch/reference/current/ip.html)
- [Version field type](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/version)
- [Field data types](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html)
- [GeoIP in the Elastic Stack](https://www.elastic.co/blog/geoip-in-the-elastic-stack)
- [KQL](https://www.elastic.co/docs/explore-analyze/query-filter/languages/kql)
- [Add filter controls (Kibana)](https://www.elastic.co/docs/explore-analyze/dashboards/add-controls)
- [Improve support for 'ip' type fields (GitHub issue)](https://github.com/elastic/kibana/issues/140266)
- [Add regex support to KQL (GitHub issue)](https://github.com/elastic/kibana/issues/46855)

### Grafana Loki
- [Matching IP addresses](https://grafana.com/docs/loki/latest/query/ip/)
- [Log queries](https://grafana.com/docs/loki/latest/query/log_queries/)
- [Query examples](https://grafana.com/docs/loki/latest/query/query_examples/)
- [LogQL Reference](https://grafana.com/docs/loki/latest/query/query_reference/)

### Wireshark
- [Building Display Filter Expressions](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)
- [wireshark-filter(4) Manual Page](https://www.wireshark.org/docs/man-pages/wireshark-filter.html)
- [Display Filter Reference: Index](https://www.wireshark.org/docs/dfref/)
- [DisplayFilters Wiki](https://wiki.wireshark.org/DisplayFilters)

### AWS CloudWatch
- [Filter pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html)
- [CloudWatch Logs Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [Sample queries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html)

### CrowdStrike Falcon
- [Falcon Query Language (FQL)](https://www.falconpy.io/Usage/Falcon-Query-Language.html)
- [Spotlight Vulnerabilities](https://www.falconpy.io/Service-Collections/Spotlight-Vulnerabilities.html)
- [Using Falcon Spotlight for Vulnerability Management](https://www.crowdstrike.com/blog/tech-center/falcon-spotlight-for-vulnerability-management/)

### Microsoft Sentinel / KQL
- [ipv4_is_match() function](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/ipv4-is-match-function)
- [ipv4_is_in_range() function](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/ipv4-is-in-range-function)
- [ipv4_compare() function](https://learn.microsoft.com/en-us/kusto/query/ipv4-compare-function)
- [Azure KQL -- Working with IP Addresses](https://garybushey.com/2022/05/21/azure-kql-working-with-ip-addresses/)
- [KQL Functions For Network Operations](https://kqlquery.com/posts/kql-for-network-operations/)
- [String operators](https://learn.microsoft.com/en-us/kusto/query/datatypes-string-operators)

### Suricata / Snort
- [Suricata Rules Format](https://docs.suricata.io/en/latest/rules/intro.html)
- [Snort IP Addresses](https://docs.snort.org/rules/headers/ips)
- [Writing Effective Suricata Rules (Coralogix)](https://coralogix.com/blog/writing-effective-suricata-rules-with-examples-best-practices/)

### General
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Filter UX Design Patterns & Best Practices (Pencil & Paper)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering)
- [20 Filter UI Examples for SaaS (Arounda)](https://arounda.agency/blog/filter-ui-examples)
