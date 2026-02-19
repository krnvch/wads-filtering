import { describe, it, expect } from "vitest";
import { serializeFilterState, deserializeFilterState } from "../filter-url";
import {
  createEmptyState,
  createCondition,
  addCondition,
} from "../filter-utils";

describe("serializeFilterState", () => {
  it("returns empty params for empty state", () => {
    const state = createEmptyState();
    const params = serializeFilterState(state);
    expect(params.toString()).toBe("");
  });

  it("serializes single enum condition", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));

    const params = serializeFilterState(state);
    expect(params.get("status")).toBe("Blocked");
    expect(params.get("status__op")).toBeNull(); // default operator omitted
  });

  it("serializes multi-value condition with comma separator", () => {
    let state = createEmptyState();
    state = addCondition(
      state,
      createCondition("status", ["Blocked", "Monitored"]),
    );

    const params = serializeFilterState(state);
    expect(params.get("status")).toBe("Blocked,Monitored");
  });

  it("includes __op param for non-default operator on enum field", () => {
    let state = createEmptyState();
    state = addCondition(
      state,
      createCondition("status", ["Blocked"], "is_not"),
    );

    const params = serializeFilterState(state);
    expect(params.get("status")).toBe("Blocked");
    expect(params.get("status__op")).toBe("is_not");
  });

  it("omits __op for default operator on text field (contains)", () => {
    let state = createEmptyState();
    state = addCondition(
      state,
      createCondition("endpoints", ["api"], "contains"),
    );

    const params = serializeFilterState(state);
    expect(params.get("endpoints")).toBe("api");
    expect(params.get("endpoints__op")).toBeNull();
  });

  it("includes __op for non-default operator on text field", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("endpoints", ["api"], "is"));

    const params = serializeFilterState(state);
    expect(params.get("endpoints")).toBe("api");
    expect(params.get("endpoints__op")).toBe("is");
  });

  it("serializes multiple conditions", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));
    state = addCondition(state, createCondition("type", ["XSS", "CSRF"]));
    state = addCondition(
      state,
      createCondition("impact", ["High"], "is_not"),
    );

    const params = serializeFilterState(state);
    expect(params.get("status")).toBe("Blocked");
    expect(params.get("type")).toBe("XSS,CSRF");
    expect(params.get("impact")).toBe("High");
    expect(params.get("impact__op")).toBe("is_not");
  });
});

describe("deserializeFilterState", () => {
  it("returns empty state for empty params", () => {
    const params = new URLSearchParams();
    const state = deserializeFilterState(params);
    expect(state.expression.children).toHaveLength(0);
    expect(state.expression.connector).toBe("AND");
  });

  it("deserializes single condition", () => {
    const params = new URLSearchParams("status=Blocked");
    const state = deserializeFilterState(params);

    expect(state.expression.children).toHaveLength(1);
    const child = state.expression.children[0];
    expect("field" in child && child.field).toBe("status");
    expect("values" in child && child.values).toEqual(["Blocked"]);
    expect("operator" in child && child.operator).toBe("is");
  });

  it("deserializes multi-value condition", () => {
    const params = new URLSearchParams("status=Blocked,Monitored");
    const state = deserializeFilterState(params);

    const child = state.expression.children[0];
    expect("values" in child && child.values).toEqual([
      "Blocked",
      "Monitored",
    ]);
  });

  it("deserializes operator override", () => {
    const params = new URLSearchParams("status=Blocked&status__op=is_not");
    const state = deserializeFilterState(params);

    const child = state.expression.children[0];
    expect("operator" in child && child.operator).toBe("is_not");
  });

  it("skips unknown fields", () => {
    const params = new URLSearchParams(
      "status=Blocked&unknown_field=some_value",
    );
    const state = deserializeFilterState(params);
    expect(state.expression.children).toHaveLength(1);
  });

  it("falls back to default operator for invalid __op", () => {
    const params = new URLSearchParams(
      "status=Blocked&status__op=invalid_op",
    );
    const state = deserializeFilterState(params);

    const child = state.expression.children[0];
    expect("operator" in child && child.operator).toBe("is");
  });

  it("uses deterministic IDs", () => {
    const params = new URLSearchParams("status=Blocked&type=XSS");
    const state = deserializeFilterState(params);

    const ids = state.expression.children.map((c) => ("id" in c ? c.id : ""));
    expect(ids).toContain("filter_status");
    expect(ids).toContain("filter_type");
  });

  it("uses contains as default operator for text fields", () => {
    const params = new URLSearchParams("endpoints=api");
    const state = deserializeFilterState(params);

    const child = state.expression.children[0];
    expect("operator" in child && child.operator).toBe("contains");
  });

  it("resolves field labels from schema", () => {
    const params = new URLSearchParams("http_status_code=200");
    const state = deserializeFilterState(params);

    const child = state.expression.children[0];
    expect("fieldLabel" in child && child.fieldLabel).toBe("HTTP status code");
  });
});

describe("round-trip: serialize → deserialize", () => {
  it("preserves single enum condition", () => {
    let original = createEmptyState();
    original = addCondition(
      original,
      createCondition("status", ["Blocked", "Monitored"]),
    );

    const params = serializeFilterState(original);
    const restored = deserializeFilterState(params);

    expect(restored.expression.children).toHaveLength(1);
    const child = restored.expression.children[0];
    expect("field" in child && child.field).toBe("status");
    expect("values" in child && child.values).toEqual([
      "Blocked",
      "Monitored",
    ]);
    expect("operator" in child && child.operator).toBe("is");
  });

  it("preserves non-default operator", () => {
    let original = createEmptyState();
    original = addCondition(
      original,
      createCondition("status", ["Blocked"], "is_not"),
    );

    const params = serializeFilterState(original);
    const restored = deserializeFilterState(params);

    const child = restored.expression.children[0];
    expect("operator" in child && child.operator).toBe("is_not");
  });

  it("preserves multiple conditions", () => {
    let original = createEmptyState();
    original = addCondition(
      original,
      createCondition("status", ["Blocked"]),
    );
    original = addCondition(
      original,
      createCondition("type", ["XSS", "CSRF"]),
    );
    original = addCondition(
      original,
      createCondition("endpoints", ["api"], "contains"),
    );

    const params = serializeFilterState(original);
    const restored = deserializeFilterState(params);

    expect(restored.expression.children).toHaveLength(3);

    const fields = restored.expression.children.map((c) =>
      "field" in c ? c.field : "",
    );
    expect(fields).toContain("status");
    expect(fields).toContain("type");
    expect(fields).toContain("endpoints");
  });

  it("preserves text field with non-default operator", () => {
    let original = createEmptyState();
    original = addCondition(
      original,
      createCondition("host", ["example.com"], "is"),
    );

    const params = serializeFilterState(original);
    const restored = deserializeFilterState(params);

    const child = restored.expression.children[0];
    expect("operator" in child && child.operator).toBe("is");
  });
});
