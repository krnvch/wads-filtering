import { describe, it, expect } from "vitest";
import { evaluateExpression } from "../filter-engine";
import {
  createEmptyState,
  createCondition,
  addCondition,
  generateFilterId,
} from "../filter-utils";
import type { FilterGroup, FilterState } from "@/types/filters";

const mockData = [
  {
    id: "1",
    type: "XSS",
    status: "Blocked",
    impact: "High",
    response_code: 200,
    host: "api.example.com",
    sources: { countries: ["US", "UK"] },
  },
  {
    id: "2",
    type: "SQL Injection",
    status: "Monitored",
    impact: "Medium",
    response_code: 401,
    host: "orders.example.com",
    sources: { countries: ["Italy"] },
  },
  {
    id: "3",
    type: "XSS",
    status: "Started",
    impact: "Low",
    response_code: 500,
    host: "api.example.com",
    sources: { countries: ["China", "US"] },
  },
  {
    id: "4",
    type: "BOLA Attack",
    status: "Blocked",
    impact: "High",
    response_code: 403,
    host: "admin.example.com",
    sources: { countries: ["Russia"] },
  },
  {
    id: "5",
    type: "Brute Force",
    status: "Monitored",
    impact: "Medium",
    response_code: 404,
    host: "login.example.com",
    sources: { countries: ["Brazil"] },
  },
];

describe("evaluateExpression", () => {
  describe("empty filter", () => {
    it("returns all data when no conditions exist", () => {
      const state = createEmptyState();
      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(5);
    });
  });

  describe("is operator", () => {
    it("filters by single value", () => {
      let state = createEmptyState();
      state = addCondition(state, createCondition("status", ["Blocked"]));

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.status === "Blocked")).toBe(true);
    });

    it("filters by multiple values (OR within same condition)", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("status", ["Blocked", "Monitored"]),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(4);
    });
  });

  describe("is_not operator", () => {
    it("excludes matching records", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("status", ["Blocked"], "is_not"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.status !== "Blocked")).toBe(true);
    });

    it("excludes multiple values", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("status", ["Blocked", "Monitored"], "is_not"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("Started");
    });
  });

  describe("contains operator", () => {
    it("matches substring", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("host", ["api"], "contains"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(2);
      expect(result.every((r) => (r.host as string).includes("api"))).toBe(
        true,
      );
    });
  });

  describe("does_not_contain operator", () => {
    it("excludes substring matches", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("host", ["api"], "does_not_contain"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(3);
      expect(result.every((r) => !(r.host as string).includes("api"))).toBe(
        true,
      );
    });
  });

  describe("AND logic (multiple conditions)", () => {
    it("intersects results of all conditions", () => {
      let state = createEmptyState();
      state = addCondition(state, createCondition("status", ["Blocked"]));
      state = addCondition(state, createCondition("type", ["XSS"]));

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("returns empty when conditions are mutually exclusive", () => {
      let state = createEmptyState();
      state = addCondition(state, createCondition("status", ["Blocked"]));
      state = addCondition(state, createCondition("status", ["Started"]));

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(0);
    });
  });

  describe("OR logic (group)", () => {
    it("unions results of conditions in OR group", () => {
      const orGroup: FilterGroup = {
        id: generateFilterId(),
        connector: "OR",
        children: [
          createCondition("status", ["Blocked"]),
          createCondition("type", ["Brute Force"]),
        ],
      };

      const state: FilterState = {
        expression: {
          id: generateFilterId(),
          connector: "AND",
          children: [orGroup],
        },
      };

      const result = evaluateExpression(mockData, state);
      // Blocked: id 1, 4; Brute Force: id 5
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id).sort()).toEqual(["1", "4", "5"]);
    });
  });

  describe("nested groups (AND containing OR)", () => {
    it("evaluates ( A OR B ) AND C", () => {
      const orGroup: FilterGroup = {
        id: generateFilterId(),
        connector: "OR",
        children: [
          createCondition("type", ["XSS"]),
          createCondition("type", ["BOLA Attack"]),
        ],
      };

      const state: FilterState = {
        expression: {
          id: generateFilterId(),
          connector: "AND",
          children: [orGroup, createCondition("status", ["Blocked"])],
        },
      };

      const result = evaluateExpression(mockData, state);
      // XSS + Blocked = id 1, BOLA + Blocked = id 4
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(["1", "4"]);
    });
  });

  describe("nested field paths", () => {
    it("handles dot-notation for nested fields", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("sources.countries", ["Italy"]),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("handles is_not on array fields", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("sources.countries", ["US"], "is_not"),
      );

      const result = evaluateExpression(mockData, state);
      // Records without US: id 2 (Italy), 4 (Russia), 5 (Brazil)
      expect(result).toHaveLength(3);
    });
  });

  describe("http_status_code as string", () => {
    it("matches numeric response_code when filter values are strings", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["200", "401"]),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(["1", "2"]);
    });
  });
});
