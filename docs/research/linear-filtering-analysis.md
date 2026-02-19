# Linear Filtering System: Comprehensive UX Research Analysis

**Researcher**: Principal UX Researcher
**Date**: 2026-02-19
**Subject**: Deep analysis of Linear's issue filtering system — UI patterns, interaction design, information architecture, and technical implementation

---

## Executive Summary

Linear's filtering system is one of the most sophisticated and well-executed filtering UIs in the developer tooling space. It achieves a rare balance: powerful enough for complex boolean queries, yet accessible enough that a first-time user can apply a filter in seconds. The system treats filters as **interactive formula expressions** where every part of the filter statement is clickable and modifiable inline. Combined with AI-powered natural language filtering, keyboard-first design, real-time count feedback, and a tight integration with saved Views, Linear's approach represents a gold standard for filtering in SaaS developer tools.

Key design principles observed:
1. **Filters as readable formulas** — not hidden behind abstract UI, but displayed as human-readable expressions
2. **Progressive disclosure** — simple filters are trivial, advanced AND/OR groups are available but not forced
3. **Keyboard-first, mouse-friendly** — every filter operation has a keyboard path
4. **Contextual intelligence** — filter menus show only relevant values with real-time counts
5. **Tight View integration** — any filter configuration can be saved, shared, and favorited in one action

---

## 1. Filter UI Components

### 1.1 Filter Bar (Header Area)

Linear places filter controls in a **horizontal bar above the issue list/board**. This bar contains:

- **Filter button** (or press `F`) — opens the filter category menu
- **Active filter pills/tokens** — displayed as an inline formula expression
- **"All filters" / "Any filters" toggle** — appears after 2+ filters are applied
- **Save View button** — appears once at least one filter is active
- **Display Options button** — separate from filters, controls grouping/sorting/layout

The filter bar is **not a separate panel or sidebar** — it is integrated directly into the view header, keeping filters always visible and immediately accessible. After the March 2024 UI redesign, Linear simplified headers and filter presentation to "reduce visual noise and clutter."

### 1.2 Filter Category Menu (Dropdown)

When the user presses `F` or clicks the Filter button, a **dropdown menu** appears with all available filter categories. These are organized into **four visually distinct blocks separated by thin grey dividers**:

**Block 1 — Primary Issue Attributes:**
- Status
- Assignee
- Creator (Created by)
- Priority
- Labels
- Content
- Project
- Project Status

**Block 2 — Issue Relationships:**
- Parent issue
- Sub-issues
- Blocked issues
- Blocking issues
- Issues with references (Related)
- Duplicates

**Block 3 — Date Filters:**
- Due date
- Created date
- Updated date
- Completed date

**Block 4 — Additional Metadata:**
- Auto-closed
- Subscribers
- Links
- Estimate
- Cycle
- SLA
- Milestone

Each category in this menu displays a **real-time count** of matching issues beside it.

### 1.3 Filter Value Selection (Sub-menu)

After selecting a filter category, a **secondary panel** appears showing available values. Key behaviors:

- **Search/type-ahead**: Users can type to search for specific values within the list
- **Contextual filtering**: Only values that match issues in the current view are shown by default; unmatched values are hidden in a sub-section
- **Multi-select**: Users can select multiple values (e.g., multiple assignees)
- **Count badges**: Each value shows the number of matching issues

### 1.4 Active Filter Display (Filter Formula/Expression)

This is one of Linear's most distinctive design decisions. Active filters are displayed as a **human-readable formula expression** in the filter bar, not as isolated pills/badges. For example:

```
Status is In Progress  AND  Assignee is Sarah  AND  Priority is Urgent
```

Every part of this formula is **individually clickable**:
- Clicking the **filter category** (e.g., "Status") — cannot be changed but identifies the filter
- Clicking the **operator** (e.g., "is") — opens a dropdown to change to "is not", "is either of", etc.
- Clicking the **value** (e.g., "In Progress") — opens a selectable list to modify or add values

When multiple values are selected for a single filter, the operator automatically adjusts (e.g., from "is" to "is either of").

### 1.5 AI Filter Input

Linear includes an **AI natural language filter input** accessible from the same filter menu (press `F`). Users can type natural language queries like:
- "Show me issues assigned to me"
- "Open bugs with SLAs"
- "What are Jacob and Sarah working on?"
- "Show me everything that belongs to the design team that is overdue"
- "Open projects 3 months past their target date"

The AI translates these into structured filter expressions. Multiple natural language queries can be chained to iteratively build complex views. If no results match, the AI filter input reappears so users can refine their prompt.

---

## 2. Query Language / Syntax

### 2.1 No Text-Based Query Language (UI-First)

Linear does **not** expose a raw text-based query language to end users in the application UI. There is no SQL-like or JQL-like query syntax. Instead, Linear uses a **visual formula expression** approach where the "query" is constructed through clicks and displayed as readable text.

### 2.2 Natural Language via AI

The closest thing to a text-based query language is the **AI filter** feature, where users can describe what they want in plain English. The system interprets this and applies structured filters.

### 2.3 Search with @ Mentions as Structured Filters

In the global search (`/`), users can **@-mention teams, users, status, and other properties** to automatically create and apply filters. This is a hybrid approach — the user types semi-structured text, and the system converts it to proper filters. Example: typing `@design @urgent` in search would filter to the Design team with Urgent priority.

### 2.4 GraphQL API Query Language

For developers, Linear's API exposes a full **GraphQL filtering syntax** with:

**Universal comparators**: `eq`, `neq`, `in`, `nin`
**Numeric/date comparators**: `lt`, `lte`, `gt`, `gte`
**String comparators**: `eqIgnoreCase`, `neqIgnoreCase`, `startsWith`, `notStartsWith`, `endsWith`, `notEndsWith`, `contains`, `notContains`, `containsIgnoreCase`, `notContainsIgnoreCase`
**Null check**: `null` comparator for optional fields
**Logical operators**: AND (default), `or` keyword for OR logic
**Relationship traversal**: Nested filtering on related entities
**Relative dates**: ISO 8601 duration format (e.g., `"P2W"` for "past 2 weeks")

---

## 3. Filter Categories (Comprehensive List)

### Issue Properties
| Category | Description | Operators |
|----------|-------------|-----------|
| **Status** | Workflow states (Triage, Backlog, Todo, In Progress, Done, Cancelled) | is, is not, is either of |
| **Priority** | No priority, Urgent, High, Medium, Low | is, is not, is either of |
| **Assignee** | Team members | is, is not, is either of |
| **Creator** (Created by) | Who created the issue | is, is not, is either of |
| **Labels** | Issue labels (supports label groups) | includes any, includes all, includes neither, includes either, includes none |
| **Estimate** | Story points / T-shirt sizes | is, is not, is either of |
| **Content** | Full-text search of title, description, comments | text match |
| **Subscribers** | People subscribed to the issue | is, is not |

### Project & Organization
| Category | Description | Operators |
|----------|-------------|-----------|
| **Project** | Associated project | is, is not, is either of |
| **Project Status** | Project health/status | is, is not |
| **Cycle** | Sprint/cycle association | is, is not |
| **Milestone** | Project milestones | is, is not |
| **Links** | External links attached | includes any, includes none |
| **SLA** | Service level agreements | is, is not |

### Issue Relationships
| Category | Description | Operators |
|----------|-------------|-----------|
| **Parent** | Parent issue | has, does not have |
| **Sub-issues** | Child issues | has, does not have |
| **Blocked by** | Issues blocking this one | has, does not have |
| **Blocking** | Issues this blocks | has, does not have |
| **Related** | Referenced issues | has, does not have |
| **Duplicate** | Duplicate issues | has, does not have |

### Temporal
| Category | Description | Operators |
|----------|-------------|-----------|
| **Created date** | When the issue was created | before, after (combinable for ranges) |
| **Updated date** | Last modification time | before, after |
| **Completed date** | When marked done | before, after |
| **Due date** | Deadline | before, after |

### Quick Date Values
- N days ago/before
- This month / This quarter / This half-year / This year
- 3 days ago, 6 months ago, 1 year ago (relative)

### Workflow
| Category | Description |
|----------|-------------|
| **Auto-closed** | Issues automatically closed by the system |

---

## 4. Filter Operators

### Equality Operators
- **is** — exact match (single value)
- **is not** — exclusion (single value)
- **is either of** — match any of multiple values (multi-select)
- **is not** (with multi-select) — exclude multiple values

### Set/Collection Operators (for Labels, Links)
- **includes any** — at least one of the selected values matches
- **includes all** — all selected values must be present
- **includes either** — synonym for includes any
- **includes neither** — none of the selected values match
- **includes none** — no values at all (empty)

### Date Operators
- **before** — issue date is before the specified date
- **after** — issue date is after the specified date
- Combined before + after = date range

### Existence Operators (for Relations)
- **has** — the relationship exists
- **does not have** — the relationship does not exist

### Operator Auto-Adjustment
When a user selects a second value for a filter, the operator **automatically upgrades** from "is" to "is either of" — reducing friction and preventing invalid states.

---

## 5. AND / OR / NOT Logic

### Basic Mode: All vs. Any

Once two or more filters are applied, a **toggle** appears in the filter bar that reads either "all filters" or "any filters." Clicking this text switches between:

- **All filters (AND)** — issues must match every filter condition
- **Any filters (OR)** — issues must match at least one filter condition

This is a **global toggle** that affects how all top-level filters combine.

### Advanced Mode: Filter Groups with Nested AND/OR

Linear supports **advanced filters** accessible from the filter menu. Advanced filters allow:

- **Grouping conditions** into nested filter groups
- **Combining groups with AND/OR logic** independently
- **Nested filter groups** — groups within groups for complex boolean expressions

Example use case: "Show high-priority bugs for prospective customers" combines Priority + Label + Customer status filters into a compound expression.

To access: choose "Advanced filter" from the filter menu, or use the AI filter to describe what you're looking for.

### NOT Logic

NOT is implemented through **negation operators** rather than an explicit NOT keyword:
- "is not" (negation of "is")
- "is not either of" (negation of "is either of")
- "includes neither" / "includes none" (negation of "includes")
- "does not have" (negation for relations)

### API-Level Boolean Logic

The GraphQL API defaults to **AND** for all filter conditions. The `or` keyword enables OR logic with arrays of condition objects. Conditions can be nested for complex expressions:

```graphql
filter: {
  priority: { in: [0, 4] }  // Low or No priority
  or: [
    { priority: { eq: 0 } },
    { priority: { eq: 4 } }
  ]
}
```

---

## 6. Saved Filters / Views

### Creating a View

- Apply one or more filters to any list/board
- A **"Save View" button** appears in the top-right of the filter bar
- Keyboard shortcut: `Option/Alt + V`
- Opens the **View editor** with filters pre-applied
- User names the view, sets visibility, and saves

### View Types

1. **Issue Views** — filtered lists of issues
2. **Project Views** — filtered lists of projects
3. **Initiative Views** — filtered lists of initiatives (Enterprise only)

### Visibility & Sharing

- **Personal views** — visible only to the creator
- **Workspace-level views** — visible to all workspace members, listed under "Workspace views"
- **Team-level views** — visible only to members of a specific team, listed under "Team views"
- Links can be shared, but recipients need appropriate access
- Copy view URL via the three-dot overflow menu

### View Management

- **Edit**: Click view name, select "Edit view..."
- **Duplicate**: Click view name, select "Duplicate view..."
- **Favorite**: Click the star icon to pin to sidebar
- **Set as default**: Favorited views can be set as the default page when opening Linear
- **Owner**: Every view has an owner (defaults to creator), transferable to other users

### View Persistence

Views persist:
- All filter configurations (categories, operators, values)
- Display options (grouping, sorting, layout)
- Both personal and default display preferences

### View Sidebar

Custom views include a **sidebar panel** showing distribution data:
- **Issue views**: distribution by assignee, label, project
- **Project views**: distribution by lead, team, roadmap, health status
- Hovering over sidebar items enables **quick filtering** within the view

### View Subscriptions & Notifications

- Subscribe to issue views for notifications when issues match the view criteria
- Notifications can be sent to personal inbox or Slack channels
- Users are not notified for their own actions within subscribed views

---

## 7. Keyboard Interactions

### Filter-Specific Shortcuts

| Shortcut | Action |
|----------|--------|
| `F` | Open filter menu / Add a filter |
| `Shift + F` | Clear the last applied filter |
| `Option/Alt + Shift + F` | Clear all filters |
| `Backspace` / `Delete` | Clear filters (when filter panel is focused) |
| `Option/Alt + V` | Save current filters as a View |
| `/` | Open global search (with @ filter support) |
| `Cmd/Ctrl + F` | Search within current view (title-based) |

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `G` then `M` | Go to My Issues |
| `O` then `I` | Quick search by issue ID/title |
| `?` | Show all keyboard shortcuts |
| Arrow keys | Navigate through lists |
| `X` | Select/deselect item in list |
| `Cmd/Ctrl + A` | Select all items |
| `Cmd/Ctrl + B` | Toggle list/board layout |

### Filter Menu Keyboard Flow

1. Press `F` to open filter menu
2. **Type to search** — start typing the filter category name (e.g., "pri" for Priority)
3. Arrow keys to navigate menu items
4. `Enter` to select a category
5. Type to search values within the selected category
6. `Enter` to apply value
7. Press `F` again to add another filter

### Command Palette Integration

- `Cmd/Ctrl + K` opens the command palette
- Type "filter" to access filter actions
- Prefix characters focus search: `i` (issues), `p` (projects), `u` (users), `t` (teams), `l` (labels), `f` (favorites), `d` (documents)

Linear is designed to be **keyboard-first**: nearly all common actions can be performed without touching the mouse. The filtering system exemplifies this — from opening the menu, to searching categories, to selecting values, everything can be done via keyboard.

---

## 8. Custom Views (Detailed)

### State Persisted in a View

- Filter configuration (categories + operators + values)
- Filter combination mode (all/any)
- Advanced filter groups (if used)
- Display options: grouping, sub-grouping, ordering
- Layout type (list, board, timeline)
- Display properties (which columns/badges are shown)
- Visibility scope (personal, team, workspace)
- Owner assignment
- Favorite status

### Contextual Team/Project Views

Teams can create views that appear within their **Issues and Projects sections** alongside the default views (All Issues, Active, Backlog), rather than in the global Views menu. This allows per-team custom filters that feel native.

### Default Home View Configuration

Users can set their default "home" view in Settings > Account > Preferences. Options include:
- My Issues (default)
- Any favorited custom view
- Team Active issues view

---

## 9. URL State

### URL Structure

Linear uses a workspace-based URL pattern: `linear.app/{workspace-name}/...`

**For saved views**: Each view has a **unique, stable URL** that can be copied and shared. The URL routes to the view configuration, not encoded filter parameters.

**For ad-hoc filters**: Linear historically had an issue where inline (unsaved) filters did not persist across navigation. This was fixed — ad-hoc filters now persist when navigating to an issue and back to the view.

**Key distinction**: Linear relies more on **saved Views with stable URLs** rather than encoding all filter state in URL query parameters. This means:
- Saved views = shareable, stable URLs
- Ad-hoc filters = session state, persist during navigation but not encodable in URLs for sharing

This is different from tools like Jira that encode filter state in URL parameters. Linear's approach prioritizes clean URLs and encourages saving Views for any filter configuration worth sharing.

---

## 10. Progressive Disclosure

### Layer 1: Zero Filters (Default Views)

Users start with built-in views that require no filter knowledge:
- **My Issues** — personal, pre-filtered view with Focus grouping
- **Active** — all unstarted + started issues
- **Backlog** — all backlog issues
- **All Issues** — unfiltered
- **Cycles** — current/future/past cycles

### Layer 2: Quick Single Filters

Press `F`, select a category, pick a value. Done. One-click filtering for the most common use cases. The **quick search** within the filter menu means users can type "bug" and see the "Bug" label immediately.

### Layer 3: Multiple Filters with All/Any Toggle

Add 2+ filters and the all/any toggle appears. No complex UI — just clickable text in the filter bar.

### Layer 4: Operator Refinement

Click on parts of the filter formula to change operators. "is" becomes "is not," "includes any" becomes "includes all." Available only when the user explicitly clicks on an operator.

### Layer 5: Advanced Filter Groups

Choose "Advanced filter" from the filter menu to access nested AND/OR groups. This is hidden behind a menu item — power users who need it can find it, but it never clutters the default experience.

### Layer 6: AI Natural Language Filtering

Available from the same filter menu. Users who want to skip the structured approach entirely can describe what they want in words.

### Layer 7: API/GraphQL Filtering

For developers building integrations, the full GraphQL filtering API supports the most complex boolean expressions, relative dates, relationship traversal, and multi-level nested conditions.

**Design insight**: Linear never shows a "Basic" vs. "Advanced" mode toggle. Instead, complexity is introduced incrementally through the filter formula interaction — the UI gracefully scales from simple to complex based on user actions.

---

## 11. Filter Suggestions / Autocomplete

### Quick Search in Filter Menu

After opening the filter menu (`F`), users can **immediately start typing** to search filter categories. Typing "pri" highlights "Priority," typing "ass" highlights "Assignee." This bypasses the need to visually scan the categorized list.

Quick filter shortcuts exist for: Team, Status, Assignee, Created by, Priority, Labels, Cycle, Project, Subscriber, Relations, Date filters, Links, and Milestone.

**Exception**: Content filtering does not have quick search shortcuts.

### Value Search Within Filter Dropdowns

After selecting a category (e.g., Assignee), the value list includes a **type-ahead search field**. Users type to filter the list of values. For user-type filters, active users are displayed before suspended users.

### Contextual Value Filtering

The filter menu **hides unmatched values** in a sub-section. If you are filtering assignees within a specific project, only users who have assigned issues in that project are shown by default. Other users are available but collapsed into a secondary section. This dramatically reduces cognitive load.

### Dynamic Filter Values (2025 Update)

Filter values that do not match the content on the current page are now **calculated dynamically** based on the search input. This means the filter menu actively responds to what the user is typing.

### @ Mention Filters in Search

In global search (`/`), typing `@` followed by a team name, user name, status, or property **automatically creates a filter**. This is a powerful hybrid of search and structured filtering.

---

## 12. Visual Design

### Filter Formula as Primary Visual Element

Active filters are displayed as **inline text formulas** in the view header:

```
Priority is Urgent  AND  Assignee is either of Sarah, Jacob  AND  Labels includes any Bug
```

- Each segment is styled as a distinct **clickable token**
- Category names, operators, and values have different visual weights
- The formula reads like a natural sentence
- Filters can be removed by clicking and deleting

### Minimal Chrome

Linear avoids heavy UI chrome for filters:
- No colored pills with backgrounds for each filter (unlike many SaaS tools)
- The formula approach is more text-like, fitting Linear's minimalist aesthetic
- After the 2024 redesign, filters have reduced visual noise with better hierarchy

### Dark Mode

All filter UI components work in both light and dark themes, using Linear's CSS variable-based theming system.

### Filter Menu Design

- Dropdown with four visually separated blocks (thin grey dividers)
- Each item shows an icon + label + count badge
- Clean typography, monochrome icons
- Consistent with Linear's overall design language: sharp, precise, developer-oriented

### Count Badges

Real-time count badges appear:
- Next to each filter category in the filter menu
- Next to each value within a filter category dropdown
- These counts update dynamically based on the current view context

---

## 13. Grouping & Sorting Interaction with Filters

### Key Distinction

Linear explicitly separates **Filters** from **Display Options**:

> "Filters will refine the list to only issues with certain properties while display options show all issues in the list but hide or show data on the issue item or board card."

Filters determine **which** issues appear. Display options determine **how** they appear.

### Grouping Options

Issues can be grouped by:
- **Status** — workflow states
- **Assignee** — team members
- **Project** — associated projects
- **Priority** — urgency levels
- **Cycle** — sprint/iteration
- **Focus** — unique to My Issues; prioritizes by urgency, SLA, blocking status, cycle
- **No grouping** — flat list, useful with filters + ordering

### Sub-Grouping

Available in both list and board layouts:
- Board: creates **swim lanes** (rows)
- Useful for "high-level overview of company's progress or resource allocation"
- Grouping header remains fixed while scrolling

### Ordering Options

Issues can be ordered by:
- Status (closest to done first)
- Manual (drag-and-drop, default for boards)
- Priority
- Last created
- Last updated
- Due date
- Link count

Sort order can be reversed (except manual and status ordering).

### Drag-and-Drop with Grouping

When issues are dragged between groups, they **automatically adopt the properties of the target group** (e.g., dragging into an "In Progress" group changes status to In Progress).

### Interaction with Filters

- Filters narrow the dataset, then grouping/sorting applies to the filtered results
- "No grouping" is especially useful when combining ordering + filters for a flat, sorted, filtered list
- Both filters and display options are saved together in custom Views

---

## 14. Empty States

### Filter Empty State

When filters return zero results:
- Linear shows a clean empty state (consistent with their minimalist design language)
- Simple monochrome illustration
- Messaging like "No issues match your filters"
- For **AI filters** specifically: when no results match, the AI filter input **reappears** so users can refine their prompt

### General Design Principles Applied

- Linear uses monochrome illustrations that "blend into the interface while still offering warmth and clarity"
- Empty states provide next-step guidance (e.g., modify filters, try different criteria)
- The system does not leave the user in a dead end

### Prevention via Real-Time Counts

Linear's approach to empty states is primarily **preventive**:
- Real-time count badges in filter menus show exactly how many issues match before a filter is applied
- Hiding unmatched values reduces the chance of selecting a zero-result filter
- The any/all toggle provides a quick escape if a complex filter is too restrictive

---

## 15. Filter Presets / Built-in Views

### Personal Built-in Views

| View | Description | Keyboard Shortcut |
|------|-------------|-------------------|
| **My Issues** | Issues assigned to you, with Focus grouping algorithm | `G` then `M` |
| **My Issues — Created** | Issues you created | Tab in My Issues |
| **My Issues — Subscribed** | Issues you're subscribed to | Tab in My Issues |
| **My Issues — Activity** | Issues with recent activity involving you | Tab in My Issues |
| **Inbox** | Notifications and mentions | `G` then `I` |

### Team Built-in Views

| View | Description |
|------|-------------|
| **All Issues** | Every issue in the team, unfiltered |
| **Active** | Issues with Unstarted or Started workflow status |
| **Backlog** | Issues in Backlog status |
| **Cycles** | Current, future, and past (unarchived) cycles |
| **Projects** | All projects assigned to the team |

### My Issues Focus Grouping Algorithm

The "Focus" grouping in My Issues orders issues in a sophisticated priority hierarchy:
1. Urgent issues
2. Issues with SLAs
3. Assigned issues blocking others
4. Issues in current cycle
5. Issues in future cycles
6. Other active issues (in-progress)
7. Triage issues
8. Backlog issues
9. Done
10. Cancelled

Within each group, issues are ordered by priority, with started issues appearing first.

### Organization-Level Views

- **Pulse** — overview of work activity across teams
- **Views** page — lists all saved workspace and team views

---

## 16. Real-Time Counts

### Where Counts Appear

1. **Filter category menu** — each category (Status, Assignee, Priority, etc.) shows the total count of matching issues
2. **Filter value lists** — each individual value (e.g., specific assignees, labels) shows its count
3. **View sidebar** — distribution data shows issue counts by assignee, label, project

### Count Behavior

- Counts are **contextual** — they reflect the current view (team, project, existing filters)
- Counts **update dynamically** as filters are added or modified
- When searching within filter menus, counts adjust to reflect the search results

### Hiding Zero-Count Values

Filter values with zero matching issues are **hidden by default** and collapsed into a sub-section. This was a deliberate change from the original behavior where all possible values were listed regardless of match count. For example, filtering assignees in a project no longer shows every user in the organization — only those with assigned issues in that project.

---

## 17. Sub-Filtering (Filtering Within Filter Dropdowns)

### Type-Ahead Search in Value Lists

Every filter value dropdown includes a **search/type-ahead field** at the top. Users can type to instantly narrow the list of available values.

Examples:
- In the Assignee filter: type "sar" to find "Sarah"
- In the Labels filter: type "bug" to find "Bug" and "Bug Fix"
- In the Project filter: type "mobile" to find "Mobile App" and "Mobile API"

### Contextual Pre-Filtering

Values are pre-filtered to show only relevant options:
- Assignee filter in a project → shows only users with issues in that project
- Label filter in a team → shows only labels used by that team
- Unmatched values hidden in a collapsible sub-section

### Search Ordering

Active users appear before suspended users in user-type filters (Assignee, Creator, Subscriber). This was a 2025 improvement.

### Category Quick Search

At the filter category level (before selecting a type), users can type to search across categories. Typing "due" immediately highlights "Due date" in the category list.

---

## 18. Additional Findings

### Performance

- Linear performed **3.7x faster** than Jira and **2.3x faster** than Asana for common operations including filtering (2024 benchmark)
- Engineers rated Linear **4.6/5** for UX compared to Jira's 3.2/5
- Over 150,000 teams using the platform as of 2025

### Product Intelligence (2025)

Linear introduced a **hybrid semantic search** system combining Turbopuffer with Cohere embeddings:
- Replaces traditional keyword-based search
- Combines AI vector embeddings with keyword matching
- Infers user intent even without exact phrasing
- Supports query rewriting, hybrid search, and reranking
- Builds a "semantic graph" connecting issues by meaning

### Filter Persistence Fix

Linear addressed an issue where inline (ad-hoc) filters did not persist when navigating to an issue and back to the view. This is now fixed — session filter state is maintained during navigation.

### Multi-View Layout Support

Filters work consistently across all layout modes:
- **List view** — vertical issue list with inline data
- **Board view** — Kanban-style columns
- **Timeline view** — Gantt-style for projects/initiatives
- **Split view** — list + detail panel

---

## 19. Design Patterns Summary

### Pattern: Filter as Formula

Instead of traditional filter "chips" or "pills" with background colors, Linear renders active filters as a **readable text formula**. This is a distinctive pattern that:
- Reads naturally ("Status is In Progress")
- Makes the boolean logic visible ("AND" / "OR")
- Allows inline editing of any part
- Scales well from 1 filter to many
- Reduces visual clutter compared to heavy pill/chip designs

### Pattern: Contextual Intelligence

Linear's filter menus are **context-aware**:
- Show real-time counts
- Hide irrelevant values
- Pre-filter based on current scope
- Order by relevance (active users before suspended)

### Pattern: Keyboard-First Progressive Disclosure

The keyboard flow (`F` → type → Enter → type → Enter`) is faster than any mouse-based interaction, but the mouse path is equally intuitive. This dual-path design ensures both power users and newcomers are served.

### Pattern: AI as Accessibility Layer

Natural language filtering isn't positioned as a premium or replacement feature — it's an **alternative entry point** that produces the same structured filters. This makes complex filtering accessible to users who don't want to learn the filter system.

### Pattern: Views as First-Class Objects

Filters are not ephemeral — they are designed to be **saved, shared, subscribed to, favorited, and set as defaults**. This elevates filtering from a transient action to a persistent workflow tool.

---

## 20. Competitive Positioning

| Feature | Linear | Jira | GitHub Issues | Notion |
|---------|--------|------|---------------|--------|
| Filter formula/expression | Yes (inline) | JQL text | No | No |
| AI natural language filter | Yes | JQL AI assist | No | Yes |
| Keyboard-first filtering | Yes (`F` shortcut) | Limited | Limited | Limited |
| Real-time filter counts | Yes | No | No | No |
| Advanced AND/OR groups | Yes (nested) | Yes (JQL) | Limited | Yes |
| Saved views/filters | Yes (Views) | Yes (Filters) | Limited | Yes (Views) |
| Sub-filtering in dropdowns | Yes (type-ahead) | Yes | No | Yes |
| Contextual value filtering | Yes (hides irrelevant) | No | No | No |
| @ mention filtering in search | Yes | No | Yes | No |
| Filter persistence in URL | Via saved Views | Yes (JQL in URL) | Yes (query params) | Via saved Views |

---

## Sources

- [Filters - Linear Docs](https://linear.app/docs/filters)
- [Custom Views - Linear Docs](https://linear.app/docs/custom-views)
- [Display Options - Linear Docs](https://linear.app/docs/display-options)
- [My Issues - Linear Docs](https://linear.app/docs/my-issues)
- [Search - Linear Docs](https://linear.app/docs/search)
- [Filtering - Linear Developers](https://linear.app/developers/filtering)
- [Filtering - Linear GraphQL API](https://developers.linear.app/docs/graphql/working-with-the-graphql-api/filtering)
- [AI Filters - Linear Changelog](https://linear.app/changelog/2023-06-01-ai-filters)
- [New Filters Preview - Linear Changelog](https://linear.app/changelog/2021-11-08-linear-preview-new-filters)
- [New Search - Linear Changelog](https://linear.app/changelog/2025-04-10-new-search)
- [New Linear UI - Linear Changelog](https://linear.app/changelog/2024-03-20-new-linear-ui)
- [Product Intelligence - Linear Changelog](https://linear.app/changelog/2025-08-14-product-intelligence-technology-preview)
- [Filter Improvements - Linear Changelog](https://linear.app/changelog/2020-07-29-filter-improvements)
- [Linear Keyboard Shortcuts](https://keycombiner.com/collections/linear/)
- [Linear App Cheat Sheet - ShortcutFoo](https://www.shortcutfoo.com/app/dojos/linear-app-mac/cheatsheet)
- [Linear Guide - Morgen](https://www.morgen.so/blog-posts/linear-project-management)
- [Filter UI Examples for SaaS - Eleken](https://www.eleken.co/blog-posts/filter-ux-and-ui-for-saas)
- [Linear Design System - Figma Community](https://www.figma.com/community/file/1222872653732371433/linear-design-system)
- [Linear App Case Study - Eleken](https://www.eleken.co/blog-posts/linear-app-case-study)
- [AI Natural Language Filter UX - AIverse Design](https://www.aiverse.design/browse/linear-s-filter-using-natural-language)
- [Linear vs Jira Comparison - Unito](https://unito.io/blog/linear-app-vs-jira/)
- [Personalized Sidebar - Linear Changelog](https://linear.app/changelog/2024-12-18-personalized-sidebar)
- [How We Redesigned Linear UI - Linear Blog](https://linear.app/now/how-we-redesigned-the-linear-ui)
