import { describe, it, expect } from "vitest";
import { evaluateExpression } from "../filter-engine";
import type { FilterState, FilterCondition } from "@/types/filters";

function makeState(condition: FilterCondition): FilterState {
  return {
    expression: {
      id: "root",
      connector: "AND",
      children: [condition],
    },
  };
}

function condition(
  field: string,
  operator: string,
  values: string[],
): FilterCondition {
  return {
    id: "c1",
    field,
    fieldLabel: field,
    operator: operator as FilterCondition["operator"],
    values,
  };
}

const records = [
  { id: "1", sources: { ips: ["10.0.0.1"] } },
  { id: "2", sources: { ips: ["10.0.0.2"] } },
  { id: "3", sources: { ips: ["192.168.1.1"] } },
  { id: "4", sources: { ips: ["10.0.0.1", "192.168.1.1"] } },
];

describe("filter engine — IP operators", () => {
  describe("in", () => {
    it("matches single IP", () => {
      const state = makeState(condition("sources.ips", "in", ["10.0.0.1"]));
      const result = evaluateExpression(records, state);
      expect(result.map((r) => r.id)).toEqual(["1", "4"]);
    });

    it("does not match non-existing IP", () => {
      const state = makeState(condition("sources.ips", "in", ["172.16.0.1"]));
      const result = evaluateExpression(records, state);
      expect(result).toHaveLength(0);
    });

    it("matches CIDR range /24", () => {
      const state = makeState(condition("sources.ips", "in", ["10.0.0.0/24"]));
      const result = evaluateExpression(records, state);
      expect(result.map((r) => r.id)).toEqual(["1", "2", "4"]);
    });

    it("does not match CIDR range that excludes record", () => {
      const state = makeState(condition("sources.ips", "in", ["192.168.0.0/24"]));
      const result = evaluateExpression(records, state);
      // 192.168.0.0/24 does NOT match 192.168.1.1
      expect(result).toHaveLength(0);
    });

    it("matches mixed IP and CIDR values", () => {
      const state = makeState(
        condition("sources.ips", "in", ["10.0.0.1", "192.168.1.0/24"]),
      );
      const result = evaluateExpression(records, state);
      expect(result.map((r) => r.id)).toEqual(["1", "3", "4"]);
    });
  });

  describe("not_in", () => {
    it("excludes matching IP", () => {
      const state = makeState(condition("sources.ips", "not_in", ["10.0.0.1"]));
      const result = evaluateExpression(records, state);
      expect(result.map((r) => r.id)).toEqual(["2", "3"]);
    });

    it("excludes CIDR range", () => {
      const state = makeState(condition("sources.ips", "not_in", ["10.0.0.0/24"]));
      const result = evaluateExpression(records, state);
      expect(result.map((r) => r.id)).toEqual(["3"]);
    });
  });

  describe("edge cases", () => {
    it("/0 matches everything", () => {
      const state = makeState(condition("sources.ips", "in", ["0.0.0.0/0"]));
      const result = evaluateExpression(records, state);
      expect(result).toHaveLength(4);
    });

    it("/32 matches exact IP only", () => {
      const state = makeState(condition("sources.ips", "in", ["10.0.0.1/32"]));
      const result = evaluateExpression(records, state);
      expect(result.map((r) => r.id)).toEqual(["1", "4"]);
    });

    it("array source field with multiple IPs", () => {
      // Record 4 has both 10.0.0.1 and 192.168.1.1
      const state = makeState(condition("sources.ips", "in", ["192.168.1.1"]));
      const result = evaluateExpression(records, state);
      expect(result.map((r) => r.id)).toEqual(["3", "4"]);
    });
  });
});
