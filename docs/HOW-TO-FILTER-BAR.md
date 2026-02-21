# How to Use the Filter Bar

A guide to the attack filtering system — mouse interactions, keyboard shortcuts, boolean logic, and accessibility features.

---

## Quick Start

The filter bar sits at the top of the attacks page. Click anywhere on the empty bar (or press **F**) to open the field palette, pick a field, select values, and your first filter chip appears. Results update instantly.

---

## Adding Filters

### Mouse
1. Click the empty area of the filter bar (the "Filter..." placeholder).
2. A palette pops up with two groups: **Attack characteristics** and **Target & Context**.
3. Click a field name (e.g. "Status", "Attack type", "Endpoint").
4. For **enum fields** — check one or more values, then click away or press `Cmd+Enter` to confirm.
5. For **text fields** — type a value and press `Enter` to add it. Repeat for multiple values.
6. The filter chip appears in the bar.

### Keyboard
1. Press **F** (when not focused on any input) to open the palette.
2. Use arrow keys to navigate fields, press `Enter` to select.
3. Select values and confirm.

---

## Filter Chips

Each active filter is displayed as a chip in the format:

```
Field  operator  Value1, Value2
```

The **operator** carries the semantic meaning — it tells you the logical relationship between values.

### Operator auto-upgrade
When you select multiple values, the operator upgrades automatically:
- Select 1 value: `Status is Blocked`
- Select 2nd value: `Status is any of Blocked, Monitoring` (auto-upgraded)
- Remove back to 1: `Status is Blocked` (auto-downgraded)

The same applies for negation: `is not` upgrades to `is none of` with multiple values.

### Editing a chip
- **Click the operator** (e.g. "is") to change it. Available operators:
  - **Enum fields**: `is` / `is not` / `is any of` / `is none of`
  - **Text fields**: `contains` / `does not contain`
- **Click the value** (highlighted in blue) to open the value editor and change selections.

### Removing a chip
- **Mouse**: Hover over the chip to reveal the **×** button, then click it.
- **Keyboard**: `Tab` to focus the chip, then press **Backspace** or **Delete**.

---

## Boolean Logic (AND / OR)

Filters are combined with **AND** by default. You can create **OR groups** for two adjacent conditions.

### Creating an OR group
Click the **AND** connector between two chips. It wraps them into a parenthesized OR group:

```
( Status is any of Blocked, Monitoring  OR  Attack type is XSS )  AND  Impact is High
```

### Removing an OR group
Click the **OR** connector inside a group to ungroup and revert to AND.

### Rules
- **OR is only allowed inside groups** — top-level OR triggers a validation error.
- Groups cannot be nested (no groups inside groups).
- Removing one condition from a 2-condition group auto-ungroups the remaining condition.

---

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| **F** | Open filter palette | When not typing in an input |
| **Shift + F** | Clear all filters | When filters exist and not typing |
| **Backspace** / **Delete** | Remove focused filter chip | When a chip has keyboard focus |
| **Escape** | Close palette / popover | When a popover is open |
| **Tab** | Move focus between chips | Standard browser tab navigation |

### Input context detection
Shortcuts are automatically disabled when focus is on:
- `<input>`, `<textarea>`, `<select>`
- Elements with `contenteditable="true"`
- Elements with `role="textbox"` or `role="combobox"`

This prevents conflicts when typing filter values or other text.

---

## Clearing Filters

- **Clear all button**: The **×** button on the right side of the bar (visible when filters exist).
- **Keyboard**: Press **Shift + F** from anywhere on the page.
- Both methods clear all chips and reset to the unfiltered view.

---

## Focus Management

After filter operations, focus is automatically moved to a sensible location:

| Action | Focus moves to |
|--------|---------------|
| Remove a chip | Next chip in order, or previous if last, or palette trigger if none remain |
| Add a filter | Palette trigger (ready to add another) |
| Clear all | Palette trigger |
| Close palette with Escape | Palette trigger (Radix default behavior) |

---

## Screen Reader Support

The filter bar includes full ARIA support:

### Landmarks and roles
- **Outer wrapper**: `role="search"` with `aria-label="Filter search"` — screen readers announce it as a search landmark.
- **Inner bar**: `role="toolbar"` with `aria-label="Filter bar"`.
- **Each chip**: `role="listitem"` with a descriptive `aria-label` like "Status is any of Blocked, Monitored".

### Live announcements
Two hidden `aria-live` regions announce filter changes:

| Event | Announcement | Priority |
|-------|-------------|----------|
| Filter added | "Filter added: Status is Blocked. 1 filter active." | Polite |
| Filter removed | "Filter removed. 2 filters active." | Polite |
| All cleared | "All filters cleared." | Polite |
| Zero results | "No results match your current filters." | Assertive |

---

## URL State

All filter state is serialized to URL query parameters. This means:
- **Shareable links** — copy the URL to share the exact filter configuration.
- **Browser back/forward** — navigate through filter history.
- **Bookmarkable** — save filtered views.
- **Page refresh** — filters persist across reloads.

---

## Available Filter Fields

### Attack characteristics
| Field | Type | Values |
|-------|------|--------|
| Attack type | Enum | XSS, SQL Injection, BOLA Attack, etc. |
| Status | Enum | Blocked, Monitored, Started |
| Impact | Enum | High, Medium, Low |
| Blocking status | Enum | Active blocking, Passive monitoring, Not configured |

### Target & Context
| Field | Type | Notes |
|-------|------|-------|
| HTTP status code | Enum | 200, 401, 403, 500 |
| Hostname | Text | Freeform with autocomplete suggestions |
| Endpoint | Text | Freeform with autocomplete suggestions |
| Parameter | Text | Freeform with autocomplete suggestions |

**Enum fields** support `is` / `is not` (single value) and `is any of` / `is none of` (multiple values). The operator auto-upgrades when you select additional values.

**Text fields** support `contains` / `does not contain`.

---

## Developer Integration

### Passing result count
To enable the "No results" screen reader announcement, pass `resultCount` to FilterBar:

```tsx
<FilterBar
  filterState={filterState}
  onAddFilter={addFilter}
  onRemoveFilter={removeFilter}
  onUpdateFilterValues={updateFilterValues}
  onUpdateOperator={updateOperator}
  onClearAll={clearAll}
  resultCount={filteredData.length}  // enables zero-results announcement
/>
```

### Reusing the keyboard shortcuts hook
The `useKeyboardShortcuts` hook can be used independently:

```tsx
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

useKeyboardShortcuts([
  {
    key: "k",
    modifiers: { meta: true },
    handler: () => openCommandPalette(),
  },
  {
    key: "z",
    modifiers: { meta: true },
    handler: () => undo(),
    enabled: canUndo,
  },
]);
```

### Data attributes for focus management
The focus system uses these data attributes — keep them if customizing:
- `data-filter-id="{id}"` on each filter chip
- `data-filter-palette-trigger` on the palette trigger button
