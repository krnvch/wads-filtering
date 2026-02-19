### Decision: URL Serialization Format for Filter Expressions

- **Date**: 2026-02-19
- **Decided by**: Product Manager + Frontend Engineer (Data)
- **Status**: Proposed — needs team approval before Phase 1 begins
- **Context**: The filter expression tree needs to be serialized to URL query params for shareability, bookmarking, and back/forward navigation. The format must be: (a) human-readable, (b) copy-paste safe, (c) parseable without ambiguity, (d) backward-compatible if we add features later.

---

#### Options Considered

**Option A: Flat params (simple) + JSON blob (complex)**
```
Simple:  ?status=Blocked,Monitored&type=XSS&impact=High
Complex: ?filter=eyJjb25uZWN0b3IiOiJBTkQi...  (base64-encoded JSON)
```
- Pro: Simple cases are human-readable. Complex cases are unambiguous.
- Con: Base64 is not human-readable. Breaks if URL length exceeds limits.

**Option B: Custom DSL in single param**
```
?filter=(status.is_not.Monitoring,Blocked+OR+type.is.BOLA,XSS)+AND+country.is_not.Italy
```
- Pro: Fully human-readable. Single param.
- Con: Requires custom parser. Edge cases with special characters in values.

**Option C: Flat params only (no groups in URL)**
```
?status__is_not=Monitoring,Blocked&type=XSS&country__is_not=Italy
```
- Pro: Standard query param format. No custom parser.
- Con: Cannot represent OR groups or parenthetical nesting in URL.

**Option D: Hybrid — flat for simple, structured param for groups**
```
Simple (AND-only):
  ?status=Blocked,Monitored&type=XSS&hostname=orders.example.com

With operators:
  ?status__is_not=Monitored&type=XSS

With groups (OR):
  ?g1=status__is_not.Monitoring,Blocked|type__is.BOLA,XSS&g1_op=OR&country__is_not=Italy
```
- Pro: Simple cases stay clean. Groups are explicit. Standard params.
- Con: More complex serialization logic. `g1`/`g1_op` convention is non-standard.

---

#### Decision: **Option D — Hybrid**

**Rationale**:
- 80%+ of real-world filter usage will be simple AND-only queries → clean, readable URLs
- Group support via `g1`/`g1_op` params handles the 20% advanced use case
- No base64 or custom DSL — standard URL query params throughout
- Parseable with standard `URLSearchParams` API + thin wrapper
- Graceful degradation: if group params are malformed, fall back to AND-only interpretation

**Serialization rules**:

1. **Simple AND-only (no operator override)**:
   ```
   ?status=Blocked,Monitored&type=XSS
   ```
   Implies: `Status is Blocked,Monitored AND Type is XSS`

2. **With operator override** (append `__op` suffix):
   ```
   ?status=Monitored&status__op=is_not
   ```
   Implies: `Status is not Monitored`

3. **With OR group** (use `g{N}` prefix):
   ```
   ?g1.status=Monitoring,Blocked&g1.status__op=is_not&g1.type=BOLA,XSS&g1__op=OR&country=Italy&country__op=is_not
   ```
   Implies: `( Status is not Monitoring,Blocked OR Type is BOLA,XSS ) AND Country is not Italy`

4. **Defaults**:
   - Default operator: `is`
   - Default top-level connector: `AND`
   - Default group connector: `AND` (must set `g1__op=OR` to use OR)

---

- **Dissent**: Frontend Engineer (UI) preferred Option B (custom DSL) for its readability. Trade-off: readability vs parsing complexity. Hybrid is more robust.
- **Revisit if**: URL length becomes a problem (>2000 chars) with many filters, or if we need deeper nesting.
