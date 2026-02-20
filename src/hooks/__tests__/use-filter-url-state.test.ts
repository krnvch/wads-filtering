import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilterUrlState } from "../use-filter-url-state";
import { isFilterCondition, isFilterGroup } from "@/types/filters";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

describe("useFilterUrlState", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
  });

  it("returns empty state for empty URL", () => {
    const { result } = renderHook(() => useFilterUrlState());

    expect(result.current.filterState.expression.children).toHaveLength(0);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("derives state from URL params", () => {
    mockSearchParams = new URLSearchParams("status=Blocked,Monitored");

    const { result } = renderHook(() => useFilterUrlState());

    expect(result.current.filterState.expression.children).toHaveLength(1);
    expect(result.current.hasActiveFilters).toBe(true);

    const child = result.current.filterState.expression.children[0];
    if (isFilterCondition(child)) {
      expect(child.field).toBe("status");
      expect(child.values).toEqual(["Blocked", "Monitored"]);
      expect(child.operator).toBe("is");
    }
  });

  it("derives state with operator override from URL", () => {
    mockSearchParams = new URLSearchParams(
      "status=Blocked&status__op=is_not",
    );

    const { result } = renderHook(() => useFilterUrlState());

    const child = result.current.filterState.expression.children[0];
    if (isFilterCondition(child)) {
      expect(child.operator).toBe("is_not");
    }
  });

  it("addFilter pushes correct URL", () => {
    const { result } = renderHook(() => useFilterUrlState());

    act(() => {
      result.current.addFilter("status", ["Blocked"]);
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("status=Blocked"),
    );
  });

  it("addFilter with non-default operator includes __op param", () => {
    const { result } = renderHook(() => useFilterUrlState());

    act(() => {
      result.current.addFilter("status", ["Blocked"], "is_not");
    });

    const pushedUrl = mockPush.mock.calls[0][0];
    expect(pushedUrl).toContain("status=Blocked");
    expect(pushedUrl).toContain("status__op=is_not");
  });

  it("clearAll pushes clean URL", () => {
    mockSearchParams = new URLSearchParams("status=Blocked");

    const { result } = renderHook(() => useFilterUrlState());

    act(() => {
      result.current.clearAll();
    });

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("removeFilter pushes URL without removed filter", () => {
    mockSearchParams = new URLSearchParams("status=Blocked&type=XSS");

    const { result } = renderHook(() => useFilterUrlState());

    // Find the status condition's ID
    const statusCondition = result.current.filterState.expression.children.find(
      (c) => isFilterCondition(c) && c.field === "status",
    );
    expect(statusCondition).toBeDefined();

    act(() => {
      if (statusCondition && "id" in statusCondition) {
        result.current.removeFilter(statusCondition.id);
      }
    });

    const pushedUrl = mockPush.mock.calls[0][0];
    expect(pushedUrl).toContain("type=XSS");
    expect(pushedUrl).not.toContain("status=");
  });

  it("updateOperator pushes URL with operator override", () => {
    mockSearchParams = new URLSearchParams("status=Blocked");

    const { result } = renderHook(() => useFilterUrlState());

    const child = result.current.filterState.expression.children[0];

    act(() => {
      if (isFilterCondition(child)) {
        result.current.updateOperator(child.id, "is_not");
      }
    });

    const pushedUrl = mockPush.mock.calls[0][0];
    expect(pushedUrl).toContain("status=Blocked");
    expect(pushedUrl).toContain("status__op=is_not");
  });

  it("toggleConnector pushes URL with group params", () => {
    mockSearchParams = new URLSearchParams("status=Blocked&type=XSS");

    const { result } = renderHook(() => useFilterUrlState());

    act(() => {
      result.current.toggleConnector(0);
    });

    const pushedUrl = mockPush.mock.calls[0][0];
    expect(pushedUrl).toContain("g1.");
    expect(pushedUrl).toContain("g1__op=OR");
  });

  it("derives group state from URL with group params", () => {
    mockSearchParams = new URLSearchParams(
      "g1.status=Blocked&g1.type=XSS&g1__op=OR",
    );

    const { result } = renderHook(() => useFilterUrlState());

    expect(result.current.filterState.expression.children).toHaveLength(1);
    const group = result.current.filterState.expression.children[0];
    expect(isFilterGroup(group)).toBe(true);
    if (isFilterGroup(group)) {
      expect(group.connector).toBe("OR");
      expect(group.children).toHaveLength(2);
    }
  });

  it("validationErrors returns empty for valid URL state", () => {
    mockSearchParams = new URLSearchParams("status=Blocked");

    const { result } = renderHook(() => useFilterUrlState());
    expect(result.current.validationErrors).toEqual([]);
  });

  it("validationErrors detects issues after sanitization", () => {
    // After sanitization, the result should be valid
    // (sanitizeExpression is called during deserialization)
    mockSearchParams = new URLSearchParams(
      "g1.status=Blocked&g1.type=XSS&g1__op=OR",
    );

    const { result } = renderHook(() => useFilterUrlState());
    expect(result.current.validationErrors).toEqual([]);
  });

  it("removeFilter works for conditions inside groups via URL state", () => {
    mockSearchParams = new URLSearchParams(
      "g1.status=Blocked&g1.type=XSS&g1__op=OR&impact=High",
    );

    const { result } = renderHook(() => useFilterUrlState());

    // Find the status condition inside the group
    const group = result.current.filterState.expression.children.find(isFilterGroup);
    expect(group).toBeDefined();

    if (group && isFilterGroup(group)) {
      const statusCondition = group.children.find(
        (c) => isFilterCondition(c) && c.field === "status",
      );
      expect(statusCondition).toBeDefined();

      act(() => {
        if (statusCondition && "id" in statusCondition) {
          result.current.removeFilter(statusCondition.id);
        }
      });

      expect(mockPush).toHaveBeenCalled();
    }
  });
});
