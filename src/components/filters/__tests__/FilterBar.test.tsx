import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import type { FilterState } from "@/types/filters";
import { createEmptyState, createCondition, addCondition } from "@/lib/filter-utils";

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
        onClearAll={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Add filter"));

    // Palette should show field options
    expect(screen.getByText("Attack type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });
});
