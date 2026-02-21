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

  describe("is_any_of operator", () => {
    it("filters by single value (aliases is)", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("status", ["Blocked"], "is_any_of"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.status === "Blocked")).toBe(true);
    });

    it("filters by multiple values", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("status", ["Blocked", "Monitored"], "is_any_of"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(4);
    });

    it("works with array fields", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("sources.countries", ["US", "Italy"], "is_any_of"),
      );

      const result = evaluateExpression(mockData, state);
      // US: id 1, 3; Italy: id 2
      expect(result).toHaveLength(3);
    });
  });

  describe("is_none_of operator", () => {
    it("excludes single value (aliases is_not)", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("status", ["Blocked"], "is_none_of"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.status !== "Blocked")).toBe(true);
    });

    it("excludes multiple values", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("status", ["Blocked", "Monitored"], "is_none_of"),
      );

      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("Started");
    });

    it("works with array fields", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("sources.countries", ["US"], "is_none_of"),
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

  describe("starts_with operator", () => {
    it("matches string prefix", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("host", ["api"], "starts_with"),
      );
      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(2);
      expect(result.every((r) => (r.host as string).startsWith("api"))).toBe(true);
    });
  });

  describe("ends_with operator", () => {
    it("matches string suffix", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("host", [".com"], "ends_with"),
      );
      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(5); // all hosts end with .com
    });
  });

  describe("is_set operator", () => {
    it("matches records where field is set", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("host", [], "is_set"),
      );
      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(5); // all have host
    });

    it("excludes records where field is null/undefined", () => {
      const dataWithNull = [
        ...mockData,
        { id: "6", type: "XSS", status: "Blocked", impact: "Low", response_code: 200, host: "", sources: { countries: [] } },
      ];
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("host", [], "is_set"),
      );
      const result = evaluateExpression(dataWithNull as Record<string, unknown>[], state);
      expect(result).toHaveLength(5); // empty string is not "set"
    });
  });

  describe("is_not_set operator", () => {
    it("matches records where field is empty or missing", () => {
      const dataWithNull = [
        ...mockData,
        { id: "6", type: "XSS", status: "Blocked", impact: "Low", response_code: 200, host: "", sources: { countries: [] } },
      ];
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("host", [], "is_not_set"),
      );
      const result = evaluateExpression(dataWithNull as Record<string, unknown>[], state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("6");
    });
  });

  describe("numeric operators", () => {
    it("equals matches exact number", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["200"], "equals"),
      );
      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(1);
      expect(result[0].response_code).toBe(200);
    });

    it("not_equals excludes exact number", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["200"], "not_equals"),
      );
      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(4);
      expect(result.every((r) => r.response_code !== 200)).toBe(true);
    });

    it("gt matches greater than", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["403"], "gt"),
      );
      const result = evaluateExpression(mockData, state);
      // 404 and 500
      expect(result).toHaveLength(2);
    });

    it("gte matches greater than or equal", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["403"], "gte"),
      );
      const result = evaluateExpression(mockData, state);
      // 403, 404, 500
      expect(result).toHaveLength(3);
    });

    it("lt matches less than", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["401"], "lt"),
      );
      const result = evaluateExpression(mockData, state);
      // 200
      expect(result).toHaveLength(1);
    });

    it("lte matches less than or equal", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["401"], "lte"),
      );
      const result = evaluateExpression(mockData, state);
      // 200, 401
      expect(result).toHaveLength(2);
    });

    it("in_between matches range inclusive", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["400", "500"], "in_between"),
      );
      const result = evaluateExpression(mockData, state);
      // 401, 403, 404, 500
      expect(result).toHaveLength(4);
    });

    it("in_between returns false for insufficient values", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("response_code", ["400"], "in_between"),
      );
      const result = evaluateExpression(mockData, state);
      expect(result).toHaveLength(0);
    });
  });

  describe("date operators", () => {
    const dateData = [
      { id: "d1", created_at: "2026-02-20T10:00:00Z" },
      { id: "d2", created_at: "2026-02-15T10:00:00Z" },
      { id: "d3", created_at: "2026-01-01T10:00:00Z" },
      { id: "d4", created_at: "2025-12-01T10:00:00Z" },
    ];

    it("before matches dates before target", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("created_at", ["2026-02-01"], "before"),
      );
      const result = evaluateExpression(dateData as Record<string, unknown>[], state);
      // d3 (Jan 1) and d4 (Dec 1 2025)
      expect(result).toHaveLength(2);
    });

    it("after matches dates after target", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("created_at", ["2026-02-01"], "after"),
      );
      const result = evaluateExpression(dateData as Record<string, unknown>[], state);
      // d1 (Feb 20) and d2 (Feb 15)
      expect(result).toHaveLength(2);
    });

    it("on matches same calendar day", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("created_at", ["2026-02-20"], "on"),
      );
      const result = evaluateExpression(dateData as Record<string, unknown>[], state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("d1");
    });

    it("not_on excludes same calendar day", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("created_at", ["2026-02-20"], "not_on"),
      );
      const result = evaluateExpression(dateData as Record<string, unknown>[], state);
      expect(result).toHaveLength(3);
    });

    it("between_dates matches date range", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("created_at", ["2026-01-01", "2026-02-16"], "between_dates"),
      );
      const result = evaluateExpression(dateData as Record<string, unknown>[], state);
      // d2 (Feb 15) and d3 (Jan 1)
      expect(result).toHaveLength(2);
    });

    it("between_dates returns empty for insufficient values", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("created_at", ["2026-01-01"], "between_dates"),
      );
      const result = evaluateExpression(dateData as Record<string, unknown>[], state);
      expect(result).toHaveLength(0);
    });
  });

  describe("starts_with on array fields", () => {
    it("matches array elements starting with value", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("sources.countries", ["U"], "starts_with"),
      );
      const result = evaluateExpression(mockData, state);
      // US, UK records: id 1, 3
      expect(result).toHaveLength(2);
    });
  });

  describe("ends_with on array fields", () => {
    it("matches array elements ending with value", () => {
      let state = createEmptyState();
      state = addCondition(
        state,
        createCondition("sources.countries", ["ly"], "ends_with"),
      );
      const result = evaluateExpression(mockData, state);
      // Italy: id 2
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });
});
