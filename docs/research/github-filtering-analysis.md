# GitHub Issue Filtering System -- UX Research Analysis

**Researcher**: Principal UX Researcher & Product Designer
**Date**: 2026-02-19
**Subject**: Comprehensive analysis of GitHub's issue/PR filtering system
**Scope**: UI components, query syntax, interaction patterns, URL state, accessibility

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Filter UI Components & Architecture](#2-filter-ui-components--architecture)
3. [Query Language & Syntax](#3-query-language--syntax)
4. [Filter Categories (Dimensions)](#4-filter-categories-dimensions)
5. [Operators & Range Queries](#5-operators--range-queries)
6. [Boolean Logic (AND/OR/NOT)](#6-boolean-logic-andornot)
7. [Negation & Exclusion](#7-negation--exclusion)
8. [Saved Searches](#8-saved-searches)
9. [Keyboard Interactions](#9-keyboard-interactions)
10. [URL State Encoding](#10-url-state-encoding)
11. [Progressive Disclosure](#11-progressive-disclosure)
12. [Autocomplete & Suggestions](#12-autocomplete--suggestions)
13. [Visual Design of Active Filters](#13-visual-design-of-active-filters)
14. [Sort Integration](#14-sort-integration)
15. [Label System](#15-label-system)
16. [Milestone & Project Filtering](#16-milestone--project-filtering)
17. [Pre-built Filters](#17-pre-built-filters)
18. [Cross-Repository Search](#18-cross-repository-search)
19. [Filter Counts](#19-filter-counts)
20. [Date & Time Filtering](#20-date--time-filtering)
21. [Key Design Decisions & Takeaways](#21-key-design-decisions--takeaways)

---

## 1. Executive Summary

GitHub's issue filtering system is a **dual-mode interface** that combines:

1. **Visual filter controls** -- dropdown menus, clickable labels, and state toggle tabs for quick, discoverable filtering.
2. **Text-based query language** -- a powerful, qualifier-based search syntax in a search bar, supporting boolean logic, nested grouping, and dozens of qualifiers.

The system underwent a significant evolution in **January 2025** with the "Advanced Search for Issues" feature, adding boolean operators (`AND`, `OR`), parenthetical nesting (up to 5 levels), and inline validation. The system uses **URL query parameters** as the source of truth, making filters shareable and bookmarkable. GitHub's approach prioritizes **power users** with its text syntax while offering **progressive disclosure** through visual controls for common operations.

---

## 2. Filter UI Components & Architecture

### 2.1 Component Inventory

GitHub's issues list page contains the following filter-related UI elements:

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| **Search bar** | Text input | Top of issues list | Free-text query entry with qualifier syntax |
| **"Filters" dropdown** | Dropdown menu | Left of search bar | Pre-built quick filters |
| **"Open" / "Closed" tabs** | Toggle tabs with counts | Above issue list | State-based filtering with result counts |
| **Label dropdown** | Multi-select dropdown | Toolbar row | Filter by one or more labels |
| **Assignee dropdown** | Single/multi-select dropdown | Toolbar row | Filter by assignee |
| **Author dropdown ("U")** | Dropdown | Accessible via keyboard | Filter by issue author |
| **Milestone dropdown ("M")** | Dropdown | Toolbar row | Filter by milestone |
| **Types dropdown** | Dropdown | Toolbar row | Filter by issue type (when org uses custom types) |
| **Reviews dropdown** | Dropdown (PRs only) | Toolbar row | Filter by review status |
| **Sort dropdown** | Dropdown | Right side of toolbar | Choose sort field and direction |
| **"Clear current search" link** | Text link / button | Near search bar | Reset all filters, sorts, and queries |

### 2.2 Layout Structure

```
+------------------------------------------------------------------+
|  [Filters v]  [ is:issue is:open _________________________ ]     |
+------------------------------------------------------------------+
|  [o] 1,234 Open    [x] 5,678 Closed                              |
+------------------------------------------------------------------+
|  [Author v]  [Label v]  [Assignee v]  [Milestone v]  [Sort v]    |
+------------------------------------------------------------------+
|  Issue list rows...                                               |
+------------------------------------------------------------------+
```

**Key observations:**
- The search bar is the dominant filtering element, pre-populated with `is:issue is:open` as the default query.
- Dropdown filters are **secondary** controls -- selecting a value from a dropdown appends a qualifier to the search bar text.
- Open/Closed tabs are **stateful toggles** that modify the `state:` qualifier in the search bar.
- The Filters dropdown on the far left provides pre-built query shortcuts.

### 2.3 Interaction Model

The visual dropdown controls and the text-based search bar are **bidirectionally synced**:
- Selecting "octocat" from the Assignee dropdown appends `assignee:octocat` to the search bar.
- Manually typing `assignee:octocat` in the search bar reflects in the dropdown state.
- Clearing the search bar resets all dropdown selections.

This is a critical design pattern: **one source of truth (the query string in the search bar), multiple input methods**.

---

## 3. Query Language & Syntax

GitHub uses a **qualifier:value** syntax. Qualifiers are colon-separated key-value pairs. Free text (without a qualifier prefix) searches issue titles, bodies, and comments.

### 3.1 Complete Qualifier Reference

#### Type & State Qualifiers

| Qualifier | Values | Description | Example |
|-----------|--------|-------------|---------|
| `is:` | `issue`, `pr` | Filter by item type | `is:issue` |
| `is:` | `open`, `closed` | Filter by state | `is:open` |
| `is:` | `merged`, `unmerged` | PR merge status | `is:merged` |
| `is:` | `draft` | Draft PRs | `is:draft` |
| `is:` | `public`, `private` | Repository visibility | `is:public` |
| `is:` | `locked`, `unlocked` | Conversation lock status | `is:locked` |
| `is:` | `queued` | PR in merge queue | `is:queued` |
| `state:` | `open`, `closed` | Explicit state filter | `state:open` |
| `type:` | Custom issue types | Organization-defined types | `type:Bug` |
| `draft:` | `true`, `false` | PR draft status | `draft:true` |
| `reason:` | `completed`, `"not planned"` | Closure reason | `reason:completed` |

#### People Qualifiers

| Qualifier | Values | Description | Example |
|-----------|--------|-------------|---------|
| `author:` | username, `@me`, `app/NAME` | Issue/PR creator | `author:octocat` |
| `assignee:` | username, `@me`, `*` | Assigned person | `assignee:@me` |
| `mentions:` | username | Mentioned user | `mentions:defunkt` |
| `commenter:` | username | Comment author | `commenter:octocat` |
| `involves:` | username | Any involvement | `involves:defunkt` |
| `team:` | `ORGNAME/TEAMNAME` | Team mentions | `team:github/support` |
| `reviewed-by:` | username | PR reviewer | `reviewed-by:octocat` |
| `review-requested:` | username | Review requested | `review-requested:octocat` |
| `user-review-requested:` | `@me` | Direct review request | `user-review-requested:@me` |
| `team-review-requested:` | team name | Team review request | `team-review-requested:atom/design` |

**Special values:**
- `@me` -- current authenticated user (works with most people qualifiers)
- `@copilot` -- GitHub Copilot (for `reviewed-by:` and `assignee:`)
- `*` -- wildcard "has any" (e.g., `assignee:*` means "assigned to anyone"; single-repo only)

#### Label & Metadata Qualifiers

| Qualifier | Values | Description | Example |
|-----------|--------|-------------|---------|
| `label:` | label name (quoted if spaces) | Filter by label | `label:bug` |
| `milestone:` | milestone name | Filter by milestone | `milestone:"v1.0"` |
| `project:` | project number | Filter by project | `project:5` |

#### Content & Scope Qualifiers

| Qualifier | Values | Description | Example |
|-----------|--------|-------------|---------|
| `in:` | `title`, `body`, `comments` | Search scope | `error in:title` |
| `repo:` | `owner/name` | Specific repository | `repo:octocat/hello` |
| `user:` | username | User's repositories | `user:defunkt` |
| `org:` | org name | Organization repos | `org:github` |

#### Existence / Missing Metadata Qualifiers

| Qualifier | Values | Description | Example |
|-----------|--------|-------------|---------|
| `has:` | various | Has a value for field | `has:label` |
| `no:` | `label`, `milestone`, `assignee`, `project` | Missing metadata | `no:label` |
| `linked:` | `pr`, `issue` | Has closing reference link | `linked:pr` |

**Important constraint**: The `no:` qualifier **cannot** be combined with the hyphen negation prefix. You cannot write `-no:label`.

#### Quantitative Qualifiers

| Qualifier | Description | Example |
|-----------|-------------|---------|
| `comments:` | Number of comments | `comments:>10` |
| `interactions:` | Comments + reactions combined | `interactions:>100` |
| `reactions:` | Number of reactions | `reactions:>50` |

#### Review Status Qualifiers (PRs Only)

| Qualifier | Values | Description |
|-----------|--------|-------------|
| `review:` | `none` | No reviews |
| `review:` | `required` | Review required before merge |
| `review:` | `approved` | Approved by reviewer |
| `review:` | `changes_requested` | Changes requested |

#### Commit & Branch Qualifiers (PRs Only)

| Qualifier | Values | Description | Example |
|-----------|--------|-------------|---------|
| `head:` | branch name | Source branch | `head:feature-x` |
| `base:` | branch name | Target branch | `base:main` |
| `status:` | `pending`, `success`, `failure` | CI status | `status:success` |
| `language:` | language name | Repository language | `language:javascript` |
| SHA | 7+ char commit SHA | By commit reference | `e1109ab` |

#### Archive Status

| Qualifier | Values | Description | Example |
|-----------|--------|-------------|---------|
| `archived:` | `true`, `false` | Repository archive status | `archived:false` |

#### Date Qualifiers

| Qualifier | Description | Example |
|-----------|-------------|---------|
| `created:` | Creation date | `created:>2025-01-01` |
| `updated:` | Last update date | `updated:>=2025-06-15` |
| `closed:` | Close date | `closed:2025-01-01..2025-06-30` |
| `merged:` | Merge date (PRs) | `merged:<2025-03-01` |

---

## 4. Filter Categories (Dimensions)

GitHub organizes filtering across these dimensions:

| Dimension | Visual Control | Query Qualifier(s) |
|-----------|---------------|-------------------|
| **State** | Open/Closed tabs | `is:open`, `is:closed`, `state:` |
| **Type** | Types dropdown | `is:issue`, `is:pr`, `type:` |
| **Author** | Author dropdown (U key) | `author:` |
| **Assignee** | Assignee dropdown (A key) | `assignee:` |
| **Label** | Label dropdown (L key) | `label:` |
| **Milestone** | Milestone dropdown (M key) | `milestone:` |
| **Project** | (query only) | `project:` |
| **Review status** | Reviews dropdown (PRs) | `review:`, `reviewed-by:` |
| **Sort** | Sort dropdown | `sort:` qualifier |
| **Date** | (query only) | `created:`, `updated:`, `closed:`, `merged:` |
| **Content scope** | (query only) | `in:title`, `in:body`, `in:comments` |
| **Involvement** | (query only) | `involves:`, `mentions:`, `commenter:` |
| **Metadata existence** | (query only) | `has:`, `no:`, `linked:` |
| **Quantitative** | (query only) | `comments:`, `reactions:`, `interactions:` |
| **Repository scope** | (query only, cross-repo) | `repo:`, `user:`, `org:` |
| **CI status** | (query only, PRs) | `status:` |
| **Closure reason** | (query only) | `reason:` |
| **Draft status** | (query only, PRs) | `draft:`, `is:draft` |

**Design insight**: Only ~6 of the ~17 filter dimensions have dedicated visual controls. The rest are **text-query-only**, accessible to power users who know the syntax. This is a deliberate progressive disclosure strategy.

---

## 5. Operators & Range Queries

### 5.1 Comparison Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `>` | Greater than | `comments:>10` |
| `>=` | Greater than or equal | `reactions:>=50` |
| `<` | Less than | `comments:<5` |
| `<=` | Less than or equal | `interactions:<=100` |

### 5.2 Range Queries

| Syntax | Meaning | Example |
|--------|---------|---------|
| `n..m` | Between n and m (inclusive) | `comments:10..50` |
| `n..*` | n or more (equivalent to `>=n`) | `reactions:10..*` |
| `*..n` | n or fewer (equivalent to `<=n`) | `comments:*..5` |

### 5.3 Date Ranges

Date ranges use the same `..` syntax with ISO 8601 dates:

```
created:2025-01-01..2025-06-30
updated:2025-03-01..2025-03-31
```

### 5.4 Text Matching

| Syntax | Meaning | Example |
|--------|---------|---------|
| Bare word | Fuzzy match in title/body/comments | `error` |
| `"quoted phrase"` | Exact phrase match | `"null pointer"` |
| Qualifier with quotes | Multi-word qualifier values | `label:"help wanted"` |

---

## 6. Boolean Logic (AND/OR/NOT)

### 6.1 Implicit AND

Space-separated qualifiers are combined with **implicit AND**:

```
is:issue is:open label:bug assignee:@me
```
This means: items that are issues AND are open AND have the "bug" label AND are assigned to me.

### 6.2 Explicit AND

The `AND` keyword can be used explicitly (case-sensitive, must be uppercase):

```
is:issue AND label:bug AND assignee:@me
```

### 6.3 OR Operator

The `OR` keyword creates alternative matches:

```
label:bug OR label:enhancement
```
Returns issues with EITHER the "bug" label OR the "enhancement" label.

### 6.4 NOT Operator

The `NOT` keyword excludes results matching a keyword (string terms only, not qualifiers):

```
hello NOT world
```
Returns items containing "hello" but not "world".

**Limitation**: `NOT` only works with freetext string keywords. For qualifier negation, use the `-` prefix (see Section 7).

### 6.5 Parenthetical Grouping (Nested Queries)

As of the Advanced Search update (2025), queries support **parentheses for grouping**, up to 5 levels deep:

```
is:issue AND (type:Bug OR label:priority-high)
```

```
is:issue AND created:>@today-1w AND ((type:Bug OR type:Task) OR (author:@me AND label:priority-medium))
```

**Limitations**:
- Maximum 5 levels of nesting.
- `repo`, `org`, and `user` qualifiers cannot be used inside nested groups (they operate as implicit OR when space-separated).

### 6.6 Label-Specific Boolean

Labels have a special **comma syntax** for OR logic within a single qualifier:

```
label:"bug","wip"           # OR: issues with bug OR wip label
label:"bug" label:"wip"     # AND: issues with BOTH bug AND wip labels
```

This is notable because it is the only qualifier that supports intra-qualifier OR via comma separation.

---

## 7. Negation & Exclusion

### 7.1 Hyphen Prefix Negation

Prefix any qualifier with `-` to exclude matching results:

```
-label:bug                    # Exclude issues with the "bug" label
-author:octocat               # Exclude issues by octocat
-assignee:@me                 # Exclude issues assigned to me
-language:javascript          # Exclude JavaScript repos
-linked:pr                    # Issues NOT linked to a PR
-milestone:"v2.0"             # Exclude issues in milestone v2.0
-is:draft                     # Exclude draft PRs
```

### 7.2 Alt+Click Label Exclusion

On the issues list page, **Alt+clicking** a label in the Labels dropdown excludes that label (applies `-label:NAME` to the search bar). This is a notable micro-interaction for power users.

### 7.3 Constraints

- The `no:` qualifier **cannot** be negated with `-`. Writing `-no:label` is invalid.
- The `NOT` keyword only works with freetext strings, not with qualifier expressions.

---

## 8. Saved Searches

### 8.1 Current State

GitHub's native "saved search" support is **limited**:

- **Global code search** has a saved searches feature where named queries appear as suggestions in the search field.
- **GitHub Projects** support "custom views" which can persist filter queries. These views can be named, saved, and shared within a project.
- **Issues list pages** do NOT have a native "save this filter" feature. The community has long requested this (multiple discussion threads from 2022-2025).

### 8.2 Workarounds

Since filters are fully encoded in the URL (see Section 10), users commonly:
1. **Bookmark the URL** in their browser.
2. **Share URLs** directly with teammates.
3. Use **GitHub Projects custom views** as a proxy for saved issue filters.
4. Use third-party browser extensions like Refined GitHub for enhanced saved filter support.

### 8.3 User Pain Point

This is a well-documented gap. Community feedback threads (e.g., Discussion #47220, Discussion #13630) show strong demand for:
- Named saved searches on issue list pages
- Quick access to frequently-used filter combinations
- Team-shared saved filters

---

## 9. Keyboard Interactions

### 9.1 Issues List Page Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+/` (Mac) / `Ctrl+/` (Win/Linux) | Focus the issues search bar |
| `S` or `/` | Focus the global search bar |
| `C` | Create a new issue |
| `U` | Filter by author (opens author dropdown) |
| `L` | Filter by or edit labels (opens label dropdown) |
| `A` | Filter by or edit assignee (opens assignee dropdown) |
| `M` | Filter by or edit milestones (opens milestone dropdown) |
| `O` or `Enter` | Open selected issue |
| `Alt + click` (on label) | Exclude label (adds `-label:NAME`) |

### 9.2 Issue Detail Page Shortcuts

| Shortcut | Action |
|----------|--------|
| `L` | Apply a label |
| `A` | Set an assignee |
| `M` | Set a milestone |
| `Q` | Request a reviewer |
| `X` | Link an issue or PR from same repo |
| `Alt+Shift+C` | Create a new sub-issue |
| `Alt+Shift+A` | Add an existing issue as sub-issue |
| `Alt+Shift+P` | Edit parent issue |

### 9.3 Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `I` | Go to Issues tab |
| `G` then `P` | Go to Pull Requests tab |
| `G` then `N` | Go to Notifications |
| `G` then `C` | Go to Code tab |

**Design insight**: GitHub uses single-letter shortcuts (L, A, M, U) on the issues list page that serve a dual purpose -- they open the relevant filter dropdown AND can be used to edit metadata on selected issues. This is an efficient design that reduces the number of shortcuts to remember.

---

## 10. URL State Encoding

### 10.1 URL Structure

Filters are encoded in the URL using a `q=` query parameter:

```
https://github.com/owner/repo/issues?q=state:open+is:issue+assignee:hubot+sort:created-asc
```

### 10.2 Encoding Rules

| Element | URL Encoding |
|---------|-------------|
| Spaces between qualifiers | Encoded as `+` |
| Quoted values with spaces | URL-encoded quotes and spaces |
| Special characters | Standard percent-encoding |
| Colons in qualifiers | Kept as-is (`:`) |
| Sort parameters | Appended as `sort:FIELD-DIRECTION` |

### 10.3 Example URL Patterns

```
# Default view (all open issues)
/issues?q=is:open+is:issue

# Filtered by label and assignee
/issues?q=is:open+is:issue+label:bug+assignee:octocat

# With sort
/issues?q=is:open+is:issue+assignee:hubot+sort:created-asc

# Complex boolean query
/issues?q=is:issue+AND+(type:Bug+OR+label:priority-high)

# Cross-repo search
/search?q=is:issue+state:open+org:github&type=issues
```

### 10.4 Design Implications

- **Shareability**: Any filtered view can be shared by copying the URL.
- **Bookmarkability**: Users can save filtered views as browser bookmarks.
- **Deep linking**: Documentation and bots can link directly to filtered views.
- **State restoration**: Navigating back restores the exact filter state.
- **Source of truth**: The URL is the canonical representation of the current filter state; all UI controls derive from it.

---

## 11. Progressive Disclosure

GitHub implements a **three-tier progressive disclosure** model:

### Tier 1: Visual Controls (Beginner)

The dropdown buttons (Label, Assignee, Milestone, Sort, Filters) are immediately visible and require no knowledge of query syntax. Users click a dropdown and select from a list. The selected value is automatically converted to a query qualifier in the search bar.

### Tier 2: Search Bar with Autocomplete (Intermediate)

Users who notice the search bar can type qualifiers directly. GitHub provides:
- **Qualifier suggestions** as the user types (showing available qualifiers like `label:`, `assignee:`, etc.)
- **Value suggestions** after typing a qualifier prefix (e.g., typing `label:` shows available label names)
- **Validation warnings** for malformed queries (red highlighting for invalid syntax)

### Tier 3: Advanced Query Syntax (Power User)

Power users can write complex boolean queries with:
- `AND` / `OR` operators
- Parenthetical grouping (up to 5 levels)
- Negation with `-` prefix
- Date ranges, comment counts, reaction counts
- Cross-repository scoping with `repo:`, `user:`, `org:`

### Design Insight

This three-tier approach is notable because:
1. **Tier 1 modifies Tier 2**: Clicking a dropdown updates the text in the search bar, teaching users the syntax over time.
2. **Tier 2 enables Tier 3 discovery**: Autocomplete reveals available qualifiers.
3. **All tiers share one source of truth**: The search bar text (and by extension, the URL `q=` parameter).

This means there is **no separate "advanced search" modal or page** -- it is all inline in the same search bar. The advanced search feature (2025) did not add a new UI surface; it enhanced the existing search bar with boolean operator support.

---

## 12. Autocomplete & Suggestions

### 12.1 Behavior

When typing in the search bar, GitHub provides:

1. **Qualifier name completion**: After typing a few characters, matching qualifiers are suggested.
   - Typing `lab` suggests `label:`
   - Typing `ass` suggests `assignee:`

2. **Value completion**: After typing a qualifier and `:`, available values are suggested.
   - `label:` shows a list of repository labels
   - `assignee:` shows a list of repository members with write access
   - `milestone:` shows available milestones

3. **Syntax validation**: Invalid qualifiers or malformed queries are highlighted in red.

4. **Warning messages**: The search bar warns when there is a problem with the filter syntax.

### 12.2 What Gets Autocompleted

| Qualifier | Autocomplete Values |
|-----------|-------------------|
| `label:` | Repository label names |
| `assignee:` | Repository members with write access |
| `author:` | Users (from recent activity in repo) |
| `milestone:` | Repository milestones |
| `type:` | Organization-defined issue types |
| `review:` | Enumerated review states |
| `is:` | Enumerated state/type values |
| `sort:` | Available sort fields |

### 12.3 Design Insight

Autocomplete serves dual purposes:
- **Discoverability**: Users learn available qualifiers and their valid values.
- **Error prevention**: Reduces typos in label names, usernames, and qualifier syntax.

---

## 13. Visual Design of Active Filters

### 13.1 Open/Closed State Tabs

The most prominent visual filter indicator is the **Open/Closed tab pair** at the top of the issue list:

```
[ (icon) 1,234 Open ]   [ (icon) 5,678 Closed ]
```

- The active tab is **visually emphasized** (bold or color-highlighted).
- Each tab shows the **count** of matching items.
- Clicking a tab toggles the `state:` qualifier in the search bar.

### 13.2 Search Bar as Active Filter Display

Active filters are displayed **as text in the search bar**. The search bar typically shows:

```
is:issue is:open label:bug assignee:octocat
```

This is GitHub's primary mechanism for showing active filters. There are **no separate filter pills or chips** displayed below the search bar in the traditional issues view. The search bar text IS the filter state display.

### 13.3 Dropdown State Indicators

When a dropdown filter (Label, Assignee, etc.) has active selections, the dropdown button may show a visual indicator, but the primary feedback is in the search bar text.

### 13.4 Clear All

A "Clear current search query, filters, and sorts" action is available to reset the view to the default state (`is:issue is:open`).

### 13.5 Design Insight

GitHub's approach of using **the search bar text as the filter state display** is unusual compared to many SaaS applications that show filter chips/pills. This has trade-offs:

**Advantages:**
- Single source of truth is always visible.
- Power users can read and edit the query directly.
- No desynchronization between visual pills and text query.

**Disadvantages:**
- Less scannable than discrete filter pills for non-power-users.
- No individual "x" buttons to remove single filter criteria (must edit text or use dropdowns).
- Can be intimidating for new users seeing qualifier syntax for the first time.

---

## 14. Sort Integration

### 14.1 Visual Sort Control

A **Sort dropdown** in the toolbar offers these options:

| Sort Option | Query Syntax |
|-------------|-------------|
| Newest | `sort:created-desc` (default) |
| Oldest | `sort:created-asc` |
| Most commented | `sort:comments-desc` |
| Least commented | `sort:comments-asc` |
| Recently updated | `sort:updated-desc` |
| Least recently updated | `sort:updated-asc` |
| Most reactions | `sort:reactions-desc` |

### 14.2 Full Sort Qualifier Syntax

The `sort:` qualifier supports these fields and directions:

| Sort Field | Ascending | Descending (default) |
|-----------|-----------|---------------------|
| `sort:created` | `sort:created-asc` | `sort:created-desc` |
| `sort:updated` | `sort:updated-asc` | `sort:updated-desc` |
| `sort:comments` | `sort:comments-asc` | `sort:comments-desc` |
| `sort:reactions` | `sort:reactions-asc` | `sort:reactions-desc` |
| `sort:interactions` | `sort:interactions-asc` | `sort:interactions-desc` |
| `sort:relevance` | -- | `sort:relevance-desc` |
| `sort:author-date` | `sort:author-date-asc` | `sort:author-date-desc` |
| `sort:committer-date` | `sort:committer-date-asc` | `sort:committer-date-desc` |

### 14.3 Reaction-Specific Sorting

Sort by specific reaction emoji types:

```
sort:reactions-+1-desc      # Most thumbs up
sort:reactions--1-desc      # Most thumbs down
sort:reactions-smile-desc   # Most smile reactions
sort:reactions-tada-desc    # Most tada reactions
sort:reactions-heart-desc   # Most heart reactions
sort:reactions-thinking_face-desc
sort:reactions-rocket-desc
sort:reactions-eyes-desc
```

### 14.4 Sort-Filter Interaction

- Sort is treated as just another qualifier in the search bar (`sort:FIELD-DIR`).
- Sort persists in the URL alongside filter qualifiers.
- Changing sort via the dropdown updates the `sort:` qualifier in the search bar.
- Sort and filter are fully orthogonal -- any sort can be combined with any filter.
- **Code search does NOT support sorting** (limitation noted in docs).

---

## 15. Label System

### 15.1 Label Properties

Each label in GitHub has:
- **Name**: Text string (e.g., "bug", "help wanted", "priority: high")
- **Color**: Hex color code displayed as a colored dot/pill next to the label name
- **Description**: Optional description text

### 15.2 Label Filtering UI

- **Label dropdown button**: Opens a dropdown with a searchable list of all repository labels.
- **Color indicators**: Each label in the dropdown is shown with its color dot.
- **Multi-select**: Users can select multiple labels from the dropdown.
- **Click on label pill in issue list**: Clicking a label pill on an issue in the list filters by that label.

### 15.3 Label Filter Query Syntax

```
label:bug                          # Single label
label:"help wanted"                # Label with spaces (must quote)
label:"bug","enhancement"          # OR: either label
label:bug label:enhancement        # AND: both labels
-label:bug                         # NOT: exclude label
-label:"wont fix"                  # Exclude label with spaces
```

### 15.4 Label with Alt+Click

**Alt+clicking** a label in the filter dropdown applies exclusion (`-label:NAME`).

### 15.5 Existence Check

```
has:label        # Issues that have at least one label
no:label         # Issues with no labels at all
```

### 15.6 Design Insight

The **comma-separated OR syntax** (`label:"bug","wip"`) is unique to labels and is a significant design decision. It acknowledges that label-based OR filtering is the most common multi-value filter use case. No other qualifier supports this comma syntax -- other OR operations require the explicit `OR` keyword.

---

## 16. Milestone & Project Filtering

### 16.1 Milestone Filtering

```
milestone:"Sprint 5"             # Issues in a specific milestone
milestone:*                       # Issues in any milestone (not documented for all contexts)
no:milestone                      # Issues with no milestone
-milestone:"Sprint 5"             # Exclude a specific milestone
```

**UI**: A dedicated Milestone dropdown (accessible via `M` keyboard shortcut) lists all repository milestones. Selecting one appends the `milestone:` qualifier to the search bar.

### 16.2 Project Filtering

```
project:5                        # Issues in project number 5
no:project                        # Issues not in any project
```

**Note**: Project filtering in the issues list uses project numbers. GitHub Projects (the new project management feature) has its own separate filtering system.

### 16.3 GitHub Projects Filtering (Separate System)

Within GitHub Projects views, a more advanced field-based filtering syntax is available:

```
status:"In Progress"              # Custom status field
iteration:@current                # Current iteration
iteration:@previous               # Previous iteration
iteration:@next                   # Next iteration
iteration:>"Iteration 4"         # After a specific iteration
assignee:@me status:todo          # Compound filter
field:"Custom Field" value        # Custom fields
```

**Key differences from Issues list filtering**:
- Projects use `field:value` syntax for custom fields.
- Projects support `@current`, `@previous`, `@next` keywords for iterations.
- Projects have separate filter persistence via saved views.
- As of 2025, Projects filtering does **not** support the advanced boolean `AND`/`OR` syntax available on Issues pages. Multiple filters in Projects act as implicit AND only.

---

## 17. Pre-built Filters

### 17.1 "Filters" Dropdown Options

The "Filters" dropdown menu on the issues list page provides these pre-built shortcuts:

| Pre-built Filter | Generated Query |
|-----------------|----------------|
| Open issues | `is:open is:issue` |
| Your issues | `is:open is:issue author:@me` |
| Everything assigned to you | `is:open is:issue assignee:@me` |
| Everything mentioning you | `is:open is:issue mentions:@me` |

### 17.2 PR-Specific Pre-built Filters

For pull requests, additional pre-built filters include:

| Pre-built Filter | Generated Query |
|-----------------|----------------|
| Open pull requests | `is:open is:pr` |
| Your pull requests | `is:open is:pr author:@me` |
| Everything assigned to you | `is:open is:pr assignee:@me` |
| Everything mentioning you | `is:open is:pr mentions:@me` |
| Awaiting review from you | `is:open is:pr user-review-requested:@me` |
| Review requests for your teams | `is:open is:pr team-review-requested:TEAM` |

### 17.3 Design Insight

Pre-built filters serve as:
1. **Onboarding**: They teach users what qualifiers exist by generating visible query text.
2. **Efficiency**: One-click access to the most common filter combinations.
3. **Template**: Users can select a pre-built filter and then modify the generated query.

The `@me` keyword is central to pre-built filters -- it enables context-aware filtering without hardcoding usernames.

---

## 18. Cross-Repository Search

### 18.1 Scope Qualifiers

For searching issues across repositories, use:

```
repo:owner/name                    # Specific repository
user:username                      # All of a user's repositories
org:orgname                        # All of an organization's repositories
```

### 18.2 Cross-Repo Search URL

Cross-repository search uses a different URL path:

```
https://github.com/search?q=is:issue+state:open+org:github&type=issues
```

Note the `/search` path and `&type=issues` parameter, compared to the repo-scoped `/issues` path.

### 18.3 Constraints

- Limited to **16 `user` and `org` qualifiers** per query.
- **No limit** on `repo` qualifiers.
- Search scans up to **10,000 repositories** -- must use scope qualifiers for broader searches.
- `repo`, `org`, and `user` qualifiers behave as **implicit OR** when space-separated and **cannot be used inside nested parenthetical groups**.

### 18.4 Examples

```
# All open bugs across GitHub organization
org:github is:issue is:open label:bug

# Issues in specific repos
repo:facebook/react repo:facebook/react-native is:issue is:open

# Issues across a user's repos
user:octocat is:issue created:>2025-01-01

# Combined org and user scope
state:open is:issue org:github OR user:octocat
```

### 18.5 Dashboard Views

GitHub provides a personal issues dashboard at `github.com/issues` that aggregates issues across all repositories the user has access to. This dashboard supports the same filtering syntax.

---

## 19. Filter Counts

### 19.1 State Counts

The **Open/Closed tabs** display counts:
```
1,234 Open    5,678 Closed
```

These counts update dynamically based on the current filter. If you filter by `label:bug`, the counts show how many open/closed items match that filter.

### 19.2 Label Counts

On the **Labels management page** (`/labels`), each label shows the count of open issues and PRs with that label. However, in the **filter dropdown**, labels do NOT show counts inline -- only the label name and color.

### 19.3 Milestone Counts

On the **Milestones page** (`/milestones`), each milestone shows a progress bar with open/closed issue counts. The filter dropdown for milestones does NOT show counts.

### 19.4 Design Insight

GitHub shows counts sparingly:
- **State counts** (Open/Closed): Always visible, updates with filters. This is the primary count indicator.
- **Per-filter-value counts**: NOT shown in dropdown filter menus. This is a deliberate choice to avoid expensive count queries for every possible filter value.

This differs from many e-commerce filter patterns where each facet value shows its count (e.g., "Bug (42)"). GitHub optimizes for performance over information density in the filter controls.

---

## 20. Date & Time Filtering

### 20.1 Date Format

All dates must be ISO 8601: `YYYY-MM-DD`

Optional time component: `YYYY-MM-DDTHH:MM:SS+00:00` or `YYYY-MM-DDTHH:MM:SSZ`

### 20.2 Date Qualifiers

| Qualifier | Description |
|-----------|-------------|
| `created:` | When the issue/PR was created |
| `updated:` | When the issue/PR was last updated |
| `closed:` | When the issue/PR was closed |
| `merged:` | When the PR was merged |

### 20.3 Date Operators

```
created:>2025-01-01               # Created after Jan 1, 2025
created:>=2025-01-01              # Created on or after Jan 1, 2025
created:<2025-06-01               # Created before June 1, 2025
created:<=2025-06-01              # Created on or before June 1, 2025
created:2025-01-01..2025-06-30    # Created between Jan 1 and June 30, 2025
created:2025-01-01..*             # Created on or after Jan 1 (same as >=)
created:*..2025-06-30             # Created on or before June 30 (same as <=)
```

### 20.4 Relative Date References

In GitHub Projects and the Advanced Search (2025), relative date keywords are supported:

```
created:>@today-1w                # Created in the last week
created:>@today-30d               # Created in the last 30 days
```

### 20.5 Date with Time

```
created:>2025-01-01T12:00:00Z
updated:<2025-06-15T23:59:59+00:00
```

### 20.6 Design Insight

GitHub does NOT provide a visual date picker for date filtering on the issues page. All date filtering is done through text query syntax. This is a notable UX decision that favors:
- **Precision** (exact ISO dates) over convenience (calendar widget).
- **Power user efficiency** (type a range quickly) over discoverability (visual calendar).
- **URL shareability** (dates are plain text in the URL) over GUI-driven selection.

This is an area where a visual filter UI could add significant value for less technical users.

---

## 21. Key Design Decisions & Takeaways

### 21.1 Architectural Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Text query as source of truth** | Single canonical representation; URL-friendly | Less discoverable for new users |
| **Dropdowns sync to search bar** | Teaches users the syntax; maintains single source of truth | Search bar can look complex/intimidating |
| **No separate filter pills** | Avoids desync between pills and query text | Harder to remove individual filters; less scannable |
| **No date picker UI** | Simpler implementation; precise control | Date filtering not discoverable; needs syntax knowledge |
| **Comma OR only for labels** | Labels are the most common multi-value filter | Inconsistent -- users may expect comma OR to work elsewhere |
| **Per-value counts NOT shown** | Performance optimization (avoiding N+1 count queries) | Less information for users making filter decisions |
| **No native saved searches for issues** | Simplicity; URL bookmarks are a workaround | Workflow friction for teams with recurring triage queries |
| **Advanced search inline, not modal** | Consistent surface; no mode switching | Complex queries make the search bar very long |

### 21.2 Strengths to Emulate

1. **URL as state**: Filters are fully encoded in the URL. This enables sharing, bookmarking, and back-button navigation.
2. **Progressive disclosure**: Three tiers (dropdowns -> autocomplete -> raw syntax) serve users of different expertise levels.
3. **@me keyword**: Context-aware self-referencing without hardcoded usernames.
4. **Keyboard shortcuts**: Single-letter shortcuts (L, A, M, U) for the most common filter operations.
5. **Alt+click for exclusion**: A hidden power feature that rewards discovery.
6. **Autocomplete with validation**: Reduces errors and aids discoverability.
7. **Sort as a qualifier**: Sort is just another part of the query, making it composable with any filter.

### 21.3 Weaknesses / Opportunities

1. **No saved/pinned searches**: A major gap for teams with recurring triage workflows.
2. **No filter pills/chips**: The text-only display makes it hard to scan and remove individual filters.
3. **No date picker**: Date filtering requires knowledge of ISO 8601 format and qualifier syntax.
4. **No per-value counts in dropdowns**: Users cannot see how many items match each label/assignee before selecting.
5. **Intimidating for new users**: The pre-populated `is:issue is:open` text can confuse newcomers.
6. **Inconsistent OR syntax**: Comma OR works for labels but not other qualifiers.
7. **Limited Projects integration**: Projects have a separate, less powerful filtering system.
8. **No visual filter builder**: Complex boolean queries must be typed manually (no drag-and-drop or visual builder).

### 21.4 Metrics That Matter

For benchmarking our implementation against GitHub:

| Metric | GitHub's Approach |
|--------|------------------|
| Time to first filter | 1 click (dropdown) or ~5 keystrokes (typing qualifier) |
| Time to complex filter | Typing-dependent; no visual builder |
| Filter discoverability | High for dropdowns; low for advanced syntax |
| Filter shareability | Excellent (URL-based) |
| Filter persistence | None native (URL bookmarks only) |
| Cross-repo filtering | Supported but with scope limits |
| Keyboard efficiency | High (single-letter shortcuts) |

---

## Sources

- [Filtering and searching issues and pull requests - GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests)
- [Searching issues and pull requests - GitHub Docs](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)
- [Understanding the search syntax - GitHub Docs](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax)
- [Sorting search results - GitHub Docs](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/sorting-search-results)
- [Keyboard shortcuts - GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- [Advanced Search for Issues Public Preview - GitHub Community Discussion #139934](https://github.com/orgs/community/discussions/139934)
- [Advanced Search for Issues Public Preview (GA) - GitHub Community Discussion #148716](https://github.com/orgs/community/discussions/148716)
- [Filtering projects - GitHub Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/filtering-projects)
- [Filtering issues and pull requests by milestone - GitHub Docs](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/filtering-issues-and-pull-requests-by-milestone)
- [GitHub Search Tips - freeCodeCamp](https://www.freecodecamp.org/news/github-search-tips/)
- [GitHub Search Cheatsheet](https://gist.github.com/bonniss/4f0de4f599708c5268134225dda003e0)
- [Saved Filters Discussion - GitHub Community #47220](https://github.com/orgs/community/discussions/47220)
- [Default Search Filter for Issues - GitHub Community #52596](https://github.com/orgs/community/discussions/52596)
