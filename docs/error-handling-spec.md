# Error State Handling — Query String & Filter Values

## Overview

This document defines error handling behavior for the filtering query string. Errors fall into two top-level categories — **query syntax errors** and **filter value errors** — each with distinct detection, feedback, and recovery strategies.

When both syntax and value errors are present simultaneously, all errors are highlighted together (incorrect values, ordering issues, and other syntax problems).

---

## 1. Query Syntax Errors

Errors in the structural composition of the query string itself (operators, chip completeness, grouping).

### 1.1 Operator Ordering Errors

Duplicate or missing operators between filter chips.

**Examples:**
- Two operators in a row: `AND AND`
- Two chips adjacent without an operator: `[Status IN Monitoring] [Country in US]`

**Behavior:** Input is NOT ignored. Chips are created, but both chips involved in the ordering violation are highlighted in an error state. A hover tooltip describes the specific error.

#### Acceptance Criteria

- **AC-1.1.1:** Verify that given a query string with two consecutive operators (e.g. `AND AND`), when the user submits the input, then both operator tokens are highlighted in the error state and a hover tooltip describes the ordering error.
- **AC-1.1.2:** Verify that given two filter chips entered without an operator between them (e.g. `[Status IN Monitoring] [Country in US]`), when the user submits the input, then both chips are created and both are highlighted in the error state.
- **AC-1.1.3:** Verify that given chips highlighted with an operator ordering error, when the user hovers over an error-highlighted chip, then a tooltip is displayed describing the specific error.

### 1.2 Incomplete Chip

User submits a partial/incomplete chip expression.

**Example:** User types `S` and presses Enter.

**Behavior:** The input is discarded — ignored entirely. No chip is created.

#### Acceptance Criteria

- **AC-1.2.1:** Verify that given the query input field is focused with a partial text value (e.g. `S`) that does not resolve to a valid chip, when the user presses Enter, then the input is discarded and no chip is created.
- **AC-1.2.2:** Verify that given an incomplete chip input is discarded, when the user looks at the query bar, then no error state is shown (the invalid input is silently ignored).

### 1.3 Group Syntax Errors

Any other syntactically invalid query structure — e.g. unclosed brackets/parentheses.

**Behavior:** Validation occurs at the moment the search is initiated. The entire query string is highlighted in the error state, and a description of the reason is displayed below the query bar.

#### Acceptance Criteria

- **AC-1.3.1:** Verify that given a query string with an unclosed parenthesis (e.g. `(Status IN Blocked AND`), when the user initiates the search, then the entire query string is highlighted in the error state.
- **AC-1.3.2:** Verify that given a query string with a group syntax error, when the error state is displayed, then a description of the error reason is shown below the query bar.
- **AC-1.3.3:** Verify that given a syntactically invalid query string, when the user has NOT yet initiated the search, then no error highlighting is shown (validation is deferred until search execution).

---

## 2. Filter Value Errors

Errors in the values provided within a filter chip, categorized by the field's data type.

### 2.1 Strongly Typed Fields (INT, Boolean)

Numeric and boolean fields that expect specific data types.

**Examples:** `Number of requests >= a` (letter in a numeric field)

**Behavior:** Prevent the user from entering incorrect data types entirely. When a user enters inconsistent data (e.g. typing `a` into a numeric field), nothing happens — the keystroke is ignored.

#### Acceptance Criteria

- **AC-2.1.1:** Verify that given a numeric filter value field is focused (e.g. "Number of requests"), when the user types a non-numeric character (e.g. `a`), then the keystroke is ignored and the character does not appear in the field.
- **AC-2.1.2:** Verify that given a boolean filter value field is focused, when the user types a value that is not a valid boolean option, then the input is ignored.
- **AC-2.1.3:** Verify that given a numeric filter value field, when the user types valid numeric characters, then the characters appear in the field normally.

### 2.2 String with Limited Options (Enum)

Fields with a predefined set of valid values (e.g. Status: `Blocked`, `Monitoring`).

**Example:** User types `Blicked` instead of `Blocked`.

**Behavior:** Do NOT prevent the user from entering an incorrect value. Instead:
1. The incorrect value is highlighted within the chip as an error.
2. A tooltip on hover explains that the value is invalid.

This applies to both single-value and multi-value enum fields (e.g. `Attribute operator Value, Value, Value`).

#### Acceptance Criteria

- **AC-2.2.1:** Verify that given a filter field with limited options (e.g. Status), when the user enters a value not in the allowed set (e.g. `Blicked`), then the value is accepted into the chip but highlighted in the error state.
- **AC-2.2.2:** Verify that given a chip with an invalid enum value, when the user hovers over the highlighted value, then a tooltip is displayed explaining the value is invalid.
- **AC-2.2.3:** Verify that given a multi-value enum filter (e.g. `Status IN Value1, Value2, Value3`), when one of the values is invalid, then only the invalid value is highlighted in the error state while valid values remain normal.
- **AC-2.2.4:** Verify that given a filter field with limited options, when the user enters a valid value, then no error highlighting is applied.

### 2.3 IP Address Fields

#### 2.3.1 IPv4

**Input restrictions:** Only digits, dots, and slashes are allowed.

**Behavior — keystroke prevention:**
- Non-digit, non-dot, non-slash characters are blocked at input time (keystrokes ignored).
- A dot cannot be the first character.
- Two consecutive dots are not allowed.

**Behavior — post-input validation:**
When a user enters inconsistent data that passes keystroke filters but is structurally invalid, nothing happens — the input is ignored.

**Example:** `12.123.123.123/` — trailing slash with no CIDR prefix; `192.168.xx.xx/xx` — segments highlighted as incorrect.

#### Acceptance Criteria

- **AC-2.3.1:** Verify that given an IPv4 filter value field is focused, when the user types a letter or special character (not digit, dot, or slash), then the keystroke is ignored.
- **AC-2.3.2:** Verify that given an empty IPv4 filter value field, when the user types a dot as the first character, then the keystroke is ignored.
- **AC-2.3.3:** Verify that given an IPv4 value field with the last character being a dot, when the user types another dot, then the keystroke is ignored (no consecutive dots).
- **AC-2.3.4:** Verify that given a structurally invalid IPv4 address that passed keystroke filters (e.g. wrong number of segments), when the user completes the input, then the incorrect segments are highlighted in the error state.

#### 2.3.2 IPv6

**Behavior — post-input validation:**
After the user finishes input, the value is validated. Errors include:
- Wrong number of segments (e.g. 2 instead of 4)
- Extra segments
- Invalid segment values
- Invalid CIDR notation

When an error is detected:
1. The incorrect portion of the value is highlighted in the error state.
2. A tooltip on hover describes the issue.

#### Acceptance Criteria

- **AC-2.3.5:** Verify that given an IPv6 filter value field, when the user finishes input with too few segments (e.g. 2 instead of the expected number), then the value is highlighted in the error state.
- **AC-2.3.6:** Verify that given an IPv6 filter value field, when the user finishes input with extra segments, then the value is highlighted in the error state.
- **AC-2.3.7:** Verify that given an IPv6 filter value field, when the user finishes input with an invalid CIDR notation, then the incorrect portion is highlighted in the error state.
- **AC-2.3.8:** Verify that given an IPv6 value highlighted in the error state, when the user hovers over the highlighted portion, then a tooltip is displayed describing the specific validation error.

---

## Error Feedback Summary

| Error Category | Detection Time | Visual Feedback | User Input Handling |
|---|---|---|---|
| Operator ordering | On chip creation | Error-highlighted chips + hover tooltip | Input accepted, chips created |
| Incomplete chip | On Enter press | None (silent discard) | Input discarded, no chip created |
| Group syntax | On search initiation | Entire query highlighted + error description below | Input accepted, search blocked |
| Strongly typed value (INT/Bool) | On keystroke | None (silent block) | Invalid keystrokes ignored |
| Enum value | On chip creation | Invalid value highlighted + hover tooltip | Input accepted into chip |
| IPv4 | Keystroke + post-input | Invalid segments highlighted | Invalid keystrokes blocked; structural errors highlighted |
| IPv6 | Post-input | Invalid portions highlighted + hover tooltip | Input accepted, validated after completion |
