# Words vs Symbols: Operator Naming Debate

> Should WADS filter operators use natural language (`is`, `greater than`, `contains`) or symbols (`=`, `>`, `~`)?

**Date**: 2026-02-26
**Format**: Structured team debate (Red Hat exercise)
**Participants**: UX Researcher, Adversarial UX Researcher, Product Designer, Interaction Designer, Product Manager
**Context**: Wallarm users — security engineers, SOC analysts, DevSecOps, platform engineers

---

## The Question

Our filter chips currently use **word-based operators**:

```
Status is Blocked    |    Response code greater than 400    |    Endpoint contains /api
```

Should we switch (partially or fully) to **symbol-based operators**?

```
Status = Blocked     |    Response code > 400               |    Endpoint ~ /api
```

Or keep words? Or use a hybrid? The debate follows.

---

## Round 1: Opening Positions

### UX Researcher — Position: Words (with one exception)

**Evidence base**: NN/g cognitive load research, Deque screen reader study, Kaufmann & Bernstein usability study, industry audit of 12 products.

Words are the right default for WADS. Here's why:

1. **Cognitive load reduction.** "Status is Blocked" reads as natural English. "Status = Blocked" requires a mental translation step — small for `=`, but significant for `!=`, `>=`, `<=`. NN/g's cognitive load framework says: every translation step is extraneous cognitive load that doesn't serve the user's task.

2. **Accessibility is non-negotiable.** The Deque study found that `=`, `!=`, `>`, `<`, `>=`, `<=` are NOT in the 17-symbol safe list for screen readers. JAWS reads `<=` as "equals." NVDA skips `=` entirely. Words are read correctly by ALL screen readers. For a security product that may be subject to compliance requirements (SOC 2, FedRAMP), accessibility failures are a liability.

3. **Wallarm user diversity.** Wallarm users aren't a monolith:
   - SOC L1 analysts (6-month rotation, low expertise, high cognitive load from alert fatigue)
   - Senior security engineers (high expertise, may prefer symbols but don't *need* them)
   - Compliance auditors (quarterly usage, low product familiarity)
   - DevOps/platform engineers (code-literate but not security-tool-native)

   Words serve ALL these personas. Symbols only serve the expert segment.

4. **Industry consensus.** Of the 4 products using natural-language paradigm in our audit (Linear, Notion, Airtable, Kibana), ALL use words for enum/text operators. Even Notion and Airtable — which use symbols for numerics — use words everywhere else.

**The exception — numerics.** I'll concede that for numeric operators specifically, even word-oriented products (Notion, Airtable) use `>`, `<`, `>=`, `<=`. "Greater than or equal" is 24 characters. `>=` is 2. For numeric fields, symbols may be justified. But this is field-type-specific, not a blanket switch.

**Framework**: We observed that words reduce cognitive load and ensure accessibility [evidence]. This suggests word-based operators serve our full user spectrum [implication]. We recommend keeping words for all field types except possibly numerics [action].

---

### Adversarial UX Researcher — Position: Symbols deserve a real hearing

**Steel-man of the words position**: Words are more readable, more accessible, and align with the dominant SaaS pattern. The evidence is strong for general-purpose products.

**Now let me break it.**

**Challenge 1: You're citing the wrong competitive set.**

The team keeps benchmarking against Notion, Airtable, and Linear. These are project management and productivity tools. Wallarm's actual competitive set is:

- **Splunk** — symbolic (`!=`, `>`, `<`, `IN`)
- **Elastic/Kibana** — mixed (words in UI builder, KQL is symbolic)
- **CrowdStrike Falcon** — FQL is symbolic
- **Datadog** — symbolic in query, mixed in UI
- **Grafana** — `=`, `!=`, `=~`, `!~`
- **AWS CloudWatch** — symbolic
- **Azure Sentinel (KQL)** — word-oriented but code-like

Security analysts using Wallarm are ALSO using Splunk, Elastic, and CrowdStrike daily. They already have muscle memory for `!=` and `>`. When they see `is not` in a chip, they have to translate FROM their existing mental model. You're not reducing cognitive load — you're adding a translation step in the opposite direction.

"What's the evidence that Wallarm users think in words rather than symbols? Do we have any user interviews, session recordings, or survey data? Because right now we're guessing."

**Challenge 2: The chip width problem is real.**

Filter chips live in a horizontal bar with finite space. Let's compare actual chip widths:

| Filter | Words | Symbols |
|--------|-------|---------|
| `Response code greater than or equal 400` | ~42 chars | `Response code >= 400` — 21 chars |
| `Impact is not any of High, Medium` | ~35 chars | `Impact != High, Medium` — 23 chars |
| `Last seen not in the last 7d` | ~30 chars | `Last seen !< 7d` — 16 chars |

With 5+ active filters, word-based chips WILL overflow. The user sees truncated chips like `Response code great...` which defeats the readability argument entirely. Symbols are inherently more compact, which means more filters visible at once — and visibility IS usability.

**Challenge 3: "Accessible" ≠ "optimal for screen reader users."**

The Deque study is from 2019. Screen readers have improved. More importantly — how many Wallarm users actually use screen readers? I'm not dismissing accessibility. I'm asking: are we optimizing for a theoretical user at the expense of the actual user? If 99.5% of Wallarm users are sighted, and symbols are faster to scan for them, are we making the right trade-off?

The correct approach is `aria-label` on symbolic operators. `>=` visually, `"greater than or equal to"` for screen readers. Problem solved.

**Challenge 4: "No A/B test exists."**

The UX Researcher admitted no direct A/B test exists comparing words vs symbols in filter UIs. The industry "convergence" on words is not evidence — it's herd behavior. The first product that used words got copied. That's how design trends work. It doesn't mean it's optimal.

**My position**: I'm not arguing for full symbols. I'm arguing that the team dismissed symbols too quickly based on research from the wrong domain. At minimum, we should:
1. Use symbols for numerics (`>`, `>=`, `<`, `<=`, `=`, `!=`)
2. Seriously consider `!=` for negation across ALL field types (it's universally understood)
3. User-test both approaches with actual Wallarm users before deciding

---

### Product Designer — Position: Hybrid (words + symbols for numerics)

I've designed filter systems for 12+ years. My take:

**Words win on enum and text fields — no question.** `Status is Blocked` reads better than `Status = Blocked` in a chip. The `is` disappears into natural reading flow. For enum fields, the operator is almost invisible — which is exactly what we want. The user's eye should jump to the field and value, not get stuck on the operator.

**But for numerics, the Adversarial Researcher is right.** Look at these chips side by side:

```
[ Response code  greater than or equal  400 ]     ← 45px wasted on operator
[ Response code  >=  400 ]                         ← operator is 2 chars
```

In the shadcn/ui Badge component we use for chips, every character counts. With a 1200px viewport and 5 filter chips, we have roughly 200px per chip. "Greater than or equal" is a full sentence fragment competing with the field name and value for that space.

**Notion and Airtable already validated this.** They use natural language for everything EXCEPT numbers. They use `>`, `>=`, `<`, `<=`, `=`, `!=` in their dropdown UIs for number fields. If the two most design-obsessed productivity tools both made this exception, it's not an accident — it's a signal.

**My recommendation:**

| Field type | Approach | Example |
|------------|----------|---------|
| Enum | Words | `Status is Blocked` |
| Text | Words | `Endpoint contains /api` |
| Date | Words | `Last seen in the last 7d` |
| Numeric | Symbols | `Response code >= 400` |

This gives us: readability where it matters (enum/text/date) and compactness where it matters (numeric). It also matches the Notion/Airtable pattern that millions of users already know.

---

### Interaction Designer — Position: Hybrid, but I have a micro-interaction concern

I agree with the Designer's hybrid recommendation, but I want to flag an interaction detail that matters:

**Operator selector behavior changes with symbols.**

When the user clicks on the operator portion of a chip to change it, we show a dropdown with operator options. For word-based operators, this dropdown is a list of readable phrases:

```
▸ is
  is not
  is any of
  is not any of
  is set
  is not set
```

For symbol-based numeric operators, the dropdown becomes:

```
▸ =
  !=
  >
  <
  >=
  <=
  between
  is set
  is not set
```

**Problem**: Symbols in a dropdown are harder to visually scan than words. The user has to parse each symbol. `>=` and `<=` look similar at a glance. This matters because the dropdown is a decision point — the user needs to quickly identify the right operator.

**Solution**: Use symbols in the chip display but words in the dropdown selector:

```
Chip:     [ Response code  >=  400 ]
Dropdown: ▸ equals (=)
            not equals (!=)
            greater than (>)
            less than (<)
            greater than or equal (>=)
            less than or equal (<=)
            between
```

This gives us the best of both: compact chips, readable selectors. Radix UI's Select component supports this natively — display value ≠ option label.

**Keyboard navigation note**: When a user presses ArrowDown through the operator dropdown, the selected option should be announced by screen readers using the full word label, not the symbol. This is where `aria-label` becomes critical.

---

### Product Manager — Position: Need to frame this as a business decision

Let me reframe this debate around Wallarm's actual user segments:

**Wallarm user tiers** (from our sales/CS data):

| Segment | % of users | Technical level | Filter frequency |
|---------|-----------|-----------------|-----------------|
| SOC analysts | ~40% | Medium | Very high (daily) |
| Security engineers | ~30% | High | High (daily) |
| DevOps/Platform | ~20% | High (code) | Medium (weekly) |
| Managers/Compliance | ~10% | Low-Medium | Low (monthly) |

**Key insight**: 70% of our users (SOC + SecEng) use security tools daily. They DO have mental models from Splunk, Elastic, Datadog. The Adversarial Researcher's point about competitive muscle memory is valid.

**But**: The remaining 30% (DevOps + Managers) are the growth segment. These are the users who evaluate Wallarm, who champion it internally, who renew contracts. Making the product feel approachable matters for adoption.

**My decision framework**:

1. **Don't make the 30% feel stupid** → words for most operators
2. **Don't make the 70% feel slow** → symbols where they clearly help (numerics)
3. **Don't be unique for uniqueness' sake** → follow the pattern Notion/Airtable established

---

## Round 2: Cross-Examination

### Adversarial Researcher challenges Product Designer

> You said "follow the Notion/Airtable pattern." But Notion's user base is designers, PMs, and writers. Airtable's is ops teams and project coordinators. These are NOT security professionals. You're extrapolating from a different population.
>
> What evidence do we have that this pattern works for users who think in SIEM queries all day?

### Product Designer responds

Fair point. But here's the thing — the filter chip UI is NOT a SIEM query language. It's a visual filter builder. Users who "think in SIEM queries" have two contexts:

1. **Text query mode** — where they type `status != blocked AND response_code >= 400`. This is where symbols belong.
2. **Visual chip mode** — where they click, scan, and manipulate visual elements. This is where readability matters.

We're building the second context. If we want to serve the first context, we should add a query bar (future feature) — not compromise the visual UI's readability.

### Adversarial Researcher challenges Interaction Designer

> You proposed "symbols in chips, words in dropdowns." This creates a translation gap. The user sees `>=` in the chip, opens the dropdown, and has to find "greater than or equal (>=)" in a list. The symbol they're looking at and the word they're reading don't match at first glance. That's cognitive friction.

### Interaction Designer responds

I disagree that it's friction. The symbol is shown in parentheses right next to the word: `greater than or equal (>=)`. The user can match either way — scan for the symbol or read the word. This is the same pattern used by:
- IDE keybinding settings (action name + shortcut)
- Emoji pickers (emoji + description)
- Font selectors (font name in that font)

The dual-encoding actually helps — it serves both the "I know the symbol" user and the "I need to read it" user simultaneously.

### UX Researcher challenges Adversarial Researcher

> You argued that Wallarm users have muscle memory for `!=` from Splunk/Elastic. But these are query languages — typed text. Our chips are visual, read-only representations. The motor pattern is completely different. You're conflating recognition of a symbol in text with preference for that symbol in a visual chip. These are different cognitive tasks.

### Adversarial Researcher responds

Partially valid. But recognition IS the relevant task here. Users don't TYPE operators in chips — they READ them. And reading `!=` is fast if you already know what it means. The claim that "words are faster to read" assumes the reader doesn't already know the symbol. For Wallarm's audience, that assumption is wrong for at least 70% of users.

However — I'll concede that for the 30% (DevOps/Managers), symbols could create a barrier. The question is: does the hybrid approach solve this? If we only use symbols for numerics (where even non-technical users understand `>` and `<` from basic math), the risk is minimal.

---

## Round 3: The Wallarm-Specific Arguments

### UX Researcher — Wallarm context matters

Let me add specific Wallarm context to the evidence base:

1. **Incident response is high-cognitive-load.** During an active security incident, analysts are triaging under time pressure. Any extra parsing step — even 100ms to decode `!=` — compounds across dozens of filter operations. Words reduce this friction.

2. **Wallarm is increasingly multi-persona.** The platform is expanding from pure security into DevOps (API discovery, API testing). New users from dev backgrounds may not have SIEM muscle memory. Words lower the barrier.

3. **Localization trajectory.** Wallarm has customers globally. Words can be localized (`es mayor que` → `>`? No — that loses the benefit). Actually — this is an argument FOR symbols in an international context. But Wallarm's UI is English-only currently.

4. **Onboarding speed.** Wallarm trial-to-paid conversion depends on users quickly building their first useful filter. "Status is Blocked" requires zero learning. "Status = Blocked" requires the user to know that `=` means exact match (not assignment, not search).

### Adversarial Researcher — The real Wallarm question

Here's what nobody is asking: **What do Wallarm users actually complain about?**

If the current word-based operators aren't generating support tickets, aren't causing confusion in session recordings, and aren't being mentioned in NPS feedback — then this debate is academic. The words are working.

If users ARE complaining that chips are too wide, that filters take up too much horizontal space, that they can't see all their active filters — then the compactness argument for symbols becomes urgent.

**Do we have any of this data?** Because right now we're debating based on theory and competitive analysis, not on actual user pain. The most honest answer might be: "We don't know yet, ship with words, instrument it, and revisit with data."

---

## Round 4: Synthesis & Decision

### Product Manager — Final call

After hearing all positions, here's my decision:

#### Decision: Hybrid approach — words by default, symbols for numeric operators only

**Rationale**:

| Factor | Words | Symbols | Hybrid |
|--------|-------|---------|--------|
| Enum/text readability | Best | Worse | Best (words) |
| Numeric readability | Verbose | Best | Best (symbols) |
| Chip width efficiency | Acceptable | Best | Good |
| Accessibility | Best | Risk | Good (with aria-label) |
| Onboarding (30% non-expert) | Best | Worse | Good |
| Expert speed (70% technical) | Good | Better | Good+ |
| Competitive alignment | Strong | Weak | Strong (matches Notion/Airtable) |
| Implementation cost | None (current) | Medium | Low |

**Specific changes from current implementation**:

1. **Numeric operators → symbols in chips**: `=`, `!=`, `>`, `<`, `>=`, `<=`
2. **Numeric operator dropdown → words with symbol suffix**: `greater than (>)`, `less than (<)`, etc.
3. **All other field types → keep words**: `is`, `is not`, `contains`, `starts with`, `before`, `after`, `in the last`
4. **Accessibility**: All symbol chips get `aria-label` with full word equivalent
5. **No change to enum/text/date operators**

**Dissent recorded**:
- **Adversarial Researcher** argues we should also consider `!=` for enum negation (universal symbol, saves space). Noted for future iteration.
- **Adversarial Researcher** correctly points out we lack user data on operator preferences. Recommends post-ship instrumentation.

**Revisit if**:
- User testing or analytics show confusion with numeric symbols
- Chip width becomes a demonstrated pain point (>5 filters active common)
- Wallarm adds a text query bar (would change the hybrid balance)
- Localization requirements emerge

---

## Action Items

1. **Ship current words approach** — no changes to enum/text/date operators
2. **Switch numeric operators to symbols in chip display** — `=`, `!=`, `>`, `<`, `>=`, `<=`
3. **Numeric dropdown shows both**: `greater than (>)` format
4. **Add `aria-label` to all numeric operator badges** with full word text
5. **Instrument operator interactions** — track: which operators are changed most often (signal of confusion), chip truncation frequency, filter bar overflow rate
6. **Plan user testing** — 5 Wallarm users, show both versions, measure: task completion time, error rate, preference

---

## Appendix: Web Research Sources

| Source | Key finding |
|--------|-------------|
| NN/g — Cognitive Load | Words reduce extraneous processing; symbols add a translation step |
| Deque — Screen Reader Symbols | `=`, `!=`, `>`, `<`, `>=`, `<=` NOT reliably read by screen readers |
| Kaufmann & Bernstein (2010) | Users prefer natural language over formal query syntax in visual builders |
| W3C — Cognitive Accessibility | Symbols best used alongside text labels, not as standalone |
| React Query Builder docs | Recommends word-based labels: `<` → "before", `>` → "greater than" |
| Pencil & Paper — Enterprise Filtering | Filter anatomy = "identifier + relative + value"; uses "relative" (word) not "symbol" |
| LogRocket — Advanced Search UX | Query syntax requires learned knowledge; visual selectors more accessible |
| Garofalo UX — Query Builder | "Use tooltips for non-technical users" — implies symbols need explanation |
| Smart Interface Design Patterns | "Users shouldn't have to learn how to filter" — words need no learning |
| KQL design philosophy | Word-based (`contains`, `has`) despite being for technical users |
| Splunk/Elastic/CrowdStrike | Symbolic query languages — but these are TEXT input, not visual chips |
