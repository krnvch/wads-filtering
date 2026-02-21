# Multi-Value Filter Chip UX Patterns: Comprehensive Design Analysis

**Author**: Principal Product Designer
**Date**: 2026-02-20
**Status**: Research Complete
**Scope**: Industry-wide analysis of how multi-value selections within a single filter chip communicate logical relationships to users

---

## Table of Contents

1. [The Core Design Problem](#1-the-core-design-problem)
2. [Taxonomy of Industry Approaches](#2-taxonomy-of-industry-approaches)
3. [Approach A: Implicit OR with Comma/Separator](#3-approach-a-implicit-or-with-commaseparator)
4. [Approach B: Explicit Intra-Chip Connector](#4-approach-b-explicit-intra-chip-connector)
5. [Approach C: Operator-Driven Semantics](#5-approach-c-operator-driven-semantics)
6. [Cognitive Load Analysis](#6-cognitive-load-analysis)
7. [Edge Cases and Semantic Problems](#7-edge-cases-and-semantic-problems)
8. [Accessibility Analysis](#8-accessibility-analysis)
9. [Product-by-Product Reference Matrix](#9-product-by-product-reference-matrix)
10. [Pros/Cons Comparison Matrix](#10-proscons-comparison-matrix)
11. [Recommendation](#11-recommendation)
12. [Sources](#12-sources)

---

## 1. The Core Design Problem

When a filter chip contains multiple values -- for example, `Status = Blocked, Monitoring` -- the interface must communicate three things simultaneously:

1. **What field** is being filtered (Status)
2. **What operator** is being applied (is / is not / contains / etc.)
3. **What logical relationship** exists between the values (OR? AND? Something else?)

This is a non-trivial UX challenge because:

- **Boolean logic is unintuitive to most users.** Research from the Nielsen Norman Group and Baymard Institute consistently shows that users misunderstand AND/OR operators. Many users believe AND *widens* results (additive mental model: "I want this AND that") when it actually *narrows* them. Conversely, users often think OR narrows results ("just this OR just that") when it widens them.
- **The same visual pattern can mean different things** depending on the field type. For a single-value enum field like "Status," multi-select inherently means OR (an item has exactly one status). For a multi-value field like "Tags/Labels," both OR ("has any of these") and AND ("has all of these") are semantically valid.
- **Negation compounds the confusion.** When a user selects "Status is not Blocked, Monitoring," do they mean "NOT Blocked AND NOT Monitoring" (exclude both) or "NOT (Blocked AND Monitoring)" (only exclude items that are somehow both)? De Morgan's Law makes these equivalent for OR-joined values, but users do not think in De Morgan's Law.
- **Chip real estate is limited.** Filter chips need to be compact to fit multiple filters on one line. Verbose logical expressions eat horizontal space.

The design decision here is not merely cosmetic. It directly affects:
- Whether users can correctly predict what results they will see
- Whether users can debug unexpected filter results
- How the intra-chip logic interacts with the between-chip logic (AND/OR connectors)
- How accessible the interface is to screen readers

---

## 2. Taxonomy of Industry Approaches

Across 20+ products analyzed, multi-value filter chips fall into **three fundamental approaches**, with some products using hybrids:

| Approach | Visual Pattern | Logic Communication | Products |
|----------|---------------|-------------------|----------|
| **A: Implicit OR (comma/separator)** | `Status: Blocked, Monitoring` | Comma implies OR; no explicit operator | GitHub, Sentry, Datadog, Kibana, Vercel, Algolia, Grafana |
| **B: Explicit intra-chip connector** | `Status is Blocked or Monitoring` | "or"/"and" word shown between values | Our current spec (wads-filtering) |
| **C: Operator-driven semantics** | `Status is any of Blocked, Monitoring` | The operator encodes the relationship | Linear, Airtable, Notion, Jira, MUI DataGrid, PatternFly, Productboard |

### The Hybrid Zone

Several products combine elements:
- **Linear** uses Approach C for the operator ("is either of") but does not show explicit connectors between values -- the operator itself carries the semantic load
- **Sentry** uses Approach A in visual tokens (`browser:[Chrome, Firefox]`) but exposes Approach A with explicit OR text in its query language (`browser:Chrome OR browser:Firefox`)
- **PatternFly** (Red Hat's design system) uses chip groups with OR semantics documented in the design guidelines, but the chips themselves use comma separation

---

## 3. Approach A: Implicit OR with Comma/Separator

### Description

Multiple values are displayed as a comma-separated list (or within brackets) with no explicit logical operator between them. The logical relationship (OR) is implied by convention.

### Visual Examples

```
GitHub:       label:"bug","feature"
Sentry:       browser.name:[Chrome, Firefox]
Datadog:      service:(web-app OR api-server)    # parenthetical OR in query
Kibana:       status: is one of error, warning   # natural language variant
Algolia:      Color: Red, Blue, Green            # faceted refinement
Grafana:      host: server-1, server-2           # multi-value variable
```

### Products Using This Approach

| Product | Exact Format | Notes |
|---------|-------------|-------|
| **GitHub** | `label:"bug","feature"` | Comma-separated in query syntax. Visually displayed as separate filter pills, not combined. |
| **Sentry** | `browser:[Chrome, Firefox]` | Bracket notation. Single token in search bar. No "or" text. |
| **Datadog** | `service:(web-app OR api-server)` | Hybrid: uses parenthetical syntax with explicit OR in query, but facet panel uses checkboxes with implicit OR. |
| **Kibana/Elasticsearch** | `field: [value1, value2]` (KQL terms filter) | List syntax. Facets are single-select by default; multi-select was a long-standing feature request. |
| **Algolia** | Refinement list with checkboxes | Multiple checked values in a facet = OR. No explicit text. Visual indication via checkboxes. |
| **Grafana** | Multi-value variable dropdown | Pipe-separated, regex-formatted, or comma-separated depending on context. |
| **Cloudflare** | `key:value1 OR key:value2` | Explicit OR in query, but no compound chip display. |

### Strengths

1. **Maximum compactness.** `Status: Blocked, Monitoring` is the shortest possible representation. Horizontal space is preserved for additional filters.
2. **Developer familiarity.** Comma-separated lists are a universal programming convention. Developers instantly recognize the pattern.
3. **URL-friendly.** `status=Blocked,Monitoring` serializes cleanly to query parameters.
4. **Works naturally with counts.** Easy to append count indicators: `Status: Blocked (15), Monitoring (10)`.
5. **Scales well.** Even with 5+ values, the comma list remains parseable: `Type: XSS, SQLi, BOLA, CSRF, XXE`.

### Weaknesses

1. **OR is never stated.** Users must KNOW that comma means OR. This is a learned convention, not a self-documenting interface.
2. **Ambiguity for non-technical users.** A security analyst seeing `Status: Blocked, Monitoring` might read it as "Status is Blocked AND Monitoring" (both conditions must be true) rather than "Status is Blocked OR Monitoring" (either condition).
3. **Negation ambiguity.** `Status is not: Blocked, Monitoring` -- does "is not" apply to each value individually? To the group? Users cannot tell without trial and error.
4. **No way to express AND.** If a future need arises for "Tags: security AND critical" (must have both), the comma syntax cannot distinguish this from OR.
5. **Baymard research gap.** While Baymard Institute found that 45% of users combine multiple filter values within the same category, their research focused on checkboxes as the selection mechanism, not on how the combined state is displayed in chips.

---

## 4. Approach B: Explicit Intra-Chip Connector

### Description

The logical operator ("or" / "and") is shown as visible text between values within the chip. The chip reads as a complete human-readable sentence.

### Visual Examples

```
Our current spec:    Status is not Monitoring or Blocked
Potential AND:       Tags contains security and critical
Potential mixed:     Type is XSS or SQLi
```

### Products Using This Approach

This approach is relatively rare in production products. Most products that show explicit connectors do so between *chips* (inter-chip connectors), not *within* chips (intra-chip connectors). Our wads-filtering spec is one of the few designs that places explicit "or" text between values inside a single chip.

The closest production examples:
- **Vercel Runtime Logs** parses complex queries into visual pills where OR can appear between values in the same field, but this is rendered as separate pills with an OR token between them, not as a single compound chip.
- **Sentry Discover** shows explicit `OR` in the query text, but this is between separate tokens, not within a single token.

### Strengths

1. **Maximum readability.** `Status is not Monitoring or Blocked` reads as natural English. A first-time user can understand the filter's meaning without any training.
2. **Self-documenting.** The interface states its logic explicitly. No convention to learn.
3. **Supports both OR and AND in principle.** If the interface later needs "Tags contains security and critical," the pattern extends naturally.
4. **Reduces boolean confusion.** By spelling out "or" in lowercase between values, the interface disambiguates what would otherwise be an abstract logical concept.
5. **Aligns with Linear's philosophy.** Linear's "filters as readable formulas" principle values human-readable expressions over syntax-heavy displays.

### Weaknesses

1. **Horizontal space consumption.** `Status is not Monitoring or Blocked` is 42 characters. `Status: !Monitoring, Blocked` is 28 characters. In a filter bar with 3-4 active filters, the explicit connector version may overflow.
2. **Scaling problem at 5+ values.** `Type is XSS or SQLi or BOLA or CSRF or XXE` becomes unwieldy. At some point, the chip needs to truncate: `Type is XSS or SQLi or +3 more`.
3. **Ambiguity with between-chip connectors.** If the filter bar shows `Status is Blocked or Monitoring AND Type is XSS or SQLi`, the "or" within chips can visually clash with the "AND" between chips. Users may struggle to parse precedence.
4. **No established industry precedent.** This approach is novel, which means users cannot transfer knowledge from other products. It must be learned fresh.
5. **Grammatical oddity with "is not."** `Status is not Monitoring or Blocked` could be parsed as: "Status is not Monitoring" OR "Blocked" (dangling value). The intended reading is "Status is not (Monitoring or Blocked)," but natural English grammar is ambiguous here. Parenthetical grouping in text is not a natural human language construct.

---

## 5. Approach C: Operator-Driven Semantics

### Description

The operator itself changes to encode the logical relationship between values. Instead of adding explicit connectors between values, the operator word morphs:

- Single value: `is` / `is not`
- Multi-value OR: `is any of` / `is either of` / `is one of`
- Multi-value AND (for applicable fields): `is all of` / `includes all`
- Multi-value NOT: `is none of` / `is not any of` / `includes neither`

### Visual Examples

```
Linear:         Status is either of In Progress, Done
Airtable:       Priority is any of High, Critical
Notion:         Tags contains Security                    (single)
Notion:         Tags contains any of Security, Critical   (multi)
MUI DataGrid:   Status is any of Active, Pending
Linear Labels:  Labels includes all Design, Frontend
PatternFly:     Status: is any of Active, Inactive
Productboard:   Status is any of Active, In Progress
```

### Products Using This Approach

| Product | Single-Value Operator | Multi-Value OR Operator | Multi-Value AND | Multi-Value NOT |
|---------|---------------------|----------------------|----------------|----------------|
| **Linear** | `is` | `is either of` | N/A (single-value fields) | `is not` (auto-adjusts) |
| **Linear (Labels)** | `includes any` | `includes any` | `includes all` | `includes neither` / `includes none` |
| **Airtable** | `is` | `is any of` | N/A | `is none of` |
| **Notion** | `is` / `contains` | (not explicitly surfaced) | (not explicitly surfaced) | `does not contain` |
| **Jira (JQL)** | `=` | `in (v1, v2)` | N/A (single-value) | `not in (v1, v2)` |
| **MUI DataGrid** | `is` | `is any of` | N/A | `is not any of` |
| **PatternFly** | `is` | `is any of` | N/A | `is none of` |
| **Productboard** | `is` | `is any of` | N/A | `is none of` |

### The Linear Model in Detail

Linear deserves special attention because it has the most sophisticated implementation of this approach:

1. **Auto-upgrading operators**: When a user selects a second value, the operator silently transitions from `is` to `is either of`. The user does not need to manually change the operator.
2. **Field-type-aware operators**: For single-value enum fields (Status, Priority, Assignee), the operators are `is` / `is not` / `is either of`. For multi-value set fields (Labels), the operators are `includes any` / `includes all` / `includes neither` / `includes none`. This distinction correctly reflects the semantic difference between "which one status does this item have?" and "which combination of labels does this item have?"
3. **No ambiguity**: `Status is either of In Progress, Done` cannot be misread. The operator "is either of" unambiguously states OR logic. There is no grammatical parsing ambiguity.

### Strengths

1. **Semantic precision.** The operator carries the full logical meaning. "is any of" is unambiguous -- it means OR. "is all of" is unambiguous -- it means AND. No parsing required.
2. **Field-type awareness.** For single-value fields (status, priority), only OR-compatible operators appear. For multi-value fields (tags, labels), both OR and AND operators are available. The interface prevents semantically impossible combinations.
3. **Established industry pattern.** Linear, Airtable, MUI DataGrid, and PatternFly all use this approach. Users transferring from these products will recognize the pattern.
4. **Clean negation.** `is none of [Blocked, Monitoring]` is clear: "the status is not any of these." No De Morgan's Law reasoning required.
5. **Scales better than Approach B.** `Status is any of Blocked, Monitoring, Started` reads more naturally than `Status is Blocked or Monitoring or Started` because the operator sets up the expectation of a list.
6. **Auto-upgrade reduces friction.** Linear's pattern where `is` silently becomes `is either of` means users never encounter a state transition. They select values; the operator adapts.

### Weaknesses

1. **More operator vocabulary.** Users must learn more operator words: `is`, `is not`, `is any of`, `is none of`, `includes any`, `includes all`, `includes neither`. This is a higher upfront learning cost.
2. **Operator label design challenge.** "Is either of" and "is any of" are synonyms. Which do we use? "Is not any of" vs "is none of" -- both work but create inconsistency if mixed. Requires careful operator naming.
3. **Slightly more horizontal space than Approach A.** `Status is any of Blocked, Monitoring` (40 chars) vs `Status: Blocked, Monitoring` (27 chars). But less space than Approach B when the connector is repeated: `Status is any of Blocked, Monitoring` (40 chars) vs `Status is Blocked or Monitoring` (31 chars) -- actually Approach C is slightly longer here.
4. **Auto-upgrade can confuse.** If a user selects one value ("Status is Blocked") and then adds another, the operator silently changes to "Status is either of Blocked, Monitoring." Users might not notice the operator changed, especially if they are focused on the value selector.
5. **The `contains` / `does not contain` operators for text fields do not naturally extend to multi-value.** What does "contains any of [XSS, SQLi]" mean for a free-text field? This requires careful thought.

---

## 6. Cognitive Load Analysis

### Framework

I will evaluate each approach against three cognitive load dimensions from Sweller's Cognitive Load Theory:

1. **Intrinsic load**: The inherent complexity of understanding the filter logic
2. **Extraneous load**: The unnecessary complexity added by the interface design
3. **Germane load**: The productive effort required to build a correct mental model

### 6.1 Approach A: Implicit OR (Comma)

| Dimension | Rating | Analysis |
|-----------|--------|----------|
| **Intrinsic** | Low | Comma-separated lists are universally understood as "a collection of items." The intrinsic complexity is low. |
| **Extraneous** | Medium-High | The extraneous load comes from the *missing* information: the user must infer that the comma means OR, not AND. If they infer wrong, they get wrong results with no feedback about why. |
| **Germane** | Low | Little productive learning happens. Users either know comma=OR (from prior experience) or they guess and get lucky/unlucky. |

**Time to comprehension**: Fast for experienced users (< 1 second). Uncertain for novice users (may never correctly understand without documentation).

**5+ values**: Handles well. `Status: A, B, C, D, E` remains parseable.

**Error rate**: Moderate-High for non-technical users. Research from the NNGroup notes that users frequently misunderstand implicit boolean logic in search interfaces.

**Interaction with between-chip AND/OR**: Low friction. The comma inside chips is visually distinct from the AND/OR connectors between chips.

### 6.2 Approach B: Explicit Connector

| Dimension | Rating | Analysis |
|-----------|--------|----------|
| **Intrinsic** | Low-Medium | "or" is an English word everyone knows. But the sentence structure `Status is not Monitoring or Blocked` has inherent grammatical ambiguity that adds complexity. |
| **Extraneous** | Low | Nothing is hidden. The logic is fully spelled out. The extraneous load is minimal because there is nothing to infer. |
| **Germane** | Medium | Users build a mental model of "the chip is a sentence describing the filter." This is productive but requires parsing each chip as a mini-sentence. |

**Time to comprehension**: Fast for simple cases (< 2 seconds). Slower for negation cases because of grammatical ambiguity ("is not X or Y" -- does "or" bind to "not" or to the values?).

**5+ values**: Handles poorly. `Type is XSS or SQLi or BOLA or CSRF or XXE` is 48 characters of repetitive connectors. The "or" loses meaning through repetition.

**Error rate**: Low for simple cases. Moderate for negation. The explicit "or" prevents the most common misunderstanding (thinking comma = AND), but introduces a new ambiguity with negation.

**Interaction with between-chip AND/OR**: HIGH friction. This is the critical weakness. Consider:

```
Status is Blocked or Monitoring AND Type is XSS or SQLi
```

Where does the inter-chip AND start and the intra-chip "or" end? Visual parsing is extremely difficult. The user must distinguish between lowercase "or" (intra-chip) and uppercase "AND" (inter-chip), which is a fragile visual distinction.

### 6.3 Approach C: Operator-Driven

| Dimension | Rating | Analysis |
|-----------|--------|----------|
| **Intrinsic** | Medium | The operator vocabulary is larger (more words to learn), but each operator has a single unambiguous meaning. The intrinsic complexity is bounded and learnable. |
| **Extraneous** | Very Low | The operator says exactly what it means. `is any of` cannot be misinterpreted. No hidden conventions, no ambiguous parsing. The mapping from interface text to logical behavior is 1:1. |
| **Germane** | High | Users build a robust mental model: "the operator tells me the logic." This model transfers across filter fields and even across products (Linear, Airtable, MUI). |

**Time to comprehension**: Moderate on first encounter (3-5 seconds to process a new operator like "is either of"). Fast on subsequent encounters (< 1 second) because the operator is unambiguous.

**5+ values**: Handles well. `Type is any of XSS, SQLi, BOLA, CSRF, XXE` -- the "is any of" sets up the expectation of a list, and the comma-separated values flow naturally.

**Error rate**: Low. The explicit operator eliminates the primary source of confusion (what does the relationship between values mean?). The auto-upgrade behavior (is -> is any of) is the main risk, but it is recoverable (the user can click the operator to see what it says).

**Interaction with between-chip AND/OR**: Low friction. The operator is contained within the chip; the AND/OR connector is between chips. There is no visual collision:

```
Status is any of Blocked, Monitoring  AND  Type is any of XSS, SQLi
```

The boundary between intra-chip semantics (operator) and inter-chip semantics (connector) is clear.

### 6.4 Comparative Summary

| Factor | A: Implicit Comma | B: Explicit Connector | C: Operator-Driven |
|--------|------------------|----------------------|-------------------|
| **First-use comprehension** | Fast (if guessed correctly) | Fast (for positive filters) | Moderate (new vocabulary) |
| **Correctness of understanding** | Uncertain | High (except negation) | Very High |
| **5+ values scalability** | Excellent | Poor | Good |
| **Negation clarity** | Ambiguous | Ambiguous | Clear |
| **Interaction with AND/OR connectors** | Clean | Problematic | Clean |
| **Knowledge transfer from other products** | Moderate | Low | High |
| **Overall cognitive load** | Low ceiling, high floor | Medium ceiling, medium floor | Medium ceiling, low floor |

The "low ceiling, high floor" characterization of Approach A means: it is easy to use if you already understand it, but it is hard to learn correctly if you do not. The "medium ceiling, low floor" of Approach C means: there is a small initial learning investment, but once understood, the mental model is robust and error-resistant.

---

## 7. Edge Cases and Semantic Problems

### 7.1 Single-Value Enum Fields: AND is Logically Impossible

For a field like `Status` where each item has exactly one value (Blocked, Monitoring, or Started), `Status is Blocked AND Monitoring` is a logical impossibility -- no item can have two statuses simultaneously. The result set would always be empty.

**How products handle this:**

| Product | Strategy | Implementation |
|---------|----------|---------------|
| **Linear** | Prevent at the operator level | Only `is`, `is not`, `is either of` are available. There is no "is all of" for Status. |
| **Airtable** | Prevent at the operator level | Only `is`, `is any of`, `is none of` for single-select fields. `has all of` only appears for multi-select fields. |
| **Notion** | Implicit constraint | Multi-select property uses `contains` (acts as OR for checking), no AND option for single-select. |
| **Sentry** | Implicit constraint | Multi-value bracket syntax `[v1, v2]` is always OR. No AND option exists. |
| **GitHub** | Implicit constraint | Comma-separated labels use OR. AND requires separate `label:` qualifiers. |

**Our recommendation**: Approach C naturally solves this. By offering only semantically valid operators per field type, the interface prevents impossible combinations without needing error messages.

### 7.2 Multi-Value Set Fields: AND is Valid

For a field like "Tags" or "Labels" where each item can have multiple values simultaneously, both OR and AND are meaningful:
- `Tags includes any of [security, critical]` = has security OR critical (or both)
- `Tags includes all of [security, critical]` = has both security AND critical

**How products handle this:**

| Product | OR Operator | AND Operator |
|---------|------------|-------------|
| **Linear** | `includes any` / `includes either` | `includes all` |
| **Airtable** | `has any of` | `has all of` |
| **Notion** | `contains` (one value at a time) | Multiple separate `contains` filters combined |
| **Jira (JQL)** | `in (label1, label2)` | `label = label1 AND label = label2` (separate conditions) |

**Our recommendation**: Our current data model (attacks) has `security.cwe` and `security.api_owasp` as array fields, plus `sources.countries` and `sources.ips`. For these, Approach C allows us to offer both "includes any of" and "includes all of" operators. For enum fields like `status`, `impact`, `type`, only "is any of" / "is none of" would be available.

### 7.3 Negation Distribution: The Critical Semantic Problem

The expression `Status is not Blocked, Monitoring` presents a semantic parsing challenge:

**Interpretation 1** (Correct -- De Morgan's): "Status is NOT Blocked AND NOT Monitoring"
- Equivalent to `NOT IN (Blocked, Monitoring)`
- Shows items with status = Started (the only remaining option)

**Interpretation 2** (Incorrect but plausible): "Status is (NOT Blocked), Monitoring"
- Could be read as: exclude Blocked, but include Monitoring
- This is a fundamentally different filter

**How each approach handles this:**

| Approach | Negation Display | Ambiguity Level |
|----------|-----------------|----------------|
| **A: Comma** | `Status: !Blocked, !Monitoring` or `!Status: [Blocked, Monitoring]` | Low if negation is on field/operator level. High if negation symbol is per-value. |
| **B: Connector** | `Status is not Monitoring or Blocked` | **HIGH.** Natural language parsing yields: "(is not Monitoring) or (Blocked)" -- which is NOT the intended meaning. |
| **C: Operator** | `Status is none of Blocked, Monitoring` | **Very Low.** "is none of" unambiguously means "exclude all listed values." |

This is the strongest argument against Approach B. The sentence `Status is not Monitoring or Blocked` has genuine grammatical ambiguity in English. Consider:

- "I am not going to the store or the park" -- most English speakers parse this as "I am not going to either place" (correct interpretation)
- But: "The status is not Monitoring or Blocked" -- could also parse as "The status is [not Monitoring] or [Blocked]" meaning "show items that are NOT Monitoring, and also show items that ARE Blocked"

Approach C sidesteps this entirely: `Status is none of Monitoring, Blocked` has no parsing ambiguity.

### 7.4 Operator Interaction with `contains` / `does_not_contain`

For text/free-text fields where we use `contains` and `does_not_contain`, multi-value is more complex:

- `Endpoint contains /api, /v1` -- does this mean "contains /api OR contains /v1"?
- `Endpoint contains all of /api, /v1` -- does this mean the endpoint string contains BOTH substrings?

In our attack data model, text fields (Endpoint, Hostname, Parameter) are single-value strings, so:
- `contains` with multiple values would mean "the string contains any of these substrings" (OR)
- `contains all of` would mean "the string contains all of these substrings" (AND) -- meaningful for substring matching

**How products handle this:**

| Product | Text field multi-value | Behavior |
|---------|----------------------|----------|
| **Sentry** | `message:*error* OR message:*timeout*` | Separate filters with explicit OR |
| **Datadog** | `message:(*error* OR *timeout*)` | Parenthetical OR in query |
| **Linear** | Content filter is single-value only | No multi-value for text search |

**Our recommendation**: For Phase 1, keep `contains` / `does_not_contain` as single-value operators. Multi-value substring search is a power-user feature that can be added later. This simplifies the operator matrix.

---

## 8. Accessibility Analysis

### 8.1 Screen Reader Announcement Patterns

Each approach produces different screen reader experiences:

**Approach A (Comma):**
```
Screen reader: "Status filter: Blocked, Monitoring. Button. Press Delete to remove."
```
Problem: The screen reader announces the comma-separated list but does not convey the logical relationship. A blind user hearing "Blocked, Monitoring" has the same ambiguity as a sighted user reading it.

**Approach B (Connector):**
```
Screen reader: "Status is not Monitoring or Blocked. Filter chip. Press Delete to remove."
```
Problem: The screen reader reads the full sentence, which includes the grammatical ambiguity of "is not X or Y." However, at least the logical connector is present in the announcement.

**Approach C (Operator):**
```
Screen reader: "Status is none of Blocked, Monitoring. Filter chip. Press Delete to remove."
```
Advantage: The operator "is none of" is read aloud and is unambiguous. The screen reader user gets the same semantic clarity as a sighted user.

### 8.2 ARIA Implementation Considerations

For all approaches, the chip should use:
- `role="option"` or `role="button"` with `aria-label` containing the full filter description
- `aria-live="polite"` on the filter bar container to announce when filters change
- `aria-describedby` linking to a description of the filter's effect (e.g., "Showing 15 results matching this filter")

The key difference is what goes into the `aria-label`:

| Approach | aria-label value | Clarity |
|----------|-----------------|---------|
| A | "Status: Blocked, Monitoring" | Ambiguous |
| A (enhanced) | "Status is one of Blocked or Monitoring" | Requires custom label generation beyond what is displayed |
| B | "Status is not Monitoring or Blocked" | Grammatically ambiguous |
| C | "Status is none of Blocked, Monitoring" | Unambiguous |

**Approach C wins on accessibility** because the visual display and the screen reader announcement are identical and both are unambiguous. For Approach A, making the screen reader experience accessible would require generating an aria-label that is *different* from the visual display, which violates the WCAG principle that visible labels should match accessible names (WCAG 2.5.3: Label in Name).

### 8.3 Keyboard Navigation

All three approaches have similar keyboard navigation patterns (Tab to chip, Enter/Space to edit, Delete to remove). The key differentiator is editing:

- **Approach A**: User Tabs into chip, Enters to open dropdown, selects/deselects values with Space, confirms with Enter or Escape.
- **Approach B**: Same as A, but user must also be able to identify and change the "or"/"and" connector within the chip. This requires an additional Tab stop or interaction point.
- **Approach C**: User Tabs into chip, can Tab to the operator text to change it (opens operator dropdown), or Tab to the value area (opens value dropdown). Two distinct editable zones.

Approach C has a slight advantage because the two interaction points (operator and values) are conceptually separate and have clear Tab-stop boundaries.

---

## 9. Product-by-Product Reference Matrix

| Product | Multi-Value Display | Operator Changes on Multi? | Intra-Chip Logic | Negation | Field-Type Awareness |
|---------|-------------------|--------------------------|-----------------|----------|---------------------|
| **Linear** | `is either of V1, V2` | Yes (`is` -> `is either of`) | Operator-driven (C) | `is not` / `includes neither` | Yes (enum vs set) |
| **Airtable** | `is any of V1, V2` | Yes (`is` -> `is any of`) | Operator-driven (C) | `is none of` | Yes (single-select vs multi-select) |
| **Sentry** | `key:[V1, V2]` | No (bracket notation) | Implicit comma (A) | `!key:[V1, V2]` | No (uniform syntax) |
| **GitHub** | `label:"V1","V2"` | No | Implicit comma (A) | `-label:V1` (no multi-NOT) | No |
| **Datadog** | Facet checkboxes / `key:(V1 OR V2)` | No | Implicit OR (A) | `-key:V1` per value | No |
| **Jira (JQL)** | `field in (V1, V2)` | Yes (`=` -> `in`) | Operator-driven (C) | `field not in (V1, V2)` | Yes |
| **Notion** | `contains V1` (single only in UI) | No multi-value in chip | N/A (one per chip) | `does not contain` | Yes (by property type) |
| **Kibana** | Filter pill with value list | No | Implicit OR (A) | Negate toggle on pill | No |
| **MUI DataGrid** | `is any of V1, V2` | Yes (`is` -> `is any of`) | Operator-driven (C) | `is not any of` | No |
| **PatternFly** | Chip group: `V1 x V2 x` | No | Implicit OR (A) (documented, not shown) | Remove chip | Documented in guidelines |
| **Productboard** | `is any of V1, V2` | Yes | Operator-driven (C) | `is none of` | Yes |
| **Algolia** | Refinement checkboxes | No | Implicit OR (A) | `exclude` toggle per facet | No |
| **Grafana** | Variable dropdown: `V1 + V2` | No | Implicit OR (A) | No built-in negation | No |
| **Vercel** | Separate pills per value | No | Separate pills (none) | No multi-value negation | No |

### Industry Count

- **Approach A (Implicit Comma/OR)**: 8 products (GitHub, Sentry, Datadog, Kibana, Algolia, Grafana, PatternFly, Vercel)
- **Approach C (Operator-Driven)**: 6 products (Linear, Airtable, Jira, MUI DataGrid, PatternFly guidelines, Productboard)
- **Approach B (Explicit Connector)**: 0 production products found

This count reveals a significant finding: **Approach B (our current spec) has no established production precedent.** Every production product uses either implicit comma/OR (Approach A) or operator-driven semantics (Approach C).

---

## 10. Pros/Cons Comparison Matrix

| Criterion | A: Implicit Comma | B: Explicit Connector | C: Operator-Driven |
|-----------|:-:|:-:|:-:|
| **Compactness** | +++ | + | ++ |
| **First-use readability** | ++ (if guessed right) | +++ (for positive) | ++ |
| **Readability at scale (5+ values)** | +++ | + | +++ |
| **Negation clarity** | + | - | +++ |
| **Disambiguation (no ambiguity)** | + | - (grammatical ambiguity) | +++ |
| **Inter-chip AND/OR compatibility** | +++ | - (visual collision) | +++ |
| **Industry precedent** | +++ | - (none found) | ++ |
| **Developer familiarity** | +++ | + | ++ |
| **Non-technical user friendliness** | + | ++ | +++ |
| **Screen reader accessibility** | + | ++ | +++ |
| **Field-type awareness** | - | - | +++ |
| **Extensibility (future AND support)** | - | ++ | +++ |
| **URL serialization simplicity** | +++ | ++ | ++ |
| **Implementation complexity** | + (simple) | ++ (moderate) | +++ (most complex) |

**Legend**: `+++` = excellent, `++` = good, `+` = adequate, `-` = problematic

### Weighted Scoring

Applying weights based on priority for a security operations dashboard (where clarity > compactness, and non-technical users are a key persona):

| Criterion | Weight | A Score | B Score | C Score |
|-----------|--------|---------|---------|---------|
| Disambiguation / no ambiguity | 5x | 5 | -5 | 15 |
| Negation clarity | 5x | 5 | -5 | 15 |
| Non-technical user friendliness | 4x | 4 | 8 | 12 |
| Screen reader accessibility | 4x | 4 | 8 | 12 |
| Inter-chip AND/OR compatibility | 4x | 12 | -4 | 12 |
| Readability at scale (5+ values) | 3x | 9 | 3 | 9 |
| Industry precedent | 3x | 9 | -3 | 6 |
| Field-type awareness | 3x | -3 | -3 | 9 |
| Extensibility | 2x | -2 | 4 | 6 |
| Compactness | 2x | 6 | 2 | 4 |
| Developer familiarity | 2x | 6 | 2 | 4 |
| First-use readability | 2x | 4 | 6 | 4 |
| URL serialization | 1x | 3 | 2 | 2 |
| Implementation complexity | 1x | 3 | 2 | 1 |
| **TOTAL** | | **65** | **17** | **111** |

---

## 11. Recommendation

### Primary Recommendation: Approach C (Operator-Driven Semantics)

**Adopt the operator-driven approach** modeled on Linear and Airtable, with the following specific operator vocabulary:

#### Operator Matrix for Our Product

**For single-value enum fields** (Status, Impact, HTTP Status Code, Blocking Status, Attack Type):

| Selection State | Positive Operator | Negative Operator |
|----------------|-------------------|-------------------|
| Single value | `is` | `is not` |
| Multiple values | `is any of` | `is none of` |

**For free-text fields** (Endpoint, Hostname, Parameter):

| Selection State | Positive Operator | Negative Operator |
|----------------|-------------------|-------------------|
| Single value | `contains` | `does not contain` |
| Multiple values | (Phase 2 -- not in initial release) | (Phase 2) |

**For multi-value set fields** (CWE, OWASP API, Countries, IPs -- if exposed as filterable):

| Selection State | Operator | Meaning |
|----------------|----------|---------|
| Match any | `includes any of` | Has at least one of the listed values |
| Match all | `includes all of` | Has every listed value |
| Match none | `includes none of` | Has none of the listed values |

#### Auto-Upgrade Behavior

Following Linear's pattern:
1. User adds a filter: `Status is Blocked`
2. User adds a second value from the same filter: operator auto-upgrades to `Status is any of Blocked, Monitoring`
3. User removes a value (back to one): operator auto-downgrades to `Status is Blocked`
4. User switches to negation: `Status is none of Blocked, Monitoring`

The auto-upgrade/downgrade is silent but the operator text always reflects the current state, so there is no hidden logic.

#### Chip Display Format

```
[Status] [is any of] [Blocked, Monitoring]
  ^field   ^operator    ^values (comma-separated)
```

- **Field**: Regular weight text, neutral color
- **Operator**: Regular weight text, neutral color (clickable to change)
- **Values**: Highlighted text (blue/accent color), each value individually removable
- **Hover**: Shows x button to remove individual values or the entire chip

#### Interaction with Between-Chip Connectors

```
[Status is any of Blocked, Monitoring]  AND  [Type is any of XSS, SQLi]
          ^intra-chip operator              ^inter-chip connector
```

The intra-chip operator ("is any of") and the inter-chip connector ("AND") are visually and semantically distinct. No confusion is possible.

### Why Not Approach A (Implicit Comma)?

Approach A scored well on compactness and developer familiarity, and it is a perfectly valid choice for developer-only tools. However, for a security operations dashboard:

1. **Our users include non-developers** (security analysts, compliance officers) who may not know the convention that comma = OR.
2. **Negation is a first-class operation** in security filtering ("show me everything that is NOT blocked"). Approach A handles negation poorly.
3. **We already have between-chip AND/OR connectors** in our design. Adding implicit OR within chips creates a two-tier logic system where one level is explicit and the other is implicit -- a consistency failure.
4. **We cannot add AND-within-chip later** if a need arises (e.g., for array fields like CWE/OWASP tags).

### Why Not Approach B (Explicit Connector)?

Despite Approach B's high readability for simple positive filters, it has critical flaws:

1. **No production precedent.** Zero products in our research use explicit "or" text between values within a single chip. This is a strong signal from the industry.
2. **Grammatical ambiguity with negation.** `Status is not Monitoring or Blocked` is genuinely ambiguous in English and will cause user errors.
3. **Visual collision with inter-chip connectors.** Having "or" within chips and "AND"/"OR" between chips creates a parsing nightmare.
4. **Poor scaling.** `Type is XSS or SQLi or BOLA or CSRF or XXE` is unwieldy.

### Impact on Current Spec

This recommendation requires the following changes to `attacks-SPEC.md`:

1. **Add operators**: `is any of` and `is none of` to the operator enum
2. **Auto-upgrade behavior**: Document that `is` auto-transitions to `is any of` on multi-select
3. **Chip format**: Change from `Field operator Value1 or Value2` to `Field operator Value1, Value2` where the operator carries the semantic weight
4. **Remove intra-chip "or" text**: Replace with comma-separated values after the operator

The between-chip AND/OR connectors, parenthetical grouping, and all other aspects of the filter bar remain unchanged.

### Dissent Acknowledgment

A reasonable counterargument exists: **Approach B is the most readable for first-time users encountering a simple positive filter.** `Status is Blocked or Monitoring` reads more naturally than `Status is any of Blocked, Monitoring`. This is true. The trade-off is that Approach B's readability advantage disappears (and reverses) for negation, scaling, and interaction with inter-chip connectors. Given that negation is heavily used in security filtering contexts, the trade-off favors Approach C.

A second counterargument: **our current spec already uses Approach B and changing it costs implementation time.** This is valid but the cost of changing operator labels is small compared to the cost of shipping an ambiguous interface that users misunderstand. Better to change now in the design phase than after users have learned the wrong mental model.

---

## 12. Sources

### Industry Research & Best Practices

- [Baymard Institute: Always Allow Users to Combine Multiple Filtering Values of the Same Type -- an 'OR' Logic](https://baymard.com/blog/allow-applying-of-multiple-filter-values) -- 45% of users combine multiple values; OR within field type is recommended
- [Baymard Institute: Display "Applied Filters" in an Overview](https://baymard.com/blog/how-to-design-applied-filters) -- 32% of sites lack proper applied filter display
- [Pencil & Paper: Filter UX Design Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering) -- Enterprise filtering patterns, filter anatomy (identifier, relative, value)
- [Nielsen Norman Group: Helpful Filter Categories and Values for Better UX](https://www.nngroup.com/articles/filter-categories-values/) -- Filter category design principles
- [Smashing Magazine: Designing Filters That Work (Vitaly Friedman)](https://www.smashingmagazine.com/2021/07/frustrating-design-patterns-broken-frozen-filters/) -- Broken filter patterns and fixes
- [LogRocket: Getting Filters Right -- UX/UI Design Patterns](https://blog.logrocket.com/ux-design/filtering-ux-ui-design-patterns-best-practices/) -- Boolean logic in filters
- [Tandem: The Mind-Bending Logic of User Interface Filtering](https://madeintandem.com/blog/mind-bending-logic-user-interface-filtering-tailor-product/) -- AND/OR cognitive challenges
- [BricxLabs: 15 Filter UI Patterns That Actually Work in 2025](https://bricxlabs.com/blogs/universal-search-and-filters-ui) -- Current filter UI trends

### Design System Documentation

- [PatternFly: Filters Design Guidelines](https://www.patternfly.org/patterns/filters/design-guidelines/) -- OR within attribute, AND between attributes; chip group pattern
- [Material Design 3: Chips Guidelines](https://m3.material.io/components/chips/guidelines) -- Filter chip component spec
- [MUI X DataGrid: Filtering (Multi-Filters)](https://mui.com/x/react-data-grid/filtering/) -- "is any of" operator
- [Helios (HashiCorp) Design System: Filter Patterns](https://helios.hashicorp.design/patterns/filter-patterns) -- Tag-based applied filter display
- [Saas UI: Filters Component](https://saas-ui.dev/docs/components/advanced-data/filters) -- React filter builder patterns

### Product-Specific Documentation

- [Linear: Filters Documentation](https://linear.app/docs/filters) -- "is either of" auto-upgrade, field-type-aware operators
- [Airtable Community: Single Select "Is Any Of" Filter](https://community.airtable.com/t5/base-design/single-select-field-not-giving-filter-options-for-quot-is-any/td-p/141026) -- "is any of" / "is none of" operators
- [Notion: Views, Filters, Sorts](https://www.notion.com/help/views-filters-and-sorts) -- Contains operator for multi-select properties
- [GitHub: Filtering Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/filtering-projects) -- Comma-separated multi-value OR
- [Sentry: Search Documentation](https://docs.sentry.io/concepts/search/) -- Bracket notation, OR equivalence
- [Datadog: Log Search Syntax](https://docs.datadoghq.com/logs/explorer/search_syntax/) -- Parenthetical OR, facet filtering
- [Kibana: KQL Documentation](https://www.elastic.co/docs/explore-analyze/query-filter/languages/kql) -- Boolean operators, terms filter
- [Grafana: Template Variables](https://grafana.com/docs/grafana/latest/dashboards/variables/add-template-variables/) -- Multi-value variable formatting
- [Productboard: Advanced Filters](https://support.productboard.com/hc/en-us/articles/24951273194259-Advanced-filters-on-New-boards) -- "is any of" / "is none of"

### Accessibility

- [The A11Y Collective: aria-selected Practical Examples](https://www.a11y-collective.com/blog/aria-selected/) -- Multi-selection ARIA patterns
- [Sara Soueidan: Accessible Notifications with ARIA Live Regions](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/) -- Live region announcement patterns
- [Telerik Design System: Chip Accessibility Support](https://www.telerik.com/design-system/docs/components/chip/accessibility/) -- WCAG 2.2 chip patterns
- [React Aria: Accessibility](https://react-spectrum.adobe.com/react-aria/accessibility.html) -- Selection accessibility primitives

### Cognitive Science

- [Sweller (1988): Cognitive Load During Problem Solving](https://doi.org/10.1016/0364-0213(88)90023-7) -- Cognitive Load Theory framework
- [De Morgan's Laws](https://en.wikipedia.org/wiki/De_Morgan%27s_laws) -- NOT(A OR B) = NOT A AND NOT B -- foundational for negation semantics

---

*This analysis was produced by the Principal Product Designer in consultation with UX research findings, interaction design principles, and cross-product competitive analysis. It is ready for team review per the collaboration rules (requires review by UX Researcher, Interaction Designer, and at least 1 Engineer).*
