# Research Analysis: Accessible, Keyboard-First Complex Filtering Systems

**Author**: Principal UX Researcher & Interaction Designer
**Date**: 2026-02-19
**Status**: Complete -- pending team review

---

## Table of Contents

1. [Keyboard-First Filtering Patterns](#1-keyboard-first-filtering-patterns)
2. [Query-Based vs Visual Filtering -- Bridging the Gap](#2-query-based-vs-visual-filtering----bridging-the-gap)
3. [Progressive Disclosure in Filtering](#3-progressive-disclosure-in-filtering)
4. [Accessibility (WCAG 2.1 AA+)](#4-accessibility-wcag-21-aa)
5. [Non-Technical User Accommodation](#5-non-technical-user-accommodation)
6. [Mobile/Responsive Filtering](#6-mobileresponsive-filtering)
7. [Performance Perception](#7-performance-perception)
8. [Consolidated Recommendations for This Project](#8-consolidated-recommendations-for-this-project)

---

## 1. Keyboard-First Filtering Patterns

### 1.1 Overall Keyboard Navigation Model

Complex filter UIs must support two distinct keyboard interaction layers:

**Layer 1: Structural Navigation** -- Moving between filter components (filter bar, individual filters, active filter chips, results area). This uses the Tab key and follows a logical, predictable tab order.

**Layer 2: Within-Component Navigation** -- Moving within a single filter (options in a dropdown, values in a combobox, dates in a calendar). This uses Arrow keys, Enter, Escape, and other component-specific keys.

**Recommended Tab Order for a Filter Bar:**

```
[Command Palette Trigger] -> [Quick Filter Toggles] -> [Filter Builder Button]
  -> [Active Filter Chip 1] [x] -> [Active Filter Chip 2] [x] -> ...
  -> [Clear All Button] -> [Results Count / Live Region] -> [Results Area]
```

Key principle from W3C APG: DOM focus stays on the container element (e.g., combobox input) while virtual focus moves through popup options via `aria-activedescendant`. This avoids complex focus trapping and keeps the interaction model predictable.

### 1.2 Standard Keyboard Shortcuts for Filtering

Based on analysis of Linear, GitHub, Notion, Superhuman, and VS Code patterns:

| Action | Shortcut | Precedent |
|--------|----------|-----------|
| Open command palette / filter search | `Cmd+K` or `/` | Linear, Slack, GitHub, Superhuman |
| Add a new filter | `F` | Linear |
| Remove all filters | `Shift+F` | Linear |
| Focus filter bar | `Cmd+Shift+F` or `/` | GitHub, Jira |
| Navigate between active filters | `Tab` / `Shift+Tab` | Standard web |
| Remove focused filter chip | `Backspace` or `Delete` | PatternFly, Material |
| Open filter value dropdown | `Enter` or `Space` or `Down Arrow` | W3C APG Combobox |
| Close dropdown / cancel | `Escape` | W3C APG |
| Select filter value | `Enter` | W3C APG |
| Navigate filter options | `Up Arrow` / `Down Arrow` | W3C APG Listbox |
| Clear current filter value | `Escape` (when in input) | Common pattern |
| Undo last filter action | `Cmd+Z` | Desktop convention |

**Critical design decision**: The `F` shortcut (Linear's approach) is excellent for keyboard power users but requires that focus is NOT on a text input. The system must detect context -- when typing in a search field, `F` is a character; when focused on the page body, `F` opens the filter builder. This is the same pattern VS Code uses for single-key shortcuts.

### 1.3 Command Palette (cmdk) Integration with Filtering

The command palette is the single most impactful pattern for keyboard-first filtering. Based on Superhuman's approach and cmdk library best practices:

**Architecture:**
- The command palette should be the ONE place users can both discover and apply filters
- Typing `Cmd+K` then `status:` should show status filter options
- Typing `Cmd+K` then `filter` should show all available filter operations
- Recently used filters should appear at the top of the palette

**Integration pattern:**

```
Cmd+K opens palette
  -> User types "status"
  -> Palette shows: "Filter by Status" group
    -> "Status is Open"
    -> "Status is Closed"
    -> "Status is In Progress"
  -> User types "status:open"
  -> Filter is applied immediately
  -> Palette closes, focus returns to previous position
```

**Discoverability**: Display keyboard shortcuts on the right side of each command item. As users discover commands through the palette, they learn the direct shortcuts. This is the "training wheels" pattern -- the palette teaches the shortcuts.

**Grouping**: Commands should be grouped logically:
- **Filters**: Add filter, remove filter, clear all filters
- **Views**: Saved filter sets, default view, create custom view
- **Recent**: Recently applied filter combinations

### 1.4 Focus Management in Multi-Filter Bars

When multiple active filters exist as chips/pills:

1. **Adding a filter**: After a filter is applied, focus should return to the filter builder trigger (NOT the new chip). This allows rapid sequential filter addition.
2. **Removing a filter via chip**: Focus should move to the next chip. If the last chip was removed, focus moves to the previous chip. If no chips remain, focus moves to the filter builder trigger.
3. **Clearing all filters**: Focus moves to the filter builder trigger.
4. **Editing a filter**: When a user activates a filter chip (Enter/Space), the edit popover opens with focus on the value input. Escape closes the popover and returns focus to the chip.

**ARIA pattern for the chip group:**

```html
<div role="group" aria-label="Active filters">
  <div role="list" aria-label="Applied filter conditions">
    <div role="listitem">
      <span>Status is Open</span>
      <button
        aria-label="Remove filter: Status is Open"
        aria-describedby="filter-chip-1-desc"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <!-- more chips -->
  </div>
  <button aria-label="Clear all filters">Clear all</button>
</div>
```

### 1.5 Keyboard Navigation in Filter Dropdowns with Search

For combobox-based filter value selection (the most common pattern), follow W3C APG Combobox with List Autocomplete:

**Input behavior:**
- Typing filters the option list in real-time
- `Down Arrow` moves virtual focus to first/next option
- `Up Arrow` moves virtual focus to previous option
- `Enter` selects the virtually focused option
- `Escape` closes the dropdown, restoring the previous value
- `Home` / `End` move cursor within the text input (not the list)

**Critical implementation detail**: Use `aria-activedescendant` on the input to manage virtual focus. Do NOT move DOM focus into the listbox. This keeps the user's cursor in the search input while they arrow through options.

```html
<div role="combobox" aria-expanded="true" aria-haspopup="listbox">
  <input
    type="text"
    aria-autocomplete="list"
    aria-controls="filter-options-list"
    aria-activedescendant="option-3"
    placeholder="Search status values..."
  />
</div>
<ul id="filter-options-list" role="listbox" aria-label="Status options">
  <li id="option-1" role="option">Open</li>
  <li id="option-2" role="option">In Progress</li>
  <li id="option-3" role="option" aria-selected="true">Closed</li>
</ul>
```

### 1.6 Arrow Key Navigation in Filter Builders

For filter builders with multiple rows (field + operator + value):

- `Tab` moves between field/operator/value within a row
- `Enter` on the last value confirms the row and adds a new empty row
- `Backspace` on an empty row removes it and focuses the previous row's value
- `Up/Down Arrow` within the builder moves between rows (only when not inside a dropdown)

This follows the grid navigation pattern from W3C APG, treating the filter builder as a logical grid where each row is a filter condition and each column is a property of that condition.

---

## 2. Query-Based vs Visual Filtering -- Bridging the Gap

### 2.1 The Dual-Mode Paradigm

The best filtering systems offer BOTH a text query interface and a visual UI, with bi-directional synchronization. This is not optional for a developer-facing tool -- technical users expect query syntax; non-technical users need visual affordances.

**Reference implementations studied:**
- **Jira JQL**: Toggle between "Basic" (visual dropdowns) and "Advanced" (JQL text) with bi-directional sync
- **GitHub Issues**: Unified search bar with `qualifier:value` syntax that also shows visual filter pills
- **Kibana KQL**: Text query bar with autocomplete that syncs with visual filter controls
- **Linear**: Keyboard-first with both `F` shortcut (visual) and command palette (text-like) approaches

### 2.2 Bi-Directional Sync Architecture

The critical technical challenge is maintaining consistency between the query string and visual state:

**Source of truth**: URL parameters. Both the visual UI and query text are derived from and write to URL params. This ensures:
- Shareable filter states (copy URL)
- Browser back/forward works
- Bookmarkable filtered views
- SSR-compatible initial state

**Sync flow:**

```
User types query text
  -> Parse query to AST (abstract syntax tree)
  -> Validate AST against schema
  -> Convert AST to URL params
  -> URL params update visual filter chips
  -> Visual chips reflect query state

User clicks visual filter
  -> Update URL params
  -> URL params regenerate query text
  -> Query text reflects visual state
```

**Error handling**: When a user types an invalid query, show inline validation errors WITHOUT destroying the visual filter state. Use a "draft" model -- the text input is a draft that only commits to the shared state when valid.

### 2.3 Mode Switching UX

**Recommendation: Unified bar with progressive disclosure, NOT a toggle.**

The Jira-style toggle ("Basic" / "Advanced") creates a jarring context switch. Better approaches:

1. **GitHub model**: A single input bar that accepts both free text and structured `field:value` syntax. Typed qualifiers appear as visual chips when confirmed. This is the recommended approach.

2. **Inline expansion**: Start with chips, allow typing in the same bar. When the user starts typing a recognized field name followed by `:`, transition smoothly into query mode for that segment.

3. **Command palette as bridge**: `Cmd+K` provides the text-query experience without replacing the visual UI. This coexists naturally.

**Anti-pattern to avoid**: Separate "basic" and "advanced" tabs/views that show completely different UIs. Research shows users get lost switching between them and do not develop coherent mental models.

### 2.4 Making Query Syntax Discoverable

For non-technical users who see a text input:

1. **Placeholder text with examples**: `Filter by typing: status:open assignee:me priority:high`
2. **Autocomplete with context**: When user types `s`, suggest `status:` with a description "Filter by status"
3. **Inline help chips**: Below the input, show clickable chips like `status:` `assignee:` `date:` that insert the qualifier
4. **Syntax highlighting**: Color-code field names, operators, and values differently in the input
5. **Error tooltips**: When syntax is wrong, show a non-blocking tooltip: "Did you mean `status:open`?"
6. **Documentation link**: A small `?` icon linking to query syntax reference

### 2.5 Syntax Highlighting in Filter Inputs

Implement via a layered approach (overlay technique):

```
[Hidden textarea for actual input] -- handles typing, selection, cursor
[Visible div with highlighted spans] -- positioned exactly over the textarea
```

Color scheme (using CSS variables for theming):

| Token Type | Light Theme | Dark Theme | Semantic Meaning |
|------------|-------------|------------|------------------|
| Field name | `hsl(var(--primary))` | `hsl(var(--primary))` | What property to filter |
| Operator | `hsl(var(--muted-foreground))` | `hsl(var(--muted-foreground))` | How to compare |
| Value | `hsl(var(--foreground))` | `hsl(var(--foreground))` | What to match |
| Invalid | `hsl(var(--destructive))` | `hsl(var(--destructive))` | Syntax error |

### 2.6 Auto-Suggest and Type-Ahead Patterns

Based on analysis of ASOS, GitHub, and Kibana implementations:

1. **Field suggestions**: After typing 1+ characters, show matching field names with descriptions
2. **Operator suggestions**: After selecting a field, show valid operators for that field type (`=`, `!=`, `>`, `<`, `contains`, `in`)
3. **Value suggestions**: After selecting an operator, show known values for that field (fetched from API)
4. **Recent queries**: Show recently used complete queries at the top of suggestions
5. **Popular queries**: Show frequently used queries across all users

**Timing**: Show suggestions after 150ms of inactivity (not on every keystroke). Clear suggestions when the user is actively typing, reshow on pause.

**Accessibility for auto-suggest**: Announce the number of suggestions: "3 suggestions available. Use arrow keys to navigate." Use `aria-live="polite"` for the count and `aria-activedescendant` for navigation.

---

## 3. Progressive Disclosure in Filtering

### 3.1 The Layered Approach

Filtering complexity should be revealed in layers, matching user expertise and task complexity:

**Layer 0 -- Passive Filters (No interaction required)**
Smart defaults based on context. Examples:
- "Showing issues assigned to you" (default view)
- "Showing open issues" (most common state)
- Pre-applied filters that match 80% of use cases

**Layer 1 -- Quick Filters (Single click/tap)**
High-frequency filters exposed as toggle buttons or chips directly in the UI:
- Status toggles: Open | Closed | All
- Time presets: Today | This Week | This Month
- Ownership: Mine | Team | All

These require NO dropdown interaction -- just a click/tap. Implementation: `ToggleGroup` from shadcn/ui.

**Layer 2 -- Standard Filters (One dropdown interaction)**
The filter bar with dropdown selectors:
- Status (multi-select combobox)
- Assignee (searchable combobox)
- Priority (select)
- Labels (multi-select with search)
- Date range (date picker)

**Layer 3 -- Advanced Filters (Multi-step builder)**
For power users:
- Custom field + operator + value combinations
- AND/OR/NOT logic
- Nested groups
- Query text input

**Layer 4 -- Saved Filters (Reusable configurations)**
Named filter sets that persist across sessions.

### 3.2 Quick Filters vs Advanced Filters

**Quick filters** should be:
- Visible by default (no click to reveal)
- Limited to 3-5 options maximum
- The most frequently used filters (determined by analytics)
- Toggleable (click to apply, click again to remove)
- Visually distinct when active (filled vs outlined state)

**Advanced filters** should be:
- Hidden behind an "Add filter" or "More filters" button
- Opened in a popover, sheet, or dedicated panel
- Capable of complex logic (AND/OR, nested conditions)
- Accompanied by a visual builder for non-technical users

**Transition pattern**: "Show more filters" link that smoothly reveals Layer 2 filters. An "Advanced" button that opens the Layer 3 builder. Never force users through layers they do not need.

### 3.3 When to Show/Hide Filter Operators

**Hide operators when:**
- The filter type implies the operator (a status multi-select is always "is one of")
- The user base is primarily non-technical
- Quick filter mode is active

**Show operators when:**
- The user enters advanced filter mode
- The field type supports multiple operators (date: before, after, between, exactly)
- The user has previously used operators (progressive profiling)
- A numeric or date field is selected

**Default operator per field type:**

| Field Type | Default Operator | Available Operators |
|------------|-----------------|---------------------|
| Enum/Status | `is` | is, is not |
| Text | `contains` | contains, does not contain, is exactly, starts with |
| Number | `=` | =, !=, >, <, >=, <=, between |
| Date | `is in the last` | before, after, between, exactly, in the last, in the next |
| User/Assignee | `is` | is, is not, is any of, is none of |
| Boolean | (implicit toggle) | is true, is false |
| Array/Tags | `includes any of` | includes any of, includes all of, does not include |

### 3.4 AND/OR/NOT Logic -- Visual Handling

This is the single most dangerous UX territory in filtering. Research is unambiguous: **most users do not understand boolean logic correctly.**

Nielsen Norman Group research confirms: users think "AND" widens results (like adding items to a shopping cart), when it actually narrows them. The word "OR" feels exclusive to users, when in boolean logic it is inclusive and widening.

**Recommended approach -- avoid boolean terminology:**

1. **Default to AND (implicit)**: All filters are combined with AND. Show "All of the following must match" or simply stack filters vertically with no connector word.

2. **Use natural language for OR**: Instead of "Status = Open OR Status = Closed", show "Status is any of: Open, Closed". The multi-select combobox pattern naturally expresses OR within a single field.

3. **Use "except" for NOT**: Instead of "NOT Status = Closed", show "Status is not Closed" or "Exclude: Closed".

4. **Group visualization**: Use indentation and visual containers (cards/boxes) to show grouping:

```
All of these conditions:
  +---------------------------+
  | Status is any of: Open, In Progress |
  +---------------------------+
  +---------------------------+
  | Priority is High          |
  +---------------------------+
  +---------------------------+
  | Assignee is me            |
  +---------------------------+
```

5. **AND/OR toggle (advanced mode only)**: If a boolean connector is necessary, place it as a selectable pill BETWEEN filter rows, defaulting to "AND". Make it a `ToggleGroup` with exactly two options: "and" (match all) vs "or" (match any).

### 3.5 Nested/Grouped Filter Conditions

**When they are necessary:**
- When users need to express "( A AND B ) OR ( C AND D )"
- Enterprise reporting and analytics tools
- When saved filters are combined

**When they are NOT necessary (and should be avoided):**
- Consumer-facing product filters
- Default view for any user
- When the data model does not require it

**If nesting IS required**, use the visual grouping pattern:

```
Match ALL of:
  +-- Group 1 (Match ANY of:) ---------+
  |  Status is Open                     |
  |  Status is In Progress              |
  +-------------------------------------+
  +-- Group 2 ---------------------+
  |  Priority is High              |
  +--------------------------------+
```

Allow drag-and-drop to reorder conditions and move them between groups. Provide "Add group" and "Ungroup" actions. Limit nesting to 2 levels maximum -- deeper nesting is virtually never needed and creates enormous cognitive load.

---

## 4. Accessibility (WCAG 2.1 AA+)

### 4.1 ARIA Patterns for Filter UI Components

#### Filter Bar Container

```html
<div
  role="search"
  aria-label="Filter issues"
>
  <div role="toolbar" aria-label="Quick filters" aria-orientation="horizontal">
    <!-- Quick filter toggles -->
  </div>
  <div role="group" aria-label="Active filters">
    <!-- Filter chips -->
  </div>
  <button aria-label="Add filter">Add filter</button>
  <button aria-label="Clear all filters">Clear all</button>
</div>
```

The `role="search"` landmark gives screen reader users a way to jump directly to filtering. The `role="toolbar"` on quick filters enables Arrow key navigation between toggles.

#### Active Filter Chips

```html
<div role="group" aria-label="Active filters, 3 applied">
  <ul role="list">
    <li role="listitem">
      <span id="chip-1-label">Status is Open</span>
      <button
        aria-labelledby="chip-1-remove chip-1-label"
        id="chip-1-remove"
      >
        <span class="sr-only">Remove filter:</span>
        <span aria-hidden="true">&times;</span>
      </button>
    </li>
  </ul>
</div>
```

The `aria-labelledby` pattern (referencing both the remove button's own ID and the chip label ID) produces the announcement: "Remove filter: Status is Open, button".

#### Filter Combobox (Value Selection)

Follow the W3C APG Combobox with List Autocomplete pattern exactly:

```html
<div class="filter-field">
  <label id="status-label" for="status-input">Status</label>
  <div
    role="combobox"
    aria-expanded="true"
    aria-owns="status-listbox"
    aria-haspopup="listbox"
  >
    <input
      id="status-input"
      type="text"
      aria-autocomplete="list"
      aria-controls="status-listbox"
      aria-activedescendant="status-option-2"
      aria-labelledby="status-label"
    />
  </div>
  <ul
    id="status-listbox"
    role="listbox"
    aria-label="Status options"
  >
    <li id="status-option-1" role="option" aria-selected="false">Open</li>
    <li id="status-option-2" role="option" aria-selected="true">In Progress</li>
    <li id="status-option-3" role="option" aria-selected="false">Closed</li>
  </ul>
</div>
```

For multi-select comboboxes, add `aria-multiselectable="true"` to the listbox and use `aria-selected` on each option to indicate selection state.

#### AND/OR Toggle

```html
<div
  role="radiogroup"
  aria-label="Filter condition logic"
>
  <label>
    <input type="radio" name="logic" value="and" checked />
    <span>Match all conditions</span>
  </label>
  <label>
    <input type="radio" name="logic" value="or" />
    <span>Match any condition</span>
  </label>
</div>
```

Using native radio inputs with `role="radiogroup"` (or Radix ToggleGroup which implements the radio pattern) provides keyboard arrow navigation and clear state announcement. Avoid custom toggle implementations that lose this semantic.

### 4.2 Screen Reader Announcements

#### Filter Application Results

Use `aria-live="polite"` for non-critical updates (result count changes) and `aria-live="assertive"` ONLY for zero-result states:

```html
<!-- Polite: result count updates -->
<div
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
  id="filter-results-announcement"
>
  47 issues match your filters
</div>

<!-- Assertive: zero results warning -->
<div
  aria-live="assertive"
  aria-atomic="true"
  class="sr-only"
  id="filter-empty-announcement"
>
  <!-- Only populated when results are zero -->
</div>
```

**Announcement text patterns:**
- Filter applied: "[N] results match your filters"
- Filter removed: "Filter removed. [N] results."
- No results: "No results match your current filters. Try removing some filters."
- Loading: "Loading filtered results..."

**Debouncing announcements**: When multiple filters change rapidly (e.g., typing in a search field), debounce the live region update by 500ms. This prevents screen reader announcement storms.

Implementation note from Sara Soueidan's research: Insert a 350-500ms delay before clearing live region content, and compose the complete message atomically before inserting into the DOM.

#### Filter Addition/Removal

```html
<!-- When a filter chip is added -->
<div aria-live="polite" class="sr-only">
  Filter added: Status is Open. 3 filters active.
</div>

<!-- When a filter chip is removed -->
<div aria-live="polite" class="sr-only">
  Filter removed: Priority is High. 2 filters active.
</div>
```

### 4.3 Focus Management Specification

| User Action | Focus Destination | Rationale |
|-------------|------------------|-----------|
| Apply filter from dropdown | Filter builder trigger (add filter button) | Enables rapid sequential filter addition |
| Remove filter chip via keyboard | Next chip in list; if last, previous chip; if none, add filter button | Maintains spatial context |
| Clear all filters | Add filter button | Restores starting point |
| Open filter dropdown | Combobox input field | Ready for immediate typing |
| Close filter dropdown (Escape) | The trigger that opened it | Standard escape behavior |
| Open command palette | Command palette input | Ready for immediate typing |
| Close command palette (Escape) | Previously focused element | Restore prior context |
| Apply filter from command palette | Previously focused element (before palette opened) | Non-disruptive |
| Error in filter value | The input with the error | Allow immediate correction |

### 4.4 Color Contrast Requirements

**WCAG 1.4.3 (Text Contrast):**
- Normal text in filter chips: 4.5:1 minimum against chip background
- Large text (18px+ or 14px+ bold): 3:1 minimum

**WCAG 1.4.11 (Non-Text Contrast):**
- Filter chip borders/boundaries: 3:1 against adjacent background
- Active/selected state visual indicator: 3:1 against inactive state
- Focus indicator: 3:1 against adjacent colors

**Filter chip state color guidance:**

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Active/Applied | `hsl(var(--primary))` | `hsl(var(--primary-foreground))` | none (filled) |
| Inactive/Available | `hsl(var(--secondary))` | `hsl(var(--secondary-foreground))` | `hsl(var(--border))` |
| Hover | `hsl(var(--accent))` | `hsl(var(--accent-foreground))` | `hsl(var(--border))` |
| Focused | any above + focus ring | any above | `hsl(var(--ring))` 2px |
| Disabled | `hsl(var(--muted))` | `hsl(var(--muted-foreground))` | none |

**Important WCAG note**: Disabled elements are exempt from contrast requirements per WCAG 2.1. However, best practice (and our recommendation) is to maintain at least 3:1 contrast on disabled chips so users can still READ the content, even though they cannot interact.

**Never use color alone to convey filter state.** Every active filter must have a non-color indicator: filled background (vs outlined for inactive), a checkmark icon, different font weight, or explicit text label.

### 4.5 Accessible Error Messaging for Invalid Filter Values

```html
<div class="filter-field">
  <label for="date-input" id="date-label">Date</label>
  <input
    id="date-input"
    type="text"
    aria-labelledby="date-label"
    aria-describedby="date-hint date-error"
    aria-invalid="true"
  />
  <span id="date-hint" class="hint-text">Format: YYYY-MM-DD</span>
  <span id="date-error" role="alert" class="error-text">
    Invalid date format. Use YYYY-MM-DD.
  </span>
</div>
```

The `aria-describedby` references BOTH the hint and the error, so screen readers announce: "Date, edit text, Format YYYY-MM-DD, Invalid date format. Use YYYY-MM-DD."

The `role="alert"` on the error container ensures the error is announced immediately when it appears (equivalent to `aria-live="assertive"`).

---

## 5. Non-Technical User Accommodation

### 5.1 Natural Language Filtering

The gold standard is accepting natural-language-like queries and translating them to structured filters:

**Input**: "show me high priority bugs from last week"
**Parsed to**: Priority = High AND Type = Bug AND Created >= 7 days ago

**Implementation approach (feasible without AI):**
1. Tokenize the input
2. Match tokens against known field names and values using fuzzy matching
3. Infer operators from context words ("from" = date range, "high" = priority value)
4. Show the interpreted structured filter to the user for confirmation
5. Let the user correct any misinterpretation

**Simpler alternative (recommended for v1):**
Instead of full NLP, provide smart suggestions:
- User types "last week" -> suggest "Created: Last 7 days" filter
- User types "my bugs" -> suggest "Assignee: me AND Type: Bug"
- User types "urgent" -> suggest "Priority: High OR Priority: Critical"

### 5.2 Filter Suggestions Based on Context

**"People also filter by..." pattern:**
Analyze common filter combinations across users and suggest them:

```
Suggested filters based on your current view:
  [+ Priority is High]  [+ Created this week]  [+ Assigned to me]
```

**Context-aware suggestions:**
- On a sprint board: suggest sprint-related filters first
- On a bug list: suggest severity, component, version
- After applying one filter: suggest frequently co-applied filters

### 5.3 Visual Cues That Teach Filter Syntax

1. **Ghost text in the input**: Show `status:open` in lighter text as a typing example
2. **Inline syntax badges**: Below the filter input, show clickable qualifier badges:
   ```
   Try: [status:] [assignee:] [priority:] [label:] [date:]
   ```
3. **Contextual tooltips on filter chips**: When hovering over a chip, show "You can also type: status:open"
4. **First-run tutorial**: On first visit, show a brief overlay: "Type field:value to filter, or use the buttons below"

### 5.4 Undo/Redo for Filter Operations

Implement a filter history stack:

```typescript
interface FilterHistoryEntry {
  filters: FilterState;
  timestamp: number;
  description: string; // "Added filter: Status is Open"
}

// Stack operations
push(entry: FilterHistoryEntry): void;
undo(): FilterHistoryEntry | null;  // Ctrl+Z
redo(): FilterHistoryEntry | null;  // Ctrl+Shift+Z
```

**UI integration:**
- `Cmd+Z` undoes last filter change (with announcement: "Undo: removed filter Status is Open")
- `Cmd+Shift+Z` redoes
- Optional: Show a small "Undo" toast after each filter change (like Gmail's "Message sent" undo)

### 5.5 Recent Filters and Popular Filters

**Recent filters (per user):**
Store the last 10 filter combinations in localStorage (or server-side for cross-device):

```
Recent filters:
  [Status: Open, Priority: High] -- used 2 hours ago
  [Assignee: me, Sprint: Current] -- used yesterday
  [Label: bug, Status: Open] -- used 3 days ago
```

**Popular filters (across users):**
Track filter combination frequency server-side:

```
Popular filters:
  [My open issues] -- used by 85% of users
  [High priority bugs] -- used by 62% of users
  [Recently updated] -- used by 54% of users
```

Both should be accessible from the command palette and the filter builder dropdown.

### 5.6 Patterns from Notion and Airtable

**Notion's approach:**
- Filter builder uses a simple row-based UI: Field -> Operator -> Value
- Each row is a condition; rows are implicitly ANDed
- The "Add filter" button adds a new row
- Operator selection uses a simple `Select` dropdown (not combobox)
- Values use type-appropriate inputs (date picker for dates, multi-select for tags)
- No query language exposed -- fully visual

**Airtable's approach:**
- Similar row-based builder but with explicit AND/OR connectors between rows
- "Add filter group" creates a nested AND/OR group
- Pre-built "views" act as saved filter sets
- More powerful but steeper learning curve
- Now using AI (Airtable Copilot) for natural language filter creation

**Synthesis for our project:**
- Default to Notion's simpler row-based pattern (implicit AND)
- Offer Airtable-style grouping ONLY in advanced mode
- Provide a query text input for technical users alongside the visual builder
- Use command palette as the bridge between text and visual modes

### 5.7 Smart Defaults

Reduce the need for manual filtering:

1. **Contextual defaults**: Default to showing "my items" when on a personal dashboard, "all items" when on a team view
2. **Remembered last view**: Return to the user's last filter state when they revisit a page (stored in URL params)
3. **Intelligent ordering**: Sort filter options by frequency of use, not alphabetically (for short lists)
4. **Pre-filtered navigation**: Navigation items like "My Issues" and "High Priority" are just pre-configured filter sets disguised as navigation

---

## 6. Mobile/Responsive Filtering

### 6.1 Responsive Adaptation Strategy

| Breakpoint | Filter UI Pattern |
|------------|------------------|
| Desktop (>1024px) | Horizontal filter bar with inline dropdowns, visible quick filters, visible chip group |
| Tablet (768-1024px) | Collapsible filter bar, quick filters as icon-only toggles, chips scroll horizontally |
| Mobile (<768px) | Filter trigger button with count badge, full-screen bottom sheet for filter builder |

### 6.2 Bottom Sheet Pattern for Mobile

**Trigger:**
```
[Filter (3)] -- button with applied filter count badge
```

**Bottom sheet structure:**
```
+----------------------------------+
| Filters                    [x]   |  <- Header with close
+----------------------------------+
| Quick filters:                   |
| [Open] [Closed] [All]           |  <- Horizontal scroll
+----------------------------------+
| Status          [Any status  v]  |
| Assignee        [Anyone      v]  |
| Priority        [Any priority v] |
| Date range      [Any time    v]  |
+----------------------------------+
| + Add filter                     |
+----------------------------------+
| [Clear all]    [Show 47 results] |  <- Sticky footer
+----------------------------------+
```

**Key mobile considerations:**
1. **Bottom sheet, not modal dialog**: The bottom sheet pattern keeps content anchored to the thumb zone and allows partial dismissal (drag down to close). Use the `Sheet` component from shadcn/ui.
2. **Sticky apply button with result count**: Always show "Show N results" at the bottom so users see the impact of their selections before applying. Update this count in real-time.
3. **Full-screen expansion**: When a filter value dropdown opens, it should take full screen on mobile (not a tiny popover). This provides ample touch target area.
4. **Touch targets**: All interactive elements must be at least 44x44px (WCAG 2.5.5, AAA target size -- recommended even for AA compliance on mobile).
5. **Swipe to dismiss chips**: On mobile, active filter chips should be swipe-to-dismiss (left swipe removes the filter).
6. **No split-screen**: Avoid showing filter panel and results simultaneously on mobile. Use the full-screen overlay pattern with an "Apply" button that returns to results.

### 6.3 Touch-Friendly Filter Interactions

- **Slider ranges**: Use wide track areas (at least 44px height) for touch interaction. Show numeric inputs alongside for precise value entry.
- **Multi-select**: Use full-height checkboxes in a scrollable list, not tiny pills.
- **Date selection**: Use a full calendar view, not a date text input.
- **Toggle filters**: Use large toggle buttons (not small radio buttons).

---

## 7. Performance Perception

### 7.1 Optimistic Filter Application

While true optimistic updates are generally inappropriate for filter operations (since results depend entirely on server data), there are optimistic techniques that improve perceived performance:

1. **Optimistic chip rendering**: When a user selects a filter value, immediately render the filter chip (visual confirmation) while the results are still loading. The chip says "Status: Open" immediately; the results area shows a loading state.

2. **Optimistic result count removal**: When adding a restrictive filter, immediately reduce the displayed count by an estimated percentage while the real count loads. This provides instant visual feedback that the filter is "working."

3. **Optimistic sort indicator**: When changing sort order, immediately show the sort indicator on the column while re-fetching data.

### 7.2 Debouncing vs Instant Filtering

| Scenario | Strategy | Timing |
|----------|----------|--------|
| Toggle filter (click) | Instant | 0ms delay -- apply immediately |
| Single-select dropdown | Instant | 0ms -- apply on selection |
| Multi-select dropdown | Debounced apply | 500ms after last selection, OR on dropdown close |
| Text search input | Debounced | 300ms after last keystroke |
| Slider/range | Debounced | 200ms after last drag movement |
| Date range picker | On confirmation | Apply when both dates selected, or on "Apply" click |
| Query text input | Debounced | 500ms after last keystroke |
| Batch filter builder | Manual apply | Only on "Apply" button click |

**Critical UX rule**: Even when using debounced server requests, provide INSTANT visual feedback. The filter chip should appear immediately; only the results area should show a loading state.

### 7.3 Loading Indicators During Filter Application

**Tiered loading strategy:**

1. **0-100ms**: No indicator. Most client-side filter operations complete within this window. Showing a spinner for <100ms creates visual noise.

2. **100-300ms**: Subtle indicator. Reduce opacity of the results area to 60% (CSS `opacity: 0.6` with a transition). This signals "updating" without a jarring spinner. The filter bar remains fully interactive.

3. **300ms+**: Skeleton loader. Replace results with skeleton placeholders matching the result layout dimensions. Continue showing the filter bar as fully interactive.

4. **3000ms+**: Progress message. Add text: "Loading filtered results..." in the live region. Consider showing a progress bar if the operation duration is predictable.

**Implementation with Next.js:**

```tsx
// Use React Suspense with a transition
import { useTransition } from 'react';

const [isPending, startTransition] = useTransition();

function applyFilter(newFilter: Filter) {
  // Immediately update the filter chips (optimistic)
  setFilterChips(prev => [...prev, newFilter]);

  // Wrap the data-fetching state update in a transition
  startTransition(() => {
    setSearchParams(buildParams(newFilter));
  });
}

// In the UI:
<div className={cn("results-area", isPending && "opacity-60 transition-opacity")}>
  {/* results */}
</div>
```

### 7.4 Skeleton States for Filtered Results

Skeleton loading states must match the layout of actual results to prevent layout shift (CLS):

```tsx
function ResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading filtered results">
      <div className="sr-only">Loading filtered results...</div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-4 w-[250px]" />  {/* Title */}
          <Skeleton className="h-4 w-[100px]" />  {/* Status */}
          <Skeleton className="h-4 w-[80px]" />   {/* Priority */}
          <Skeleton className="h-8 w-8 rounded-full" /> {/* Avatar */}
        </div>
      ))}
    </div>
  );
}
```

Key points:
- Include `role="status"` and a screen-reader-only label
- Match the number of skeleton rows to the expected page size
- Match dimensions to actual content dimensions
- Use the shadcn/ui `Skeleton` component

---

## 8. Consolidated Recommendations for This Project

### 8.1 Architecture Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| State management | URL params as source of truth, Zustand for ephemeral UI state | Shareable, bookmarkable, SSR-compatible |
| Filter interaction model | Unified bar with progressive disclosure | Serves both technical and non-technical users |
| Query syntax | `field:value` qualifier syntax with visual chips | Bridges text and visual modes |
| Boolean logic | Implicit AND by default, OR via multi-select, explicit toggle in advanced mode only | Matches user mental models, avoids confusion |
| Command palette | cmdk via shadcn/ui Command component, `Cmd+K` shortcut | Keyboard-first, discoverable, standard |
| Mobile pattern | Bottom sheet (shadcn Sheet) with sticky apply button | Touch-friendly, thumb-zone optimized |
| Loading strategy | Optimistic chips + transition opacity + skeleton fallback | Fast perceived performance |
| Accessibility baseline | WCAG 2.1 AA with AAA aspirations for keyboard and screen reader | Inclusive design, legal compliance |

### 8.2 Component Mapping to shadcn/ui

| Feature | shadcn/ui Components | Notes |
|---------|---------------------|-------|
| Filter bar container | `Card` or custom `div` with `role="search"` | Landmark for screen readers |
| Quick filter toggles | `ToggleGroup` + `Toggle` | Radio-like keyboard nav |
| Filter field selector | `Command` (cmdk) in `Popover` | Searchable field list |
| Filter value: enum | `Combobox` pattern (`Popover` + `Command`) | Multi-select with search |
| Filter value: text | `Input` with `Command` suggestions | Type-ahead |
| Filter value: date | `Calendar` in `Popover` | Date picker |
| Filter value: number range | `Slider` + dual `Input` | Range selection |
| Active filter chips | `Badge` with close button | Removable chips |
| Clear all button | `Button` variant="ghost" | Low visual weight |
| Add filter button | `Button` variant="outline" | Primary filter action |
| Advanced filter builder | `Sheet` or `Dialog` | Modal builder UI |
| Saved filter management | `DropdownMenu` + `Dialog` | CRUD operations |
| Command palette | `Command` (cmdk) via `CommandDialog` | `Cmd+K` trigger |
| Mobile filter sheet | `Sheet` side="bottom" | Bottom sheet |
| Results skeleton | `Skeleton` | Loading state |
| Result count | `aria-live="polite"` region | Dynamic announcement |
| Error messages | `role="alert"` + `aria-invalid` | Immediate announcement |
| Tooltips on filters | `Tooltip` | Contextual help |
| Empty state | `Card` with messaging | Zero results |
| Notifications | `Sonner` (toast) | Undo actions, confirmations |

### 8.3 Keyboard Shortcut Map (Final Recommendation)

```
Global:
  Cmd+K          -> Open command palette
  /              -> Focus filter bar (when not in text input)
  F              -> Open filter builder (when not in text input)
  Shift+F        -> Clear all filters (when not in text input)
  Cmd+Z          -> Undo last filter change
  Cmd+Shift+Z    -> Redo last filter change
  Escape         -> Close any open popover/sheet/palette

Within filter bar:
  Tab            -> Move to next filter element
  Shift+Tab      -> Move to previous filter element
  Enter/Space    -> Activate focused element (open dropdown, remove chip)
  Backspace/Del  -> Remove focused filter chip

Within filter dropdown:
  Down Arrow     -> Next option
  Up Arrow       -> Previous option
  Enter          -> Select option
  Escape         -> Close dropdown
  Type           -> Filter options (search)

Within command palette:
  Down Arrow     -> Next command
  Up Arrow       -> Previous command
  Enter          -> Execute command
  Escape         -> Close palette
  Type           -> Filter commands
```

### 8.4 Testing Checklist (for QA Tester)

**Keyboard:**
- [ ] Every filter operation is achievable without a mouse
- [ ] Tab order follows logical reading order
- [ ] Focus is never lost after filter operations
- [ ] Escape always returns to a sensible focus target
- [ ] Arrow keys work within all dropdowns and comboboxes
- [ ] Cmd+K opens and closes the command palette
- [ ] All custom shortcuts work only when appropriate (not when typing in inputs)

**Screen Reader:**
- [ ] All filter controls have accessible names
- [ ] Filter application announces result count
- [ ] Zero results triggers an assertive announcement
- [ ] Filter chips announce their full label on focus ("Status is Open, remove filter, button")
- [ ] Combobox options are announced during arrow navigation
- [ ] Live regions are debounced (no announcement storms)

**Visual Accessibility:**
- [ ] All text meets 4.5:1 contrast ratio
- [ ] All interactive boundaries meet 3:1 contrast ratio
- [ ] Active filter state is distinguishable without color alone
- [ ] Focus indicators are visible (2px ring, 3:1 contrast)
- [ ] Dark mode and light mode both pass contrast checks

**Mobile:**
- [ ] Filter sheet opens from bottom on mobile
- [ ] All touch targets are at least 44x44px
- [ ] Results count updates in sheet before applying
- [ ] Filter chips are scrollable horizontally on small screens

---

## Sources

- [W3C ARIA Authoring Practices Guide -- Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [W3C ARIA Authoring Practices Guide -- Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
- [W3C WCAG 2.1 Understanding Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- [WebAIM Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [ARIA Live Regions -- MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [Sara Soueidan -- Accessible Notifications with ARIA Live Regions (Part 2)](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/)
- [PatternFly -- Chip Accessibility](https://www.patternfly.org/components/chip/accessibility/)
- [Pencil & Paper -- Filter UX Design Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering)
- [Pencil & Paper -- Mobile Filter UX Design Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-mobile-filters)
- [Smart Interface Design Patterns -- Filtering UX](https://smart-interface-design-patterns.com/articles/filtering-ux/)
- [Smart Interface Design Patterns -- Complex Filters UX](https://smart-interface-design-patterns.com/articles/complex-filtering/)
- [NN/g -- Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [NN/g -- Search and You May Find](https://www.nngroup.com/articles/search-and-you-may-find/)
- [Smart Interface Design Patterns -- Better Autocomplete UX](https://smart-interface-design-patterns.com/articles/autocomplete-ux/)
- [Cloudscape Design System -- Saved Filter Sets](https://cloudscape.design/patterns/general/filter-patterns/saved-filter-sets/)
- [Superhuman -- How to Build a Remarkable Command Palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- [Mobbin -- Command Palette UI Design](https://mobbin.com/glossary/command-palette)
- [Atlassian -- JQL Overview](https://www.atlassian.com/software/jira/guides/jql/overview)
- [Linear -- Filters Documentation](https://linear.app/docs/filters)
- [Elastic -- KQL Documentation](https://www.elastic.co/docs/explore-analyze/query-filter/languages/kql)
- [GitHub Docs -- Filtering and Searching Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/filtering-and-searching-issues-and-pull-requests)
- [Radix UI -- Toggle Group](https://www.radix-ui.com/primitives/docs/components/toggle-group)
- [Radix UI -- Accessibility Overview](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [React Aria -- useComboBox](https://react-spectrum.adobe.com/react-aria/useComboBox.html)
- [LogRocket -- Getting Filters Right](https://blog.logrocket.com/ux-design/filtering-ux-ui-design-patterns-best-practices/)
- [BricxLabs -- 15 Filter UI Patterns That Actually Work in 2025](https://bricxlabs.com/blogs/universal-search-and-filters-ui)
- [Telerik -- Chip Component Accessibility](https://www.telerik.com/design-system/docs/components/chip/accessibility/)
- [Mobbin -- Bottom Sheet UI Design](https://mobbin.com/glossary/bottom-sheet)
- [UXPin -- Filter UI and UX 101](https://www.uxpin.com/studio/blog/filter-ui-and-ux/)
- [Interaction Design Foundation -- Progressive Disclosure](https://www.interaction-design.org/literature/topics/progressive-disclosure)
- [Pope Tech -- Create an Accessible Combobox Using ARIA](https://blog.pope.tech/2024/07/01/create-an-accessible-combobox-using-aria/)
- [Accessibility Developer Guide -- Autosuggest Widget](https://www.accessibility-developer-guide.com/examples/widgets/autosuggest/)
- [GOV.UK -- Improving Accessibility on Search](https://technology.blog.gov.uk/2014/08/14/improving-accessibility-on-gov-uk-search/)
