# Comparative Analysis: Complex Filtering Patterns Across Developer Tools & Productivity Platforms

**Author**: Principal UX Researcher & Product Designer
**Date**: 2026-02-19
**Status**: Research Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product-by-Product Analysis](#product-by-product-analysis)
   - [Developer Tools](#developer-tools)
   - [Productivity & Project Management](#productivity--project-management)
   - [Search & Reference Points](#search--reference-points)
3. [Cross-Product Synthesis](#cross-product-synthesis)
4. [Pattern Taxonomy](#pattern-taxonomy)
5. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
6. [Recommendations for Our System](#recommendations-for-our-system)

---

## Executive Summary

This research analyzes filtering patterns across 14 major developer tools and productivity platforms. The analysis reveals a clear industry trajectory: **the best tools offer a dual-mode interface** (visual builder + text-based query language) with **progressive disclosure** that serves both novice and power users. The most significant emerging trend is the integration of **natural language querying** (NLQ) as a third input modality alongside visual and text modes.

Key findings:

- **Every observability tool** (Datadog, Grafana, Kibana, Splunk, New Relic, CloudWatch) has a dedicated query language. This is table stakes for developer-facing filtering.
- **Dual-mode editing** (visual builder <-> code editor) is the gold standard, but **bidirectional sync has known limitations** in every product that implements it.
- **Faceted filtering with a sidebar** is the dominant pattern for exploratory filtering in data-heavy tools.
- **Filter pills/badges** showing active filters are universal across all categories.
- **Saved views/filters** are expected in every product, but implementation quality varies wildly.
- **Natural language query** is the fastest-growing new modality (Datadog, CloudWatch, and Looker lead here).
- **Keyboard-first design** remains underdeveloped in most products outside of the query editor itself.

---

## Product-by-Product Analysis

---

### Developer Tools

---

#### 1. Datadog -- Log Explorer, APM, Infrastructure Filtering

**Query Language**: Yes. Datadog uses a proprietary search syntax based on `key:value` pairs with boolean operators. Reserved attributes (host, source, status, service, trace_id, message) do not require the `@` prefix. Custom attributes use `@attribute:value` syntax. Supports wildcards, numeric ranges, boolean grouping with parentheses, and negation.

Example: `service:web-app status:error @http.status_code:>500 -env:staging`

**Visual Builder**: Yes. The **Facet Panel** on the left sidebar provides point-and-click filtering. Qualitative facets show a top list of unique values with counts -- clicking toggles the search. Quantitative measures display sliders for min/max range filtering. Users can hide irrelevant facets to reduce noise.

**Dual Mode**: The facet panel and query bar are **fully synchronized**. Clicking a facet value appends it to the query string. Editing the query string updates the facet selection state. This is one of the smoothest dual-mode implementations in the industry.

**Progressive Disclosure**:
- Level 1: Click facets in the sidebar (zero learning curve)
- Level 2: Type `key:value` queries in the search bar (moderate learning)
- Level 3: Natural Language Queries -- type plain English and Datadog translates to structured queries (e.g., "Top 20 services by errors")
- Level 4: Complex boolean expressions with nested grouping

**Keyboard-first**: Moderate. `Cmd+K` opens the global quick-nav menu for navigating anywhere in Datadog. The search bar supports standard text editing shortcuts (Cmd+A, Cmd+C, etc.). Autocomplete suggestions appear as you type. However, facet interaction remains mouse-driven.

**Saved Filters/Views**: **Saved Views** persist the full Log Explorer state: query, time range, visualization type, selected columns, facet configuration, and sort order. Saved Views are accessible from the top-left corner. They support personal and shared views for team collaboration.

**Notable Innovations**:
- **Natural Language Queries (NLQ)**: Click "Ask" in the search field to describe what you're looking for in plain English. Datadog translates this to a structured query. This is one of the most polished NLQ implementations in the observability space.
- **Pattern Detection**: Automatic grouping of similar log lines into patterns, surfacing noisy error patterns that would otherwise obscure other issues.
- **Clipboard** (`Cmd+Shift+K`): A cross-product clipboard for sharing context (signals, graphs, URLs) between Datadog pages during investigation workflows.

**Weaknesses**:
- The query syntax, while powerful, is proprietary -- no transferable skill to other tools.
- Facet management can become unwieldy with high-cardinality attributes.
- NLQ is impressive but can produce incorrect translations for ambiguous queries, and there is no transparency into how the translation works.

**Sources**: [Log Explorer](https://docs.datadoghq.com/logs/explorer/), [Search Syntax](https://docs.datadoghq.com/logs/explorer/search_syntax/), [Saved Views](https://docs.datadoghq.com/logs/explorer/saved_views/), [Log Facets](https://docs.datadoghq.com/logs/explorer/facets/), [Quick Nav](https://www.datadoghq.com/blog/datadog-quick-nav-menu/)

---

#### 2. Grafana -- Log/Metric Filtering, Query Builder

**Query Language**: Yes. Uses **LogQL** (for Loki) and **PromQL** (for Prometheus). LogQL is a log-specific query language with stream selectors, filter expressions, and aggregation. PromQL handles metric queries.

LogQL Example: `{job="nginx"} |= "error" | json | status >= 400`

**Visual Builder**: Yes. **Builder Mode** provides a structured visual interface:
- Label selector dropdowns (Grafana fetches available values from the server)
- `+` button to add labels, `x` to remove
- **Operations section**: Chainable operation boxes (line filter, JSON parser, label filter, etc.) that can be added and reordered
- Operations are visually rendered as discrete boxes in a pipeline

**Dual Mode**: Yes. Builder and Code tabs with synchronized state. You can switch between them without losing work. **Critical limitation**: Builder mode cannot represent all valid LogQL queries. When switching from Code to Builder with an unsupported query, the editor displays a warning that parts of the query may be lost.

**Progressive Disclosure**:
- Level 1: Select labels from dropdowns in Builder mode
- Level 2: Add operations (line filters, parsers) visually
- Level 3: Switch to Code mode for full LogQL power
- Level 4: Pattern-based filtering with simplified pattern match operators (Loki 3.0+)

**Keyboard-first**: Moderate in Code mode. Autocompletion works automatically while typing, suggesting static functions, aggregations, keywords, and dynamic labels. Builder mode is primarily mouse-driven.

**Saved Filters/Views**: Queries can be saved as part of dashboard panels. No dedicated "saved query" feature at the explorer level -- persistence is tied to dashboards and panels.

**Notable Innovations**:
- **Visual operation pipeline**: The box-based operation chain is an excellent mental model for data transformation. Users can see each step of their query as a discrete operation.
- **Pattern filtering** (Loki 3.0+): Simplified pattern match filter operator that is much faster than regex, making common filtering tasks more accessible.
- **Regex variable filtering** (2025): Filter query variable values more effectively with regex patterns.
- **Group-by labels** (2025): Group metrics by specific label names for easier pattern identification.

**Weaknesses**:
- Builder-to-Code sync is lossy for complex queries -- this creates a "cliff" where users get stuck.
- LogQL and PromQL are two different languages users need to learn.
- Saved queries lack first-class treatment outside of dashboards.

**Sources**: [Loki Query Editor](https://grafana.com/docs/grafana/latest/datasources/loki/query-editor/), [LogQL Docs](https://grafana.com/docs/loki/latest/query/log_queries/), [Query Builder Blog](https://grafana.com/blog/2022/07/05/new-in-grafana-9-the-grafana-loki-query-builder-makes-writing-logql-queries-easier/), [Metrics Drilldown 2025](https://grafana.com/blog/2025/05/29/whats-new-in-grafana-metrics-drilldown-advanced-filtering-options-ui-enhancements-and-more/)

---

#### 3. New Relic -- NRQL Query Language, Filtering UI

**Query Language**: Yes. **NRQL (New Relic Query Language)** is SQL-like. It supports SELECT, FROM, WHERE, FACET, SINCE, UNTIL, LIMIT, ORDER BY, and more.

Example: `SELECT count(*) FROM Transaction WHERE appName = 'MyApp' AND duration > 1 FACET name SINCE 1 hour ago`

**Visual Builder**: Yes. New Relic created a **point-and-click query tool and chart builder** (basic mode) that lets users:
- Select a query type and data sources
- Apply filters through dropdown menus
- Compare multiple data sets visually
- Choose visualization types
- The system auto-suggests relevant attributes as you type

**Dual Mode**: Yes. Basic (visual) and NRQL (code) modes. The visual builder generates NRQL behind the scenes, and users can switch to the NRQL view to see/edit the raw query.

**Progressive Disclosure**:
- Level 1: Basic mode point-and-click chart builder
- Level 2: Add WHERE clauses, FACET groups
- Level 3: Switch to NRQL mode for full query power
- Level 4: PromQL-style mode for users coming from Prometheus

**Keyboard-first**: Moderate. The query builder is accessible from the "Query your data" drawer at the bottom of any New Relic page. Auto-suggestions from the FROM clause populate relevant attributes. Substring search auto-populates as you type.

**Saved Filters/Views**: Queries can be saved to dashboards. Custom visualizations and charts can be created and shared.

**Notable Innovations**:
- **Auto chart type selection**: The query builder analyzes the data and automatically selects the most effective chart type, with the option to override.
- **Persistent query drawer**: Available at the bottom of any page, reducing context-switching.
- **Multi-language support**: Both NRQL and PromQL-style queries in the same interface.

**Weaknesses**:
- The visual builder is relatively basic compared to Datadog's facet panel.
- No natural language query support (lagging behind Datadog and CloudWatch).
- The learning curve from basic mode to NRQL is steep -- there is no intermediate mode.

**Sources**: [NRQL Introduction](https://docs.newrelic.com/docs/nrql/get-started/introduction-nrql-new-relics-query-language/), [Query Builder](https://docs.newrelic.com/docs/query-your-data/explore-query-data/query-builder/introduction-query-builder/), [NRQL Mode](https://docs.newrelic.com/docs/query-your-data/explore-query-data/query-builder/use-advanced-nrql-mode-query-data/)

---

#### 4. Kibana/Elasticsearch -- KQL, Filter Bar

**Query Language**: Yes. **KQL (Kibana Query Language)** is a simplified text-based query language for filtering. Also supports **Lucene syntax** (legacy) and the newer **ES|QL** for more complex operations.

KQL Example: `status: "error" and response >= 500 and not agent.name: "healthcheck"`

**Visual Builder**: Yes. The **filter bar** supports multiple interaction modes:
- **Text query bar** with KQL/Lucene toggle (visible as a label on the right side)
- **Filter pills**: Clickable pill-shaped badges below the query bar showing active filters
- **Direct manipulation**: Click on visualization elements (e.g., a bar in a chart) to add a filter
- **Add filter button**: Opens a form with field/operator/value dropdowns

**Dual Mode**: Yes. KQL text bar + visual filter pills coexist in the same interface. Users can switch between KQL and Lucene using a toggle. Filter pills and query text operate in parallel rather than being bidirectionally synced (they represent different layers of filtering).

**Progressive Disclosure**:
- Level 1: Click on visualizations to filter (direct manipulation)
- Level 2: Use the "Add filter" form with dropdowns
- Level 3: Type KQL queries in the search bar
- Level 4: Switch to Lucene or ES|QL for advanced queries

**Keyboard-first**: Good. The query bar offers autocomplete for field names and previously-seen values as you type. The first 15 matches are displayed alphabetically. Users can type to narrow suggestions.

**Saved Filters/Views**: Two distinct persistence mechanisms:
- **Saved Queries**: Preserves query text + filters only. Can optionally include/exclude time range.
- **Saved Searches**: Preserves the full Discover state (query, filters, columns, sort order, data view).
- **Pinned filters**: Individual filters can be "pinned" to persist across page navigation.
- Reusable across Dashboard, Visualize, and Discover.

**Notable Innovations**:
- **Filter pills as first-class objects**: Each pill can be individually edited, disabled (without removing), pinned (sticky across pages), negated, or deleted. This granular control is best-in-class.
- **Multi-modal filtering**: Text query + visual pills + direct manipulation on charts -- three complementary input methods.
- **Cross-application saved queries**: Save once, reuse across Dashboard, Visualize, and Discover.

**Weaknesses**:
- The distinction between "saved queries" and "saved searches" is confusing (acknowledged in [GitHub issue #153809](https://github.com/elastic/kibana/issues/153809)).
- KQL is limited to filtering only -- users must learn ES|QL for aggregation/transformation.
- The "Add filter" form is functional but visually dated.
- Filter pills and query text being separate layers can cause confusion about which filters are actually active.

**Sources**: [KQL Docs](https://www.elastic.co/docs/explore-analyze/query-filter/languages/kql), [Saved Queries](https://www.elastic.co/guide/en/kibana/current/save-load-delete-query.html), [Save a Search](https://www.elastic.co/docs/explore-analyze/discover/save-open-search), [ES|QL in Kibana](https://www.elastic.co/docs/explore-analyze/query-filter/languages/esql-kibana)

---

#### 5. Splunk -- SPL Search Language, Filtering Interface

**Query Language**: Yes. **SPL (Search Processing Language)** and the newer **SPL2**. SPL is a pipe-based language inspired by Unix pipelines and SQL. Commands are chained with the `|` operator.

SPL Example: `index=main sourcetype=access_combined status>=400 | stats count by status, uri_path | sort -count`

**Visual Builder**: Limited. Splunk does not have a full visual query builder comparable to Grafana or New Relic. Instead, it offers:
- **Search Assistant** (Compact and Full modes): Provides autocomplete, matching searches, matching terms, and usage examples as you type
- **Prebuilt dashboards and reports** with clickable filter elements
- SPL2 introduces a **multi-statement module editor** with richer autocomplete and in-product documentation

**Dual Mode**: No true dual mode. SPL is the primary interface. Visual filtering is limited to dashboard interactions and the Search Assistant's autocomplete guidance.

**Progressive Disclosure**:
- Level 1: Use prebuilt dashboards with clickable filters
- Level 2: Search Assistant guides query construction with autocomplete
- Level 3: Write SPL queries directly
- Level 4: SPL2 with advanced JSON processing, views, and multi-statement modules

**Keyboard-first**: Strong for the text editor. The Search Assistant operates entirely from the keyboard, providing inline documentation, examples, and command-specific help as you type. However, there is no global keyboard shortcut system or command palette.

**Saved Filters/Views**: Searches can be saved as **reports** (scheduled or on-demand). Dashboards can embed saved searches. SPL2 introduces **views** for reusable query fragments.

**Notable Innovations**:
- **Search Assistant comprehensiveness**: Not just autocomplete -- it provides usage examples, command documentation, and recent search history inline as you type. This is the most thorough inline help system across all tools studied.
- **SPL2 module editor**: Multi-statement editing with rich autocomplete represents the next evolution of query-language interfaces.
- **Pipe-based mental model**: The Unix pipeline metaphor is intuitive for developers and maps well to data transformation workflows.

**Weaknesses**:
- Heavy reliance on text-based queries makes Splunk inaccessible to non-technical users.
- No visual query builder means no progressive on-ramp from clicks to code.
- The learning curve for SPL is one of the steepest among all tools studied.
- SPL and SPL2 coexistence creates confusion during the transition period.

**Sources**: [About SPL](https://docs.splunk.com/Documentation/Splunk/9.4.2/Search/Aboutthesearchlanguage), [Search Assistant](https://docs.splunk.com/Documentation/SplunkCloud/latest/Search/Usingthesearchassistant), [SPL2 Introduction](https://www.splunk.com/en_us/blog/platform/introducing-spl2-the-next-generation-search-data-preparation-language-for-splunk.html)

---

#### 6. PagerDuty -- Incident Filtering

**Query Language**: No dedicated query language. Filtering is primarily form-based with predefined parameters.

**Visual Builder**: Yes (simple). The incident list page provides:
- **Status tabs**: Open, Triggered, Acknowledged, Resolved, Any Status
- **Left panel filters**: Team, Service, Date Range
- **Fuzzy search**: Text search with tolerance for misspellings
- Multiple selections supported for Team and Service filters

**Dual Mode**: No. PagerDuty is visual-only for filtering.

**Progressive Disclosure**:
- Level 1: Status tabs (one-click)
- Level 2: Search bar with fuzzy matching
- Level 3: Left panel facets (Team, Service, Date Range)
- No level 4 -- advanced queries are not supported

**Keyboard-first**: Minimal. Basic text search input. No command palette or keyboard shortcuts for filter manipulation.

**Saved Filters/Views**: Limited. No dedicated saved filter system at the incident level.

**Notable Innovations**:
- **Fuzzy search by default**: Recognizes approximate matches for misspelled terms, reducing friction during high-stress incident response.
- **Status-based primary navigation**: Simple tabs for the most critical filter dimension (incident status) -- appropriate for the urgency of the use case.

**Weaknesses**:
- The filtering interface is simplistic for an enterprise incident management tool.
- No saved searches or custom views.
- Advanced filtering with multiple parameters is described as "daunting" by users.
- No way to express complex boolean logic.

**Sources**: [PagerDuty Search](https://support.pagerduty.com/main/docs/search), [Navigate Incidents Page](https://support.pagerduty.com/main/docs/navigate-the-incidents-page), [API Filtering](https://developer.pagerduty.com/docs/filtering)

---

#### 7. Cloudflare -- Security Events, Analytics Filtering

**Query Language**: Yes. Based on **Wireshark display filter syntax** (via the open-source [wirefilter](https://github.com/cloudflare/wirefilter) engine). Familiar to security engineers.

Example: `(http.request.uri.path eq "/admin" and ip.src ne 192.168.1.1) or (cf.threat_score gt 50)`

**Visual Builder**: Yes. The **Expression Builder** provides:
- Drop-down lists for fields, operators, and values
- Add/remove sub-expression rows
- AND/OR conjunction selection between rows
- Hover-to-filter on analytics data legends (quick "Filter" or "Exclude" buttons)

**Dual Mode**: Yes. **Expression Builder** (visual) and **Expression Editor** (text) can be toggled. However:
- Nested expressions are only supported in the Editor
- Grouping symbols are only supported in the Editor and API
- Switching from Editor to Builder may fail if advanced features are used, with a warning popup

**Progressive Disclosure**:
- Level 1: Hover over analytics data and click "Filter" or "Exclude" (direct manipulation)
- Level 2: Expression Builder with dropdown-based row construction
- Level 3: Expression Editor with full text-based syntax
- Level 4: API-level expressions with no complexity limits

**Keyboard-first**: Low. The Expression Builder is mouse-driven. The Expression Editor supports standard text editing. No command palette or filter-specific shortcuts.

**Saved Filters/Views**: Filters are embedded in saved rules (WAF rules, page rules, etc.). No standalone saved filter/view system for analytics.

**Notable Innovations**:
- **Direct manipulation on analytics**: Hover over any data point and click "Filter" or "Exclude" -- this is one of the most natural filter-creation patterns. Seeing a suspicious IP? One click to filter to it or exclude it.
- **Wireshark-compatible syntax**: Leverages existing knowledge for security engineers rather than inventing a proprietary language.
- **Anomaly surfacing**: Suspicious activity detected by Cloudflare is highlighted at the top of the page with quick action links, guiding users to relevant filters before they even ask.

**Weaknesses**:
- The Expression Builder is limited compared to the Editor -- cannot handle nesting or grouping.
- The builder-to-editor gap is a cliff, not a ramp.
- Expressions have a complexity limit that is easily reached with many joined/nested clauses.
- No saved views for analytics/security events dashboards.

**Sources**: [Security Events](https://developers.cloudflare.com/waf/analytics/security-events/), [Edit Expressions](https://developers.cloudflare.com/ruleset-engine/rules-language/expressions/edit-expressions/), [Rules Language](https://developers.cloudflare.com/ruleset-engine/rules-language/), [wirefilter](https://github.com/cloudflare/wirefilter)

---

### Productivity & Project Management

---

#### 8. Jira -- JQL Query Language, Basic/Advanced Filter Modes

**Query Language**: Yes. **JQL (Jira Query Language)** is SQL-like with fields, operators, values, and keywords (AND, OR, NOT, ORDER BY, etc.).

Example: `project = "MYPROJ" AND status = "In Progress" AND assignee = currentUser() ORDER BY priority DESC`

**Visual Builder**: Yes. **Basic Search Mode** provides:
- Dropdown filters for Project, Type, Status, Assignee, and more
- Multi-select within each dropdown
- Text contains field for keyword search
- Each dropdown includes search-within-dropdown functionality

**Dual Mode**: Yes. "Switch to JQL" / "Switch to basic" toggles between modes. The system translates basic search selections into JQL automatically. **Critical limitation**: Some JQL queries are too complex to display in basic mode, so the switch is **unidirectional for complex queries** (JQL -> basic may fail).

**Progressive Disclosure**:
- Level 1: Basic mode with dropdown filters (most common)
- Level 2: Combine multiple dropdowns in basic mode
- Level 3: Switch to JQL for ORDER BY, functions, complex boolean logic
- Level 4: Advanced JQL with sub-queries, custom functions, CHANGED operators

**Keyboard-first**: Good in JQL mode. Auto-complete suggestions appear as you type (first 15 matches, alphabetically). The JQL editor provides code-hint-style suggestions. Basic mode is primarily mouse-driven.

**Saved Filters/Views**: First-class feature. Saved filters are:
- Accessible in the left sidebar
- Shareable with teams or made public
- Usable as board filters, dashboard gadget sources, and subscription triggers
- Starred for quick access

**Notable Innovations**:
- **Learning bridge**: Users can build a query in Basic mode, then switch to JQL to see the generated syntax -- this is an exceptional teaching tool for the query language.
- **Saved filters as infrastructure**: Filters aren't just personal convenience -- they power boards, dashboards, and notifications. This makes them central to workflow, not an afterthought.
- **JQL functions**: `currentUser()`, `startOfWeek()`, `membersOf()` etc. provide dynamic, context-aware filtering.

**Weaknesses**:
- The JQL learning curve is significant, and the autocomplete showing only 15 results can be insufficient.
- Basic mode is too basic -- there's a large gap between "select from dropdowns" and "write JQL."
- No intermediate query builder (no visual boolean logic, no drag-and-drop filter construction).
- Switching from JQL to basic mode fails silently for complex queries with no helpful error message.

**Sources**: [JQL Overview](https://www.atlassian.com/software/jira/guides/jql/overview), [JQL Cheat Sheet](https://www.atlassian.com/software/jira/guides/jql/cheat-sheet), [Advanced Search](https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/), [Basic Search](https://support.atlassian.com/jira-service-management-cloud/docs/use-basic-search-and-filters-to-quickly-find-requests-and-issues-in-jira/)

---

#### 9. Notion -- Database Filtering, Views System

**Query Language**: No. Notion uses a purely visual filter system.

**Visual Builder**: Yes. Notion's database filtering uses a structured visual builder:
- **Simple filters**: Single-condition filters applied per property (property + operator + value)
- **Advanced filters**: Filter groups with nested AND/OR logic, up to **3 levels of nesting**
- **Quick conversion**: Convert a simple filter into an advanced filter with one click via `... > Add to advanced filter`

**Dual Mode**: No. Visual only, no text-based query language.

**Progressive Disclosure**:
- Level 1: Quick filter on a single property
- Level 2: Multiple simple filters (implicit AND)
- Level 3: Advanced filter with AND/OR groups
- Level 4: Nested filter groups up to 3 levels deep

**Keyboard-first**: Low. Filter creation and management is mouse-driven. No keyboard shortcuts for filter manipulation.

**Saved Filters/Views**: Central to Notion's data model:
- Each database can have **multiple views** (Table, Board, Calendar, Gallery, Timeline, List)
- Each view has its own filter, sort, group, and visible property configuration
- Filters can be **saved for everyone** (shared) or **applied individually**
- New rows created in a filtered view automatically conform to the filter (auto-set default property values)
- Views are tabs at the top of the database -- instantly switchable

**Notable Innovations**:
- **Views as first-class citizens**: Each view is a complete lens on the same data -- filters, layout, grouping, and visible fields are all bundled. This is the most holistic "saved filter" implementation studied.
- **Self-referential filters**: A filter can reference the page it is contained within, enabling powerful relational filtering patterns.
- **Auto-conforming new rows**: When you create a new item in a filtered view, the new item automatically satisfies the filter criteria. This is a brilliant detail that reduces friction.
- **Nested filter groups**: Up to 3 levels of AND/OR nesting covers most complex filtering needs without requiring a query language.

**Weaknesses**:
- No text-based query alternative -- power users can't express filters as strings for sharing, documenting, or scripting.
- 3-level nesting limit can be restrictive for truly complex queries.
- The advanced filter UI can become visually overwhelming with many nested groups.
- No filter templates or presets -- users must build from scratch each time.

**Sources**: [Views, Filters, Sorts & Groups](https://www.notion.com/help/views-filters-and-sorts), [Advanced Database Filters](https://www.notion.com/help/guides/using-advanced-database-filters), [Using Database Views](https://www.notion.com/help/guides/using-database-views)

---

#### 10. Airtable -- Filter Builder, Views

**Query Language**: No. Visual filter builder only.

**Visual Builder**: Yes. Airtable's filter builder provides:
- **Condition rows**: Field + Operator + Value per row
- **Conjunction selector**: AND/OR between condition groups
- **Filter groups**: Groupable conditions with mixed AND/OR logic
- **Interface filter elements**: Predefined tabs or interactive dropdowns that end users can use to filter connected elements (charts, grids, calendars, etc.)

**Dual Mode**: No. Visual only.

**Progressive Disclosure**:
- Level 1: Interface filter tabs (predefined by builder)
- Level 2: Interactive dropdown filters on interfaces
- Level 3: View-level condition-based filters
- Level 4: Filter groups with AND/OR conjunctions

**Keyboard-first**: Minimal. The filter builder is entirely mouse-driven.

**Saved Filters/Views**: Robust view system:
- **Collaborative views**: All collaborators can see and edit the view's filter/sort/group configuration
- **Personal views**: Only the owner can customize the view's configuration
- **Shared views**: External share links with filtered data; URL parameters can add additional filters
- **View organization**: Views can be organized into sections and reordered

**Notable Innovations**:
- **Interface-level filter elements**: Airtable separates "builder" filters (set by the database designer) from "user" filters (interactive elements for end-users). This two-tier model enables non-technical users to filter data without understanding the underlying logic.
- **Tabs as preset filters**: Named tabs that act as predefined filter states -- the simplest possible filter UX.
- **URL-based filter parameters**: Shared view URLs can encode filter conditions, enabling external linking to specific filtered states.
- **Collaborative vs. personal views**: Clear permission model for who can modify view configurations.

**Weaknesses**:
- No text-based query alternative limits power users and automation scenarios.
- The filter builder UI can become unwieldy with many conditions.
- URL filters on shared views can be removed by anyone with the link -- a security/UX mismatch.
- Filter logic is relatively basic compared to developer tools.

**Sources**: [Filter Records Using Conditions](https://support.airtable.com/docs/filtering-records-using-conditions), [Interface Element: Filter](https://support.airtable.com/docs/interface-element-filter), [Getting Started with Views](https://support.airtable.com/docs/getting-started-with-airtable-views), [Shared View URL Filters](https://support.airtable.com/docs/shared-view-url-filters)

---

#### 11. Asana -- Advanced Search, Saved Searches

**Query Language**: No. Form-based search only.

**Visual Builder**: Yes. Asana's advanced search provides:
- Structured form fields for: Assignee, Project, Collaborators, Tags, Due Date, Completion Status, Custom Fields
- Multiple criteria can be combined
- Fuzzy search with tolerance for misspellings

**Dual Mode**: No. Visual form-based only.

**Progressive Disclosure**:
- Level 1: Quick search bar (keyword search)
- Level 2: Filter by common fields (assignee, project)
- Level 3: Advanced search form with all filter dimensions
- No level 4 -- advanced queries not supported

**Keyboard-first**: Moderate. Quick search is keyboard-accessible. Advanced search form is primarily mouse-driven.

**Saved Filters/Views**: Searches can be saved and reused:
- Saved searches appear in the sidebar for quick access
- Searches can be shared with team members
- Saved searches update dynamically as data changes

**Notable Innovations**:
- **Dynamic saved searches**: Saved searches are "live" -- they always reflect current data, not a snapshot.
- **Custom field filtering**: Filter by any custom field, enabling domain-specific filtering.

**Weaknesses**:
- The filtering system is restrictive for complex queries.
- No boolean logic operators (AND/OR grouping).
- Cannot express negation or complex conditions.
- Search is described as limited in precision for complex multi-contributor projects.

**Sources**: [Asana Search](https://www.getguru.com/reference/asana-search), [Advanced Search Guide](https://scribehow.com/viewer/How_to_Search_Use_Advanced_Search_and_Save_Searches_in_Asana__i-7qGYjRTZ-Qq4JYcmIOVg)

---

### Search & Reference Points

---

#### 12. Algolia -- Faceted Search Patterns

**Query Language**: Yes. Algolia's filter syntax supports boolean expressions:

Example: `category:Electronics AND (brand:Apple OR brand:Samsung) AND price < 1000`

**Visual Builder**: Yes, via **InstantSearch** widget library:
- **RefinementList**: Multi-select facet checkboxes with counts
- **Menu**: Single-select facet list
- **RangeSlider**: Numeric range filtering
- **ToggleRefinement**: Boolean on/off filters
- **HierarchicalMenu**: Nested category drilling
- **NumericMenu**: Predefined numeric range options
- **CurrentRefinements**: Display of all active filters with individual remove buttons
- **ClearRefinements**: One-click clear all filters

**Dual Mode**: The visual widgets and the underlying filter query are automatically synced. Algolia manages the state internally; developers compose the UI from widgets.

**Progressive Disclosure**:
- Dynamic faceting: Only show facets relevant to the current query context
- Search within facets: For high-cardinality facets, users can search within the facet values
- Pinned values: Important facet values can be pinned to the top of the list
- Hidden values: Irrelevant values can be hidden entirely

**Keyboard-first**: Depends on implementation. The widget library supports keyboard interaction by default (checkbox/radio patterns). Search-within-facets adds keyboard-driven filtering for long lists.

**Saved Filters/Views**: Not built into Algolia directly -- this is an application-layer concern. Algolia provides URL-based state management for bookmarking/sharing.

**Notable Innovations**:
- **Dynamic faceting**: Facets reorder and show/hide based on the current search context. This prevents showing irrelevant filter options.
- **Search for facet values**: When a facet has hundreds of values, users can search within the facet list. This is essential for high-cardinality attributes.
- **Current Refinements widget**: A dedicated widget showing all active filters as removable pills -- the canonical implementation of this pattern.
- **ClearRefinements with scope control**: The clear button can be configured to clear all refinements or only specific attributes, giving developers control over the UX.
- **Contextual facet counts**: Each facet value shows a count that updates in real-time based on the current search, so users always know how many results they will get.

**Weaknesses**:
- State management in modals/panels is complex -- unmounting a RefinementList widget clears its state, requiring workarounds for modal-based filter UIs.
- The widget library is opinionated, making custom filter UIs more difficult.
- No built-in saved filters -- developers must implement persistence themselves.
- The "OR within facet, AND between facets" default logic can confuse users who expect different behavior.

**Sources**: [Facet Display](https://www.algolia.com/doc/guides/building-search-ui/ui-and-ux-patterns/facet-display/js), [RefinementList](https://www.algolia.com/doc/api-reference/widgets/refinement-list/react), [Clear Refinements](https://www.algolia.com/doc/api-reference/widgets/clear-refinements/android), [Search for Facet Values](https://www.algolia.com/blog/product/search-for-facet-values)

---

#### 13. Stripe Dashboard -- Transaction/Payment Filtering

**Query Language**: Semi-structured. Stripe's search supports field-prefixed queries:

Example: `amount>100 currency:usd status:succeeded customer:"cus_xxx"`

Supports operators, field prefixes, and quoted strings.

**Visual Builder**: Yes. The Payments tab provides:
- Date range picker
- Status filter tabs
- Amount range filter
- Customer search
- Payment method type filter
- Export functionality for filtered results

**Dual Mode**: Partially. The search bar supports both free-text search and field-prefixed queries. Visual filters (date, status) can coexist with the search bar. However, there is no full visual-to-text bidirectional sync.

**Progressive Disclosure**:
- Level 1: Status tabs (Succeeded, Refunded, etc.)
- Level 2: Date and amount range filters
- Level 3: Search bar with field prefixes
- Level 4: Combine search with filters for precise results

**Keyboard-first**: Moderate. Search bar is keyboard-accessible. Global search (`/`) is available.

**Saved Filters/Views**: Limited. No dedicated saved filter/view system. Users must re-apply filters each session. Export is offered as an alternative for recurrent queries.

**Notable Innovations**:
- **Last-four-digits card search**: Users can search by the last 4 digits of a card number -- a pattern uniquely suited to payment contexts.
- **Clean filter UI**: Stripe's minimalist design language applies to filters -- each filter type has a clear, well-designed control appropriate to its data type.
- **Filter + export workflow**: Filters double as export criteria, creating a seamless path from exploration to data extraction.

**Weaknesses**:
- No saved views or filters -- this is a significant gap for users with recurring query patterns.
- The search syntax is undocumented and not easily discoverable.
- Limited boolean logic -- cannot express complex AND/OR conditions.
- Filter options are relatively limited compared to the richness of the underlying data model.

**Sources**: [Dashboard Search](https://docs.stripe.com/dashboard/search), [Dashboard Basics](https://docs.stripe.com/dashboard/basics), [Design Patterns](https://docs.stripe.com/stripe-apps/patterns)

---

#### 14. AWS CloudWatch -- Log Insights Query Language

**Query Language**: Yes. Multiple query language options:
- **Logs Insights QL**: Purpose-built, pipe-based query language
- **OpenSearch PPL**: Piped Processing Language
- **OpenSearch SQL**: Standard SQL syntax

Logs Insights QL Example: `fields @timestamp, @message | filter @message like /error/ | sort @timestamp desc | limit 100`

**Visual Builder**: Minimal. CloudWatch provides:
- Log group selector (multi-select)
- Time range picker
- **Sample queries panel** with pre-built queries organized by category
- No visual query builder for constructing filter expressions

**Dual Mode**: No visual builder to sync with. However, CloudWatch now offers **Natural Language Query generation**: users describe what they want in plain English, and the system generates a query with a line-by-line explanation.

**Progressive Disclosure**:
- Level 1: Select log groups and time range
- Level 2: Use sample queries as starting points
- Level 3: Natural language query generation (preview)
- Level 4: Write custom Logs Insights QL / PPL / SQL queries
- Level 5: Complex multi-pipe queries with aggregation and visualization

**Keyboard-first**: Moderate. The query editor supports autocomplete with field discovery. Command descriptions are shown inline.

**Saved Filters/Views**: Yes.
- **Saved queries** organized in folders (using `/` prefix naming)
- **Query history** accessible via the History button
- Role-based access control for saved queries (logs:PutQueryDefinition, logs:DescribeQueryDefinitions)

**Notable Innovations**:
- **Natural language query with explanation**: Unlike Datadog's NLQ which just outputs a query, CloudWatch provides a line-by-line explanation of how the generated query works. This is both a usability and a learning feature.
- **Multi-language support**: Three query languages in one interface (Logs Insights QL, PPL, SQL) -- users can use whatever syntax they already know.
- **Query folders**: Saved queries can be organized in folder hierarchies, which is essential for enterprise-scale usage.
- **Sample query library**: Curated, categorized sample queries serve as both documentation and starting points.

**Weaknesses**:
- No visual query builder -- the learning curve for non-SQL users is steep.
- The NLQ feature is still in preview and can produce incorrect queries.
- The interface is visually dense and AWS-typical in its complexity.
- Three query languages create a "which one should I use?" problem.

**Sources**: [Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html), [Save Queries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_Insights-Saving-Queries.html), [Query History](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatchLogs-Insights-Query-History.html), [NLQ Preview](https://aws.amazon.com/blogs/aws/use-natural-language-to-query-amazon-cloudwatch-logs-and-metrics-preview/)

---

## Cross-Product Synthesis

### 1. Universal Patterns (Present in 10+ products)

| Pattern | Description | Products |
|---------|-------------|----------|
| **Active filter display** | Show currently applied filters as removable pills/badges | All 14 products |
| **Time range picker** | Dedicated date/time range selector, often with presets | All dev tools, Stripe |
| **Autocomplete/suggestions** | Query input offers completions as you type | All tools with query languages |
| **Clear all filters** | Single action to reset all filters | All 14 products |
| **Saved filters/views** | Persist filter configurations for reuse | 12 of 14 (not PagerDuty, Stripe) |
| **Multi-select within a filter** | Select multiple values for a single dimension | All 14 products |

### 2. Category-Specific Patterns

| Pattern | Category | Products |
|---------|----------|----------|
| **Dedicated query language** | Dev tools only | Datadog, Grafana, Kibana, Splunk, New Relic, CloudWatch |
| **Pipe-based query chaining** | Observability tools | Splunk, CloudWatch, Grafana (LogQL) |
| **Faceted sidebar** | Data-heavy exploration | Datadog, Kibana, PagerDuty, Algolia |
| **Nested AND/OR groups** | Productivity tools | Notion (3 levels), Airtable, Cloudflare |
| **Views as first-class objects** | Productivity tools | Notion, Airtable, Jira |
| **Visual operation pipeline** | Observability tools | Grafana (operations boxes) |
| **Direct manipulation filtering** | Analytics dashboards | Kibana (click-to-filter), Cloudflare (hover-to-filter), Datadog (facet click) |
| **Natural language query** | Emerging across categories | Datadog, CloudWatch, Looker (Google) |

### 3. Best-in-Class Examples by Pattern Type

| Pattern | Best-in-Class | Why |
|---------|---------------|-----|
| **Dual mode (visual + text)** | **Grafana** | Builder and Code tabs with the clearest visual pipeline model |
| **Faceted filtering** | **Datadog** | Richest facet panel with qualitative, quantitative, and hide/show controls |
| **Filter pills** | **Kibana** | Filter pills as first-class objects: edit, disable, pin, negate, delete |
| **Progressive disclosure** | **Datadog** | Four smooth levels from click to NLQ to key:value to complex expressions |
| **Views/saved filters** | **Notion** | Views bundle filter + sort + group + layout + visibility into one switchable unit |
| **Learning bridge** | **Jira** | Basic -> JQL switch teaches the query language through the user's own queries |
| **Dynamic faceting** | **Algolia** | Facets reorder and filter based on context; search within facet values |
| **Natural language query** | **CloudWatch** | NLQ with line-by-line explanation of the generated query |
| **Direct manipulation** | **Cloudflare** | Hover over any data point and one-click "Filter" or "Exclude" |
| **Search assistant** | **Splunk** | Inline documentation, examples, and history alongside autocomplete |
| **Auto-conforming defaults** | **Notion** | New items auto-satisfy the active view's filter criteria |
| **Filter tabs/presets** | **Airtable** | Named tabs as the simplest possible filter switching UX |

### 4. Emerging Trends

1. **Natural Language as a Third Modality**: Datadog, CloudWatch, and Looker are leading the integration of NLQ alongside visual and text-based filtering. This is the single biggest trend in filtering UX. By 2027, NLQ will likely be table stakes for any data-heavy filtering interface.

2. **Explainable AI Queries**: CloudWatch's "show reasoning" and line-by-line explanations for AI-generated queries represent a critical trust-building pattern. Users need to understand what the AI did, not just the output.

3. **Multi-Turn Conversational Filtering**: Looker's Gemini integration supports follow-up queries ("Show that by region") without starting over. This conversational model will spread to developer tools.

4. **Dynamic/Contextual Facets**: Algolia pioneered showing only relevant facets based on the current query. This is spreading to observability tools (Datadog's facet hiding, Grafana's label-based filtering).

5. **Filter-as-Code**: As infrastructure-as-code matures, saved filters increasingly need to be versionable, shareable, and programmable. Jira's filters-as-infrastructure (powering boards and notifications) points to this direction.

6. **Dual Mode with Graceful Degradation**: The industry is converging on visual + text modes, but the best implementations handle the "complex query can't be shown visually" case with clear warnings rather than silent failures.

7. **Direct Manipulation from Visualizations**: Cloudflare and Kibana's click-on-chart-to-filter pattern is expanding. Users expect that any data they can see should be one click away from becoming a filter.

---

## Pattern Taxonomy

Based on this research, filtering patterns can be organized into a taxonomy:

### Input Modalities
1. **Text Query Language** -- User writes structured query text (Datadog, Grafana, Kibana, Splunk, New Relic, CloudWatch, Jira)
2. **Visual Filter Builder** -- User constructs filters through form controls (Notion, Airtable, Cloudflare Expression Builder)
3. **Faceted Sidebar** -- User clicks facet values in a panel (Datadog, Kibana, Algolia)
4. **Direct Manipulation** -- User clicks on data visualizations to filter (Kibana, Cloudflare, Datadog)
5. **Natural Language** -- User describes desired filter in plain English (Datadog, CloudWatch)
6. **Preset Tabs/Buttons** -- User clicks predefined filter states (PagerDuty status tabs, Airtable tabs)

### Filter Logic Models
1. **Flat AND** -- All conditions must be true (simplest; most basic filter UIs)
2. **AND + OR groups** -- Grouped conditions with mixed logic (Notion, Airtable, Cloudflare)
3. **Nested AND/OR** -- Recursively nested groups (Notion up to 3 levels)
4. **Full boolean** -- Arbitrary AND/OR/NOT with parenthetical grouping (all query languages)
5. **Pipeline/chain** -- Sequential transformations (Splunk SPL, Grafana LogQL, CloudWatch)

### State Management
1. **Ephemeral** -- Filters reset on page navigation (Stripe, PagerDuty)
2. **URL-encoded** -- Filter state in URL params (Algolia, Kibana)
3. **Saved queries** -- Named, reusable filter configurations (Kibana, CloudWatch, Jira)
4. **Views** -- Bundled filter + layout + sort configuration (Notion, Airtable)
5. **Infrastructure** -- Filters that power other system features (Jira boards, Kibana dashboards)

### Progressive Disclosure Levels
1. **One-click presets** -- Status tabs, predefined filters
2. **Simple visual filters** -- Dropdown/checkbox selection
3. **Advanced visual filters** -- AND/OR groups, nested conditions
4. **Text query language** -- Full query syntax
5. **Natural language** -- Plain English input (newest level)

---

## Anti-Patterns to Avoid

Based on weaknesses identified across all 14 products:

### 1. The Unidirectional Cliff
**What it is**: Visual builder -> text mode works, but text -> visual mode fails silently or with cryptic warnings.
**Products affected**: Grafana, Jira, Cloudflare
**Why it matters**: Users who explore text mode get "trapped" -- they cannot return to the visual builder. This discourages exploration.
**Recommendation**: Either make the sync truly bidirectional, or clearly communicate what will be lost when switching modes.

### 2. Invisible Active Filters
**What it is**: Active filters are not prominently displayed, so users don't realize filters are applied.
**Products affected**: Early versions of many products
**Why it matters**: Users see unexpected results and blame the data or the tool, not the hidden filter.
**Recommendation**: Always show active filters as prominent, removable pills near the data display. Algolia's CurrentRefinements widget is the gold standard.

### 3. No Saved Filters in Data-Heavy Tools
**What it is**: Users must reconstruct complex filters from scratch every session.
**Products affected**: Stripe, PagerDuty
**Why it matters**: Recurring workflows require the same filters daily. Rebuilding wastes time and invites errors.
**Recommendation**: Any tool where users filter regularly must support saved filters/views.

### 4. Unclear AND/OR Logic
**What it is**: Multi-select filters don't clearly communicate whether selections are AND'ed or OR'ed.
**Products affected**: Many tools with multi-select facets
**Why it matters**: Selecting two status values expecting "either" but getting "both" (or vice versa) returns confusing results.
**Recommendation**: Make the conjunction explicit. Algolia's "OR within facet, AND between facets" default should be clearly communicated.

### 5. All-or-Nothing Complexity
**What it is**: The tool offers only simple dropdowns OR a complex query language, with no intermediate.
**Products affected**: Jira (basic vs JQL), Splunk (no visual builder), CloudWatch (no visual builder)
**Why it matters**: Users who outgrow simple filters face a steep cliff to the query language, causing frustration and abandonment.
**Recommendation**: Provide intermediate-complexity tools like visual AND/OR group builders (Notion's model), operation pipelines (Grafana's model), or guided query construction (Splunk's Search Assistant).

### 6. Filter State Lost on Modal Close
**What it is**: Filters configured in a modal/panel are lost when the modal is closed or unmounted.
**Products affected**: Algolia InstantSearch (documented issue)
**Why it matters**: Users expect filter state to persist while they review results before applying.
**Recommendation**: Decouple filter state from UI component lifecycle. Use a state manager (URL params, Zustand, etc.) that persists independently of DOM mounting.

### 7. Too Many Facets at Once
**What it is**: Showing all possible filter dimensions simultaneously, overwhelming the user.
**Products affected**: Any tool with many filterable attributes
**Why it matters**: Decision fatigue leads to users ignoring the filter system entirely.
**Recommendation**: Use dynamic faceting (Algolia's approach) -- show only relevant facets based on the current context. Allow users to hide/show facets (Datadog's approach).

### 8. Proprietary Query Languages Without Learning Aids
**What it is**: Requiring users to learn a custom query language with minimal in-context help.
**Products affected**: Most tools to varying degrees
**Why it matters**: High learning curve limits adoption to power users only.
**Recommendation**: Combine autocomplete, inline documentation, sample queries, and a basic->advanced mode switch that shows the generated query (Jira's teaching bridge pattern).

---

## Recommendations for Our System

Based on this analysis, the recommended architecture for our filtering system:

### Must-Have Patterns (P0)
1. **Dual mode**: Visual filter builder + text query input with bidirectional sync
2. **Active filter pills**: Always-visible, removable, editable pills showing current filters
3. **Progressive disclosure**: Simple one-click filters -> visual AND/OR builder -> text query
4. **Saved views**: Persist full filter + sort + layout state as named, shareable views
5. **URL-encoded state**: Filter state reflected in URL for sharing and bookmarking
6. **Clear all + clear individual**: Both global and per-filter clear actions
7. **Autocomplete**: Context-aware suggestions in the text query mode
8. **Time range picker**: Dedicated control with presets

### Should-Have Patterns (P1)
1. **Faceted sidebar** with dynamic faceting (show only relevant facets)
2. **Direct manipulation**: Click on data to create filters
3. **Filter presets/tabs**: Named preset filter states for common workflows
4. **Keyboard shortcuts**: `Cmd+K` command palette, keyboard-navigable filter controls
5. **Learning bridge**: Visual builder shows the equivalent text query for education

### Nice-to-Have Patterns (P2)
1. **Natural language query input**: Plain English to structured query translation
2. **Query explanation**: Line-by-line explanation of complex queries
3. **Collaborative views**: Shared vs. personal view permissions
4. **Filter templates**: Pre-built filter configurations for common use cases

### Architecture Principles
1. **Filter state decoupled from UI lifecycle**: Use URL params as source of truth, Zustand for client state (already planned in our stack)
2. **Graceful mode degradation**: When text query can't be shown visually, display a clear message with options
3. **Type-safe filter model**: Use TypeScript discriminated unions for filter types (text, numeric range, date range, multi-select, boolean)
4. **Extensible filter types**: Plugin architecture for adding new filter types without modifying core
5. **Real-time result counts**: Show how many results each filter value would return (Algolia pattern)

---

*This research document should be reviewed by the Product Manager, Interaction Designer, and both Frontend Engineers before proceeding to the Definition phase.*
