# Operator Naming: Cross-Product Comparison

> How 12 products label filter operators in their UI, grouped by field type.

**Date**: 2026-02-26 | **Scope**: 12 products from prior research

---

## Approach Classification

Products fall into 3 naming paradigms:


| Paradigm             | Products                                 | Style                                   |
| -------------------- | ---------------------------------------- | --------------------------------------- |
| **Natural language** | Linear, Notion, Airtable, Kibana         | `is`, `is not`, `contains`, `is before` |
| **Symbolic**         | Grafana, Jira (JQL), Vercel (monitoring) | `=`, `!=`, `>`, `IN`, `LIKE`            |
| **Query syntax**     | GitHub, Sentry, Datadog, Stripe, Gmail   | `field:value`, `-field:value`, `>`, `~` |


**Our product (WADS)** uses the **natural language** paradigm — the same as Linear, Notion, Airtable, and Kibana.

---

## Enum / Select Fields


| Concept             | Linear          | Notion                       | Airtable       | Kibana           | Jira           | Grafana | WADS (ours)     |
| ------------------- | --------------- | ---------------------------- | -------------- | ---------------- | -------------- | ------- | --------------- |
| **Equals**          | `is`            | `is`                         | `is`           | `is`             | `=`            | `=`     | `is`            |
| **Not equals**      | `is not`        | `is not`                     | `is not`       | `is not`         | `!=`           | `!=`    | `is not`        |
| **Any of (multi)**  | `is either of`  | *(multi-select: `contains`)* | `is any of`    | `is one of`      | `IN`           | `=~`    | `is any of`     |
| **None of (multi)** | `is not`        | `does not contain`           | `is none of`   | `is not one of`  | `NOT IN`       | `!~`    | `is not any of` |
| **Has value**       | *(none option)* | `is not empty`               | `is not empty` | `exists`         | `IS NOT EMPTY` | --      | `is set`        |
| **No value**        | *(none option)* | `is empty`                   | `is empty`     | `does not exist` | `IS EMPTфыY`   | --      | `is not set`    |


**Key divergence**: Multi-value naming — `is either of` (Linear) vs `is any of` (Airtable) vs `is one of` (Kibana). No industry standard.

---

## Text / String Fields


| Concept              | Notion             | Airtable           | Kibana (KQL)     | Sentry          | Jira           | Vercel       | WADS (ours)        |
| -------------------- | ------------------ | ------------------ | ---------------- | --------------- | -------------- | ------------ | ------------------ |
| **Equals**           | `is`               | `is`               | `field: "value"` | `field:value`   | `=`            | `=`          | `is`               |
| **Not equals**       | `is not`           | `is not`           | `NOT field:`     | `!field:value`  | `!=`           | `!=`         | `is not`           |
| **Contains**         | `contains`         | `contains`         | `field: *text`*  | `field:*text`*  | `~`            | `like`       | `contains`         |
| **Does not contain** | `does not contain` | `does not contain` | `NOT field:`     | `!field:*text`* | `!~`           | `not like`   | `does not contain` |
| **Starts with**      | `starts with`      | --                 | `field: text`*   | --              | --             | `startsWith` | `starts with`      |
| **Ends with**        | `ends with`        | --                 | `field: *text`   | --              | --             | --           | `ends with`        |
| **Has value**        | `is not empty`     | `is not empty`     | `field:` *       | `has:field`     | `IS NOT EMPTY` | --           | `is set`           |
| **No value**         | `is empty`         | `is empty`         | --               | `!has:field`    | `IS EMPTY`     | --           | `is not set`       |


**Notable**: `contains` is universal across natural-language UIs. Only Jira uses `~` symbol for it.

---

## Date / Time Fields


| Concept                 | Linear           | Notion                    | Airtable          | Kibana           | Jira                 | GitHub       | Gmail           | WADS (ours)       |
| ----------------------- | ---------------- | ------------------------- | ----------------- | ---------------- | -------------------- | ------------ | --------------- | ----------------- |
| **Relative past**       | --               | `past week`, `past month` | `is within`       | --               | `>= startOfDay(-7d)` | `>@today-7d` | `newer_than:7d` | `in the last`     |
| **Relative past (neg)** | --               | --                        | --                | --               | --                   | --           | `older_than:7d` | `not in the last` |
| **Before**              | `before`         | `is before`               | `is before`       | *(via range)*    | `<`                  | `<date`      | `before:`       | `before`          |
| **After**               | `after`          | `is after`                | `is after`        | *(via range)*    | `>`                  | `>date`      | `after:`        | `after`           |
| **On**                  | --               | `is`                      | `is`              | `is`             | `=`                  | --           | --              | `on`              |
| **Not on**              | --               | --                        | `is not`          | `is not`         | `!=`                 | --           | --              | `not on`          |
| **On or before**        | --               | `is on or before`         | `is on or before` | --               | `<=`                 | `<=date`     | --              | --                |
| **On or after**         | --               | `is on or after`          | `is on or after`  | --               | `>=`                 | `>=date`     | --              | --                |
| **Between**             | *(before+after)* | --                        | *(before+after)*  | `is between`     | *(combine)*          | `d1..d2`     | *(combine)*     | `between dates`   |
| **Has value**           | --               | `is not empty`            | `is not empty`    | `exists`         | `IS NOT EMPTY`       | --           | --              | `is set`          |
| **No value**            | --               | `is empty`                | `is empty`        | `does not exist` | `IS EMPTY`           | --           | --              | `is not set`      |


**Key patterns**:

- Notion/Airtable use `is before` / `is after` (with "is" prefix); Linear just uses `before` / `after` (shorter)
- Relative time is the most inconsistent: `in the last`, `past week`, `is within`, `newer_than`, `>@today-7d` — every product invents its own
- `on or before` / `on or after` (Notion, Airtable) is uncommon — most products just use `before` / `after` with inclusive semantics or `<=` / `>=`

---

## Numeric Fields


| Concept              | Notion         | Airtable       | Kibana           | Jira           | Grafana | GitHub   | WADS (ours)             |
| -------------------- | -------------- | -------------- | ---------------- | -------------- | ------- | -------- | ----------------------- |
| **Equals**           | `=`            | `=`            | `is`             | `=`            | `=`     | `:value` | `equals`                |
| **Not equals**       | `!=`           | `!=`           | `is not`         | `!=`           | `!=`    | --       | `not equals`            |
| **Greater than**     | `>`            | `>`            | --               | `>`            | `>`     | `>`      | `greater than`          |
| **Less than**        | `<`            | `<`            | --               | `<`            | `<`     | `<`      | `less than`             |
| **Greater or equal** | `>=`           | `>=`           | --               | `>=`           | --      | `>=`     | `greater than or equal` |
| **Less or equal**    | `<=`           | `<=`           | --               | `<=`           | --      | `<=`     | `less than or equal`    |
| **Between**          | --             | --             | `is between`     | *(combine)*    | --      | `n..m`   | `in between`            |
| **Has value**        | `is not empty` | `is not empty` | `exists`         | `IS NOT EMPTY` | --      | --       | `is set`                |
| **No value**         | `is empty`     | `is empty`     | `does not exist` | `IS EMPTY`     | --      | --       | `is not set`            |


**Key split**: Natural-language UIs are divided:

- **Notion, Airtable** use symbols even in dropdown UIs: `=`, `!=`, `>`, `<`, `>=`, `<=`
- **Kibana** uses words: `is`, `is not`, `is between`
- **WADS** uses words: `equals`, `greater than`, etc.

---

## Boolean Connectors


| Concept      | Linear           | Notion          | Airtable        | Kibana   | Jira  | GitHub        | Sentry           | WADS (ours)                |
| ------------ | ---------------- | --------------- | --------------- | -------- | ----- | ------------- | ---------------- | -------------------------- |
| **AND**      | `all filters`    | `and`           | `and`           | implicit | `AND` | `AND` / space | implicit / `AND` | `AND` chip                 |
| **OR**       | `any filter`     | `or`            | `or`            | `OR`     | `OR`  | `OR`          | `OR`             | `OR` chip                  |
| **NOT**      | *(via `is not`)* | --              | --              | `NOT`    | `NOT` | `NOT` / `-`   | `-` / `!`        | *(via negation operators)* |
| **Grouping** | nested groups    | advanced filter | advanced filter | --       | `( )` | `( )`         | `( )`            | `( )` parens               |


---

## Existence / Empty State

Three naming schools across all products:


| Style                     | Products               | Has value      | No value                  |
| ------------------------- | ---------------------- | -------------- | ------------------------- |
| **empty/not empty**       | Notion, Airtable, Jira | `is not empty` | `is empty`                |
| **exists/does not exist** | Kibana                 | `exists`       | `does not exist`          |
| **set/not set**           | WADS                   | `is set`       | `is not set`              |
| **has/no**                | GitHub, Sentry         | `has:field`    | `no:field` / `!has:field` |
| **null**                  | Stripe                 | --             | `:null`                   |


---

## Summary: Where WADS Aligns & Diverges


| Area              | WADS Choice                            | Closest to                            | Diverges from                                   |
| ----------------- | -------------------------------------- | ------------------------------------- | ----------------------------------------------- |
| Enum equality     | `is` / `is not`                        | Linear, Notion, Airtable, Kibana      | -- (universal)                                  |
| Multi-value       | `is any of` / `is not any of`          | Airtable (`is any of` / `is none of`) | Linear (`is either of`), Kibana (`is one of`)   |
| Text contains     | `contains` / `does not contain`        | Notion, Airtable                      | -- (universal)                                  |
| Text starts/ends  | `starts with` / `ends with`            | Notion                                | Airtable (absent)                               |
| Date relative     | `in the last` / `not in the last`      | Unique phrasing                       | Notion (`past week`), Airtable (`is within`)    |
| Date before/after | `before` / `after`                     | Linear                                | Notion/Airtable (`is before` / `is after`)      |
| Numeric           | `equals`, `greater than`, etc. (words) | Kibana (words)                        | Notion/Airtable (symbols: `=`, `>`)             |
| Existence         | `is set` / `is not set`                | -- (uncommon phrasing)                | Notion/Airtable (`is empty`), Kibana (`exists`) |


### Potential Review Points

1. **Multi-value negation**: We use `is not any of`. Airtable uses `is none of`. Kibana uses `is not one of`. Consider if `is none of` reads more naturally.
2. **Numeric operators**: We use full words (`greater than`). Most products (even natural-language ones like Notion/Airtable) use symbols (`>`, `>=`). Consider if symbols would be more scannable.
3. **Existence**: We use `is set` / `is not set`. The dominant pattern is `is empty` / `is not empty` (Notion, Airtable, Jira). Consider alignment.
4. **Date relative**: `in the last` is unique to us. Other products use varied phrasing. This is fine — no standard exists here.
5. **Date before/after**: Linear-style (`before`/`after`) vs Notion/Airtable-style (`is before`/`is after`). Both valid; shorter is arguably better.

