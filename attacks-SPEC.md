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

Filters are stored as a boolean expression tree, where each node is either a filter condition or a group of conditions joined by AND/OR:

```typescript
// Individual filter condition
interface FilterCondition {
  field: string              // e.g., "status", "type", "hostname"
  operator: FilterOperator   // "is" | "is_not" | "contains" | "does_not_contain"
  values: string[]           // e.g., ["Monitoring", "Blocked"]
}

type FilterOperator = "is" | "is_not" | "contains" | "does_not_contain"

// Boolean expression node
interface FilterGroup {
  connector: "AND" | "OR"
  children: Array<FilterCondition | FilterGroup>
}

// Top-level filter state — a flat sequence of conditions/groups joined by connectors
interface FilterState {
  expression: FilterGroup    // Root expression (always AND at top level)
}
```

**Flat shorthand** (for simple cases without grouping):

```typescript
// Simple filters can still be represented as flat key-value pairs in URL params:
// ?status=Blocked,Monitored&type=XSS&hostname=orders.example.com
// This is equivalent to: (Status is Blocked,Monitored) AND (Type is XSS) AND (Hostname is orders.example.com)
```

**Important**: `http_status_code` values are stored as strings in the filter state (e.g., `["200", "401"]`) but compared against the numeric `response_code` field on each attack. The filtering logic converts filter strings to numbers before matching: `filters.http_status_code.map(code => parseInt(code))`.

### 1.3 AttackView (Saved View)

Views persist the entire UI state including filters, grouping, sort, column configuration, and chart selections:

```typescript
interface AttackView {
  id: string
  name: string
  description?: string
  isDefault: boolean
  filters: FilterState           // Boolean expression tree
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

> **Note**: The previous `matchMode: "all" | "any"` field is removed. Boolean logic is now expressed directly in the `FilterState` expression tree via AND/OR connectors between conditions and groups.

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

Always visible. Renders as a unified input surface containing:
- Active filter chips with inline operators (e.g., `Status is not Monitoring or Blocked`)
- Explicit AND/OR connector tokens between chips
- Parenthetical grouping tokens `( )` for boolean precedence
- Search placeholder (`Search {object} ...`) for adding new filters
- `×` clear-all button on the far right
- Clicking empty space opens the filter palette (see §3.2)

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

### 3.1 Filter Bar — Boolean Expression Model

The filter bar is a single unified input surface that renders active filters as **inline chips with explicit boolean connectors** (AND/OR) and **parenthetical grouping**. This is the core interaction model.

**Visual structure:**
```
( Status is not Monitoring or Blocked | OR | Type is BOLA, XSS ) AND Country is not Italy | Search {object} ...  [×]
  ^-- group start                       ^-- group connector      ^-- group end   ^-- top-level connector           ^-- placeholder      ^-- clear all
```

**Key principles:**
- **No `+Filter` button** — clicking empty space in the bar opens the filter palette
- **AND/OR are explicit tokens** between chips, not a global toggle
- **Parentheses `( )`** group conditions for boolean precedence
- **Top-level connector is always AND** by default
- **OR is only allowed within parenthetical groups** (see §3.6 Validation)
- The `×` button on the far right clears all filters

### 3.2 Filter Attribute Groups (Palette)

Clicking empty space in the filter bar opens a dropdown palette organized into groups:

**Recent** (shows full filter expressions with highlighted values):
- `Status is not Monitoring or Blocked` — One-click re-applies the expression
- `Type is BOLA, XSS` — One-click applies
- `Country is not Italy` — One-click applies

**Attack characteristics**:
- Attack type (values: XSS, SQL Injection, BOLA Attack, Scraper Bot, Brute Force, Path Traversal, Command Injection, CSRF, XXE, Rate Limit Bypass, LDAP Injection, SSTI, IDOR, HTTP Response Splitting, Logic Bypass, XML Bomb, Prototype Pollution, JWT Attack, GraphQL Abuse, Mass Assignment)
- Status (values: Blocked, Monitored, Started)
- Blocking status (values: Active blocking, Passive monitoring, Not configured)
- HTTP status code (values: 200, 401, 403, 404, 500)
- Impact (values: High, Medium, Low)

**Target & Context**:
- Endpoint (free text input)
- Hostname (free text input)
- Parameter (free text input)

> **Note**: Additional fields (IP Address, Country, CWE, OWASP API, Requests, Sessions, First Detected, Last Seen) may appear in the palette based on data context or user configuration. The fields above represent the primary palette shown in the Figma designs.

### 3.3 Filter Operators

Each filter chip has an **inline operator dropdown** (click the operator text to change):

| Operator | Label | Description |
|----------|-------|-------------|
| `is` | is | Exact match — value equals one of the selected values |
| `is_not` | is not | Negation — value does NOT equal any of the selected values |
| `contains` | contains | Substring match — value contains the text |
| `does_not_contain` | does not contain | Negated substring — value does NOT contain the text |

**Operator dropdown behavior:**
- Opens on click of the operator text within a chip
- Shows all 4 operators with a checkmark on the currently selected one
- Selecting a new operator immediately updates the chip (no Apply button needed)

### 3.4 Filter Chips

Active filters display as inline badges in the filter bar:

**Chip format:**
```
Field operator Value1 or Value2
```

**Examples:**
- `Status is not Monitoring or Blocked` — Status field, "is not" operator, multiple values joined with "or"
- `Type is BOLA, XSS` — Type field, "is" operator, multiple values comma-separated
- `Country is not Italy` — Country field, "is not" operator, single value

**Chip interactions:**
- **Click operator text** → Opens operator dropdown (is, is not, contains, does not contain)
- **Click value text** → Opens value selection dropdown for editing
- **Hover chip** → Shows `×` close button (overlaps adjacent badges)
- **Click `×`** → Removes the chip
- Values within a chip are highlighted in **blue** to distinguish from operator text

### 3.5 Value Selection

When adding a new filter or editing chip values, a dropdown appears:

**For enum fields** (Status, Type, Impact, HTTP status code, Blocking status):
```
┌──────────────────────────────┐
│ Monitoring                ☐  │
│ Blocked                   ☐  │
│ Started                   ☐  │
├──────────────────────────────┤
│ ⌘ ↵ to select multiple      │
└──────────────────────────────┘
```

- Checkboxes for multi-select
- `Cmd+Enter` to confirm multi-selection (keyboard hint shown at bottom)
- Selecting a value immediately creates/updates the chip

**For text fields** (Endpoint, Hostname, Parameter):
- Free-text input with autocomplete suggestions from existing data

### 3.6 Validation System

The filter bar includes **inline validation** with real-time feedback:

**OR constraint rule:**
- OR connectors are **only allowed within parenthetical groups** `( A OR B )`
- OR connectors at the **top level** (between ungrouped chips) are **not allowed**
- When an invalid OR is detected:
  1. The OR token turns **red**
  2. A **"Not allowed"** tooltip appears on hover
  3. An error panel appears below the bar:
     ```
     ⚠ Filter contain 1 issue:
       • "OR" operator cannot be used within the actuals query
     ```
  4. The filter bar border turns **red** to indicate invalid state

**Validation is non-blocking** — the error is shown but the UI remains interactive so users can fix it.

### 3.7 Boolean Groups (Parenthetical Grouping)

Users can create **boolean groups** by wrapping conditions in parentheses:

```
( Status is not Monitoring or Blocked  OR  Type is BOLA, XSS )  AND  Country is not Italy
└──────────────── OR group ────────────────────────────────────┘       └── top-level AND ──┘
```

**Rules:**
- Top-level connector between groups/conditions is always **AND**
- **OR** is only valid inside parenthetical groups
- Groups can contain 2+ conditions
- Nesting groups inside groups is not supported (single level of grouping)
- The opening `(` and closing `)` are rendered as subtle tokens in the bar

### 3.8 Filter Application Logic

Filters are applied by evaluating the boolean expression tree:

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
      case "is":
        return values.includes(String(attackValue))
      case "is_not":
        return !values.includes(String(attackValue))
      case "contains":
        return values.some(v => String(attackValue).includes(v))
      case "does_not_contain":
        return !values.some(v => String(attackValue).includes(v))
    }
  })
}
```

### 3.9 Cross-Component Filtering

Filters can be triggered from multiple places:
- **Filter bar**: Primary filtering interface (click empty space → palette)
- **Statistics charts**: Clicking a bar/legend item adds a filter chip
- **Table context menu**: Right-click a cell value → "Filter by value" (adds `is` chip) or "Exclude value" (adds `is not` chip)
- **Recent filters**: One-click preset filters in the palette dropdown
- **Command palette** (`Cmd+K`): Type filter commands

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
- The filter applied adds a chip: `HTTP status code is {code}`

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

1. **HTTP status code type mismatch**: The `response_code` field on `Attack` is a number, but filter state stores strings. Always convert with `parseInt()` when comparing.
2. **Random data assignment**: `response_code`, `endpoints`, `host`, and `parameter` values are randomly assigned at data generation time using `Math.random()`. This can cause hydration mismatches in SSR. The statistics card uses `suppressHydrationWarning` or deferred rendering where needed.
3. **Boolean expression evaluation**: Filters are evaluated as a boolean expression tree. Top-level connector is AND. OR is only valid within parenthetical groups. The expression tree is serialized to/from URL params.
4. **OR constraint**: OR connectors at the top level are invalid and trigger inline validation errors. The UI renders the OR token in red with a "Not allowed" tooltip and an error panel below the bar.
5. **Chart data recalculation**: All chart data is derived from `filteredAttacks` (post-filter), so charts update in real-time as filters are applied.
6. **Column state sync**: Column widths, order, frozen state, and visibility are synced between the table component and the parent page via props, and persisted in saved views.
7. **Filter chip close button**: The `×` on chips is only visible on hover and overlaps adjacent badges. This preserves horizontal space in the bar.
