# Filter System v2.0 — Redesign Specification

**Date**: 2026-02-20
**Status**: Draft for team review
**Authors**: All 10 agents (PM, UX Researcher, Product Designer, Interaction Designer, FE-1, FE-2, BE-1, BE-2, QA)
**Trigger**: User feedback with 7 Figma design screenshots

---

## Executive Summary

This spec covers a significant redesign of the filtering system, driven by updated Figma mockups. The 30 change items across 8 categories range from incremental enhancements (new fields, operator renames) to a **fundamental architectural shift** (flat token sequence rendering).

**Current state**: 314 tests passing, 21 test files. Phases 1-5 complete (filter bar, operators, groups, keyboard/a11y, operator-driven semantics). Working boolean expression tree with 2 field types (enum, text), 6 operators, 8 fields.

**Target state**: Flat token rendering, 5 field types, 20+ operators, typeahead palette, recent filters, per-token error states.

---

## 1. Change Items (30 items, 8 categories)

### Category A: Filter Bar Input Behavior
| ID | Change | Priority |
|----|--------|----------|
| A1 | Filter bar becomes real text input with inline caret | P1 |
| A2 | Typeahead suggestions (pre-composed filters) | P2 |
| A3 | Field name fuzzy filtering in palette | P1 |
| A4 | Boolean tokens (AND, OR, parens) completable via typing | P2 |

### Category B: Palette Redesign
| ID | Change | Priority |
|----|--------|----------|
| B1 | "Recent" filters section at top of palette | P1 |
| B2 | "Suggestions" mode matching recent filters while typing | P2 |
| B3 | AND/OR items at bottom of palette with icons | P1 |
| B4 | Keyboard hints in palette footer | P1 |
| B5 | New field categories in palette (Temporal, Security) | P2 |

### Category C: Token Model Overhaul (BREAKING)
| ID | Change | Priority |
|----|--------|----------|
| C1 | Flat token sequence replaces nested group rendering | P0 |
| C2 | AND/OR as standalone removable badge tokens | P0 |
| C3 | Parentheses as standalone removable tokens | P0 |
| C4 | Error state (red) on individual tokens | P1 |
| C5 | Hover x on all tokens (AND, OR, parens) | P0 |
| C6 | Multi-line wrapping for token overflow | P0 |

### Category D: Expanded Field Types
| ID | Change | Priority |
|----|--------|----------|
| D1 | 5 field types: enum, text, date, numeric, boolean | P0 |
| D2 | Date type with presets + absolute picker | P1 |
| D3 | Numeric type with comparison operators | P1 |
| D4 | Boolean field type | P2 (see Decision 3) |

### Category E: Expanded Operators
| ID | Change | Priority |
|----|--------|----------|
| E1 | Text: +starts_with, ends_with, is, is_not, is_set, is_not_set | P1 |
| E2 | Date: is_after, is_before, is_between, in_the_last, etc. | P1 |
| E3 | Enum: +is_set, is_not_set; rename "is none of" to "is not any of" | P0 |
| E4 | Numeric: equals, gt, gte, lt, lte, in_between | P1 |
| E5 | Boolean: is_true, is_false, is_set, is_not_set | P2 |

### Category F: New Fields
| ID | Change | Priority |
|----|--------|----------|
| F1 | Severity (enum) | P2 |
| F2 | Location / Source country (enum) | P2 |
| F3 | Network (text) | P2 |
| F4 | CWE (enum/text) | P2 |
| F5 | Last seen (date) | P1 |

### Category G: Value Selector Enhancements
| ID | Change | Priority |
|----|--------|----------|
| G1 | Colored status dots in enum value selector | P1 |
| G2 | Date presets + absolute date picker | P1 |
| G3 | Cmd+Enter hint visible in all value selectors | P1 |

### Category H: Display & Naming
| ID | Change | Priority |
|----|--------|----------|
| H1 | "is none of" display label -> "is not any of" | P0 |
| H2 | Resolve "is one of" vs "is any of" (Figma inconsistency) | P2 |

---

## 2. Key Decisions (Cross-Agent Synthesis)

### Decision 1: Internal Data Model
**DECIDED: Keep expression tree internally, flat tokens for rendering only.**

All 4 analysis teams independently converged on this recommendation:
- **PM**: "The tree is the source of truth; the tokens are a view."
- **Engineers**: "Expression evaluation is inherently tree-shaped. Parse tokens into tree for evaluation."
- **UX Researcher**: "Every major product uses a tree internally; visual representation varies."
- **QA**: "Round-trip testing (tokens -> tree -> tokens) is essential."

**Implementation**: A `tokensToExpressionTree()` bridge function parses the flat token sequence for the engine. The existing `evaluateExpression()` / `matchesCondition()` logic is preserved. An `expressionTreeToTokens()` function converts back for rendering.

### Decision 2: AND/OR Token Behavior
**DECIDED: AND/OR tokens are toggleable (click to switch) but connector removal auto-adjusts.**

The team debated whether AND/OR should be independently removable:
- **No precedent**: No major product treats AND/OR as independently removable tokens (PM, UX Researcher, Interaction Designer all flagged this).
- **Compromise**: AND/OR tokens show hover-x per the Figma, but removing a connector triggers auto-adjustment (implicit AND applied). Removing a filter chip auto-removes the adjacent dangling connector.
- **Click behavior**: Clicking AND toggles to OR (wraps in parens), clicking OR reverts to AND (ungroups). This preserves the existing `toggleConnector` logic.

### Decision 3: Boolean Field Type
**DECIDED: Defer boolean type. Use enum with 2 values instead.**

PM's challenge accepted: `is_true`/`is_false` are just `is "true"` / `is "false"` on an enum. `is_set`/`is_not_set` become universal operators on all field types. This keeps 4 field types (enum, text, date, numeric) and avoids a new component.

### Decision 4: Text Input in Filter Bar
**DECIDED: Hybrid approach — typing anywhere in the bar opens/filters the palette, but no cursor-between-tokens.**

- **PM**: Recommended shipping without text input first.
- **Interaction Designer**: Flagged cursor-between-tokens as risky (contentEditable nightmare).
- **Compromise**: The filter bar accepts keyboard input that opens and fuzzy-filters the palette. New chips always append at the end. No mid-sequence cursor positioning in v2.0. Reordering is a future enhancement.

### Decision 5: Typing AND/OR and Parentheses
**DECIDED (user override): AND/OR ARE typeable via palette fuzzy search. Parentheses are directly insertable.**

- **User requirement**: Typing "AND" or "OR" in the filter bar shows them as options in the palette suggestions. Typing `(` or `)` directly inserts paren tokens.
- **Agent recommendations overridden**: The agents recommended against typed boolean operators, but the user (product owner) confirmed this is the desired behavior for a developer/security audience (aligned with GitHub Advanced Search and Kibana patterns).
- **Implementation**: AND/OR appear at the bottom of the palette AND in fuzzy search results. Parentheses bypass the palette entirely — `(` and `)` keystrokes insert tokens immediately. Click-to-toggle on existing connector tokens is preserved as an additional interaction.

### Decision 6: "is any of" vs "is one of"
**DECIDED: Use "is any of" consistently.**

The Figma shows both labels. "is any of" is already implemented and tested. "is one of" adds confusion. Internal key stays `is_any_of`.

### Decision 7: Date Picker UX
**DECIDED: Single panel with presets at top + expandable calendar below. No sub-menu navigation.**

PM's challenge: sub-menu is over-engineering. Single panel (Datadog/Grafana pattern) is consistent with enum/text selectors.

---

## 3. Architecture

### 3.1 Token Type System

```typescript
// Field types (4, not 5 — boolean deferred)
type FilterFieldType = "enum" | "text" | "date" | "numeric";

// Expanded operators (20+)
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

// Token types for flat rendering
type Token =
  | FilterChipToken    // field + operator + values
  | AndToken           // AND connector
  | OrToken            // OR connector
  | OpenParenToken     // ( — paired with CloseParen
  | CloseParenToken;   // ) — paired with OpenParen

interface FilterState {
  tokens: Token[];     // Flat sequence (UI layer)
  // expression tree derived via tokensToExpressionTree() for engine
}
```

### 3.2 Operator Registry by Field Type

| Field Type | Operators |
|------------|-----------|
| **enum** | is, is_not, is_any_of, is_none_of, is_set, is_not_set |
| **text** | contains, does_not_contain, starts_with, ends_with, is, is_not, is_set, is_not_set |
| **date** | before, after, on, not_on, in_the_last, not_in_the_last, between_dates, is_set, is_not_set |
| **numeric** | equals, not_equals, gt, gte, lt, lte, in_between, is_set, is_not_set |

### 3.3 Data Flow

```
User types in bar → fuzzy match against fields/recent → palette shows matches
User selects field → OperatorSelector → ValueSelector (enum/text/date/numeric)
Token[] updated → serializeTokens() → URL params
             → tokensToExpressionTree() → evaluateExpression() → filtered data
             → validateTokenSequence() → per-token errors → UI error indicators
```

### 3.4 URL Serialization (New Format)

**Format**: Single `q` parameter with `~` token separator, `.` field/operator separator.

```
?q=status.is_any_of.Blocked,Monitored~AND~(~type.is.XSS~OR~status.is.Blocked~)
```

**Backward compatibility**: Deserializer detects old format (field-name keys without `q` param) and falls back to legacy parsing.

### 3.5 State Management

- **URL** owns the token sequence (source of truth)
- **Zustand store** owns ephemeral UI state: palette open/closed, pending field, recent filters, focused token
- **Expression tree** is derived (memoized) from tokens for the filter engine

---

## 4. Component Architecture

### 4.1 Components to Add via shadcn CLI

```bash
npx shadcn@latest add calendar separator scroll-area select skeleton tabs sonner label toggle toggle-group
```

### 4.2 Existing Components — Reuse Assessment

| Component | Action | Reuse % |
|-----------|--------|---------|
| FilterChip.tsx | MODIFY (heavy) — 5-type value selector dispatch, error state | 55% |
| FilterPalette.tsx | MODIFY (heavy) — typeahead, recent, suggestions, AND/OR | 30% |
| OperatorSelector.tsx | MODIFY — expand to 20+ operators per field type | 70% |
| EnumValueSelector.tsx | KEEP — add colored dots, search for long lists | 90% |
| TextValueInput.tsx | KEEP — works as-is for new text operators | 90% |
| FilterAnnouncer.tsx | MODIFY — array ops instead of tree traversal | 60% |
| FilterBar.tsx | REWRITE — flat token rendering + inline input | 15% |
| BooleanConnector.tsx | REWRITE → ConnectorChip.tsx | 10% |
| FilterGroupComponent.tsx | DELETE — replaced by paren tokens | 0% |
| useKeyboardShortcuts.ts | KEEP as-is | 95% |
| useFilterFocus.ts | MODIFY — token-based focus | 70% |
| filter-engine.ts | MODIFY — expand matchesCondition() for new operators | 85% |
| filter-schema.ts | MODIFY — expand field defs for 4 types | 70% |

### 4.3 New Components to Build

| Component | shadcn Base | Purpose |
|-----------|-------------|---------|
| ConnectorChip | Badge | AND/OR removable token with hover x |
| ParenChip | Badge | ( / ) removable paired token |
| TokenRenderer | — | Discriminated union switch rendering per token type |
| FilterBarInput | Input | Inline text input that fuzzy-filters palette |
| DateValueSelector | Popover + Calendar | Date presets + calendar picker |
| NumericValueInput | Popover + Input | Numeric input with comparison operators |
| TokenErrorIndicator | Tooltip + conditional styling | Per-token red border + error tooltip |
| RecentFiltersSection | Command group | Renders recently-used expressions in palette |

### 4.4 New Lib Modules

| Module | Purpose |
|--------|---------|
| token-parser.ts | `tokensToExpressionTree()` + `expressionTreeToTokens()` |
| stores/filter-ui-store.ts | Zustand store for palette, pending field, recent filters |

---

## 5. Token Interaction States

### 5.1 Filter Chip Token

| State | Visual | Behavior |
|-------|--------|----------|
| Default | `bg-secondary`, blue-highlighted values | Clickable: operator opens menu, value opens selector |
| Hover | + x button appears on right edge | Pointer cursor on segments |
| Focused | 2px focus ring | Enter activates, Backspace removes |
| Error | `bg-destructive/10 border-destructive` | Same interactions, red styling, tooltip shows error |

### 5.2 AND/OR Token

| State | Visual | Behavior |
|-------|--------|----------|
| Default | `text-muted-foreground text-xs` badge | Click toggles AND<->OR (triggers grouping/ungrouping) |
| Hover | + x button | Removing applies implicit AND |
| Error (e.g., top-level OR) | `text-destructive border-destructive` | Tooltip: "OR not allowed at top level" |

### 5.3 Parenthesis Token

| State | Visual | Behavior |
|-------|--------|----------|
| Default | `text-muted-foreground text-sm` subtle character | Hover shows x |
| Hover | + x button | Removing removes BOTH paired parens |
| Error (unmatched) | `text-destructive` | Tooltip: "Missing matching parenthesis" |

---

## 6. Keyboard Model

### 6.1 Global Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| **F** | Not in input | Open filter palette |
| **Shift+F** | Not in input, filters exist | Clear all filters |
| **Escape** | Palette open | Close palette |

### 6.2 Within Filter Bar

| Key | Context | Action |
|-----|---------|--------|
| **ArrowLeft/Right** | Token focused | Navigate between tokens |
| **Backspace** | Token focused | Remove that token |
| **Delete** | Token focused | Remove that token |
| **Enter** | Chip focused | Open value editor |
| **Escape** | Token focused | Return to text input |
| **Any character** | Bar focused | Start typing, opens/filters palette |
| **Cmd+Enter** | Value selector open | Confirm multi-selection |

### 6.3 Token Removal Cascade Rules

| Action | Side Effect |
|--------|-------------|
| Remove middle chip from `A AND B AND C` | Auto-remove one adjacent AND → `A AND C` |
| Remove AND between two chips | Two chips become implicitly AND-joined (visual AND removed) |
| Remove one chip from 2-chip OR group | Auto-ungroup remaining chip, remove parens + OR |
| Remove `(` or `)` | Remove paired paren; contents remain, OR connectors become validation errors |

---

## 7. Validation Rules

### 7.1 Structural Validation (Token Sequence)

| Rule | Error Code | Token(s) Highlighted |
|------|-----------|---------------------|
| Top-level OR | TOP_LEVEL_OR | OR token |
| Balanced parentheses | UNBALANCED_PAREN | Orphan ( or ) |
| No consecutive connectors | CONSECUTIVE_CONNECTOR | Second connector |
| No leading connector | LEADING_CONNECTOR | First token if AND/OR |
| No trailing connector | TRAILING_CONNECTOR | Last token if AND/OR |
| No empty parentheses | EMPTY_GROUP | Both ( and ) |
| Single-child group | SINGLE_CHILD_GROUP | Both ( and ) |

### 7.2 Per-Token Validation

| Rule | Error Code | When |
|------|-----------|------|
| Unknown field | UNKNOWN_FIELD | Field key not in schema |
| Invalid operator for field type | INVALID_OPERATOR | Operator not in field type's allowed list |
| Empty values | EMPTY_VALUES | FilterChipToken with values.length === 0 |

---

## 8. Implementation Phases

### Phase 6: Foundation — Token Types + Parser + Engine Expansion
**Duration**: ~1 week | **Files**: 8 source + 5 test

| Step | Work |
|------|------|
| 1 | New token types in `types/filters.ts` (keep old types temporarily) |
| 2 | `token-parser.ts`: `tokensToExpressionTree()` + `expressionTreeToTokens()` with tests |
| 3 | Expand `filter-engine.ts` `matchesCondition()` with all new operators |
| 4 | New URL serialization in `filter-url.ts` with legacy fallback |
| 5 | Token validation in `filter-validation.ts` |
| 6 | Expand `filter-schema.ts` with 4 field types + operator registry |
| 7 | `autoUpgradeOperator()` expansion for new operators |
| 8 | H1: Rename `is_none_of` display label → "is not any of" |

**Milestone**: Token ↔ tree round-trips, all operators evaluate correctly, URL serializes/deserializes.

### Phase 7: Token Rendering Components
**Duration**: ~1 week | **Files**: 10 source + 8 test

| Step | Work |
|------|------|
| 1 | `ConnectorChip.tsx` — AND/OR as removable badge tokens |
| 2 | `ParenChip.tsx` — ( / ) as paired removable tokens |
| 3 | `TokenRenderer.tsx` — discriminated union switch |
| 4 | Rewrite `FilterBar.tsx` — flat token rendering with `flex-wrap` |
| 5 | Modify `FilterChip.tsx` — per-token error state |
| 6 | `TokenErrorIndicator.tsx` — red border + tooltip |
| 7 | Delete `FilterGroupComponent.tsx` |
| 8 | Update `FilterAnnouncer.tsx` for token model |

**Milestone**: Filter bar renders flat token sequence with AND/OR/parens, multi-line wrapping, per-token errors.

### Phase 8: New Value Selectors + Operator Expansion
**Duration**: ~1 week | **Files**: 6 source + 6 test

| Step | Work |
|------|------|
| 1 | `DateValueSelector.tsx` — presets (1d, 7d, 14d, 30d) + Calendar |
| 2 | `NumericValueInput.tsx` — number input with range support |
| 3 | Expand `OperatorSelector.tsx` for 4 field types |
| 4 | Add colored dots to `EnumValueSelector.tsx` (G1) |
| 5 | G3: Cmd+Enter hint in all value selectors |
| 6 | F5: Add "Last seen" date field to schema |
| 7 | E1-E4: Wire all new operators |

**Milestone**: All 4 field types have working value selectors, all operators function.

### Phase 9: Palette Redesign + Input Behavior
**Duration**: ~1 week | **Files**: 5 source + 5 test

| Step | Work |
|------|------|
| 1 | Rewrite `FilterPalette.tsx` — Command-based with categories |
| 2 | `FilterBarInput.tsx` — inline input that fuzzy-filters palette |
| 3 | `stores/filter-ui-store.ts` — Zustand store for UI state |
| 4 | B1: Recent filters section (localStorage-backed) |
| 5 | B3: AND/OR buttons at bottom of palette |
| 6 | B4: Keyboard hints in palette footer |
| 7 | Rewrite `useFilterState.ts` + `useFilterUrlState.ts` for token model |

**Milestone**: Typing in bar filters palette, recent filters appear, AND/OR insertable from palette.

### Phase 10: Polish + Testing + Migration
**Duration**: ~1 week | **Files**: All test files + accessibility

| Step | Work |
|------|------|
| 1 | Rewrite all 21 test files against token model |
| 2 | Add token parser round-trip tests (property-based) |
| 3 | Add all 20 edge cases from QA analysis |
| 4 | URL format migration: detect v1 → auto-convert |
| 5 | Accessibility audit: ARIA roles for all token types |
| 6 | Update `useFilterFocus.ts` for token navigation |
| 7 | Performance testing: 20+ tokens |
| 8 | Update `HOW-TO-FILTER-BAR.md` |

**Milestone**: ~550-650 tests passing, backward-compatible URL migration, full accessibility.

---

## 9. Test Estimates

| Category | Current | After Redesign |
|----------|---------|---------------|
| Unit tests (lib) | 101 | ~200 |
| Component tests | 109 | ~250 |
| Integration/flow tests | 29 | ~80 |
| Accessibility tests | 15 | ~60 |
| Hook tests | 60 | ~80 |
| **Total** | **314** | **~550-650** |

---

## 10. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Token parser correctness | HIGH | Extensive tests + round-trip invariant testing |
| URL migration breaks saved links | HIGH | Auto-detect old format, legacy fallback deserializer |
| Token removal cascade ambiguity | MEDIUM | Explicit rules in Section 6.3 above |
| 20+ operators cognitive load | MEDIUM | Progressive disclosure: show top 3 operators, "More..." divider |
| Recent filters stale data | LOW | Store as token arrays, re-validate on application |

---

## 11. Open Questions (Need User Clarification)

1. **F1-F4**: Do Severity, Location, Network fields exist in the backend data model?
2. **G1**: Exact color mappings for status dots?
3. **B1**: How many recent filters to store? (Recommendation: 10, per-browser, localStorage)
4. **Operator precedence**: Does AND bind tighter than OR? (Recommendation: yes, standard boolean logic)
5. **Mixed connectors in parens**: Is `( A AND B OR C )` valid? (Recommendation: no, all connectors in a group must match)

---

## 12. Files Change Summary

### REWRITE (8)
- `src/types/filters.ts`
- `src/lib/filter-utils.ts`
- `src/lib/filter-validation.ts`
- `src/lib/filter-url.ts`
- `src/components/filters/FilterBar.tsx`
- `src/components/filters/BooleanConnector.tsx` → `ConnectorChip.tsx`
- `src/hooks/use-filter-state.ts`
- `src/hooks/use-filter-url-state.ts`

### MODIFY (8)
- `src/lib/filter-engine.ts` (expand operators)
- `src/lib/filter-schema.ts` (expand field types)
- `src/components/filters/FilterChip.tsx` (error state, 4-type dispatch)
- `src/components/filters/FilterPalette.tsx` (typeahead, recent, AND/OR)
- `src/components/filters/OperatorSelector.tsx` (20+ operators)
- `src/components/filters/EnumValueSelector.tsx` (colored dots)
- `src/components/filters/FilterAnnouncer.tsx` (token model)
- `src/hooks/use-filter-focus.ts` (token focus)

### DELETE (1)
- `src/components/filters/FilterGroupComponent.tsx`

### CREATE (9)
- `src/components/filters/ConnectorChip.tsx`
- `src/components/filters/ParenChip.tsx`
- `src/components/filters/TokenRenderer.tsx`
- `src/components/filters/FilterBarInput.tsx`
- `src/components/filters/DateValueSelector.tsx`
- `src/components/filters/NumericValueInput.tsx`
- `src/components/filters/TokenErrorIndicator.tsx`
- `src/lib/token-parser.ts`
- `src/stores/filter-ui-store.ts`

### KEEP (3)
- `src/hooks/use-keyboard-shortcuts.ts`
- `src/components/filters/TextValueInput.tsx`
- `src/lib/utils.ts`

### ALL 21 TEST FILES — REWRITE
