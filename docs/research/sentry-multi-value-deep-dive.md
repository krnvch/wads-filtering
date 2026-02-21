# Sentry Multi-Value Filter Chips: Deep Dive Analysis

**Date:** 2026-02-20
**Researcher Role:** Principal UX Researcher
**Subject:** How Sentry handles multi-value selections within a single filter token — logical relationships, visual display, negation semantics, and edge cases

---

## 1. Executive Summary

Sentry provides **two mechanisms** for expressing multi-value filters on a single field:

1. **Bracket (list) notation**: `key:[value1, value2]` — a syntactic sugar that compiles to `key:value1 OR key:value2`
2. **Explicit OR syntax**: `key:value1 OR key:value2` — available only in Discover, Insights, and Metric Alerts (NOT on the basic Issues page)

In both cases, **comma = implicit OR**. Multiple values for the same field always mean "match ANY of these values." Sentry never supports AND within a single field's multi-value selection — there is no scenario where selecting multiple values means "match ALL of these values simultaneously."

This is a critical finding for our implementation. Our spec already aligns with this: chip values joined by "or" (e.g., `Status is not Monitoring or Blocked`).

---

## 2. Multi-Value Syntax: Bracket Notation

### 2.1 Core Syntax

```
key:[value1, value2, value3]
```

**Documented equivalence** (from [Sentry Search Docs](https://docs.sentry.io/concepts/search/)):

> "You can search multiple values for the same key by putting the values in a list. For example, `x:[value1, value2]` will find the same results as `x:value1 OR x:value2`."

### 2.2 Real-World Examples

| Query | Equivalent | Behavior |
|-------|-----------|----------|
| `release:[12.0, 13.0]` | `release:12.0 OR release:13.0` | Events from release 12.0 **or** 13.0 |
| `http.status_code:[500, 502, 503]` | `http.status_code:500 OR http.status_code:502 OR http.status_code:503` | Events with any of these status codes |
| `assigned:[me, my_teams]` | `assigned:me OR assigned:my_teams` | Issues assigned to me **or** my teams |
| `browser.name:[Chrome, Firefox, Safari]` | `browser.name:Chrome OR browser.name:Firefox OR browser.name:Safari` | Events from any of these browsers |

### 2.3 Limitations of Bracket Notation

| Limitation | Details |
|-----------|---------|
| **Cannot use with `is` keyword** | `is:[unresolved, resolved]` is **invalid**. The `is` keyword is a special status filter that does not support list syntax. |
| **Cannot use wildcards inside brackets** | `release:[12.*, 13.*]` is **invalid**. Wildcards inside bracket notation are not supported (GitHub issue [#80597](https://github.com/getsentry/sentry/issues/80597)). Workaround: use explicit OR with parentheses: `(release:12.* OR release:13.*)` |
| **Silent failure** | When users attempt unsupported bracket syntax (e.g., with wildcards), the system returns **no data without error feedback**. The UI provides no indication that the syntax is invalid. |

---

## 3. How Multi-Value Tokens are Displayed Visually

### 3.1 The SearchQueryBuilder Token System

Sentry's new SearchQueryBuilder (released September 2024, replacing SmartSearchBar) displays each `key:value` pair as a **discrete visual token (pill)** within the search bar. Tokens have a structure of `[key] [operator] [value]`.

### 3.2 Multi-Value Token Display

Based on the implementation in PR [#71457](https://github.com/getsentry/sentry/pull/71457) (merged June 2024, "Evolved Issues Search: Add multi-select for filter values"):

**In tokenized (visual) mode:**
- A multi-value filter like `browser.name:[Chrome, Firefox]` renders as **a single token** in the search bar
- The token displays the field name, operator, and the comma-separated values within brackets
- The raw query text visible when editing or in plain-text mode shows the bracket notation: `browser.name:[Chrome, Firefox]`

**In plain-text mode:**
- The full text `browser.name:[Chrome, Firefox]` is shown directly
- Users can also type the equivalent OR syntax: `browser.name:Chrome OR browser.name:Firefox`

### 3.3 Multi-Select Interaction in the Value Dropdown

When clicking into a token's value area, a dropdown appears with:

- **Checkboxes** next to each available value
- **Clicking the row** selects the value and **exits the token** (single-select behavior)
- **Clicking the checkbox** selects the value and **keeps focus inside the token** (multi-select behavior)
- **Selected values shown at the top** of the dropdown for easy management
- **Backspace** unselects the previous value

This means Sentry offers two interaction paths:
1. **Quick single-select**: Click the row text -> value selected, dropdown closes
2. **Multi-select**: Click checkboxes -> accumulate values, stay in dropdown

### 3.4 Key Observation: No Explicit "or" Text in Sentry Tokens

Unlike our spec which prescribes `Field operator Value1 or Value2` with the word "or" between values, Sentry uses **bracket notation with commas** as the visual representation: `browser.name:[Chrome, Firefox]`. The "or" is implicit — conveyed by the comma-separated list inside brackets, not by an explicit "or" word.

**Our spec diverges from Sentry here** — we show `Status is not Monitoring or Blocked` with an explicit "or" between values, which is arguably more readable for non-technical users.

---

## 4. Operator Set and Multi-Value Interactions

### 4.1 Complete Operator Inventory

| Operator | Syntax | Multi-Value Support | Notes |
|----------|--------|-------------------|-------|
| **Exact match** | `key:value` | Yes, via `key:[v1, v2]` | Implicit OR between values |
| **Negation (exclusion)** | `!key:value` | Yes, via `!key:[v1, v2]` | Negation applied to the OR group |
| **Greater than** | `key:>value` | No | Numeric/duration/datetime only |
| **Less than** | `key:<value` | No | Numeric/duration/datetime only |
| **Greater or equal** | `key:>=value` | No | Numeric/duration/datetime only |
| **Less or equal** | `key:<=value` | No | Numeric/duration/datetime only |
| **Wildcard (glob)** | `key:*value*` | No (not in brackets) | Can use with explicit OR: `(key:*a* OR key:*b*)` |
| **Has (existence)** | `has:key` | N/A | Checks if tag exists, no value |
| **Has not** | `!has:key` | N/A | Checks if tag does not exist |
| **Contains** (API) | `Contains` | N/A | API-only operator |
| **Starts with** (API) | `StartsWith` | N/A | API-only operator |
| **Ends with** (API) | `EndsWith` | N/A | API-only operator |

### 4.2 How Multi-Value Interacts with Each Operator

**Exact match + multi-value:**
```
browser.name:[Chrome, Firefox]
→ Returns events where browser is Chrome OR browser is Firefox
→ SQL equivalent: WHERE browser_name IN ('Chrome', 'Firefox')
```

**Negation + multi-value:**
```
!browser.name:[Chrome, Firefox]
→ Returns events where browser is NOT Chrome AND NOT Firefox
→ SQL equivalent: WHERE browser_name NOT IN ('Chrome', 'Firefox')
```

**Comparison operators: multi-value NOT supported.** You cannot write `count():>[100, 200]`. For range queries, you must use two separate tokens: `count():>100 count():<500`.

---

## 5. Negation with Multi-Values: Critical Semantics

### 5.1 The Core Question

When a user writes `!level:[error, fatal]`, does it mean:
- **(A)** `NOT error AND NOT fatal` — exclude events that are error AND exclude events that are fatal
- **(B)** `NOT (error OR fatal)` — exclude events that are either error or fatal

### 5.2 The Answer: They Are Logically Equivalent (De Morgan's Law)

By De Morgan's Law, these two interpretations are **logically identical**:

```
NOT (error OR fatal) ≡ (NOT error) AND (NOT fatal)
```

So it does not matter which way we frame it — the result set is the same. An event is excluded if it matches **any** of the negated values.

### 5.3 How Sentry Implements It

Since `key:[v1, v2]` is equivalent to `key:v1 OR key:v2`, and negation applies to the whole expression:

```
!key:[v1, v2]
→ !(key:v1 OR key:v2)
→ !key:v1 AND !key:v2       (by De Morgan's Law)
→ SQL: WHERE key NOT IN (v1, v2)
```

**Practical example:**
```
!level:[error, fatal]
→ Excludes events where level is "error" AND excludes events where level is "fatal"
→ Only returns events with level: debug, info, or warning
→ SQL: WHERE level NOT IN ('error', 'fatal')
```

This is the intuitive, expected behavior. A user who says "I don't want to see errors or fatal events" gets exactly what they expect.

### 5.4 Verification via Explicit OR Equivalence

The documentation states `key:[v1, v2]` produces "the same results as" `key:v1 OR key:v2`. Therefore:

```
!key:[v1, v2] → same results as → !(key:v1 OR key:v2)
```

Which by De Morgan's is `!key:v1 AND !key:v2`.

This is consistent with SQL `NOT IN` semantics, which is what Sentry's Snuba/ClickHouse backend uses.

### 5.5 Relevance to Our Implementation

Our spec uses `is_not` operator with multiple values. Example: `Status is not Monitoring or Blocked`. This means:

```
Status is_not [Monitoring, Blocked]
→ Exclude attacks where status is Monitoring
→ AND exclude attacks where status is Blocked
→ Only show attacks with status: Started (or other statuses)
```

This aligns perfectly with Sentry's behavior and SQL `NOT IN` semantics.

---

## 6. Edge Cases and Gotchas

### 6.1 The `is` Keyword Cannot Use Bracket Notation

The `is` keyword is special in Sentry. It represents issue status (`is:unresolved`, `is:resolved`, `is:archived`, etc.) and **does not support list syntax**:

```
✗ INVALID:  is:[unresolved, resolved]
✓ VALID:    is:unresolved
✓ VALID:    !is:resolved
```

**Workaround:** On surfaces that support OR (Discover, Insights), users can write `is:unresolved OR is:resolved`. On the basic Issues page (no OR support), users must use tab-based quick filters or separate queries.

**UX implication:** This is a confusing inconsistency. Users who learn the bracket syntax naturally try it with `is` and hit a wall. No error message explains why.

### 6.2 Wildcards Cannot Be Used in Brackets

```
✗ INVALID:  release:[12.*, 13.*]     → Silent failure, returns no results
✓ VALID:    (release:12.* OR release:13.*)   → Explicit OR with wildcards
```

**UX implication:** This is a significant usability gap. The UI gives no indication the syntax is invalid — it silently returns empty results. GitHub issue [#80597](https://github.com/getsentry/sentry/issues/80597) documents this confusion.

### 6.3 Boolean OR Is Not Available Everywhere

| Surface | OR Support | Bracket Support |
|---------|-----------|----------------|
| Issues page (basic) | **No** | **Yes** |
| Discover | Yes | Yes |
| Insights | Yes | Yes |
| Metric Alerts | Yes | Yes |
| Dashboards (widgets) | Yes | Yes |
| Traces | Yes | Yes |
| Replays | Limited | Yes |

On the basic Issues page, the only way to express multi-value queries is through bracket notation. This means `is:[unresolved, resolved]` is impossible to express on the Issues page since `is` doesn't support brackets and OR is not available.

### 6.4 AND Precedence Over OR

When mixing AND and OR in Discover:
```
browser.name:Chrome AND os.name:Windows OR os.name:Linux
→ Evaluates as: (browser.name:Chrome AND os.name:Windows) OR os.name:Linux
→ NOT as: browser.name:Chrome AND (os.name:Windows OR os.name:Linux)
```

Users must use explicit parentheses for the intended grouping:
```
browser.name:Chrome AND (os.name:Windows OR os.name:Linux)
```

### 6.5 OR Cannot Mix Aggregate and Non-Aggregate Filters

```
✗ INVALID:  user.username:janedoe OR count():>100
✓ VALID:    user.username:janedoe OR user.username:johndoe
✓ VALID:    count():>100 OR count_unique(user):>50
```

### 6.6 Negation Operator Inconsistencies

Historical GitHub issues document cases where the `!` negation operator does not work consistently:
- [Issue #41636](https://github.com/getsentry/sentry/issues/41636): Negation operator not working for message search on the Issues page
- [Forum thread](https://forum.sentry.io/t/negations-in-search/5578): Community discussion about negation edge cases

These are implementation bugs, not intentional design decisions, but they highlight the complexity of negation in search systems.

---

## 7. Comparison: Sentry vs. Our Spec

| Aspect | Sentry | Our Spec (attacks-SPEC.md) |
|--------|--------|---------------------------|
| **Multi-value syntax** | `key:[v1, v2]` (bracket notation) | Inline chip: `Field operator V1 or V2` |
| **Visual separator** | Comma inside brackets | Explicit "or" word |
| **Implicit logic** | Comma = OR | "or" = OR |
| **Negation + multi** | `!key:[v1, v2]` = NOT IN | `is_not` operator with multiple values = NOT IN |
| **AND within field** | Never supported | Never supported |
| **Token display** | Raw syntax as token text | Human-readable chip with blue-highlighted values |
| **Multi-select UX** | Checkbox click in dropdown | Checkbox + `Cmd+Enter` to confirm |
| **Operator editing** | Type syntax or change in dropdown | Click operator text in chip to change |
| **Visual readability** | Developer-oriented (syntax-heavy) | User-oriented (natural language) |

---

## 8. UX Assessment: Pros and Cons of Sentry's Approach

### 8.1 Strengths

**1. Consistency with query language.**
The bracket notation is a natural extension of the `key:value` syntax. Developers who learn `browser:Chrome` intuitively grasp `browser:[Chrome, Firefox]`. The mental model is simple: brackets = list = OR.

**2. Compact representation.**
`http.status_code:[500, 502, 503]` is shorter than `http.status_code:500 OR http.status_code:502 OR http.status_code:503`. This matters in a search bar with limited horizontal space.

**3. Composable with negation.**
`!http.status_code:[500, 502, 503]` is clear and compact. The negation prefix applies to the whole list, matching SQL `NOT IN` semantics that developers already know.

**4. Multi-select dropdown is well-designed.**
The dual interaction model (click row = single-select-and-exit, click checkbox = multi-select-and-stay) elegantly serves both quick single-filter and deliberate multi-filter workflows. Selected values floating to the top of the dropdown is a nice touch.

**5. URL-encodable.**
The bracket syntax serializes cleanly to URL query parameters, supporting Sentry's URL-as-source-of-truth model.

### 8.2 Weaknesses

**1. Syntax is not human-readable.**
`!browser.name:[Chrome, Firefox]` is clear to developers but opaque to non-technical users. "What does the `!` mean? What do the brackets mean?" A security analyst using our product might not be a developer.

**2. Silent failures are dangerous.**
When users write invalid bracket syntax (e.g., wildcards inside brackets, `is` with brackets), the system silently returns empty results. This is a serious usability failure — users think their data is missing, not that their query is wrong.

**3. The `is` keyword exception is confusing.**
Most fields support bracket notation, but `is` does not. This inconsistency violates the "consistency" principle that makes the rest of the syntax learnable. Users who master the pattern hit an unexpected wall.

**4. No explicit "or" text.**
The comma inside brackets implies OR, but this is a learned convention. Our spec's explicit "or" text (`Status is not Monitoring or Blocked`) is more self-documenting, at the cost of taking more horizontal space.

**5. Boolean OR availability is inconsistent.**
OR being available in Discover but not on the basic Issues page creates a confusing split. Users who learn OR in Discover try to use it on the Issues page and fail. The bracket notation partially compensates (it works everywhere), but the `is` keyword limitation means some OR-like queries are literally impossible on the Issues page.

**6. Negation semantics not documented.**
While `!key:[v1, v2]` intuitively follows De Morgan's Law (= NOT IN), Sentry's documentation never explicitly states this. Users must infer the behavior. Our spec should document this clearly.

### 8.3 Recommendations for Our Implementation

Based on this analysis:

1. **Keep our explicit "or" text in chips.** It is more readable than Sentry's bracket-comma notation, especially for non-developer users in security operations. The trade-off (more horizontal space) is worth it.

2. **Document negation semantics explicitly.** When `is_not` is used with multiple values, clearly state in our docs/tooltips: "Excludes items matching ANY of these values" (equivalent to SQL `NOT IN`).

3. **Never silently fail.** If a user creates an invalid filter combination, show an inline error immediately. Sentry's silent empty results are a cautionary tale.

4. **Ensure all operators work uniformly with multi-value.** Unlike Sentry's `is` keyword exception, our four operators (`is`, `is_not`, `contains`, `does_not_contain`) should all support multi-value selection consistently.

5. **Maintain the `Cmd+Enter` multi-select pattern.** Our spec's approach (checkbox + `Cmd+Enter` to confirm) is a reasonable design choice. Sentry's dual interaction (click row vs. click checkbox) is clever but may confuse users about when the dropdown closes.

6. **Consider URL serialization.** When serializing multi-value to URLs, consider using comma-separated values within the parameter (similar to Sentry's compact bracket notation) rather than repeating the field name, to keep URLs manageable.

---

## 9. Summary of Key Findings

| Question | Answer |
|----------|--------|
| Does `key:[v1, v2]` mean OR? | **Yes.** Comma = implicit OR. Documented equivalence: `key:[v1, v2]` = `key:v1 OR key:v2`. |
| Does Sentry show "or" explicitly in chips? | **No.** Sentry shows bracket notation with commas: `browser:[Chrome, Firefox]`. The "or" is implicit. |
| What operators does Sentry support? | Exact match (`:`, `!:`), comparison (`>`, `<`, `>=`, `<=`), wildcard (`*`), existence (`has`, `!has`), and API-specific (`Contains`, `StartsWith`, `EndsWith` + negations). |
| Does Sentry support AND within a single field chip? | **No.** Multi-value within a field is always OR. There is no mechanism for "browser is Chrome AND Firefox" (which would be logically impossible for single-value fields anyway). |
| How does `!key:[v1, v2]` work? | Equivalent to `NOT IN (v1, v2)` = `!key:v1 AND !key:v2`. Excludes items matching ANY listed value. This follows De Morgan's Law and is the intuitive expected behavior. |
| Is comma the only way to express multi-value? | On the Issues page (no OR support): **yes**, bracket notation is the only way. On Discover/Insights: can also use explicit `OR` syntax. |

---

## Sources

- [Sentry Search Documentation](https://docs.sentry.io/concepts/search/) — Official syntax reference, bracket notation documentation
- [Sentry Searchable Properties: Issues](https://docs.sentry.io/concepts/search/searchable-properties/issues/) — `assigned`, `is`, `level` field documentation
- [Sentry Searchable Properties: Events](https://docs.sentry.io/concepts/search/searchable-properties/events/) — Event-level properties
- [Sentry Query Builder (Discover)](https://docs.sentry.io/product/discover-queries/query-builder/) — OR syntax, aggregate filters
- [GitHub Issue #80597: Allow wildcards in multi-value match](https://github.com/getsentry/sentry/issues/80597) — Wildcard limitation in bracket notation
- [GitHub Issue #69791: Add multi-select for filter values](https://github.com/getsentry/sentry/issues/69791) — Multi-select UX implementation
- [GitHub PR #71457: Multi-select implementation](https://github.com/getsentry/sentry/pull/71457) — Checkbox interaction details
- [GitHub Issue #75007: SearchQueryBuilder replaces SmartSearchBar](https://github.com/getsentry/sentry/issues/75007) — Component migration
- [Sentry Improved Search UI Changelog](https://sentry.io/changelog/improved-search-ui/) — SearchQueryBuilder announcement
- [GitHub Issue #41636: Negation not working for message search](https://github.com/getsentry/sentry/issues/41636) — Negation inconsistencies
- [Sentry Forum: Negations in search](https://forum.sentry.io/t/negations-in-search/5578) — Community discussion on negation edge cases
- [Sentry Forum: Subtract filter or multiple filter](https://forum.sentry.io/t/substract-filter-or-multiple-filter/844) — Community discussion on multi-value filtering
