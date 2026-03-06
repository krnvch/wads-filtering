# Validation UX — Unified Recommendations

**Date**: 2026-03-05
**Status**: Team consensus after cross-agent research + adversarial review
**Input documents**:
1. `validation-competitive-analysis.md` — UX Researcher (10-product competitive analysis)
2. `validation-state-machine.md` — Interaction Designer (full lifecycle state machine)
3. `validation-error-surfaces.md` — Product Designer (error surface taxonomy)
4. `validation-adversarial-review.md` — Red Hat UX Researcher (stress-test)

---

## Executive Summary

The team researched how 10 developer tools handle filter validation, designed a complete validation state machine, taxonomized 6 error surfaces, and stress-tested everything through an adversarial review. This document synthesizes the findings into **actionable decisions** with all contradictions resolved.

**Core philosophy**: Prevention at creation, flagging after creation. Enum fields are strictly constrained. Text fields are permissive. Errors are shown immediately but never block filter application. Security context demands that partially correct filters are safer than no filters.

---

## Resolved Decisions

### Decision 1: Validation Strategy — Hybrid (Strict + Permissive)

| Field Type | Strategy | Behavior |
|-----------|----------|----------|
| **Enum** (Status, Type, Impact, Blocking Status, HTTP Status Code) | **Strict** | Only predefined values selectable. Cannot type custom values. |
| **Text** (Endpoints, Host, Parameter) | **Permissive** | Any value accepted. No validation at creation. |
| **Numeric** (Response Code) | **Permissive + guardrails** | Browser `type="number"` prevents non-numeric. Range inversions caught inline. |
| **Date** (Last Seen, First Detected) | **Strict** | Presets + Calendar. No typed dates. Invalid ranges auto-corrected. |
| **Structural** (AND/OR/parens) | **Flag, don't block** | Show errors immediately. Don't prevent editing mid-expression. |

**Known limitation (from adversarial review C1)**: Enum values are currently hardcoded in `filter-schema.ts`. The `http_status_code` field has only 5 values, which is incomplete. **Action item**: Plan migration to backend-fetched enum values. Until then, document this as a known gap and ensure the frontend schema stays in sync with backend data definitions.

---

### Decision 2: Enum Value Selector — Add Search Input

Add a text search input inside the `EnumValueSelector` (using cmdk's built-in search in `Command`).

**Behavior**:
- **Typing filters the checkbox list** (substring match, case-insensitive)
- **No-match shows**: "No matching values" (informational, NOT styled as error)
- **No custom value creation** — search is filter-only, not creation
- **Previously checked values remain checked** even when filtered out of view
- **Show hidden selection count**: "3 values selected (hidden by filter)" when search hides checked items
- **Enter is a no-op** when no items match search (no focused item)
- **Clear search**: Esc clears the search text (returns to full list), second Esc closes the popover

**Empty state design** (using `CommandEmpty`):
```
  +------------------------------------------+
  | Search values...           [search icon] |
  +------------------------------------------+
  |                                          |
  |   No values match "Critcal"              |
  |                                          |
  +------------------------------------------+
  |            Cmd+Enter to apply            |
  +------------------------------------------+
```

Rationale: 6/10 products in the competitive analysis include search in value dropdowns. Industry standard for lists with 5+ items.

---

### Decision 3: Error Severity — Two Visible Tiers + Hidden

**Resolved contradiction (X1, X2, X5 from adversarial review)**:

The state machine proposed three visible tiers (error/warning/tolerated). The adversarial review challenged the amber tier as untested and potentially confusing. Resolution: **Two visible tiers + one hidden tier**.

| Tier | Visual | Error Codes | Behavior |
|------|--------|-------------|----------|
| **Error** (red) | Red ring + AlertCircle icon + tooltip | `UNKNOWN_FIELD`, `INVALID_OPERATOR`, `EMPTY_VALUES`, `UNBALANCED_PAREN`, `TOP_LEVEL_OR`, `CONSECUTIVE_CONNECTOR` | Shows banner. Chip is skipped/misinterpreted in evaluation. |
| **Warning** (amber) | Amber ring + tooltip (no icon, no banner) | `EMPTY_GROUP`, `SINGLE_CHILD_GROUP` | Cosmetic/redundant. Query still evaluates correctly. |
| **Tolerated** (hidden) | No visual indicator | `LEADING_CONNECTOR`, `TRAILING_CONNECTOR` | Silently ignored by engine. No user-facing signal. |

**Key reclassifications from contradictions**:
- `TOP_LEVEL_OR` → **Error** (not warning). The adversarial review is correct: it silently changes query semantics (OR treated as AND). This is dangerous in a security context.
- `CONSECUTIVE_CONNECTOR` → **Error** (not warning). Second connector is ignored, but the user likely intended something else.
- `LEADING_CONNECTOR` / `TRAILING_CONNECTOR` → **Tolerated** (not warning). Already skipped in validation code. No visual noise for harmless artifacts.

**Implementation**:
```typescript
interface TokenError {
  code: TokenErrorCode;
  message: string;
  severity: "error" | "warning" | "tolerated";
  recovery?: string; // Actionable hint for the user
}
```

**Future validation**: Before implementing the amber tier, run a 5-user comprehension test (adversarial review V4): show mixed red/amber indicators and ask "which do you need to fix?" If >40% ignore amber issues that matter, collapse to a single visible tier.

---

### Decision 4: Error Surfaces — Layered Hierarchy

#### Surface 1: Per-Chip Error Indicator (PRIMARY)

**Current**: Red ring + tooltip on hover.

**Enhanced**:
- Add `AlertCircle` icon (lucide, `size-3`, `text-destructive`) as first child inside the Badge
- Add `aria-invalid="true"` on the Badge element
- Keep tooltip with error message + **recovery hint**
- For warnings: amber ring, no icon

```
  Error:    [! Status] [is any of] []                x
            ^-- AlertCircle icon, ring-destructive

  Warning:  [( ]                                     x
            ^-- ring-amber (no icon)
```

Rationale: Red ring alone fails WCAG 1.4.1 (color-only). Icon resolves color-blind accessibility. NN/g guideline #9: errors should not be hidden in tooltips alone.

#### Surface 2: Global Banner Alert (SECONDARY)

**Current**: "Some filters have validation errors. Hover over highlighted tokens for details."

**Enhanced**:
- **Include error count**: "2 filters have validation errors."
- **Include condensed descriptions**: "2 errors: Status is missing a value. Response code has an invalid operator."
- **Remove "hover over" instruction** (hostile to touch/screen reader users)
- **Dismissible** (x button), but reappears if error set changes
- **Only shown for `error` severity**, NOT for warnings
- Add `aria-live="assertive"` on the alert

Message templates:
- 1 error: `"1 filter has a validation error: {description}."`
- N errors: `"{N} filters have validation errors."`

#### Surface 3: Inline Value Selector Errors (TERTIARY)

**New surface** — currently missing. Add inline error messages inside value selector popovers:

| Selector | Error | Message | Action |
|----------|-------|---------|--------|
| Numeric | Min > Max | "Minimum must be less than maximum." | Disable Apply |
| Numeric | Empty value | (Apply already disabled) | — |
| Text | Whitespace-only | "Value cannot be empty." | Prevent add |
| Text | Duplicate | (Already prevented) | — |
| Enum search | No match | "No matching values" | Informational only |
| Date range | End < start | Auto-corrected by implementation | — |

Design:
```tsx
{hasError && (
  <p className="text-xs text-destructive flex items-center gap-1 px-3 py-1">
    <AlertCircle className="size-3 shrink-0" />
    {errorMessage}
  </p>
)}
```

#### Surface 4: Bar-Level Border (AMBIENT)

Keep current `border-destructive` on the toolbar container when errors exist. Add `aria-invalid="true"` to the toolbar div.

#### Surface 5: Accessible Announcements

- When `hasErrors` transitions `false → true`: announce via `FilterAnnouncer` with `aria-live="assertive"`: "N filters have validation errors."
- **Debounce announcements by 1 second** (adversarial review M5: rapid editing triggers multiple announcements).
- Per-token error announcements: announce on focus, not on creation.

#### NOT Using: Toasts

Toasts are NOT used for validation errors. Auto-dismiss violates error persistence. Positional disconnect from error source. No stacking for multiple errors. Industry consensus: 0/10 products use toasts for filter validation.

Toasts ARE appropriate for operational feedback: "Filters cleared", "URL copied", "Legacy format upgraded".

---

### Decision 5: Numeric Range — Inline Validation (Not Auto-Swap)

**Resolved contradiction (X3 from adversarial review)**:

The state machine recommended auto-swap (silently correct min > max). The error surfaces document recommended inline error + disabled Apply. The adversarial review argued auto-swap is silent data mutation.

**Decision: Inline validation with disabled Apply button.**

Rationale: In a security-critical tool, predictability > convenience. If a user types `min=500, max=200`, they may have misunderstood the fields. Silently swapping could give results the user didn't request. Show the error, let them decide.

```
  +------------------------------------------+
  | From                                     |
  | [  500  ]                                |
  | To                                       |
  | [  200  ]                                |
  | ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  | ! Minimum must be less than maximum.     |
  | ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  | [ Apply ]  (disabled)                    |
  +------------------------------------------+
```

**Exception: Date ranges** — keep the current auto-sort behavior. The `DateValueSelector` already auto-corrects `end < start` by sorting. This is acceptable because:
1. Dates are selected via Calendar clicks (not typed), so "accidentally reversing" is less likely
2. The auto-sort is already implemented and tested
3. The adversarial review (X4) confirms the implementation already handles this

---

### Decision 6: Esc vs Click-Outside — Different Behaviors

**Resolved from adversarial review C2**:

Current: Both Esc and click-outside trigger `onOpenChange(false)` with identical behavior (commit if values exist).

**New behavior**:

| Action | Values selected? | Result |
|--------|-----------------|--------|
| Click-outside | No | Discard (no chip created) |
| Click-outside | Yes | **Commit** (create/update chip with selected values) |
| Esc | No | Discard (no chip created) |
| Esc | Yes | **Revert** (cancel changes, return to pre-open state) |

Rationale: Esc universally means "cancel" in desktop UIs (VS Code, Figma, macOS Finder, browser `<select>`). The adversarial review presents compelling evidence. SOC analysts who use keyboard heavily will expect Esc to cancel.

**Implementation**: Track `valuesOnOpen` (snapshot of values when the popover opens). On Esc with values, restore `valuesOnOpen` instead of committing `pendingValues`.

**For new chips** (no pre-open state): Esc always discards, regardless of value selection.

---

### Decision 7: Incomplete Filter States — Discard on Abandon

| Scenario | Result |
|----------|--------|
| Open palette, close without selecting field | No change |
| Select field, close without selecting operator | No chip created |
| Select operator, close without selecting values | No chip created |
| Select values, click-outside | **Chip created** (commit) |
| Select values, Esc | **No chip created** (revert, per Decision 6) |
| Type text in text input but don't press Enter, close | **Auto-add typed text** as value, then commit |

Rationale: 5/10 competitive products (Linear, GitHub, Notion, Jira basic, Grafana) use discard-on-abandon. No product leaves incomplete chips in the filter bar.

---

### Decision 8: Operator Change (Unary → Non-Unary) — Auto-Open Value Selector

**From adversarial review S5**:

When user changes operator from `is_set` to `is`, the chip immediately gets an `EMPTY_VALUES` error. This is jarring.

**New behavior**: When operator changes from unary to non-unary, **automatically open the value selector popover**. The user clearly intends to add values (otherwise why switch from "is set" to "is"?).

This eliminates the jarring error-on-operator-change experience.

---

### Decision 9: Contradiction Detection — Don't Implement, But Mitigate

**From adversarial review C3**:

10/10 competitive products lack contradiction detection. Implementation is complex (requires field cardinality metadata). **Do not implement contradiction detection.**

**But**: In a security context, zero results due to contradictions is a false-negative risk.

**Mitigation**: Add a hint to the **zero-results dashboard state**:

```
  +------------------------------------------+
  |                                          |
  |   No attacks match your current filters. |
  |                                          |
  |   Check for conflicting filter           |
  |   conditions, or try broadening          |
  |   your search.                           |
  |                                          |
  +------------------------------------------+
```

This doesn't detect contradictions — it's a safety net for the zero-results state that costs nothing to implement and could prevent missed attacks.

---

### Decision 10: Error Messages — Technical, Concise, Actionable

**Format**: `{What's wrong}. {How to fix it.}`

| Error Code | Message | Recovery Hint |
|-----------|---------|---------------|
| `UNKNOWN_FIELD` | Unknown field "{field}". | Remove this filter or check the URL. |
| `INVALID_OPERATOR` | "{operator}" is not valid for {fieldType} fields. | Click the operator to change it. |
| `EMPTY_VALUES` | Filter needs at least one value. | Click to add values, or remove this filter. |
| `UNBALANCED_PAREN` | Unmatched parenthesis. | Add the missing parenthesis or remove this one. |
| `TOP_LEVEL_OR` | OR at top level without parentheses changes filter logic. | Wrap OR conditions in parentheses. |
| `CONSECUTIVE_CONNECTOR` | Duplicate connector. | Remove the extra AND/OR. |
| `EMPTY_GROUP` | Empty group has no effect. | Add filters inside the parentheses or remove the group. |
| `SINGLE_CHILD_GROUP` | Unnecessary grouping around a single filter. | Remove the parentheses. |

| `INVALID_VALUE_FORMAT` | Value doesn't match expected format. | Check the format: {formatDescription}. |

Tone: Neutral, technical, no apologies. Concise for power users.

---

## Decision 11: Field Type System — 5 Core Types + Semantic Layer

**See**: `field-types-unified-recommendations.md` for full details.

**Summary**: Add only 1 new type (`ip` with `is_in_subnet`/`is_not_in_subnet` operators). All other complex data types (UUID, hash, CVE, email, URL, etc.) handled by `text` type with format validators. Add `format`, `placeholder`, `displayLabels`, `namedValues`, `constraints` metadata to `FilterFieldDef`. Reclassify `http_status_code` from enum to numeric.

---

## Validation Timing Summary

```
 FLOW STEP               VALIDATION TYPE          TIMING
 ────────────────────    ───────────────────      ─────────────
 Field selection         Prevention (palette)      Instant
 Operator selection      Prevention (filtered)     Instant
 Enum value toggle       None                      —
 Enum search no-match    Informational text        While typing
 Enum confirm            Non-empty check           On commit
 Text value add          Non-empty, non-duplicate  On Enter
 Text value confirm      At least 1 value          On commit
 Numeric input           type="number" native       On keypress
 Numeric range           Min ≤ Max check           On value change
 Numeric confirm         Non-empty + range valid    On commit
 Date selection          Prevention (Calendar)     Instant
 Chip created            Full validate + structural Synchronous
 Chip edited             Full validate + structural Synchronous
 Chip removed            Structural only           Synchronous
 Connector toggled       Structural                Synchronous
```

No debouncing needed — token arrays are small (1-20), validation is O(n).

---

## Open Items Requiring Further Research

| ID | Question | Proposed Validation | Priority |
|----|----------|-------------------|----------|
| V1 | Are enum values complete? (`http_status_code` has only 5 values) | Audit enum values against backend schema | P1 |
| V2 | Do users understand Esc = cancel vs click-outside = commit? | 5-user usability test | P1 |
| V3 | What does the zero-results state look like currently? | Design review + add "check filters" hint | P2 |
| V4 | Do users understand red vs amber error tiers? | 5-user comprehension test (before implementing amber) | P2 |
| V5 | What % of SOC analysts use touch devices? | User agent telemetry | P3 |
| V6 | What errors do real users encounter most? | Analytics on error codes post-launch | P3 |
| V7 | Are SIEM competitors (Sentinel, QRadar) doing something we're missing? | Targeted competitive analysis | P3 |

---

## Implementation Phases

### Phase A: Foundation (addresses all Critical Issues)
1. Add `severity` and `recovery` fields to `TokenError`
2. Reclassify error codes per Decision 3
3. Add `AlertCircle` icon to error chips (WCAG 1.4.1)
4. Enhance banner with error count + descriptions
5. Add `aria-invalid` to errored chips and toolbar
6. Add inline validation to `NumericValueInput` (min ≤ max)

### Phase B: Enum Search
7. Add search input to `EnumValueSelector` (cmdk built-in)
8. Handle no-match empty state ("No matching values")
9. Track hidden selection count when search filters checked items

### Phase C: Interaction Refinements
10. Differentiate Esc vs click-outside behavior (Decision 6)
11. Auto-open value selector on unary → non-unary operator change
12. Add zero-results "check your filters" hint to dashboard

### Phase D: Polish
13. Add warning tier (amber) for EMPTY_GROUP / SINGLE_CHILD_GROUP (after user test V4)
14. Debounced accessibility announcements
15. Auto-add typed text on popover close for TextValueInput

---

## Cross-Reference: Which Adversarial Issues Are Addressed

| Issue | Status | Where Addressed |
|-------|--------|-----------------|
| C1: Static enum data drift | **Acknowledged** | Decision 1 (known limitation + action item) |
| C2: Esc vs click-outside | **Resolved** | Decision 6 |
| C3: No contradiction detection | **Mitigated** | Decision 9 (zero-results hint) |
| S1: Tooltip-only on touch | **Resolved** | Decision 4, Surface 1 (AlertCircle icon) + Surface 2 (descriptions in banner) |
| S2: Three-tier untested | **Deferred** | Decision 3 (implement 2 visible tiers, test amber before adding) |
| S3: Sample bias (no SIEM) | **Acknowledged** | Open item V7 |
| S4: Auto-swap is silent mutation | **Resolved** | Decision 5 (inline validation, not auto-swap) |
| S5: Unary→non-unary jarring error | **Resolved** | Decision 8 (auto-open value selector) |
| X1: TOP_LEVEL_OR classification | **Resolved** | Decision 3 (error, not warning) |
| X2: CONSECUTIVE_CONNECTOR classification | **Resolved** | Decision 3 (error) |
| X3: Numeric range auto-swap vs inline | **Resolved** | Decision 5 (inline validation) |
| X4: Date range spec vs implementation | **Resolved** | Decision 5 (keep auto-sort, no error needed) |
| X5: LEADING/TRAILING classification | **Resolved** | Decision 3 (tolerated, hidden) |
