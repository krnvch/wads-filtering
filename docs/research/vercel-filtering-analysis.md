# Vercel Log & Observability Filtering System -- UX Research Analysis

**Date**: 2026-02-19
**Researcher**: Principal UX Researcher
**Status**: Complete

---

## Executive Summary

Vercel operates a multi-layered filtering ecosystem across five distinct surfaces: Runtime Logs, Build Logs, Observability/Query, Web Analytics, and Firewall/WAF. Each surface has evolved independently but shares consistent Geist design system DNA. The most sophisticated filtering exists in **Runtime Logs** (pill-based search bar with autocomplete) and **Observability Query** (structured query builder with AI prompting). The system demonstrates a clear progressive disclosure strategy: simple click-to-filter for beginners, typed query syntax for intermediate users, and a full query language for power users.

---

## 1. Filter UI Components

Vercel uses different UI patterns depending on the surface:

### Runtime Logs (Primary Surface)

| Component | Description |
|-----------|-------------|
| **Left Sidebar Filters** | Persistent sidebar with collapsible filter groups (Timeline, Level, Route, Host, Deployment, Resource, Request Type, Method, Path, Cache, Status Code, Environment, Branch) |
| **Search Bar (top)** | Unified text input that accepts both free-text search and structured `key:value` filter syntax |
| **Filter Pills** | Typed filters (e.g., `level:error`, `status:500`) are parsed into visual pills -- colored chips that can be removed with a click |
| **"My Requests" Toggle** | User-icon button that filters logs to the current user's IP/User-Agent |
| **Live Mode Toggle** | Button to enable real-time streaming (~5 second refresh) |
| **Time Range Selector** | Dropdown at the top for selecting predefined or custom time windows |
| **Log Detail Sidebar (right)** | Expandable right panel showing full request details when a log row is clicked |

### Observability Query Builder

| Component | Description |
|-----------|-------------|
| **Metric Selector** | Dropdown to select the visualized metric (Edge Requests, Duration, Function Invocations, etc.) |
| **Aggregation Selector** | Dropdown for aggregation type (Count, Sum, Min/Max, Percentiles, Percentages) |
| **Filter Bar ("Where" clause)** | Structured filter builder with field dropdowns, operator dropdowns, and value inputs with autocomplete |
| **Group By Selector** | Multi-select for grouping dimensions |
| **Chart Type Toggle** | Line chart, volume/bar chart, table, or big number visualization |
| **Time Range Picker** | Date picker with both relative presets and custom absolute date selection |
| **Data Granularity Dropdown** | Hourly, daily, etc. |
| **AI Prompt Input** | Natural language input for generating/modifying queries (Observability Plus) |
| **Quick Actions** | Inline copy/filter/exclude actions on individual result values |

### Web Analytics

| Component | Description |
|-----------|-------------|
| **Click-to-Filter Panels** | Data panels (Pages, Routes, Hostname, Referrers, Country, Browsers, Devices, OS) where clicking any row applies it as a filter |
| **Drill-Down Navigation** | Referrer panel supports hierarchical drill-down from domain to specific pages |
| **Date Range Picker** | Top-right dropdown with presets + calendar icon for custom date ranges |
| **Graph Drag-to-Zoom** | Click and drag across the timeline chart to zoom into a specific period |
| **UTM Parameter Filters** | Available with Web Analytics Plus |
| **Custom Events Panel** | Filterable panel for user-defined events |
| **Feature Flags Panel** | Filterable panel for feature flag data |

### Build Logs

| Component | Description |
|-----------|-------------|
| **Auto-Error Filter** | Failed builds automatically filter to show errors |
| **Color-Coded Log Lines** | Yellow for warnings, red for errors |
| **Timestamp Anchor Links** | Clicking timestamps generates shareable URLs with line number anchors (e.g., `#L6`) |

### Firewall / WAF

| Component | Description |
|-----------|-------------|
| **Traffic Type Tabs** | Filter by All, Allowed, Logged, Challenged, Denied, or Rate-Limited |
| **Custom Rule Builder** | Structured form with parameter dropdowns, operator selectors, and value inputs |
| **AND/OR Condition Toggle** | Explicit toggle for combining rule conditions |
| **Dashboard Panels** | Top IPs, Top User Agents, Top Request Paths, Denied IPs with country of origin |
| **Audit Log with Date/Time Selectors** | For viewing and restoring firewall configuration history |

---

## 2. Query Language / Syntax

Vercel operates two distinct query syntaxes:

### Runtime Logs Search Syntax

A lightweight `key:value` syntax used in the search bar:

```
level:error
status:500
method:GET
host:myapp.vercel.app
requestPath:/api/users
resource:function
cache:MISS
environment:production
branch:main
requestType:api
```

**Behavior:**
- Typing `level:error` in the search bar automatically parses it into a visual pill
- Free-text search (without a key prefix) searches the `message` and `requestPath` fields
- Pasting a Vercel Request ID auto-converts to a `requestId:` filter
- Validation occurs in real-time with tooltip error messages for invalid syntax
- Recent queries are saved per-project and appear as suggestions

### Monitoring / Observability Query Language (Legacy + Current)

A SQL-like structured query language:

```sql
-- Legacy Monitoring Syntax
VISUALIZE count(edge_requests)
WHERE host = 'vercel.com' AND status = 500
GROUP BY source_path
LIMIT 10

-- Pattern matching
WHERE host like 'acme%'
WHERE host ilike 'acme%'

-- Regular expression
WHERE match(user_agent, 'Chrome/97.*')

-- Multiple values
WHERE host in ('vercel.com', 'nextjs.com')

-- Negation
WHERE NOT status = 200

-- Combined logic
WHERE host = 'vercel.com' AND (status = 500 OR status = 502)
```

**Important:** String literals must be surrounded by single quotes.

### AI Query Prompting (Observability Plus)

Natural language input that generates structured queries:

```
"Show me the error rate for /api/checkout in the last 24 hours grouped by region"
```

This generates the equivalent structured query, represented in the URL for sharing/bookmarking.

---

## 3. Filter Categories (Dimensions)

### Runtime Logs Filter Dimensions

| Dimension | Search Key | Description |
|-----------|-----------|-------------|
| Timeline | (sidebar) | Past hour to 30 days depending on plan |
| Log Level | `level` | warning, error, fatal |
| Route | `route` | Framework-defined routes (e.g., `/blog/[slug]`) |
| Request Path | `requestPath` | Actual request paths (e.g., `/blog/my-post`) |
| Host | `host` | Domains and subdomains |
| Deployment | `deployment` | Deployment URLs |
| Deployment ID | `deploymentId` | Unique deployment identifier |
| Resource | `resource` | function, middleware, cache, rewrite, redirect |
| Request Type | `requestType` | api, ssr, isr, ppr, rsc, cron |
| Request Method | `method` | GET, POST, PUT, DELETE, etc. |
| Cache | `cache` | HIT, MISS, STALE, PRERENDER |
| Status Code | `status` | HTTP status codes (200, 404, 500, etc.) |
| Environment | `environment` | production, preview |
| Branch | `branch` | Git branch name |
| Request ID | `requestId` | Unique request identifier |
| Session ID | `sessionId` | Session identifier |
| Trace ID | `traceId` | Distributed tracing identifier |
| Invocation ID | `invocationId` | Function invocation identifier |

### Observability Query Dimensions

| Dimension | Field Name | Description |
|-----------|-----------|-------------|
| Request Hostname | `host` | Domains and subdomains |
| Project | `project` / `project_id` | Project identifier |
| Deployment ID | `deployment_id` | Deployment identifier |
| HTTP Status | `status` | HTTP response code |
| Route | `route` / `source_path` | Framework-defined route pattern |
| Request Path | `request_path` | Actual request path |
| Cache Result | `cache` | CDN cache status |
| Environment | `environment` | production or preview |
| Request Method | `request_method` | HTTP method |
| Referrer URL | `http_referer` | HTTP referrer |
| Referrer Hostname | (derived) | Referrer domain |
| Client IP | `public_ip` | Requester IP address |
| Client IP Country | (derived) | Geo-IP country |
| Client User Agent | `user_agent` | Browser/client user agent |
| AS Number | `asn` | Autonomous System Number |
| CDN Region | `region` | Edge region |
| ISR Cache Region | (derived) | ISR-specific cache region |
| Path Type | `path_type` | static, func, edge, prerender, streaming_func, etc. |
| WAF Action | `waf_action` | deny, challenge, rate_limit, bypass, log |
| WAF Rule ID | (field) | Firewall rule identifier |
| Bot Name | `bot_name` | Known crawler name |
| Error Details | `error_details` | Vercel error classification |
| Skew Protection | `skew_protection` | active or inactive |

### Web Analytics Dimensions

- Pages (URL without query params)
- Routes (framework-defined)
- Hostname
- Referrers (with drill-down to sub-pages)
- UTM Parameters (Plus only)
- Country
- Browsers
- Devices
- Operating System
- Custom Events
- Feature Flags

### Firewall Rule Condition Parameters

15+ parameters including: IP Address, Geolocation/Country, Request Path, Request Headers, Cookies, User Agent, JA3/JA4 Digests, Request Method, Rate, Payload Structure.

---

## 4. Filter Operators

### Runtime Logs Operators

The Runtime Logs search bar primarily uses exact-match `key:value` syntax. The sidebar filters support multi-select (implicit OR within a category) and the search field supports free-text matching on message content.

### Observability Query Operators

| Operator | Syntax | Description |
|----------|--------|-------------|
| Equals | `is` / `=` | Single value match |
| Not Equals | `is not` / `NOT` | Negation |
| In | `is any of` / `in` | Multiple value match |
| Not In | `is not any of` | Exclude multiple values |
| Starts With | `startsWith` | Prefix matching |
| Ends With | `endsWith` | Suffix matching |
| Like | `like` | Pattern matching with `_` (single char) and `%` (substring) wildcards -- case sensitive |
| ILike | `ilike` | Case-insensitive pattern matching |
| Regex | `match()` | Regular expression matching using Re2 syntax |
| Greater Than | `>` | Numerical comparison |
| Greater or Equal | `>=` | Numerical comparison |
| Less Than | `<` | Numerical comparison |
| Less or Equal | `<=` | Numerical comparison |

### WAF Rule Operators

All operators are case insensitive. Include operators like `inc` (contains) and `pre` (prefix) in the API. The UI exposes these through dropdown selections.

---

## 5. AND/OR Logic

### Runtime Logs

- **Between categories**: Filters across different dimensions are combined with **AND** logic (e.g., `level:error` AND `status:500` means "show me requests that have error-level logs AND returned status 500")
- **Within a category**: Multi-select within the same filter (e.g., selecting both `GET` and `POST` methods) uses **OR** logic
- **No explicit AND/OR toggle** in the search bar -- the system applies sensible defaults
- Users cannot explicitly switch between AND/OR for search bar filters

### Observability Query

- Full boolean logic with `AND`, `OR`, `NOT` operators
- Parenthetical grouping supported: `WHERE host = 'vercel.com' AND (status = 500 OR status = 502)`
- The visual filter bar UI translates into these operators

### WAF Custom Rules

- **Explicit AND/OR toggle**: Each new condition has a visible toggle to choose between AND (both conditions must match) and OR (either condition matches)
- This is the most explicit AND/OR control in Vercel's filtering ecosystem

### Web Analytics

- Multiple filters are combined with **AND** logic
- No explicit OR support in the UI -- selecting multiple items within a panel dimension narrows the view

---

## 6. Saved Filters / Views

### Runtime Logs: Search Presets

- **Save**: After configuring sidebar filters, click the "Save" button
- **Scope options**:
  - **My Project Presets**: Personal -- only visible to the creator
  - **Team Project Presets**: Shared with all team members
- **Project-scoped**: Presets are tied to specific projects and do not carry over when switching projects
- **Available on all plans**: No plan restrictions for presets

### Runtime Logs: Recent Queries

- Recent queries are automatically saved per-project
- They appear at the top of the search suggestions
- No manual management required -- they persist per browsing session context

### Observability: Notebooks

- **Purpose**: Organize and save multiple Observability queries into collections
- **Create**: From the Observability tab, click "Notebooks" in the left navigation
- **Query management**: Each notebook can contain multiple queries with different filters, time ranges, and aggregations
- **Visualization options**: Each saved query can use line chart, volume chart, table, or big number view
- **Sharing**:
  - Personal Notebooks (default): Only the creator can view
  - Team Notebooks: Shared via "Share" button -- all team members get full access to modify
- **Actions**: Duplicate, Rename, or Delete queries from the vertical ellipsis menu
- **Requires Observability Plus**

### Observability: URL Bookmarking

- AI-generated and manually-built queries are represented in the URL
- Can be shared via URL or the "Copy" button
- Can be bookmarked in the browser

### Web Analytics: URL Persistence

- Filter states are persisted as URL parameters
- Enables sharing and bookmarking of specific filter configurations

---

## 7. Keyboard Interactions

### Global Command Menu (Cmd+K / Ctrl+K)

- Opens a command palette for navigating the entire Vercel dashboard
- Supports keyboard-only navigation with arrow keys and Enter
- Recently used items appear at top (up to 3)
- Context-aware: shows different options based on current page
- Can search Vercel, Next.js, and Turborepo documentation

### Additional Dashboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd + K` / `Ctrl + K` | Open Command Menu |
| `Cmd + P` | Search Projects |
| `Cmd + T` | Search Teams |
| `T` | Toggle light/dark mode |
| `F` | Focus the Find/search input |
| `Cmd + .` / `Ctrl + .` | Hide/show Vercel Toolbar |

### Filter-Specific Keyboard Behavior

- The search bar in Runtime Logs is keyboard-accessible (focus with `F` key)
- Arrow keys navigate autocomplete suggestions
- Enter confirms a suggestion or executes the search
- Filter pills can be removed (likely Tab + Backspace/Delete, though not explicitly documented)
- No documented keyboard shortcuts for toggling specific filter categories in the sidebar

### Limitations

- Command Menu is desktop/tablet only -- not available on smartphones
- No documented Vim-style navigation
- No keyboard shortcut to jump directly to the Logs filter interface

---

## 8. Real-Time Updates

### Live Mode in Runtime Logs

- **Toggle**: Explicit "Live mode" button/option in the timeline section
- **Refresh interval**: Updates every ~5 seconds
- **Behavior**: New logs are appended without clearing existing logs or requiring manual refresh
- **Filter interaction**: Live mode respects all active filters -- only matching logs appear
- **"Show New Logs" button**: Appears at the bottom of the log list to load additional entries

### Observability

- Not real-time -- queries operate on aggregated historical data
- Time range must be explicitly selected
- Charts update when the query is re-run

### Web Analytics

- Near-real-time with some aggregation delay
- Dashboard auto-refreshes at intervals (exact interval not documented)

---

## 9. URL State

### Runtime Logs

- Filter state is encoded in the browser URL
- Clicking a log entry updates the URL to include that log's identifier
- The Share button copies the URL with all relevant query parameters
- Sharing a URL with a team member shows the same log + filter context

### Observability Query

- Queries are fully represented in the URL
- AI-generated prompts are also serialized into the URL
- Enables bookmarking and sharing of complex queries

### Web Analytics

- Filters are persisted as URL parameters (since March 2022)
- Enables sharing and bookmarking of filtered views

### Build Logs

- Clicking a timestamp appends a line anchor (e.g., `#L6`) to the URL
- Enables sharing specific log lines with team members

### General Pattern

Vercel consistently uses the URL as the source of truth for filter state across all surfaces. This is a deliberate architectural choice enabling:
1. Shareable debugging context
2. Bookmarkable investigations
3. Browser back/forward navigation through filter states
4. Team collaboration via URL sharing

---

## 10. Progressive Disclosure

Vercel employs a **three-tier progressive disclosure strategy**:

### Tier 1: Zero-Configuration (Beginners)

- Runtime Logs show all logs by default with sensible chronological ordering
- Web Analytics panels show top-level data without any filters applied
- Build Logs auto-filter to errors on failed builds
- Observability shows pre-built insight charts without query configuration
- Firewall shows traffic overview dashboard

### Tier 2: Point-and-Click (Intermediate)

- **Sidebar filters** in Runtime Logs: click to select values from predefined lists
- **Click-to-filter** in Web Analytics: click any data row to filter by it
- **Preset queries** in Observability: pre-built example queries in the left nav
- **Visual query builder** in Observability: dropdowns for metric, filter, and group by
- **Quick actions** in Observability: one-click copy/filter/exclude on values
- **Traffic type tabs** in Firewall: one-click toggle between allowed/denied/etc.
- **"My Requests" button** in Logs: one-click to see only your own requests

### Tier 3: Power User (Advanced)

- **Typed query syntax** in Logs search bar: `level:error status:500 method:GET`
- **Full query language** in Monitoring/Observability: SQL-like WHERE/GROUP BY/LIMIT
- **AI natural language prompting** in Observability Plus
- **Custom WAF rules** with AND/OR logic and regex conditions
- **Notebooks** for organizing complex query collections
- **Request ID pasting** for targeted debugging

### Key Design Principle

Each tier is accessible without needing to learn the previous tier's power features. A beginner can use Vercel Logs productively without ever learning the `key:value` syntax. But the syntax is always available when they need it, and it smoothly escalates to the full query language when they need custom metrics.

---

## 11. Filter Suggestions / Autocomplete

### Runtime Logs Search Bar

- **Data-driven suggestions**: As you type, the search bar suggests filter values based on your actual log data (not a static list)
- **Recent queries**: Previously used queries appear at the top of suggestions, saved per-project
- **Real-time validation**: Filters are validated as you type; errors are flagged with a tooltip explaining the issue
- **Auto-conversion**: Pasting a Vercel Request ID automatically converts it into a `requestId:` filter pill
- **Key suggestions**: Typing in the search bar likely suggests available filter keys (level, status, method, etc.)

### Observability Query Builder

- **Autocomplete in filter bar**: When building WHERE clauses, the field and value inputs provide autocomplete suggestions
- **No query language needed**: The UI provides dropdowns for fields, operators, and values -- all with autocomplete
- **AI prompting**: Natural language queries generate structured filters

### Web Analytics

- **Search within panels**: Each data panel (Countries, Pages, Referrers, etc.) has a search field to find specific values
- **Example**: Search for "United States" within the Country panel, then click to filter

### Firewall Custom Rules

- **Parameter dropdowns**: Pre-populated lists of available condition parameters
- **Operator dropdowns**: Context-appropriate operators based on selected parameter type

---

## 12. Visual Design

### Color System (Geist Design System)

- **Dark mode required**: All filtering UI works in both light and dark themes
- **Log level colors**:
  - Info: Default/neutral
  - Warning: Amber/yellow
  - Error: Red
  - Fatal: Red (likely a more intense variant)
- **Status code indicators**:
  - 4xx: Amber/warning color
  - 5xx: Red/error color
  - 2xx: Default/success (no special highlight)
- **Build log colors**:
  - Warnings: Yellow highlight
  - Errors: Red highlight

### Filter Pills Visual Design

- Parsed filters appear as removable chips/pills in the search bar
- Each pill is readable at a glance with the `key:value` format visible
- Pills include an 'x' button for one-click removal
- Multiple pills stack horizontally in the search bar

### Sidebar Filter Design

- Collapsible sections for each filter category
- Multi-select checkboxes or clickable list items within each category
- Search fields within certain categories (e.g., "Search hosts...")
- Count indicators showing number of active filters

### Observability Charts

- Grouped data shown as separate colors in chart view
- Separate rows in table view
- Hover tooltips on chart data points showing detailed values
- Click-and-drag zoom on timeline charts

### Visual Hierarchy (Runtime Logs)

```
+------------------------------------------------------------------+
| [Search Bar: key:value pills + free text] [Time Range] [Live]    |
+------------------------------------------------------------------+
| Sidebar Filters  |  Log List (main area)        |  Log Detail    |
|                  |                               |  (right panel) |
| [Timeline]       |  [Log Row] status method path |  Request info  |
| [Level]          |  [Log Row] status method path |  Headers       |
| [Route]          |  [Log Row] status method path |  Function meta |
| [Host]           |  [Log Row] status method path |  Events        |
| [Deployment]     |  ...                          |  Log Messages  |
| [Resource]       |                               |                |
| [Request Type]   |  [Show New Logs]              |                |
| [Method]         |                               |                |
| [Path]           |                               |                |
| [Cache]          |                               |                |
| [Status Code]    |                               |                |
| [Environment]    |                               |                |
| [Branch]         |                               |                |
+------------------------------------------------------------------+
```

### Visual Hierarchy (Observability Query)

```
+------------------------------------------------------------------+
| [Metric Selector] [Aggregation] | [Time Range] [Granularity]     |
+------------------------------------------------------------------+
| [Filter Bar: field | operator | value]  [+ Add Filter]           |
+------------------------------------------------------------------+
| [Group By: field1, field2]              [Chart Type Toggle]       |
+------------------------------------------------------------------+
|                                                                   |
|  [Chart Area: line/bar/table visualization]                       |
|                                                                   |
+------------------------------------------------------------------+
| [Table: grouped results with drill-down links]                    |
+------------------------------------------------------------------+
```

---

## 13. Time Range Selection

### Runtime Logs

| Option | Description |
|--------|-------------|
| **Predefined ranges** | Past 30 minutes, Past hour, Past 3 hours, Past 24 hours, Past 3 days (plan-dependent) |
| **Custom timespan** | Available depending on plan tier |
| **Live mode** | Real-time streaming with ~5s refresh |
| **Default** | Past 30 minutes |

**Retention limits by plan:**
- Hobby: 1 hour
- Pro: 1 day
- Pro + Observability Plus: 30 days (up to 14 consecutive days viewable)
- Enterprise: 3 days
- Enterprise + Observability Plus: 30 days

### Observability / Monitoring

- **Date picker**: Calendar-based absolute date selection
- **Time range selector**: Relative time presets
- **Data granularity**: Hourly, daily, etc. (affects chart resolution)
- **Click-and-drag zoom**: Select a period on the chart and press "Zoom In"

### Web Analytics & Speed Insights

- **Predefined timeframes**: Dropdown in top-right of the page
- **Custom date range**: Calendar icon opens a date picker for absolute dates
- **Drag-to-zoom**: Click and drag across the graph to focus on a specific period

### All Times in UTC

All displayed dates and times across Vercel surfaces are shown in UTC.

---

## 14. Empty States

### Design System (Geist)

Vercel's Geist design system defines four empty state patterns:

1. **Blank Slate**: Basic first-run experience with a title, description, icon, primary CTA, and supporting links
2. **Informational**: In-line CTAs and supplemental documentation links emphasizing feature value
3. **Educational**: Launches contextual onboarding flows
4. **Guide**: Starter content that allows interaction with sample data

### Applied to Filtering

- **No matching logs**: When Runtime Log filters return no results, an empty state is shown (likely the Informational pattern with suggestions to broaden filters)
- **No data in time range**: When the selected time range has no logs (common on Hobby plan with 1-hour retention)
- **Build logs empty**: Build logs show build progress; empty state appears when build hasn't started
- **Web Analytics zero traffic**: Clean empty state prompting analytics setup

### Key Principle

Empty states are designed to "prevent confusion" and "keep users working in a productive way" -- they always provide context about what action to take next.

---

## 15. Performance Patterns

### Log Streaming Architecture

- Logs are streamed, not batch-loaded
- Each log line: up to 256 KB
- Each request: up to 1 MB total, max 256 log lines
- Live mode refreshes every ~5 seconds (not WebSocket -- polling-based)

### Data Loading

- **"Show New Logs" button**: Manual pagination rather than infinite scroll -- prevents runaway DOM growth
- **Chronological sorting**: Most recent logs first, optimized for "what just happened?" debugging
- **Filter-first loading**: Filters are applied server-side -- the client only receives matching logs
- **Build log truncation**: Automatically truncated at 4 MB to prevent performance issues

### Query Performance

- **Limit clause**: Controls maximum results in Observability queries to prevent overwhelming responses
- **"Others" bucket**: When results exceed the limit, remaining results are compiled as "Other(s)"
- **Granularity-based aggregation**: Hourly vs. daily aggregation affects query performance and response size

### Firewall

- Configuration changes propagate globally within 300ms
- Instant rollback capability for firewall rules

### General Patterns

- URL state serialization is lightweight (query parameters, not heavy JSON)
- Autocomplete suggestions are derived from actual data (requires server-side indexing)
- Presets/Notebooks save query definitions, not result caches
- Charts use time-bucketed aggregations rather than raw data points

---

## Surface-Specific Deep Dives

### A. Runtime Logs -- The Most Evolved Filtering System

The Runtime Logs filtering system is the most mature and feature-rich in Vercel's ecosystem. Key design decisions:

1. **Dual input model**: The sidebar filters and search bar are synchronized -- using one updates the other
2. **Progressive query building**: Users can start with sidebar clicks and watch the search bar populate with the equivalent `key:value` syntax, learning the query language organically
3. **Smart paste detection**: Recognizing and auto-converting Request IDs reduces friction for the most common debugging workflow
4. **Per-project context**: Recent queries and presets are project-scoped, acknowledging that different projects have different debugging patterns
5. **Team collaboration via URL**: The URL is the primary sharing mechanism, not a dedicated "share" feature

### B. Observability Query -- The Power User Surface

The Observability Query builder is designed for infrastructure teams:

1. **No-code query building**: Dropdowns and autocomplete let users build WHERE/GROUP BY queries without knowing SQL syntax
2. **AI bridge**: Natural language prompting bridges the gap between "I know what I want to know" and "I know how to express it as a query"
3. **Notebook organization**: Mirrors the mental model of data analysis workflows -- not just individual queries but collections of related investigations
4. **URL-as-API**: Every query state is in the URL, making queries a first-class shareable artifact

### C. Web Analytics -- The Simplest Filter Model

Web Analytics uses the most approachable filtering model:

1. **Click-to-filter**: No syntax to learn, no search bar to type in -- just click data you want to focus on
2. **Drill-down for depth**: Referrer panel supports hierarchical exploration without needing query syntax
3. **Graph interaction**: Drag-to-zoom provides time filtering through direct manipulation

### D. Firewall/WAF -- The Rule-Builder Pattern

The WAF filtering is distinct because it defines persistent rules, not ephemeral queries:

1. **Explicit AND/OR**: The only surface where users explicitly choose boolean operators
2. **Condition builder**: Structured form input, not free-text query
3. **Immediate effect**: 300ms global propagation makes the feedback loop extremely tight
4. **Audit log for history**: Emphasizes reversibility and accountability

---

## Key Patterns for Our Implementation

### What Vercel Does Well

1. **URL as source of truth**: Every filter state is bookmarkable and shareable
2. **Progressive disclosure works**: Three tiers (click, type, query) serve beginners to power users
3. **Data-driven autocomplete**: Suggestions from actual data, not static lists
4. **Visual pills**: Typed filters become readable, removable visual elements
5. **Real-time validation**: Errors caught before execution with helpful tooltips
6. **Team collaboration**: Presets and Notebooks have personal vs. team scoping
7. **Consistent time handling**: UTC everywhere, plan-appropriate retention limits

### Where Vercel Has Gaps

1. **No explicit AND/OR in Logs**: Users cannot combine filters with OR across categories in Runtime Logs
2. **Limited free-text search**: Only searches `message` and `requestPath` fields
3. **No regex in Logs search bar**: Regex is only available in the full Observability query language
4. **Keyboard shortcuts are sparse**: No shortcuts for filter-specific actions
5. **No saved filter sharing via link for Logs presets**: Presets require being on the same team/project
6. **Build Logs have minimal filtering**: No structured filter system for build output
7. **No cross-project filtering**: Each surface is project-scoped
8. **Live mode is polling, not streaming**: ~5s delay is noticeable for real-time debugging

### Design Principles Observed

1. **Filters are non-destructive**: Applying filters never changes the underlying data
2. **Filters are composable**: Multiple filters can be stacked
3. **Filters are visible**: Active filters are always displayed prominently
4. **Filters are removable**: One-click to remove any individual filter
5. **Filters are shareable**: URL state enables collaboration
6. **Filters have sensible defaults**: Reasonable time ranges and sort orders out of the box
7. **Filters are fast**: Server-side filtering prevents client-side performance issues

---

## Sources

- [Runtime Logs Documentation](https://vercel.com/docs/logs/runtime)
- [Redesigned Search and Filtering for Runtime Logs](https://vercel.com/changelog/redesigned-search-and-filtering-for-runtime-logs)
- [Create Search Presets for Runtime Logs](https://vercel.com/changelog/create-search-presets-for-your-runtime-logs)
- [Filter for Your Own Requests in Logs](https://vercel.com/changelog/filter-for-your-own-requests-in-logs)
- [Enhanced Logs UI](https://vercel.com/changelog/enhanced-logs-ui-to-search-inspect-and-share-application-logs)
- [Improved Live Mode in Runtime Logs](https://vercel.com/changelog/improved-live-mode-in-runtime-logs)
- [Observability Documentation](https://vercel.com/docs/observability)
- [Query Reference](https://vercel.com/docs/query/reference)
- [Monitoring Reference](https://vercel.com/docs/query/monitoring/monitoring-reference)
- [Run and Share Custom Queries in Observability Plus](https://vercel.com/changelog/run-and-share-custom-queries-in-observability-plus)
- [AI Query Prompting in Observability Plus](https://vercel.com/changelog/ai-query-prompting-now-available-in-observability-plus)
- [New Quick Actions in Observability](https://vercel.com/changelog/new-quick-actions-in-observability)
- [Notebooks Documentation](https://vercel.com/docs/notebooks)
- [Filtering Analytics Documentation](https://vercel.com/docs/analytics/filtering)
- [Filter by Custom Date Ranges in Web Analytics](https://vercel.com/changelog/filter-by-custom-date-ranges-in-web-analytics)
- [Filter by Custom Date Ranges in Speed Insights](https://vercel.com/changelog/filter-by-custom-date-ranges-in-speed-insights)
- [Vercel WAF Documentation](https://vercel.com/docs/vercel-firewall/vercel-waf)
- [WAF Rule Configuration Reference](https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration)
- [Using the Command Menu](https://vercel.com/docs/dashboard-features/command-menu)
- [Geist Empty State](https://vercel.com/geist/empty-state)
- [Filters Persisted for Vercel Analytics](https://vercel.com/changelog/filters-are-persisted-for-vercel-analytics)
- [Deployment Logs Filtering](https://vercel.com/changelog/deployment-logs-filtering-now-available)
- [Accessing Build Logs](https://vercel.com/docs/deployments/logs)
