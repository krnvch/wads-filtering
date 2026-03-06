# Validation Error Surfaces: Research & Design Specification

**Date:** 2026-03-05
**Author Role:** Principal Product Designer
**Subject:** Comprehensive taxonomy of error surfaces for a token-based chip filtering system
**Design System:** shadcn/ui (mandatory) + Radix UI primitives
**Context:** Security operations dashboard — SOC analysts, incident response, developer tools audience

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Error Surfaces Audit](#2-current-error-surfaces-audit)
3. [Error Surface Taxonomy](#3-error-surface-taxonomy)
4. [Strict vs Permissive Validation](#4-strict-vs-permissive-validation)
5. [Error Message Design](#5-error-message-design)
6. ["No Results" Pattern for Enum Search](#6-no-results-pattern-for-enum-search)
7. [Incomplete State Patterns](#7-incomplete-state-patterns)
8. [Recommendations & Implementation Spec](#8-recommendations--implementation-spec)
9. [Decision Log](#9-decision-log)
10. [References](#10-references)

---

## 1. Executive Summary

This document is a deep research deliverable covering WHERE errors should appear and WHAT they should look like in a chip-based token filtering system for a security operations dashboard. It examines 6 distinct error surfaces, 3 validation philosophies, 10 error code types, and 4 incomplete-state scenarios.

**Key findings:**

- **Chip-level error indicators** (red ring + tooltip) are the most important surface but are INSUFFICIENT alone. Tooltips violate NN/g guideline #9 ("Don't hide errors in tooltips requiring hover/focus; make messages permanently visible").
- **Banner alerts** (current global `Alert variant="destructive"`) are appropriate as a secondary summary but should include error count and be collapsible.
- **Inline dropdown errors** are currently MISSING and should be added to value selectors for text and numeric fields.
- **Toast notifications** should NOT be used for validation errors. Toasts auto-dismiss, which violates the principle that error messages must remain visible during correction.
- **Prevention (strict validation) is the correct default** for enum fields in a security operations context, where data integrity matters more than user flexibility. Text/numeric fields should be permissive with flagging.
- **Incomplete states should auto-discard** after popover close, not persist as partial chips.

**Approach recommendation: Hybrid (Approach C)** -- strict prevention for enum/date fields, permissive flagging for text/numeric fields, structural errors flagged but non-blocking.

---

## 2. Current Error Surfaces Audit

### 2.1 What Exists Today

| Surface | Implementation | Component | File |
|---------|---------------|-----------|------|
| Chip red ring | `ring-1 ring-destructive ring-offset-1` wrapper | `TokenErrorIndicator` | `TokenErrorIndicator.tsx` |
| Chip error tooltip | `Tooltip` + `TooltipContent` on hover | `TokenErrorIndicator` | `TokenErrorIndicator.tsx` |
| Connector error styling | `border-destructive text-destructive` on Badge | `ConnectorChip` | `ConnectorChip.tsx` |
| Connector error tooltip | `Tooltip` wrapping entire chip | `ConnectorChip` | `ConnectorChip.tsx` |
| Paren error styling | `border-destructive text-destructive` on Badge | `ParenChip` | `ParenChip.tsx` |
| Paren error tooltip | `Tooltip` wrapping entire chip | `ParenChip` | `ParenChip.tsx` |
| Global bar border | `border-destructive` on toolbar container | `FilterBar` | `FilterBar.tsx` |
| Global alert banner | `Alert variant="destructive"` below bar | `FilterBar` | `FilterBar.tsx` |
| Palette empty state | `CommandEmpty` with "No fields found." | `FilterPalette` | `FilterPalette.tsx` |

### 2.2 What Is MISSING

| Surface | Gap | Impact |
|---------|-----|--------|
| Inline error text on chips | Error only visible on hover (tooltip) | Users with touchscreens or motor impairments cannot discover errors |
| Value selector inline errors | No "invalid value" message inside dropdowns | Users don't know WHY a value is wrong until after chip creation |
| Numeric range validation | No min > max warning in `NumericValueInput` | Users can create inverted ranges silently |
| Date range validation | No end < start warning in `DateValueSelector` | Users can create impossible date ranges |
| Error count in banner | Banner says "some filters" but not how many | Users can't gauge severity |
| Per-field error icon | No `AlertCircle` or `AlertTriangle` on errored chips | Error ring alone is subtle, especially for color-blind users |
| Accessible error announcement | No `aria-invalid` or `role="alert"` on errored tokens | Screen readers don't announce validation failures |

### 2.3 Error Codes vs Surfaces Matrix

Current error codes (from `token-validation.ts`) mapped to which surface should display them:

| Error Code | Chip Ring | Tooltip | Banner | Inline Dropdown | Preventable? |
|-----------|-----------|---------|--------|----------------|-------------|
| `TOP_LEVEL_OR` | Yes (on OR token) | Yes | Yes | N/A | No -- structural |
| `UNBALANCED_PAREN` | Yes (on orphan paren) | Yes | Yes | N/A | No -- structural |
| `CONSECUTIVE_CONNECTOR` | Yes (on second connector) | Yes | Yes | N/A | Partially -- auto-correct possible |
| `EMPTY_GROUP` | Yes (on both parens) | Yes | Yes | N/A | Yes -- prevent empty group creation |
| `SINGLE_CHILD_GROUP` | Yes (on both parens) | Yes | Yes | N/A | No -- can result from removing chips |
| `UNKNOWN_FIELD` | Yes | Yes | Yes | N/A | Yes -- palette only shows known fields |
| `INVALID_OPERATOR` | Yes | Yes | Yes | N/A | Yes -- operator selector filters by field type |
| `EMPTY_VALUES` | Yes | Yes | Yes | Yes (in value selector) | Partially -- prevent confirm with empty values |

---

## 3. Error Surface Taxonomy

### Surface 1: Chip-Level Error Indicator

**What it handles:** Per-token validation errors (UNKNOWN_FIELD, INVALID_OPERATOR, EMPTY_VALUES, structural errors on connectors/parens).

**When shown:** Immediately after `validateTokens()` runs on any token sequence change.

**When hidden:** When the error condition is resolved (value added, operator fixed, structural issue corrected).

#### Current Implementation
```
  +----------------------------------------------+
  | [Status] [is any of] [Blocked, Monitored]  x |  <-- normal chip
  +----------------------------------------------+

  +----------------------------------------------+
  | [Status] [is any of] []                    x |  <-- error chip
  +----------------------------------------------+
  ^-- ring-1 ring-destructive ring-offset-1
      (red ring around entire chip)
      Tooltip on hover: "Filter must have at least one value."
```

#### Assessment

**Pros:**
- Precise: error is visually attached to the exact token that has the problem
- Non-intrusive: doesn't take extra space or push layout
- Consistent with shadcn/ui's `destructive` variant pattern

**Cons:**
- **Tooltip-only message is a critical gap.** NN/g guideline #9 explicitly warns: "Don't hide errors in tooltips requiring hover/focus." The error message should be permanently visible or at least accessible without hover.
- **Color-only indication fails WCAG 1.4.1.** Red ring alone is not perceivable by color-blind users (~8% of male users). Needs an icon or text supplement.
- **Touch devices have no hover.** Mobile/tablet SOC analysts using a touch interface cannot discover the error message at all.
- **No `aria-invalid`** on the errored element. Screen readers don't announce the error.

#### Recommended Enhancement

```
  +--[!]------------------------------------------+
  | [Status] [is any of]                        x |
  +------------------------------------------------+
  ^-- ring-1 ring-destructive
  ^-- AlertCircle icon (size-3) prepended to chip content
  ^-- aria-invalid="true" on the Badge
  ^-- Tooltip remains for detailed message on hover
```

**shadcn/ui components:** `Badge` (existing), `Tooltip` (existing), lucide `AlertCircle` icon.

**Key change:** Add a small `AlertCircle` icon (size-3, `text-destructive`) as the first child inside the Badge for errored chips. This makes the error perceivable without hover and without relying on color alone.

**Products that do this:**
- **Sentry SearchQueryBuilder**: Red underline on invalid tokens + inline error text below the search bar
- **Kibana FilterBar**: Error/warning badge indicators on filters referencing missing index patterns (GitHub issue #67177)
- **Gmail filter chips**: Red outline + exclamation mark icon on invalid filter conditions
- **Linear**: Red text + icon on invalid filter values

---

### Surface 2: Global Banner Alert

**What it handles:** Summary-level awareness that the filter bar contains errors. Catches cases where individual chip errors might be off-screen (horizontal scroll or wrapped lines).

**When shown:** When `hasTokenErrors(tokens)` returns true.

**When hidden:** When all token errors are resolved.

#### Current Implementation
```
  +---+---------------------------------------------------+
  | ! | Some filters have validation errors. Hover over   |
  |   | highlighted tokens for details.                    |
  +---+---------------------------------------------------+
  ^-- Alert variant="destructive" with AlertCircle icon
```

#### Assessment

**Pros:**
- Guarantees visibility: even if errored tokens are not in viewport, user knows there's a problem
- Uses standard `Alert` component -- consistent with shadcn/ui

**Cons:**
- **Generic message.** "Some filters have validation errors" doesn't say how many or which types. A SOC analyst with 15 tokens needs to know "2 filters have errors" vs "8 filters have errors" to decide whether to investigate or clear all.
- **Always visible when errors exist.** No way to dismiss or collapse. This is fine for 1-2 errors but becomes noise for structural errors that the user is actively fixing.
- **"Hover over highlighted tokens"** is bad guidance for touch users and screen reader users.

#### Recommended Enhancement

```
  +---+---------------------------------------------------+---+
  | ! | 2 filters have validation errors.                 | x |
  +---+---------------------------------------------------+---+
        ^-- Error count included
        ^-- "Hover over..." removed (touch-hostile)
        ^-- Dismissible via x button (but reappears if errors change)
```

**Message template:**
- 1 error: `"1 filter has a validation error."`
- N errors: `"{N} filters have validation errors."`
- With context: `"2 filters have validation errors: 1 missing value, 1 invalid operator."`

**shadcn/ui components:** `Alert` variant="destructive" (existing), `AlertDescription` (existing), `Button` variant="ghost" size="icon-xs" for dismiss.

**Products that do this:**
- **Grafana**: Error count in alert banner ("2 queries have errors")
- **Jira JQL**: "The value 'xyz' does not exist for the field 'status'." with specific error detail
- **Datadog**: Red banner below query bar with specific syntax error message

---

### Surface 3: Field-Level Inline Error (Inside Value Selector)

**What it handles:** Value-level validation errors caught DURING creation, before the chip is committed. This is the "prevention" layer.

**When shown:** Inside the Popover content of a value selector, below the input field.

**When hidden:** When the validation condition is resolved.

#### Current State: DOES NOT EXIST

None of the four value selectors (`EnumValueSelector`, `TextValueInput`, `DateValueSelector`, `NumericValueInput`) currently show inline validation errors.

#### Error Scenarios by Value Selector

**NumericValueInput:**
| Scenario | Error Message |
|----------|--------------|
| Min > Max in range | "Minimum must be less than maximum." |
| Non-numeric input | Prevented by `type="number"` on Input |
| Empty value + Apply | Button disabled (already implemented) |
| Negative value when field doesn't allow it | "Value must be a positive number." |

**DateValueSelector:**
| Scenario | Error Message |
|----------|--------------|
| End date before start date | "End date must be after start date." |
| Future date for "Last seen" field | "Date cannot be in the future." |
| Invalid date format | Prevented by Calendar component |

**TextValueInput:**
| Scenario | Error Message |
|----------|--------------|
| Value exceeds max length | "Value must be under {max} characters." |
| Whitespace-only value | "Value cannot be empty." |
| Duplicate value already in selection | Prevented (already implemented: `!selectedValues.includes(trimmed)`) |

**EnumValueSelector:**
| Scenario | Error Message |
|----------|--------------|
| No search results | See Section 6 below |
| All values already selected | "All available values are already selected." |

#### Recommended Design

```
  +------------------------------------------+
  | From                                     |
  | [  150  ]                                |
  | To                                       |
  | [  50   ]                                |
  | ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  | ! Minimum must be less than maximum.     |  <-- inline error
  | ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  | [ Apply ]  (disabled)                    |
  +------------------------------------------+
```

**shadcn/ui implementation:**
```tsx
{hasError && (
  <p className="text-xs text-destructive flex items-center gap-1 px-3 py-1">
    <AlertCircle className="size-3 shrink-0" />
    {errorMessage}
  </p>
)}
```

Use `text-destructive` from the shadcn/ui theme (maps to `hsl(var(--destructive))`) for the error text. Use `AlertCircle` from lucide-react at `size-3` for the icon. Place below the input and above the Apply button.

**Disable the Apply button** when inline validation fails. This is the prevention layer.

**Products that do this:**
- **Linear**: Inline red text below filter value inputs
- **Notion**: Red helper text below date range selectors when end < start
- **Figma**: Inline validation in numeric inputs (e.g., "Value must be between 0 and 100")

---

### Surface 4: Toast Notification

**What it handles:** Theoretically could handle transient error notifications.

#### Assessment: DO NOT USE FOR VALIDATION ERRORS

**Rationale (strongly against):**

1. **Auto-dismiss violates error persistence.** NN/g: "Error messages should remain visible while users make corrections." Toasts disappear in 3-5 seconds, which is often before the user has read and processed the message.

2. **Positional disconnect.** Toasts appear at the edge of the viewport (top-right or bottom-right), far from the filter bar where the error exists. Users cannot read the error and fix the chip simultaneously.

3. **Not stackable for multiple errors.** If a user pastes a URL with 5 invalid tokens, showing 5 simultaneous toasts would be chaotic.

4. **Industry consensus.** No major filtering product (Sentry, Datadog, Kibana, Grafana, Linear, GitHub) uses toasts for filter validation errors.

**One valid exception:** Toasts ARE appropriate for _operational_ feedback that is not an error:
- "Filters applied" (success)
- "Filters cleared" (info)
- "Filter URL copied to clipboard" (success)
- "Legacy filter format auto-upgraded" (info -- migration notice)

**shadcn/ui component:** `Sonner` (already available via `npx shadcn@latest add sonner`). Use for success/info feedback, never for validation errors.

---

### Surface 5: Bar-Level Border Indicator

**What it handles:** A subtle ambient signal that the filter bar contains errors, even before reading the banner.

#### Current Implementation
```
  className={cn(
    "flex min-h-10 flex-wrap items-center gap-0.5 rounded-lg border bg-background px-3 py-1.5",
    hasErrors && "border-destructive",
  )}
```

#### Assessment

**Pros:**
- Zero-cost ambient signal. No extra space, no extra components.
- Consistent with shadcn/ui `aria-invalid` styling on `Input` component.

**Cons:**
- Subtle. A `1px` border color change is easy to miss.
- No semantic meaning without the banner below it.

#### Recommended Enhancement

Keep as-is. The bar border is a supporting signal, not a primary error surface. The combination of:
1. Individual chip error indicators (primary)
2. Bar border color (ambient)
3. Banner alert (summary)

...creates a 3-tier hierarchy that works at every attention level.

**One small addition:** Add `aria-invalid="true"` to the toolbar div when `hasErrors` is true, so screen readers announce the error state.

---

### Surface 6: Accessible Error Announcements

**What it handles:** Screen reader users who cannot perceive visual error indicators.

#### Current State: PARTIALLY MISSING

The `FilterAnnouncer` component handles result count announcements but does NOT announce validation errors. The `role="alert"` on the `Alert` banner means the destructive alert IS announced, but individual token errors are not.

#### Recommended Addition

When `hasErrors` transitions from `false` to `true`, announce via the existing assertive live region:
```
"2 filters have validation errors."
```

When a specific token acquires an error (e.g., user removes a value), announce:
```
"Status filter: Filter must have at least one value."
```

**shadcn/ui components:** No new component needed. Use the existing `FilterAnnouncer` with `aria-live="assertive"`.

---

## 4. Strict vs Permissive Validation

### 4.1 Three Approaches Defined

#### Approach A: Strict (Prevention-First)

| Aspect | Behavior |
|--------|----------|
| Enum values | ONLY predefined values from `fieldDef.values` |
| Text values | Any text accepted, but length limits enforced |
| Numeric values | Only valid numbers, range constraints enforced |
| Date values | Only valid dates from Calendar, presets only |
| Structural (AND/OR/parens) | Invalid structures prevented where possible |
| Apply/Confirm button | Disabled until input is valid |
| "No results" in enum search | Dead end -- must try different search term |

**Mental model:** "The system won't let me create something broken."

#### Approach B: Permissive (Flag-After)

| Aspect | Behavior |
|--------|----------|
| Enum values | Any typed value accepted, even non-matching |
| Text values | Any text accepted, no length limits |
| Numeric values | Any text accepted (flag non-numeric after) |
| Date values | Typed dates accepted, even invalid formats |
| Structural | Any token sequence allowed, flag errors |
| Apply/Confirm button | Always enabled |
| Invalid values | Shown as errored chips after creation |

**Mental model:** "I can build anything, fix later."

#### Approach C: Hybrid (RECOMMENDED)

| Field Type | Validation Strategy | Rationale |
|-----------|-------------------|-----------|
| **Enum** | **Strict** | Finite known values; preventing invalid values costs nothing and saves query failures |
| **Text** | **Permissive** | Infinite possible values; system cannot know all valid inputs (endpoints, hostnames, parameters) |
| **Numeric** | **Permissive with guardrails** | Prevent non-numeric at input level (`type="number"`), flag range inversions inline, allow any valid number |
| **Date** | **Strict for presets, permissive for absolute** | Presets are finite and validated; absolute dates validated by Calendar component |
| **Structural** | **Flag, don't block** | Structural errors (TOP_LEVEL_OR, UNBALANCED_PAREN) can result from mid-edit states. Blocking would make editing impossible. Flag and let users fix. |
| **Empty values** | **Prevent at creation, flag after edit** | Don't allow confirming with 0 values (Apply disabled). But if values are removed from an existing chip, flag rather than delete. |

### 4.2 Evidence by User Context

#### Security Operations Context (SOC Analysts)

SOC analysts deal with high-stress, time-sensitive scenarios (active incident response). Research on SOC dashboard design (2025) shows:

- **Alert fatigue is the #1 operational challenge.** SOC teams receive 4,000+ alerts daily. Adding false validation errors would contribute to alert fatigue.
- **False positives erode trust.** If the system flags valid filters as errors, analysts will learn to ignore all error indicators.
- **Speed matters more than completeness.** Analysts need to build filters quickly to narrow attack scope. Prevention barriers slow them down.
- **Data integrity is critical.** Filtering on a misspelled attack type that returns 0 results wastes investigation time.

**Conclusion for SOC context:** Strict enum validation is essential (prevent wasted queries), but text fields must be permissive (analysts need to enter arbitrary IPs, endpoints, hostnames that the system cannot validate).

#### Developer Tools Context

Developer tool users (the secondary audience) expect:

- **Power-user flexibility.** Developers expect to type values directly, not just select from lists.
- **Immediate feedback.** Show errors fast, but don't block input.
- **Undo over prevention.** Developers prefer to fix mistakes rather than be prevented from making them.

**Conclusion for dev tools context:** Hybrid approach aligns perfectly. Enum strict, text permissive, fast error feedback.

#### Enterprise Products Context

Enterprise products (the tertiary reference) prioritize:

- **Audit trails and compliance.** Invalid filters could lead to incorrect data views, which has compliance implications.
- **Consistency across users.** If one user can create arbitrary enum values but another cannot, it creates confusion.
- **Administrative control.** Enum values often come from an admin-controlled vocabulary.

**Conclusion for enterprise context:** Strict enum validation is non-negotiable. Text/numeric permissiveness is acceptable.

### 4.3 Analysis Summary

| | Strict (A) | Permissive (B) | Hybrid (C) |
|-|-----------|----------------|------------|
| **SOC analysts** | Too slow for text fields | Risk of invalid enum queries | Best fit |
| **Developers** | Frustrating for power users | Familiar (like Kibana) | Best fit |
| **Enterprise** | Best for compliance | Risky for data integrity | Best fit |
| **Accessibility** | Prevention reduces error recovery | More error states to announce | Balanced |
| **Implementation complexity** | Low (restrict inputs) | Low (flag after) | Medium (per-field strategy) |

**Recommendation: Approach C (Hybrid)** with the specific field-type mapping from the table above.

### 4.4 Implementation Matrix

| Error Code | Prevention Strategy | Flag Strategy |
|-----------|-------------------|---------------|
| `UNKNOWN_FIELD` | Palette only shows known fields (already prevented) | Flag if URL-imported with unknown field |
| `INVALID_OPERATOR` | Operator selector only shows valid operators (already prevented) | Flag if URL-imported with invalid operator |
| `EMPTY_VALUES` | Disable Apply/Confirm when values empty (partial prevention) | Flag if values removed from existing chip |
| `TOP_LEVEL_OR` | Cannot prevent -- editing sequence creates transient states | Flag immediately, auto-resolve on fix |
| `UNBALANCED_PAREN` | Cannot prevent -- adding `(` before `)` is normal flow | Flag immediately, auto-resolve on fix |
| `CONSECUTIVE_CONNECTOR` | Could auto-correct (remove duplicate) | Flag, or silently deduplicate |
| `EMPTY_GROUP` | Could prevent (auto-remove empty parens) | Flag with suggestion "Remove empty group" |
| `SINGLE_CHILD_GROUP` | Do not prevent (can result from removing 2nd chip) | Flag with suggestion "Remove unnecessary parentheses" |

---

## 5. Error Message Design

### 5.1 Tone Guidelines

This is a security operations tool used by technical professionals. Error messages should be:

| Attribute | Guideline | Example |
|----------|-----------|---------|
| **Technical** | Use domain terminology, not baby language | "Operator" not "the way you're comparing" |
| **Specific** | Name the exact problem | "Status must be one of: Blocked, Monitored, Started" not "Invalid value" |
| **Actionable** | Tell users what to DO | "Add at least one value" not "Values are empty" |
| **Concise** | Max ~12 words for inline, ~20 words for banner | "Missing value. Select from the dropdown." |
| **Non-blaming** | Passive voice or system-as-subject | "Filter must have at least one value" not "You didn't select any values" |
| **Technical-confident** | No hedging, exclamation marks, or apologizing | "OR is not allowed at top level." not "Oops! OR might not work here." |

### 5.2 Error Message Catalog

Revised messages for all 10 error codes, with short form (chip tooltip) and long form (banner detail):

| Code | Short (Tooltip/Icon) | Long (Banner/Accessible) | Actionable Hint |
|------|---------------------|--------------------------|----------------|
| `TOP_LEVEL_OR` | "OR not allowed at top level" | "OR connectors must be inside parentheses at the top level. Wrap in ( ) or use AND." | Wrap in parens |
| `UNBALANCED_PAREN` (open) | "Missing closing parenthesis" | "Opening parenthesis has no matching ). Add a closing parenthesis." | Add ) |
| `UNBALANCED_PAREN` (close) | "Missing opening parenthesis" | "Closing parenthesis has no matching (. Add an opening parenthesis." | Add ( |
| `CONSECUTIVE_CONNECTOR` | "Duplicate connector" | "Two connectors in a row. Remove one." | Remove connector |
| `LEADING_CONNECTOR` | "Connector at start" | "Connector cannot appear at the start of a group." | Remove or add filter before |
| `TRAILING_CONNECTOR` | "Connector at end" | "Connector cannot appear at the end of a group." | Remove or add filter after |
| `EMPTY_GROUP` | "Empty group" | "Group contains no filters. Add filters or remove the parentheses." | Add filters or remove () |
| `SINGLE_CHILD_GROUP` | "Unnecessary grouping" | "Group with a single filter is unnecessary. Remove the parentheses." | Remove () |
| `UNKNOWN_FIELD` | "Unknown field: {field}" | "The field \"{field}\" is not recognized. It may have been removed or renamed." | Remove filter |
| `INVALID_OPERATOR` | "Invalid operator for {fieldLabel}" | "The operator \"{operator}\" is not valid for the \"{fieldLabel}\" field." | Change operator |
| `EMPTY_VALUES` | "Missing value" | "Filter must have at least one value. Click to add a value." | Click to edit |

### 5.3 Message Positioning

Based on NN/g guideline #3 ("Keep error messages directly adjacent to problematic fields") and guideline #9 ("Don't hide errors in tooltips"):

| Surface | Position | Persistence |
|---------|----------|------------|
| Chip error icon | Inside Badge, before field label | Always visible when error exists |
| Chip tooltip | Above chip (side="top") | Visible on hover/focus |
| Banner | Below filter bar | Always visible when errors exist; dismissible |
| Inline (value selector) | Below input, above Apply button | Visible while condition persists |
| Accessible announcement | Live region (off-screen) | Announced once on error appearance |

### 5.4 Visual Design Tokens

All error visuals use shadcn/ui theme variables:

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| Error text | `text-destructive` | Error messages, icon color |
| Error background | `bg-destructive/10` | Subtle background on errored chips (optional) |
| Error border | `border-destructive` | Ring/border on errored elements |
| Error ring | `ring-destructive` | Focus ring variant for errored elements |
| Warning text | `text-amber-600 dark:text-amber-400` | Warning messages (SINGLE_CHILD_GROUP) |
| Warning border | `border-amber-500` | Warning ring (less severe than error) |

**Warning vs Error severity classification:**

| Severity | Error Codes | Visual Treatment |
|----------|------------|-----------------|
| **Error** (query will fail or produce wrong results) | TOP_LEVEL_OR, UNBALANCED_PAREN, UNKNOWN_FIELD, INVALID_OPERATOR, EMPTY_VALUES, CONSECUTIVE_CONNECTOR | `text-destructive`, `border-destructive`, `ring-destructive` |
| **Warning** (query works but is suboptimal) | EMPTY_GROUP, SINGLE_CHILD_GROUP, LEADING_CONNECTOR, TRAILING_CONNECTOR | `text-amber-600 dark:text-amber-400`, `border-amber-500` |

This distinction is critical. Currently all error codes produce the same red treatment. Differentiating severity helps SOC analysts focus on real problems vs cosmetic issues.

---

## 6. "No Results" Pattern for Enum Search

### 6.1 Current State

The `EnumValueSelector` does NOT have a search/filter feature. It displays all values in a scrollable list with checkboxes. There is no empty state because all values are always shown.

The `FilterPalette` uses `CommandEmpty` with "No fields found." when field search yields no results.

### 6.2 The Key Scenario

When enum search IS added (for fields with many values like "Attack type" with 20 values), the user types a search term that matches nothing.

### 6.3 Design Options

#### Option A: Minimal Empty State
```
  +------------------------------------------+
  | [Search values...]                       |
  |                                          |
  |        No matching values.               |
  |                                          |
  | ↵ apply . Cmd ↵ select more              |
  +------------------------------------------+
```

**Pros:** Simple, clear, matches `CommandEmpty` pattern.
**Cons:** Dead end -- user must manually clear search and try again.

#### Option B: Empty State with Search Echo
```
  +------------------------------------------+
  | [Blockd]                                 |
  |                                          |
  |   No values matching "Blockd".           |
  |                                          |
  | ↵ apply . Cmd ↵ select more              |
  +------------------------------------------+
```

**Pros:** Confirms what the user searched for, helps identify typos.
**Cons:** Slightly more code, but trivially simple.

#### Option C: Empty State with Fuzzy Suggestions
```
  +------------------------------------------+
  | [Blockd]                                 |
  |                                          |
  |   No exact match for "Blockd".           |
  |   Did you mean:                          |
  |   [ ] Blocked                            |
  |                                          |
  | ↵ apply . Cmd ↵ select more              |
  +------------------------------------------+
```

**Pros:** Guides the user to the right value. Reduces frustration.
**Cons:** Requires fuzzy matching algorithm. Could suggest wrong things.

#### Option D: Empty State with "Create Custom" Option
```
  +------------------------------------------+
  | [Custom Value]                           |
  |                                          |
  |   No matching values.                    |
  |   + Create "Custom Value"                |
  |                                          |
  | ↵ apply . Cmd ↵ select more              |
  +------------------------------------------+
```

**Pros:** Maximum flexibility for power users.
**Cons:** Violates the hybrid validation model. Enum fields should be strict -- allowing custom values undermines data integrity. Would create `UNKNOWN_VALUE` errors (a new error code we'd need to add).

### 6.4 Recommendation: Option B (Search Echo) with Future Path to Option C

**Rationale:**

1. **Strict enum validation means no "Create Custom" option (Option D).** Enum values are predefined. The system should NOT offer to create arbitrary values for enum fields. This is the core of the hybrid validation model.

2. **Search echo (Option B) catches the most common case** -- typos. When a SOC analyst types "Blockd" instead of "Blocked", seeing the echo helps them identify the typo immediately.

3. **Fuzzy suggestions (Option C) are a future enhancement.** Implementing Levenshtein distance or similar fuzzy matching adds complexity. It can be added in a later phase. The empty state should be designed to accommodate this addition (leave space for a "Did you mean" section).

4. **Minimal empty state (Option A) is insufficient** for a professional tool. "No matching values" without echoing the search term is unhelpful.

**Implementation:**

```tsx
<CommandEmpty>
  <div className="flex flex-col items-center gap-1 py-4">
    <p className="text-sm text-muted-foreground">
      No values matching &ldquo;{searchTerm}&rdquo;
    </p>
  </div>
</CommandEmpty>
```

**shadcn/ui components:** `CommandEmpty` (existing). Style with `text-muted-foreground` for the message text.

**Products that do this:**
- **GitHub Issue Filters**: "No labels matching 'xyz'" with search term echoed
- **Sentry**: "No items found" with the search term displayed
- **Notion**: "No results" with dimmed search term echo
- **Slack channel filter**: "No channels matching 'xyz'"

---

## 7. Incomplete State Patterns

### 7.1 State Machine: Filter Creation Flow

```
                         [User clicks field]
                                |
                                v
  IDLE  -----> FIELD_SELECTED -----> OPERATOR_SELECTED -----> VALUE_SELECTING -----> COMMITTED
   ^              |                       |                        |                     |
   |              |  (close/escape)       |  (close/escape)        |  (close/escape)     |
   |              v                       v                        v                     |
   +-------  DISCARDED  <-----------  DISCARDED  <-----------  DECIDE  <----------------+
                                                                  |
                                                          Has values? --yes--> COMMIT
                                                                  |
                                                                 no
                                                                  |
                                                                  v
                                                              DISCARD
```

### 7.2 Scenario Analysis

#### Scenario 1: Field Selected, No Operator Yet

**Current behavior:** The palette closes, and a value selector Popover opens immediately. The operator is auto-assigned based on field type (see `getDefaultOperatorForField()`).

**This scenario does not exist in the current UI** because operator selection is implicit. The default operator is always applied.

**Recommendation:** Keep current behavior. The auto-operator-then-value-selector flow eliminates this incomplete state entirely.

#### Scenario 2: Operator Selected, No Value Yet (Popover Open)

**Current behavior:** The value selector Popover is open. User has not selected/typed any value.

**What shows:**
- Enum: Empty checkbox list (nothing checked)
- Text: Empty input field with placeholder "Type {field}..."
- Date: Preset list or calendar (nothing selected)
- Numeric: Empty input with placeholder "Enter number"

**If user closes the popover (Escape/click outside) with no values:**

**Current behavior (from `handlePendingOpenChange`):**
```typescript
if (!open && pendingValues.length > 0) {
  // Commit with current values
  onAddFilter(pendingField.key, pendingValues, op, clampedInsertionIndex);
}
// Always clear pending state
setPendingField(null);
setPendingValues([]);
```

**Result:** If `pendingValues.length === 0`, the pending state is DISCARDED silently. No chip is created. No error shown.

**Assessment: This is CORRECT.** Discarding is the right behavior because:
1. A chip with no values would immediately have an `EMPTY_VALUES` error.
2. Creating an error state that the user didn't intend adds frustration.
3. The mental model is: "I changed my mind" -- escaping/closing means "cancel."
4. Every major product (Linear, Sentry, GitHub, Notion) discards on close-without-value.

**Recommendation:** Keep current behavior. No change needed.

#### Scenario 3: Values Partially Selected, Popover Closes

**Current behavior (from `handlePendingOpenChange`):**
```typescript
if (!open && pendingValues.length > 0) {
  onAddFilter(pendingField.key, pendingValues, op, clampedInsertionIndex);
  saveRecent(pendingField, op, pendingValues);
}
```

**Result:** If the user selected some values and then clicks outside (closes the popover), the chip IS committed with the selected values. This is intentional -- the user made active selections.

**Assessment: This is CORRECT and essential.** Discarding selected values on accidental close would be a data loss pattern. The user explicitly chose values.

**Recommendation:** Keep current behavior. This is the "commit on close" pattern used by Linear, Notion, and Figma.

#### Scenario 4: Value Selector Open, User Navigates Away

This is a variant of Scenario 2/3 but triggered by browser navigation rather than popover close.

**Current behavior:** React component unmounts. State is lost. Nothing persists.

**Assessment: This is CORRECT.** Pending filter state should NOT be persisted to URL or localStorage. It's ephemeral UI state. If the user navigates away, they've abandoned the filter creation.

**Recommendation:** Keep current behavior. No change needed.

### 7.3 Timeout Behavior

**Should incomplete states auto-dismiss after a timeout?**

**Recommendation: NO.** Auto-dismissing is hostile UX. The user may be:
- Reading documentation in another tab while deciding which value to select
- On a phone call while looking at the value list
- Slow due to disability

No major product auto-dismisses value selectors. Popovers should remain open until the user actively closes them or commits a value.

### 7.4 Visual Treatment of Pending State

While the value selector is open, the filter bar shows a placeholder for the pending field:

```
  [Status is any of Blocked]  [AND]  [Impact...]   [ Filter... ]
                                      ^^^^^^^^^
                                      Pending field placeholder
                                      (text-muted-foreground)
```

**Current implementation:**
```tsx
const trigger = (
  <span className="text-sm text-muted-foreground">
    {field.label}...
  </span>
);
```

**Assessment: This is good.** The muted text with ellipsis signals "in progress" without creating a full chip. It's lightweight and non-committal.

**Potential enhancement:** Add a subtle pulsing animation to the pending placeholder to indicate the system is waiting for input:

```tsx
<span className="text-sm text-muted-foreground animate-pulse">
  {field.label}...
</span>
```

However, this may be too much visual noise. **Recommendation: Keep current static treatment.** Pulse animation is optional and should only be added if user testing reveals confusion about the pending state.

---

## 8. Recommendations & Implementation Spec

### 8.1 Priority-Ordered Changes

| Priority | Change | Surface | Effort | Impact |
|----------|--------|---------|--------|--------|
| **P0** | Add `AlertCircle` icon to errored chips | Chip-level | S | High -- WCAG compliance, color-blind support |
| **P0** | Add `aria-invalid="true"` to errored tokens | Chip-level | XS | High -- screen reader support |
| **P0** | Add error count to banner message | Banner | XS | Medium -- actionable information |
| **P1** | Add inline validation to `NumericValueInput` (min > max) | Inline dropdown | S | Medium -- prevents invalid range chips |
| **P1** | Add inline validation to `DateValueSelector` (end < start) | Inline dropdown | S | Medium -- prevents impossible date ranges |
| **P1** | Add search + empty state to `EnumValueSelector` | Inline dropdown | M | High -- needed for fields with many values |
| **P1** | Distinguish error vs warning severity | All surfaces | M | Medium -- reduces alert fatigue |
| **P2** | Add error announcement to `FilterAnnouncer` | Accessible | S | High for a11y users |
| **P2** | Make banner dismissible | Banner | XS | Low -- nice to have |
| **P2** | Add "All values selected" state to enum selector | Inline dropdown | XS | Low -- edge case |
| **P3** | Add fuzzy suggestions to enum empty state | Inline dropdown | M | Medium -- future enhancement |

### 8.2 Component-Level Specs

#### 8.2.1 Enhanced `TokenErrorIndicator`

```tsx
// BEFORE:
<span className={cn(
  "rounded-sm ring-1 ring-destructive ring-offset-1 ring-offset-background",
  className,
)}>
  {children}
</span>

// AFTER:
<span
  className={cn(
    "rounded-sm ring-1 ring-offset-1 ring-offset-background",
    isWarning ? "ring-amber-500" : "ring-destructive",
    className,
  )}
  aria-invalid="true"
>
  {children}
</span>
```

**New prop:** `severity: "error" | "warning"` derived from error code classification.

#### 8.2.2 Enhanced Error Icon in `FilterChip`

Add an `AlertCircle` icon as the first visible element inside the Badge when the chip has an error:

```tsx
<Badge
  variant="secondary"
  aria-invalid={!!error}
  className={cn(
    "group relative gap-1 rounded-md py-1 pl-2 pr-2 text-sm font-normal",
    error && "pl-1.5",
    className,
  )}
>
  {error && (
    <AlertCircle
      className={cn(
        "size-3 shrink-0",
        isWarning(error.code) ? "text-amber-500" : "text-destructive",
      )}
      aria-hidden="true"
    />
  )}
  <span className="text-foreground">{condition.fieldLabel}</span>
  {/* ... operator, value, remove button */}
</Badge>
```

**Visual result:**
```
  Normal:    [Status] [is any of] [Blocked, Monitored] x
  Error:   [!] [Status] [is any of] []                 x
  Warning: [!] [(] [Status is Blocked] [)]              x
             ^                          ^
             amber icon                 amber icon
```

#### 8.2.3 Enhanced Banner Alert

```tsx
{hasErrors && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertDescription>
      {errorCount === 1
        ? "1 filter has a validation error."
        : `${errorCount} filters have validation errors.`}
    </AlertDescription>
  </Alert>
)}
```

#### 8.2.4 Inline Validation for `NumericValueInput`

Add validation state and error display:

```tsx
const rangeError = useMemo(() => {
  if (!isRange) return null;
  if (value1 === "" || value2 === "") return null;
  const n1 = parseFloat(value1);
  const n2 = parseFloat(value2);
  if (isNaN(n1) || isNaN(n2)) return null;
  if (n1 > n2) return "Minimum must be less than maximum.";
  if (n1 === n2) return "Minimum and maximum cannot be equal.";
  return null;
}, [isRange, value1, value2]);

// In JSX, below the inputs and above the Apply button:
{rangeError && (
  <p className="flex items-center gap-1 text-xs text-destructive">
    <AlertCircle className="size-3 shrink-0" />
    {rangeError}
  </p>
)}
<Button
  size="sm"
  className="w-full"
  onClick={handleApply}
  disabled={
    (isRange ? value1 === "" || value2 === "" : value1 === "") ||
    !!rangeError
  }
>
  Apply
</Button>
```

#### 8.2.5 Inline Validation for `DateValueSelector`

For the range (`between_dates`) operator, validate that end date is after start date:

```tsx
const dateRangeError = useMemo(() => {
  if (!isRangeOperator(operator)) return null;
  if (selectedValues.length !== 2) return null;
  const [start, end] = selectedValues;
  if (new Date(end) < new Date(start)) {
    return "End date must be after start date.";
  }
  return null;
}, [operator, selectedValues]);
```

#### 8.2.6 Enum Search + Empty State for `EnumValueSelector`

Add a search input and `CommandEmpty`-style empty state:

```tsx
// Add search state
const [searchTerm, setSearchTerm] = useState("");

const filteredValues = useMemo(() => {
  if (!searchTerm.trim()) return values;
  const q = searchTerm.toLowerCase();
  return values.filter((v) => v.toLowerCase().includes(q));
}, [values, searchTerm]);

// In JSX:
<div className="border-b px-3 py-2">
  <Input
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder={`Search ${fieldDef.label.toLowerCase()}...`}
    className="h-8 text-sm"
  />
</div>
{filteredValues.length === 0 ? (
  <div className="py-6 text-center text-sm text-muted-foreground">
    No values matching &ldquo;{searchTerm}&rdquo;
  </div>
) : (
  <div ref={listRef} className="max-h-[240px] overflow-y-auto py-1">
    {filteredValues.map((value, index) => (
      // ... existing checkbox rows
    ))}
  </div>
)}
```

### 8.3 Error Severity Classification

New utility function to classify error severity:

```typescript
// In token-validation.ts or a new token-error-utils.ts

type ErrorSeverity = "error" | "warning";

const WARNING_CODES: Set<TokenError["code"]> = new Set([
  "EMPTY_GROUP",
  "SINGLE_CHILD_GROUP",
  "LEADING_CONNECTOR",
  "TRAILING_CONNECTOR",
]);

export function getErrorSeverity(code: TokenError["code"]): ErrorSeverity {
  return WARNING_CODES.has(code) ? "warning" : "error";
}

export function isWarningError(code: TokenError["code"]): boolean {
  return WARNING_CODES.has(code);
}
```

**Rationale for classification:**
- `EMPTY_GROUP` and `SINGLE_CHILD_GROUP` do not cause query failures -- they're structural suggestions.
- `LEADING_CONNECTOR` and `TRAILING_CONNECTOR` are currently skipped in validation anyway (tolerated during expression-tree evaluation).
- All other codes represent real problems that will cause incorrect query results or evaluation failures.

---

## 9. Decision Log

### Decision: Error Icon on Chips
- **Date**: 2026-03-05
- **Decided by**: Product Designer
- **Context**: Red ring alone fails WCAG 1.4.1 (color-only indicator). Tooltip-only messages fail NN/g guideline #9.
- **Options**: (A) Keep ring-only, (B) Add icon inside chip, (C) Add inline text below chip, (D) Add icon + inline text
- **Decision**: Option B -- add `AlertCircle` icon inside the Badge. Minimal space cost, WCAG compliant, no layout shift.
- **Dissent**: Option C (inline text) would be more discoverable, but would cause significant layout shift in a wrapped token flow. The icon + tooltip combination provides adequate information density.
- **Revisit if**: User testing shows >30% of errors go unnoticed with the icon approach.

### Decision: No Toasts for Validation
- **Date**: 2026-03-05
- **Decided by**: Product Designer
- **Context**: Should validation errors trigger toast notifications?
- **Options**: (A) Toast per error, (B) Summary toast, (C) No toasts
- **Decision**: Option C -- no toasts for validation. Toasts auto-dismiss, appear far from the error source, and don't stack well for multiple errors. Industry consensus agrees.
- **Dissent**: None. All research sources agree toasts are wrong for validation.
- **Revisit if**: We add asynchronous server-side validation (e.g., "field X doesn't exist in your schema") that happens after the filter bar is submitted.

### Decision: Hybrid Validation (Strict Enum, Permissive Text)
- **Date**: 2026-03-05
- **Decided by**: Product Designer
- **Context**: Should enum fields allow arbitrary values?
- **Options**: (A) All strict, (B) All permissive, (C) Hybrid per field type
- **Decision**: Option C -- enum fields strict (predefined values only), text fields permissive (any value), numeric with guardrails, structural flagged not blocked.
- **Dissent**: Permissive advocates argue strict enum prevents power users from entering values not yet in the schema. Counter: unknown enum values will return 0 results anyway, wasting investigation time.
- **Revisit if**: Backend adds support for user-defined custom enum values or dynamic field values.

### Decision: Error vs Warning Severity
- **Date**: 2026-03-05
- **Decided by**: Product Designer
- **Context**: Should all errors look the same (red) or differentiate severity?
- **Options**: (A) All red, (B) Red errors + amber warnings, (C) Red errors + blue info
- **Decision**: Option B -- red for query-breaking errors, amber for structural suggestions.
- **Dissent**: Simpler to keep everything red (one code path). Counter: SOC analysts suffer alert fatigue; differentiating severity helps triage.
- **Revisit if**: User testing shows warning indicators are confusing or users don't understand the distinction.

### Decision: Enum Empty State Design
- **Date**: 2026-03-05
- **Decided by**: Product Designer
- **Context**: What to show when enum search yields no results.
- **Options**: (A) Minimal "No results", (B) Echo search term, (C) Fuzzy suggestions, (D) Create custom
- **Decision**: Option B now, with future path to Option C. Option D rejected -- violates strict enum validation.
- **Dissent**: Option D would serve power users who know about values not yet in the schema. Counter: unknown enum values produce empty result sets, which is worse UX than "try a different search."
- **Revisit if**: Backend gains dynamic/extensible enum values.

### Decision: Discard on Close Without Value
- **Date**: 2026-03-05
- **Decided by**: Product Designer
- **Context**: What happens when user opens value selector but closes without selecting anything?
- **Options**: (A) Discard silently, (B) Create chip with EMPTY_VALUES error, (C) Show confirmation dialog
- **Decision**: Option A -- discard silently. Creating an error chip the user didn't intend is hostile. Confirmation dialog is over-engineering.
- **Dissent**: Option B preserves user intent (they clicked the field, so they wanted a filter). Counter: clicking a field then escaping is the universal "cancel" gesture.
- **Revisit if**: Analytics show users frequently re-select the same field after escaping (suggesting they wanted to keep it).

---

## 10. References

### UX Research Sources
- [NN/g: 10 Design Guidelines for Reporting Errors in Forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/) -- Core guidelines for error placement, timing, and phrasing
- [NN/g: Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/) -- General error message principles
- [Smashing Magazine: Designing Better Error Messages UX](https://www.smashingmagazine.com/2022/08/error-messages-ux-design/) -- Comprehensive error message design patterns
- [Pencil & Paper: Error Message UX, Handling & Feedback](https://www.pencilandpaper.io/articles/ux-pattern-analysis-error-feedback) -- Enterprise error feedback patterns (inline, toast, banner, modal)
- [LogRocket: UX of Form Validation: Inline or After Submission?](https://blog.logrocket.com/ux-design/ux-form-validation-inline-after-submission/) -- Inline validation reduces completion times by 22%
- [Medium: Building UX for Error Validation Strategy](https://medium.com/@olamishina/building-ux-for-error-validation-strategy-36142991017a) -- Prevention vs correction strategies
- [Pencil & Paper: Filter UX Design Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering) -- Enterprise filtering UX patterns
- [Smart Interface Design Patterns: Complex Filters UX](https://smart-interface-design-patterns.com/articles/complex-filtering/) -- Complex filter construction patterns
- [Smashing Magazine: Designing Filters That Work](https://www.smashingmagazine.com/2021/07/frustrating-design-patterns-broken-frozen-filters/) -- Filter design best practices and anti-patterns

### Product References
- [Kibana FilterBar: Error and Warning Indicators](https://github.com/elastic/kibana/issues/67177) -- Kibana's error/warning distinction for filters with missing index patterns
- [Sentry Search Documentation](https://docs.sentry.io/concepts/search/) -- Sentry's tokenized search with inline error feedback
- [Datadog Log Search Syntax](https://docs.datadoghq.com/logs/explorer/search_syntax/) -- Datadog's query validation patterns
- [GitHub Issues Filtering](https://docs.github.com/en/issues/tracking-your-work-with-issues/filtering-and-searching-issues-and-pull-requests) -- GitHub's advanced filter validation with boolean queries

### shadcn/ui Components Referenced
- [shadcn/ui Combobox Empty States](https://www.shadcn.io/patterns/combobox-with-states-3) -- Empty state with action pattern for CommandEmpty
- [shadcn/ui Input Error State](https://www.shadcn.io/patterns/input-validation-1) -- Error state pattern with text-destructive and aria-invalid
- [shadcn/ui Filter Chips](https://www.shadcn.io/patterns/button-group-interactive-3) -- Filter chip variant patterns
- [Material Design Chips Spec](https://m3.material.io/components/chips/specs) -- Material Design chip error states and variants

### SOC / Security Context
- [SOC Threat Intelligence Dashboard Case Study (2025)](https://medium.com/@sarathb1998sb/threats-at-a-glance-soc-threat-intelligence-dashboard-case-study-cfca25f5c5eb) -- Dashboard design for SOC analysts
- [Swimlane: 7 Essential SOC Tools for 2025](https://swimlane.com/blog/security-operations-center-tools/) -- SOC tooling landscape and analyst workflows
- [Radiant Security: AI-Powered SOC Use Cases 2025](https://radiantsecurity.ai/learn/soc-use-cases/) -- Alert fatigue and filtering challenges in SOC operations

---

## Complete Document Extracted

This is the full validation error surfaces research document prepared by the Principal Product Designer. The document provides comprehensive coverage of all error surfaces, validation approaches, message design, implementation specifications, and a complete decision log documenting the rationale behind all major UX choices for the token-based filtering system.