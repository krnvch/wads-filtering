# Validation UX — Competitive Analysis

**Date**: 2026-03-05
**Author**: Principal UX Researcher
**Scope**: 10 developer tools analyzed for filter validation patterns

---

## 1. Research Methodology

Analyzed 10 developer tools and data platforms for their filter validation behavior across 6 dimensions: search-within-dropdown, validation timing, error surfaces, strict vs permissive, incomplete states, and structural validation.

**Products analyzed**: Datadog, Sentry, Grafana, Splunk, Linear, GitHub, Jira, Kibana/Elastic, Notion, AWS CloudWatch

---

## 2. Per-Product Findings

### 2.1 Datadog

**Surfaces**: Log Explorer facets, APM filters, Monitors, Metrics Explorer

#### A. Search-within-dropdown

- Facet values have a **search input** at the top of the value list. Users type to filter known values.
- Values are derived from indexed data — the list represents what actually exists, not a static enum.
- No-match behavior: empty list, no custom value creation offered.

#### B. Validation timing

- **On submit** for the query bar. Typing invalid syntax shows suggestions but doesn't block.
- Datadog identifies syntax errors and offers "fix suggestions" inline.
- For facet selection (checkbox dropdowns), invalid states are structurally impossible — you can only pick from data-derived values.

#### C. Error surfaces

- Inline error messages near the search bar for syntax issues.
- No documented per-pill/per-facet error states — the facet model prevents most errors.

#### D. Strict vs permissive

- Facet dropdowns: **strictly constrained** to known indexed values.
- Query bar text: **permissive** — any text accepted, validated on execute.
- This dual model (visual=strict, text=permissive) is a key pattern.

#### E. Incomplete/partial states

- Facet selection is immediate (checkbox toggle) — no "incomplete" state possible.
- Query bar: partial text stays in the bar, validated on submit.

#### F. Structural validation

- No documented detection of contradictory filters.
- Supports AND/OR with standard precedence.

---

### 2.2 Sentry

**Surfaces**: Issue search, Discover queries, SearchQueryBuilder component

#### A. Search-within-dropdown

- Search bar provides **token-based autocomplete**: field names, operators, and values.
- For tag values, autocomplete suggests known values from indexed events.
- The newer `SearchQueryBuilder` component uses a chip/token model similar to our system.

#### B. Validation timing

- **On submit/blur** for the search bar. Invalid tokens are flagged when the query is executed.
- Known issue: autocomplete for tag values can timeout on large datasets (GitHub #79418).
- The SearchQueryBuilder validates tokens on creation, not just on submit.

#### C. Error surfaces

- Inline error message below the search bar for invalid queries.
- Individual token error states in the SearchQueryBuilder (red styling on invalid tokens).
- Error messages include the specific invalid token/syntax.

#### D. Strict vs permissive

- Autocomplete suggests known values but **accepts custom text** (you can type values not in the suggestion list).
- Tag values from actual event data are suggested, but arbitrary values are allowed for exploration.

#### E. Incomplete/partial states

- Incomplete queries (missing value after operator) show error on submit.
- The SearchQueryBuilder prevents some incomplete states through constrained selection flow.

#### F. Structural validation

- Validates query syntax (matching parens, valid operators).
- No detection of logically contradictory filters.

---

### 2.3 Grafana

**Surfaces**: Loki query editor, Explore, Ad Hoc filters, Dashboard panels

#### A. Search-within-dropdown

- Ad hoc filters: **dropdown with search** for field names and values. Values are fetched from the data source.
- Loki query editor: **rich autocomplete** with context-aware suggestions.
- Enhanced ad hoc filters (2025) added full multi-value support with search within dropdowns.

#### B. Validation timing

- **Grafana has the most sophisticated real-time validation** among products studied.
- Loki query editor: **red squiggly underline** under invalid syntax, appearing as you type (like an IDE).
- Ad hoc filters: incomplete filters are **silently excluded** from the query — they exist in UI but don't affect results.
- Blog post (Grafana 9.4): "Query validation helps catch errors early and provides immediate feedback."

#### C. Error surfaces

- **Red squiggly underline** on invalid query syntax (Loki editor).
- Tooltip on hover over error showing explanation.
- Error banner below the panel when query execution fails.
- Ad hoc filters: no per-filter error indicators — incomplete filters are just skipped.

#### D. Strict vs permissive

- Ad hoc filter dropdowns: constrained to known label/value combinations from data source.
- Query bar: permissive text input with real-time validation feedback.

#### E. Incomplete/partial states

- **Ad hoc filters: silently exclude incomplete entries.** If a filter has a field but no value, it's simply not applied. No error, no warning — just ignored. This is the cleanest "graceful degradation" pattern found.
- Query editor: partial queries show validation errors but can still be submitted.

#### F. Structural validation

- Real-time syntax validation (parens, operators, pipeline structure).
- No detection of logically contradictory expressions.

---

### 2.4 Splunk

**Surfaces**: SPL search bar, Search Assistant, syntax highlighting

#### A. Search-within-dropdown

- Search Assistant provides a **sidebar with field suggestions** rather than inline dropdowns.
- Field discovery panel shows available fields with value previews.
- Not a traditional dropdown model — more like an IDE assistant.

#### B. Validation timing

- **Color-coded syntax highlighting as you type:**
  - **Orange**: Boolean operators, command modifiers, command arguments
  - **Blue**: Search commands
  - **Green**: Command arguments, search terms
  - **Purple**: Functions
  - **Red**: Invalid or unrecognized data types
  - **No color (black)**: Field names, field values
- This is informational highlighting, not blocking validation.
- Full validation occurs on submit.

#### C. Error surfaces

- Inline syntax coloring in the search bar (real-time visual feedback).
- Error messages after search execution for invalid queries.
- The color system is the primary pre-submit validation surface.

#### D. Strict vs permissive

- **Fully permissive** text input. Any SPL can be typed.
- Syntax highlighting provides guidance without blocking.
- Values are never constrained — SPL searches against raw data.

#### E. Incomplete/partial states

- Partial queries stay as text. Color coding may indicate issues.
- Search Assistant offers completions to help finish partial queries.

#### F. Structural validation

- SPL syntax must be valid for search to execute.
- Pipe-separated commands must be syntactically correct.
- No detection of semantically contradictory filters.

---

### 2.5 Linear

**Surfaces**: Issue filtering, Views, Filter bar

#### A. Search-within-dropdown

- Filter dropdowns include **search input** for filtering options.
- All values (status, label, assignee, etc.) come from project configuration — fully predefined.
- No-match behavior: empty dropdown, no custom value option.

#### B. Validation timing

- **Prevent-invalid model.** The step-by-step dropdown selection makes invalid states structurally impossible:
  1. Select filter type (field) from list
  2. Select operator from valid options for that field
  3. Select value(s) from predefined list
- No validation errors possible in the normal flow.

#### C. Error surfaces

- **No documented error states.** The prevention model means errors shouldn't occur.
- If a filter references a deleted label/status, behavior is undocumented.

#### D. Strict vs permissive

- **Strictly constrained.** All values come from predefined lists (statuses, labels, members).
- No custom/arbitrary value entry in the visual filter builder.

#### E. Incomplete/partial states

- **Discard on abandon.** Closing the dropdown without completing selection creates no filter.
- No partial/incomplete chip states documented.

#### F. Structural validation

- Supports AND/OR logic with visual filter groups.
- Advanced filters (Feb 2026) added nested filter groups.
- No documented validation of contradictory combinations.

---

### 2.6 GitHub

**Surfaces**: Issue/PR filtering, Project views, Code search

#### A. Search-within-dropdown

- Filter dropdown for issues: click a filter type (label, assignee, etc.) → see **searchable value list**.
- Search input filters the option list.
- For labels: shows color dots + label name; for assignees: avatar + name.
- GitHub also supports text-mode filtering with qualifier syntax (`is:issue label:bug`).

#### B. Validation timing

- **Real-time validation warnings during typing** for the text filter bar.
- Invalid qualifiers show a warning/suggestion.
- Dropdown selection: prevent-invalid model (can only pick from existing values).

#### C. Error surfaces

- Inline text near the search bar for filter warnings.
- Visual highlighting of invalid/unrecognized qualifiers.
- Dropdown mode: no errors possible (constrained selection).

#### D. Strict vs permissive

- Dropdowns: **strictly constrained** to existing labels, milestones, assignees.
- Text bar: accepts arbitrary qualifiers (validated on submit, warns on unrecognized).

#### E. Incomplete/partial states

- Dropdowns: **discard on abandon** — closing without selection creates no filter.
- Text bar: partial qualifiers stay as text, warned on submit.

#### F. Structural validation

- Supports multiple qualifiers (implicit AND).
- `-qualifier` for negation.
- No documented contradictory filter detection.

---

### 2.7 Jira

**Surfaces**: JQL editor, Basic search mode, Board filters

#### A. Search-within-dropdown

- **JQL mode**: Rich autocomplete suggesting fields, operators, values, and functions.
- **Basic mode**: Dropdown with **searchable value lists** for each field.
- JQL autocomplete is context-aware (knows which values are valid for the current field).

#### B. Validation timing

- **JQL validation on submit**: "Jira will not let you save an invalid JQL query." Errors include line/column references.
- **Real-time**: JQL REST API validates queries and returns parsing errors with structured details.
- Basic mode: prevent-invalid model — constrained dropdown selection.

#### C. Error surfaces

- JQL: Error message below the editor with specific syntax error description.
- Basic mode: no errors possible through normal flow.
- Board filters: broken JQL (e.g., referencing deleted components) shows error on the board level.

#### D. Strict vs permissive

- Basic mode: **strictly constrained** to available field values.
- JQL text: **permissive text input** with validation on submit.
- Some fields are restricted: WAS operator only works with specific fields (Status, Priority, etc.).

#### E. Incomplete/partial states

- JQL: Incomplete queries (e.g., `status =` ) caught by parser on submit.
- Basic mode: Empty fields are simply ignored (don't contribute to query).
- Empty filters: Jira warns when saving an empty filter.

#### F. Structural validation

- JQL: Full syntax validation (AND, OR, NOT, ORDER BY, parentheses).
- Field-specific operator restrictions (WAS only on certain fields).
- No detection of logically contradictory conditions.

---

### 2.8 Kibana / Elastic

**Surfaces**: KQL query bar, Filter bar (filter pills), Discover, Dashboards

#### A. Search-within-dropdown

- **KQL query bar**: Dynamic suggestions for fields, operators, and values as you type.
- **Filter editor**: Sequential dropdown selection (field → operator → value) with value autocomplete.
- Non-filterable field types (e.g., geo_point) are excluded from autocomplete.

#### B. Validation timing

- KQL: Validated on submit. Known issues where the bar shows "valid" but saving triggers errors.
- Filter pills: Validated when loaded/applied, not during construction.

#### C. Error surfaces

- **Kibana has the most sophisticated filter pill error/warning system:**
  - **Normal state**: Standard pill appearance.
  - **Warning state**: "If the filter's index pattern is not in the current app's list but does exist in Kibana — show warning." (Yellow/amber indicator.)
  - **Error state**: "If the filter's index pattern does not exist in Kibana — show error." (Red indicator.)
  - Implemented in GitHub issue #67177.
- Filter pill interactions:
  - Click to edit the filter.
  - Shift+click to disable/enable a filter (toggle). Disabled = visually grayed/strikethrough.
  - Error/warning flickering reported as bug during transitional states.

#### D. Strict vs permissive

- KQL: Permissive text with syntax validation.
- Filter pills: Semi-constrained. Field selection from known index fields, value input accepts free text.
- Known gap: Malformed KQL can be saved when validation doesn't fully catch issues.

#### E. Incomplete/partial states

- Filter pills created as complete entities (editor requires field + operator + value).
- **Filters can become invalid after creation** if referenced index/field is deleted.
- **"Keep and flag" approach**: Invalid filters persist but are visually marked (error/warning), allowing users to fix or remove.

#### F. Structural validation

- Supports enabling/disabling individual filters and negating filters.
- No detection of logically contradictory combinations.

---

### 2.9 Notion

**Surfaces**: Database views, Filter builder, Advanced filters

#### A. Search-within-dropdown

- Sequential selection: property → operator → value.
- Select/multi-select properties: values from predefined options list.
- Short option lists likely don't need search input.

#### B. Validation timing

- **Prevent-invalid model.** Each step constrained to valid options based on previous selection.
- API validates strictly (returns 400 for malformed filter objects).

#### C. Error surfaces

- No documented UI-level error states. Prevention model makes errors rare.
- API errors are developer-facing, not end-user-facing.

#### D. Strict vs permissive

- Select/multi-select: **strictly constrained** to property's option list.
- Text properties: accept any string.
- Date properties: constrained to valid dates/ranges.

#### E. Incomplete/partial states

- Not well-documented. Likely: incomplete filters are discarded on close or use defaults.
- Advanced filters support AND/OR with up to 3 levels of nesting.

#### F. Structural validation

- Supports AND/OR filter groups (up to 3 nesting levels).
- No documented contradictory filter detection.

---

### 2.10 AWS CloudWatch Logs Insights

**Surfaces**: Query editor, Filter command syntax

#### A. Search-within-dropdown

- Autocomplete suggests keywords, fields, metrics, and values.
- **No dropdown-based filter selection** — purely text-based query interface.

#### B. Validation timing

- **On submit/execute.** Errors like `MalformedQueryException` returned on run.
- Autocomplete during typing is guidance, not validation.

#### C. Error surfaces

- Error messages after query execution (API-level).
- No documented inline/real-time error highlighting.

#### D. Strict vs permissive

- **Fully permissive.** Any text accepted, validated at execution.

#### E. Incomplete/partial states

- N/A — text-based, no chip/pill concept.

#### F. Structural validation

- Commands separated by pipe. Standard Boolean operators.
- Syntax errors caught on execution.

---

## 3. Cross-Cutting Patterns

### 3.1 Universal Patterns (8+ of 10 products)


| Pattern                                         | Count | Products                                  |
| ----------------------------------------------- | ----- | ----------------------------------------- |
| Autocomplete/suggestions while typing           | 10/10 | All                                       |
| Enum fields constrained in visual/dropdown mode | 8/10  | All except Splunk, CloudWatch (text-only) |
| Text-mode allows arbitrary values               | 8/10  | All with text query bars                  |
| No detection of logically contradictory filters | 10/10 | All                                       |


### 3.2 Strong Patterns (6-7 of 10)


| Pattern                               | Count | Products                                                  |
| ------------------------------------- | ----- | --------------------------------------------------------- |
| Validation on submit for text queries | 7/10  | Sentry, Splunk, Jira, Kibana, CloudWatch, GitHub, Datadog |
| Search within value dropdown          | 6/10  | Datadog, GitHub, Jira, Kibana, Grafana, Linear            |
| Inline error messages near search bar | 6/10  | Sentry, Jira, GitHub, Kibana, Grafana, Splunk             |
| Prevent-invalid for visual builders   | 5/10  | Linear, Notion, GitHub, Jira (basic), Grafana (ad hoc)    |


### 3.3 Moderate Patterns (3-5 of 10)


| Pattern                                | Count | Products                                   |
| -------------------------------------- | ----- | ------------------------------------------ |
| Real-time validation (as you type)     | 4/10  | Grafana (Loki), Jira (JQL), Splunk, GitHub |
| Color-coded syntax in query bar        | 2/10  | Splunk, Grafana (Loki)                     |
| Per-pill error/warning visual states   | 1/10  | Kibana only                                |
| Disable/enable filter toggle           | 1/10  | Kibana only                                |
| Silent exclusion of incomplete filters | 1/10  | Grafana only                               |


---

## 4. Divergent Approaches

### 4.1 The "Two Interfaces" Split

The most significant industry pattern: products offer BOTH a visual filter builder (strict, prevent-invalid) AND a text query bar (permissive, validate-on-submit).


| Aspect             | Visual Builder                         | Text Query              |
| ------------------ | -------------------------------------- | ----------------------- |
| Validation timing  | At construction (prevent)              | On submit (flag)        |
| Value constraints  | Strict (known values only)             | Permissive (any text)   |
| Error model        | Errors impossible in normal flow       | Errors caught after     |
| Flexibility        | Lower                                  | Higher                  |
| Products           | Linear, Notion, GitHub dropdowns       | Splunk, CloudWatch, JQL |
| Products with both | Datadog, Sentry, Grafana, Jira, Kibana |                         |


**Our system is a visual chip builder → lean toward prevent-invalid.**

### 4.2 Unknown/Custom Values


| Approach                 | Products                    | Description                              |
| ------------------------ | --------------------------- | ---------------------------------------- |
| Strictly disallow        | Linear, Notion              | Only predefined values                   |
| Allow via text mode only | Sentry, GitHub, Jira        | Dropdown constrains; text bar allows any |
| Allow everywhere         | Datadog, Splunk, CloudWatch | Any value accepted                       |
| Allow with fallback      | Grafana, Kibana             | Dropdown shows known; custom via text    |


### 4.3 Incomplete Filter Handling


| Approach              | Products                            | Description                                 |
| --------------------- | ----------------------------------- | ------------------------------------------- |
| Discard on abandon    | Linear, GitHub, Notion              | Close without value = no filter             |
| Silently exclude      | Grafana                             | Incomplete filter exists but isn't applied  |
| Keep as error         | Kibana                              | Invalid filters kept with visual indicators |
| Treat as partial text | Sentry, Datadog, Splunk, CloudWatch | Incomplete query stays in bar               |


### 4.4 Error Visualization Spectrum


| Level                    | Products                      | Description                            |
| ------------------------ | ----------------------------- | -------------------------------------- |
| No visual error states   | Linear, Notion, CloudWatch    | Prevention model = no errors           |
| Text-only error messages | Sentry, GitHub, Jira, Datadog | Inline text near search bar            |
| Syntax highlighting      | Splunk, Grafana (Loki)        | Color-coded text, red for errors       |
| Per-pill error/warning   | Kibana                        | Distinct visual states on filter pills |


---

## 5. Key Recommendations for Our Product

### 5.1 Enum Value Selector: Add Search Input

- Industry standard (6/10 products do it). Essential for fields with 5+ options.
- **No-match behavior**: Show "No matching values" — empty but informational, not an error.
- **Never offer custom value creation for enum fields.** This aligns with Linear, Notion, GitHub.

### 5.2 Validation Timing: Prevent at Creation, Flag After

- Follow the "visual builder = prevent-invalid" pattern used by 5/10 products.
- Enum values: can only select from the list (structurally impossible to create invalid chip).
- Text values: accept any input (no validation at creation).
- After chip creation: validate via `validateTokens()` for structural issues.

### 5.3 Error Surfaces: Three Tiers

Inspired by Kibana (most sophisticated per-pill system found) but adapted for our chip model:

1. **Per-chip indicator**: Red ring + tooltip (current implementation is aligned with Kibana).
2. **Inline in value selector**: "No matching values" empty state for enum search.
3. **Global summary**: Alert banner (current implementation, keep it).

### 5.4 Incomplete Filters: Discard on Abandon

- Follow Linear/GitHub/Notion: closing without completing = no chip created.
- Never leave empty/incomplete chips in the filter bar.
- Exception: if values were selected, closing commits them (Grafana pattern).

### 5.5 Structural Validation: Keep Current

- No product detects contradictory filters — our current structural validation is already more sophisticated than most.
- Do NOT add duplicate filter detection or contradiction detection.

---

## 6. Evidence Quality


| Product    | Quality     | Key Sources                                           |
| ---------- | ----------- | ----------------------------------------------------- |
| Datadog    | Medium      | Official docs (facets, search syntax)                 |
| Sentry     | Medium-High | Official docs, GitHub issues (#75007, #79418)         |
| Grafana    | **High**    | Blog posts, GitHub issues, ad hoc filter docs         |
| Splunk     | Medium-High | Official docs (syntax highlighting, search assistant) |
| Linear     | Low         | Official docs, changelog                              |
| GitHub     | Medium      | Official docs (filtering issues/PRs)                  |
| Jira       | Medium-High | Official docs (JQL), Atlassian support articles       |
| Kibana     | **High**    | GitHub issues (#67177, #40736, #72601), PRs (#52751)  |
| Notion     | Low         | Help center, API docs                                 |
| CloudWatch | Medium      | AWS docs, Grafana integration docs                    |


### Confirmed vs Inferred

**Confirmed** (direct documentation/code):

- Splunk's red highlighting for invalid data types
- Kibana's three-state filter pill model (OK, warning, error)
- Grafana's red squiggly line validation for Loki queries
- Grafana ad hoc filters silently excluding incomplete entries
- Sentry's error-on-submit for invalid tokens
- Jira's refusal to save invalid JQL
- GitHub's real-time validation warnings

**Inferred** (likely but not directly confirmed):

- Linear's discard-on-abandon behavior
- Notion's sequential constraint model
- Most products' lack of contradictory filter detection

