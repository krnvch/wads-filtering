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
| **Unclear AND/OR** | Many multi-select UIs | Constrained OR (only in groups) with inline validation. AND is the safe default. Error messages guide correct usage. |
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

### Decision 4: Filter Logic — Inline Boolean Expression with Constrained OR

**Context**: How should users combine multiple filters?

**Options considered**:
1. **AND only** — All filters must match (simplest)
2. **AND/OR toggle** — Global switch between modes ("Match all" / "Match any")
3. **Per-group AND/OR** — Nested filter groups with independent logic
4. **Full boolean expression** — Inline AND/OR tokens with parenthetical grouping

**Decision**: **Option 4 — Inline boolean expression with constrained OR** (updated after Figma design review)

**Rationale**:
- The Figma designs define AND/OR as **explicit inline tokens** between chips, not a global toggle
- Parenthetical grouping `( A OR B ) AND C` gives users precise control over boolean logic
- OR is **constrained to parenthetical groups only** — prevents confusing top-level OR (which research shows users misunderstand)
- Top-level connector is always AND (most common mental model preserved)
- Within a single field, multi-select uses "or" keyword: `Status is not Monitoring or Blocked`
- Inline validation shows errors when OR is used incorrectly (red token + error panel)

**Previous approach**: We had planned a "Match all" / "Match any" global toggle. The Figma designs replace this with a more expressive inline model that handles the same use cases (and more) while keeping the UI explicit about what logic is applied.

**Dissent**: UX Researcher noted that explicit AND/OR tokens may confuse non-technical users. **Mitigation**: (1) OR is constrained to groups only, reducing misuse; (2) inline validation with clear error messages guides users; (3) the default experience (adding chips) is always AND, which is the intuitive default.

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
+--[ Filter Bar ]-----------------------------------------------------------------------------------------------+
|                                                                                                                |
|  ( Status is not Monitoring or Blocked  OR  Type is BOLA, XSS )  AND  Country is not Italy  Search {object}.. ×|
|    ^chip (badge)                        ^OR  ^chip (badge)       ^AND  ^chip (badge)         ^placeholder    ^clear
|                                                                                                                |
+----------------------------------------------------------------------------------------------------------------+
```

**Components**:
- **Filter chips** — Inline badges showing `Field operator Value1 or Value2`, with blue-highlighted values
- **Boolean connectors** — Explicit AND/OR tokens between chips/groups
- **Parenthetical groups** — `( )` tokens for boolean precedence (OR only valid inside groups)
- **Search placeholder** — `Search {object} ...` — clicking opens filter palette
- **Clear all** (`×`) — Button on far right, removes all filters
- **Result count** — Live count of matching records (with `aria-live="polite"`)

**No `+Filter` button** — the filter palette opens when clicking empty space in the bar. This is simpler than a dedicated button and matches the Figma design.

### 5.2 Filter Palette (Click Empty Bar Space)

When user clicks empty space in the filter bar or presses `F`:

```
+--[ Filter Palette ]----------------------------------+
|                                                      |
| RECENT                                               |
|   Status is not Monitoring or Blocked                |
|   Type is BOLA, XSS                                 |
|   Country is not Italy                               |
|                                                      |
| ATTACK CHARACTERISTICS                               |
|   Attack type                                        |
|   Status                                             |
|   Blocking status                                    |
|   HTTP status code                                   |
|   Impact                                             |
|                                                      |
| TARGET & CONTEXT                                     |
|   Endpoint                                           |
|   Hostname                                           |
|   Parameter                                          |
+------------------------------------------------------+
```

**Key differences from initial spec (aligned with Figma):**
- **No search input** at top — palette is a simple categorized list
- **Recent filters show full expressions** with blue-highlighted values (not just field names)
- **Clicking a recent filter** re-applies the entire expression (one-click)
- **Clicking a field** opens the value selection step (operator + values)
- **Fewer fields** in primary palette (~8 fields); additional fields may be available via search or configuration
- **Renamed fields**: Host → Hostname, Response Code → HTTP status code
- **New field**: Blocking status

**Implementation**: shadcn/ui `Popover` + `Command` (cmdk). Arrow keys navigate. Enter selects.

### 5.3 Filter Value Selection

After selecting a field from the palette, a chip is created in the bar with the default operator (`is`), and a value dropdown opens inline:

**For enum fields** (Status, Type, Impact, HTTP status code, Blocking status):
```
+--[ Value Dropdown ]----------------------+
| Monitoring                            ☐  |
| Blocked                               ☐  |
| Started                               ☐  |
+-------------------------------------------+
| ⌘ ↵ to select multiple                   |
+-------------------------------------------+
```

- Checkboxes for multi-select
- `Cmd+Enter` keyboard hint shown at bottom
- No "Apply" button — selection is immediate
- No search input or live counts in the value list (simpler than initial spec)

**For text fields** (Endpoint, Hostname, Parameter):
- Free-text input with autocomplete suggestions from existing data

**Operator selection** happens inline on the chip itself — click the operator text (`is`, `is not`, etc.) to open a dropdown with 4 options:
```
+--[ Operator Dropdown ]---+
| is                       |
| is not              ✓    |
| contains                 |
| does not contain         |
+---------------------------+
```

### 5.4 Query Input Mode (P1 — Future Enhancement)

> **Note**: The Figma designs focus on the chip-based interaction model. Typed `field:value` query syntax is a P1 enhancement that builds on top of the chip model.

When typing in the `Search {object} ...` area, the palette opens showing matching fields. Selecting a field creates a chip with value selection. Full typed query syntax (`status:Blocked type:XSS`) may be added in P1 to support power users who prefer typing over clicking.

The chip-based model with inline operators IS the primary interaction — not a secondary mode.

### 5.5 Cross-Component Filtering

Filters can be triggered from multiple surfaces (matching existing spec):

| Source | Action | Result |
|--------|--------|--------|
| **Filter bar** | Click empty space → select field → select values | Chip added to bar with AND connector |
| **Chart click** | Click bar/legend in statistics charts | Filter chip added with `is` operator |
| **Table context menu** | Right-click cell → "Filter by value" | `Field is Value` chip added |
| **Table context menu** | Right-click cell → "Exclude value" | `Field is not Value` chip added |
| **Recent filters** | Click preset in filter palette | Full expression re-applied |
| **Command palette** | Type filter command | Filter applied |
| **Saved view** | Click view tab | Full expression tree loaded |

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
// ─── Filter Expression Model (boolean expression tree) ───

// Individual filter condition (renders as a chip in the bar)
interface FilterCondition {
  id: string
  field: string              // e.g., "status", "type", "hostname"
  fieldLabel: string         // e.g., "Status", "Attack type", "Hostname"
  operator: FilterOperator   // e.g., "is", "is_not"
  values: string[]           // e.g., ["Monitoring", "Blocked"]
}

type FilterOperator = "is" | "is_not" | "contains" | "does_not_contain"

// Boolean group — wraps conditions with a connector
interface FilterGroup {
  id: string
  connector: "AND" | "OR"
  children: Array<FilterCondition | FilterGroup>
}

// Top-level filter state — root group (always AND at top level)
interface FilterState {
  expression: FilterGroup    // Root is always { connector: "AND", children: [...] }
}

// ─── URL State (source of truth, shareable) ───

// The expression tree is serialized to a compact URL format:
// ?filter=((status.is_not.Monitoring,Blocked|OR|type.is.BOLA,XSS)|AND|country.is_not.Italy)
// Flat shorthand for simple AND-only queries:
// ?status=Blocked,Monitored&type=XSS&hostname=orders.example.com
interface FilterURLState {
  filter?: string            // Serialized expression tree (for complex boolean queries)

  // Flat shorthand (for simple queries — auto-promoted to expression tree)
  status?: string[]
  impact?: string[]
  type?: string[]
  hostname?: string[]
  endpoint?: string[]
  parameter?: string[]
  http_status_code?: string[]
  blocking_status?: string[]

  // View & display
  view?: string              // Saved view ID
  sort?: string              // e.g., "timeline.last_seen:desc"
  groupBy?: string           // e.g., "type"
  timeWindow?: string        // e.g., "live-7d"
  q?: string                 // Free-text search
}

// ─── Client State (Zustand — ephemeral UI state) ───

interface FilterUIState {
  isPaletteOpen: boolean
  editingChipId: string | null
  editingOperatorChipId: string | null  // Which chip's operator dropdown is open
  hoveredChipId: string | null          // For showing × on hover
  validationErrors: FilterValidationError[]
  filterHistory: FilterHistoryEntry[]
  historyIndex: number
}

interface FilterValidationError {
  type: "invalid_or_placement"
  message: string            // e.g., '"OR" operator cannot be used within the actuals query'
  tokenId: string            // ID of the problematic connector token
}
```

### 8.2 Component Tree

```
FilterSystem/
├── FilterBar                        # Main container (role="search")
│   ├── FilterExpression             # Renders the boolean expression tree
│   │   ├── FilterGroup              # Parenthetical group ( ... )
│   │   │   ├── GroupOpenParen       # ( token
│   │   │   ├── FilterChip[]         # Individual filter badges
│   │   │   ├── BooleanConnector[]   # AND/OR tokens between chips
│   │   │   └── GroupCloseParen      # ) token
│   │   ├── FilterChip               # Field operator Value1 or Value2 (Badge)
│   │   │   ├── ChipOperator         # Clickable "is"/"is not" → opens OperatorDropdown
│   │   │   ├── ChipValues           # Blue-highlighted values
│   │   │   └── ChipClose            # × button (visible on hover only)
│   │   └── BooleanConnector         # AND/OR token between top-level items
│   ├── SearchPlaceholder            # "Search {object} ..." — click opens palette
│   ├── ClearAllButton               # × on far right
│   └── ValidationPanel              # Error panel below bar (when validation fails)
├── FilterPalette                    # Dropdown opened by clicking empty bar space
│   ├── RecentFilters                # Full expressions with blue-highlighted values
│   └── FilterCategoryGroups         # Attack characteristics, Target & Context
├── OperatorDropdown                 # is, is not, contains, does not contain
├── ValueSelector                    # Dropdown per field type
│   ├── EnumValueSelector            # Checkbox list + ⌘↵ hint
│   └── TextValueInput               # Free-text input with autocomplete
├── CommandPaletteIntegration        # Cmd+K filter commands
├── FilterExpressionParser           # Parses/validates boolean expression tree
└── FilterURLSync                    # Bidirectional URL ↔ expression tree sync
```

### 8.3 shadcn/ui Components Required

| Component | Usage |
|-----------|-------|
| `Badge` | Filter chips (custom variant with hover-only close button, blue value text) |
| `Popover` | Filter palette, value selectors, operator dropdown |
| `Command` (cmdk) | Filter palette categories, command palette |
| `DropdownMenu` | Operator selection (is, is not, contains, does not contain), view actions |
| `Checkbox` | Multi-select values in enum dropdowns |
| `Input` | Text value inputs, search placeholder |
| `Button` | Clear all (×), apply actions |
| `Tooltip` | "Not allowed" on invalid OR, field descriptions, keyboard shortcuts |
| `Skeleton` | Loading states |
| `Alert` | Validation error panel below filter bar |
| `Sonner` (toast) | Undo notifications |
| `Dialog` | Save view modal |
| `Sheet` | Mobile filter sheet |

### 8.4 Expression Tree & Validation Architecture

The filter system uses a **boolean expression tree** (not a text query parser). The tree is built interactively via chip creation and grouping.

**Expression tree example:**
```
FilterGroup (AND)
├── FilterGroup (OR)                              ← parenthetical group
│   ├── FilterCondition { field: "status", operator: "is_not", values: ["Monitoring", "Blocked"] }
│   └── FilterCondition { field: "type", operator: "is", values: ["BOLA", "XSS"] }
└── FilterCondition { field: "country", operator: "is_not", values: ["Italy"] }
```

**Renders as:**
```
( Status is not Monitoring or Blocked  OR  Type is BOLA, XSS )  AND  Country is not Italy
```

**Validation rules:**
1. **OR placement** — OR connectors are only valid inside parenthetical groups. Top-level OR triggers an error.
2. **Empty values** — A chip without values is invalid (shown with warning state).
3. **Single-level nesting** — Groups cannot be nested inside groups.

**Serialization phases:**
1. **Tree → URL** — Serialize expression tree to compact URL param format
2. **URL → Tree** — Deserialize URL params back to expression tree on page load
3. **Tree → Display** — Render tree as inline chips with connectors and parens
4. **Validation** — Run constraint checks on every tree mutation, update `validationErrors` in UI state

---

## 9. Agent Team Review & Debate

### UX Researcher Challenge

> "The research clearly shows that the biggest risk is the **cold start problem** — users landing on an empty filter bar with no guidance. Vercel's data-driven autocomplete and Linear's real-time counts both solve this by showing users what data EXISTS before they filter. We must solve this with either: (a) suggested filters based on data distribution, (b) facet counts in the filter palette, or (c) chart-click-to-filter as the primary entry point for new users. What evidence do we have about our users' first-time experience?"

**Response (PM)**: We'll implement (b) facet counts in the filter palette AND (c) chart-click-to-filter from the statistics cards. The existing spec already supports chart-click filtering. Adding counts to the palette is a small addition with high impact.

### Interaction Designer Pushback

> "The boolean expression model with inline AND/OR and parenthetical grouping is more complex than a simple 'Match all/any' toggle. Users need to understand what parentheses mean. My concern: if we expose `( A OR B ) AND C` syntax, non-technical users may be confused by the grouping. I recommend we auto-create groups when users add OR between chips, rather than requiring manual parenthesis placement."

**Response (Frontend Engineer 1)**: Agreed. The OR constraint (only allowed in groups) naturally guides users — if they try to add OR at the top level, the validation error tells them it's not allowed. We'll provide a one-click "Group these filters" action to wrap selected chips in parentheses. The typed `field:value` query syntax is deferred to P1.

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

> "The Figma designs establish a clear visual language: chips with **blue-highlighted values** and inline operator text, where the operator is clickable for editing. The `×` close button is hover-only to save horizontal space — it overlaps adjacent badges. AND/OR connectors are plain text tokens between chips, and parentheses are subtle tokens. This is closer to Sentry's SearchQueryBuilder than Linear's minimal approach, but cleaner — the validation system (red OR tokens, error panel) prevents users from creating invalid expressions."

**Response (Team)**: The Figma design is the definitive reference. The visual model is: chips with blue values, inline operators, explicit AND/OR tokens, parenthetical grouping, and non-blocking inline validation.

---

## 10. Prioritized Feature Map

### P0 — Must Ship (Core Filtering)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Filter bar with chips | Inline chips with `Field operator Value` format, blue-highlighted values | Medium |
| Boolean expression model | Explicit AND/OR tokens between chips, parenthetical grouping | High |
| Inline operator dropdown | Click operator text on chip → is/is not/contains/does not contain | Medium |
| Filter palette | Categorized field list with recent expressions (click empty bar) | Medium |
| Enum value selector | Checkbox multi-select with `Cmd+Enter` hint | Medium |
| Text value input | Free-text input for Endpoint, Hostname, Parameter | Low |
| Inline validation | OR constraint checks, red tokens, error panel below bar | Medium |
| URL state sync | Bidirectional URL ↔ expression tree | High |
| Hover-only chip close | `×` appears on hover, overlaps adjacent badges | Low |
| Basic keyboard nav | Tab through chips, Escape to close, Enter to activate | Medium |
| Chart-click filtering | Click statistics chart elements to add filter chip | Low (existing) |
| Table context menu filtering | Right-click → "Filter by value" (is) / "Exclude value" (is not) | Low (existing) |
| Recent filters | Full expression presets with highlighted values | Low |
| Clear all | `×` button on far right removes all filters | Low |

### P1 — Should Ship (Power Features)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Query input mode | Typed `field:value` syntax with parsing into chips | High |
| Autocomplete/suggestions | Field names, operators, values with counts | High |
| Command palette integration | `Cmd+K` filter commands | Medium |
| `F` keyboard shortcut | Single-key filter palette activation | Low |
| Undo/redo | `Cmd+Z` / `Cmd+Shift+Z` for filter history | Medium |
| Saved views (full) | Create, name, share, duplicate, delete views | High |
| View presets | Built-in views (All, Blocked Today, Needs Attention, etc.) | Medium |
| Result count (live) | Show filtered result count with live announcements | Low |
| Additional filter fields | IP Address, Country, CWE, OWASP API, Requests, Sessions, dates | Medium |

### P2 — Nice to Have (Advanced)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Nested group nesting | Groups inside groups (multi-level boolean) | High |
| AI/NLQ filtering | Natural language → structured filter | High |
| Dynamic facet counts | Show matching count per value in palette | Medium |
| Filter suggestions | "People also filter by..." context suggestions | Medium |
| Mobile bottom sheet | Responsive filter builder for mobile | Medium |
| Pinned/disabled filters | Kibana-style individual filter controls | Medium |
| Cross-view filter comparison | Compare two views side by side | High |
| Dual mode toggle | Switch between tokenized chips and plain text query | Medium |

---

## 11. Open Questions & Risks

### Open Questions

1. **Filter persistence across page navigations**: When user navigates to `/attacks/[id]` detail page and back, should filters be restored from URL? (Recommendation: Yes, URL state survives navigation automatically.)

2. **Server-side vs client-side filtering**: The current spec uses client-side filtering with `useMemo`. At what data volume do we need server-side filtering? (Risk: performance with >10K records.)

3. **Group creation UX**: How does a user create a new parenthetical group? Options: (a) drag chips into a group, (b) select chips + "Group" action, (c) auto-group when OR is placed between chips. Figma shows the end state but not the creation flow.

4. **OR constraint rationale**: The Figma shows "OR cannot be used within the actuals query" — what exactly constitutes "actuals query"? Is this a backend constraint (API limitation) or a UX choice? Need to clarify the exact rules.

5. **Missing fields**: The Figma palette shows ~8 fields, but the data model has 16+. Are IP, Country, CWE, OWASP API, Requests, Sessions, First/Last Detected intentionally excluded from the primary palette, or are they accessible via search/scroll?

6. **`Search {object}` placeholder**: Does the placeholder text adapt to context (e.g., "Search attacks..." vs "Search sessions...")? Or is `{object}` a literal template to be replaced?

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Boolean expression tree complexity | High | Medium | Keep to single-level grouping (no nesting). Thorough unit tests for evaluation logic. |
| Expression ↔ URL serialization bugs | High | High | URL-as-source-of-truth. Round-trip tests for every expression shape. |
| OR constraint confusion | Medium | Medium | Inline validation with clear error messages. "Not allowed" tooltip. Auto-suggest grouping. |
| Keyboard shortcut conflicts | Medium | Medium | Context detection (input focused vs body focused). Test across OS/browsers. |
| Performance with many active filters | Medium | Low | Debounce filter application. Memoize expression evaluation. |
| Accessibility regressions | High | Medium | Automated axe-core in CI. Manual screen reader testing per sprint. |
| Scope creep from "one more filter feature" | High | High | Strict P0/P1/P2 prioritization. PM gates all additions. |
| Group creation UX unclear | Medium | Medium | Figma shows end state but not creation flow. Need design iteration on how users create groups. |

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
