import { describe, it, expect } from "vitest";
import { serializeFilterState, deserializeFilterState } from "../filter-url";
import {
  createEmptyState,
  createCondition,
  addCondition,
} from "../filter-utils";
import type { FilterCondition, FilterGroup, FilterState } from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";

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

// --- Group serialization tests ---

function makeCondition(
  id: string,
  field: string,
  values: string[],
  operator: "is" | "is_not" | "contains" | "does_not_contain" = "is",
): FilterCondition {
  return { id, field, fieldLabel: field, operator, values };
}

function makeGroup(
  id: string,
  connector: "AND" | "OR",
  children: FilterGroup["children"],
): FilterGroup {
  return { id, connector, children };
}

function makeState(expression: FilterGroup): FilterState {
  return { expression };
}

describe("serializeFilterState (groups)", () => {
  it("serializes a single OR group", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [
          makeCondition("c1", "status", ["Blocked"]),
          makeCondition("c2", "type", ["XSS"]),
        ]),
      ]),
    );

    const params = serializeFilterState(state);
    expect(params.get("g1.status")).toBe("Blocked");
    expect(params.get("g1.type")).toBe("XSS");
    expect(params.get("g1__op")).toBe("OR");
  });

  it("serializes group + root condition mix", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeCondition("c1", "impact", ["High"]),
        makeGroup("g1", "OR", [
          makeCondition("c2", "status", ["Blocked"]),
          makeCondition("c3", "type", ["XSS"]),
        ]),
      ]),
    );

    const params = serializeFilterState(state);
    expect(params.get("impact")).toBe("High");
    expect(params.get("g1.status")).toBe("Blocked");
    expect(params.get("g1.type")).toBe("XSS");
    expect(params.get("g1__op")).toBe("OR");
  });

  it("serializes non-default operators inside groups", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [
          makeCondition("c1", "status", ["Blocked"], "is_not"),
          makeCondition("c2", "type", ["XSS"]),
        ]),
      ]),
    );

    const params = serializeFilterState(state);
    expect(params.get("g1.status")).toBe("Blocked");
    expect(params.get("g1.status__op")).toBe("is_not");
  });

  it("serializes multiple groups", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [
          makeCondition("c1", "status", ["Blocked"]),
          makeCondition("c2", "type", ["XSS"]),
        ]),
        makeGroup("g2", "OR", [
          makeCondition("c3", "impact", ["High"]),
          makeCondition("c4", "host", ["api.example.com"], "contains"),
        ]),
      ]),
    );

    const params = serializeFilterState(state);
    expect(params.get("g1.status")).toBe("Blocked");
    expect(params.get("g1__op")).toBe("OR");
    expect(params.get("g2.impact")).toBe("High");
    expect(params.get("g2__op")).toBe("OR");
    // host has default op "contains" for text → no __op param
    expect(params.get("g2.host")).toBe("api.example.com");
    expect(params.get("g2.host__op")).toBeNull();
  });
});

describe("deserializeFilterState (groups)", () => {
  it("deserializes a single OR group", () => {
    const params = new URLSearchParams(
      "g1.status=Blocked&g1.type=XSS&g1__op=OR",
    );
    const state = deserializeFilterState(params);

    expect(state.expression.children).toHaveLength(1);
    const group = state.expression.children[0];
    expect(isFilterGroup(group)).toBe(true);
    if (isFilterGroup(group)) {
      expect(group.connector).toBe("OR");
      expect(group.children).toHaveLength(2);
    }
  });

  it("deserializes group with root condition", () => {
    const params = new URLSearchParams(
      "impact=High&g1.status=Blocked&g1.type=XSS&g1__op=OR",
    );
    const state = deserializeFilterState(params);

    expect(state.expression.children).toHaveLength(2);

    const rootCondition = state.expression.children.find(
      (c) => isFilterCondition(c) && c.field === "impact",
    );
    expect(rootCondition).toBeDefined();

    const group = state.expression.children.find(isFilterGroup);
    expect(group).toBeDefined();
    if (group && isFilterGroup(group)) {
      expect(group.connector).toBe("OR");
    }
  });

  it("deserializes operator overrides inside groups", () => {
    const params = new URLSearchParams(
      "g1.status=Blocked&g1.status__op=is_not&g1.type=XSS&g1__op=OR",
    );
    const state = deserializeFilterState(params);

    const group = state.expression.children[0];
    if (isFilterGroup(group)) {
      const statusCondition = group.children.find(
        (c) => isFilterCondition(c) && c.field === "status",
      );
      expect(
        statusCondition && "operator" in statusCondition && statusCondition.operator,
      ).toBe("is_not");
    }
  });

  it("skips unknown fields inside groups", () => {
    const params = new URLSearchParams(
      "g1.status=Blocked&g1.unknown=foo&g1__op=OR",
    );
    const state = deserializeFilterState(params);

    // Single-child group gets sanitized (promoted)
    expect(state.expression.children).toHaveLength(1);
    expect(isFilterCondition(state.expression.children[0])).toBe(true);
  });

  it("sanitizes single-child groups (promotes to root)", () => {
    const params = new URLSearchParams("g1.status=Blocked&g1__op=OR");
    const state = deserializeFilterState(params);

    // Single condition in group → promoted
    expect(state.expression.children).toHaveLength(1);
    expect(isFilterCondition(state.expression.children[0])).toBe(true);
  });

  it("defaults group connector to AND when g{N}__op is missing", () => {
    const params = new URLSearchParams("g1.status=Blocked&g1.type=XSS");
    const state = deserializeFilterState(params);

    const group = state.expression.children[0];
    if (isFilterGroup(group)) {
      expect(group.connector).toBe("AND");
    }
  });

  it("handles empty group params gracefully", () => {
    const params = new URLSearchParams("g1__op=OR");
    const state = deserializeFilterState(params);
    expect(state.expression.children).toHaveLength(0);
  });
});

describe("round-trip: groups", () => {
  it("round-trips OR group", () => {
    const original = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [
          makeCondition("c1", "status", ["Blocked"]),
          makeCondition("c2", "type", ["XSS"]),
        ]),
      ]),
    );

    const params = serializeFilterState(original);
    const restored = deserializeFilterState(params);

    expect(restored.expression.children).toHaveLength(1);
    const group = restored.expression.children[0];
    expect(isFilterGroup(group)).toBe(true);
    if (isFilterGroup(group)) {
      expect(group.connector).toBe("OR");
      expect(group.children).toHaveLength(2);
      const fields = group.children.map((c) =>
        isFilterCondition(c) ? c.field : "",
      );
      expect(fields).toContain("status");
      expect(fields).toContain("type");
    }
  });

  it("round-trips mixed root + group", () => {
    const original = makeState(
      makeGroup("root", "AND", [
        makeCondition("c0", "impact", ["High"]),
        makeGroup("g1", "OR", [
          makeCondition("c1", "status", ["Blocked"]),
          makeCondition("c2", "type", ["XSS", "CSRF"]),
        ]),
      ]),
    );

    const params = serializeFilterState(original);
    const restored = deserializeFilterState(params);

    expect(restored.expression.children).toHaveLength(2);
    const rootCond = restored.expression.children.find(
      (c) => isFilterCondition(c) && c.field === "impact",
    );
    expect(rootCond).toBeDefined();

    const group = restored.expression.children.find(isFilterGroup);
    expect(group).toBeDefined();
    if (group && isFilterGroup(group)) {
      expect(group.children).toHaveLength(2);
    }
  });

  it("round-trips group with non-default operators", () => {
    const original = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [
          makeCondition("c1", "status", ["Blocked"], "is_not"),
          makeCondition("c2", "endpoints", ["api"], "contains"),
        ]),
      ]),
    );

    const params = serializeFilterState(original);
    const restored = deserializeFilterState(params);

    const group = restored.expression.children[0];
    if (isFilterGroup(group)) {
      const statusCond = group.children.find(
        (c) => isFilterCondition(c) && c.field === "status",
      ) as FilterCondition | undefined;
      expect(statusCond?.operator).toBe("is_not");

      const endpointCond = group.children.find(
        (c) => isFilterCondition(c) && c.field === "endpoints",
      ) as FilterCondition | undefined;
      expect(endpointCond?.operator).toBe("contains");
    }
  });
});
