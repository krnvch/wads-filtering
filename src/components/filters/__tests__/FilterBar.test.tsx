import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import type { FilterState, FilterGroup, FilterCondition } from "@/types/filters";
import type { ValidationError } from "@/lib/filter-validation";
import { createEmptyState, createCondition, addCondition } from "@/lib/filter-utils";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeStateWithFilters(...filters: Array<{ field: string; values: string[] }>): FilterState {
  let state = createEmptyState();
  for (const f of filters) {
    state = addCondition(state, createCondition(f.field, f.values));
  }
  return state;
}

describe("FilterBar", () => {
  it("renders placeholder when no filters", () => {
    render(
      <FilterBar
        filterState={createEmptyState()}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByText("Filter...")).toBeInTheDocument();
  });

  it("renders custom placeholder", () => {
    render(
      <FilterBar
        filterState={createEmptyState()}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
        placeholder="Search attacks..."
      />,
    );

    expect(screen.getByText("Search attacks...")).toBeInTheDocument();
  });

  it("renders chips for active filters", () => {
    const state = makeStateWithFilters({ field: "status", values: ["Blocked"] });

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("renders AND connector between multiple chips", () => {
    const state = makeStateWithFilters(
      { field: "status", values: ["Blocked"] },
      { field: "type", values: ["XSS"] },
    );

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByText("AND")).toBeInTheDocument();
  });

  it("shows clear-all button when filters exist", () => {
    const state = makeStateWithFilters({ field: "status", values: ["Blocked"] });

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
  });

  it("does not show clear-all button when empty", () => {
    render(
      <FilterBar
        filterState={createEmptyState()}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Clear all filters")).not.toBeInTheDocument();
  });

  it("calls onClearAll when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const state = makeStateWithFilters({ field: "status", values: ["Blocked"] });

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={onClearAll}
      />,
    );

    await user.click(screen.getByLabelText("Clear all filters"));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("opens palette when clicking the placeholder area", async () => {
    const user = userEvent.setup();

    render(
      <FilterBar
        filterState={createEmptyState()}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Add filter"));

    // Palette should show field options
    expect(screen.getByText("Attack type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("shows text input when a text field is selected from palette", async () => {
    const user = userEvent.setup();

    render(
      <FilterBar
        filterState={createEmptyState()}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    // Open palette and select a text field
    await user.click(screen.getByLabelText("Add filter"));
    await user.click(screen.getByText("Endpoint"));

    // Should show text input popover
    expect(screen.getByLabelText("Enter Endpoint value")).toBeInTheDocument();
  });

  it("passes onUpdateOperator to chips", async () => {
    const user = userEvent.setup();
    const onUpdateOperator = vi.fn();
    const state = makeStateWithFilters({ field: "status", values: ["Blocked"] });

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={onUpdateOperator}
        onClearAll={vi.fn()}
      />,
    );

    // Click the operator on the chip
    await user.click(screen.getByLabelText("Change Status operator"));
    await user.click(screen.getByText("is not"));

    expect(onUpdateOperator).toHaveBeenCalled();
  });
});

// --- Group rendering tests ---

function makeConditionObj(
  id: string,
  field: string,
  fieldLabel: string,
  values: string[],
): FilterCondition {
  return { id, field, fieldLabel, operator: "is", values };
}

function makeGroupObj(
  id: string,
  connector: "AND" | "OR",
  children: FilterGroup["children"],
): FilterGroup {
  return { id, connector, children };
}

describe("FilterBar (group rendering)", () => {
  it("renders FilterGroupComponent for group children", () => {
    const state: FilterState = {
      expression: makeGroupObj("root", "AND", [
        makeGroupObj("g1", "OR", [
          makeConditionObj("c1", "status", "Status", ["Blocked"]),
          makeConditionObj("c2", "type", "Attack type", ["XSS"]),
        ]),
      ]),
    };

    render(
      <TooltipProvider>
        <FilterBar
          filterState={state}
          onAddFilter={vi.fn()}
          onRemoveFilter={vi.fn()}
          onUpdateFilterValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onClearAll={vi.fn()}
        />
      </TooltipProvider>,
    );

    // Group renders parentheses
    expect(screen.getByText("(")).toBeInTheDocument();
    expect(screen.getByText(")")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Attack type")).toBeInTheDocument();
  });

  it("renders clickable AND connectors between conditions when onToggleConnector provided", () => {
    const state = makeStateWithFilters(
      { field: "status", values: ["Blocked"] },
      { field: "type", values: ["XSS"] },
    );

    render(
      <TooltipProvider>
        <FilterBar
          filterState={state}
          onAddFilter={vi.fn()}
          onRemoveFilter={vi.fn()}
          onUpdateFilterValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onClearAll={vi.fn()}
          onToggleConnector={vi.fn()}
        />
      </TooltipProvider>,
    );

    // AND should be a button with tooltip
    expect(screen.getByLabelText("Click to change to OR")).toBeInTheDocument();
  });

  it("calls onToggleConnector when AND connector is clicked", async () => {
    const user = userEvent.setup();
    const onToggleConnector = vi.fn();
    const state = makeStateWithFilters(
      { field: "status", values: ["Blocked"] },
      { field: "type", values: ["XSS"] },
    );

    render(
      <TooltipProvider>
        <FilterBar
          filterState={state}
          onAddFilter={vi.fn()}
          onRemoveFilter={vi.fn()}
          onUpdateFilterValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onClearAll={vi.fn()}
          onToggleConnector={onToggleConnector}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByLabelText("Click to change to OR"));
    expect(onToggleConnector).toHaveBeenCalledWith(0);
  });

  it("does not make AND connector clickable between condition and group", () => {
    const state: FilterState = {
      expression: makeGroupObj("root", "AND", [
        makeConditionObj("c1", "status", "Status", ["Blocked"]),
        makeGroupObj("g1", "OR", [
          makeConditionObj("c2", "type", "Attack type", ["XSS"]),
          makeConditionObj("c3", "impact", "Impact", ["High"]),
        ]),
      ]),
    };

    render(
      <TooltipProvider>
        <FilterBar
          filterState={state}
          onAddFilter={vi.fn()}
          onRemoveFilter={vi.fn()}
          onUpdateFilterValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onClearAll={vi.fn()}
          onToggleConnector={vi.fn()}
        />
      </TooltipProvider>,
    );

    // The AND between condition and group should NOT be clickable
    const andElements = screen.getAllByText("AND");
    // At least one AND should be a span (not a button)
    const spans = andElements.filter((el) => el.tagName === "SPAN");
    expect(spans.length).toBeGreaterThan(0);
  });

  it("renders validation error alert when errors are provided", () => {
    const state = makeStateWithFilters({ field: "status", values: ["Blocked"] });
    const errors: ValidationError[] = [
      {
        type: "TOP_LEVEL_OR",
        message: "Top-level OR is not allowed.",
        nodeId: "root",
      },
    ];

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
        validationErrors={errors}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Top-level OR is not allowed.")).toBeInTheDocument();
  });

  it("applies destructive border when validation errors exist", () => {
    const state = makeStateWithFilters({ field: "status", values: ["Blocked"] });
    const errors: ValidationError[] = [
      {
        type: "TOP_LEVEL_OR",
        message: "Error",
        nodeId: "root",
      },
    ];

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
        validationErrors={errors}
      />,
    );

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.className).toContain("border-destructive");
  });

  it("does not render alert when no validation errors", () => {
    const state = makeStateWithFilters({ field: "status", values: ["Blocked"] });

    render(
      <FilterBar
        filterState={state}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
        validationErrors={[]}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders group + root condition mix with AND connector", () => {
    const state: FilterState = {
      expression: makeGroupObj("root", "AND", [
        makeGroupObj("g1", "OR", [
          makeConditionObj("c1", "status", "Status", ["Blocked"]),
          makeConditionObj("c2", "type", "Attack type", ["XSS"]),
        ]),
        makeConditionObj("c3", "impact", "Impact", ["High"]),
      ]),
    };

    render(
      <TooltipProvider>
        <FilterBar
          filterState={state}
          onAddFilter={vi.fn()}
          onRemoveFilter={vi.fn()}
          onUpdateFilterValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onClearAll={vi.fn()}
        />
      </TooltipProvider>,
    );

    // Should render group content + root condition
    expect(screen.getByText("(")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
