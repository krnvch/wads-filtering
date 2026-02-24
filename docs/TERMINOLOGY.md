# Terminology & Naming Conventions

Canonical glossary for the wads-filtering project. All team members and agents must use these terms consistently in specs, code comments, PRs, and discussions.

---

## UI Elements

### Filter Field

The top-level container (bar) that holds the entire filter query. Contains filter chips, connectors, brackets, and the text input.

- **Code**: `FilterBar` component
- **Synonyms to avoid**: "filter bar" (use "filter field"), "search bar"

### Filter Chip

One complete filter condition. Consists of three segments:

| Segment | Description | Example |
|---------|-------------|---------|
| **Attribute** | What you're filtering by | `Status`, `Attack Type` |
| **Operator** | Comparison type | `equals`, `does not equal`, `is any of` |
| **Value** | One or more selected values | `Blocked` or `Blocked, Monitored` |

- **Code**: `FilterChip` component, `FilterChipToken` type
- Values can be **single** (`Blocked`) or **multiple** (`Blocked, Monitored`)

### Connector

The logical operator between filter chips: **AND** or **OR**. Toggleable by clicking.

- **Code**: `ConnectorChip` component, `AndToken` / `OrToken` types

### Brackets

Grouping parentheses `(` `)` that control evaluation order of the filter query.

- **Code**: `ParenChip` component, `OpenParenToken` / `CloseParenToken` types

---

## Dropdown Menus

### Attribute Menu

Dropdown listing all available filter attributes (e.g., Status, Attack Type, Severity). Also shows recent filters at the top.

- **Code**: `FilterPalette` component

### Operator Menu

Dropdown for selecting the operator for a given attribute. Shows primary operators first, with advanced operators expandable.

- **Code**: `OperatorSelector` component

### Value Menu

Dropdown for selecting filter values. Appearance varies by attribute type:

| Attribute Type | Value Menu Style |
|---------------|-----------------|
| Enum | Checkbox list (`EnumValueSelector`) |
| Text | Free text input (`TextValueInput`) |
| Date | Date picker with presets (`DateValueSelector`) |
| Numeric | Number input with range (`NumericValueInput`) |

---

## Internal / Code Terms

These terms are used in code but may not surface in UI or user-facing docs:

| Code Term | Maps To | Notes |
|-----------|---------|-------|
| `Token` | Any element in the filter field | Union type: chip, connector, or bracket |
| `FilterChipToken` | Filter Chip | Token representing a complete condition |
| `FilterPalette` | Attribute Menu | The dropdown for selecting attributes |
| `FilterBarInput` | Text input inside Filter Field | Opens attribute menu on typing |
| `FilterGroup` | Expression tree node | Internal engine representation (not UI) |

---

## Quick Reference

```
Filter Field
├── Filter Chip  [Attribute] [Operator] [Value(s)]
├── Connector    AND / OR
├── Brackets     ( )
└── Text Input   (opens Attribute Menu on type)

Dropdown Menus
├── Attribute Menu   → select what to filter by
├── Operator Menu    → select comparison type
└── Value Menu       → select filter value(s)
```
