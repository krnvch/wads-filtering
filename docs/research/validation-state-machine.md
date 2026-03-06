# Validation State Machine: Complete Lifecycle Specification

**Author**: Principal Interaction Designer
**Date**: 2026-03-05
**Status**: Research document for team review
**Scope**: Full validation lifecycle for the token-based filtering system

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Validation Timing Research](#2-validation-timing-research)
3. [State Machine Overview](#3-state-machine-overview)
4. [Phase 1: Pre-Chip Validation (Creation Flow)](#4-phase-1-pre-chip-validation)
5. [Phase 2: Chip-Level Validation (Post-Creation)](#5-phase-2-chip-level-validation)
6. [Phase 3: Structural Validation (Expression-Level)](#6-phase-3-structural-validation)
7. [Error Display System](#7-error-display-system)
8. [Error Recovery Flows](#8-error-recovery-flows)
9. [Enum Value Search: No-Match Handling](#9-enum-value-search-no-match-handling)
10. [Complete State Transition Diagrams](#10-complete-state-transition-diagrams)
11. [Implementation Recommendations](#11-implementation-recommendations)
12. [Appendix: Error Code Reference](#12-appendix-error-code-reference)

---

## 1. Design Philosophy

### Core Principles

This validation system is built on four foundational principles drawn from established UX research:

**P1: Prevention over correction.** Following Don Norman's "Design of Everyday Things" — constrain the interface to make errors impossible where feasible, rather than detecting and reporting them after the fact. The palette, operator selector, and value selectors already embody this: you can only pick fields that exist, operators valid for the field type, and (for enum) values from a predefined list. These are structural impossibilities, not validation rules.

**P2: Optimistic by default, pessimistic for destructive actions.** During the creation flow (pre-chip), assume the user is still composing their intent. Do not show errors for incomplete intermediate states. Only validate on commitment boundaries (confirm, close, blur). Post-creation, validate synchronously because the expression is now "live" and affecting results.

**P3: Error proximity.** Errors must appear at the point where the user can fix them. A red ring on a chip is useless if the user does not know what to do about it. Every error must suggest (or link to) a recovery action.

**P4: Graduated severity.** Not all problems are equal. Distinguish between:
- **Blocking errors**: Expression cannot be evaluated (UNKNOWN_FIELD, UNBALANCED_PAREN)
- **Semantic errors**: Expression evaluates but is certainly wrong (EMPTY_VALUES)
- **Warnings**: Expression evaluates but might not be what the user intended (SINGLE_CHILD_GROUP, TOP_LEVEL_OR)
- **Tolerated**: Structurally imperfect but harmlessly ignored by the engine (LEADING_CONNECTOR, TRAILING_CONNECTOR)

### Research Foundation

**Luke Wroblewski's inline validation timing research (2009):**
- Validate on blur (not on keypress) for text inputs — users need time to compose
- Exception: "instant" feedback is acceptable for selection-based inputs (checkboxes, dropdowns) where the user's intent is unambiguous after each interaction
- Premature error display (while the user is still typing) increases error rates by 22%
- Post-blur validation with inline messaging reduces form completion time by 42%

**Jakob Nielsen's error message heuristics:**
- Error messages must: (1) be visible, (2) use plain language, (3) precisely identify the problem, (4) constructively suggest a fix
- Avoid error codes in user-facing messages; use them internally for logging

**Kinneret Yifrah (UX writing research):**
- Error messages in professional tools should be neutral/technical, never apologetic or cute
- For power users, conciseness trumps friendliness

**Key insight for this system**: We are building for security operations professionals who use filters as their primary navigation mechanism. They build expressions rapidly, often using keyboard shortcuts. Our validation must never interrupt flow, but must catch real errors before they corrupt query results.

---

## 2. Validation Timing Research

### When Should Validation Fire?

This system has three distinct moments where validation applies:

```
 CREATION FLOW          MUTATION              IDLE / APPLY
 (pre-chip)             (post-chip)           (expression-level)
 ─────────────          ─────────             ──────────────────
 User is building       User edits existing   Full expression
 a new filter chip      chip values/operator  is evaluated
 inside a selector      or modifies tokens
```

### Timing Decision Matrix

| Moment               | Trigger                  | Validation type      | Timing         |
|----------------------|--------------------------|----------------------|----------------|
| Field selection      | Click item in palette    | Prevention (N/A)     | Instant        |
| Operator selection   | Click item in dropdown   | Prevention (N/A)     | Instant        |
| Enum value toggle    | Check/uncheck checkbox   | None during selection | —              |
| Enum value confirm   | Enter / close popover    | Empty check          | On commit      |
| Enum search no-match | Type text, 0 results     | Informational        | While typing   |
| Text value add       | Enter in text input      | Empty/whitespace     | On commit      |
| Text value confirm   | Cmd+Enter / close        | At least 1 value     | On commit      |
| Date selection       | Click preset / calendar  | Prevention (N/A)     | Instant        |
| Date range order     | Second date selected     | Auto-correct         | Instant        |
| Numeric input        | Type in number field     | Type constraint      | On keypress*   |
| Numeric confirm      | Enter / Apply button     | Non-empty            | On commit      |
| Chip created         | Value selector closes    | Full chip + structural| Synchronous    |
| Chip edited          | Value popover closes     | Full chip + structural| Synchronous    |
| Chip removed         | Click X / Backspace      | Structural only      | Synchronous    |
| Connector toggled    | Click AND/OR chip        | Structural           | Synchronous    |
| Connector added      | Select from palette      | Structural           | Synchronous    |
| Paren added/removed  | Select from palette / X  | Structural           | Synchronous    |

*`type="number"` on the HTML input provides native browser filtering of non-numeric characters. We do not implement custom keypress validation — the browser handles it.

---

## 3. State Machine Overview

### Top-Level States

```
                                  ┌──────────────┐
                                  │              │
                                  │    IDLE      │  No palette open, no pending field
                                  │              │  Validation: structural (on token array)
                                  └──────┬───────┘
                                         │
                         click bar / type / press 'f'
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │              │
                                  │  BROWSING    │  Palette open, no field selected yet
                                  │  (palette)   │  Validation: none
                                  │              │
                                  └──────┬───────┘
                                         │
                              select field / select recent
                                     │          │
                    ┌────────────────┘            └───────────────┐
                    │                                             │
                    ▼                                             ▼
             ┌──────────────┐                             ┌──────────────┐
             │              │                             │              │
             │  SELECTING   │  Value selector open         │ CHIP CREATED │
             │  VALUES      │  Validation: type-specific   │ (from recent)│
             │              │  shown on commit only        │              │
             └──────┬───────┘                             └──────┬───────┘
                    │                                             │
           confirm / close / abandon                              │
                    │                                             │
                    ▼                                             │
             ┌──────────────┐                                     │
             │              │ ◄───────────────────────────────────┘
             │ VALIDATING   │  Full chip + structural validation
             │ (transition) │  Synchronous, no user-visible delay
             │              │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │              │
             │    IDLE      │  Back to idle, errors displayed on tokens
             │  (updated)   │
             │              │
             └──────────────┘
```

### Sub-States Within SELECTING VALUES

The value selection phase is where most pre-chip validation logic lives. It branches by field type:

```
SELECTING VALUES
    │
    ├── Enum Selector
    │     States: BROWSING_VALUES → FILTERING_VALUES → COMMITTING
    │
    ├── Text Input
    │     States: COMPOSING → ADDING_VALUE → COMMITTING
    │
    ├── Date Selector
    │     States: CHOOSING_PRESET / PICKING_DATE → COMMITTING
    │     (Range: PICKING_START → PICKING_END → COMMITTING)
    │
    └── Numeric Input
          States: ENTERING_NUMBER → COMMITTING
          (Range: ENTERING_MIN → ENTERING_MAX → COMMITTING)
```

---

## 4. Phase 1: Pre-Chip Validation

### 4.1 Palette (Field Selection)

**What can go wrong**: Essentially nothing. The palette is a curated list of known fields. The user cannot type a freeform field name that does not exist — they can only type to filter the visible list.

| State | Trigger | Visual | Actions | Transitions | Edge Cases |
|-------|---------|--------|---------|-------------|------------|
| PALETTE_OPEN | Click bar / type / shortcut | Popover with field list | Arrow keys, type to filter, Enter to select, Esc to close | → SELECTING_VALUES (field chosen), → IDLE (Esc/click outside) | User types text matching no fields: palette shows "No fields found." (already implemented via `CommandEmpty`). This is informational, not an error. |

**Abandonment**: User opens palette, browses, then clicks outside. Palette closes. No state change. No error. This is the simplest abandon flow.

**No validation needed**: Field list is exhaustive and correct. No invalid selection is possible.

### 4.2 Operator Selection

Operators are shown only after a field is selected (inside an existing chip's operator dropdown, or implied by the default operator during creation). The `OperatorSelector` component shows only operators valid for the field type via `OPERATORS_BY_FIELD_TYPE`.

**What can go wrong**: Nothing by user action. The operator list is constrained to the field type. An `INVALID_OPERATOR` error can only occur via URL manipulation or legacy migration.

| State | Trigger | Visual | Actions | Transitions | Edge Cases |
|-------|---------|--------|---------|-------------|------------|
| OPERATOR_DROPDOWN_OPEN | Click operator text in chip | Dropdown with valid operators, checkmark on current | Click operator, Esc to close | → IDLE (operator updated, validation runs) | Changing to a unary operator (is_set, is_not_set) should immediately update the chip and remove/ignore values. Changing from unary to non-unary on a chip with no values creates an EMPTY_VALUES error — this is expected and the red ring + tooltip guides the user to add values. |

**Post-operator-change validation**: Runs synchronously. If the user switches from "is" to "is_set" on a chip with values, the chip is valid (unary operators ignore values). If they switch from "is_set" to "is", the chip has no values and gets EMPTY_VALUES. This is a deliberate, correct behavior — the error tells them to add values.

### 4.3 Enum Value Selector

This is the component that needs the most attention for the new search/filter feature.

#### Current Behavior
- Popover opens with full checkbox list
- User checks/unchecks values
- Enter: toggle focused item + confirm (close popover, create chip)
- Cmd+Enter: toggle focused item, keep popover open for multi-select
- Close popover: if any values selected, confirm; if no values, abandon

#### New Behavior (with search input)
The enum value selector will gain a text input at the top that filters the checkbox list.

**State machine for enum selector with search:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ENUM VALUE SELECTOR                       │
│                                                              │
│  ┌──────────┐    type text     ┌──────────────┐             │
│  │          │ ──────────────► │              │             │
│  │ BROWSING │                 │  FILTERING   │             │
│  │ (all     │ ◄────────────── │  (subset     │             │
│  │  values) │   clear search  │   visible)   │             │
│  └────┬─────┘                 └──────┬───────┘             │
│       │                              │                      │
│       │  check/uncheck               │  check/uncheck       │
│       │                              │                      │
│       ▼                              ▼                      │
│  ┌──────────┐                 ┌──────────────┐             │
│  │ HAS      │                 │ HAS          │             │
│  │ SELECTION │                │ SELECTION +  │             │
│  │          │                 │ FILTER ACTIVE│             │
│  └────┬─────┘                 └──────┬───────┘             │
│       │                              │                      │
│       │  Enter / close               │  Enter / close       │
│       │                              │                      │
│       ▼                              ▼                      │
│  ┌──────────────────────────────────────────┐              │
│  │              COMMITTING                    │              │
│  │  if selectedValues.length > 0 → create chip │             │
│  │  if selectedValues.length === 0 → abandon   │             │
│  └──────────────────────────────────────────┘              │
│                                                              │
│  Special path: NO MATCH                                     │
│  ┌──────────────┐                                           │
│  │ FILTERING    │  search text matches nothing              │
│  │ (empty list) │  → show "No matching values" message      │
│  │              │  → checkbox list is empty                  │
│  │              │  → previously checked values RETAINED      │
│  │              │  → Enter does nothing (no focused item)    │
│  │              │  → close popover: if has selection, commit;│
│  │              │    if no selection, abandon                │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

**Critical decisions for enum search:**

1. **Can the user "confirm" when search matches nothing?**
   - If they have previous selections (checked items): YES. The search filter is ephemeral — it only affects visibility, not selection state. Closing the popover or pressing Cmd+Enter commits the checked items.
   - If they have no selections at all: Close = abandon. No chip created. No error shown.
   - Enter with no focused item and no selection: No-op. Nothing happens. The search text stays, user can edit it.

2. **What does the search behavior look like for partial matches?**
   - "Bl" matches "Blocked" (substring match, case-insensitive)
   - The filtered list updates instantly (no debounce — the enum list is small, always < 100 items)
   - Focused index resets to 0 when search changes
   - Previously checked items that are now filtered out remain checked (they are just not visible)
   - A count badge below the search input shows "N selected" when some checked items are filtered out of view

3. **What does "no match" look like?**
   - The checkbox area shows a muted message: "No values match '{searchText}'"
   - If there are selected values, a secondary line: "N values selected (hidden by search)"
   - No error styling (no red borders, no destructive colors) — this is informational, not an error
   - The user can: clear search text, edit search text, close popover (committing selections), or press Esc

4. **Edge case: User checks "Blocked", then searches "Mon", unchecks nothing, closes.**
   - Chip is created with values: ["Blocked"]. The search text "Mon" is irrelevant — it was a filtering mechanism, not a value input.

5. **Edge case: User searches "xyz", matches nothing, has no prior selections, closes popover.**
   - Popover closes. No chip created. Return to IDLE state. No error.

| State | Trigger | Visual Feedback | Available Actions | Transitions |
|-------|---------|----------------|-------------------|-------------|
| BROWSING | Popover opens | Full checkbox list, search input focused | Type to filter, arrow keys to navigate, Space/click to check, Enter to toggle+confirm, Cmd+Enter to toggle only, Esc to close | → FILTERING (type text), → COMMITTING (Enter/close) |
| FILTERING | Type in search input | Filtered checkbox list, matching items shown | Same as BROWSING, plus: clear search (Backspace/select all+delete) | → BROWSING (clear search), → NO_MATCH (0 results), → COMMITTING (Enter/close) |
| NO_MATCH | Search matches 0 items | "No values match" message, search input active | Edit search text, clear search, close popover | → FILTERING (edit text), → BROWSING (clear text), → COMMITTING (close popover) |
| COMMITTING | Enter / close popover | Popover closes | N/A (transition state) | → CHIP_CREATED (has selections) or → ABANDONED (no selections) |
| ABANDONED | Close with no selections | Popover closes, no chip | N/A | → IDLE |

### 4.4 Text Value Input

**Current behavior**: Type text, Enter to add as tag, Cmd+Enter to confirm, Backspace on empty input to remove last tag.

**What can go wrong:**

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| User types empty string, presses Enter | No-op. `inputValue.trim()` is empty, `addValue` is not called. | Empty strings are meaningless as filter values. Prevention, not error. |
| User types only whitespace, presses Enter | No-op. `trim()` reduces to empty. | Same as above. |
| User types special characters (*, ?, %, /) | Allowed. These are valid in endpoints, parameters, hostnames. | Text fields are freeform by design. The backend handles escaping. |
| User types very long string (>500 chars) | Allowed currently. **Recommendation**: Add a maxLength hint (not a hard block) at 256 characters, showing character count. Most endpoint/parameter values are under 100 chars. | Power users may paste long paths. Warn, do not block. |
| User adds duplicate value | Prevented. `addValue` checks `!selectedValues.includes(trimmed)`. | Dedup is prevention, not validation. |
| User presses Cmd+Enter with no values | No-op. `handleKeyDown` early-returns because `selectedValues` is empty and `inputValue.trim()` is empty. | Same pattern as enum: nothing to commit means abandon. |
| User closes popover with no values | Abandon. No chip created. FilterBar's `handlePendingOpenChange` checks `pendingValues.length > 0`. | Consistent with enum behavior. |
| User closes popover with typed but un-added text | **Current behavior**: Text in the input field is lost. **Recommendation**: Auto-add `inputValue.trim()` as a value on popover close, if non-empty. This prevents the "I typed something but forgot to press Enter" error. | Following the principle of least surprise. Gmail's compose does this with email addresses. |

**State diagram for text input:**

```
┌─────────────────────────────────────────────────────┐
│                 TEXT VALUE INPUT                      │
│                                                      │
│  ┌───────────┐     type text      ┌────────────┐   │
│  │           │ ─────────────────► │            │   │
│  │  EMPTY    │                    │ COMPOSING  │   │
│  │  INPUT    │ ◄───────────────── │ (has text) │   │
│  │           │    Backspace all   │            │   │
│  └─────┬─────┘                    └──────┬─────┘   │
│        │                                 │          │
│        │  Cmd+Enter (if has values)      │  Enter   │
│        │                                 │          │
│        ▼                                 ▼          │
│  ┌───────────┐                    ┌────────────┐   │
│  │ COMMITTING│                    │ VALUE ADDED│   │
│  │           │                    │ (tag shown)│   │
│  └───────────┘                    └──────┬─────┘   │
│                                          │          │
│                                 back to EMPTY INPUT │
│                                 (input cleared,     │
│                                  value appears as   │
│                                  removable badge)   │
└─────────────────────────────────────────────────────┘
```

### 4.5 Date Value Selector

**Prevention-first design**: The date selector is almost entirely error-proof by construction.

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| Relative operator (in_the_last): user picks preset | Instant confirm. Preset click = select + apply. No invalid state possible. | Presets are predefined. |
| Relative operator: user opens calendar, picks date | Calendar `onSelect` fires with valid Date object. Converted to ISO string. | shadcn/Calendar only emits valid dates. |
| Range operator (between_dates): end before start | **Auto-corrected.** The `handleDateSelect` function sorts: `new Date(iso) < new Date(start) ? [iso, start] : [start, iso]`. End is always >= start. | Error prevention. User never sees an error because the system silently fixes the order. |
| Range operator: only one date selected, popover closed | **Current behavior**: Popover close does not trigger confirm for range with only 1 value (need 2). The partial state is lost. **Recommendation**: If one date is selected and popover closes, treat it as a "before" or "after" filter (depending on context) OR show a tooltip "Select a second date to complete the range." This is the one genuine pre-chip validation gap for dates. | See detailed recommendation below. |
| Absolute date operators (before, after, on): user picks date | Instant confirm. Single date selection = done. | Same as presets. |
| User opens date selector, picks nothing, closes | Abandon. No chip. `pendingValues` is empty. | Consistent abandon pattern. |

**Recommendation for incomplete date ranges**: When the user selects only one date for a `between_dates` operator and closes the popover:
- Option A (recommended): Show inline hint "Select end date" and keep popover open until both dates are chosen or user explicitly presses Esc.
- Option B: Downgrade to `after` operator with the single date. This is more forgiving but changes the user's intended semantics.
- Option C: Create chip with one date, mark with a warning (not error). On hover: "Range filter needs two dates. Click values to add end date."

Decision: **Option A**. Keep the popover open with a persistent "Select end date" label (already implemented via the `selectedValues.length` check in `DateValueSelector`). If user presses Esc, abandon — no chip. This is already the current behavior and it is correct.

### 4.6 Numeric Value Input

**Prevention-first design**: The `<input type="number">` provides browser-native filtering.

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| User types non-numeric text | Browser prevents input. `type="number"` rejects letters. Some browsers allow 'e', '+', '-' for scientific notation. | Native HTML constraint. |
| User types nothing, presses Enter/Apply | No-op. `handleApply` checks `value1 !== ""`. Button is disabled. | Prevention via disabled state. |
| User types negative number | Allowed. Negative numbers are valid (e.g., response code extensions, though unusual). | No artificial constraint. |
| User types decimal number | Allowed by `type="number"`. If only integers are valid for the field (e.g., HTTP status codes), this is a gap. **Recommendation**: Add an optional `step="1"` and `min`/`max` props to `NumericValueInput` based on field metadata. | See field-specific constraints below. |
| Range (in_between): min > max | **Currently not validated.** User can enter min=500, max=200 and confirm. **Recommendation**: Auto-swap on confirm (same pattern as date range). If min > max, swap them silently. OR: disable Apply button when min > max with inline hint "Min must be less than max." | See recommendation below. |
| Range: only one value entered | Apply button disabled (checks `value1 === "" \|\| value2 === ""`). | Prevention via disabled state. |
| User pastes text into number input | Browser behavior varies. Most browsers strip non-numeric chars from pasted text. | Acceptable — no custom handling needed. |

**Recommendation for numeric range ordering**:
- Use auto-swap on confirm (same as date): `const sorted = [Math.min(v1, v2), Math.max(v1, v2)]`. This is consistent with date behavior and removes an entire class of errors.
- Additionally, add optional `min`/`max` constraints to `FilterFieldDef` for numeric fields. For Response Code, `min: 100, max: 599`. Out-of-range values get a yellow warning hint (not a block): "Unusual value: HTTP status codes are typically 100-599."

### 4.7 Abandonment Flows

What happens when the user leaves the creation flow at each stage:

```
STAGE                    ABANDON TRIGGER              RESULT
─────                    ───────────────              ──────
Palette open             Esc / click outside          Palette closes. No state change.
  (no field selected)                                 Clean abandon.

Field selected,          Esc / click outside          Palette was already closed (field
  operator selector      (operator dropdown)          selection closes palette). Operator
  open                                                dropdown closes. Pending field is
                                                      cleared. No chip. Clean abandon.

Field selected,          Esc / click outside          Value selector closes.
  value selector open,   (value popover)              handlePendingOpenChange fires.
  NO values selected                                  pendingValues.length === 0.
                                                      → No chip. pendingField cleared.
                                                      Clean abandon.

Field selected,          Click outside                Value selector closes.
  value selector open,   (value popover)              handlePendingOpenChange fires.
  SOME values selected                                pendingValues.length > 0.
                                                      → CHIP CREATED with pending values.
                                                      This is a COMMIT, not an abandon.

Field selected,          Esc key                      Same as click outside for Radix
  value selector open    (on the value popover)       Popover — onOpenChange(false).
```

**Key design decision**: Closing the value selector with values selected is always a COMMIT. The rationale: the user invested effort in selecting values. Discarding that work requires explicit intent (pressing Esc before selecting any value). This matches Figma/Linear/GitHub filtering patterns.

**Exception for text input**: If the user has typed text in the input but has not pressed Enter to add it as a tag, closing the popover should auto-add the typed text as a value (if non-empty after trimming), then commit. See section 4.4.

---

## 5. Phase 2: Chip-Level Validation

### 5.1 When Validation Runs

Validation is **synchronous and exhaustive** on every token array mutation. This is not debounced.

The `validateTokens()` function runs inside `useMemo` in both `useTokenFilterState` and `useTokenFilterUrlState`. It runs whenever `tokenState.tokens` changes reference. Since every mutation (add, remove, update, toggle) creates a new token array via immutable operations, validation runs on every change.

**This is correct.** The token array is small (typically 1-20 tokens). `validateTokens` is O(n) with small constant factors. There is no performance reason to debounce.

### 5.2 What Triggers Re-Validation

| Action | Token array changes? | Validation runs? | New errors possible? |
|--------|---------------------|-------------------|---------------------|
| Add chip | Yes (new token added) | Yes | EMPTY_VALUES (if unary operator not set and values empty — but this cannot happen via normal creation flow because value selector requires values). UNKNOWN_FIELD (only via URL). TOP_LEVEL_OR (if adding chip after an OR at top level). |
| Remove chip | Yes (token removed, possibly connector too) | Yes | Errors may be RESOLVED (removing a chip that caused structural issues). New errors: EMPTY_GROUP (if removing last chip from a paren group — but cascade logic removes parens too). SINGLE_CHILD_GROUP (if removing one of two chips in a group). |
| Update values | Yes (new values array on chip) | Yes | EMPTY_VALUES (if all values removed — but `updateChipValues` auto-removes chip when values become empty, so this cannot happen). |
| Update operator | Yes (new operator on chip) | Yes | INVALID_OPERATOR (theoretically — but `OperatorSelector` only shows valid operators). EMPTY_VALUES (if switching from unary to non-unary on a chip with no values — see note below). |
| Toggle connector | Yes (AND/OR swap, possibly paren insertion) | Yes | TOP_LEVEL_OR (if toggling AND→OR at top level — but the system auto-wraps in parens, so this should not happen). |
| Insert connector | Yes | Yes | CONSECUTIVE_CONNECTOR (if user inserts connector next to another connector). |
| Insert paren | Yes | Yes | UNBALANCED_PAREN (if user adds open paren without closing). EMPTY_GROUP (if user immediately closes with no chips inside). |
| Remove connector | Yes | Yes | Errors may be resolved. |
| Remove paren | Yes (paired paren also removed) | Yes | TOP_LEVEL_OR (if removing parens that were wrapping an OR expression). |

**Note on operator change to non-unary**: When a user changes a chip's operator from `is_set` (unary, no values needed) to `is` (non-unary, values required), the chip currently has `values: []`. This produces an EMPTY_VALUES error immediately. This is correct and expected — the red ring + tooltip tells the user to click the value area to add values.

### 5.3 Can a Chip Exist in an Incomplete State?

**By design, no — through the normal UI flow.** The creation flow requires values before a chip is created (except for unary operators which need no values). Once created, a chip always has: field, operator, and (for non-unary) at least one value.

**However**, chips CAN enter an incomplete/error state through:
1. URL manipulation (manually editing `?q=...`)
2. Legacy URL migration (old format may produce incomplete chips)
3. Operator change (unary → non-unary leaves values empty)
4. Editing values to empty on a text chip (user removes all tags)

In cases 3 and 4, `updateChipValues` with empty values auto-removes the chip entirely (see `token-utils.ts` line 203). So the only persistent incomplete state comes from URL manipulation.

**Decision**: Incomplete chips from URL manipulation are valid error states. They display with EMPTY_VALUES error and the user can either add values (click the chip) or remove the chip.

---

## 6. Phase 3: Structural Validation

### 6.1 When Structural Errors Appear

Structural errors appear **immediately and synchronously** after every token mutation. There is no delay, no "apply" button that gates validation.

**Rationale**: This is a professional tool for security operations. Users building boolean expressions expect instant feedback about structural correctness, similar to an IDE showing syntax errors in real time. A delayed or gated approach would allow users to build invalid expressions without knowing it, leading to missed security events in the dashboard.

### 6.2 Can the User "Apply" Filters with Errors?

The current system does not have an explicit "Apply" button — filter changes are applied immediately (URL updates on every mutation for URL-based state, or state updates for local state). There is no gate.

**Current behavior**: Filters with errors are applied anyway. The expression tree builder (`tokensToExpressionTree`) is tolerant — it skips malformed tokens and builds the best tree it can from valid tokens. The error indicators tell the user something is wrong, but they do not block functionality.

**Decision**: This is correct. Do not block filter application. Reasons:
1. In security operations, a partially correct filter is better than no filter (false positives are safer than false negatives)
2. Blocking would require an explicit apply/cancel flow, which contradicts the immediate-feedback design
3. The tolerant parser already handles graceful degradation
4. Error indicators (red ring + tooltip + alert banner) provide sufficient signal

### 6.3 Error Cascading: Fixing One Error Creates Another

This is a real scenario:

```
BEFORE:  [Status is Blocked] OR [Type is XSS]
ERRORS:  TOP_LEVEL_OR on the OR connector

User action: Remove the OR connector

AFTER:   [Status is Blocked] [Type is XSS]
ERRORS:  None (implicit AND between adjacent chips is valid)
```

```
BEFORE:  ( [Status is Blocked] OR [Type is XSS] )
ERRORS:  None

User action: Remove [Type is XSS] chip

AFTER:   ( [Status is Blocked] )  — cascade removes connector and paren group
ACTUAL:  [Status is Blocked]  — cascade removes parens when group has ≤1 chip
ERRORS:  None (cascade handled it cleanly)
```

```
BEFORE:  ( [Status is Blocked] OR [Type is XSS] OR [Impact is High] )
ERRORS:  None

User action: Remove [Type is XSS]

AFTER:   ( [Status is Blocked] OR [Impact is High] )
ERRORS:  None (group still has 2 chips)
```

```
PROBLEMATIC:  [A] AND AND [B]
ERRORS:       CONSECUTIVE_CONNECTOR on second AND

User action: Remove first AND

AFTER:        AND [B]  — wait, that means [A] AND [B]?
ACTUAL:       [A] AND [B]  — removing first AND, second AND remains
ERRORS:       None (LEADING_CONNECTOR is tolerated/skipped)
```

**Key insight**: The cascade removal logic in `removeToken` handles most error creation scenarios. The most common "fix one, create another" scenario is removing parens that were wrapping OR expressions — this creates a TOP_LEVEL_OR. But paren removal already handles this by removing the pair, so the user has to be intentional about it.

### 6.4 Error Severity Classification

| Error Code | Severity | Visual Treatment | Blocks Evaluation? |
|------------|----------|-----------------|-------------------|
| UNKNOWN_FIELD | Error (critical) | Red ring + destructive tooltip + alert banner | Yes — chip is skipped in tree |
| INVALID_OPERATOR | Error (critical) | Red ring + destructive tooltip + alert banner | Yes — chip is skipped in tree |
| EMPTY_VALUES | Error (standard) | Red ring + destructive tooltip + alert banner | Yes — chip is skipped in tree |
| UNBALANCED_PAREN | Error (standard) | Red ring on orphan paren + alert banner | Partially — unmatched parens are ignored |
| CONSECUTIVE_CONNECTOR | Error (standard) | Red ring on second connector + alert banner | Second connector is ignored |
| EMPTY_GROUP | Warning | Yellow/amber ring + warning tooltip | Group is ignored, content may be evaluated |
| SINGLE_CHILD_GROUP | Warning | Yellow/amber ring + warning tooltip | Parens are redundant but not harmful |
| TOP_LEVEL_OR | Warning | Yellow/amber ring + warning tooltip | OR is treated as AND (semantic change) |
| LEADING_CONNECTOR | Tolerated | No visual indicator | Connector is silently ignored |
| TRAILING_CONNECTOR | Tolerated | No visual indicator | Connector is silently ignored |

**Implementation note**: The current system treats all errors as the same severity (red ring + destructive). The recommendation above introduces a three-tier system. This requires:
1. Adding a `severity` field to `TokenError`: `"error" | "warning" | "tolerated"`
2. Updating `TokenErrorIndicator` to render yellow/amber for warnings
3. Updating `hasTokenErrors` to optionally filter by severity (e.g., `hasBlockingErrors`)
4. Keeping the alert banner for errors only, not warnings
5. Completely hiding tolerated issues (no visual indicator)

---

## 7. Error Display System

### 7.1 Display Timing

| Error Category | Display Timing | Rationale |
|---------------|----------------|-----------|
| Pre-chip (during creation) | On commit boundary (confirm/close) | User is composing; interrupting with errors increases error rate (Wroblewski) |
| Pre-chip: search no-match (enum) | Immediately while typing | This is informational, not an error. "No matching values" is guidance, not criticism. |
| Chip-level (post-creation) | Immediately on token change | The expression is live. Instant feedback prevents stale/wrong filters. |
| Structural | Immediately on token change | Same as chip-level. |
| Alert banner | Immediately when any error exists | Global indicator for users who might miss per-token indicators. |

### 7.2 Error Display Components

**Per-token error indicator** (existing: `TokenErrorIndicator`):
```
 ┌─────────────────────────────┐
 │ ╔═══════════════════════════╗   │  Red ring (ring-1 ring-destructive)
 │ ║  Status  is  Blocked      ║   │  around the chip badge
 │ ╚═══════════════════════════╝   │
 │           ┌──────────────┐      │  Tooltip on hover
 │           │ Filter must  │      │  (TooltipContent)
 │           │ have at least│      │
 │           │ one value.   │      │
 │           └──────────────┘      │
 └─────────────────────────────────┘
```

**Alert banner** (existing: `Alert variant="destructive"`):
```
 ┌─────────────────────────────────────────────────────┐
 │ ⚠ Some filters have validation errors. Hover over   │
 │   highlighted tokens for details.                    │
 └─────────────────────────────────────────────────────┘
```

**Proposed warning indicator** (new):
```
 ┌─────────────────────────────┐
 │ ╔═══════════════════════════╗   │  Amber ring (ring-1 ring-warning)
 │ ║  (                        ║   │  Less alarming than red
 │ ╚═══════════════════════════╝   │
 │           ┌──────────────┐      │  Tooltip on hover
 │           │ Group with   │      │
 │           │ single filter│      │
 │           │ is unnecessary│     │
 │           └──────────────┘      │
 └─────────────────────────────────┘
```

**Proposed enum no-match indicator** (new):
```
 ┌──────────────────────────────┐
 │  🔍 ┌──────────────────┐    │  Search input
 │     │ xyzabc            │    │
 │     └──────────────────┘    │
 │                              │
 │  ┌────────────────────────┐  │
 │  │ No values match        │  │  Muted text, not error-styled
 │  │ "xyzabc"               │  │
 │  │                        │  │
 │  │ 2 values selected      │  │  Only if there are selections
 │  │ (hidden by search)     │  │
 │  └────────────────────────┘  │
 │                              │
 │  ↵ apply · ⌘ ↵ select more  │  Keyboard hints remain
 └──────────────────────────────┘
```

### 7.3 Should We Distinguish Warning vs Error?

**Yes.** This is the strongest recommendation in this document. The current system shows SINGLE_CHILD_GROUP (a cosmetic issue — redundant parentheses) with the same destructive red ring as UNKNOWN_FIELD (a critical error — the filter is not applied at all). This creates two problems:

1. **Alert fatigue**: Users learn to ignore red indicators because many of them are trivial.
2. **Missed critical errors**: When everything is red, nothing is red. A genuine UNKNOWN_FIELD error gets lost in a sea of SINGLE_CHILD_GROUP warnings.

**Proposed severity mapping:**

```
CRITICAL (red, blocks evaluation, alert banner):
  - UNKNOWN_FIELD
  - INVALID_OPERATOR
  - EMPTY_VALUES
  - UNBALANCED_PAREN

WARNING (amber, does not block, no alert banner):
  - EMPTY_GROUP
  - SINGLE_CHILD_GROUP
  - TOP_LEVEL_OR
  - CONSECUTIVE_CONNECTOR

TOLERATED (hidden, silently ignored by engine):
  - LEADING_CONNECTOR
  - TRAILING_CONNECTOR
```

### 7.4 Interaction Between Pre-Chip and Post-Chip Errors

There is no overlap. Pre-chip states exist only inside the value selector popover. Once the popover closes and a chip is created, we are in post-chip territory. The value selector does not display token-level errors — it is a creation/editing interface.

When a user clicks a chip's value area to edit values, the chip's error indicator remains visible behind the popover. The user can see the red ring around the chip while the value selector is open. When they close the value selector with updated values, validation runs and the error may resolve.

---

## 8. Error Recovery Flows

### 8.1 Chip Has an Error: User Recovery Options

**EMPTY_VALUES** (red ring on chip):
```
User sees: [Status is ___]  ← chip with no values, red ring
Tooltip:   "Filter must have at least one value."

Recovery options:
  1. Click the value area → value selector opens → select values → close → error resolved
  2. Delete the chip (X button or Backspace) → chip removed → error resolved
  3. Change operator to is_set/is_not_set → values become irrelevant → error resolved
```

**UNKNOWN_FIELD** (red ring on chip):
```
User sees: [unknown_field is Blocked]  ← chip with unknown field key, red ring
Tooltip:   'Unknown field: "unknown_field".'

Recovery options:
  1. Delete the chip (only option — cannot change the field key on an existing chip)
```

**INVALID_OPERATOR** (red ring on chip):
```
User sees: [Status starts_with Blocked]  ← operator invalid for enum field, red ring
Tooltip:   'Operator "starts_with" is not valid for field "Status".'

Recovery options:
  1. Click the operator → dropdown shows valid operators → select a valid one → error resolved
  2. Delete the chip
```

**UNBALANCED_PAREN** (red ring on paren):
```
User sees: (  ← unmatched open paren, red ring
Tooltip:   "Opening parenthesis has no matching closing parenthesis."

Recovery options:
  1. Add a closing paren from the palette → error resolved
  2. Remove the paren (X button or Backspace) → error resolved
```

**TOP_LEVEL_OR** (amber ring on connector):
```
User sees: [A] OR [B]  ← OR at top level, amber ring on OR
Tooltip:   "OR is not allowed at top level. Wrap in parentheses or use AND."

Recovery options:
  1. Click the OR chip to toggle to AND → error resolved
  2. Add parentheses around the OR expression → error resolved
  3. Remove the OR connector → error resolved (implicit AND)
```

**CONSECUTIVE_CONNECTOR** (amber ring on second connector):
```
User sees: [A] AND AND [B]  ← two connectors in a row
Tooltip:   "Two connectors cannot appear in a row."

Recovery options:
  1. Remove one of the connectors → error resolved
  2. Insert a chip between them (click the gap) → error resolved
```

**EMPTY_GROUP** (amber ring on parens):
```
User sees: ( )  ← parens with nothing inside
Tooltip:   "Group contains no filters."

Recovery options:
  1. Add a filter inside the parens (click between them) → error resolved
  2. Remove the parens (click X on either paren) → error resolved
```

**SINGLE_CHILD_GROUP** (amber ring on parens):
```
User sees: ( [A] )  ← parens with only one chip
Tooltip:   "Group with single filter is unnecessary. Remove parentheses."

Recovery options:
  1. Add another filter inside the parens → error resolved
  2. Remove the parens → error resolved (chip remains)
```

### 8.2 Structural Error Recovery: Complex Scenarios

**Scenario: User has a complex expression with multiple errors.**
```
Expression:  [A] OR [B] AND ( ) [C]
Errors:
  - OR at top level (amber on OR)
  - EMPTY_GROUP (amber on parens)

Recovery strategy (recommended order):
  1. Remove empty group → [A] OR [B] [C] → still has TOP_LEVEL_OR
  2. Click OR to toggle to AND → [A] AND [B] [C] → all resolved
  OR
  1. Wrap everything in parens → ( [A] OR [B] AND ( ) [C] ) → TOP_LEVEL_OR resolved
  2. Remove empty inner group → ( [A] OR [B] [C] ) → all resolved
```

**Principle**: Each error's recovery options are independent. Users fix errors one at a time. The system re-validates after each fix. There is no "fix all" button because the fixes are contextual.

### 8.3 Enum Search No-Match Recovery

```
User is in enum value selector.
Types "xyz" in search input.
No values match.

Recovery options:
  1. Clear search text (select all + delete, or Backspace repeatedly)
     → Full list reappears
  2. Edit search text to something that matches (e.g., "Bl")
     → Filtered list updates
  3. Close popover
     → If values were previously checked: chip created with those values
     → If no values checked: abandon, no chip
  4. Press Esc
     → Same as close popover
```

The key insight: "no match" in enum search is never a dead end. The search text is transient and editable. The user always has a way back to a useful state.

---

## 9. Enum Value Search: No-Match Handling (Detailed Specification)

This section provides implementation-level detail for the new search feature in `EnumValueSelector`.

### 9.1 Search Input Placement

```
┌──────────────────────────────────┐
│  ┌────────────────────────────┐  │
│  │ Search values...           │  │  ← New: search input
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ☑ Blocked                  │  │  ← Filtered list
│  │ ☐ Monitored                │  │
│  │ ☐ Started                  │  │
│  └────────────────────────────┘  │
│  ↵ apply · ⌘ ↵ select more      │
└──────────────────────────────────┘
```

### 9.2 Search Behavior Specification

| Property | Value | Notes |
|----------|-------|-------|
| Match algorithm | Case-insensitive substring | `value.toLowerCase().includes(query.toLowerCase())` |
| Debounce | None | Enum lists are small (< 50 items); instant filtering is appropriate |
| Focus on open | Search input receives focus | Consistent with palette behavior |
| Keyboard after typing | Arrow keys navigate filtered list, Enter applies focused item | Same as current, but operating on filtered subset |
| Clear search | Backspace to empty, or explicit "x" clear button | Either approach works; prefer Backspace for power users |
| Persistent selection | Checked values remain checked even when filtered out | Core design decision |
| Selected count | Show "N selected" below search when filtered items include hidden selections | Prevents confusion about "where did my checked items go?" |

### 9.3 No-Match States

**State A: No match, no prior selections**
```
┌──────────────────────────────────┐
│  ┌────────────────────────────┐  │
│  │ xyzabc                  ✕ │  │
│  └────────────────────────────┘  │
│                                  │
│  No values match "xyzabc"        │  ← text-muted-foreground
│                                  │
│  ↵ apply · ⌘ ↵ select more      │
└──────────────────────────────────┘

Available actions:
  - Edit/clear search text
  - Close popover (abandon, no chip)
  - Enter: no-op (nothing to toggle)
```

**State B: No match, has prior selections**
```
┌──────────────────────────────────┐
│  ┌────────────────────────────┐  │
│  │ xyzabc                  ✕ │  │
│  └────────────────────────────┘  │
│                                  │
│  No values match "xyzabc"        │
│  2 values selected               │  ← Shows count of hidden selections
│                                  │
│  ↵ apply · ⌘ ↵ select more      │
└──────────────────────────────────┘

Available actions:
  - Edit/clear search text
  - Close popover → COMMIT with 2 selected values
  - Cmd+Enter → COMMIT with 2 selected values
  - Enter: no-op (no focused item in empty list)
```

### 9.4 Interaction Between Search and Keyboard Navigation

| User Action | Search empty | Search has text, matches exist | Search has text, no match |
|------------|-------------|-------------------------------|--------------------------|
| Arrow Down | Move focus down in full list | Move focus down in filtered list | No-op (no list items) |
| Arrow Up | Move focus up in full list | Move focus up in filtered list | No-op |
| Enter | Toggle focused + confirm | Toggle focused in filtered list + confirm | No-op |
| Cmd+Enter | Toggle focused | Toggle focused in filtered list | Confirm with existing selections (if any) |
| Space | (Type space in search) | (Type space in search) | (Type space in search) |
| Backspace | No-op / close popover if no text | Delete char from search | Delete char from search |
| Esc | Close popover | Close popover | Close popover |

**Important**: When search is active and Enter is pressed, it operates on the filtered list, not the full list. The focused index is always within the filtered result set.

### 9.5 Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Search matches 1 item, user presses Enter | Toggle that item + confirm (create chip) |
| Search matches items, user checks 2, then narrows search to match 0, then Cmd+Enter | Confirm with 2 previously checked values |
| User checks "Blocked", searches "Blocked" (matches), unchecks "Blocked", confirms | Chip has 0 values → abandon (no chip created) |
| User rapidly types search and presses Enter before list updates | React state update is synchronous within the same render. Search filter and Enter handler operate on the same state. No race condition. |
| User pastes long text into search input | Substring match runs on full text. If no match, shows no-match state. No truncation of search input. |
| Field has 0 enum values (empty `values` array) | Search input still appears but list is always empty. Shows "No values available" (different message from no-match). This is a schema configuration issue, not a user error. |

---

## 10. Complete State Transition Diagrams

### 10.1 Master State Diagram

```
                        ┌────────────────────────────────────────┐
                        │              IDLE STATE                │
                        │                                        │
                        │  Tokens displayed with validation      │
                        │  errors (if any). User can:            │
                        │  - Click bar → PALETTE_OPEN            │
                        │  - Type → PALETTE_OPEN (with search)   │
                        │  - Press 'f' → PALETTE_OPEN            │
                        │  - Click chip values → EDITING_VALUES  │
                        │  - Click chip operator → EDITING_OP    │
                        │  - Click X on token → Token removed    │
                        │  - Click connector → Toggle AND/OR     │
                        │  - Click gap → PALETTE_OPEN (at index) │
                        │  - Press Shift+F → CLEAR_ALL           │
                        │                                        │
                        └──────────┬─────────────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
            ▼                      ▼                      ▼
    ┌───────────────┐    ┌──────────────┐    ┌──────────────────┐
    │ PALETTE_OPEN  │    │ EDITING_VALUES│    │ EDITING_OPERATOR │
    │               │    │ (on existing  │    │ (on existing     │
    │ Browse/search │    │  chip)        │    │  chip)           │
    │ fields, recent│    │              │    │                  │
    │ connectors,   │    │ Opens field- │    │ Opens operator   │
    │ parens        │    │ specific     │    │ dropdown         │
    │               │    │ value editor │    │                  │
    └──────┬────────┘    └──────┬───────┘    └──────┬───────────┘
           │                    │                    │
    ┌──────┴──────┐      ┌─────┴──────┐      ┌─────┴──────┐
    │             │      │            │      │            │
    │ Select      │      │ Modify     │      │ Select new │
    │ field       │      │ values     │      │ operator   │
    │             │      │ (add/      │      │            │
    │ Select      │      │  remove)   │      └──────┬─────┘
    │ recent      │      │            │             │
    │             │      └──────┬─────┘             │
    │ Select      │             │                    │
    │ connector   │      Close popover          Close dropdown
    │             │             │                    │
    │ Select      │             ▼                    ▼
    │ paren       │      ┌─────────────┐     ┌─────────────┐
    │             │      │  UPDATE     │     │  UPDATE     │
    │ Abandon     │      │  CHIP       │     │  OPERATOR   │
    │ (Esc/       │      │  VALUES     │     │             │
    │  click out) │      └──────┬──────┘     └──────┬──────┘
    └──────┬──────┘             │                    │
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────────────────────────────────────────────────┐
    │                                                      │
    │                   RE-VALIDATE                         │
    │                                                      │
    │  validateTokens(tokens) runs synchronously            │
    │  New errors/warnings attached to tokens               │
    │  Alert banner updated                                 │
    │                                                      │
    └──────────────────────────┬───────────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   IDLE STATE  │
                        │   (updated)   │
                        └──────────────┘
```

### 10.2 Creation Flow Detail (Field → Value → Chip)

```
PALETTE_OPEN
    │
    ├─── Select recent filter ──────────────────► CREATE_CHIP (immediately)
    │                                                    │
    ├─── Select connector (AND/OR) ─────────────► INSERT_CONNECTOR → RE-VALIDATE
    │                                                    │
    ├─── Select paren ( / ) ────────────────────► INSERT_PAREN → RE-VALIDATE
    │                                                    │
    ├─── Abandon (Esc/click outside) ───────────► IDLE (no change)
    │
    └─── Select field ──────────────────────────► SELECTING_VALUES
                                                         │
                                            ┌────────────┤
                                            │            │
                                 ┌──────────┴───┐  ┌────┴──────────┐
                                 │ Enum selector │  │ Text input    │
                                 │              │  │               │
                                 │ (see 9.x)    │  │ (see 4.4)    │
                                 └──────────────┘  └───────────────┘
                                            │            │
                                 ┌──────────┴───┐  ┌────┴──────────┐
                                 │ Date selector │  │ Numeric input │
                                 │              │  │               │
                                 │ (see 4.5)    │  │ (see 4.6)    │
                                 └──────────────┘  └───────────────┘
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │  COMMITTING   │
                                    │               │
                                    │  Has values?  │
                                    │  ├─ Yes → CREATE_CHIP
                                    │  └─ No  → ABANDON
                                    └──────────────┘
                                            │
                                     ┌──────┴──────┐
                                     │             │
                                     ▼             ▼
                              CREATE_CHIP      ABANDON
                                  │               │
                                  ▼               ▼
                             RE-VALIDATE       IDLE
                                  │          (no change)
                                  ▼
                               IDLE
                            (chip added,
                             errors updated)
```

### 10.3 Value Editing Flow (Existing Chip)

```
IDLE
  │
  User clicks value area of chip
  │
  ▼
EDITING_VALUES
  │
  Value selector popover opens
  │ (pre-populated with current values)
  │
  ├─── User modifies selections
  │
  ├─── User closes popover (click outside / Esc)
  │       │
  │       ├─── Modified values.length > 0
  │       │       → updateChipValues(chipId, newValues)
  │       │       → RE-VALIDATE
  │       │       → IDLE
  │       │
  │       └─── Modified values.length === 0
  │               → removeToken(chipId)  (auto-remove empty chip)
  │               → RE-VALIDATE
  │               → IDLE
  │
  └─── User confirms (Enter / Cmd+Enter)
          │
          Same as close with values
```

---

## 11. Implementation Recommendations

### 11.1 Changes to TokenError Type

```typescript
// Current
export interface TokenError {
  code: "TOP_LEVEL_OR" | "UNBALANCED_PAREN" | ... ;
  message: string;
}

// Proposed
export interface TokenError {
  code: TokenErrorCode;
  message: string;
  severity: "error" | "warning" | "tolerated";
  recovery?: string; // Human-readable recovery hint
}

export type TokenErrorCode =
  | "TOP_LEVEL_OR"
  | "UNBALANCED_PAREN"
  | "CONSECUTIVE_CONNECTOR"
  | "LEADING_CONNECTOR"
  | "TRAILING_CONNECTOR"
  | "EMPTY_GROUP"
  | "SINGLE_CHILD_GROUP"
  | "UNKNOWN_FIELD"
  | "INVALID_OPERATOR"
  | "EMPTY_VALUES";

export const ERROR_SEVERITY: Record<TokenErrorCode, "error" | "warning" | "tolerated"> = {
  UNKNOWN_FIELD: "error",
  INVALID_OPERATOR: "error",
  EMPTY_VALUES: "error",
  UNBALANCED_PAREN: "error",
  CONSECUTIVE_CONNECTOR: "warning",
  EMPTY_GROUP: "warning",
  SINGLE_CHILD_GROUP: "warning",
  TOP_LEVEL_OR: "warning",
  LEADING_CONNECTOR: "tolerated",
  TRAILING_CONNECTOR: "tolerated",
};
```

### 11.2 Changes to EnumValueSelector

Add search input, filtered list, no-match state, and persistent selection count.

Key props/state additions:
```typescript
// New internal state
const [searchText, setSearchText] = useState("");

// Derived
const filteredValues = useMemo(() => {
  if (!searchText.trim()) return values;
  const q = searchText.toLowerCase();
  return values.filter(v => v.toLowerCase().includes(q));
}, [values, searchText]);

const hiddenSelectionCount = selectedValues.filter(
  v => !filteredValues.includes(v)
).length;
```

### 11.3 Changes to TokenErrorIndicator

Support for severity-based styling:

```typescript
const severityStyles = {
  error: "ring-1 ring-destructive ring-offset-1 ring-offset-background",
  warning: "ring-1 ring-amber-500 ring-offset-1 ring-offset-background",
  tolerated: "", // no visual indicator
};
```

### 11.4 Changes to hasTokenErrors

Add severity-aware variants:

```typescript
export function hasBlockingErrors(tokens: Token[]): boolean {
  return tokens.some(t => t.error?.severity === "error");
}

export function hasWarnings(tokens: Token[]): boolean {
  return tokens.some(t => t.error?.severity === "warning");
}

// Keep existing function for backward compatibility
export function hasTokenErrors(tokens: Token[]): boolean {
  return tokens.some(t => t.error != null && t.error.severity !== "tolerated");
}
```

### 11.5 Alert Banner Enhancement

Show different banners for errors vs warnings:

```typescript
{hasBlockingErrors && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertDescription>
      Some filters have errors and may not be applied. Hover over highlighted tokens for details.
    </AlertDescription>
  </Alert>
)}
{hasWarnings && !hasBlockingErrors && (
  <Alert variant="warning">
    <AlertTriangle className="size-4" />
    <AlertDescription>
      Some filters have warnings. Results may not match your intent. Hover for details.
    </AlertDescription>
  </Alert>
)}
```

### 11.6 Recovery Hints in Tooltips

Add actionable recovery text to error tooltips:

```typescript
// In validateTokens, when setting errors:
setError(token, {
  code: "EMPTY_VALUES",
  message: "Filter must have at least one value.",
  severity: "error",
  recovery: "Click the value area to add values, or remove this filter.",
});

setError(token, {
  code: "TOP_LEVEL_OR",
  message: "OR is not allowed at top level.",
  severity: "warning",
  recovery: "Click to switch to AND, or wrap in parentheses.",
});
```

Updated tooltip rendering:
```tsx
<TooltipContent>
  <p>{error.message}</p>
  {error.recovery && (
    <p className="mt-1 text-muted-foreground">{error.recovery}</p>
  )}
</TooltipContent>
```

---

## 12. Appendix: Error Code Reference

### Complete Error Catalog

| Code | Severity | When | Message | Recovery Hint | Can Occur via Normal UI? |
|------|----------|------|---------|---------------|-------------------------|
| `UNKNOWN_FIELD` | Error | Chip references field key not in schema | Unknown field: "{key}". | Remove this filter. | No (only URL manipulation) |
| `INVALID_OPERATOR` | Error | Operator not in field's operator list | Operator "{op}" is not valid for field "{field}". | Click the operator to change it. | No (only URL manipulation) |
| `EMPTY_VALUES` | Error | Non-unary chip has 0 values | Filter must have at least one value. | Click the value area to add values, or remove this filter. | Rare (operator change from unary to non-unary) |
| `UNBALANCED_PAREN` | Error | Open paren without matching close, or vice versa | Opening/closing parenthesis has no matching pair. | Add the matching parenthesis, or remove this one. | Yes (user adds open paren, forgets close) |
| `CONSECUTIVE_CONNECTOR` | Warning | Two connectors adjacent (e.g., AND AND) | Two connectors cannot appear in a row. | Remove one of the connectors. | Yes (user adds connector from palette next to existing one) |
| `EMPTY_GROUP` | Warning | Paren pair with no chips inside | Group contains no filters. | Add a filter inside the group, or remove the parentheses. | Yes (user adds parens, does not add chip inside) |
| `SINGLE_CHILD_GROUP` | Warning | Paren pair with exactly 1 chip | Group with single filter is unnecessary. Remove parentheses. | Remove the parentheses (the filter will remain). | Yes (user removes one chip from a 2-chip group without cascade catching it) |
| `TOP_LEVEL_OR` | Warning | OR connector at paren depth 0 | OR is not allowed at top level. Wrap in parentheses or use AND. | Click to switch to AND, or add parentheses around this expression. | Rare (direct OR insertion from palette; toggling auto-wraps) |
| `LEADING_CONNECTOR` | Tolerated | Connector at start of sequence or after open paren | (Not displayed) | N/A | Yes (user adds connector at position 0) |
| `TRAILING_CONNECTOR` | Tolerated | Connector at end of sequence or before close paren | (Not displayed) | N/A | Yes (user adds connector at end) |

### Error Frequency in Practice

Based on analysis of the creation and editing flows:

- **Most common**: SINGLE_CHILD_GROUP (user removes one chip from a group), UNBALANCED_PAREN (user adds parens manually)
- **Occasional**: CONSECUTIVE_CONNECTOR (accidental double-add), EMPTY_GROUP (adding parens then getting distracted)
- **Rare**: EMPTY_VALUES (operator switch), TOP_LEVEL_OR (connector toggle edge case)
- **Never via UI**: UNKNOWN_FIELD, INVALID_OPERATOR (URL-only)
- **Always tolerated**: LEADING_CONNECTOR, TRAILING_CONNECTOR (harmless, engine ignores)

---

## Open Questions for Team Debate

1. **Should we add a "Fix all warnings" button?** It could auto-remove redundant parens, swap top-level OR to AND, etc. Risk: users may not understand what changed.

2. **Should SINGLE_CHILD_GROUP auto-unwrap?** Instead of showing a warning, the system could automatically remove unnecessary parens after chip removal. Pro: one less warning. Con: users might be confused about where their parens went.

3. **Should closing the value popover with Esc vs clicking outside have different semantics?** Currently both trigger `onOpenChange(false)`. Some applications treat Esc as "cancel" and click-outside as "confirm." We currently treat both as "confirm if has values." Is this correct?

4. **Should the alert banner count errors?** Instead of "Some filters have validation errors," show "3 filters have errors." This gives the user a target to work toward.

5. **Should numeric ranges have field-specific min/max constraints?** Response Code: 100-599. But adding min/max to `FilterFieldDef` increases schema complexity. Is a loose validation (warning, not block) worth the effort?

---

*This document should be reviewed by: UX Researcher (validate research citations and timing decisions), Product Designer (visual treatment of severity tiers), both Frontend Engineers (implementation feasibility and performance), and QA Tester (testability of all state transitions).*