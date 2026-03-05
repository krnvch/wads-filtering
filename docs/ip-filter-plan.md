# IP Filter Field — Implementation Plan

## Overview

Implement the IP filter field per [docs/ip-filter-spec.md](./ip-filter-spec.md). This adds a new `"ip"` field type to the filtering system with custom operators (`in`, `not in`), a specialized value input component with two-section autocomplete (dataset IPs + CIDR suggestions), keystroke prevention, context-dependent `/` handling, and CIDR-aware filter evaluation.

## Current State Analysis

The filtering system supports 4 field types: `enum`, `text`, `date`, `numeric`. Each type has:
- A type string in `FilterFieldType` / `TokenFilterFieldType`
- An operator set in `OPERATORS_BY_FIELD_TYPE`
- A value selector component dispatched in `FilterBar.renderValueSelector()` and `FilterChip`
- Evaluation logic in `filter-engine.ts:matchesCondition()`

The mock data already has `sources.ips: string[]` on the `Attack` interface (`mock-attacks.ts:12`). All current IPs are in the `10.0.0.x` range — these need diversifying to demonstrate CIDR suggestions.

### Key Discoveries
- `FilterFieldType` union at `src/types/filters.ts:50` — add `"ip"` here
- `TokenFilterFieldType` at `src/types/tokens.ts:99` — mirror `"ip"` here
- `OPERATORS_BY_FIELD_TYPE` at `src/types/tokens.ts:142` — add `ip` operator set
- `FilterBar.renderValueSelector()` at `src/components/filters/FilterBar.tsx:474-543` — add `case "ip"`
- `FilterChip` value editor switch at `src/components/filters/FilterChip.tsx:107-165` — add `case "ip"`
- `matchesCondition()` at `src/lib/filter-engine.ts:44-187` — add IP/CIDR matching
- `generateSuggestions()` at `src/lib/filter-suggestions.ts:25-116` — handle `"ip"` type
- `getDefaultOperatorForField()` at `src/components/filters/FilterBar.tsx:459-472` — add `case "ip"`
- `computeTextSuggestions()` at `src/lib/mock-attacks.ts:65` — extract IPs for autocomplete
- URL serialization: IP dots are auto-encoded as `%2E` by existing `encodeValue()` in `token-url.ts:26` — no changes needed

## Desired End State

A fully functional IP filter field where:
1. Typing a digit in the query bar suggests the IP field
2. Selecting IP shows `in` / `not in` operators
3. The value input shows dataset-matching IPs and CIDR suggestions in a two-section dropdown
4. Keystroke prevention blocks invalid characters; `/` is context-dependent
5. Space, Comma, Enter, click-outside all trigger value completion + validation
6. CIDR ranges and individual IPs work in the filter engine
7. URL round-trips correctly

### Verification
- `npm run typecheck` passes
- `npm run test` passes (all existing + new tests)
- `npm run lint` passes
- Manual: type `10` in filter bar → IP field suggested → select → `in` operator → type `10.0.0.` → see matching IPs + `10.0.0.0/24` CIDR suggestion → select → chip forms → table filters correctly

## What We're NOT Doing

- IPv6 support (spec section 2.3.2 in error-handling-spec — separate effort)
- Custom CIDR prefix lengths beyond octet boundaries (only /8, /16, /24)
- Async/server-side IP lookup — suggestions come from client-side dataset only
- Geolocation or IP reputation data

## Implementation Approach

Five phases, each independently testable. The new `"ip"` field type is added end-to-end following the exact same patterns used by `"text"`, `"date"`, `"numeric"`.

---

## Phase 1: Type System & Schema Registration

### Overview
Add the `"ip"` field type to the type system, register the IP field in the schema, and add new operators.

### Changes Required

#### 1. Add `"ip"` to FilterFieldType
**File**: `src/types/filters.ts:50`

```typescript
export type FilterFieldType = "enum" | "text" | "date" | "numeric" | "ip";
```

#### 2. Add `"ip"` to TokenFilterFieldType
**File**: `src/types/tokens.ts:99`

```typescript
export type TokenFilterFieldType = "enum" | "text" | "date" | "numeric" | "ip";
```

#### 3. Add IP operators to FilterOperator
**File**: `src/types/filters.ts` (after line 30)

Add to the `FilterOperator` union:
```typescript
  // IP
  | "in"
  | "not_in";
```

#### 4. Add IP operators to TokenFilterOperator
**File**: `src/types/tokens.ts` (after line 47)

Add to the `TokenFilterOperator` union:
```typescript
  // IP
  | "in"
  | "not_in";
```

#### 5. Add operator labels
**File**: `src/types/tokens.ts` — `OPERATOR_LABELS` (after line 126)

```typescript
  in: "in",
  not_in: "not in",
```

#### 6. Add IP operator set
**File**: `src/types/tokens.ts` — `OPERATORS_BY_FIELD_TYPE` (after line 161)

```typescript
  ip: {
    primary: ["in", "not_in"],
    advanced: ["is_set", "is_not_set"],
  },
```

#### 7. Register IP field in FILTER_FIELDS
**File**: `src/lib/filter-schema.ts` (after the `parameter` field, in "Target & Context" category)

```typescript
  {
    key: "sources.ips",
    label: "IP",
    category: "Target & Context",
    type: "ip",
    operators: ["in", "not_in", "is_set", "is_not_set"],
  },
```

#### 8. Add `getIpFields()` helper
**File**: `src/lib/filter-schema.ts` (after `getNumericFields`)

```typescript
export function getIpFields(): FilterFieldDef[] {
  return FILTER_FIELDS.filter((f) => f.type === "ip");
}
```

### Success Criteria

#### Automated Verification
- [x] `npm run typecheck` passes — no type errors from new union members
- [x] `npm run lint` passes
- [x] Existing tests still pass: `npm run test`


---

## Phase 2: IP Validation & CIDR Utilities

### Overview
Create the pure utility module for IP validation, CIDR parsing, CIDR suggestion computation, and keystroke filtering. Fully unit-tested before any UI work.

### Changes Required

#### 1. Create IP utilities module
**File**: `src/lib/ip-utils.ts` (new file)

```typescript
/**
 * Validate a single IPv4 octet (0-255).
 */
export function isValidOctet(s: string): boolean {
  if (!s || !/^\d{1,3}$/.test(s)) return false;
  const n = parseInt(s, 10);
  return n >= 0 && n <= 255;
}

/**
 * Validate a complete IPv4 address (4 octets, each 0-255).
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every(isValidOctet);
}

/**
 * Validate a CIDR notation string (e.g. "192.168.0.0/24").
 * Returns true if the IP part is valid and prefix is 0-32.
 */
export function isValidCIDR(cidr: string): boolean {
  const slash = cidr.indexOf("/");
  if (slash === -1) return false;
  const ip = cidr.slice(0, slash);
  const prefix = cidr.slice(slash + 1);
  if (!isValidIPv4(ip)) return false;
  if (!/^\d{1,2}$/.test(prefix)) return false;
  const n = parseInt(prefix, 10);
  return n >= 0 && n <= 32;
}

/**
 * Validate an IP filter value — either a valid IPv4 or valid CIDR.
 */
export function isValidIpValue(value: string): boolean {
  return isValidIPv4(value) || isValidCIDR(value);
}

/**
 * Parse the user's partial IP input and return complete octets.
 * Returns { octets: string[], partial: string } where octets are
 * the fully entered octets and partial is the in-progress octet.
 *
 * Examples:
 *   "44."       → { octets: ["44"], partial: "" }
 *   "44.209."   → { octets: ["44", "209"], partial: "" }
 *   "44.20"     → { octets: ["44"], partial: "20" }
 *   "44.209.156.240" → { octets: ["44", "209", "156", "240"], partial: "" }
 */
export function parsePartialIp(input: string): {
  octets: string[];
  partial: string;
} {
  if (!input) return { octets: [], partial: "" };
  const parts = input.split(".");
  // If input ends with ".", last part is empty string → all prior are complete
  if (input.endsWith(".")) {
    return { octets: parts.slice(0, -1), partial: "" };
  }
  // Otherwise last part is partial
  return { octets: parts.slice(0, -1), partial: parts[parts.length - 1] };
}

/**
 * Compute CIDR suggestions based on the number of complete octets entered.
 * Returns an empty array if any complete octet is invalid.
 *
 * Rules:
 *   1 complete octet → [X.0.0.0/8]
 *   2 complete octets → [X.Y.0.0/16]
 *   3 complete octets → [X.Y.Z.0/24]
 *   4 complete octets (full IP) → [] (no suggestion)
 *   0 complete octets → []
 */
export function computeCidrSuggestions(input: string): string[] {
  const { octets } = parsePartialIp(input);
  if (octets.length === 0 || octets.length > 3) return [];
  if (!octets.every(isValidOctet)) return [];

  const padded = [...octets, ...Array(4 - octets.length).fill("0")];
  const prefix = octets.length * 8;
  return [`${padded.join(".")}/${prefix}`];
}

/**
 * Filter a list of IPs to those that prefix-match the user's input.
 */
export function filterMatchingIps(
  datasetIps: string[],
  input: string,
): string[] {
  if (!input) return [];
  return datasetIps.filter((ip) => ip.startsWith(input));
}

/**
 * Check if an IPv4 address falls within a CIDR range.
 */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const slash = cidr.indexOf("/");
  if (slash === -1) return false;
  const baseIp = cidr.slice(0, slash);
  const prefix = parseInt(cidr.slice(slash + 1), 10);
  if (prefix < 0 || prefix > 32) return false;

  const ipNum = ipToNumber(ip);
  const baseNum = ipToNumber(baseIp);
  if (ipNum === null || baseNum === null) return false;

  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

/**
 * Convert an IPv4 address string to a 32-bit unsigned number.
 * Returns null if invalid.
 */
export function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    result = (result << 8) | n;
  }
  return result >>> 0;
}

/**
 * Check if a character is allowed in IP input.
 * Allowed: digits (0-9), dot (.), slash (/).
 * Note: comma is handled at the chip level, not here.
 */
export function isAllowedIpChar(char: string): boolean {
  return /^[\d./]$/.test(char);
}

/**
 * Validate whether a slash keystroke should be accepted.
 * Only allow "/" if the text before cursor is a valid complete IPv4 address.
 */
export function shouldAcceptSlash(currentText: string): boolean {
  return isValidIPv4(currentText);
}

/**
 * Validate whether a dot keystroke should be accepted.
 * Block if: input is empty, or last char is already a dot.
 */
export function shouldAcceptDot(currentText: string): boolean {
  if (!currentText) return false;
  if (currentText.endsWith(".")) return false;
  return true;
}
```

#### 2. Create IP utilities tests
**File**: `src/lib/__tests__/ip-utils.test.ts` (new file)

Test all exported functions:
- `isValidOctet`: valid (0, 128, 255), invalid (256, -1, "abc", "")
- `isValidIPv4`: valid ("192.168.0.1"), invalid ("192.168.0", "999.0.0.1", "1.2.3.4.5")
- `isValidCIDR`: valid ("10.0.0.0/8", "192.168.0.0/24"), invalid ("10.0.0.0/33", "10.0.0/8")
- `isValidIpValue`: both IP and CIDR
- `parsePartialIp`: all input patterns from docstring examples
- `computeCidrSuggestions`: 1/2/3/4 octets, invalid octets, empty input
- `filterMatchingIps`: prefix matching, empty input
- `ipMatchesCidr`: matching/non-matching IPs, edge cases (/0, /32)
- `ipToNumber`: valid IPs, invalid IPs
- `isAllowedIpChar`: digits, dot, slash, letters, special chars
- `shouldAcceptSlash`: valid complete IP, partial IP, invalid IP
- `shouldAcceptDot`: empty, ends with dot, normal

### Success Criteria

#### Automated Verification
- [x] `npm run typecheck` passes
- [x] `npm run test -- src/lib/__tests__/ip-utils.test.ts` — all tests pass
- [x] `npm run lint` passes

---

## Phase 3: IpValueInput Component

### Overview
Create the IP-specific value input component with two-section autocomplete, keystroke prevention, and all completion triggers from spec section 4.2.

### Changes Required

#### 1. Create IpValueInput component
**File**: `src/components/filters/IpValueInput.tsx` (new file)

Props interface (mirrors `TextValueInput` pattern):
```typescript
interface IpValueInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldDef: FilterFieldDef;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onConfirm: (overrideValues?: string[]) => void;
  datasetIps?: string[];     // unique IPs from current dataset
  children: React.ReactNode;
}
```

**Component structure** (shadcn/ui `Popover` + `PopoverContent`):

```
Popover
  PopoverTrigger → children (value display button)
  PopoverContent
    ┌─ Selected values as removable Badge chips ─┐
    │  Each Badge shows the IP/CIDR value         │
    │  Invalid values get destructive variant      │
    │  with Tooltip on hover showing error         │
    ├─ Input field ──────────────────────────────┤
    │  Controlled <Input> with onKeyDown handler  │
    ├─ Matching IPs section ─────────────────────┤
    │  Prefix-filtered IPs from dataset (max 10) │
    ├─ Separator ────────────────────────────────┤
    │  <Separator /> (shadcn/ui)                  │
    ├─ CIDR suggestion section ──────────────────┤
    │  Computed CIDR based on complete octets     │
    ├─ Keyboard hint ────────────────────────────┤
    │  "↵ to apply · Space/Comma to add value"   │
    └────────────────────────────────────────────┘
```

**Key behaviors:**

1. **Keystroke prevention** (`onKeyDown` + `onChange` filtering):
   - Block non-`isAllowedIpChar` characters (except comma for multi-value)
   - Block dot if `!shouldAcceptDot(currentText)`
   - Block slash if `!shouldAcceptSlash(currentText)`
   - Use `onChange` handler to filter: compare new value against old, reject if new char fails validation

2. **Completion triggers** (all call `commitCurrentValue()`):
   - `Enter` → commit value + call `onConfirm` (close chip)
   - `Space` or `,` → commit value, keep input open for next value
   - Click outside popover → `onOpenChange(false)` commits via `handleOpenChange`
   - Click inside chip but outside input → commit current value

3. **`commitCurrentValue()` function**:
   ```typescript
   const commitCurrentValue = () => {
     const trimmed = inputValue.trim();
     if (!trimmed) return;
     // Always add the value (even if invalid — validation highlights it)
     if (!selectedValues.includes(trimmed)) {
       onSelectionChange([...selectedValues, trimmed]);
     }
     setInputValue("");
   };
   ```

4. **Validation display**: Each selected value Badge checks `isValidIpValue(value)`. Invalid values render with `variant="destructive"` and a wrapping `Tooltip` showing the specific error (e.g. "Invalid octet: 999", "Incomplete IP address", "CIDR prefix must be 0-32").

5. **Suggestion list with keyboard navigation**:
   - `focusedIndex` state for arrow-key navigation across both sections
   - Matching IPs section: `filterMatchingIps(datasetIps, inputValue).slice(0, 10)`
   - CIDR section: `computeCidrSuggestions(inputValue)`
   - Both combined into `allSuggestions` array for unified keyboard nav
   - `ArrowDown` / `ArrowUp` moves `focusedIndex`
   - `Enter` on focused suggestion selects it (adds to values)
   - Click on suggestion adds to values

6. **Conditional sections**: If no matching IPs, only show CIDR section (no empty section). If no CIDR suggestion (4 octets complete or invalid), only show matching IPs.

#### 2. Wire into FilterBar.renderValueSelector
**File**: `src/components/filters/FilterBar.tsx:474-543`

Add before the `default:` case:
```typescript
    case "ip":
      return (
        <IpValueInput
          open={true}
          onOpenChange={onOpenChange}
          fieldDef={field}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={onConfirm}
          datasetIps={textSuggestions?.["sources.ips"]}
        >
          {trigger}
        </IpValueInput>
      );
```

#### 3. Wire into FilterChip value editor
**File**: `src/components/filters/FilterChip.tsx:107-165`

Add `case "ip":` before `default:`:
```typescript
    case "ip":
      valueEditor = (
        <IpValueInput
          open={valuePopoverOpen}
          onOpenChange={handleOpenChange}
          fieldDef={fieldDef}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={handleConfirm}
          datasetIps={suggestions}
        >
          {valueTrigger}
        </IpValueInput>
      );
      break;
```

#### 4. Add default operator for IP type
**File**: `src/components/filters/FilterBar.tsx:459-472`

Add case before `default`:
```typescript
    case "ip":
      return "in";
```

Also update `getDefaultOperator()` in `src/lib/token-utils.ts:502-509` (same pattern).

#### 5. Wire IP suggestions into page
**File**: `src/lib/mock-attacks.ts:65`

Update `computeTextSuggestions` to include IPs:
```typescript
export function computeTextSuggestions(attacks: Attack[]): Record<string, string[]> {
  return {
    endpoints: [...new Set(attacks.map((a) => a.endpoints))],
    host: [...new Set(attacks.map((a) => a.host))],
    parameter: [...new Set(attacks.map((a) => a.parameter))],
    "sources.ips": [...new Set(attacks.flatMap((a) => a.sources.ips))],
  };
}
```

#### 6. Handle IP type in generateSuggestions
**File**: `src/lib/filter-suggestions.ts`

In the field-type loop (line 40-59), add after the `numeric` continue:
```typescript
    if (f.type === "ip") continue; // IP suggestions handled by dedicated component
```

### Success Criteria

#### Automated Verification
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Existing tests still pass

---

## Phase 4: Filter Engine — IP/CIDR Matching

### Overview
Add `in` / `not_in` operator evaluation with CIDR range support to the filter engine.

### Changes Required

#### 1. Add IP matching to filter engine
**File**: `src/lib/filter-engine.ts`

Import `ipMatchesCidr`, `isValidCIDR` from `@/lib/ip-utils`.

In `matchesCondition()`, add a new block after the unary operator checks (after line 57) and before the array field handling (line 60):

```typescript
  // IP operators (in / not_in) — work with both individual IPs and CIDR ranges
  if (operator === "in" || operator === "not_in") {
    // Flatten array field values (e.g. sources.ips: string[])
    const ips: string[] = Array.isArray(rawValue)
      ? rawValue.map(String)
      : rawValue != null
        ? [String(rawValue)]
        : [];

    const matches = ips.some((ip) =>
      values.some((filterVal) =>
        isValidCIDR(filterVal)
          ? ipMatchesCidr(ip, filterVal)
          : ip === filterVal
      ),
    );

    return operator === "in" ? matches : !matches;
  }
```

#### 2. Add filter engine tests for IP
**File**: `src/lib/__tests__/filter-engine-ip.test.ts` (new file)

Test cases:
- `in` with single IP match
- `in` with single IP no match
- `in` with CIDR range match (e.g. `10.0.0.0/24` matches `10.0.0.1`)
- `in` with CIDR range no match (e.g. `192.168.0.0/24` does not match `10.0.0.1`)
- `not_in` inverse of all above
- Mixed values: `in` with both IP and CIDR in values array
- Array source field: record has `sources.ips: ["10.0.0.1", "192.168.1.1"]`
- Edge cases: `/0` matches everything, `/32` matches exact IP only

### Success Criteria

#### Automated Verification
- [x] `npm run typecheck` passes
- [x] `npm run test -- src/lib/__tests__/filter-engine-ip.test.ts` — all tests pass
- [x] `npm run test` — all existing tests still pass
- [x] `npm run lint` passes

---

## Phase 5: Mock Data, IpValueInput Tests & Integration

### Overview
Diversify mock IP data for realistic CIDR suggestions, add component tests for `IpValueInput`, and add integration tests.

### Changes Required

#### 1. Diversify mock IP data
**File**: `src/lib/mock-attacks.ts`

Update some mock attacks to use varied IP ranges so CIDR suggestions are more interesting:

```
atk_01: ["44.209.156.240"]
atk_02: ["44.209.157.242"]
atk_03: ["44.209.156.192"]
atk_04: ["192.168.1.50"]
atk_05: ["192.168.1.100"]
atk_06: ["10.0.0.6"]
atk_07: ["10.0.0.7"]
... (keep some as 10.0.0.x, diversify ~5-8 to other ranges)
```

This ensures typing `44.209.` shows matching IPs + `44.209.0.0/16` CIDR, and `44.209.156.` shows a narrower set + `44.209.156.0/24`.

#### 2. Create IpValueInput component tests
**File**: `src/components/filters/__tests__/IpValueInput.test.tsx` (new file)

Test cases (follow `TextValueInput.test.tsx` patterns):

**Rendering:**
- Renders popover with input field when open
- Shows dataset IP suggestions that match input prefix
- Shows CIDR suggestion below separator
- Does not show CIDR section when 4 octets complete
- Does not show matching IPs section when no matches

**Keystroke prevention:**
- Blocks letter characters
- Blocks dot as first character
- Blocks consecutive dots
- Blocks `/` when IP is incomplete
- Accepts `/` when IP is complete (4 valid octets)
- Accepts digits, dots

**Completion triggers:**
- Enter commits value and closes
- Space commits value, keeps input open
- Comma commits value, keeps input open
- Popover close commits pending values

**Validation display:**
- Valid IP shows normal Badge
- Invalid IP (e.g. `999.0.0.1`) shows destructive Badge with tooltip
- Invalid CIDR (e.g. `10.0.0.0/33`) shows destructive Badge with tooltip
- Incomplete IP (e.g. `10.0.0`) shows destructive Badge

**Suggestion interaction:**
- Clicking a suggestion adds it as a value
- Keyboard navigation through suggestions works
- Already-selected values are excluded from suggestions

#### 3. Add IP filter to integration test
**File**: `src/components/filters/__tests__/FilterFlow.test.tsx`

Add a test case for the IP filter flow:
- Open palette, search for "IP", select IP field
- Select `in` operator
- Enter an IP value
- Verify chip is created with correct field/operator/values
- Verify table filtering works

#### 4. Add schema test for IP field
**File**: `src/lib/__tests__/filter-schema.test.ts`

Add test that IP field exists with correct properties:
```typescript
it("has IP field with correct operators", () => {
  const ipField = getFieldByKey("sources.ips");
  expect(ipField).toBeDefined();
  expect(ipField!.type).toBe("ip");
  expect(ipField!.operators).toContain("in");
  expect(ipField!.operators).toContain("not_in");
});
```

#### 5. Add URL round-trip test for IP values
**File**: `src/lib/__tests__/token-url.test.ts`

Add test that IP values with dots serialize/deserialize correctly:
```typescript
it("round-trips IP filter values with dots", () => {
  const tokens = [chip("sources.ips", ["44.209.156.240", "10.0.0.0/8"], "in")];
  const serialized = serializeTokens(tokens);
  const deserialized = deserializeTokens(serialized);
  expect(deserialized[0].values).toEqual(["44.209.156.240", "10.0.0.0/8"]);
});
```

### Success Criteria

#### Automated Verification
- [x] `npm run typecheck` passes
- [x] `npm run test` — all tests pass (existing + new)
- [x] `npm run lint` passes

#### Manual Verification
- [ ] Full flow: type `44` → select IP → select `in` → type `44.209.` → see 3 matching IPs + `44.209.0.0/16` → click a suggestion → value chip forms → add another via Space → Enter to close → table filters correctly
- [ ] URL shows `?q=sources%2Eips.in.44%2E209%2E156%2E240` (dots encoded)
- [ ] Refresh page → chip restores correctly from URL
- [ ] Invalid value in URL → chip renders with error state

---

## Testing Strategy

### Unit Tests
- `src/lib/__tests__/ip-utils.test.ts` — all validation/parsing/CIDR functions
- `src/lib/__tests__/filter-engine-ip.test.ts` — `in`/`not_in` operators with IP and CIDR values
- `src/lib/__tests__/token-url.test.ts` — IP value round-trip serialization
- `src/lib/__tests__/filter-schema.test.ts` — IP field registration

### Component Tests
- `src/components/filters/__tests__/IpValueInput.test.tsx` — rendering, keystroke filtering, completion triggers, validation display, suggestions

### Integration Tests
- `src/components/filters/__tests__/FilterFlow.test.tsx` — end-to-end IP filter chip creation and evaluation

### Manual Testing Steps
1. Type `1` in empty filter bar → verify IP appears in suggestions
2. Select IP → verify `in` / `not in` operators shown
3. Type `44.209.` → verify matching IPs and `44.209.0.0/16` CIDR suggestion
4. Type `44.209.156.` → verify narrower IPs and `44.209.156.0/24`
5. Type full IP `44.209.156.240` → verify no CIDR suggestion
6. Press Space after IP → verify value chip forms, input stays active
7. Press Enter → verify chip closes
8. Type invalid `999.0.0.1` → verify error highlight with tooltip
9. Verify `not in` operator excludes matching rows
10. Verify CIDR range `10.0.0.0/8` matches all `10.x.x.x` IPs
11. Verify URL persistence and page refresh restoration

## Performance Considerations

- `filterMatchingIps` runs on every keystroke — O(n) where n = unique IPs in dataset. For datasets up to ~10k IPs this is instant. If datasets grow larger, consider debouncing or a trie.
- `ipMatchesCidr` does bit arithmetic — O(1) per comparison, fast even for large filter value sets.
- CIDR suggestion computation is trivial (string splitting + concatenation).

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/filters.ts` | Edit | Add `"ip"` to `FilterFieldType`, add `"in"` / `"not_in"` to `FilterOperator` |
| `src/types/tokens.ts` | Edit | Add `"ip"` to `TokenFilterFieldType`, add operators, labels, operator set |
| `src/lib/filter-schema.ts` | Edit | Register `sources.ips` field, add `getIpFields()` |
| `src/lib/ip-utils.ts` | Create | All IP validation, CIDR, parsing, keystroke utilities |
| `src/lib/__tests__/ip-utils.test.ts` | Create | Unit tests for ip-utils |
| `src/components/filters/IpValueInput.tsx` | Create | IP value input component with two-section autocomplete |
| `src/components/filters/__tests__/IpValueInput.test.tsx` | Create | Component tests |
| `src/components/filters/FilterBar.tsx` | Edit | Add `case "ip"` in `renderValueSelector` + `getDefaultOperatorForField` |
| `src/components/filters/FilterChip.tsx` | Edit | Add `case "ip"` in value editor switch |
| `src/lib/filter-engine.ts` | Edit | Add `in`/`not_in` operator evaluation with CIDR support |
| `src/lib/__tests__/filter-engine-ip.test.ts` | Create | Filter engine IP tests |
| `src/lib/filter-suggestions.ts` | Edit | Skip `"ip"` type in `generateSuggestions` |
| `src/lib/mock-attacks.ts` | Edit | Diversify IPs, add `sources.ips` to `computeTextSuggestions` |
| `src/lib/token-utils.ts` | Edit | Add `case "ip"` in `getDefaultOperator` |
| `src/lib/__tests__/token-url.test.ts` | Edit | Add IP value round-trip test |
| `src/lib/__tests__/filter-schema.test.ts` | Edit | Add IP field validation test |
| `src/components/filters/__tests__/FilterFlow.test.tsx` | Edit | Add IP filter integration test |

## References

- Spec: `docs/ip-filter-spec.md`
- Error handling spec (IP validation rules): `docs/error-handling-spec.md` §2.3.1
- CIDR reference: https://www.ripe.net/about-us/press-centre/understanding-ip-addressing
