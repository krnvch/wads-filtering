import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilterState } from "../use-filter-state";
import { isFilterCondition } from "@/types/filters";

describe("useFilterState", () => {
  it("starts with empty state", () => {
    const { result } = renderHook(() => useFilterState());

    expect(result.current.filterState.expression.children).toHaveLength(0);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("accepts initial state", () => {
    const initial = {
      expression: {
        id: "root",
        connector: "AND" as const,
        children: [
          {
            id: "c1",
            field: "status",
            fieldLabel: "Status",
            operator: "is" as const,
            values: ["Blocked"],
          },
        ],
      },
    };

    const { result } = renderHook(() => useFilterState(initial));
    expect(result.current.filterState.expression.children).toHaveLength(1);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  describe("addFilter", () => {
    it("adds a filter condition and returns its id", () => {
      const { result } = renderHook(() => useFilterState());

      let id: string;
      act(() => {
        id = result.current.addFilter("status", ["Blocked"]);
      });

      expect(result.current.filterState.expression.children).toHaveLength(1);
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.activeFilterCount).toBe(1);

      const child = result.current.filterState.expression.children[0];
      expect(isFilterCondition(child)).toBe(true);
      if (isFilterCondition(child)) {
        expect(child.id).toBe(id!);
        expect(child.field).toBe("status");
        expect(child.values).toEqual(["Blocked"]);
        expect(child.operator).toBe("is");
      }
    });

    it("supports custom operator", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFilter("status", ["Blocked"], "is_not");
      });

      const child = result.current.filterState.expression.children[0];
      if (isFilterCondition(child)) {
        expect(child.operator).toBe("is_not");
      }
    });

    it("adds multiple filters", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFilter("status", ["Blocked"]);
        result.current.addFilter("type", ["XSS"]);
      });

      expect(result.current.activeFilterCount).toBe(2);
    });
  });

  describe("removeFilter", () => {
    it("removes a filter by id", () => {
      const { result } = renderHook(() => useFilterState());

      let id: string;
      act(() => {
        id = result.current.addFilter("status", ["Blocked"]);
      });

      act(() => {
        result.current.removeFilter(id);
      });

      expect(result.current.filterState.expression.children).toHaveLength(0);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("updateFilterValues", () => {
    it("updates values for an existing filter", () => {
      const { result } = renderHook(() => useFilterState());

      let id: string;
      act(() => {
        id = result.current.addFilter("status", ["Blocked"]);
      });

      act(() => {
        result.current.updateFilterValues(id, ["Blocked", "Monitored"]);
      });

      const child = result.current.filterState.expression.children[0];
      if (isFilterCondition(child)) {
        expect(child.values).toEqual(["Blocked", "Monitored"]);
      }
    });

    it("removes filter if values are empty", () => {
      const { result } = renderHook(() => useFilterState());

      let id: string;
      act(() => {
        id = result.current.addFilter("status", ["Blocked"]);
      });

      act(() => {
        result.current.updateFilterValues(id, []);
      });

      expect(result.current.filterState.expression.children).toHaveLength(0);
    });
  });

  describe("updateOperator", () => {
    it("updates operator for an existing filter", () => {
      const { result } = renderHook(() => useFilterState());

      let id: string;
      act(() => {
        id = result.current.addFilter("status", ["Blocked"]);
      });

      act(() => {
        result.current.updateOperator(id, "is_not");
      });

      const child = result.current.filterState.expression.children[0];
      if (isFilterCondition(child)) {
        expect(child.operator).toBe("is_not");
        expect(child.values).toEqual(["Blocked"]);
      }
    });

    it("preserves other filters when updating operator", () => {
      const { result } = renderHook(() => useFilterState());

      let id1: string;
      act(() => {
        id1 = result.current.addFilter("status", ["Blocked"]);
        result.current.addFilter("type", ["XSS"]);
      });

      act(() => {
        result.current.updateOperator(id1, "contains");
      });

      expect(result.current.activeFilterCount).toBe(2);
      const child0 = result.current.filterState.expression.children[0];
      const child1 = result.current.filterState.expression.children[1];
      if (isFilterCondition(child0)) {
        expect(child0.operator).toBe("contains");
      }
      if (isFilterCondition(child1)) {
        expect(child1.operator).toBe("is");
      }
    });
  });

  describe("clearAll", () => {
    it("removes all filters", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFilter("status", ["Blocked"]);
        result.current.addFilter("type", ["XSS"]);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.filterState.expression.children).toHaveLength(0);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe("toggleConnector", () => {
    it("groups two conditions into an OR group", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFilter("status", ["Blocked"]);
        result.current.addFilter("type", ["XSS"]);
      });

      act(() => {
        result.current.toggleConnector(0);
      });

      expect(result.current.filterState.expression.children).toHaveLength(1);
      const group = result.current.filterState.expression.children[0];
      expect("connector" in group && group.connector).toBe("OR");
    });

    it("ungroups an OR group back to conditions", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFilter("status", ["Blocked"]);
        result.current.addFilter("type", ["XSS"]);
      });

      // Group them
      act(() => {
        result.current.toggleConnector(0);
      });

      // Ungroup them
      act(() => {
        result.current.toggleConnector(0);
      });

      expect(result.current.filterState.expression.children).toHaveLength(2);
      expect(
        result.current.filterState.expression.children.every(
          (c) => "field" in c,
        ),
      ).toBe(true);
    });
  });

  describe("validationErrors", () => {
    it("returns no errors for valid state", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFilter("status", ["Blocked"]);
      });

      expect(result.current.validationErrors).toEqual([]);
    });

    it("returns errors for invalid state", () => {
      const initial = {
        expression: {
          id: "root",
          connector: "OR" as const,
          children: [
            {
              id: "c1",
              field: "status",
              fieldLabel: "Status",
              operator: "is" as const,
              values: ["Blocked"],
            },
            {
              id: "c2",
              field: "type",
              fieldLabel: "Attack type",
              operator: "is" as const,
              values: ["XSS"],
            },
          ],
        },
      };

      const { result } = renderHook(() => useFilterState(initial));
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
      expect(result.current.validationErrors[0].type).toBe("TOP_LEVEL_OR");
    });
  });
});
