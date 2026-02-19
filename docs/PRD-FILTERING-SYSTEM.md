# PRD: Complex Filtering System for Attacks Dashboard

**Author**: Product Manager
**Date**: 2026-02-19
**Status**: Draft → Team Review
**Phase**: Definition (Phase 2)
**Reference**: `DISCOVERY-RESEARCH-FINDINGS.md`, `attacks-SPEC.md`, Figma designs

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [User Personas](#3-user-personas)
4. [Jobs to Be Done](#4-jobs-to-be-done)
5. [Feature Requirements](#5-feature-requirements)
6. [Implementation Phases](#6-implementation-phases)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Technical Requirements](#8-technical-requirements)
9. [Success Metrics](#9-success-metrics)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Team Review & Sign-Off](#11-team-review--sign-off)

---

## 1. Problem Statement

Security operations teams need to rapidly triage, investigate, and respond to attacks across their infrastructure. The Attacks dashboard surfaces hundreds to thousands of attack records with 15+ attributes per record. **Without an effective filtering system, users waste time scrolling through irrelevant data, miss critical threats, and cannot share their investigation context with teammates.**

### Current Pain Points

1. **No structured filtering** — Users cannot slice attack data by multiple dimensions simultaneously
2. **No boolean logic** — Users cannot express "show me XSS OR BOLA attacks that are NOT blocked" in a single query
3. **No shareability** — Investigation context (what filters are applied) cannot be shared via URL
4. **No persistence** — Filter configurations are lost on page reload
5. **No progressive disclosure** — Power users and novices get the same (inadequate) experience

### Why Now

- The Attacks dashboard is the primary entry point for security operations
- Customer feedback consistently requests "better filtering" and "saved views"
- Competitor products (Sentry, Datadog, Cloudflare) all ship sophisticated filtering
- The Figma designs are finalized — we have a clear visual target

---

## 2. Goals & Non-Goals

### Goals

| # | Goal | Metric |
|---|------|--------|
| G1 | Users can filter attacks by any combination of attributes with boolean logic | 100% of filter fields functional |
| G2 | Filter state is shareable via URL | URL encodes full expression tree |
| G3 | Non-technical users can filter without learning syntax | Task completion >90% in usability test |
| G4 | Power users can construct complex boolean queries quickly | <10 seconds for 3-chip AND query via keyboard |
| G5 | The system validates invalid expressions and guides users | 0 silent failures from invalid filter state |
| G6 | Filter state persists across navigation and page reloads | URL state survives navigation |

### Non-Goals (Explicitly Out of Scope)

| # | Non-Goal | Rationale |
|---|----------|-----------|
| NG1 | Typed `field:value` query syntax | Deferred to P1 — chip-based interaction is the P0 primary |
| NG2 | AI/Natural language filtering | Deferred to P2 — requires significant backend investment |
| NG3 | Nested groups (groups within groups) | Single-level grouping is sufficient for P0; revisit if users request deeper nesting |
| NG4 | Server-side filtering | Current dataset fits in memory; revisit at >10K records |
| NG5 | Mobile-optimized filtering | Desktop-first; mobile is P2 |
| NG6 | `Cmd+K` command palette integration | P1 — requires separate command palette infrastructure |
| NG7 | Undo/redo (`Cmd+Z`) for filter changes | P1 — requires filter history stack |
| NG8 | Saved views CRUD | P1 — view tabs exist but full create/edit/delete workflow is separate |

---

## 3. User Personas

### Persona 1: Security Analyst (Primary)

- **Technical level**: Medium — understands HTTP, attack types, basic security concepts
- **Usage**: Daily, 2-4 hours/day on dashboard
- **Goals**: Triage new attacks, investigate patterns, escalate critical threats
- **Filtering needs**: Quick filters by status/impact, cross-reference type + country, save common investigation setups
- **Pain tolerance**: Low — needs to find things fast, will abandon slow/confusing tools

### Persona 2: Security Engineer (Power User)

- **Technical level**: High — writes regex, understands CWE/OWASP, reads raw logs
- **Usage**: Several times per week, deep investigation sessions
- **Goals**: Forensic investigation, pattern discovery, false positive identification
- **Filtering needs**: Complex boolean expressions, negation, combine 5+ filters, share investigation context
- **Pain tolerance**: Medium — willing to learn if it's powerful

### Persona 3: Team Lead / Manager (Occasional)

- **Technical level**: Low-Medium — knows concepts but not implementation details
- **Usage**: Weekly, quick checks and reviews
- **Goals**: Overview of threat landscape, check team response, executive reporting
- **Filtering needs**: Pre-built views, simple status filters, share filtered URLs in reports
- **Pain tolerance**: Very low — needs one-click presets and obvious UI

---

## 4. Jobs to Be Done

| Job | Trigger | Outcome |
|-----|---------|---------|
| **JTBD-1**: Filter by a single attribute | "I need to see only Blocked attacks" | One click: select Status → Blocked → chip appears |
| **JTBD-2**: Combine multiple filters (AND) | "Show me Blocked XSS attacks from China" | Three chips with AND connectors between them |
| **JTBD-3**: Use OR within a group | "Show me attacks that are XSS OR BOLA" | Group: `( Type is XSS OR Type is BOLA )` |
| **JTBD-4**: Negate a filter | "Show everything except Monitored" | Chip: `Status is not Monitored` |
| **JTBD-5**: Edit an existing filter | "Actually, add Blocked to the exclusion" | Click chip values → add value in dropdown |
| **JTBD-6**: Remove a single filter | "Remove the country filter" | Hover chip → click × |
| **JTBD-7**: Clear all filters | "Start over" | Click × on far right of bar |
| **JTBD-8**: Share investigation context | "Look at what I found" | Copy URL → paste to teammate → they see same filters |
| **JTBD-9**: Re-apply a recent filter | "Apply that filter I used earlier" | Click empty bar → Recent section → one-click apply |
| **JTBD-10**: Filter from a chart | "Filter to just 500 errors" | Click chart bar → chip auto-added |

---

## 5. Feature Requirements

### 5.1 Filter Bar (Container)

**Description**: The always-visible unified input surface that holds all active filter chips, boolean connectors, and the search placeholder.

**Requirements**:
- [ ] FR-BAR-1: Renders as a single-line input-like container below the page controls
- [ ] FR-BAR-2: Contains active filter chips, AND/OR tokens, parentheses, search placeholder, and clear-all button
- [ ] FR-BAR-3: Clicking empty space opens the filter palette dropdown
- [ ] FR-BAR-4: `×` button on the far right clears all filters
- [ ] FR-BAR-5: Wraps to multiple lines if chips exceed container width (no horizontal scroll)
- [ ] FR-BAR-6: Empty state shows only `Search {object} ...` placeholder with cursor-on-click behavior

### 5.2 Filter Chips

**Description**: Individual filter badges rendered inline in the bar, each representing one filter condition.

**Requirements**:
- [ ] FR-CHIP-1: Format: `Field operator Value1 or Value2` (e.g., `Status is not Monitoring or Blocked`)
- [ ] FR-CHIP-2: Values highlighted in **blue** text to distinguish from field/operator text
- [ ] FR-CHIP-3: Clicking operator text opens inline operator dropdown
- [ ] FR-CHIP-4: Clicking value text opens value selection dropdown for editing
- [ ] FR-CHIP-5: `×` close button appears **only on hover**, overlapping adjacent badges
- [ ] FR-CHIP-6: Clicking `×` removes the chip and its associated AND/OR connector
- [ ] FR-CHIP-7: Multi-value display: comma-separated for `is` operator, "or" keyword for `is not`
- [ ] FR-CHIP-8: Chip has subtle border/background to distinguish from surrounding text

### 5.3 Boolean Connectors (AND/OR Tokens)

**Description**: Explicit text tokens rendered between chips indicating boolean logic.

**Requirements**:
- [ ] FR-BOOL-1: AND connector rendered as plain text `AND` between chips/groups at top level
- [ ] FR-BOOL-2: OR connector rendered as plain text `OR` between chips within a group
- [ ] FR-BOOL-3: Default connector when adding a new chip is `AND`
- [ ] FR-BOOL-4: Connector is clickable — clicking toggles between AND and OR (within valid contexts)
- [ ] FR-BOOL-5: OR at top level (outside groups) triggers validation error (see §5.8)

### 5.4 Parenthetical Groups

**Description**: `( )` tokens that wrap a set of conditions joined by OR.

**Requirements**:
- [ ] FR-GROUP-1: Opening `(` and closing `)` rendered as subtle tokens in the bar
- [ ] FR-GROUP-2: Groups contain 2+ conditions joined by OR
- [ ] FR-GROUP-3: Groups connect to the rest of the expression with AND
- [ ] FR-GROUP-4: Single level of nesting only (no groups within groups)
- [ ] FR-GROUP-5: User can create a group by selecting chips and choosing "Group" (exact UX TBD — see Open Questions)
- [ ] FR-GROUP-6: User can ungroup by removing the parentheses (returns chips to top-level AND)

### 5.5 Filter Palette

**Description**: Dropdown that appears when clicking empty space in the filter bar, showing available filter fields organized by category.

**Requirements**:
- [ ] FR-PAL-1: Opens when clicking empty space in the filter bar
- [ ] FR-PAL-2: **Recent** section at top showing previously applied full filter expressions with blue-highlighted values
- [ ] FR-PAL-3: Clicking a recent filter re-applies the entire expression
- [ ] FR-PAL-4: **Attack characteristics** section: Attack type, Status, Blocking status, HTTP status code, Impact
- [ ] FR-PAL-5: **Target & Context** section: Endpoint, Hostname, Parameter
- [ ] FR-PAL-6: Selecting a field creates a new chip with default operator `is` and opens value selection
- [ ] FR-PAL-7: Keyboard navigable: arrow keys to move, Enter to select
- [ ] FR-PAL-8: Closes on Escape or clicking outside

### 5.6 Operator Dropdown

**Description**: Inline dropdown on each chip for changing the filter operator.

**Requirements**:
- [ ] FR-OP-1: Four operators: `is`, `is not`, `contains`, `does not contain`
- [ ] FR-OP-2: Opens when clicking the operator text in a chip
- [ ] FR-OP-3: Shows checkmark on the currently selected operator
- [ ] FR-OP-4: Selecting a new operator immediately updates the chip (no Apply needed)
- [ ] FR-OP-5: Dropdown closes after selection
- [ ] FR-OP-6: `contains` / `does not contain` available for all field types

### 5.7 Value Selection

**Description**: Dropdown for selecting filter values, appearing when creating or editing a chip.

**Requirements**:
- [ ] FR-VAL-1: **Enum fields** (Status, Type, Impact, HTTP status code, Blocking status): checkbox multi-select list
- [ ] FR-VAL-2: **Text fields** (Endpoint, Hostname, Parameter): free-text input with autocomplete
- [ ] FR-VAL-3: Keyboard hint at bottom: `⌘ ↵ to select multiple`
- [ ] FR-VAL-4: `Cmd+Enter` confirms multi-selection and closes dropdown
- [ ] FR-VAL-5: Clicking a checkbox toggles that value on/off
- [ ] FR-VAL-6: At least one value must be selected — empty chip is removed
- [ ] FR-VAL-7: Closes on Escape or clicking outside

### 5.8 Validation System

**Description**: Inline validation that catches invalid filter expressions and guides users to fix them.

**Requirements**:
- [ ] FR-VAL-ERR-1: OR at top level (outside groups) is invalid
- [ ] FR-VAL-ERR-2: Invalid OR token turns **red**
- [ ] FR-VAL-ERR-3: Hovering invalid OR shows **"Not allowed"** tooltip
- [ ] FR-VAL-ERR-4: Error panel appears below the filter bar with issue description
- [ ] FR-VAL-ERR-5: Error panel format: `⚠ Filter contain N issue(s): • "OR" operator cannot be used within the actuals query`
- [ ] FR-VAL-ERR-6: Filter bar border turns red when in error state
- [ ] FR-VAL-ERR-7: Validation is **non-blocking** — UI remains interactive
- [ ] FR-VAL-ERR-8: Error clears automatically when the issue is fixed

### 5.9 Filter Application (Data Filtering)

**Description**: The engine that evaluates the boolean expression tree against attack data.

**Requirements**:
- [ ] FR-APPLY-1: Evaluates expression tree recursively (AND = intersection, OR = union)
- [ ] FR-APPLY-2: `is` operator: exact match (value in selected values)
- [ ] FR-APPLY-3: `is not` operator: exclusion (value NOT in selected values)
- [ ] FR-APPLY-4: `contains` operator: substring match
- [ ] FR-APPLY-5: `does not contain` operator: negated substring match
- [ ] FR-APPLY-6: Filtering is applied client-side with `useMemo` (debounced at 100ms for rapid changes)
- [ ] FR-APPLY-7: All charts and statistics update in real-time after filtering
- [ ] FR-APPLY-8: Result count updates after filtering

### 5.10 URL State Synchronization

**Description**: Bidirectional sync between filter expression tree and URL params.

**Requirements**:
- [ ] FR-URL-1: Filter state is serialized to URL query params
- [ ] FR-URL-2: Simple AND-only queries use flat params: `?status=Blocked,Monitored&type=XSS`
- [ ] FR-URL-3: Complex expressions (with groups/OR) use a serialized format: `?filter=...`
- [ ] FR-URL-4: Page load deserializes URL params into expression tree
- [ ] FR-URL-5: Back/forward navigation restores previous filter state
- [ ] FR-URL-6: Shareable — copying URL and pasting in new tab reproduces exact filter state
- [ ] FR-URL-7: Invalid URL params are gracefully ignored (no crash, show empty filters)

### 5.11 Cross-Component Filtering

**Description**: Ability to add filters from sources other than the filter bar.

**Requirements**:
- [ ] FR-CROSS-1: **Chart click**: Clicking a chart bar/legend adds a `Field is Value` chip
- [ ] FR-CROSS-2: **Table context menu**: Right-click cell → "Filter by value" adds `Field is Value` chip
- [ ] FR-CROSS-3: **Table context menu**: Right-click cell → "Exclude value" adds `Field is not Value` chip
- [ ] FR-CROSS-4: Cross-component filters are added with AND at top level (appended to expression)
- [ ] FR-CROSS-5: Added chip scrolls into view and briefly highlights (150ms pulse animation)

### 5.12 Keyboard Navigation

**Description**: Full keyboard accessibility for all filter interactions.

**Requirements**:
- [ ] FR-KB-1: `Tab` moves focus between chips, connectors, search area, and clear button
- [ ] FR-KB-2: `Enter` on a chip opens its value editor
- [ ] FR-KB-3: `Backspace`/`Delete` on a focused chip removes it
- [ ] FR-KB-4: `Escape` closes any open dropdown/palette
- [ ] FR-KB-5: `F` key (when not in text input) opens filter palette
- [ ] FR-KB-6: Arrow keys navigate within dropdowns
- [ ] FR-KB-7: Focus returns to logical next element after chip removal

---

## 6. Implementation Phases

### Phase 1: Filter Bar Foundation + Single Chips (Sprint 1-2)

**Goal**: Users can add, edit, and remove individual filter chips connected by AND. The filter bar renders, chips display correctly, and data filters work.

**Scope**:

| Feature | Requirements | Complexity |
|---------|-------------|------------|
| Filter bar container | FR-BAR-1, FR-BAR-2, FR-BAR-6 | Medium |
| Filter palette (basic) | FR-PAL-1, FR-PAL-4, FR-PAL-5, FR-PAL-6, FR-PAL-7, FR-PAL-8 | Medium |
| Filter chips (display) | FR-CHIP-1, FR-CHIP-2, FR-CHIP-8 | Medium |
| Chip close button | FR-CHIP-5, FR-CHIP-6 | Low |
| Value selector (enum) | FR-VAL-1, FR-VAL-3, FR-VAL-4, FR-VAL-5, FR-VAL-6, FR-VAL-7 | Medium |
| AND connector (default) | FR-BOOL-1, FR-BOOL-3 | Low |
| Filter application engine | FR-APPLY-1, FR-APPLY-2, FR-APPLY-6, FR-APPLY-7, FR-APPLY-8 | Medium |
| Clear all | FR-BAR-4 | Low |

**Deliverables**:
1. `FilterBar` component (shadcn/ui `Card` or custom container)
2. `FilterChip` component (shadcn/ui `Badge` variant)
3. `FilterPalette` component (shadcn/ui `Popover` + `Command`)
4. `EnumValueSelector` component (shadcn/ui `Popover` + `Checkbox`)
5. `useFilterExpression` hook (expression tree state management)
6. `evaluateExpression()` utility (filter application logic)
7. Filter field schema definition (field names, types, allowed values)

**Exit criteria**: User can click empty bar → select Status → check Blocked → chip appears → data filters → click × → chip removed → data unfilters.

**shadcn/ui components to install**: `badge`, `popover`, `command`, `checkbox`, `button`

---

### Phase 2: Operators + Text Inputs + Chip Editing (Sprint 3)

**Goal**: Users can change operators on chips and filter by text fields. Full chip editing flow.

**Scope**:

| Feature | Requirements | Complexity |
|---------|-------------|------------|
| Operator dropdown | FR-OP-1 through FR-OP-6 | Medium |
| Click-to-edit chip operator | FR-CHIP-3 | Medium |
| Click-to-edit chip values | FR-CHIP-4 | Medium |
| `is not` operator logic | FR-APPLY-3 | Low |
| `contains` / `does not contain` | FR-APPLY-4, FR-APPLY-5 | Low |
| Text value input | FR-VAL-2 | Medium |
| Multi-value display (or/comma) | FR-CHIP-7 | Low |

**Deliverables**:
1. `OperatorDropdown` component (shadcn/ui `DropdownMenu`)
2. `TextValueInput` component (shadcn/ui `Input` with autocomplete `Popover`)
3. Updated `FilterChip` with clickable operator and value regions
4. Updated `evaluateExpression()` with all 4 operators

**Exit criteria**: User can add a chip → click "is" → change to "is not" → chip updates → data re-filters. User can add Endpoint filter → type text → chip appears with typed value.

**shadcn/ui components to install**: `dropdown-menu`, `input`

---

### Phase 3: Boolean Groups + OR Logic + Validation (Sprint 4-5)

**Goal**: Users can create parenthetical groups with OR logic. Validation prevents invalid expressions.

**Scope**:

| Feature | Requirements | Complexity |
|---------|-------------|------------|
| OR connector token | FR-BOOL-2, FR-BOOL-4, FR-BOOL-5 | Medium |
| Parenthetical groups | FR-GROUP-1 through FR-GROUP-6 | High |
| OR expression evaluation | FR-APPLY-1 (OR branch) | Medium |
| Validation: invalid OR | FR-VAL-ERR-1 through FR-VAL-ERR-8 | Medium |
| Connector click-to-toggle | FR-BOOL-4 | Low |

**Deliverables**:
1. `FilterGroup` component (renders `(` + chips + OR + chips + `)`)
2. `BooleanConnector` component (AND/OR token, clickable)
3. `ValidationPanel` component (shadcn/ui `Alert` variant)
4. `validateExpression()` utility (checks OR placement rules)
5. Updated `evaluateExpression()` with OR union logic
6. Group creation UX flow (TBD from design — select chips + "Group" or auto-group on OR)

**Exit criteria**: User can create `( Status is Blocked OR Type is XSS ) AND Country is not Italy`. OR at top level shows red token + error panel. Grouping/ungrouping works.

**shadcn/ui components to install**: `alert`, `tooltip`

---

### Phase 4: URL State + Recent Filters + Cross-Component (Sprint 6)

**Goal**: Filter state persists in URL, recent filters work, and filters can be triggered from charts/table.

**Scope**:

| Feature | Requirements | Complexity |
|---------|-------------|------------|
| URL serialization | FR-URL-1 through FR-URL-7 | High |
| Recent filters | FR-PAL-2, FR-PAL-3 | Medium |
| Chart-click filtering | FR-CROSS-1, FR-CROSS-5 | Low |
| Table context menu filtering | FR-CROSS-2, FR-CROSS-3, FR-CROSS-4 | Low |
| Filter bar line wrapping | FR-BAR-5 | Low |

**Deliverables**:
1. `useFilterURL` hook (bidirectional URL ↔ expression tree sync)
2. URL serialization/deserialization utilities
3. `RecentFilters` component (localStorage-based history)
4. Chart click handlers (add chip from chart interaction)
5. Table context menu filter/exclude actions
6. Chip highlight animation on addition

**Exit criteria**: Apply filters → URL updates → copy URL → open in new tab → same filters appear. Click chart bar → chip auto-added. Right-click table cell → "Filter by value" → chip added.

---

### Phase 5: Keyboard Navigation + Accessibility + Polish (Sprint 7)

**Goal**: Full keyboard accessibility, screen reader support, visual polish, and performance optimization.

**Scope**:

| Feature | Requirements | Complexity |
|---------|-------------|------------|
| Full keyboard navigation | FR-KB-1 through FR-KB-7 | Medium |
| Screen reader announcements | ARIA live regions for filter changes | Medium |
| Focus management | Focus returns to correct element after actions | Medium |
| `F` shortcut | FR-KB-5 | Low |
| Reduced motion support | `prefers-reduced-motion` | Low |
| Performance optimization | Debounce, memoize, optimize re-renders | Medium |

**Deliverables**:
1. `aria-label`, `role`, ARIA attributes on all filter components
2. `aria-live` region for filter change announcements
3. Focus trap in palette/dropdowns (via Radix UI)
4. Keyboard shortcut handler (context-aware, disabled when in text input)
5. Performance audit and optimization pass
6. Accessibility audit with axe-core

**Exit criteria**: Tab through all chips → Enter to edit → Escape to close → Backspace to delete. Screen reader announces "Filter added: Status is Blocked. 1 filter active." `F` opens palette when not in text input.

---

### Phase Summary

| Phase | Sprint | Focus | Key Risk |
|-------|--------|-------|----------|
| **Phase 1** | Sprint 1-2 | Foundation: bar + chips + palette + AND filtering | Component architecture choices lock in patterns |
| **Phase 2** | Sprint 3 | Operators + text inputs + editing | Operator dropdown positioning edge cases |
| **Phase 3** | Sprint 4-5 | Boolean groups + OR + validation | Group creation UX (not fully designed), expression evaluation complexity |
| **Phase 4** | Sprint 6 | URL state + recent + cross-component | URL serialization format for complex expressions |
| **Phase 5** | Sprint 7 | Keyboard + accessibility + polish | Screen reader behavior in complex expression trees |

### Dependency Graph

```
Phase 1 (Foundation)
  ├── Phase 2 (Operators + Editing)  ← depends on chip component from Phase 1
  │     └── Phase 3 (Groups + OR)    ← depends on operator logic from Phase 2
  │           └── Phase 4 (URL + Cross-component)  ← depends on expression tree from Phase 3
  └── Phase 5 (Keyboard + A11y)      ← can start in parallel with Phase 3-4, polished at end
```

---

## 7. Acceptance Criteria

### AC-1: Single Filter Flow

**Given** the filter bar is empty
**When** I click the empty area of the filter bar
**Then** the filter palette opens with Recent + Attack characteristics + Target & Context sections

**Given** the filter palette is open
**When** I click "Status"
**Then** a chip appears with `Status is |` and the value selector opens showing Monitoring, Blocked, Started checkboxes

**Given** the value selector is open for Status
**When** I check "Blocked" and press `Cmd+Enter`
**Then** the chip shows `Status is Blocked`, the dropdown closes, and the table shows only Blocked attacks

### AC-2: Multi-Filter AND Flow

**Given** I have `Status is Blocked` chip active
**When** I click empty space and select "Attack type" → check "XSS"
**Then** the bar shows `Status is Blocked AND Attack type is XSS` and the table shows only Blocked XSS attacks

### AC-3: Operator Change

**Given** I have `Status is Blocked` chip
**When** I click "is" in the chip
**Then** operator dropdown opens showing: is (✓), is not, contains, does not contain

**When** I select "is not"
**Then** the chip updates to `Status is not Blocked` and the table shows everything except Blocked attacks

### AC-4: Chip Removal

**Given** I have `Status is Blocked AND Attack type is XSS` active
**When** I hover over the Status chip
**Then** an `×` button appears on the chip

**When** I click `×`
**Then** the Status chip and its AND connector are removed, leaving `Attack type is XSS`

### AC-5: Clear All

**Given** I have 3 active filter chips
**When** I click the `×` on the far right of the filter bar
**Then** all chips are removed, the bar returns to empty state, and the table shows all attacks

### AC-6: Boolean Group (OR)

**Given** I have `Status is Blocked` and `Type is XSS` chips
**When** I group them and set the connector to OR
**Then** the bar shows `( Status is Blocked OR Type is XSS )`
**And** the table shows attacks that are EITHER Blocked OR XSS (union)

### AC-7: OR Validation

**Given** I have two chips at top level
**When** I click the AND connector and change to OR
**Then** the OR token turns red, "Not allowed" tooltip appears on hover, and error panel shows below the bar

### AC-8: URL Sharing

**Given** I have `Status is not Monitored AND Type is XSS` active
**When** I copy the browser URL
**Then** the URL contains encoded filter state (e.g., `?status__is_not=Monitored&type=XSS`)

**When** I paste the URL in a new browser tab
**Then** the filter bar shows the same chips and the table shows the same filtered data

### AC-9: Recent Filters

**Given** I previously applied `Status is Blocked`
**When** I click empty space in the filter bar
**Then** the palette shows "Status is Blocked" under the Recent section with blue-highlighted "Blocked"

**When** I click that recent filter
**Then** the chip `Status is Blocked` is applied immediately

### AC-10: Chart-Click Filtering

**Given** the Statistics card shows a "Top 5 Attack Types" chart
**When** I click the "XSS" bar
**Then** a new chip `Attack type is XSS` appears in the filter bar and data filters

### AC-11: Table Context Menu Filtering

**Given** I see a table row with Status "Blocked"
**When** I right-click the "Blocked" cell
**Then** a context menu appears with "Filter by value" and "Exclude value"

**When** I click "Exclude value"
**Then** a chip `Status is not Blocked` appears in the filter bar

---

## 8. Technical Requirements

### 8.1 Component Architecture

All components must be built with **shadcn/ui** as specified in `CLAUDE.md`:

| Component | shadcn/ui Base | Custom Behavior |
|-----------|---------------|-----------------|
| `FilterBar` | Custom container (with `cn()`) | Expression tree rendering, click-to-open palette |
| `FilterChip` | `Badge` (custom variant) | Clickable regions (operator, values), hover ×, blue value text |
| `FilterPalette` | `Popover` + `Command` | Categorized field list, recent filters, keyboard nav |
| `OperatorDropdown` | `DropdownMenu` | 4 operators with checkmark |
| `EnumValueSelector` | `Popover` + `Checkbox` list | Multi-select with Cmd+Enter hint |
| `TextValueInput` | `Input` + `Popover` (autocomplete) | Free-text with suggestions |
| `BooleanConnector` | Text span (styled) | Click to toggle AND/OR, red variant for invalid |
| `FilterGroup` | Custom container | `(` and `)` tokens, contains chips + OR connectors |
| `ValidationPanel` | `Alert` (destructive variant) | Error list below filter bar |

### 8.2 State Architecture

```
URL params (source of truth)
    ↕ useFilterURL() — bidirectional sync
FilterState { expression: FilterGroup }
    ↕ useFilterExpression() — tree manipulation
FilterBar UI (chips, connectors, groups)
    ↕ evaluateExpression() — data filtering
filteredAttacks[] → Table, Charts, Stats
```

**Zustand store** for ephemeral UI state:
- `isPaletteOpen`, `editingChipId`, `editingOperatorChipId`, `hoveredChipId`
- `validationErrors[]`
- NOT the expression tree itself (that's in URL)

### 8.3 Expression Tree Types

```typescript
interface FilterCondition {
  id: string
  field: string
  fieldLabel: string
  operator: "is" | "is_not" | "contains" | "does_not_contain"
  values: string[]
}

interface FilterGroup {
  id: string
  connector: "AND" | "OR"
  children: Array<FilterCondition | FilterGroup>
}

interface FilterState {
  expression: FilterGroup  // Root is always { connector: "AND", children: [...] }
}
```

### 8.4 Filter Field Schema

```typescript
interface FilterFieldDef {
  key: string           // e.g., "status"
  label: string         // e.g., "Status"
  category: "attack_characteristics" | "target_context"
  type: "enum" | "text"
  values?: string[]     // For enum fields: available options
}

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: "type",              label: "Attack type",       category: "attack_characteristics", type: "enum",  values: ["XSS", "SQL Injection", "BOLA Attack", ...] },
  { key: "status",            label: "Status",            category: "attack_characteristics", type: "enum",  values: ["Blocked", "Monitored", "Started"] },
  { key: "blocking_status",   label: "Blocking status",   category: "attack_characteristics", type: "enum",  values: ["Active blocking", "Passive monitoring", "Not configured"] },
  { key: "http_status_code",  label: "HTTP status code",  category: "attack_characteristics", type: "enum",  values: ["200", "401", "403", "404", "500"] },
  { key: "impact",            label: "Impact",            category: "attack_characteristics", type: "enum",  values: ["High", "Medium", "Low"] },
  { key: "endpoint",          label: "Endpoint",          category: "target_context",         type: "text" },
  { key: "hostname",          label: "Hostname",          category: "target_context",         type: "text" },
  { key: "parameter",         label: "Parameter",         category: "target_context",         type: "text" },
]
```

### 8.5 Performance Requirements

| Metric | Target |
|--------|--------|
| Filter application (1000 records) | <50ms |
| Chip render/update | <16ms (60fps) |
| URL sync (serialize + update) | <10ms |
| Palette open animation | 150ms (ease-out) |
| Chip appear animation | 150ms (ease-out, scale 0.95→1.0) |
| Chip remove animation | 100ms (ease-in) |

### 8.6 Testing Requirements

| Category | Tool | Coverage Target |
|----------|------|----------------|
| Unit tests (expression evaluation) | Vitest | 100% of operators and tree shapes |
| Component tests | Vitest + RTL | All chip states, palette interactions, operator dropdown |
| Integration tests (URL sync) | Vitest | Round-trip serialization for all expression shapes |
| E2E tests (user flows) | Playwright | All acceptance criteria (AC-1 through AC-11) |
| Accessibility | axe-core + manual VoiceOver | WCAG 2.1 AA on all components |
| Visual regression | Playwright screenshots | All chip variants, error states, empty state |

---

## 9. Success Metrics

### North Star Metric

**Filter adoption rate**: % of sessions that use at least one filter (target: >60% within 4 weeks of launch)

### Input Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first filter | <5 seconds | Analytics: time from page load to first chip added |
| Filters per session | >2 average | Analytics: count of chip additions per session |
| Filter error rate | <5% of sessions | Analytics: validation errors triggered / total sessions |
| URL share rate | >10% of filtered sessions | Analytics: URL copy events when filters active |
| Recent filter reuse | >30% of filter applications | Analytics: recent filter clicks / total filter additions |
| Zero-result rate | <10% of filter applications | Analytics: filter applied resulting in 0 rows |
| Clear-all rate | <20% (low = users are precise) | Analytics: clear-all clicks / total sessions with filters |

---

## 10. Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| R1 | Expression tree evaluation bugs (wrong results) | Critical | Medium | 100% unit test coverage for evaluateExpression(). Test all operator × group combinations. |
| R2 | URL serialization breaks on complex expressions | High | High | Define canonical URL format early. Round-trip tests. Graceful degradation for unparseable URLs. |
| R3 | Group creation UX unclear (not fully designed in Figma) | Medium | High | Prototype 2-3 approaches (auto-group, select+group, drag). Usability test before implementing. |
| R4 | OR constraint confuses users | Medium | Medium | Clear error messages. Tooltip explains why. Consider auto-suggesting "Group these filters" when user tries top-level OR. |
| R5 | Performance degrades with many chips (10+) | Medium | Low | Debounce expression evaluation. Memoize intermediate results. Test with 20 chips. |
| R6 | Keyboard navigation is complex in expression tree | Medium | Medium | Leverage Radix UI focus management. Test with VoiceOver in each phase. |
| R7 | Scope creep — "just add one more feature" | High | High | Strict phase boundaries. PM gates all additions. Non-goals are contractual. |

---

## 11. Team Review & Sign-Off

### UX Researcher Review

> **Challenge**: "The group creation UX is the biggest unknown. The Figma shows the end state beautifully but doesn't show how a user CREATES a group. Our research shows that 67% of users in Notion struggle with nested filter groups. I recommend we prototype and test 3 approaches before committing to Phase 3:
> (a) Auto-group when user clicks OR between top-level chips
> (b) Multi-select chips + 'Group' action button
> (c) Drag chips into a group zone
> Without user testing, we risk building something that looks powerful but confuses our primary persona (Security Analyst, medium technical level)."

**PM Response**: Agreed. We'll add a design spike in Sprint 3 (before Phase 3 implementation) to test group creation UX. The spike will produce a clickable prototype and 5 usability tests. Phase 3 is not blocked — we can start on OR evaluation and validation while UX is tested.

### Interaction Designer Review

> **Challenge**: "The hover-only × on chips (FR-CHIP-5) has an accessibility concern. Hover states are invisible to keyboard and screen reader users. We need an alternative discovery mechanism — I propose: (1) when a chip is focused via keyboard, the × becomes visible, and (2) pressing `Backspace`/`Delete` on a focused chip removes it. This preserves the clean visual while maintaining keyboard parity."

**PM Response**: Accepted. Updated FR-CHIP-5 to include keyboard focus visibility, and FR-KB-3 already covers `Backspace`/`Delete` removal.

### Frontend Engineer (UI) Review

> **Challenge**: "The expression tree rendering is the hardest component architecture problem here. A recursive React component tree (FilterGroup → FilterChip/FilterGroup → ...) with click handlers, dropdowns, and focus management at every level is prone to stale closure bugs and unnecessary re-renders. I recommend:
> (1) Use a flat array representation with `parentGroupId` for rendering, not a recursive tree
> (2) Keep the tree structure for evaluation only
> (3) Memoize each chip independently
> This prevents the entire bar from re-rendering when one chip changes."

**PM Response**: Accepted as a technical implementation detail. Flat rendering + tree evaluation is a good split. Frontend Engineer has ownership of this decision.

### Frontend Engineer (Data) Review

> **Challenge**: "URL serialization for complex expressions is the critical path risk. A group like `( status.is_not.Monitored,Blocked OR type.is.BOLA,XSS ) AND country.is_not.Italy` needs a URL format that is: (a) human-readable in the address bar, (b) copy-paste safe, (c) parseable without ambiguity. I recommend we define and freeze the URL format in Sprint 1 as an ADR, even though Phase 4 implements it. If we change the format later, all shared URLs break."

**PM Response**: Strong agree. Added to Phase 1 deliverables: **ADR for URL serialization format** must be written and approved before Phase 2 begins. The URL format is a contract.

### Backend Engineer Review

> **Challenge**: "The current plan is client-side filtering only. This works now but creates a hard ceiling at ~10K records. I recommend we design the expression tree types to be API-compatible from day one — meaning the same `FilterGroup` type can be sent as a POST body to a future `/api/attacks/filter` endpoint. This costs nothing now and saves a rewrite later."

**PM Response**: Agreed. The `FilterCondition` and `FilterGroup` types must be serializable to JSON for future API use. Added to Technical Requirements.

### QA Tester Review

> **Challenge**: "The acceptance criteria cover happy paths well but miss several edge cases I want to test:
> 1. What happens when I add the same field twice? (e.g., two Status chips)
> 2. What happens with 0 values selected (empty chip)?
> 3. What if I have only 1 chip in a group — is that valid?
> 4. What happens when I remove the last chip from a group?
> 5. Max chips limit — is there one?
> 6. What happens with very long field values in chips (e.g., a 200-char endpoint)?
>
> I need answers to write the test plan."

**PM Response**: Good catches. Answers:
1. **Duplicate fields**: Allowed — user may want `Status is Blocked AND Status is not Started` (AND of different operators). Same field + same operator = merge values into one chip.
2. **Empty chip (0 values)**: Remove the chip (FR-VAL-6 covers this)
3. **Single chip in group**: Automatically ungroup (remove parentheses) — a group requires 2+ children
4. **Last chip removed from group**: Ungroup remaining chip
5. **Max chips**: No hard limit, but we'll test with 20 chips for performance
6. **Long values**: Truncate with ellipsis in chip, show full value in tooltip on hover

### Project Manager Sign-Off

> "The PRD is solid. The phased approach is realistic — Phase 1 establishes the foundation, each subsequent phase adds a layer. The biggest risk is Phase 3 (group creation UX), which is mitigated by the design spike.
>
> **Action items before Phase 1 starts:**
> 1. ✅ ADR for URL serialization format
> 2. ✅ Design spike plan for group creation UX (can run parallel to Phase 1-2)
> 3. ✅ shadcn/ui components installed
> 4. ✅ Filter field schema agreed between PM and engineers
>
> **Timeline estimate**: 7 sprints (14 weeks at 2-week sprints). Phase 1 is the critical path — if it slips, everything slips."

---

## Appendix A: Open Questions

| # | Question | Owner | Deadline | Status |
|---|----------|-------|----------|--------|
| OQ-1 | How does a user create a boolean group? (auto-group on OR, select+group, or drag?) | Product Designer | Sprint 3 start | Open — design spike planned |
| OQ-2 | What is the exact OR constraint? Is "actuals query" a backend term or UX term? | PM + Backend | Sprint 1 | Open |
| OQ-3 | Are IP, Country, CWE, OWASP fields intentionally excluded from primary palette? | PM | Sprint 1 | Open |
| OQ-4 | Does `Search {object}` placeholder adapt to page context? | PM | Sprint 1 | Open |
| OQ-5 | Should duplicate same-field same-operator chips be auto-merged? | PM + Frontend | Sprint 2 | Open — PM leans yes |
| OQ-6 | Should recent filters persist across browser sessions (localStorage) or only in-memory? | PM | Sprint 4 | Open — PM leans localStorage |

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Chip** | A badge-shaped UI element in the filter bar representing one filter condition |
| **Connector** | An AND or OR token between chips or groups |
| **Group** | A set of chips wrapped in parentheses `( )`, joined by OR |
| **Expression tree** | The recursive data structure representing the full boolean filter state |
| **Palette** | The dropdown that appears when clicking empty bar space, showing available filter fields |
| **Operator** | The comparison type within a chip (is, is not, contains, does not contain) |

## Appendix C: Related Documents

| Document | Location |
|----------|----------|
| Discovery Research Findings | `docs/DISCOVERY-RESEARCH-FINDINGS.md` |
| Product Specification | `attacks-SPEC.md` |
| Figma Designs | `https://www.figma.com/design/VKb5gW46uSGw0rqrhZsbXT/WADS-Components?node-id=5824-78418` |
| Individual Research Files | `docs/research/` |
