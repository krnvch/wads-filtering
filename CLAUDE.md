# wads-filtering

## Project Overview
A complex filtering system for developer tooling. Built with Next.js 15+, TypeScript, and Tailwind CSS 4+.

## Tech Stack
- **Framework**: Next.js (App Router, Server Components, Server Actions)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4+
- **Design System**: shadcn/ui (mandatory — see Design System Rules below)
- **Component Primitives**: Radix UI (via shadcn/ui)
- **State**: URL params as source of truth, Zustand for client state
- **Testing**: Vitest, React Testing Library, Playwright
- **Linting**: ESLint with Next.js config
- **MCP**: shadcn MCP server configured (`.mcp.json`)

## Project Structure
```
src/
  app/           # Next.js App Router pages and layouts
  components/
    ui/          # shadcn/ui components (auto-generated, do NOT manually edit)
    filters/     # Custom filter components (built ON TOP of shadcn/ui)
    layout/      # Layout components
  lib/
    utils.ts     # shadcn/ui cn() utility + shared helpers
  hooks/         # Custom React hooks
  types/         # TypeScript type definitions
  stores/        # State management (Zustand stores)
team/
  TEAM.md        # Team overview and structure
  agents/        # Individual agent system prompts
```

---

## Team of Agents

This project is developed by a **team of 10 specialized AI agents** who collaborate, debate, and challenge each other to produce the best possible outcomes. See `team/TEAM.md` for the full roster.

### The Team
| Role | Agent File |
|------|-----------|
| Advanced Project Manager (Orchestrator) | `team/agents/project-manager.md` |
| Principal UX Researcher | `team/agents/ux-researcher.md` |
| Principal Product Manager | `team/agents/product-manager.md` |
| Principal Product Designer | `team/agents/product-designer.md` |
| Principal Interaction Designer | `team/agents/interaction-designer.md` |
| Staff Frontend Engineer — UI & Components | `team/agents/frontend-engineer-1.md` |
| Staff Frontend Engineer — Data & Integration | `team/agents/frontend-engineer-2.md` |
| Staff Backend Engineer — API & Business Logic | `team/agents/backend-engineer-1.md` |
| Staff Backend Engineer — Infrastructure & Perf | `team/agents/backend-engineer-2.md` |
| QA Tester | `team/agents/qa-tester.md` |

### How to Invoke Agents
When working on a task, invoke agents by reading their system prompt from `team/agents/<role>.md` and acting as that agent. You can invoke multiple agents in sequence to simulate team collaboration.

Example: "As the Product Designer, review this filter component and provide feedback."

---

## Collaboration Rules

These rules are **mandatory** for all agent interactions. The goal is authentic teamwork — not polite agreement.

### 1. No Solo Decisions
Every significant output must be reviewed by at least **2 other agents** before it's considered done.
- Designs are reviewed by UX Researcher + Interaction Designer + at least 1 Engineer
- PRDs are reviewed by UX Researcher + Product Designer + at least 1 Engineer
- Code is reviewed by the other Engineer in the same domain + QA Tester
- Test plans are reviewed by the relevant Engineer + Product Designer

### 2. Challenge Everything
Agents MUST challenge each other's work. Agreeing without substance is not allowed.
- Every review must contain at least **1 challenge or pushback**
- "Looks good" is banned — explain specifically WHY something works
- Ask "What's the strongest argument against this approach?"
- Play devil's advocate when the team converges too quickly
- Cite evidence: user data, technical constraints, industry patterns, accessibility standards

### 3. Structured Debate
When agents disagree (which should happen often):
1. Each agent states their position clearly with reasoning
2. Other agents weigh in with their perspective
3. The team identifies the core tension (speed vs quality, simplicity vs power, etc.)
4. Look for synthesis first — can both views be combined?
5. If not, the **Product Manager** makes the call with documented trade-offs
6. The **Project Manager** records the decision and dissenting opinions

### 4. Cross-Functional Feedback Loops
Agents don't just hand off work — they stay involved:
- **UX Researcher** challenges PM assumptions with user evidence
- **Product Designer** pushes back on PM scope if it hurts UX quality
- **Interaction Designer** challenges Product Designer on feasibility and edge cases
- **Frontend Engineers** push back on designs that are impractical to build performantly
- **Backend Engineers** challenge frontend data assumptions and propose better contracts
- **QA Tester** participates from the START, not just at the end — "How will we test this?" is asked during design, not after implementation
- **Project Manager** intervenes when debate is circular, when someone is being unheard, or when the team is bike-shedding

### 5. Productive Conflict Norms
- Attack ideas, never people: "This approach has a flaw" not "You made a mistake"
- Steel-man before you critique: restate the other agent's position charitably before disagreeing
- Disagree with evidence: "Users in [study X] behaved differently" or "This pattern fails at scale because..."
- Commit after debate: once a decision is made, everyone executes — even if they disagreed
- Revisit if wrong: if new evidence emerges, any agent can reopen a closed decision

### 6. Red Team Protocol
For critical decisions, the **Project Manager** assigns a "red team" agent whose job is to:
- Find every flaw in the proposal
- Argue for the opposite approach
- Identify what could go wrong
- Stress-test assumptions with worst-case scenarios
This is not adversarial — it's protective. The red team agent rotates.

---

## Orchestration Flow

The **Advanced Project Manager** orchestrates all work through these phases:

### Phase 1: Discovery
```
Project Manager initiates
  → UX Researcher presents findings / assumptions
  → PM challenges with business context
  → Designer raises UX concerns
  → Engineers flag technical constraints
  → QA asks "How do we validate this?"
  → DEBATE until alignment (or PM decides)
```

### Phase 2: Definition
```
PM writes PRD
  → UX Researcher validates against research
  → Designer challenges scope / UX gaps
  → Engineers estimate and flag risks
  → QA writes preliminary test scenarios
  → Project Manager ensures all voices heard
  → REVISE until PRD is solid
```

### Phase 3: Design
```
Product Designer creates specs
  → Interaction Designer adds behavior specs
  → UX Researcher validates against user mental models
  → Engineers review for feasibility
  → QA identifies testability gaps
  → CRITIQUE ROUND: each reviewer provides 1+ challenge
  → Iterate until sign-off from all reviewers
```

### Phase 4: Implementation
```
Frontend Engineers build (UI + Data in parallel)
  → Backend Engineers build API + infra
  → Designers review implementation vs spec
  → QA writes and executes tests alongside development
  → Project Manager tracks progress and unblocks
  → Code review: cross-review between engineers
```

### Phase 5: Quality
```
QA executes full test plan
  → Engineers fix issues
  → Designers verify visual/interaction fidelity
  → UX Researcher validates against original user needs
  → PM confirms acceptance criteria met
  → Project Manager signs off for release
```

---

## Decision Log

All significant decisions must be logged using this format:

```markdown
### Decision: [Title]
- **Date**: YYYY-MM-DD
- **Decided by**: [Role]
- **Context**: What problem we were solving
- **Options**: What alternatives we considered
- **Decision**: What we chose and why
- **Dissent**: Who disagreed and their reasoning
- **Revisit if**: When to reconsider this decision
```

Store decisions in `docs/decisions/` as individual files.

---

## Design System Rules — shadcn/ui (MANDATORY)

All UI in this project MUST be built with **shadcn/ui**. This is non-negotiable.

### Core Rules
1. **Always use shadcn/ui components first.** Before building any UI element, check if shadcn/ui has a component for it. Use the shadcn MCP server to browse available components.
2. **Never build from scratch what shadcn/ui provides.** Buttons, inputs, selects, dialogs, popovers, dropdowns, command palettes, badges, tooltips, tables — use the shadcn/ui version.
3. **Extend, don't replace.** When a shadcn/ui component doesn't fully cover the need, wrap or compose it — don't rewrite it. Custom filter components are built ON TOP of shadcn/ui primitives.
4. **Do NOT manually edit files in `src/components/ui/`.** These are managed by the shadcn CLI. Customizations go in wrapper components outside that directory.
5. **Use `cn()` from `src/lib/utils.ts`** for all className merging. No manual string concatenation.
6. **Follow shadcn/ui theming.** Use CSS variables defined in `globals.css` for colors, radii, spacing. Do not hardcode color values.
7. **Dark mode support is required.** All components must work in both light and dark themes using shadcn/ui's built-in theming.

### Component Usage Map
| Need | shadcn/ui Component |
|------|-------------------|
| Filter dropdowns | `Select`, `Combobox`, `Popover` + `Command` |
| Filter pills/tags | `Badge` with custom variants |
| Filter bar container | `Card` or custom layout with shadcn primitives |
| Date range filters | `Calendar`, `DatePicker`, `Popover` |
| Text search inputs | `Input`, `Command` (for fuzzy search) |
| Filter actions (apply/clear) | `Button` with variants |
| Saved filter management | `Dialog`, `Sheet`, `DropdownMenu` |
| Data tables with filters | `Table`, `DataTable` pattern |
| Loading states | `Skeleton` |
| Empty/zero results | `Card` with messaging |
| Toasts/notifications | `Sonner` or `Toast` |
| Tooltips on filters | `Tooltip` |
| Toggle filters | `Toggle`, `ToggleGroup` |
| Number range filters | `Slider`, `Input` |
| Keyboard command palette | `Command` (cmdk) |

### Adding New Components
Use the shadcn MCP server or CLI to add components:
```bash
npx shadcn@latest add [component-name]
```
Never copy-paste component code from the web. Always use the CLI.

### Agent Responsibilities for shadcn/ui
- **Product Designer**: designs within shadcn/ui's visual language; references shadcn components in specs
- **Interaction Designer**: specs interactions using shadcn/ui behavior patterns (Radix primitives)
- **Frontend Engineer (UI)**: implements using shadcn/ui; adds new components via CLI; builds custom filter components as compositions of shadcn/ui
- **Frontend Engineer (Data)**: wires data to shadcn/ui component props
- **QA Tester**: tests shadcn/ui components in context; validates theme consistency

---

## Code Conventions
- Strict TypeScript: no `any`, use generics and discriminated unions
- Component files: PascalCase (`FilterBar.tsx`)
- Hook files: camelCase (`useFilterState.ts`)
- Utility files: camelCase (`parseFilterParams.ts`)
- Test files: `*.test.ts` or `*.test.tsx` co-located with source
- One component per file
- Props interfaces named `[Component]Props`
- Server Components by default, `'use client'` only when needed
- Use `cn()` for all className composition
- Import shadcn/ui components from `@/components/ui/[name]`
- Custom components that wrap shadcn/ui live in `@/components/filters/` (or other domain dirs)
