import { describe, it, expect } from "vitest";
import {
  validateExpression,
  isValidExpression,
  sanitizeExpression,
} from "../filter-validation";
import type { FilterState, FilterGroup, FilterCondition } from "@/types/filters";

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

describe("validateExpression", () => {
  it("returns no errors for empty AND expression", () => {
    const state = makeState(makeGroup("root", "AND", []));
    expect(validateExpression(state)).toEqual([]);
  });

  it("returns no errors for valid flat AND expression", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeCondition("c1", "status", ["Blocked"]),
        makeCondition("c2", "type", ["XSS"]),
      ]),
    );
    expect(validateExpression(state)).toEqual([]);
  });

  it("returns no errors for valid AND expression with OR group", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [
          makeCondition("c1", "status", ["Blocked"]),
          makeCondition("c2", "type", ["XSS"]),
        ]),
        makeCondition("c3", "impact", ["High"]),
      ]),
    );
    expect(validateExpression(state)).toEqual([]);
  });

  it("detects top-level OR", () => {
    const state = makeState(
      makeGroup("root", "OR", [
        makeCondition("c1", "status"),
        makeCondition("c2", "type"),
      ]),
    );
    const errors = validateExpression(state);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe("TOP_LEVEL_OR");
    expect(errors[0].nodeId).toBe("root");
  });

  it("detects empty group", () => {
    const state = makeState(
      makeGroup("root", "AND", [makeGroup("g1", "OR", [])]),
    );
    const errors = validateExpression(state);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe("EMPTY_GROUP");
    expect(errors[0].nodeId).toBe("g1");
  });

  it("detects single-child group", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [makeCondition("c1", "status")]),
      ]),
    );
    const errors = validateExpression(state);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe("SINGLE_CHILD_GROUP");
    expect(errors[0].nodeId).toBe("g1");
  });

  it("detects multiple errors simultaneously", () => {
    const state = makeState(
      makeGroup("root", "OR", [
        makeGroup("g1", "OR", []),
        makeGroup("g2", "AND", [makeCondition("c1", "status")]),
      ]),
    );
    const errors = validateExpression(state);
    expect(errors).toHaveLength(3); // TOP_LEVEL_OR + EMPTY_GROUP + SINGLE_CHILD_GROUP
    const types = errors.map((e) => e.type);
    expect(types).toContain("TOP_LEVEL_OR");
    expect(types).toContain("EMPTY_GROUP");
    expect(types).toContain("SINGLE_CHILD_GROUP");
  });
});

describe("isValidExpression", () => {
  it("returns true for valid expression", () => {
    const state = makeState(
      makeGroup("root", "AND", [makeCondition("c1", "status")]),
    );
    expect(isValidExpression(state)).toBe(true);
  });

  it("returns false for invalid expression", () => {
    const state = makeState(
      makeGroup("root", "OR", [makeCondition("c1", "status")]),
    );
    expect(isValidExpression(state)).toBe(false);
  });
});

describe("sanitizeExpression", () => {
  it("flips root OR to AND", () => {
    const state = makeState(
      makeGroup("root", "OR", [
        makeCondition("c1", "status"),
        makeCondition("c2", "type"),
      ]),
    );
    const sanitized = sanitizeExpression(state);
    expect(sanitized.expression.connector).toBe("AND");
    expect(sanitized.expression.children).toHaveLength(2);
  });

  it("removes empty groups", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", []),
        makeCondition("c1", "status"),
      ]),
    );
    const sanitized = sanitizeExpression(state);
    expect(sanitized.expression.children).toHaveLength(1);
    expect("field" in sanitized.expression.children[0]).toBe(true);
  });

  it("promotes single-child groups", () => {
    const child = makeCondition("c1", "status", ["Blocked"]);
    const state = makeState(
      makeGroup("root", "AND", [makeGroup("g1", "OR", [child])]),
    );
    const sanitized = sanitizeExpression(state);
    expect(sanitized.expression.children).toHaveLength(1);
    expect(sanitized.expression.children[0]).toEqual(child);
  });

  it("preserves valid groups", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeGroup("g1", "OR", [
          makeCondition("c1", "status"),
          makeCondition("c2", "type"),
        ]),
      ]),
    );
    const sanitized = sanitizeExpression(state);
    expect(sanitized.expression.children).toHaveLength(1);
    const group = sanitized.expression.children[0];
    expect("connector" in group && group.connector).toBe("OR");
  });

  it("handles combined sanitization (root OR + empty group + single-child group)", () => {
    const child = makeCondition("c1", "status");
    const state = makeState(
      makeGroup("root", "OR", [
        makeGroup("g1", "OR", []),
        makeGroup("g2", "AND", [child]),
        makeCondition("c2", "type"),
      ]),
    );
    const sanitized = sanitizeExpression(state);
    expect(sanitized.expression.connector).toBe("AND");
    // g1 (empty) removed, g2 (single-child) promoted, c2 kept
    expect(sanitized.expression.children).toHaveLength(2);
    expect(sanitized.expression.children[0]).toEqual(child);
  });

  it("returns valid expression unchanged (structurally)", () => {
    const state = makeState(
      makeGroup("root", "AND", [
        makeCondition("c1", "status"),
        makeCondition("c2", "type"),
      ]),
    );
    const sanitized = sanitizeExpression(state);
    expect(sanitized.expression.children).toHaveLength(2);
    expect(sanitized.expression.connector).toBe("AND");
  });
});
