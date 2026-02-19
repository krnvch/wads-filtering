# Discovery Phase: Complex Filtering System — Research Findings & Architecture

**Date**: 2026-02-19
**Phase**: Discovery (Phase 1)
**Status**: Complete — Ready for Definition Phase
**Participants**: Full team (PM, UX Researcher, Product Designer, Interaction Designer, Frontend Engineers, Backend Engineers, QA)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Research Sources & Methodology](#2-research-sources--methodology)
3. [Cross-Product Pattern Synthesis](#3-cross-product-pattern-synthesis)
4. [Key Design Decisions](#4-key-design-decisions)
5. [Proposed Architecture: The Filtering System](#5-proposed-architecture-the-filtering-system)
6. [Interaction Model](#6-interaction-model)
7. [Accessibility Specification](#7-accessibility-specification)
8. [Technical Architecture](#8-technical-architecture)
9. [Agent Team Review & Debate](#9-agent-team-review--debate)
10. [Prioritized Feature Map](#10-prioritized-feature-map)
11. [Open Questions & Risks](#11-open-questions--risks)
12. [Appendix: Research Documents](#12-appendix-research-documents)

---

## 1. Executive Summary

This document synthesizes research across **4 primary reference products** (Vercel, Linear, GitHub, Sentry), **10+ secondary products** (Datadog, Grafana, Kibana, Splunk, Jira, Notion, Airtable, Algolia, Stripe, Cloudflare, etc.), and extensive UX/accessibility research to define the architecture for a complex filtering system that serves both technical and non-technical users.

### The Core Insight

The best filtering systems in the industry share a single architectural pattern: **a unified input surface that progressively reveals complexity**, with the URL as the single source of truth. They do NOT have separate "basic" and "advanced" modes — they have a single experience that gracefully scales from one-click presets to full boolean query expressions.

### Our Approach: "Progressive Power"

We will build a filtering system with **five layers of progressive disclosure**, where each layer is accessible without abandoning the previous:

| Layer | Name | User Action | Example |
|-------|------|-------------|---------|
| 0 | Smart Defaults | None — auto-applied | Show "Blocked" attacks by default |
| 1 | Quick Filters | Single click | Status toggle buttons, time presets |
| 2 | Standard Filters | Dropdown selection | Multi-select combobox for Type, Country, etc. |
| 3 | Advanced Filters | Query syntax + builder | `type:XSS AND status:Blocked AND country:"United States"` |
| 4 | Saved Views | Name + save | "My Triage View" with full filter + sort + column state |

### Design Principles (from research synthesis)

1. **One bar, many inputs** — The filter bar is the single surface for all filtering. Clicking adds chips, typing adds query syntax, both produce the same result.
2. **URL is truth** — Every filter state is encoded in URL params. Shareable, bookmarkable, back-button compatible.
3. **Show, don't tell** — Active filters are ALWAYS visible as removable chips. Never hide filter state.
4. **Keyboard-first, mouse-friendly** — Every operation has a keyboard path. Power users never touch the mouse.
5. **Prevent, don't punish** — Real-time counts, contextual suggestions, and validation prevent empty result states.
6. **Undo everything** — Every filter action is reversible with Cmd+Z.

---

## 2. Research Sources & Methodology

### Primary Reference Products (Deep Analysis)

| Product | Research File | Key Pattern Extracted |
|---------|--------------|---------------------|
| **Vercel** (Runtime Logs) | `docs/research/vercel-filtering-analysis.md` | Three-tier progressive disclosure: click → `key:value` syntax → full query language. Data-driven autocomplete. URL as truth. |
| **Linear** (Issues) | `docs/research/linear-filtering-analysis.md` | Filter-as-formula (readable text expressions). Keyboard-first (`F` shortcut). Real-time counts. Views as first-class objects. AI natural language filtering. |
| **GitHub** (Issues) | `docs/research/github-filtering-analysis.md` | Unified search bar where query text IS the filter display. `qualifier:value` syntax. Dropdowns sync to search bar (teaching users the syntax). Single-letter shortcuts. |
| **Sentry** (Issues/Discover) | `docs/research/sentry-filtering-analysis.md` | Unified `key:value` syntax across all surfaces. Tokenized search with dual mode (pills vs plain text). Page-level persistent filters. Facet maps. Issue Views (tab-based saved searches). |

### Secondary Products (Comparative Analysis)

| Product | Research File | Key Pattern Extracted |
|---------|--------------|---------------------|
| **Datadog** | `docs/research/filtering-patterns-comparative-analysis.md` | Facet panel sidebar + query bar sync. NLQ (natural language). Pattern detection. |
| **Grafana** | Same | Visual operation pipeline (box-based query building). Builder/Code tabs. |
| **Kibana** | Same | Filter pills as first-class objects (edit, disable, pin, negate). KQL/Lucene toggle. |
| **Splunk** | Same | Search Assistant with inline documentation. Pipe-based query chaining. |
| **Jira** | Same | Basic ↔ JQL toggle as learning bridge. Saved filters as infrastructure. |
| **Notion** | Same | Views bundling filter+sort+group+layout. Nested AND/OR groups (up to 3 levels). |
| **Airtable** | Same | Two-tier filter model (builder-configured vs. user-interactive). Tabs as preset filters. |
| **Algolia** | Same | Dynamic faceting. Search within facets. CurrentRefinements widget (canonical filter pills). |
| **Cloudflare** | Same | Hover-to-filter on data visualizations. Wireshark-compatible syntax. |
| **Stripe** | Same | Clean minimalist filter UI. Field-prefixed search. |

### UX & Accessibility Research

| Topic | Research File | Key Finding |
|-------|--------------|------------|
| Keyboard patterns | `docs/research/accessible-filtering-ux.md` | Two-layer model: Tab between components, Arrow keys within. `F` for filter, `Cmd+K` for palette. |
| Query vs visual | Same | Unified bar > toggle. Jira's toggle is an anti-pattern. GitHub/Sentry model preferred. |
| Boolean logic UX | Same | Users think AND widens results (wrong). Use "match all/any" not AND/OR. |
| WCAG compliance | Same | Full ARIA patterns for combobox, filter chips, live regions. 4.5:1 contrast. |
| Progressive disclosure | Same | 5 layers from passive defaults to saved views. Never force users through layers. |
| Mobile | Same | Bottom sheet pattern with sticky "Show N results" button. 44px touch targets. |
| Performance perception | Same | Optimistic chip rendering + opacity transition (100-300ms) + skeleton (300ms+). |

---

## 3. Cross-Product Pattern Synthesis

### Universal Patterns (found in 10+ products)

These are **table stakes** — every modern filtering system must have them:

| Pattern | Description | Products |
|---------|-------------|----------|
| **Active filter display** | Visible, removable chips/pills showing current filters | All 14 products |
| **Time range picker** | Dedicated date/time control with presets | All dev tools |
| **Autocomplete/suggestions** | Query input offers completions | All tools with query input |
| **Clear all filters** | One-click reset | All 14 products |
| **Saved filters/views** | Persist filter configs for reuse | 12 of 14 products |
| **Multi-select within a filter** | Select multiple values per dimension | All 14 products |
| **URL-encoded state** | Filter state in URL for sharing | Vercel, Sentry, GitHub, Kibana, Algolia |
| **Sort integration** | Sort as part of filter/view state | All 14 products |

### Best-in-Class by Pattern Type

| Pattern | Best Example | What Makes It Best |
|---------|-------------|-------------------|
| **Filter pills** | **Kibana** | Pills are first-class objects: edit, disable, pin, negate, delete individually |
| **Progressive disclosure** | **Datadog** | Four smooth levels from click → `key:value` → NLQ → complex boolean |
| **Keyboard-first** | **Linear** | `F` to filter, full keyboard flow, command palette integration |
| **Views/saved filters** | **Notion** | Views bundle filter + sort + group + layout into one switchable unit |
| **Query syntax** | **Sentry** | Unified `key:value` across all surfaces. Tokenized + plain text toggle. |
| **Learning bridge** | **GitHub** | Dropdown selections generate visible query text, teaching the syntax |
| **Dynamic faceting** | **Algolia** | Only show relevant facets based on current query context |
| **Direct manipulation** | **Cloudflare** | Hover any data point → click "Filter" or "Exclude" |
| **Real-time counts** | **Linear** | Every filter category and value shows live matching count |
| **AI/NLQ** | **Linear** | Natural language → structured filters, accessible from same filter menu |

### Critical Anti-Patterns to Avoid

| Anti-Pattern | Products Affected | Our Mitigation |
|--------------|-------------------|----------------|
| **Unidirectional cliff** (visual→text works, text→visual fails) | Grafana, Jira, Cloudflare | Bidirectional sync via shared URL state. Graceful degradation with warnings. |
| **Invisible active filters** | Many early UIs | Always-visible chip bar. Never hide filter state. |
| **No saved filters in data-heavy tools** | Stripe, PagerDuty | Views system from day one. |
| **Unclear AND/OR** | Many multi-select UIs | "Match all" / "Match any" language. Never expose AND/OR terms in basic mode. |
| **All-or-nothing complexity** (basic dropdowns OR query language) | Jira, Splunk, CloudWatch | Five progressive layers with no cliffs between them. |
| **Filter state lost on navigation** | Many SPAs | URL as source of truth. Filter state survives navigation. |
| **Too many facets at once** | High-cardinality tools | Contextual facets: show only relevant values, hide zero-count options. |

---

## 4. Key Design Decisions

### Decision 1: Unified Filter Bar (Not Separate Basic/Advanced)

**Context**: Should we have a toggle between "basic" and "advanced" filter modes?

**Options considered**:
1. **Toggle mode** (Jira style) — Separate basic dropdown UI and advanced query text UI
2. **Unified bar** (GitHub/Sentry style) — Single input surface that accepts both clicks and typed queries
3. **Side-by-side** — Faceted sidebar (Datadog style) + query bar simultaneously

**Decision**: **Option 2 — Unified bar**

**Rationale**:
- Jira's toggle is a well-documented anti-pattern (users get "trapped" in advanced mode)
- GitHub and Sentry prove that a single bar can serve both personas
- The unified bar naturally teaches query syntax (clicking produces visible query text)
- Simpler to implement and maintain than dual UIs

**Dissent**: Product Designer noted that a faceted sidebar (Option 3) provides better discoverability for first-time users. **Compromise**: We'll include a "filter palette" (popover with organized filter categories) accessible from the bar, plus chart-click-to-filter as direct manipulation.

**Revisit if**: User testing shows >30% of users cannot discover how to add their first filter.

---

### Decision 2: `field:value` Query Syntax

**Context**: What query syntax should we support for typed filters?

**Options considered**:
1. **SQL-like** (Splunk/New Relic) — `WHERE status = 'Blocked' AND type = 'XSS'`
2. **`field:value`** (GitHub/Sentry/Vercel) — `status:Blocked type:XSS`
3. **Natural language only** (Linear AI) — "show me blocked XSS attacks"
4. **No text syntax** (Notion/Airtable) — Visual only

**Decision**: **Option 2 — `field:value` syntax**

**Rationale**:
- Most widely adopted pattern in dev tools (GitHub, Sentry, Vercel, Datadog all use it)
- Lowest learning curve for developers (already familiar)
- URL-encodable without complex serialization
- Can be parsed to AST for bidirectional sync with visual chips
- Works naturally with autocomplete

**Syntax specification**:
```
field:value                     # Exact match
field:"multi word value"        # Quoted values
!field:value                    # Negation
field:>100                      # Comparison (>, <, >=, <=)
field:[val1,val2]               # Multiple values (OR within field)
field:val1 field2:val2          # Multiple fields (AND between fields)
field:val* OR field:val2        # Explicit OR between fields
free text search                # Free-text (searches name, endpoint, parameter)
```

**Dissent**: Backend Engineer 1 flagged that parsing is non-trivial and requires a proper tokenizer/parser, not regex. **Accepted** — we'll build a proper parser.

---

### Decision 3: URL as Single Source of Truth

**Context**: Where should filter state live?

**Options considered**:
1. **URL params** — Filter state encoded in URL query string
2. **Zustand store** — Client-side state management
3. **Server session** — Persist on server
4. **Hybrid** — URL for shareable state, Zustand for ephemeral UI state

**Decision**: **Option 4 — Hybrid (URL primary, Zustand secondary)**

**Rationale**:
- URL enables sharing, bookmarking, back/forward navigation (industry standard)
- Zustand handles transient UI state (dropdown open/closed, edit-in-progress state)
- Matches the existing architecture in `attacks-SPEC.md`
- `nuqs` library (used by Sentry) provides React hooks for URL state

**URL format**:
```
/attacks?status=Blocked,Monitored&type=XSS&impact=High&match=all&sort=timeline.last_seen:desc&view=my-triage
```

---

### Decision 4: Filter Logic — Match All/Any (Not AND/OR)

**Context**: How should users combine multiple filters?

**Options considered**:
1. **AND only** — All filters must match (simplest)
2. **AND/OR toggle** — Global switch between modes
3. **Per-group AND/OR** — Nested filter groups with independent logic
4. **"Match all" / "Match any"** — User-friendly language for AND/OR

**Decision**: **Option 4 — "Match all" / "Match any" with future Option 3**

**Rationale**:
- NNGroup research: users misunderstand "AND" and "OR" terminology
- Linear's approach ("all filters" / "any filters") works exceptionally well
- Within a single field, multi-select is implicitly OR (standard pattern)
- Between fields, default is AND (most common mental model)
- Advanced nested groups deferred to P1 (Linear-style advanced filter groups)

**Current spec**: The existing `attacks-SPEC.md` already implements this as `matchMode: "all" | "any"`. We keep this and extend it.

---

### Decision 5: Views System (Tab-Based Saved Filters)

**Context**: How should users save and manage filter configurations?

**Options considered**:
1. **URL bookmarks only** (GitHub approach) — No native save, users bookmark URLs
2. **Saved search list** (Jira approach) — Named filters in a sidebar
3. **Tab-based views** (Sentry/Linear approach) — Views as tabs above the content
4. **Full view bundles** (Notion approach) — Filter + sort + group + layout + columns

**Decision**: **Option 4 — Full view bundles displayed as tabs**

**Rationale**:
- The existing `attacks-SPEC.md` already defines `AttackView` with this pattern
- Sentry recently migrated FROM saved searches TO tab-based views (industry direction)
- Linear's view system is highest-rated for UX among all products studied
- Bundling filter + sort + columns + chart selections prevents state fragmentation

**Scope**: Views persist: filters, matchMode, groupBy, timeWindow, sort, columns (widths, order, frozen, hidden), chartSelections. This matches the existing `AttackView` interface.

---

### Decision 6: Keyboard Shortcut Scheme

**Context**: What keyboard shortcuts should the filtering system support?

**Decision**: Adopt Linear's model with GitHub-style single-letter shortcuts

| Shortcut | Action | Source |
|----------|--------|--------|
| `Cmd+K` | Open command palette | Universal (Linear, Vercel, GitHub) |
| `F` | Open filter builder / add filter | Linear |
| `Shift+F` | Remove last filter | Linear |
| `Cmd+Shift+F` | Clear all filters | Custom (extends Linear) |
| `/` | Focus filter bar | GitHub |
| `Cmd+Z` | Undo last filter change | Desktop convention |
| `Cmd+Shift+Z` | Redo | Desktop convention |
| `Escape` | Close any open popover/sheet | Universal |

**Constraint**: Single-letter shortcuts (`F`, `/`) only activate when focus is NOT in a text input. Context-detection is required.

---

## 5. Proposed Architecture: The Filtering System

### 5.1 Filter Bar Anatomy

```
+--[ Filter Bar ]--------------------------------------------------+
|                                                                    |
|  [+Filter]  [Status: Blocked ×] [Type: XSS ×] [Impact: High ×]  |
|                                                                    |
|  [Match: all ▾]  [Clear all]              "3 filters · 28 results"|
|                                                                    |
+--------------------------------------------------------------------+
```

**Components**:
- **Add Filter button** (`+Filter`) — Opens filter palette popover
- **Active filter chips** — Each shows `field: value ×`, clickable to edit, × to remove
- **Match mode toggle** — "Match all" / "Match any" (appears after 2+ filters)
- **Clear all** — Removes all filters
- **Result count** — Live count of matching records (with `aria-live="polite"`)

### 5.2 Filter Palette (Add Filter Popover)

When user clicks `+Filter` or presses `F`:

```
+--[ Filter Palette ]----------------------------------+
| Search filters...                             [?]    |
+------------------------------------------------------+
|                                                      |
| RECENT FILTERS                              (clock)  |
|   Status is Blocked                                  |
|   Type is XSS                                        |
|   Response Code is 200, 401, 500                     |
|                                                      |
| ATTACK CHARACTERISTICS                               |
|   Attack Type                              (6 types) |
|   Status                                (3 statuses) |
|   Impact                                 (3 levels)  |
|   Response Code                           (5 codes)  |
|                                                      |
| SOURCE & TARGET                                      |
|   IP Address                               (text)    |
|   Country                              (10 values)   |
|   Host                                     (text)    |
|   Endpoint                                 (text)    |
|                                                      |
| SECURITY                                             |
|   CWE                                    (N values)  |
|   OWASP API                              (N values)  |
|                                                      |
| VOLUME & TIME                                        |
|   Requests                               (numeric)   |
|   Sessions                               (numeric)   |
|   First Detected                           (date)    |
|   Last Seen                                (date)    |
+------------------------------------------------------+
```

**Implementation**: shadcn/ui `Popover` + `Command` (cmdk). Type-ahead search filters categories. Arrow keys navigate. Enter selects.

### 5.3 Filter Value Selection

After selecting a filter category, a secondary popover shows:

**For enum fields** (Status, Impact, Type):
```
+--[ Status Filter ]---------------------------+
| Operator: [is ▾]                             |
+----------------------------------------------+
| Search values...                             |
|                                              |
| ☑ Blocked                              (15) |
| ☐ Monitored                            (10) |
| ☐ Started                               (3) |
+----------------------------------------------+
| [Apply]                                      |
+----------------------------------------------+
```

**For text fields** (IP, Host, Endpoint):
```
+--[ IP Address Filter ]------------------------+
| Operator: [contains ▾]                        |
+-----------------------------------------------+
| Enter IP address...                           |
| ┌──────────────────────────────┐              |
| │ 192.168.1.                   │              |
| └──────────────────────────────┘              |
+-----------------------------------------------+
| [Apply]                                       |
+-----------------------------------------------+
```

**For numeric fields** (Requests, Sessions):
```
+--[ Requests Filter ]-------------------------+
| Operator: [greater than ▾]                   |
+----------------------------------------------+
| Value: [100          ]                       |
+----------------------------------------------+
| [Apply]                                      |
+----------------------------------------------+
```

**For date fields** (First Detected, Last Seen):
```
+--[ Last Seen Filter ]------------------------+
| Operator: [after ▾]                          |
+----------------------------------------------+
| [Calendar picker or relative: "7 days ago"]  |
+----------------------------------------------+
| [Apply]                                      |
+----------------------------------------------+
```

### 5.4 Query Input Mode

The filter bar also accepts typed queries. When the user starts typing in the bar:

```
+--[ Filter Bar — Query Mode ]------------------------------------------+
|                                                                        |
|  status:Blocked type:XSS impact:High|                                  |
|  ^^^^^^^^^^^^^^ ^^^^^^^^^ ^^^^^^^^^^^                                  |
|  (blue)        (blue)    (blue)     <- syntax highlighting            |
|                                                                        |
|  Suggestions:                                                          |
|  ┌─────────────────────────────────────────┐                          |
|  │ impact:High     Impact is High     (12) │  <- autocomplete         |
|  │ impact:Medium   Impact is Medium    (8) │                          |
|  │ impact:Low      Impact is Low       (8) │                          |
|  └─────────────────────────────────────────┘                          |
+------------------------------------------------------------------------+
```

Typed queries are parsed into chips on `Enter` or `Space` after a complete `field:value` token. This is the GitHub/Sentry model.

### 5.5 Cross-Component Filtering

Filters can be triggered from multiple surfaces (matching existing spec):

| Source | Action | Result |
|--------|--------|--------|
| **Filter bar** | Click +Filter, select field, select value | Chip added to bar |
| **Query typing** | Type `field:value` in bar | Chip parsed and added |
| **Chart click** | Click bar/legend in statistics charts | Filter chip added for that value |
| **Table context menu** | Right-click cell → "Filter by value" | Filter chip added |
| **Table context menu** | Right-click cell → "Exclude value" | Negated filter chip added |
| **Recent filters** | Click preset in filter palette | Filter applied instantly |
| **Command palette** | Type filter command | Filter applied |
| **Saved view** | Click view tab | Full filter state loaded |

---

## 6. Interaction Model

### 6.1 State Machine: Filter Lifecycle

```
[idle] --user clicks +Filter--> [palette_open]
[palette_open] --select category--> [value_selection]
[value_selection] --select value + apply--> [filter_applied] --> [idle]
[value_selection] --escape--> [palette_open]
[palette_open] --escape--> [idle]

[idle] --user types in bar--> [query_mode]
[query_mode] --complete token (space/enter)--> [filter_applied] --> [query_mode]
[query_mode] --escape/blur--> [idle]

[idle] --click chip--> [editing_filter]
[editing_filter] --modify + apply--> [filter_updated] --> [idle]
[editing_filter] --escape--> [idle]

[idle] --click chip ×--> [filter_removed] --> [idle]
[idle] --click clear all--> [all_cleared] --> [idle]
```

### 6.2 Keyboard Flow (Complete)

**Adding a filter (keyboard)**:
1. Press `F` (or Tab to +Filter button, then Enter)
2. Filter palette opens with focus on search input
3. Type to search categories (e.g., "sta" highlights "Status")
4. Arrow down to select, Enter to confirm
5. Value selection opens with focus on search/select input
6. Arrow through values, Space to toggle multi-select, Enter to apply
7. Filter chip appears, focus returns to +Filter button
8. Press `F` again to add another

**Adding a filter (query typing)**:
1. Press `/` to focus filter bar
2. Type `status:` — autocomplete shows status values
3. Arrow down to "Blocked", Enter to select
4. Chip appears: `Status: Blocked`
5. Continue typing or press Escape to exit

**Editing a filter**:
1. Tab to the target filter chip
2. Press Enter to open edit popover
3. Modify operator or values
4. Press Enter to apply changes or Escape to cancel

**Removing a filter**:
1. Tab to the target filter chip
2. Press Backspace/Delete to remove
3. Focus moves to next chip (or +Filter if last)

### 6.3 Motion & Timing

| Interaction | Duration | Easing | Details |
|-------------|----------|--------|---------|
| Chip appear | 150ms | ease-out | Scale from 0.95 to 1.0 + opacity 0→1 |
| Chip remove | 100ms | ease-in | Scale from 1.0 to 0.95 + opacity 1→0 |
| Popover open | 150ms | ease-out | Standard Radix UI transition |
| Popover close | 100ms | ease-in | Standard Radix UI transition |
| Results loading | 0-100ms: none; 100-300ms: opacity 0.6; 300ms+: skeleton | linear | Tiered loading strategy |
| Live count update | 200ms | ease-in-out | Number transition |

All animations respect `prefers-reduced-motion: reduce`.

---

## 7. Accessibility Specification

### 7.1 ARIA Landmarks

```html
<div role="search" aria-label="Filter attacks">
  <!-- Filter bar content -->
  <div role="toolbar" aria-label="Quick filters" aria-orientation="horizontal">
    <!-- Quick filter toggles -->
  </div>
  <div role="group" aria-label="Active filters, N applied">
    <ul role="list">
      <!-- Filter chips as list items -->
    </ul>
  </div>
</div>
```

### 7.2 Screen Reader Announcements

| Event | Announcement | Priority |
|-------|-------------|----------|
| Filter added | "Filter added: Status is Blocked. N filters active. M results." | `polite` |
| Filter removed | "Filter removed: Status is Blocked. N filters active. M results." | `polite` |
| All filters cleared | "All filters cleared. M results." | `polite` |
| Zero results | "No results match your filters. Try removing some filters." | `assertive` |
| Loading | "Loading filtered results..." | `polite` |
| Match mode changed | "Filter logic changed to match all conditions." | `polite` |

Announcements debounced at 500ms to prevent storms during rapid filter changes.

### 7.3 Focus Management

| Action | Focus Destination |
|--------|------------------|
| Apply filter from dropdown | +Filter button (enables rapid sequential filtering) |
| Remove chip via keyboard | Next chip → previous chip → +Filter button |
| Clear all filters | +Filter button |
| Open command palette | Palette input |
| Close command palette | Previously focused element |
| Open filter dropdown | Combobox input |
| Close filter dropdown (Escape) | The trigger that opened it |

### 7.4 Color & Contrast

- All filter chip text: 4.5:1 contrast ratio minimum
- Interactive boundaries: 3:1 contrast minimum
- Active vs inactive states distinguishable without color alone (filled vs outlined)
- Focus ring: 2px, 3:1 contrast against adjacent colors
- Full dark mode + light mode support via shadcn/ui CSS variables

---

## 8. Technical Architecture

### 8.1 State Model

```typescript
// URL State (source of truth, shareable)
interface FilterURLState {
  // Filter values
  status?: string[]        // e.g., ["Blocked", "Monitored"]
  impact?: string[]        // e.g., ["High"]
  type?: string[]          // e.g., ["XSS", "SQL Injection"]
  country?: string[]       // e.g., ["United States"]
  ip?: string[]            // e.g., ["192.168.1.1"]
  cwe?: string[]           // e.g., ["CWE-79"]
  api_owasp?: string[]     // e.g., ["API1:2021"]
  response_code?: string[] // e.g., ["200", "401"]
  host?: string[]
  endpoint?: string[]
  parameter?: string[]

  // Operators (when non-default)
  // Encoded as field__op, e.g., requests__gt=100
  [key: `${string}__${'eq'|'neq'|'gt'|'lt'|'gte'|'lte'|'contains'|'starts'|'ends'}`]: string

  // Meta
  match?: 'all' | 'any'   // Default: 'all'
  q?: string               // Free-text search query

  // View & display
  view?: string            // Saved view ID
  sort?: string            // e.g., "timeline.last_seen:desc"
  groupBy?: string         // e.g., "type"
  timeWindow?: string      // e.g., "live-7d"
}

// Client State (Zustand — ephemeral UI state)
interface FilterUIState {
  isPaletteOpen: boolean
  editingChipId: string | null
  queryInputValue: string   // Draft query text before parsing
  filterHistory: FilterHistoryEntry[]
  historyIndex: number
}

// Filter chip display model
interface FilterChip {
  id: string
  field: string            // e.g., "status"
  fieldLabel: string       // e.g., "Status"
  operator: FilterOperator // e.g., "is"
  values: string[]         // e.g., ["Blocked", "Monitored"]
  negated: boolean
}

type FilterOperator =
  | 'is' | 'is_not'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'gt' | 'lt' | 'gte' | 'lte'
  | 'before' | 'after'
```

### 8.2 Component Tree

```
FilterSystem/
├── FilterBar                    # Main container (role="search")
│   ├── FilterPaletteTrigger     # +Filter button → opens palette
│   ├── FilterChipGroup          # Active filter chips (role="group")
│   │   └── FilterChip[]         # Individual removable chips (Badge)
│   ├── QueryInput               # Typed query input with syntax highlighting
│   ├── MatchModeToggle          # "Match all" / "Match any" (ToggleGroup)
│   ├── ClearAllButton           # Clear all filters (Button ghost)
│   └── ResultCount              # "N results" (aria-live region)
├── FilterPalette                # Popover + Command for filter discovery
│   ├── RecentFilters            # Clock icon section
│   ├── FilterCategoryGroups     # Organized filter categories
│   └── FilterValueSelector      # Secondary popover per field type
│       ├── EnumValueSelector    # Checkbox list + search (Combobox)
│       ├── TextValueInput       # Free-text input
│       ├── NumericValueInput    # Number input + operator
│       └── DateValuePicker      # Calendar + relative options
├── CommandPaletteIntegration    # Cmd+K filter commands
├── FilterQueryParser            # Parses query text → FilterChip[]
└── FilterURLSync                # Bidirectional URL ↔ state sync
```

### 8.3 shadcn/ui Components Required

| Component | Usage |
|-----------|-------|
| `Button` | +Filter trigger, Clear all, Apply |
| `Badge` | Filter chips (custom variant with close button) |
| `Popover` | Filter palette, value selectors |
| `Command` (cmdk) | Filter palette search, command palette |
| `ToggleGroup` + `Toggle` | Match mode, quick filter toggles |
| `Input` | Text value inputs, numeric inputs |
| `Calendar` | Date filter picker |
| `Select` | Operator selection |
| `Tooltip` | Filter field descriptions, keyboard shortcuts |
| `Skeleton` | Loading states |
| `Card` | Filter bar container (optional) |
| `Sonner` (toast) | Undo notifications |
| `Dialog` | Save view modal |
| `Sheet` | Mobile filter sheet, advanced filter builder |
| `DropdownMenu` | View management actions |
| `Slider` | Numeric range filters |

### 8.4 Query Parser Architecture

The query parser should handle the `field:value` syntax:

```
Input: 'status:Blocked type:XSS !impact:Low response_code:[200,401] free text search'

Tokens:
  { type: 'filter', field: 'status', operator: 'is', values: ['Blocked'], negated: false }
  { type: 'filter', field: 'type', operator: 'is', values: ['XSS'], negated: false }
  { type: 'filter', field: 'impact', operator: 'is', values: ['Low'], negated: true }
  { type: 'filter', field: 'response_code', operator: 'is', values: ['200', '401'], negated: false }
  { type: 'freetext', value: 'free text search' }
```

Parser phases:
1. **Tokenization** — Split input into tokens (field:value pairs + free text)
2. **Validation** — Check field names against schema, validate operators
3. **AST construction** — Build a typed filter tree
4. **Serialization** — Convert AST to URL params (for state sync)
5. **Deserialization** — Convert URL params back to AST (for hydration)

---

## 9. Agent Team Review & Debate

### UX Researcher Challenge

> "The research clearly shows that the biggest risk is the **cold start problem** — users landing on an empty filter bar with no guidance. Vercel's data-driven autocomplete and Linear's real-time counts both solve this by showing users what data EXISTS before they filter. We must solve this with either: (a) suggested filters based on data distribution, (b) facet counts in the filter palette, or (c) chart-click-to-filter as the primary entry point for new users. What evidence do we have about our users' first-time experience?"

**Response (PM)**: We'll implement (b) facet counts in the filter palette AND (c) chart-click-to-filter from the statistics cards. The existing spec already supports chart-click filtering. Adding counts to the palette is a small addition with high impact.

### Interaction Designer Pushback

> "The query parser is a significant technical risk. Sentry spent months building their `SearchQueryBuilder` and still had to add a plain-text toggle because power users found the tokenized UI too restrictive. My concern: if we build a tokenized chip system, users who prefer typing `status:Blocked AND type:XSS` will find the chip insertion/editing flow slower than just typing. I recommend we follow Sentry's lead and support BOTH tokenized (click-based) AND plain text (typing) modes from the start."

**Response (Frontend Engineer 1)**: Agreed. We'll implement dual mode — tokenized chips by default, with a toggle to switch to plain text query mode. The URL params remain the source of truth for both modes. This matches Sentry's September 2024 approach.

### Backend Engineer 1 Challenge

> "The filter query parser needs to handle malformed input gracefully. What happens when a user types `status:` (no value), or `::`, or `status:Blocked type` (dangling field name)? Every reference product handles this differently — Sentry shows inline errors, GitHub ignores invalid tokens, Vercel shows tooltips. We need to define our error handling strategy before building the parser."

**Response (Team)**: We'll follow Sentry's approach — real-time inline validation with non-blocking error indicators. Invalid tokens get a red underline but are NOT removed. The system continues to function with valid tokens while highlighting invalid ones. Error messages appear as tooltips on hover/focus.

### QA Tester Early Concerns

> "How will we test keyboard navigation across all filter states? The state machine has 7 states with multiple transitions each. I'm flagging that we need end-to-end keyboard tests from day one — not retrofitted after implementation. Also, screen reader testing needs to happen with actual screen readers (VoiceOver, NVDA), not just ARIA attribute checking."

**Response (PM)**: Agreed. The test plan will include:
1. Playwright E2E tests for all keyboard flows
2. axe-core automated accessibility scans in CI
3. Manual VoiceOver testing on macOS for each filter interaction
4. Screen reader announcement verification for all live regions

### Product Designer Observation

> "Looking across all reference products, there's a clear visual design tension: **Linear's minimal formula approach** (no colored pills, just text) vs. **Kibana's rich pill approach** (colored, individually controllable). For a security dashboard, I recommend the Kibana-style rich pills because: (a) security contexts benefit from visual prominence of active filters — users need to know exactly what they're looking at, (b) individual pill operations (disable, pin, negate) are extremely useful for security triage workflows, (c) the existing spec already uses badge-style chips."

**Response (Team)**: Agreed. We'll use the rich pill/badge approach with individual controls per chip, consistent with the existing spec's badge-based design.

---

## 10. Prioritized Feature Map

### P0 — Must Ship (Core Filtering)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Filter bar with chips | Add/remove/edit filter chips, clear all | Medium |
| Filter palette | Organized category menu with search | Medium |
| Enum value selector | Multi-select combobox for enum fields (Status, Type, Impact, etc.) | Medium |
| Text value input | Free-text input for IP, Host, Endpoint, Parameter | Low |
| Match all/any toggle | Global AND/OR toggle | Low |
| URL state sync | Bidirectional URL ↔ filter state | Medium |
| Basic keyboard nav | Tab through chips, Escape to close, Enter to activate | Medium |
| Chart-click filtering | Click statistics chart elements to apply filters | Low (existing) |
| Table context menu filtering | Right-click → Filter by value / Exclude | Low (existing) |
| Recent filters | Show recently applied filter combinations | Low |
| Result count (live) | Show filtered result count with live announcements | Low |
| Clear all | Remove all active filters | Low |

### P1 — Should Ship (Power Features)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Query input mode | Typed `field:value` syntax with parsing | High |
| Autocomplete/suggestions | Field names, operators, values with counts | High |
| Syntax highlighting | Color-coded query tokens in input | Medium |
| Command palette integration | `Cmd+K` filter commands | Medium |
| `F` keyboard shortcut | Single-key filter activation | Low |
| Negation filters | `!field:value` for exclusion | Medium |
| Numeric operators | Greater than, less than, range for Requests/Sessions | Medium |
| Date operators | Before, after, range for First Detected/Last Seen | Medium |
| Undo/redo | `Cmd+Z` / `Cmd+Shift+Z` for filter history | Medium |
| Saved views (full) | Create, name, share, duplicate, delete views | High |
| View presets | Built-in views (All, Blocked Today, Needs Attention, etc.) | Medium |
| Dual mode toggle | Switch between tokenized chips and plain text query | Medium |

### P2 — Nice to Have (Advanced)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Advanced filter groups | Nested AND/OR groups (Linear-style) | High |
| AI/NLQ filtering | Natural language → structured filter | High |
| Dynamic facet counts | Show matching count per value in palette | Medium |
| Filter suggestions | "People also filter by..." context suggestions | Medium |
| Mobile bottom sheet | Responsive filter builder for mobile | Medium |
| Pinned/disabled filters | Kibana-style individual filter controls | Medium |
| Cross-view filter comparison | Compare two views side by side | High |

---

## 11. Open Questions & Risks

### Open Questions

1. **Filter persistence across page navigations**: When user navigates to `/attacks/[id]` detail page and back, should filters be restored from URL? (Recommendation: Yes, URL state survives navigation automatically.)

2. **Server-side vs client-side filtering**: The current spec uses client-side filtering with `useMemo`. At what data volume do we need server-side filtering? (Risk: performance with >10K records.)

3. **Filter operator defaults**: Should we show operators by default or only when the user explicitly changes them? (Recommendation: Hide by default, show when user clicks operator area — Linear pattern.)

4. **Real-time autocomplete data source**: Should autocomplete values come from a static schema or from actual data? (Recommendation: Start with static schema for enum fields, actual data for text fields — Vercel pattern.)

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Query parser complexity | High | Medium | Use a proven tokenizer library (e.g., Chevrotain). Budget 2x estimated time. |
| Bidirectional sync bugs | High | High | URL-as-source-of-truth reduces sync issues. Extensive E2E tests. |
| Keyboard shortcut conflicts | Medium | Medium | Context detection (input focused vs body focused). Test across OS/browsers. |
| Performance with many active filters | Medium | Low | Debounce filter application. Memoize filter computations. |
| Accessibility regressions | High | Medium | Automated axe-core in CI. Manual screen reader testing per sprint. |
| Scope creep from "one more filter feature" | High | High | Strict P0/P1/P2 prioritization. PM gates all additions. |

---

## 12. Appendix: Research Documents

All individual research files are stored in `docs/research/`:

| File | Content |
|------|---------|
| `vercel-filtering-analysis.md` | Vercel Runtime Logs, Observability, Web Analytics, Build Logs, WAF filtering |
| `linear-filtering-analysis.md` | Linear issue filtering, views, keyboard interactions, AI filters |
| `github-filtering-analysis.md` | GitHub qualifier syntax, progressive disclosure, URL state, label system |
| `sentry-filtering-analysis.md` | Sentry unified query syntax, SearchQueryBuilder, Issue Views, Discover |
| `filtering-patterns-comparative-analysis.md` | 14-product comparative analysis (Datadog, Grafana, Kibana, Splunk, Jira, Notion, Airtable, etc.) |
| `accessible-filtering-ux.md` | Keyboard patterns, WCAG compliance, progressive disclosure, mobile UX, performance |

---

## Next Steps

1. **Definition Phase**: PM writes PRD based on this research, slicing P0 features into user stories
2. **Design Phase**: Product Designer creates component specs referencing shadcn/ui components
3. **Interaction Specs**: Interaction Designer creates detailed state machines and animation specs
4. **Technical Design**: Engineers write ADR for query parser architecture and URL state management
5. **Test Planning**: QA writes test plan covering all keyboard, screen reader, and visual accessibility scenarios

---

*This document was produced through collaborative research by the full team: UX Researcher (research methodology), Product Manager (prioritization and decisions), Product Designer (visual patterns), Interaction Designer (keyboard and state specs), Frontend Engineers (technical architecture), Backend Engineers (data model and parser), QA Tester (testability review). All decisions include documented dissent per team collaboration rules.*
