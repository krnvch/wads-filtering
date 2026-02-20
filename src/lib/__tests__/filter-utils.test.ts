import { describe, it, expect } from "vitest";
import {
  createEmptyState,
  createEmptyExpression,
  createCondition,
  addCondition,
  removeCondition,
  updateConditionValues,
  updateConditionOperator,
  generateFilterId,
  createGroup,
  ungroupChildren,
  toggleConnector,
} from "../filter-utils";
import type { FilterCondition, FilterGroup, FilterState } from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";

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

describe("updateConditionOperator", () => {
  it("updates operator for condition by id", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    const newState = updateConditionOperator(state, condition.id, "is_not");
    const updated = newState.expression.children[0];
    expect("operator" in updated && updated.operator).toBe("is_not");
  });

  it("preserves values when changing operator", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked", "Monitored"]);
    state = addCondition(state, condition);

    const newState = updateConditionOperator(state, condition.id, "is_not");
    const updated = newState.expression.children[0];
    expect("values" in updated && updated.values).toEqual(["Blocked", "Monitored"]);
  });

  it("does not mutate original state", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    updateConditionOperator(state, condition.id, "contains");
    const original = state.expression.children[0];
    expect("operator" in original && original.operator).toBe("is");
  });

  it("no-ops if id does not exist", () => {
    let state = createEmptyState();
    const condition = createCondition("status", ["Blocked"]);
    state = addCondition(state, condition);

    const newState = updateConditionOperator(state, "nonexistent", "is_not");
    expect(newState.expression.children).toHaveLength(1);
    const child = newState.expression.children[0];
    expect("operator" in child && child.operator).toBe("is");
  });
});

// --- Helpers for group tests ---

function makeCondition(
  id: string,
  field: string,
  values: string[] = ["val"],
): FilterCondition {
  return { id, field, fieldLabel: field, operator: "is", values };
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

// --- Recursive remove/update/operator tests ---

describe("removeCondition (recursive)", () => {
  it("removes condition inside a group", () => {
    const c1 = makeCondition("c1", "status", ["Blocked"]);
    const c2 = makeCondition("c2", "type", ["XSS"]);
    const c3 = makeCondition("c3", "impact", ["High"]);
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [c1, c2]),
        c3,
      ]),
    );

    const newState = removeCondition(state, "c1");
    // g1 had 2 children, now 1 → auto-ungroup: c2 promoted to root
    expect(newState.expression.children).toHaveLength(2);
    expect(isFilterCondition(newState.expression.children[0])).toBe(true);
    const promoted = newState.expression.children[0] as FilterCondition;
    expect(promoted.id).toBe("c2");
  });

  it("auto-ungroups when group drops to 1 child", () => {
    const c1 = makeCondition("c1", "status");
    const c2 = makeCondition("c2", "type");
    const state = makeState(
      makeGroup("root", "AND", [makeGroup("g1", "OR", [c1, c2])]),
    );

    const newState = removeCondition(state, "c1");
    expect(newState.expression.children).toHaveLength(1);
    expect(isFilterCondition(newState.expression.children[0])).toBe(true);
    expect((newState.expression.children[0] as FilterCondition).id).toBe("c2");
  });

  it("removes empty group when last child is removed", () => {
    const c1 = makeCondition("c1", "status");
    const c2 = makeCondition("c2", "type");
    const state = makeState(
      makeGroup("root", "AND", [makeGroup("g1", "OR", [c1]), c2]),
    );

    const newState = removeCondition(state, "c1");
    // g1 had 1 child (already single), after removal it's empty → dropped
    // Wait: removeFromGroup: c1 removed → g1 has 0 children → dropped
    expect(newState.expression.children).toHaveLength(1);
    expect((newState.expression.children[0] as FilterCondition).id).toBe("c2");
  });
});

describe("updateConditionValues (recursive)", () => {
  it("updates values for condition inside a group", () => {
    const c1 = makeCondition("c1", "status", ["Blocked"]);
    const c2 = makeCondition("c2", "type", ["XSS"]);
    const state = makeState(
      makeGroup("root", "AND", [makeGroup("g1", "OR", [c1, c2])]),
    );

    const newState = updateConditionValues(state, "c1", ["Blocked", "Monitored"]);
    const group = newState.expression.children[0] as FilterGroup;
    const updated = group.children[0] as FilterCondition;
    expect(updated.values).toEqual(["Blocked", "Monitored"]);
  });

  it("removes condition inside group when values empty, with auto-ungroup", () => {
    const c1 = makeCondition("c1", "status", ["Blocked"]);
    const c2 = makeCondition("c2", "type", ["XSS"]);
    const state = makeState(
      makeGroup("root", "AND", [makeGroup("g1", "OR", [c1, c2])]),
    );

    const newState = updateConditionValues(state, "c1", []);
    // c1 removed → g1 has 1 child → auto-ungroup
    expect(newState.expression.children).toHaveLength(1);
    expect(isFilterCondition(newState.expression.children[0])).toBe(true);
    expect((newState.expression.children[0] as FilterCondition).id).toBe("c2");
  });
});

describe("updateConditionOperator (recursive)", () => {
  it("updates operator for condition inside a group", () => {
    const c1 = makeCondition("c1", "status", ["Blocked"]);
    const c2 = makeCondition("c2", "type", ["XSS"]);
    const state = makeState(
      makeGroup("root", "AND", [makeGroup("g1", "OR", [c1, c2])]),
    );

    const newState = updateConditionOperator(state, "c1", "is_not");
    const group = newState.expression.children[0] as FilterGroup;
    const updated = group.children[0] as FilterCondition;
    expect(updated.operator).toBe("is_not");
  });
});

// --- Group operations tests ---

describe("createGroup", () => {
  it("wraps two adjacent conditions into an OR group", () => {
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    let state = createEmptyState();
    state = addCondition(state, c1);
    state = addCondition(state, c2);

    const newState = createGroup(state, c1.id, c2.id);
    expect(newState.expression.children).toHaveLength(1);
    const group = newState.expression.children[0];
    expect(isFilterGroup(group)).toBe(true);
    if (isFilterGroup(group)) {
      expect(group.connector).toBe("OR");
      expect(group.children).toHaveLength(2);
    }
  });

  it("inserts group at position of first condition", () => {
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    const c3 = createCondition("impact", ["High"]);
    let state = createEmptyState();
    state = addCondition(state, c1);
    state = addCondition(state, c2);
    state = addCondition(state, c3);

    const newState = createGroup(state, c2.id, c3.id);
    expect(newState.expression.children).toHaveLength(2);
    // c1 stays at index 0, group at index 1
    expect(isFilterCondition(newState.expression.children[0])).toBe(true);
    expect(isFilterGroup(newState.expression.children[1])).toBe(true);
  });

  it("no-ops if condition ids are not found", () => {
    const state = createEmptyState();
    const newState = createGroup(state, "nope1", "nope2");
    expect(newState).toBe(state);
  });

  it("groups non-adjacent conditions", () => {
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    const c3 = createCondition("impact", ["High"]);
    let state = createEmptyState();
    state = addCondition(state, c1);
    state = addCondition(state, c2);
    state = addCondition(state, c3);

    // Group c1 and c3 (non-adjacent)
    const newState = createGroup(state, c1.id, c3.id);
    expect(newState.expression.children).toHaveLength(2);
    // Group at position 0 (c1's position), c2 remains
    expect(isFilterGroup(newState.expression.children[0])).toBe(true);
    expect(isFilterCondition(newState.expression.children[1])).toBe(true);
    expect((newState.expression.children[1] as FilterCondition).id).toBe(c2.id);
  });
});

describe("ungroupChildren", () => {
  it("promotes group children to root at group position", () => {
    const c1 = makeCondition("c1", "status");
    const c2 = makeCondition("c2", "type");
    const c3 = makeCondition("c3", "impact");
    const state = makeState(
      makeGroup("root", "AND", [
        c1,
        makeGroup("g1", "OR", [c2, c3]),
      ]),
    );

    const newState = ungroupChildren(state, "g1");
    expect(newState.expression.children).toHaveLength(3);
    expect((newState.expression.children[0] as FilterCondition).id).toBe("c1");
    expect((newState.expression.children[1] as FilterCondition).id).toBe("c2");
    expect((newState.expression.children[2] as FilterCondition).id).toBe("c3");
  });

  it("no-ops if group id not found", () => {
    const state = makeState(makeGroup("root", "AND", [makeCondition("c1", "status")]));
    const newState = ungroupChildren(state, "nonexistent");
    expect(newState).toBe(state);
  });
});

describe("toggleConnector", () => {
  it("groups two adjacent conditions into OR when toggling AND→OR", () => {
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    let state = createEmptyState();
    state = addCondition(state, c1);
    state = addCondition(state, c2);

    const newState = toggleConnector(state, 0);
    expect(newState.expression.children).toHaveLength(1);
    const group = newState.expression.children[0];
    expect(isFilterGroup(group)).toBe(true);
    if (isFilterGroup(group)) {
      expect(group.connector).toBe("OR");
    }
  });

  it("ungroups an OR group when toggling OR→AND", () => {
    const c1 = makeCondition("c1", "status");
    const c2 = makeCondition("c2", "type");
    const c3 = makeCondition("c3", "impact");
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [c1, c2]),
        c3,
      ]),
    );

    // leftIndex=0 is the OR group → ungroup
    const newState = toggleConnector(state, 0);
    expect(newState.expression.children).toHaveLength(3);
    expect(isFilterCondition(newState.expression.children[0])).toBe(true);
    expect(isFilterCondition(newState.expression.children[1])).toBe(true);
    expect(isFilterCondition(newState.expression.children[2])).toBe(true);
  });

  it("no-ops for out-of-bounds index", () => {
    const c1 = createCondition("status", ["Blocked"]);
    let state = createEmptyState();
    state = addCondition(state, c1);

    expect(toggleConnector(state, -1)).toBe(state);
    expect(toggleConnector(state, 0)).toBe(state);
    expect(toggleConnector(state, 5)).toBe(state);
  });

  it("no-ops when left is a group and right is a condition (prevents nesting)", () => {
    const c1 = makeCondition("c1", "status");
    const c2 = makeCondition("c2", "type");
    const c3 = makeCondition("c3", "impact");
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "AND", [c1, c2]),
        c3,
      ]),
    );

    // g1 is an AND group (not OR), so toggleConnector won't ungroup it
    // and left is a group + right is condition → no-op
    const newState = toggleConnector(state, 0);
    expect(newState).toBe(state);
  });

  it("handles toggle with 3 conditions: groups middle two", () => {
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    const c3 = createCondition("impact", ["High"]);
    let state = createEmptyState();
    state = addCondition(state, c1);
    state = addCondition(state, c2);
    state = addCondition(state, c3);

    // Toggle connector between c2 and c3 (index 1)
    const newState = toggleConnector(state, 1);
    expect(newState.expression.children).toHaveLength(2);
    expect(isFilterCondition(newState.expression.children[0])).toBe(true);
    expect(isFilterGroup(newState.expression.children[1])).toBe(true);
  });
});
