import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import type { FilterState, FilterCondition, FilterGroup } from "@/types/filters";
import { createEmptyState, createCondition, addCondition } from "@/lib/filter-utils";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeStateWith(
  ...filters: Array<{ field: string; values: string[]; id?: string }>
): FilterState {
  let state = createEmptyState();
  for (const f of filters) {
    const c = createCondition(f.field, f.values);
    if (f.id) {
      (c as FilterCondition).id = f.id;
    }
    state = addCondition(state, c);
  }
  return state;
}

function renderFilterBar(props: {
  filterState?: FilterState;
  onAddFilter?: ReturnType<typeof vi.fn>;
  onRemoveFilter?: ReturnType<typeof vi.fn>;
  onClearAll?: ReturnType<typeof vi.fn>;
  resultCount?: number;
}) {
  return render(
    <FilterBar
      filterState={props.filterState ?? createEmptyState()}
      onAddFilter={props.onAddFilter ?? vi.fn()}
      onRemoveFilter={props.onRemoveFilter ?? vi.fn()}
      onUpdateFilterValues={vi.fn()}
      onUpdateOperator={vi.fn()}
      onClearAll={props.onClearAll ?? vi.fn()}
      resultCount={props.resultCount}
    />,
  );
}

// --- Global shortcuts ---

describe("FilterAccessibility: Global shortcuts", () => {
  it("press F on body opens palette", async () => {
    const user = userEvent.setup();

    renderFilterBar({});

    document.body.focus();
    await user.keyboard("f");

    // Palette should show field options
    expect(screen.getByText("Attack type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("press F inside input does NOT open palette", async () => {
    const user = userEvent.setup();

    renderFilterBar({});

    // Create an input and focus it
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    await user.keyboard("f");

    // Palette should NOT show
    expect(screen.queryByText("Attack type")).not.toBeInTheDocument();

    document.body.removeChild(input);
  });

  it("press Shift+F with filters clears all", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const state = makeStateWith({ field: "status", values: ["Blocked"] });

    renderFilterBar({ filterState: state, onClearAll });

    document.body.focus();
    await user.keyboard("{Shift>}f{/Shift}");

    expect(onClearAll).toHaveBeenCalled();
  });

  it("press Escape while palette open closes it", async () => {
    const user = userEvent.setup();

    renderFilterBar({});

    // Open palette
    await user.click(screen.getByLabelText("Add filter"));
    expect(screen.getByText("Attack type")).toBeInTheDocument();

    // Press Escape
    await user.keyboard("{Escape}");

    // Palette should be closed (no field options visible)
    expect(screen.queryByText("Attack type")).not.toBeInTheDocument();
  });
});

// --- Chip keyboard deletion ---

describe("FilterAccessibility: Chip keyboard deletion", () => {
  it("tab to chip gives it focus", async () => {
    const user = userEvent.setup();
    const state = makeStateWith({ field: "status", values: ["Blocked"] });

    renderFilterBar({ filterState: state });

    // Tab into the filter bar area
    const chip = screen.getByRole("listitem");
    chip.focus();

    expect(document.activeElement).toBe(chip);
  });

  it("Backspace on focused chip calls onRemoveFilter", async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();
    const state = makeStateWith({ field: "status", values: ["Blocked"] });

    renderFilterBar({ filterState: state, onRemoveFilter });

    const chip = screen.getByRole("listitem");
    chip.focus();
    await user.keyboard("{Backspace}");

    expect(onRemoveFilter).toHaveBeenCalled();
  });

  it("Delete on focused chip calls onRemoveFilter", async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();
    const state = makeStateWith({ field: "status", values: ["Blocked"] });

    renderFilterBar({ filterState: state, onRemoveFilter });

    const chip = screen.getByRole("listitem");
    chip.focus();
    await user.keyboard("{Delete}");

    expect(onRemoveFilter).toHaveBeenCalled();
  });
});

// --- ARIA structure ---

describe("FilterAccessibility: ARIA structure", () => {
  it("outer wrapper has role='search'", () => {
    renderFilterBar({});

    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("inner bar has role='toolbar'", () => {
    renderFilterBar({});

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("chips have role='listitem'", () => {
    const state = makeStateWith({ field: "status", values: ["Blocked"] });
    renderFilterBar({ filterState: state });

    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("chips have descriptive aria-label", () => {
    const state = makeStateWith({ field: "status", values: ["Blocked"] });
    renderFilterBar({ filterState: state });

    const chip = screen.getByRole("listitem");
    expect(chip.getAttribute("aria-label")).toContain("Status");
    expect(chip.getAttribute("aria-label")).toContain("is");
    expect(chip.getAttribute("aria-label")).toContain("Blocked");
  });

  it("polite aria-live region exists", () => {
    renderFilterBar({});

    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveAttribute("aria-live", "polite");
  });

  it("assertive aria-live region exists", () => {
    renderFilterBar({});

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive).toBeDefined();
  });

  it("announcer updates on filter add", () => {
    const emptyState = createEmptyState();
    const stateWith = makeStateWith({ field: "status", values: ["Blocked"] });

    const { rerender } = render(
      <FilterBar
        filterState={emptyState}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    rerender(
      <FilterBar
        filterState={stateWith}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter added");
  });

  it("announcer updates on filter remove", () => {
    const stateWith2 = makeStateWith(
      { field: "status", values: ["Blocked"] },
      { field: "type", values: ["XSS"] },
    );
    const stateWith1 = makeStateWith({ field: "status", values: ["Blocked"] });

    const { rerender } = render(
      <FilterBar
        filterState={stateWith2}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    rerender(
      <FilterBar
        filterState={stateWith1}
        onAddFilter={vi.fn()}
        onRemoveFilter={vi.fn()}
        onUpdateFilterValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter removed");
  });

  it("announcer shows zero results assertively", () => {
    const stateWith = makeStateWith({ field: "status", values: ["Blocked"] });

    renderFilterBar({ filterState: stateWith, resultCount: 0 });

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toContain("No results");
  });

  it("announcer does not show zero results without filters", () => {
    renderFilterBar({ resultCount: 0 });

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toBe("");
  });
});
