import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import type {
  FilterState,
  FilterGroup,
  FilterCondition,
  FilterOperator,
} from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";
import {
  createEmptyState,
  createCondition,
  addCondition,
  removeCondition,
  updateConditionValues,
  toggleConnector,
} from "@/lib/filter-utils";
import { evaluateExpression } from "@/lib/filter-engine";
import { validateExpression } from "@/lib/filter-validation";
import { serializeFilterState, deserializeFilterState } from "@/lib/filter-url";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderWithProviders(
  state: FilterState,
  overrides: {
    onToggleConnector?: (idx: number) => void;
    onRemoveFilter?: (id: string) => void;
    onUpdateFilterValues?: (id: string, values: string[]) => void;
  } = {},
) {
  return render(
    <TooltipProvider>
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={overrides.onRemoveFilter ?? vi.fn()}
        onUpdateFilterValues={overrides.onUpdateFilterValues ?? vi.fn()}
        onUpdateOperator={vi.fn()}
        onToggleConnector={overrides.onToggleConnector ?? vi.fn()}
        onClearAll={vi.fn()}
        validationErrors={validateExpression(state)}
      />
    </TooltipProvider>,
  );
}

const MOCK_DATA = [
  { status: "Blocked", type: "XSS", impact: "High" },
  { status: "Monitored", type: "SQL Injection", impact: "High" },
  { status: "Blocked", type: "BOLA Attack", impact: "Medium" },
  { status: "Started", type: "XSS", impact: "Low" },
];

describe("FilterGroupFlow (integration)", () => {
  it("full flow: add 2 chips → toggle AND→OR → group appears with parentheses", () => {
    // Start with 2 conditions
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));
    state = addCondition(state, createCondition("type", ["XSS"]));

    // Toggle to create OR group
    state = toggleConnector(state, 0);

    renderWithProviders(state);

    // Should render group with parentheses
    expect(screen.getByText("(")).toBeInTheDocument();
    expect(screen.getByText(")")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();

    // Engine: OR means union of Blocked OR XSS
    const results = evaluateExpression(
      MOCK_DATA as unknown as Record<string, unknown>[],
      state,
    );
    // Blocked: items 0, 2; XSS: items 0, 3; Union: 0, 2, 3
    expect(results).toHaveLength(3);
  });

  it("click OR inside group → ungroups → AND between chips → data shows intersection", () => {
    // Start with OR group
    let state = createEmptyState();
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    state = addCondition(state, c1);
    state = addCondition(state, c2);
    state = toggleConnector(state, 0);

    // Verify it's a group
    expect(state.expression.children).toHaveLength(1);
    expect(isFilterGroup(state.expression.children[0])).toBe(true);

    // Ungroup (toggle OR→AND)
    state = toggleConnector(state, 0);

    // Should be flat conditions again
    expect(state.expression.children).toHaveLength(2);
    expect(state.expression.children.every(isFilterCondition)).toBe(true);

    // Engine: AND means intersection of Blocked AND XSS
    const results = evaluateExpression(
      MOCK_DATA as unknown as Record<string, unknown>[],
      state,
    );
    // Only item 0 is both Blocked and XSS
    expect(results).toHaveLength(1);
    expect((results[0] as { status: string }).status).toBe("Blocked");
    expect((results[0] as { type: string }).type).toBe("XSS");
  });

  it("remove chip from 2-chip group → auto-ungroup", () => {
    let state = createEmptyState();
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    state = addCondition(state, c1);
    state = addCondition(state, c2);
    state = toggleConnector(state, 0);

    // Remove one condition from the group
    state = removeCondition(state, c1.id);

    // Should auto-ungroup: single condition promoted to root
    expect(state.expression.children).toHaveLength(1);
    expect(isFilterCondition(state.expression.children[0])).toBe(true);
    expect((state.expression.children[0] as FilterCondition).id).toBe(c2.id);
  });

  it("edit value inside group → works", () => {
    let state = createEmptyState();
    const c1 = createCondition("status", ["Blocked"]);
    const c2 = createCondition("type", ["XSS"]);
    state = addCondition(state, c1);
    state = addCondition(state, c2);
    state = toggleConnector(state, 0);

    // Update value inside group
    state = updateConditionValues(state, c1.id, ["Blocked", "Monitored"]);

    // Group still exists with updated values
    const group = state.expression.children[0] as FilterGroup;
    const updated = group.children[0] as FilterCondition;
    expect(updated.values).toEqual(["Blocked", "Monitored"]);
  });

  it("clear all → clears groups too", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));
    state = addCondition(state, createCondition("type", ["XSS"]));
    state = toggleConnector(state, 0);

    // Clear
    state = createEmptyState();

    expect(state.expression.children).toHaveLength(0);
  });

  it("URL round-trip preserves OR groups", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));
    state = addCondition(state, createCondition("type", ["XSS"]));
    state = toggleConnector(state, 0);

    const params = serializeFilterState(state);
    const restored = deserializeFilterState(params);

    expect(restored.expression.children).toHaveLength(1);
    const group = restored.expression.children[0];
    expect(isFilterGroup(group)).toBe(true);
    if (isFilterGroup(group)) {
      expect(group.connector).toBe("OR");
      expect(group.children).toHaveLength(2);
    }
  });

  it("mixed group + condition renders correctly with data filtering", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));
    state = addCondition(state, createCondition("type", ["XSS"]));
    state = addCondition(state, createCondition("impact", ["High"]));

    // Group first two into OR, keep impact as AND
    state = toggleConnector(state, 0);

    // State: (status=Blocked OR type=XSS) AND impact=High
    renderWithProviders(state);

    expect(screen.getByText("(")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();

    // Engine: (Blocked OR XSS) AND High
    // Blocked+High: item 0; XSS+High: item 0; SQL Injection+High: not in OR
    // Items matching: 0 (Blocked+XSS+High)
    const results = evaluateExpression(
      MOCK_DATA as unknown as Record<string, unknown>[],
      state,
    );
    // Item 0: Blocked+XSS+High ✓, Item 1: Monitored+SQL+High (not in OR), Item 3: Started+XSS+Low (not High)
    expect(results).toHaveLength(1);
  });

  it("validation: clean state has no errors", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));
    state = addCondition(state, createCondition("type", ["XSS"]));
    state = toggleConnector(state, 0);

    const errors = validateExpression(state);
    expect(errors).toEqual([]);
  });
});
