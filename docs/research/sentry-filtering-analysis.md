# Sentry Filtering System: Comprehensive Research Analysis

**Date:** 2026-02-19
**Researcher Role:** Principal UX Researcher
**Subject:** Deep analysis of Sentry's filtering system across all product surfaces

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Filter UI Components & Architecture](#2-filter-ui-components--architecture)
3. [Query Language & Syntax](#3-query-language--syntax)
4. [Filter Categories & Searchable Properties](#4-filter-categories--searchable-properties)
5. [Discover Queries & Query Builder](#5-discover-queries--query-builder)
6. [Saved Searches & Issue Views](#6-saved-searches--issue-views)
7. [Keyboard Interactions & Autocomplete](#7-keyboard-interactions--autocomplete)
8. [URL State Management](#8-url-state-management)
9. [Progressive Disclosure](#9-progressive-disclosure)
10. [Visual Design & Active Filter Display](#10-visual-design--active-filter-display)
11. [Time Range Selection](#11-time-range-selection)
12. [Custom Tags](#12-custom-tags)
13. [Aggregation Functions & Equations](#13-aggregation-functions--equations)
14. [Empty States](#14-empty-states)
15. [Real-time & Event Streaming](#15-real-time--event-streaming)
16. [Performance Considerations](#16-performance-considerations)
17. [Filter Persistence](#17-filter-persistence)
18. [Issue Grouping & Filtering Interaction](#18-issue-grouping--filtering-interaction)
19. [Dashboard Widget Builder Filtering](#19-dashboard-widget-builder-filtering)
20. [Session Replay Filtering](#20-session-replay-filtering)
21. [Inbound Data Filters (Server-Side)](#21-inbound-data-filters-server-side)
22. [Design Patterns & Takeaways](#22-design-patterns--takeaways)

---

## 1. Executive Summary

Sentry's filtering system is a multi-layered architecture that spans six distinct product surfaces (Issues, Discover, Performance, Traces, Replays, Dashboards), each with context-specific filtering capabilities built on a shared query syntax foundation. The system has undergone a major evolution from 2023-2025, transitioning from the legacy `SmartSearchBar` component to a new `SearchQueryBuilder` that introduces tokenized search, categorized filter menus, and dual-mode editing (visual tokens vs. plain text).

**Key architectural decisions:**
- A **unified query syntax** (`key:value` pattern) shared across all surfaces
- **Page-level filters** (project, environment, date range) that persist across navigation
- **URL-as-source-of-truth** for all filter state, using the `nuqs` library
- **Progressive disclosure** from simple dropdowns to full query syntax
- **Saved searches evolving into Issue Views** with shareable, tab-based filter presets
- **Tokenized search bar** with inline editing, categorized suggestions, and search history

---

## 2. Filter UI Components & Architecture

### 2.1 Component Hierarchy

Sentry's filtering interface operates at three distinct levels:

#### Level 1: Page Filters (Global/Persistent)
- **Project selector** (multi-select dropdown)
- **Environment selector** (multi-select dropdown, contextual to selected projects)
- **Date range selector** (relative + absolute datetime picker)

These filters sit above all content and **persist across page navigation**. They are encoded in URL query parameters (e.g., `?project=11276&statsPeriod=14d`).

#### Level 2: Search Bar (Primary Query Interface)
The central filtering component is the **SearchQueryBuilder** (replacing the legacy SmartSearchBar). It is a single search input field that supports:
- Tokenized key:value pairs displayed as visual tokens/pills
- Free-text search appended to the query
- Autocomplete suggestions for keys, operators, and values
- Boolean logic (AND, OR, parentheses)
- Inline editing of individual tokens
- Toggle between tokenized and plain-text mode

#### Level 3: Contextual Filters (Surface-Specific)
Each product surface adds additional filtering affordances:
- **Issues page:** Tab-based views (Unresolved, For Review, Regressed, Escalating, Archived)
- **Performance page:** Transaction view modes (All, Web Vitals, Frontend, Backend, Mobile)
- **Discover:** Dataset selector (Errors vs. Transactions), column/grouping configuration
- **Traces:** Span-level filtering with span-specific properties
- **Replays:** Click-based filtering (CSS selectors, element attributes)
- **Dashboards:** Widget-level search conditions, dashboard-level page filters

### 2.2 The SearchQueryBuilder Component

The new search bar (released September 2024) replaced the legacy SmartSearchBar with these improvements:

| Feature | Description |
|---------|-------------|
| **Categorized filter menu** | Filters organized by category when the bar is focused |
| **Smarter suggestions** | Context-aware autocomplete for keys and values |
| **Guided aggregate creation** | IDE-like documentation for aggregate functions |
| **Search history** | Access and reuse previous search queries |
| **Dual input mode** | Mouse and keyboard operability; tokenized vs. plain text toggle |
| **filterKeySections prop** | Organizes large numbers of filter keys into sections |

### 2.3 Tag Summary / Facet Map

On certain pages (Transaction Summary, Discover), Sentry displays a **tag summary facet map** in the sidebar showing the top 10 tag values by frequency. Clicking a tag segment automatically adds it as a filter to the search bar. This provides a visual, data-driven entry point into filtering.

---

## 3. Query Language & Syntax

### 3.1 Core Pattern

```
key:value [key:value ...] [free text search]
```

Each `key:value` pair is a **token**. The optional free text at the end is treated as a single token that searches error messages or transaction names.

**Example:**
```
is:unresolved user.username:"Jane Doe" server:web-8 example error
```
This contains three key:value tokens plus one free-text token.

### 3.2 Operators

#### Exact Match
```
browser.name:Chrome
http.status_code:500
```

#### Negation (Exclusion)
```
!browser.name:Chrome
!user.email:spam@example.com
!is:resolved
```

#### Comparison Operators (Numeric/Duration/DateTime)
```
count():>100
transaction.duration:>5s
event.timestamp:>2023-09-28T00:00:00-07:00
count_dead_clicks:<=10
```

#### Wildcard (Glob Patterns)
```
browser:"Safari 11*"           # starts with
message:"*Timeout*"            # contains
!message:"*Timeout"            # does not end with
release:"frontend@2.*"         # glob pattern in release
```

#### API-Specific Wildcard Operators
When using the API, the `*` character becomes literal and these operators are used instead:
- `Contains` / `!Contains`
- `StartsWith` / `!StartsWith`
- `EndsWith` / `!EndsWith`

#### Multiple Values (List Syntax)
```
release:[12.0, 13.0]          # equivalent to: release:12.0 OR release:13.0
http.status_code:[500, 502, 503]
```
**Limitations:** Cannot be used with the `is` keyword or with wildcards.

### 3.3 Boolean Logic

**Available in:** Discover, Insights, Metric Alerts (NOT in basic Issues search)

```
# AND (implicit between tokens, or explicit)
browser.name:Chrome os.name:Windows

# OR
browser.name:Chrome OR browser.name:Firefox

# Parentheses for grouping
browser.name:Chrome AND (os.name:Windows OR os.name:Linux)
```

**Precedence:** AND evaluates before OR. `x AND y OR z` is equivalent to `(x AND y) OR z`.

**Restriction:** OR cannot mix aggregate and non-aggregate filters:
```
# INVALID:
user.username:janedoe OR count():>100

# VALID:
user.username:janedoe OR user.username:johndoe
count():>100 OR count_unique(user):>50
```

### 3.4 Tag Existence (has / !has)

```
has:user                       # events that have the user tag (any value)
!has:user                      # events that do NOT have the user tag
has:http.status_code           # events with status code present
!has:release                   # events without a release tag
```

### 3.5 Explicit Tag Syntax

For reserved keywords used as custom tags, use bracket notation:
```
tags[project_id]:my_custom_value
tags[environment]:custom_env
```

### 3.6 Aggregate Filters

```
count():>100                   # more than 100 events
count_unique(user):>=20        # 20+ unique users affected
avg(transaction.duration):>5s  # average duration > 5 seconds
p95(transaction.duration):>2s  # 95th percentile > 2 seconds
failure_rate():>0.05           # more than 5% failure rate
```

### 3.7 Free-Text Search

Any text not in `key:value` format at the end of the query is treated as a message/title search:
```
is:unresolved TypeError         # issues that are unresolved containing "TypeError"
```

---

## 4. Filter Categories & Searchable Properties

Sentry organizes searchable properties into **six categories**, each available on specific product surfaces:

### 4.1 Issue Properties (Issues Page)

| Property | Type | Example |
|----------|------|---------|
| `age` | relative time | `age:-24h`, `age:-7d`, `age:-2w` |
| `assigned` | user/team | `assigned:me`, `assigned:#backend-team`, `assigned:none` |
| `assigned_or_suggested` | user/team | `assigned_or_suggested:me` |
| `bookmarks` | user | `bookmarks:me` |
| `firstRelease` | string | `firstRelease:1.0.0`, `firstRelease:latest` |
| `firstSeen` | datetime | `firstSeen:-7d` |
| `is` | status | `is:unresolved`, `is:resolved`, `is:archived`, `is:assigned`, `is:unassigned`, `is:for_review`, `is:linked`, `is:unlinked` |
| `issue` | string | `issue:SENTRY-ABC` |
| `issue.category` | string | `issue.category:error`, `issue.category:performance`, `issue.category:replay`, `issue.category:cron` |
| `issue.type` | string | `issue.type:performance_n_plus_one_db_queries` |
| `lastSeen` | datetime | `lastSeen:-2d` |
| `timesSeen` | number | `timesSeen:>100` |
| `level` | string | `level:error`, `level:fatal`, `level:warning` |
| `flags` | boolean | `flags["feature_flag_name"]:true` |

### 4.2 Event Properties (Discover, Performance)

**Core properties:**
- `event.type`, `message`, `title`, `transaction`, `timestamp`
- `platform`, `project`, `project.id`, `release`, `dist`, `environment`
- `id`, `trace`, `trace.parent_span`, `trace.span`

**Error properties:**
- `error.handled`, `error.unhandled`, `error.main_thread`, `error.mechanism`, `error.type`, `error.value`

**Device properties:**
- `device.arch`, `device.brand`, `device.family`, `device.name`, `device.class`
- `device.orientation`, `device.battery_level`, `device.charging`, `device.online`, `device.simulator`
- `device.screen_density`, `device.screen_dpi`, `device.screen_height_pixels`, `device.screen_width_pixels`

**HTTP properties:**
- `http.method`, `http.url`, `http.referer`, `http.status_code`

**Geographic properties:**
- `geo.city`, `geo.country_code`, `geo.region`

**User properties:**
- `user.email`, `user.id`, `user.ip`, `user.username`, `user.display`

**Stack trace properties:**
- `stack.abs_path`, `stack.filename`, `stack.function`, `stack.module`, `stack.package`
- `stack.colno`, `stack.lineno`, `stack.in_app`

**OS properties:**
- `os.build`, `os.kernel_version`, `os.distribution_name`, `os.distribution_version`

**Web Vitals / Performance Measurements:**
- `measurements.fcp`, `measurements.lcp`, `measurements.fid`, `measurements.cls`, `measurements.fp`
- `measurements.ttfb`, `measurements.ttfb.requesttime`
- `measurements.app_start_cold`, `measurements.app_start_warm`
- `measurements.frames_slow`, `measurements.frames_frozen`, `measurements.frames_total`
- `measurements.stall_count`, `measurements.stall_longest_time`, `measurements.stall_total_time`

**Span duration aggregates (within transactions):**
- `spans.browser`, `spans.db`, `spans.http`, `spans.resource`, `spans.ui`

**Release properties:**
- `release.build`, `release.package`, `release.stage`, `release.version`

### 4.3 Span Properties (Traces Page)

| Property | Description |
|----------|-------------|
| `action` | Span action type (SELECT, POST, etc.) |
| `op` | Span operation (http.client, middleware, db, etc.) |
| `description` | Parameterized span description |
| `duration` | Total span execution time |
| `self_time` | Duration excluding child spans |
| `status` | Operation outcome status |
| `status_code` | HTTP response code |
| `domain` | General scope (tables, endpoints) |
| `system` | Database system (postgresql, mysql) |
| `module` | Associated Insights module (cache, db, http) |
| `group` | Unique hash of span description |
| `transaction` | Parent transaction name |
| `transaction.method` | HTTP method of parent |
| `transaction.op` | Parent transaction operation |
| `messaging.destination.name` | Queue/topic name |
| `messaging.message.id` | Message identifier |
| `cache.hit` | Cache hit/miss status |
| `http.decoded_response_content_length` | Decoded response body size |
| `http.response_content_length` | Encoded body size |
| `http.response_transfer_size` | Total transfer size |
| `resource.render_blocking_status` | Render-blocking classification |
| `file_extension` | File type for resource spans |

### 4.4 Session Replay Properties (Replays Page)

Unique to replays, these include **click-based properties** for filtering by user interactions:

| Property | Description |
|----------|-------------|
| `click.alt` | Alt attribute of clicked element |
| `click.class` | CSS class of clicked element |
| `click.component_name` | React component name |
| `click.id` | Element ID |
| `click.label` | ARIA label of clicked element |
| `click.role` | ARIA role of clicked element |
| `click.selector` | CSS selector (subset) |
| `click.tag` | HTML tag name |
| `click.testid` | data-testid attribute |
| `click.textContent` | Immediate text content |
| `click.title` | Title attribute |
| `dead.selector` | CSS selector for dead clicks |
| `rage.selector` | CSS selector for rage clicks |
| `count_dead_clicks` | Number of dead clicks |
| `count_rage_clicks` | Number of rage clicks |
| `count_errors` | Errors in replay |
| `count_urls` | URLs visited |
| `count_segments` | Replay segments |
| `count_traces` | Traces within replay |
| `activity` | Computed 1-10 score |
| `duration` | Replay duration in seconds |
| `replay_type` | Trigger type (session, buffer) |
| `url` / `urls` | URLs visited (single/array) |
| `screen` / `screens` | Screens visited (mobile) |
| `seen_by_me` | Whether you viewed it |
| `is_archived` | Archive status |

### 4.5 User Feedback Properties

Separate searchable set for user feedback submissions.

### 4.6 Release Properties

Filtering by release adoption stage, crash-free rates, and session data.

---

## 5. Discover Queries & Query Builder

### 5.1 Query Builder UI Architecture

The Discover Query Builder has **five building blocks**:

1. **Dataset Selector** - Choose between Errors or Transactions (mutually exclusive per query)
2. **Page Filters** - Project, environment, date range (shared global filters)
3. **Search Conditions** - The search bar using full query syntax
4. **Interactive Graph** - Visualization of results with configurable axes
5. **Results Table** - Columnar data with sorting, cell-level filtering, and export

### 5.2 Dataset Selection

| Dataset | Description | Use Cases |
|---------|-------------|-----------|
| **Errors** | Error event data | Event counts, affected users, error patterns |
| **Transactions** | Performance event data | Response times, throughput, failure rates |

### 5.3 Search Conditions

Identical syntax to the global search bar, but with full AND/OR/parentheses support. Supports both non-aggregate filters (`user.username:jane`) and aggregate filters (`count():>100`).

### 5.4 Column Management

- Open the Columns modal to add/remove/reorder columns
- Supports basic fields, custom tags, and aggregation functions
- Functions "stack" events by matching values (grouping)
- Columns can be aliased for readability
- Drag-and-drop reordering

### 5.5 Graph Configuration

| Option | Description |
|--------|-------------|
| **Intervals** | Date grouping (limited by timespan: max 45 intervals per query) |
| **Display modes** | Total Period, Previous Period, Release Markers, Top Period, Total Daily, Top Daily, Bar Chart |
| **Y-Axis** | Up to 3 simultaneous metrics (e.g., count, p95, unique users) |
| **Limit** | Cap for Top Period/Top Daily displays (default: 5 results) |

### 5.6 Cell-Level Filtering

Hovering over table cells reveals an **ellipsis context menu** with filtering actions:
- "Add to filter" - adds the cell value as a search condition
- "Exclude from filter" - adds a negation filter
- Links to drill-down views

### 5.7 Result Actions

- **Real-time URL sharing**: Query state is encoded in the URL as it's built
- **CSV Export**: Direct download for small datasets; email with SHA1 checksum for large exports (max 10M rows or 1GB)
- **Save query**: Persist as a named Discover query
- **Duplicate**: Fork an existing query

---

## 6. Saved Searches & Issue Views

### 6.1 Saved Searches (Deprecated)

**Status:** Being phased out in favor of Issue Views. Existing saved searches can be converted to Issue Views.

| Aspect | Detail |
|--------|--------|
| **Creation** | Click "Custom Search" next to search bar, then "Add saved search" |
| **Scope** | Personal (visible only to creator) or Organization-wide (owners/managers only) |
| **Permissions** | All roles can create personal; owners/managers can create org-wide |
| **Default search** | Users can set a personal default for the Issues page |
| **Persistence** | Applied across all projects |

### 6.2 Issue Views (Current System)

Issue Views are the evolution of saved searches, providing a **tab-based interface** on the Issues page.

**Key features:**
- Defined by: search query + sort order + project/environment/time filters
- **Tabs at top of Issues page**: Each view appears as a tab
- **Unsaved changes indicator**: Purple dot when filters differ from saved view
- **Star system**: Star views to pin them to your tab bar
- **All Views page**: Browse all available views
- **Sharing**: Anyone in the org can browse; only creators/admins can edit/delete
- **Duplication**: Org members can duplicate views as their own

**Built-in view presets:**
- Prioritized (high/medium priority)
- Assigned to Me
- For Review
- Request Errors (500 status codes)
- High Volume Errors
- Recent Errors (last 24h)
- Function Regressions

**Workflow:**
1. Navigate to Issues page
2. Select or create a view tab
3. Modify filters in the search bar
4. Purple dot appears indicating unsaved changes
5. Click "Save" to update, "Save as new view" to fork, or reset to original

---

## 7. Keyboard Interactions & Autocomplete

### 7.1 Search Bar Keyboard Behavior

The new SearchQueryBuilder supports **full keyboard operability**:

- Focus the search bar to open the categorized filter dropdown
- Type to filter available keys
- Use arrow keys to navigate suggestions
- Enter/Tab to select a suggestion
- Continue typing the value portion
- Tab through existing tokens to edit them
- Backspace to delete the previous token

### 7.2 Autocomplete Features

| Feature | Behavior |
|---------|----------|
| **Key suggestions** | Categorized menu of available filter keys when bar is focused |
| **Value suggestions** | Context-aware values after selecting a key (e.g., team names for `assigned:`) |
| **Operator suggestions** | Appropriate operators for the field type |
| **Popular/Favorite filters** | Most-used filters surfaced at top of dropdown |
| **Team suggestions** | Your teams appear first for assignee fields |
| **Issue category priority** | Error/Performance/Cron category appears as first filter option |
| **Search history** | Recent queries accessible from the dropdown |
| **Aggregate guidance** | IDE-like documentation for aggregate function parameters |

### 7.3 Dual Mode: Tokenized vs. Plain Text

Power users can toggle between:
1. **Tokenized mode** (default): Visual token pills for each key:value pair; click to edit individual tokens
2. **Plain text mode**: Raw text input with autocomplete; preferred by users who know the query syntax

User preference is stored and persists across sessions. This was added in response to power user feedback that the tokenized UI adds friction for common operations like typing `!is:unresolved` directly.

---

## 8. URL State Management

### 8.1 Technology

Sentry uses **nuqs** (a React library) for URL state management. It provides a `useState`-like API that syncs with browser URL query parameters.

### 8.2 What Gets Encoded

| State Type | URL Encoding Example |
|------------|---------------------|
| Project selection | `?project=11276` or `?project=1,2,3` |
| Environment | `?environment=production` |
| Time range (relative) | `?statsPeriod=14d` |
| Time range (absolute) | `?start=2024-01-01&end=2024-01-31` |
| Search query | `?query=is%3Aunresolved+browser%3AChrome` |
| Sort order | `?sort=date` |
| Pagination | `?page=3` |
| UI controls | Selected tabs, display modes, etc. |

### 8.3 Parameter Encoding Patterns

**Single values with comma separation:**
```
?project=1,2,3
```

**Native array parameters (repeated keys):**
```
?project=1&project=2&project=3
```

### 8.4 State Persistence Mechanics

- Default behavior: **replaces** current history entry without scrolling
- Can be overridden per-component: `history: "push"` or `scroll: true`
- URL state excludes sensitive or large data
- Parameters are kept human-readable and bounded

### 8.5 Shareability

Because all filter state lives in the URL:
- Copying the URL captures the complete query state
- Sharing a URL gives the recipient the exact same filtered view
- Discover queries update the URL in real-time as you build them

---

## 9. Progressive Disclosure

Sentry implements progressive disclosure across multiple dimensions:

### 9.1 Layer 1: Page Filters (Simplest)
- Dropdown selectors for project, environment, and date range
- No syntax knowledge required
- Visible and persistent at all times

### 9.2 Layer 2: Quick Filters / Tabs
- Issues page tabs: Unresolved, For Review, Regressed, Escalating, Archived
- Performance page view modes: All, Web Vitals, Frontend, Backend, Mobile
- One-click filtering without any query syntax

### 9.3 Layer 3: Search Bar with Autocomplete
- Categorized filter menu appears on focus
- Popular/favorite filters surfaced at top
- Guided aggregate function creation with documentation
- Users don't need to know syntax; they can browse and select

### 9.4 Layer 4: Full Query Syntax
- Typed key:value pairs with operators
- Boolean logic (AND, OR, parentheses)
- Wildcards, has/!has, aggregate filters
- Plain text mode for power users
- Full expressiveness for complex queries

### 9.5 Layer 5: Discover Query Builder (Most Complex)
- Dataset selection, column management, equations
- Multiple y-axes, grouping, custom visualizations
- SQL-like query power without SQL syntax
- CSV export of results

### 9.6 Transition Between Layers

The search bar is the critical bridge. It supports:
- **Clicking through menus** (beginner) to build queries visually
- **Typing syntax directly** (expert) for speed
- **Mixed mode**: click some tokens, type others
- **Toggle** between tokenized and plain-text modes

The tag summary facet map provides a data-driven visual entry point: users see the top tag values and click to add filters without knowing any syntax.

---

## 10. Visual Design & Active Filter Display

### 10.1 Search Bar Design

The search bar is a single-line input that spans the content area width. Key visual elements:

- **Token pills**: Each key:value pair renders as a discrete visual token within the search bar
- **Token structure**: `[key] [operator] [value]` displayed inline
- **Negation indicator**: Negated tokens have a visual indicator (e.g., strikethrough or color change)
- **Free text**: Remaining text appears without token decoration
- **Placeholder text**: Prompts like "Search for events, users, tags, and more"

### 10.2 Page Filter Display

- **Project selector**: Dropdown with project avatar and name; multi-select with checkmarks
- **Environment selector**: Simple dropdown; values scoped to selected projects
- **Date range selector**: Displays the active relative period (e.g., "Last 14 days") or absolute range; clicking opens a picker with relative options + absolute date inputs

### 10.3 Active Filter Indicators

- **Issue Views**: Unsaved changes shown with a purple dot on the tab
- **Tag Summary**: Top 10 tag values displayed as a horizontal bar chart facet map in the sidebar
- **Cell context menu**: Hover over table cells to see filtering options

### 10.4 Color & Typography

Sentry uses its design system with:
- Muted colors for inactive/default states
- Accent purple for active/unsaved states
- Error red for issues/alerts
- Monospace font for filter syntax in plain-text mode
- Standard font for tokenized display

---

## 11. Time Range Selection

### 11.1 Page-Level Time Selector

A dedicated datetime picker component (`timeRangeSelector`) appears in the page filters area. It supports two modes:

#### Relative Time
- Format: `<number><unit>` (e.g., `14d`, `24h`, `90d`)
- Units: `m` (minutes), `h` (hours), `d` (days), `w` (weeks)
- Encoded as `?statsPeriod=14d` in URL
- Maximum: 90 days
- Preset options available (1h, 24h, 7d, 14d, 30d, 90d, etc.)

#### Absolute Time
- Start and end datetime selection
- Encoded as `?start=YYYY-MM-DDTHH:MM:SS&end=YYYY-MM-DDTHH:MM:SS` in URL
- UTC timezone standard

### 11.2 In-Query Time Filters

Beyond the page-level selector, time can be filtered within the search query itself:

```
# Relative (Issues)
age:-24h                                    # created within last 24 hours
age:-7d                                     # created within last 7 days

# Absolute (Events)
event.timestamp:>2023-09-28T00:00:00-07:00  # after specific datetime
event.timestamp:<2024-01-01                 # before specific date

# Range
event.timestamp:>2024-01-01 event.timestamp:<2024-03-01

# Issue-specific
firstSeen:-7d                               # first appeared within 7 days
lastSeen:-2d                                # last seen within 2 days
```

### 11.3 Time Range Impact on Data

Changing the time range **recalculates all metrics** using actual values for the selected period. This is not averaging; it compounds events across the full window. Example: A crash occurring once per day shows 85.7% crash-free per-day but 0% crash-free over 7 days if every user is affected.

### 11.4 Graph Intervals

In Discover, the date grouping interval is automatically bounded by the time range:
- 90-day queries: max 45 intervals (2-day grouping)
- 14-day queries: finer granularity available

---

## 12. Custom Tags

### 12.1 Definition & Setup

Custom tags are key/value pairs assigned to events at the SDK level:

```javascript
// JavaScript SDK example
Sentry.setTag("feature", "new-dashboard");
Sentry.setTag("customer_tier", "enterprise");
Sentry.setTag("deployment_region", "us-east-1");
```

### 12.2 Searching with Custom Tags

Custom tags are searchable using the same `key:value` syntax:
```
feature:new-dashboard
customer_tier:enterprise
deployment_region:us-east-1
```

### 12.3 Reserved Keyword Conflicts

If a custom tag uses a reserved keyword (e.g., `project_id`), you must use bracket notation:
```
tags[project_id]:my_custom_value
tags[environment]:custom_env
```

### 12.4 Tag Visibility

Once custom tags are sent, they appear in:
- The sidebar filters on the Project page
- Summarized within individual event details
- The Tags page for aggregated event views
- Autocomplete suggestions in the search bar
- Tag summary facet maps in Discover/Performance

### 12.5 Autocomplete Behavior for Custom Tags

There is a known issue where custom tags may not autocomplete in all areas (e.g., Traces explorer). The tags show as "invalid" visually but entering the full tag with a value still produces valid results.

---

## 13. Aggregation Functions & Equations

### 13.1 Available Aggregation Functions

#### Errors Dataset
| Function | Description |
|----------|-------------|
| `count()` | Total event count |
| `count_if(column, operator, value)` | Conditional count |
| `count_unique(field)` | Distinct value count |
| `eps()` | Events per second |
| `epm()` | Events per minute |

#### Transactions Dataset
| Function | Description |
|----------|-------------|
| `any(field)` | Any value (non-deterministic) |
| `apdex(threshold)` | Application Performance Index (0-1) |
| `avg(field)` | Average value |
| `count()` | Total event count |
| `count_if(column, operator, value)` | Conditional count |
| `count_miserable(field, threshold)` | Users exceeding miserable threshold |
| `count_unique(field)` | Distinct value count |
| `count_web_vitals(vital, threshold)` | Web Vital quality counts |
| `epm()` | Events per minute |
| `eps()` | Events per second |
| `failure_count()` | Failed transaction count |
| `failure_rate()` | Failure ratio |
| `last_seen()` | Most recent timestamp |
| `max(field)` | Maximum value |
| `min(field)` | Minimum value |
| `percentile(field, level)` | Custom percentile (0-1) |
| `p50(field)` | 50th percentile |
| `p75(field)` | 75th percentile |
| `p95(field)` | 95th percentile |
| `p99(field)` | 99th percentile |
| `p100(field)` | 100th percentile (max) |
| `sum(field)` | Sum of values |
| `user_misery(threshold)` | Frustrated user count |

### 13.2 Aggregate Filters in Search

Aggregates can be used directly in the search bar:
```
count():>100
avg(transaction.duration):>5s
p95(transaction.duration):>2s
failure_rate():>0.05
count_unique(user):>=20
```

### 13.3 Query Equations

Equations combine aggregation results using mathematical operators:

**Syntax rules:**
- Must contain at least one field/function AND one operator
- Cannot mix fields and functions in the same equation
- Cannot use exponents
- Standard order of operations (PEMDAS)
- Negative numbers supported

**Supported operators:** `+`, `-`, `*`, `/`, `(`, `)`

**Available columns for equations:**
- Functions: count, count_unique, count_if, count_web_vitals, failure_count, avg, sum, percentiles, apdex, user_misery, eps, epm
- Fields: transaction.duration, measurements.*, spans.*

**Examples:**
```
# Transaction completion rate within 300ms
count_if(transaction.duration, lessOrEquals, 300) / count() * 100

# Non-database transaction time
avg(transaction.duration) - avg(spans.db)

# FCP to LCP ratio
measurements.fcp / measurements.lcp

# Custom weighted Apdex
(count_if(transaction.duration, lessOrEquals, 300) + (count_if(transaction.duration, lessOrEquals, 1200) - count_if(transaction.duration, lessOrEquals, 300)) * 0.2) / count()
```

---

## 14. Empty States

### 14.1 Observed Patterns

Sentry handles empty/zero-result states with these patterns:

- **No matching issues**: Content area displays a message explaining no issues match the current filters, with suggestions to broaden the search
- **Invalid search syntax**: Error messages appear inline below the search bar highlighting the invalid portion of the query
- **No data for time range**: Clear messaging that the selected time period contains no events
- **Invalid tag**: Custom tags may show as visually "invalid" but still function

### 14.2 Design Principles (Inferred)

- Messages never blame the user
- Actionable suggestions provided (modify query, change time range, check project selection)
- System status is clearly communicated
- Filter state is always visible so users can identify what to change

---

## 15. Real-time & Event Streaming

### 15.1 Issues Page

The Issues page supports near-real-time updates:
- New issues appear at the top of the list
- Issue counts update as new events arrive
- "For Review" tab surfaces issues needing attention

### 15.2 Sentry Streams (Infrastructure)

Sentry Streams is a distributed platform for handling real-time unbounded data streams, primarily powering the ingestion pipeline. This infrastructure processes events as they arrive and routes them through inbound filters before they appear in the UI.

### 15.3 Inbound Filters (Pre-Ingestion)

Inbound filters operate at ingestion time, BEFORE events enter the system:
- Filtered events do not consume quota
- Filtering is applied before rate limits
- This is a server-side mechanism, not a UI filter

### 15.4 Live Updates with Active Filters

When filters are active on the Issues page, the real-time feed only shows events that match the current query. There is no explicit "live tail" feature documented in the public-facing product for arbitrary event streams (unlike Datadog's Log Tail or similar features).

---

## 16. Performance Considerations

### 16.1 Architecture for Scale

Sentry processes billions of events and must handle filtering across massive volumes:

- **Inbound filtering** at ingestion reduces stored event volume
- **Tag indexing** enables fast key:value lookups
- **Aggregation functions** are pre-computed where possible
- **Discover query** intervals are bounded (max 45 intervals per time range)
- **CSV export limits**: 10 million rows or 1GB maximum, with large exports delivered asynchronously via email with SHA1 checksums

### 16.2 UI Performance Patterns

- **URL state via nuqs**: Lightweight state synchronization without React re-renders
- **Debounced search**: Autocomplete requests are likely debounced to avoid excessive API calls
- **Tag summary facet map**: Shows only top 10 values to avoid rendering massive tag lists
- **Pagination**: Results are paginated rather than infinite-scrolled
- **Widget limits**: Dashboard time-series grouped charts limited to 10 series
- **Key transactions**: Teams can star up to 100 transactions for priority display

### 16.3 Autocomplete Performance

There have been reported issues with autocomplete endpoints timing out (GitHub issue #79418), suggesting the autocomplete system hits the backend for suggestions and can be a performance bottleneck for large organizations with many custom tags.

---

## 17. Filter Persistence

### 17.1 Page Filters (Global Persistence)

Project, environment, and date range filters **persist across page navigation**. When you set these filters, they carry over as you move between Issues, Performance, Traces, and other pages.

**Implementation:** Encoded as URL query parameters that are maintained by the routing layer.

### 17.2 Search Query Persistence

Search queries do NOT automatically persist across page navigation. They are specific to the current page/view. However, they are persisted through:
- **URL state**: Copy/share/bookmark captures the query
- **Issue Views**: Save a query as a view for persistent access
- **Discover saved queries**: Named queries persisted server-side
- **Search history**: Recent queries accessible from the dropdown
- **Browser back/forward**: URL state preserves query through navigation history

### 17.3 Widget Preferences

Dashboard widget display preferences persist in local storage until cleared.

### 17.4 Default Search

Users can set a default search query for the Issues page that applies across all projects. This is personal and not shared.

---

## 18. Issue Grouping & Filtering Interaction

### 18.1 Fingerprinting System

Sentry groups events into issues using **fingerprints**:
- Every event gets a fingerprint (auto-generated or custom)
- Events with identical fingerprints are grouped into the same issue
- Default fingerprinting uses stack trace, exception type, and message

### 18.2 Filtering at the Issue Level vs. Event Level

| Level | Behavior |
|-------|----------|
| **Issue-level filters** | Filter which issues appear in the list (e.g., `is:unresolved`, `assigned:me`) |
| **Event-level filters** | Filter based on any event within the issue matching (e.g., `browser:Chrome` returns issues with at least one Chrome event) |

This distinction is important: filtering `browser:Chrome` shows issues that have ANY event from Chrome, not exclusively Chrome issues.

### 18.3 Custom Grouping

- **Fingerprint Rules**: Server-side rules that override default grouping based on matchers (configured in Project Settings > Issue Grouping > Fingerprint Rules)
- **Stack Trace Rules**: Control which frames are used for grouping
- **Manual Merge**: Combine issues that should have been grouped together
- **Impact on filtering**: Custom grouping rules change which events share an issue, affecting how issue-level filters behave

---

## 19. Dashboard Widget Builder Filtering

### 19.1 Datasets

The widget builder supports **six datasets**:
1. **Errors** - Error event queries
2. **Spans** - Individual operation data
3. **Transactions** - Performance event data
4. **Logs** - Structured log data
5. **Issues** - Issue-level properties (table visualization only)
6. **Releases** - Session/crash rate data

### 19.2 Widget-Level Filtering

- Each widget has its own search conditions using the same query syntax
- Time-series widgets support **up to 3 overlay queries** for comparison
- Each query can have its own legend alias

### 19.3 Dashboard-Level Filtering

- Dashboard filters apply to ALL widgets
- Default filters: project, environment, date range, releases
- Custom filters can be added

### 19.4 Visualization Types

| Type | Description |
|------|-------------|
| **Area/Bar/Line** | Time-series with multiple y-axes (up to 3), grouping (up to 20 fields) |
| **Table** | Columnar data with aggregations, equations, sorting |
| **Big Number** | Single aggregate value with color thresholds |

---

## 20. Session Replay Filtering

Session Replay has the richest **interaction-level** filtering of any Sentry surface:

### 20.1 Click-Based Filtering

Unique to replays, you can filter by what users **clicked on**:
```
click.class:btn-primary
click.id:submit-button
click.selector:#section-1 span.active[role=button]
click.textContent:Save
click.component_name:CheckoutButton
click.testid:login-form
```

### 20.2 Behavioral Metrics

```
count_dead_clicks:>5           # sessions with many dead clicks
count_rage_clicks:>3           # sessions with rage clicking
activity:>7                    # highly active sessions
duration:>300                  # sessions longer than 5 minutes
```

### 20.3 Dead/Rage Click Selectors

```
dead.selector:.payment-button  # dead clicks on specific element
rage.selector:#submit-form     # rage clicks on specific element
```

---

## 21. Inbound Data Filters (Server-Side)

Distinct from UI search filters, these are **server-side ingestion filters** configured in Project Settings:

| Filter | Description |
|--------|-------------|
| **Browser Extensions** | Filter errors from known browser extensions |
| **Legacy Browsers** | Filter old browser versions (periodically updated) |
| **Web Crawlers** | Filter bot traffic (Googlebot, Bingbot, etc.) |
| **IP Addresses** | Block specific IP addresses |
| **Releases** | Ignore events from specific releases |
| **Error Messages** | Filter by error message patterns |

These filters are applied at ingest time, before events consume quota.

---

## 22. Design Patterns & Takeaways

### 22.1 Key Design Decisions

1. **Single search bar, many surfaces**: The same query syntax works everywhere, reducing learning curve across products. One syntax to learn, applicable in Issues, Discover, Traces, Replays, and Dashboards.

2. **URL as source of truth**: All filter state lives in the URL. This enables sharing, bookmarking, browser history navigation, and stateless UI components.

3. **Progressive disclosure over modes**: Rather than separate "basic" and "advanced" search modes, Sentry layers complexity. Users can click through menus (easy) or type syntax (fast), using the same search bar.

4. **Tokenized + plain text dual mode**: The evolution from SmartSearchBar to SearchQueryBuilder shows the tension between discoverability (tokens) and efficiency (text). Sentry solved this with a toggle, respecting both personas.

5. **Page filters separate from query filters**: Global context (project, environment, time) is elevated above the search bar. This reduces query complexity and enables cross-page persistence.

6. **Facet maps as filter entry points**: The tag summary visualization serves double duty as data exploration AND as a clickable filter interface. Seeing data distribution helps users decide what to filter.

7. **Issue Views replacing Saved Searches**: The move from a sidebar-based saved search list to a tab-based view system reflects a shift from "saving queries" to "creating workspaces." This is a significant UX evolution.

8. **Context-specific search properties**: Each surface (Issues, Discover, Traces, Replays) exposes only the relevant searchable properties, avoiding overwhelming users with irrelevant options.

### 22.2 Strengths

- **Powerful yet learnable**: The key:value syntax is simple enough for beginners but supports complex boolean logic for power users
- **Consistent**: Same syntax across all product surfaces
- **Shareable**: URL-encoded state makes collaboration easy
- **Data-driven discovery**: Facet maps and popular filters reduce the "blank search bar" problem
- **Extensible**: Custom tags flow naturally into the same search system

### 22.3 Weaknesses & Friction Points

- **Tokenized mode friction**: Power users report that the tokenized UI adds clicks for common operations like negation (click "is" -> change to "is not" vs. typing `!is:unresolved`)
- **Autocomplete timeouts**: Large organizations with many custom tags experience autocomplete performance issues
- **Custom tag discoverability**: Custom tags may not appear in autocomplete on all surfaces
- **OR limitations**: OR cannot mix aggregates with non-aggregates, which is not obvious from the UI
- **Boolean logic scope**: AND/OR only available in Discover and Insights, not on the basic Issues page
- **Saved searches deprecation UX**: Transition from saved searches to Issue Views requires user migration

### 22.4 Patterns to Adopt for Our Implementation

| Pattern | Priority | Rationale |
|---------|----------|-----------|
| Unified query syntax (key:value) | **Critical** | Consistency across surfaces, URL-encodable, shareable |
| Page filters (project, env, time) | **Critical** | Persistent context reduces query complexity |
| URL-as-source-of-truth | **Critical** | Enables sharing, bookmarking, browser history |
| Tokenized search with autocomplete | **High** | Discoverability for beginners |
| Plain text mode toggle | **High** | Efficiency for power users |
| Facet maps / tag summaries | **High** | Data-driven filter discovery |
| Saved views / tabs | **High** | Workspace-oriented filtering |
| Categorized filter menus | **Medium** | Organized discovery of available filters |
| Search history | **Medium** | Quick access to recent queries |
| Aggregate filters in search | **Medium** | Power feature for advanced users |
| Query equations | **Low** | Niche but powerful for data analysis |

---

## Sources

- [Sentry Search Documentation](https://docs.sentry.io/concepts/search/)
- [Sentry Searchable Properties](https://docs.sentry.io/concepts/search/searchable-properties/)
- [Sentry Issue Properties](https://docs.sentry.io/concepts/search/searchable-properties/issues/)
- [Sentry Event Properties](https://docs.sentry.io/concepts/search/searchable-properties/events/)
- [Sentry Span Properties](https://docs.sentry.io/concepts/search/searchable-properties/spans/)
- [Sentry Session Replay Properties](https://docs.sentry.io/concepts/search/searchable-properties/session-replay/)
- [Sentry Saved Searches](https://docs.sentry.io/concepts/search/saved-searches/)
- [Sentry Issue Views](https://docs.sentry.io/product/issues/issue-views/)
- [Sentry Discover Query Builder](https://docs.sentry.io/product/explore/discover-queries/query-builder/)
- [Sentry Query Equations](https://docs.sentry.io/product/explore/discover-queries/query-builder/query-equations/)
- [Sentry Widget Builder](https://docs.sentry.io/product/dashboards/widget-builder/)
- [Sentry Trace Explorer](https://docs.sentry.io/product/explore/trace-explorer/)
- [Sentry Transaction Summary](https://docs.sentry.io/product/performance/transaction-summary/)
- [Sentry Filters & Display (Insights)](https://docs.sentry.io/product/insights/overview/filters-display/)
- [Sentry Inbound Filters](https://docs.sentry.io/concepts/data-management/filtering/)
- [Sentry Issue Grouping](https://docs.sentry.io/concepts/data-management/event-grouping/)
- [Sentry Time Range Changes](https://docs.sentry.io/product/releases/usage/time-range/)
- [Sentry URL State Developer Docs](https://develop.sentry.dev/frontend/url-state/)
- [Sentry Improved Search UI Changelog](https://sentry.io/changelog/improved-search-ui/)
- [Sentry Popular Filters Changelog](https://sentry.io/changelog/2023-8-2-adding-popular-filters-to-search/)
- [Sentry Issue Views GA Changelog](https://sentry.io/changelog/new-nav-issue-views-ga/)
- [Sentry Issue Views Save Filters Changelog](https://sentry.io/changelog/issue-views-early-adopter-save-filters/)
- [Sentry Introducing Saved Searches Blog](https://blog.sentry.io/introducing-saved-searches/)
- [Sentry Asking the Right Query Blog](https://blog.sentry.io/asking-the-right-query-with-discover/)
- [GitHub: SearchQueryBuilder Replace SmartSearchBar (Issue #75007)](https://github.com/getsentry/sentry/issues/75007)
- [GitHub: Tokenized vs Raw Search Toggle (Issue #69734)](https://github.com/getsentry/sentry/issues/69734)
- [GitHub: Search Bar Plain Text Editing (Issue #82395)](https://github.com/getsentry/sentry/issues/82395)
- [Sentry Custom Tags (JavaScript SDK)](https://docs.sentry.io/platforms/javascript/enriching-events/tags/)
- [Sentry Environments](https://docs.sentry.io/concepts/key-terms/environments/)
