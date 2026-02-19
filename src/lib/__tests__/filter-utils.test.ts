import { describe, it, expect } from "vitest";
import {
  createEmptyState,
  createEmptyExpression,
  createCondition,
  addCondition,
  removeCondition,
  updateConditionValues,
  generateFilterId,
} from "../filter-utils";

describe("generateFilterId", () => {
  it("returns a valid UUID string", () => {
    const id = generateFilterId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateFilterId()));
    expect(ids.size).toBe(100);
  });
});

describe("createEmptyExpression", () => {
  it("returns an AND group with no children", () => {
    const expr = createEmptyExpression();
    expect(expr.connector).toBe("AND");
    expect(expr.children).toEqual([]);
    expect(expr.id).toBeDefined();
  });
});

describe("createEmptyState", () => {
  it("returns state with empty AND expression", () => {
    const state = createEmptyState();
    expect(state.expression.connector).toBe("AND");
    expect(state.expression.children).toEqual([]);
  });
});

describe("createCondition", () => {
  it("creates a condition with default is operator", () => {
    const condition = createCondition("status", ["Blocked"]);
    expect(condition.field).toBe("status");
    expect(condition.fieldLabel).toBe("Status");
    expect(condition.operator).toBe("is");
    expect(condition.values).toEqual(["Blocked"]);
    expect(condition.id).toBeDefined();
  });

  it("uses provided operator", () => {
    const condition = createCondition("status", ["Blocked"], "is_not");
    expect(condition.operator).toBe("is_not");
  });

  it("falls back to key as label for unknown fields", () => {
    const condition = createCondition("unknown_field", ["val"]);
    expect(condition.fieldLabel).toBe("unknown_field");
  });
});

describe("addCondition", () => {
  it("appends condition to root children", () => {
    const state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    const newState = addCondition(state, condition);

    expect(newState.expression.children).toHaveLength(1);
    expect(newState.expression.children[0]).toEqual(condition);
  });

  it("preserves existing children", () => {
    let state = createEmptyState();
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);

    state = addCondition(state, c1);
    state = addCondition(state, c2);

    expect(state.expression.children).toHaveLength(2);
  });

  it("does not mutate original state", () => {
    const state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    addCondition(state, condition);

    expect(state.expression.children).toHaveLength(0);
  });
});

describe("removeCondition", () => {
  it("removes condition by id", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    const newState = removeCondition(state, condition.id);
    expect(newState.expression.children).toHaveLength(0);
  });

  it("preserves other conditions", () => {
    let state = createEmptyState();
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    state = addCondition(state, c1);
    state = addCondition(state, c2);

    const newState = removeCondition(state, c1.id);
    expect(newState.expression.children).toHaveLength(1);
    expect(newState.expression.children[0]).toEqual(c2);
  });

  it("no-ops if id does not exist", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    const newState = removeCondition(state, "nonexistent");
    expect(newState.expression.children).toHaveLength(1);
  });
});

describe("updateConditionValues", () => {
  it("updates values for condition by id", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    const newState = updateConditionValues(state, condition.id, [
      "Blocked",
      "Monitored",
    ]);
    const updated = newState.expression.children[0];
    expect("values" in updated && updated.values).toEqual([
      "Blocked",
      "Monitored",
    ]);
  });

  it("removes condition if values array is empty", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    const newState = updateConditionValues(state, condition.id, []);
    expect(newState.expression.children).toHaveLength(0);
  });

  it("does not mutate original state", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    updateConditionValues(state, condition.id, ["Monitored"]);
    const original = state.expression.children[0];
    expect("values" in original && original.values).toEqual(["Blocked"]);
  });
});
