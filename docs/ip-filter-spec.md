# IP Filter Field — Specification

## Overview

The IP filter allows users to filter table data by IPv4 addresses and CIDR ranges. It supports two operators — **in** and **not in** — both accepting arrays of values. The filter appears as a suggestion when the user begins typing an IP-like pattern in the query string.

---

## 1. Filter Activation

When a user types input that looks like the beginning of an IP address (starts with a digit), the system suggests the **IP** filter field among other matching fields.

### Acceptance Criteria

- **AC-1.1:** Verify that given the query input is focused and empty, when the user types a digit (e.g. `1`), then the IP filter field appears in the suggestion list alongside other matching fields.
- **AC-1.2:** Verify that given the IP filter field is selected, when the user views the operator step, then exactly two operators are available: `in` and `not in`.

---

## 2. Operators

| Operator | Meaning                                        | Value Type                 |
|----------|------------------------------------------------|----------------------------|
| `in`     | Match rows where IP is in the provided set     | Array of IPs / CIDR ranges |
| `not in` | Match rows where IP is NOT in the provided set | Array of IPs / CIDR ranges |

Both operators accept multiple values. Each value is either a single IPv4 address (e.g. `44.209.156.240`) or a CIDR range (e.g. `192.168.0.0/24`).

### Acceptance Criteria

- **AC-2.1:** Verify that given the IP filter with operator `in` and values `44.209.156.240, 10.0.0.1`, when the filter is applied, then only rows matching either IP are shown.
- **AC-2.2:** Verify that given the IP filter with operator `not in` and values `192.168.0.0/24`, when the filter is applied, then rows with IPs in the 192.168.0.0–192.168.0.255 range are excluded.
- **AC-2.3:** Verify that both `in` and `not in` operators accept a mix of individual IPs and CIDR ranges in the same filter chip (e.g. `IP in 10.0.0.1, 192.168.0.0/16`).

---

## 3. Autocomplete & Suggestions

When the user is entering a value for the IP filter, the dropdown displays two sections separated by a divider:

1. **Matching IPs** (top) — individual IP addresses from the current dataset that prefix-match the user's input.
2. **CIDR mask suggestions** (bottom) — computed network ranges based on the octets entered so far.

### 3.1 Matching IPs from Dataset

The system filters all unique IP addresses visible in the current table data and shows those whose string representation starts with the user's current input.

- Results are sorted by frequency (most common first) or alphabetically — whichever the implementation determines more useful.
- Maximum of **10** matching IPs shown at a time to avoid overwhelming the list.

#### Examples

| User Input    | Dataset Contains                                         | Suggestions Shown                              |
|---------------|----------------------------------------------------------|------------------------------------------------|
| `44.`         | 44.209.156.240, 44.209.157.242, 44.209.156.192, 10.0.0.1 | 44.209.156.240, 44.209.157.242, 44.209.156.192 |
| `44.209.156.` | 44.209.156.240, 44.209.157.242, 44.209.156.192           | 44.209.156.240, 44.209.156.192                 |
| `10`          | 10.0.0.1, 10.0.0.2, 192.168.1.1                          | 10.0.0.1, 10.0.0.2                             |

### 3.2 CIDR Mask Suggestions

Below the divider, the system suggests CIDR network ranges derived from the octets the user has entered so far. The logic is based on standard IPv4 CIDR notation (see [RIPE — Understanding IP Addressing](https://www.ripe.net/about-us/press-centre/understanding-ip-addressing)).

#### Calculation Rules

CIDR suggestions are computed by counting the number of **complete octets** the user has entered (i.e., octets followed by a dot or fully typed as the 4th octet). The remaining octets are zeroed out, and the prefix length corresponds to 8 bits per complete octet:

| Complete Octets Entered            | Zeroed Address | Prefix | Example Input    | Suggestion                                  |
|------------------------------------|----------------|--------|------------------|---------------------------------------------|
| 1 (e.g. `44.`)                     | `44.0.0.0`     | `/8`   | `44.`            | `44.0.0.0/8`                                |
| 2 (e.g. `44.209.`)                 | `44.209.0.0`   | `/16`  | `44.209.`        | `44.209.0.0/16`                             |
| 3 (e.g. `44.209.156.`)             | `44.209.156.0` | `/24`  | `44.209.156.`    | `44.209.156.0/24`                           |
| 4 (full IP, e.g. `44.209.156.240`) | —              | `/32`  | `44.209.156.240` | No CIDR suggestion (user entered a full IP) |

- When the user is mid-octet (e.g. `44.20`), suggest the CIDR for the last fully completed boundary. In this case 1 complete octet → `44.0.0.0/8`.
- When all 4 octets are complete, do **not** show a CIDR suggestion — the user has entered a specific IP.
- Only show CIDR suggestions when the entered octets are valid (each octet 0–255).

#### Examples from Mockups

**Input: `44.209.`** (2 complete octets)
```
── Matching IPs ──────────────
  44.209.156.240
  44.209.157.242
  44.209.156.192
──────────────────────────────
  44.209.0.0/16
```

**Input: `44.209.156.`** (3 complete octets)
```
── Matching IPs ──────────────
  44.209.156.240
  44.209.156.242
──────────────────────────────
  44.209.156.0/24
```

### 3.3 Suggestion Interaction

- Clicking or pressing Enter on a suggestion inserts it as a value in the filter chip.
- After selecting a value, the input field remains active so the user can add additional values (comma-separated array).
- Keyboard navigation (arrow keys) moves through the list; matching IPs and CIDR suggestions are navigable as a single continuous list.

### Acceptance Criteria

- **AC-3.1:** Verify that given the IP value field is focused with input `44.209.`, when the dropdown appears, then the top section contains only IPs from the current dataset that start with `44.209.`.
- **AC-3.2:** Verify that given the IP value field has input `44.209.`, when the dropdown appears, then a CIDR suggestion `44.209.0.0/16` is shown below a divider.
- **AC-3.3:** Verify that given the IP value field has input `44.209.156.`, when the dropdown appears, then a CIDR suggestion `44.209.156.0/24` is shown below a divider.
- **AC-3.4:** Verify that given the IP value field has input `44.`, when the dropdown appears, then a CIDR suggestion `44.0.0.0/8` is shown below a divider.
- **AC-3.5:** Verify that given the IP value field has a complete IP address `44.209.156.240`, when the dropdown appears, then no CIDR suggestion section is shown.
- **AC-3.6:** Verify that given the IP value field has input `44.20` (mid-octet), when the dropdown appears, then the CIDR suggestion is `44.0.0.0/8` (based on 1 complete octet).
- **AC-3.7:** Verify that given matching IPs and a CIDR suggestion are shown, when the user navigates with arrow keys, then both sections are traversable as a single continuous list.
- **AC-3.8:** Verify that given the user clicks a suggestion (IP or CIDR), then the value is inserted into the filter chip and the input remains active for additional values.
- **AC-3.9:** Verify that given the dataset contains no IPs matching the user's input prefix, when the dropdown appears, then only the CIDR suggestion section is shown (no empty matching-IPs section).
- **AC-3.10:** Verify that given an invalid partial octet (e.g. `999.`), when the system evaluates CIDR suggestions, then no CIDR suggestion is shown (invalid octet).

---

## 4. Input Validation

IP value validation follows the rules defined in the [Error Handling Spec](./error-handling-spec.md), section 2.3.1 (IPv4). A summary of the relevant rules:

### 4.1 Keystroke Prevention

- Only digits (0–9), dots (`.`), slashes (`/`), and commas (`,` for multi-value) are allowed.
- A dot cannot be the first character.
- Two consecutive dots are not allowed.

### 4.2 Editing Completion Triggers

The following actions mark a value or chip as "completed" and trigger IP validation. Invalid values are highlighted in the error state within the chip, with a tooltip on hover explaining the issue.

#### 4.2.1 Click Outside the Chip

When the user clicks anywhere outside the chip, the **entire chip input** is considered completed. The current text input (if any) is committed as a value. IP validation runs on all values; invalid values are highlighted in the error state.

#### 4.2.2 Click Outside a Value but Inside the Chip

When the user clicks inside the chip but outside the current value text (e.g. before the first character or after the last character of a value like `192.168.0.1`), the **current value** is considered completed. A value chip forms, IP validation runs on that value (highlighted if invalid), and the input cursor repositions so the user can enter the next value.

#### 4.2.3 Press Enter

When the user presses Enter, the **entire chip input** is considered completed. The current text input (if any) is committed as a value. IP validation runs on all values; invalid values are highlighted in the error state. The chip closes.

#### 4.2.4 Press Space or Comma

When the user presses Space or Comma, the **current value** is considered completed. A value chip forms, IP validation runs on that value (highlighted if invalid), and the input remains active so the user can continue entering additional values.

#### 4.2.5 Press `/` (Slash)

The slash key has context-dependent behavior:

- **If the current text is a valid complete IPv4 address** (4 octets, each 0–255): the `/` is accepted as the start of a CIDR mask. The user continues typing the prefix length (0–32).
- **If the current text is NOT a valid complete IPv4 address** (e.g. partial input like `192.168`, or invalid like `999.1.1.1`): the `/` keystroke is ignored.

### 4.3 Post-Input Validation Rules

When a value is completed (via any trigger above), it is validated against these rules:

- Each octet must be in the range 0–255.
- An IPv4 address must have exactly 4 octets.
- CIDR prefix must be in the range 0–32.
- CIDR prefix must be consistent with the address (e.g. `192.168.1.0/24` is valid; `192.168.1.5/24` is flagged as unusual but accepted).

Invalid values are highlighted in the error state within the chip, with a tooltip on hover explaining the issue.

### Acceptance Criteria

- **AC-4.1:** Verify that given the IP value field is focused, when the user types a letter (e.g. `a`), then the keystroke is ignored.
- **AC-4.2:** Verify that given the IP value field is empty, when the user types a dot, then the keystroke is ignored.
- **AC-4.3:** Verify that given the IP value field ends with a dot, when the user types another dot, then the keystroke is ignored.
- **AC-4.4:** Verify that given the user enters `999.168.1.1` and completes input, then the first octet `999` is highlighted in the error state.
- **AC-4.5:** Verify that given the user enters `192.168.1` (3 octets, no CIDR) and completes input, then the value is highlighted in the error state as incomplete.
- **AC-4.6:** Verify that given the user enters `192.168.1.0/33` and completes input, then the CIDR prefix is highlighted in the error state (must be 0–32).
- **AC-4.7:** Verify that given the user enters a valid IP `44.209.156.240` and completes input, then no error state is shown.
- **AC-4.8:** Verify that given the user enters a valid CIDR `10.0.0.0/8` and completes input, then no error state is shown.
- **AC-4.9:** Verify that given the user is typing `192.168.0.1` in the value field, when the user clicks outside the chip, then the value is committed, IP validation runs, and the chip closes.
- **AC-4.10:** Verify that given the user is typing `192.168.0.1` in the value field, when the user clicks inside the chip but outside the value text, then `192.168.0.1` forms a value chip, validation runs, and the input cursor is repositioned for the next value.
- **AC-4.11:** Verify that given the user is typing `192.168.0.1` in the value field, when the user presses Space, then `192.168.0.1` forms a value chip and the input remains active for the next value.
- **AC-4.12:** Verify that given the user is typing `192.168.0.1` in the value field, when the user presses Comma, then `192.168.0.1` forms a value chip and the input remains active for the next value.
- **AC-4.13:** Verify that given the user has typed a valid complete IP `192.168.0.1`, when the user presses `/`, then the slash is accepted and the user can type a CIDR prefix.
- **AC-4.14:** Verify that given the user has typed a partial IP `192.168`, when the user presses `/`, then the keystroke is ignored.
- **AC-4.15:** Verify that given the user presses Enter, when there is text in the value field, then the value is committed, validation runs, and the chip input closes.

---

## 5. Chip Display

Once values are committed, the filter chip displays:

```
[ IP ] [ in ] [ 44.209.156.240, 192.168.0.0/24 ]
```

- The field label is `IP`.
- The operator is `in` or `not in`.
- Values are displayed comma-separated within the value segment of the chip.
- Each value is independently editable and removable.

### Acceptance Criteria

- **AC-5.1:** Verify that given an IP filter chip with multiple values, when the chip is displayed, then values are shown comma-separated in the value segment.
- **AC-5.2:** Verify that given an IP filter chip, when the user clicks the value segment, then the input field reopens with autocomplete available.
- **AC-5.3:** Verify that given an IP filter chip with values `10.0.0.1, 10.0.0.2`, when the user removes `10.0.0.1`, then only `10.0.0.2` remains in the chip.

---

## 6. URL Serialization

IP filter state is persisted in URL query parameters as the source of truth.

**Format:** `ip=in:44.209.156.240,192.168.0.0/24` or `ip=not_in:10.0.0.0/8`

### Acceptance Criteria

- **AC-6.1:** Verify that given an IP filter `IP in 44.209.156.240, 192.168.0.0/24` is applied, when the URL is inspected, then it contains `ip=in:44.209.156.240,192.168.0.0/24`.
- **AC-6.2:** Verify that given a URL containing `ip=not_in:10.0.0.0/8`, when the page loads, then the IP filter chip is rendered with operator `not in` and value `10.0.0.0/8`.
- **AC-6.3:** Verify that given a URL with an invalid IP filter parameter (e.g. `ip=in:999.999.999.999`), when the page loads, then the chip is created with the value highlighted in the error state.
