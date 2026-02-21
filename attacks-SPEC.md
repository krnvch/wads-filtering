# Attacks Page - Product Specification

## Overview

The Attacks Page is a security operations dashboard for viewing, filtering, grouping, and analyzing attack data. It features a data table with rich column interactions, a multi-faceted filtering system, configurable statistics charts, saved views, an AI assistant panel, and drill-down attack detail views.

---

## 1. Data Model

### 1.1 Attack Entity

Each attack record contains the following fields:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g., `atk_01`) |
| `name` | `string` | Human-readable attack name (e.g., "XSS in query.filter") |
| `stamp` | `string` | Classification stamp (e.g., "stamp", "mitigation-control", "api-abuse") |
| `type` | `string` | Attack type (e.g., "XSS", "SQL Injection", "BOLA Attack", "Scraper Bot", "Brute Force", "Path Traversal", "Command Injection", "CSRF", "XXE", "Rate Limit Bypass", "LDAP Injection", "SSTI", "IDOR", "HTTP Response Splitting", "Logic Bypass", "XML Bomb", "Prototype Pollution", "JWT Attack", "GraphQL Abuse", "Mass Assignment") |
| `stats.requests` | `number` | Number of requests associated with the attack |
| `stats.sessions` | `number` | Number of sessions |
| `stats.users` | `number?` | Optional user count |
| `sources.ips` | `string[]` | Source IP addresses |
| `sources.sessions` | `number` | Source session count |
| `sources.countries` | `string[]` | Origin countries |
| `status` | `"Blocked" \| "Monitored" \| "Started"` | Current attack status |
| `response_code` | `200 \| 401 \| 404 \| 403 \| 500` | HTTP response code (randomly assigned from these values) |
| `impact` | `"High" \| "Medium" \| "Low"` | Impact severity |
| `timeline.last_seen` | `string` (ISO date) | Last time the attack was observed |
| `timeline.first_seen` | `string?` (ISO date) | First time the attack was detected |
| `security.cwe` | `string[]` | CWE identifiers (e.g., "CWE-79") |
| `security.api_owasp` | `string[]` | OWASP API classification (e.g., "API1:2021") |
| `endpoints` | `string` | Target endpoint (e.g., "POST /v1/api/orders/ORD-9005") |
| `host` | `string` | Target host (e.g., "orders.example.com") |
| `parameter` | `string` | Exploited parameter (e.g., "query.filter", "body.password") |

### 1.2 FilterState

Filters are represented as a **flat token sequence** for UI rendering, with a **derived expression tree** for evaluation:

```typescript
// === Field Types (4 types) ===
type FilterFieldType = "enum" | "text" | "date" | "numeric";

// === Operators (20+, organized by field type) ===
type FilterOperator =
  // Universal
  | "is" | "is_not" | "is_set" | "is_not_set"
  // Enum multi-value
  | "is_any_of" | "is_none_of"
  // Text
  | "contains" | "does_not_contain"
  | "starts_with" | "ends_with"
  // Numeric
  | "equals" | "not_equals"
  | "gt" | "gte" | "lt" | "lte" | "in_between"
  // Date
  | "before" | "after" | "on" | "not_on"
  | "in_the_last" | "not_in_the_last" | "between_dates";

// === Token types for flat UI rendering ===
type Token =
  | FilterChipToken      // field + operator + values
  | AndToken             // AND connector
  | OrToken              // OR connector
  | OpenParenToken       // ( — paired with CloseParen
  | CloseParenToken;     // ) — paired with OpenParen

interface FilterChipToken {
  type: "filter_chip";
  id: string;
  field: string;           // e.g., "status", "type", "hostname"
  fieldLabel: string;      // e.g., "Status", "Attack type"
  operator: FilterOperator;
  values: string[];        // e.g., ["Monitoring", "Blocked"]
  error?: TokenError;      // per-token validation error
}

interface AndToken { type: "and"; id: string; error?: TokenError; }
interface OrToken  { type: "or";  id: string; error?: TokenError; }
interface OpenParenToken  { type: "open_paren";  id: string; pairId: string; error?: TokenError; }
interface CloseParenToken { type: "close_paren"; id: string; pairId: string; error?: TokenError; }

// === Filter State ===
interface FilterState {
  tokens: Token[];     // Flat sequence (UI source of truth, serialized to URL)
  // Expression tree is DERIVED via tokensToExpressionTree() for engine evaluation
}

// === Expression tree (derived, used by filter engine) ===
interface FilterCondition {
  field: string;
  operator: FilterOperator;
  values: string[];
}

interface FilterGroup {
  connector: "AND" | "OR";
  children: Array<FilterCondition | FilterGroup>;
}
```

**Key architectural decisions:**
- **URL owns the token sequence** (single `q` param, `~` token separator — see §3.10)
- **Zustand store** owns ephemeral UI state (palette open/closed, pending field, recent filters, focused token)
- **Expression tree** is memoized from tokens via `tokensToExpressionTree()` for the filter engine
- The existing `evaluateExpression()` / `matchesCondition()` logic is preserved — the tree structure is unchanged

**Important**: `http_status_code` values are stored as strings in the filter state (e.g., `["200", "401"]`) but compared against the numeric `response_code` field on each attack. The filtering logic converts filter strings to numbers before matching: `filters.http_status_code.map(code => parseInt(code))`.

### 1.3 AttackView (Saved View)

Views persist the entire UI state including filters, grouping, sort, column configuration, and chart selections:

```typescript
interface AttackView {
  id: string
  name: string
  description?: string
  isDefault: boolean
  filters: FilterState           // Token sequence (see §1.2)
  groupBy: string
  timeWindow: string
  sort: Array<{ field: string; direction: "asc" | "desc" }>
  columns: string[]
  columnWidths: Record<string, number>
  columnOrder: string[]
  frozenColumns: string[]
  hiddenColumns: string[]
  chartSelections?: [string, string, string]
}
```

> **Note**: The previous `matchMode: "all" | "any"` field is removed. Boolean logic is now expressed via AND/OR connector tokens in the flat token sequence, and parenthetical grouping tokens for boolean precedence.

---

## 2. Page Layout

### 2.1 Header Area

The header area is split into two rows:

**Row 1 (top)**:
- **Left**: Page title showing "Attacks: {count}" with status breakdown (e.g., "Blocked: 15 Monitored: 10 Started: 3")
- **Right**: "Ask AI" button (with Bot icon) that opens the AI chat panel

**Row 2 (controls)**:
- **Left**: Views Manager (tab-like view selector + "+" button + "Save view" dropdown when unsaved changes exist)
- **Right** (in order):
  - **Group by** button (dropdown with grouping options)
  - **Date/Time** selector (live vs static time windows)
  - **Settings** gear button (column visibility/ordering)

### 2.2 Filter Bar

Always visible. Renders as a unified input surface with **flat token sequence** rendering:
- **Filter chip tokens** with inline operators (e.g., `Status is not any of Monitoring, Blocked`)
- **AND/OR connector tokens** between chips (clickable to toggle, removable)
- **Parenthetical grouping tokens** `( )` for boolean precedence (paired, removable)
- **Inline text input** — typing anywhere opens/filters the palette (no cursor-between-tokens)
- Search placeholder (`Search attacks ...`) when no input is active
- `×` clear-all button on the far right
- **Multi-line wrapping** when tokens overflow the bar width
- **Per-token error states** (red border + tooltip on invalid tokens)
- Clicking empty space or typing opens the filter palette (see §3.2)

### 2.3 Statistics Card

Collapsible card with header "Statistic" and a chevron toggle. When expanded, shows two rows of charts:

**Top row** (2 cells):
- Left cell (2/3 width): Thread activity line chart (default)
- Right cell (1/3 width): HTTP Status Codes doughnut chart (default)

**Bottom row** (3 equal cells):
- Cell 1: Top 5 Attack Types (default)
- Cell 2: Top 5 Hosts (default)
- Cell 3: Top 5 Sources (default)

Total expanded height: 432px (each row is half).

All cells have a "Change" dropdown to swap between any available chart type.

### 2.4 Attacks Table

Full-featured data table with horizontal scrolling, resizable columns, sortable headers, drag-to-reorder columns, right-click context menus, and row hover interactions.

### 2.5 Attack Detail Drawer

Right-side sheet (65% width by default, resizable between 30%-90%) that opens when clicking the expand icon on a table row. No overlay. Contains tabbed content (Overview, Timeline, Requests, Sessions, Security).

### 2.6 Attack Detail Full Page

Full page view at `/attacks/[id]` with breadcrumbs ("All attacks > Attack name"). Opens when clicking the attack name link in the table.

---

## 3. Filtering System

### 3.1 Filter Bar — Flat Token Rendering Model

The filter bar is a single unified input surface that renders active filters as a **flat token sequence** with inline boolean connectors and parenthetical grouping. Tokens wrap to multiple lines when they overflow.

**Visual structure:**
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ( Status is not any of Monitoring, Blocked  OR  Type is any of BOLA, XSS )  AND  Country is not │
│ Italy  AND  Endpoint contains /api                                    Search attacks ...    [×]  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
  ↑paren  ↑ filter chip token                     ↑connector ↑ filter chip          ↑connector
         token                                     token       token                  ↑ filter chip
```

**Token types rendered in sequence:**
1. **Filter chip tokens** — `Field operator Value1, Value2` (badge with blue-highlighted values)
2. **AND tokens** — small text badge between chips
3. **OR tokens** — small text badge between chips (only valid inside parens)
4. **Open paren `(` tokens** — subtle left boundary marker
5. **Close paren `)` tokens** — subtle right boundary marker

**Key principles:**
- **No `+Filter` button** — clicking empty space in the bar opens the filter palette
- **Typing anywhere** in the bar opens and fuzzy-filters the palette (no cursor-between-tokens)
- **Typing `(` or `)` inserts a parenthesis token** directly at the end of the token sequence
- **Typing "AND" or "OR"** shows the matching boolean operator in the palette suggestions — selecting it inserts the connector token
- **AND/OR are clickable tokens** — click to toggle AND↔OR (triggers grouping/ungrouping)
- **All tokens have hover `×`** — chips, connectors, and parens are all removable
- **Multi-line wrapping** — tokens flow with `flex-wrap` when the bar overflows
- **Per-token error states** — individual tokens can show red border + tooltip (see §3.6)
- **Top-level connector is always AND** by default
- **OR is only allowed within parenthetical groups** (see §3.6 Validation)
- The `×` button on the far right clears all filters
- New filter chips always append at the end of the token sequence

### 3.2 Filter Attribute Groups (Palette)

Clicking empty space in the filter bar (or typing any character) opens a Command-based dropdown palette. The palette supports fuzzy search — typing filters the visible fields in real-time.

**Recent** (top section, shows recently-used filter expressions with highlighted values):
- `Status is not any of Monitoring, Blocked` — One-click re-applies the expression
- `Type is any of BOLA, XSS` — One-click applies
- `Country is not Italy` — One-click applies
- Stored per-browser in `localStorage` (recommended: 10 recent filters)

**Attack characteristics** (enum fields):
- Attack type (values: XSS, SQL Injection, BOLA Attack, Scraper Bot, Brute Force, Path Traversal, Command Injection, CSRF, XXE, Rate Limit Bypass, LDAP Injection, SSTI, IDOR, HTTP Response Splitting, Logic Bypass, XML Bomb, Prototype Pollution, JWT Attack, GraphQL Abuse, Mass Assignment)
- Status (values: Blocked, Monitored, Started)
- Blocking status (values: Active blocking, Passive monitoring, Not configured)
- HTTP status code (values: 200, 401, 403, 404, 500)
- Impact (values: High, Medium, Low)

**Target & Context** (text fields):
- Endpoint (free text input)
- Hostname (free text input)
- Parameter (free text input)

**Temporal** (date fields):
- Last seen (date selector with presets + calendar)

**Boolean operators** (bottom section, separated by divider):
- `AND` — inserts AND connector token
- `OR` — inserts OR connector token (with `(` and `)` if needed)
- These items also appear in fuzzy search results when the user types "and" or "or" in the bar
- Keyboard hint: `⌘ ↵ to select multiple` shown in footer

**Parentheses** (special character handling):
- Typing `(` immediately inserts an `OpenParenToken` at the end of the token sequence
- Typing `)` immediately inserts a `CloseParenToken` at the end of the token sequence
- Parentheses do NOT appear in the palette — they are inserted directly via keyboard

> **Note**: Additional fields (IP Address, Country, CWE, OWASP API, Requests, Sessions, First Detected, Severity, Location, Network) may appear in the palette based on data context or user configuration. The fields above represent the primary palette shown in the Figma designs.

### 3.3 Filter Operators

Each filter chip has an **inline operator dropdown** (click the operator text to change). The operator encodes the logical relationship between values — this is the **operator-driven semantics** model (see `docs/research/multi-value-chip-ux-analysis.md` for the full rationale).

Operators are organized by field type, with progressive disclosure (show primary operators first, "More..." divider for advanced operators):

#### Enum field operators (Status, Impact, HTTP status code, Blocking status, Attack type)

| Operator | Label | Values | Description |
|----------|-------|--------|-------------|
| `is` | is | Single | Exact match — value equals the selected value |
| `is_not` | is not | Single | Negation — value does NOT equal the selected value |
| `is_any_of` | is any of | Multiple | OR match — value equals ANY of the selected values |
| `is_none_of` | is not any of | Multiple | NOR — value does NOT equal ANY of the selected values |
| `is_set` | is set | None | Field has a value (non-null) |
| `is_not_set` | is not set | None | Field has no value (null) |

#### Text field operators (Endpoint, Hostname, Parameter)

| Operator | Label | Values | Description |
|----------|-------|--------|-------------|
| `contains` | contains | Single | Substring match — value contains the text |
| `does_not_contain` | does not contain | Single | Negated substring — value does NOT contain the text |
| `starts_with` | starts with | Single | Prefix match |
| `ends_with` | ends with | Single | Suffix match |
| `is` | is | Single | Exact match |
| `is_not` | is not | Single | Exact non-match |
| `is_set` | is set | None | Field has a value |
| `is_not_set` | is not set | None | Field has no value |

#### Date field operators (Last seen, First detected)

| Operator | Label | Values | Description |
|----------|-------|--------|-------------|
| `before` | is before | Single date | Matches records before the specified date |
| `after` | is after | Single date | Matches records after the specified date |
| `on` | is on | Single date | Matches records on the specified date |
| `not_on` | is not on | Single date | Matches records not on the specified date |
| `in_the_last` | in the last | Duration | Matches records within the last N days/hours |
| `not_in_the_last` | not in the last | Duration | Matches records NOT within the last N days/hours |
| `between_dates` | is between | Date range | Matches records between two dates |
| `is_set` | is set | None | Field has a value |
| `is_not_set` | is not set | None | Field has no value |

#### Numeric field operators (Requests, Sessions)

| Operator | Label | Values | Description |
|----------|-------|--------|-------------|
| `equals` | equals | Single | Exact numeric match |
| `not_equals` | does not equal | Single | Not equal to |
| `gt` | greater than | Single | Strictly greater |
| `gte` | greater than or equal | Single | Greater or equal |
| `lt` | less than | Single | Strictly less |
| `lte` | less than or equal | Single | Less or equal |
| `in_between` | is between | Range | Between two values (inclusive) |
| `is_set` | is set | None | Field has a value |
| `is_not_set` | is not set | None | Field has no value |

#### Auto-upgrade behavior (Linear pattern)

The operator **automatically transitions** based on the number of selected values (enum fields only):

| Action | Before | After |
|--------|--------|-------|
| User adds 2nd value | `Status is Blocked` | `Status is any of Blocked, Monitoring` |
| User removes back to 1 value | `Status is any of Blocked, Monitoring` | `Status is Blocked` |
| User adds 2nd value (negated) | `Status is not Blocked` | `Status is not any of Blocked, Monitoring` |
| User removes back to 1 value (negated) | `Status is not any of Blocked, Monitoring` | `Status is not Blocked` |

The upgrade rules:
- `is` + 2nd value → `is_any_of`
- `is_not` + 2nd value → `is_none_of`
- `is_any_of` − value (back to 1) → `is`
- `is_none_of` − value (back to 1) → `is_not`

This is **silent** — the user does not manually select between `is` and `is_any_of`. The operator label always reflects the current state, so there is no hidden logic.

#### Operator dropdown behavior
- Opens on click of the operator text within a chip
- **Enum fields**: Shows `is` / `is not` / `is any of` / `is not any of` / `is set` / `is not set` with a checkmark on the current one
- **Text fields**: Shows `contains` / `does not contain` / `starts with` / `ends with` / `is` / `is not` / `is set` / `is not set`
- **Date fields**: Shows date-specific operators with presets
- **Numeric fields**: Shows comparison operators
- Progressive disclosure: primary operators shown first, advanced behind "More..." divider
- Selecting a new operator immediately updates the chip (no Apply button needed)
- If user manually selects `is any of` with only 1 value, it auto-downgrades to `is` on blur

### 3.4 Filter Chips (Token Interactions)

Active filters display as inline badge tokens in the filter bar. Each token type has distinct interaction states.

#### Filter Chip Token

**Chip format:**
```
Field  operator  Value1, Value2
  ^       ^         ^-- comma-separated values (highlighted in blue)
  |       |-- operator carries the semantic meaning (e.g., "is any of" = OR)
  |-- field name
```

**Examples:**
- `Status is any of Monitoring, Blocked` — Status field, "is any of" operator, multiple values (OR)
- `Status is not any of Monitoring, Blocked` — Status field, "is not any of" operator (excludes both)
- `Type is XSS` — Type field, "is" operator, single value
- `Country is not Italy` — Country field, "is not" operator, single value
- `Endpoint contains /api/v1` — Endpoint field, "contains" operator, text match
- `Last seen in the last 7d` — Date field, "in the last" operator, preset value
- `Requests greater than 100` — Numeric field, "gt" operator, number value

**Chip interaction states:**

| State | Visual | Behavior |
|-------|--------|----------|
| Default | `bg-secondary`, blue-highlighted values | Click operator → dropdown, click value → selector |
| Hover | + `×` button appears on right edge | Pointer cursor on clickable segments |
| Focused | 2px focus ring | Enter activates, Backspace/Delete removes |
| Error | `bg-destructive/10 border-destructive` | Same interactions, red styling, tooltip shows error |

#### AND/OR Connector Token

| State | Visual | Behavior |
|-------|--------|----------|
| Default | `text-muted-foreground text-xs` badge | Click toggles AND↔OR (triggers grouping/ungrouping) |
| Hover | + `×` button | Removing auto-adjusts: applies implicit AND |
| Error (e.g., top-level OR) | `text-destructive border-destructive` | Tooltip: "OR not allowed at top level" |

#### Parenthesis Token `(` / `)`

| State | Visual | Behavior |
|-------|--------|----------|
| Default | `text-muted-foreground text-sm` subtle character | Hover shows `×` |
| Hover | + `×` button | Removing removes BOTH paired parens |
| Error (unmatched) | `text-destructive` | Tooltip: "Missing matching parenthesis" |

**General chip interactions:**
- **Click operator text** → Opens operator dropdown (see §3.3 for available operators per field type)
- **Click value text** → Opens value selection dropdown for editing
- **Hover any token** → Shows `×` close button (overlaps adjacent badges)
- **Click `×`** → Removes the token (with cascade rules — see §3.7)
- Values within a chip are highlighted in **blue** to distinguish from operator text
- When values are added/removed, the operator auto-upgrades/downgrades (see §3.3)

### 3.5 Value Selection

When adding a new filter or editing chip values, a dropdown appears. The selector type depends on the field type:

**For enum fields** (Status, Type, Impact, HTTP status code, Blocking status):
```
┌──────────────────────────────┐
│ 🟢 Monitoring             ☐  │
│ 🔴 Blocked                ☐  │
│ 🟡 Started                ☐  │
├──────────────────────────────┤
│ ⌘ ↵ to select multiple      │
└──────────────────────────────┘
```

- Checkboxes for multi-select
- **Colored status dots** next to Status field values (green/red/yellow)
- `Cmd+Enter` to confirm multi-selection (keyboard hint shown at bottom of all selectors)
- Selecting a value immediately creates/updates the chip
- Search input for fields with many values (Attack type has 20+)

**For text fields** (Endpoint, Hostname, Parameter):
- Free-text input with autocomplete suggestions from existing data

**For date fields** (Last seen, First detected):
```
┌──────────────────────────────┐
│ Presets:                     │
│   Last 24 hours              │
│   Last 7 days                │
│   Last 14 days               │
│   Last 30 days               │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │      January 2026        │ │
│ │ Su Mo Tu We Th Fr Sa     │ │
│ │  ...calendar grid...     │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ ⌘ ↵ to confirm              │
└──────────────────────────────┘
```

- Single panel with presets at top + expandable calendar below (Datadog/Grafana pattern)
- No sub-menu navigation — presets and calendar coexist in one dropdown

**For numeric fields** (Requests, Sessions):
- Number input field
- For `in_between` operator: two inputs (min / max) with "to" separator

### 3.6 Validation System

The filter bar includes **per-token inline validation** with real-time feedback. Each token can independently carry an error state (red border + tooltip).

#### Structural Validation (Token Sequence)

| Rule | Error Code | Token(s) Highlighted |
|------|-----------|---------------------|
| Top-level OR | `TOP_LEVEL_OR` | OR token turns red |
| Balanced parentheses | `UNBALANCED_PAREN` | Orphan `(` or `)` turns red |
| No consecutive connectors | `CONSECUTIVE_CONNECTOR` | Second connector turns red |
| No leading connector | `LEADING_CONNECTOR` | First token turns red (if AND/OR) |
| No trailing connector | `TRAILING_CONNECTOR` | Last token turns red (if AND/OR) |
| No empty parentheses | `EMPTY_GROUP` | Both `(` and `)` turn red |
| Single-child group | `SINGLE_CHILD_GROUP` | Both `(` and `)` turn red |

#### Per-Token Validation

| Rule | Error Code | When |
|------|-----------|------|
| Unknown field | `UNKNOWN_FIELD` | Field key not in schema |
| Invalid operator for field type | `INVALID_OPERATOR` | Operator not in field type's allowed list |
| Empty values | `EMPTY_VALUES` | FilterChipToken with `values.length === 0` |

#### Error Display

When an invalid token is detected:
1. The token gets **red border** (`border-destructive`) and tinted background (`bg-destructive/10`)
2. A **tooltip** on hover explains the error
3. An error panel appears below the bar (for structural errors):
   ```
   ⚠ Filter contains 1 issue:
     • "OR" operator cannot be used at the top level
   ```
4. The filter bar border turns **red** to indicate invalid state

**Validation is non-blocking** — the error is shown but the UI remains interactive so users can fix it.

### 3.7 Boolean Groups & Token Removal Cascade

Users can create **boolean groups** by wrapping conditions in parentheses. Groups are represented as paired `(` / `)` tokens in the flat token sequence.

```
( Status is not any of Monitoring, Blocked  OR  Type is any of BOLA, XSS )  AND  Country is not Italy
└──────────────── OR group (paren tokens) ─────────────────────────────────┘      └── top-level AND ──┘
```

**Rules:**
- Top-level connector between groups/conditions is always **AND**
- **OR** is only valid inside parenthetical groups
- Groups can contain 2+ conditions
- Nesting groups inside groups is not supported (single level of grouping)
- The opening `(` and closing `)` are rendered as subtle paired tokens
- Clicking an AND token toggles it to OR (auto-wraps adjacent chips in parens)
- Clicking an OR token toggles it to AND (auto-removes surrounding parens)

#### Token Removal Cascade Rules

When a token is removed, adjacent tokens may also be removed or adjusted to maintain a valid sequence:

| Action | Side Effect |
|--------|-------------|
| Remove middle chip from `A AND B AND C` | Auto-remove one adjacent AND → `A AND C` |
| Remove AND between two chips | Two chips become implicitly AND-joined (visual AND removed) |
| Remove one chip from 2-chip OR group `( A OR B )` | Auto-ungroup remaining chip, remove parens + OR → just `A` |
| Remove `(` or `)` | Remove paired paren; contents remain, OR connectors become validation errors |
| Remove last chip in the bar | Token sequence becomes empty, placeholder shown |

### 3.8 Filter Application Logic

Filters are applied by converting the flat token sequence into a boolean expression tree, then evaluating it:

```typescript
// Step 1: Convert tokens to expression tree (memoized)
const expressionTree = tokensToExpressionTree(filterState.tokens);

// Step 2: Evaluate the expression tree against data
const filteredAttacks = evaluateExpression(attacks, expressionTree);
```

The expression tree evaluation logic:

```typescript
function evaluateExpression(attacks: Attack[], group: FilterGroup): Attack[] {
  if (group.connector === "AND") {
    // AND: intersect results of each child
    return group.children.reduce((result, child) => {
      if ('field' in child) {
        return applyCondition(result, child)
      }
      return evaluateExpression(result, child)
    }, attacks)
  } else {
    // OR: union results of each child
    const results = group.children.map(child => {
      if ('field' in child) {
        return applyCondition(attacks, child)
      }
      return evaluateExpression(attacks, child)
    })
    return [...new Set(results.flat())]
  }
}

function applyCondition(attacks: Attack[], condition: FilterCondition): Attack[] {
  const { field, operator, values } = condition
  return attacks.filter(attack => {
    const attackValue = getAttackFieldValue(attack, field)
    switch (operator) {
      // Enum operators
      case "is":
      case "is_any_of":
        return values.includes(String(attackValue))
      case "is_not":
      case "is_none_of":
        return !values.includes(String(attackValue))
      // Text operators
      case "contains":
        return values.some(v => String(attackValue).toLowerCase().includes(v.toLowerCase()))
      case "does_not_contain":
        return !values.some(v => String(attackValue).toLowerCase().includes(v.toLowerCase()))
      case "starts_with":
        return values.some(v => String(attackValue).startsWith(v))
      case "ends_with":
        return values.some(v => String(attackValue).endsWith(v))
      // Numeric operators
      case "equals":
        return values.some(v => Number(attackValue) === Number(v))
      case "not_equals":
        return !values.some(v => Number(attackValue) === Number(v))
      case "gt":
        return Number(attackValue) > Number(values[0])
      case "gte":
        return Number(attackValue) >= Number(values[0])
      case "lt":
        return Number(attackValue) < Number(values[0])
      case "lte":
        return Number(attackValue) <= Number(values[0])
      case "in_between":
        return Number(attackValue) >= Number(values[0]) && Number(attackValue) <= Number(values[1])
      // Date operators
      case "before":
        return new Date(String(attackValue)) < new Date(values[0])
      case "after":
        return new Date(String(attackValue)) > new Date(values[0])
      case "on":
        return isSameDay(new Date(String(attackValue)), new Date(values[0]))
      case "not_on":
        return !isSameDay(new Date(String(attackValue)), new Date(values[0]))
      case "in_the_last":
        return isWithinDuration(new Date(String(attackValue)), values[0])
      case "not_in_the_last":
        return !isWithinDuration(new Date(String(attackValue)), values[0])
      case "between_dates":
        return new Date(String(attackValue)) >= new Date(values[0]) && new Date(String(attackValue)) <= new Date(values[1])
      // Universal operators
      case "is_set":
        return attackValue != null && attackValue !== ""
      case "is_not_set":
        return attackValue == null || attackValue === ""
    }
  })
}
```

### 3.9 Cross-Component Filtering

Filters can be triggered from multiple places:
- **Filter bar**: Primary filtering interface (click empty space or start typing → palette)
- **Statistics charts**: Clicking a bar/legend item adds a filter chip token
- **Table context menu**: Right-click a cell value → "Filter by value" (adds `is` chip) or "Exclude value" (adds `is not` chip)
- **Recent filters**: One-click preset filters in the palette dropdown (stored in localStorage)
- **Command palette** (`Cmd+K`): Type filter commands

### 3.10 URL Serialization

Filter state is serialized to a single `q` URL parameter using `~` as token separator and `.` as field/operator separator:

```
?q=status.is_any_of.Blocked,Monitored~AND~(~type.is.XSS~OR~status.is.Blocked~)
```

**Format rules:**
- Token separator: `~`
- Field/operator/value separator: `.`
- Multiple values: `,` (comma-separated within a token)
- Parentheses: `(` and `)` as standalone tokens
- Connectors: `AND` and `OR` as standalone tokens
- Date values: ISO 8601 format
- Numeric values: plain numbers

**Backward compatibility**: The deserializer auto-detects the old format (field-name keys without `q` param) and falls back to legacy parsing. Old saved bookmarks continue to work.

### 3.11 Keyboard Model

#### Global Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| **F** | Not in input | Open filter palette |
| **Shift+F** | Not in input, filters exist | Clear all filters |
| **Escape** | Palette open | Close palette |

#### Within Filter Bar

| Key | Context | Action |
|-----|---------|--------|
| **ArrowLeft/Right** | Token focused | Navigate between tokens |
| **Backspace** | Token focused | Remove that token (with cascade) |
| **Delete** | Token focused | Remove that token (with cascade) |
| **Enter** | Chip focused | Open value editor |
| **Escape** | Token focused | Return to text input |
| **`(`** | Bar focused | Immediately insert `OpenParenToken` |
| **`)`** | Bar focused | Immediately insert `CloseParenToken` |
| **Any other character** | Bar focused | Start typing, opens/filters palette (including "AND"/"OR" as suggestions) |
| **Cmd+Enter** | Value selector open | Confirm multi-selection |

---

## 4. Group By

### 4.1 Standard Grouping Options

Dropdown options (all capitalized labels):
- **Type** (default)
- **Source**
- **Endpoint**
- **Smart sorting**

### 4.2 Custom Grouping

Separated by a divider at the bottom of the dropdown. When selected:

1. Opens a modal dialog (not a popover)
2. Contains a drag-and-drop zone at the top ("Add grouping attributes, up to 4")
3. Below it, a list of available attributes to drag from:
   - Session ID, Source IP, Request URI, Request Host, Attack type, Point
4. Dragging an attribute to the zone **removes** it from the available list (not disables)
5. Selected attributes show arrow symbols (→) between them to indicate ordering matters
6. "Apply" button commits the selection
7. When applied, the Group by button shows "Custom ({count})" (e.g., "Custom (3)")
8. Hovering the Group by button shows a tooltip with the full sequence (e.g., "Source IP → Request Host → Attack type")

---

## 5. Table Columns

### 5.1 Column Definitions

| Column ID | Label | Default Width | Notes |
|---|---|---|---|
| `name` | Attack Name | 650px | Always visible, not hideable. Contains clickable link + expand icon on hover |
| `requests` | Requests | 180px | Right-aligned numeric |
| `sessions` | Sessions | 180px | Right-aligned numeric |
| `sources` | Sources | 180px | Monospace IP display |
| `endpoints` | Endpoints | 300px | Monospace, truncated with tooltip |
| `host` | Hostname | 235px | Truncated with tooltip |
| `parameter` | Parameter | 235px | Truncated with tooltip |
| `country` | Country | 180px | Flag emoji + country name |
| `status` | Status | 180px | Colored dot + status text |
| `response_code` | HTTP status code | 212px | Gray chip/badge styling |
| `type` | Type | 180px | Hidden by default |
| `timeline` | First detected | 220px | ISO date formatted |
| `lastseen` | Last seen | 180px | ISO date formatted |
| `security` | Sec info | 180px | CWE/OWASP badges |

### 5.2 Attack Name Cell Behavior

- The attack name text (e.g., "XSS in query.filter") is styled as a **link** (underlined text)
- **Clicking the link** navigates to the full-page attack detail view (`/attacks/{id}`)
- **Clicking the expand icon** (visible on row hover) opens the attack detail **drawer**
- The drawer contains an "Expand" button to navigate to the full page

### 5.3 Column Interactions

- **Resize**: Drag the right border of any column header
- **Reorder**: Drag-and-drop column headers to rearrange
- **Sort**: Click column header to cycle asc/desc
- **Hide**: Via right-click header menu or settings gear dropdown
- **Freeze**: Via right-click header menu (pins column to the left)
- **Right-click context menu on cells**: Copy value, Filter by value, Exclude value

---

## 6. Statistics Charts

### 6.1 Available Chart Types

| ID | Label | Chart Type | Data Source |
|---|---|---|---|
| `attack-types` | Top 5 Attack Types | Horizontal bar | `attack.type` |
| `hosts` | Top 5 Hosts | Horizontal bar | `attack.host` |
| `countries` | Top 5 Countries | Horizontal bar | `attack.sources.countries` |
| `endpoints` | Top 5 Endpoints | Horizontal bar | `attack.endpoints` |
| `parameters` | Top 5 Parameters | Horizontal bar | `attack.parameter` |
| `sources` | Top 5 Sources | Horizontal bar | `attack.sources.ips` |
| `http-status-codes` | HTTP Status Codes | Doughnut | `attack.response_code` |
| `thread-activity` | Thread activity | Line | `attack.timeline.first_seen` (hourly buckets) |

### 6.2 Horizontal Bar Charts

- Show top 5 items sorted by count descending
- Each bar shows: colored background bar proportional to percentage, item name inside the bar, percentage on the right
- Hovering shows "Click to filter" tooltip
- Clicking a bar applies a filter for that attribute value

### 6.3 Doughnut Chart (HTTP Status Codes)

- Colors: Blue (#4F9EF8), Purple (#A78BFA), Orange (#FB923C), Yellow (#FBBF24), Green (#34D399)
- Layout: Doughnut on the left, legend on the right
- Doughnut shows percentage labels inside each segment
- Legend format: `{colored square} {code} ({count} - {percentage}%)`  e.g., `500 (11 - 18%)`
- **Clicking a legend item filters by that HTTP status code value** (NOT the count)
- The filter applied adds a chip: `HTTP status code is {code}` (single value uses `is`; if an HTTP status code chip already exists, adds the value and auto-upgrades to `is any of`)

### 6.4 Line Chart (Thread Activity)

- X-axis: 24 hours (00:00 to 23:00)
- Y-axis: Attack count per hour
- Data source: Groups attacks by hour of `timeline.first_seen`
- Blue line with dots, grid background
- Margins: `{ top: 10, right: 10, left: 10, bottom: 10 }` (minimal white space)

### 6.5 Chart Selection Persistence

- Bottom row selections are saved in the view as `chartSelections: [string, string, string]`
- Top row selections are component-local state: `[string, string]`
- Each cell can be changed to any chart type via "Change" dropdown
- All charts re-render when attack data changes (e.g., after filtering)

---

## 7. Views System

### 7.1 View Tabs

- Displayed as horizontal tab buttons with the current view highlighted (dark background)
- Each view tab shows its name and a "..." menu on hover
- The first/default view shows a Pin icon

### 7.2 View Menu Actions

- Set as default
- Duplicate (opens name dialog)
- Rename (opens name dialog)
- Copy link
- Delete

### 7.3 View Presets

"+" button opens a dropdown with:
- **All view** (blank view)
- **Blocked today** (time: now-1h, status: Blocked)
- **Monitoring** (status: Monitored)
- **Needs attention** (status: Monitored+Blocked, country: China, hidden columns: requests, sessions, sources)
- **Potential FP** (status: Blocked, security_info: CWE-79)

### 7.4 Save/Reset Workflow

When changes are detected (`hasUnsavedChanges: true`):
- "Save view" dropdown appears with: Update existing, Save as new, Reset changes
- "Reset changes" reverts all state (filters, columns, sort, charts) to the saved view configuration

### 7.5 State Persisted Per View

A saved view captures: filters (full boolean expression tree), groupBy, timeWindow, columnWidths, columnOrder, frozenColumns, hiddenColumns, sort, chartSelections.

---

## 8. Date/Time Selector

### 8.1 Live Options (with red pulsing dot)

- Live (1h), Live (8h), Live (1d), Live (7d) [default], Live (14d)

### 8.2 Static Options (with Calendar icon)

- Last 24h, Last week, Last 2 weeks, Last month

### 8.3 Other

- Custom range (placeholder)

---

## 9. Attack Detail Views

### 9.1 Drawer View

- Opens from the expand icon on table row hover
- Width: 65% of viewport (default), resizable from 30% to 90% by dragging the left edge
- No overlay (modal={false})
- Header: Attack name + stamp/type subtitle + "Expand" button
- Content: Tabbed interface (Overview, Timeline, Requests, Sessions, Security)
- Single close button (X)

### 9.2 Full Page View

- Route: `/attacks/[id]`
- Breadcrumbs above title: "All attacks > {Attack name}" (first part is clickable link back to `/`)
- No back button (only breadcrumbs for navigation)
- Same tabbed content as drawer

### 9.3 Overview Tab Content

Two-column layout (2/3 + 1/3):

**Left column**:
- Attack Details: Type, Status (colored badge), Impact (colored text), Requests, Sessions, Users
- Source Information: IP Addresses (monospace), Countries

**Right column**:
- Security Classifications: CWE Classifications (badges), OWASP API Security (badges)

---

## 10. AI Chat Panel

- Fixed panel on the right side (400px width)
- Opens via "Ask AI" button in the header
- Contains:
  - Header with Bot icon, "AI Assistant" title, and close button
  - Scrollable message area with user/assistant message bubbles
  - Quick suggestion chips above input: "filter attacks", "create custom grouping", "show potential FPs", "adjust the table view"
  - Text input + send button
- Currently simulated responses (no real AI backend)

---

## 11. Settings / Column Management

The gear icon opens a dropdown with:
- Search input to filter fields
- List of all columns (except "name") with:
  - Drag handle (GripVertical icon) for reordering
  - Column label
  - Toggle switch for visibility
- Hidden column count shown as a badge on the gear button
- "Type" column is hidden by default

---

## 12. Key Technical Notes

1. **Token model architecture**: The UI renders a flat `Token[]` sequence (see §1.2). The expression tree is **derived** via `tokensToExpressionTree()` for filter engine evaluation. The tree structure is not stored — it's computed on-demand (memoized). This decouples the visual representation from the evaluation logic.
2. **URL as source of truth**: Filter tokens are serialized to a single `q` URL parameter (see §3.10). Zustand store holds only ephemeral UI state (palette open/closed, pending field, recent filters, focused token). The expression tree is derived from URL state, never stored directly.
3. **HTTP status code type mismatch**: The `response_code` field on `Attack` is a number, but filter state stores strings. Always convert with `parseInt()` when comparing.
4. **Random data assignment**: `response_code`, `endpoints`, `host`, and `parameter` values are randomly assigned at data generation time using `Math.random()`. This can cause hydration mismatches in SSR. The statistics card uses `suppressHydrationWarning` or deferred rendering where needed.
5. **Boolean expression evaluation**: Filters are evaluated as a boolean expression tree derived from the token sequence. Top-level connector is AND. OR is only valid within parenthetical groups.
6. **OR constraint**: OR connectors at the top level are invalid and trigger per-token inline validation errors. The UI renders the OR token in red with a "Not allowed" tooltip and an error panel below the bar.
7. **Operator auto-upgrade**: When values are added/removed from a chip, the operator transitions automatically: `is` ↔ `is_any_of` and `is_not` ↔ `is_none_of`. The runtime filtering logic treats `is`/`is_any_of` identically and `is_not`/`is_none_of` identically — the distinction is purely for display clarity. The operator label always matches the current value count so users see exactly what logic is applied.
8. **Operator-driven semantics**: Intra-chip value relationships are communicated through the operator label (e.g., "is any of" = OR), not through explicit connectors between values. Values within a chip are always comma-separated. This eliminates the visual collision between intra-chip "or" and inter-chip OR connectors.
9. **Display label for `is_none_of`**: The internal operator key is `is_none_of` but the display label is **"is not any of"** (per Figma alignment). The key `is_none_of` is preserved for backward compatibility and URL serialization.
10. **Chart data recalculation**: All chart data is derived from `filteredAttacks` (post-filter), so charts update in real-time as filters are applied.
11. **Column state sync**: Column widths, order, frozen state, and visibility are synced between the table component and the parent page via props, and persisted in saved views.
12. **Filter token close button**: The `×` on all tokens (chips, connectors, parens) is only visible on hover and overlaps adjacent badges. This preserves horizontal space in the bar.
13. **Token removal cascade**: Removing a token triggers cascade rules (see §3.7) to maintain a valid sequence. Removing a chip auto-removes an adjacent connector. Removing a paren removes its pair. Removing the last chip in an OR group auto-ungroups.
14. **Backward-compatible URL migration**: The deserializer auto-detects old-format URLs (field-name keys without `q` param) and converts them to the new token format. Old bookmarks and saved views continue to work.
15. **4 field types, 20+ operators**: The operator registry maps each field type to its allowed operators. The `OperatorSelector` uses progressive disclosure — primary operators shown first, advanced behind "More..." divider to manage cognitive load.
