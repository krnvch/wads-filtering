import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTokenFilterState } from "../use-token-filter-state";
import { isChipToken, isAndToken, isOrToken, isOpenParen, isCloseParen } from "@/types/tokens";
import type { FilterChipToken } from "@/types/tokens";

describe("useTokenFilterState", () => {
  it("starts with empty state", () => {
    const { result } = renderHook(() => useTokenFilterState());
    expect(result.current.tokens).toHaveLength(0);
    expect(result.current.chipCount).toBe(0);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("adds first chip", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));

    expect(result.current.tokens).toHaveLength(1);
    expect(result.current.chipCount).toBe(1);
    expect(result.current.hasActiveFilters).toBe(true);

    const chip = result.current.tokens[0] as FilterChipToken;
    expect(chip.field).toBe("status");
    expect(chip.values).toEqual(["Blocked"]);
  });

  it("adds second chip with AND connector", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));
    act(() => result.current.addFilter("type", ["XSS"]));

    expect(result.current.tokens).toHaveLength(3);
    expect(isChipToken(result.current.tokens[0])).toBe(true);
    expect(isAndToken(result.current.tokens[1])).toBe(true);
    expect(isChipToken(result.current.tokens[2])).toBe(true);
    expect(result.current.chipCount).toBe(2);
  });

  it("removes filter with cascade", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));
    act(() => result.current.addFilter("type", ["XSS"]));

    const chipId = result.current.tokens[2].id; // second chip
    act(() => result.current.removeFilter(chipId));

    expect(result.current.tokens).toHaveLength(1);
    expect(result.current.chipCount).toBe(1);
  });

  it("updates filter values", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));

    const chipId = result.current.tokens[0].id;
    act(() => result.current.updateFilterValues(chipId, ["Blocked", "Monitored"]));

    const chip = result.current.tokens[0] as FilterChipToken;
    expect(chip.values).toEqual(["Blocked", "Monitored"]);
    expect(chip.operator).toBe("is_any_of"); // auto-upgraded
  });

  it("updates operator", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));

    const chipId = result.current.tokens[0].id;
    act(() => result.current.updateOperator(chipId, "is_not"));

    expect((result.current.tokens[0] as FilterChipToken).operator).toBe("is_not");
  });

  it("toggles connector", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));
    act(() => result.current.addFilter("type", ["XSS"]));

    const connectorId = result.current.tokens[1].id;
    act(() => result.current.toggleConnector(connectorId));

    // AND → OR wraps in parens
    expect(result.current.tokens.some(isOrToken)).toBe(true);
    expect(result.current.tokens.some(isOpenParen)).toBe(true);
  });

  it("inserts parens", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.insertParen("open_paren"));

    expect(result.current.tokens).toHaveLength(1);
    expect(isOpenParen(result.current.tokens[0])).toBe(true);

    act(() => result.current.insertParen("close_paren"));
    expect(result.current.tokens).toHaveLength(2);
    expect(isCloseParen(result.current.tokens[1])).toBe(true);
  });

  it("clears all", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));
    act(() => result.current.addFilter("type", ["XSS"]));
    act(() => result.current.clearAll());

    expect(result.current.tokens).toHaveLength(0);
    expect(result.current.chipCount).toBe(0);
  });

  it("derives expression tree", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));
    act(() => result.current.addFilter("type", ["XSS"]));

    const tree = result.current.expressionTree;
    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(2);
  });

  it("validates tokens", () => {
    const { result } = renderHook(() => useTokenFilterState());
    act(() => result.current.addFilter("status", ["Blocked"]));

    expect(result.current.hasErrors).toBe(false);
    expect(result.current.validatedTokens).toHaveLength(1);
  });

  it("accepts initial state", () => {
    const initial = {
      tokens: [
        {
          type: "filter_chip" as const,
          id: "init-1",
          field: "status",
          fieldLabel: "Status",
          operator: "is" as const,
          values: ["Blocked"],
        },
      ],
    };
    const { result } = renderHook(() => useTokenFilterState(initial));
    expect(result.current.tokens).toHaveLength(1);
    expect(result.current.chipCount).toBe(1);
  });
});
