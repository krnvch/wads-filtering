import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterAnnouncer } from "../FilterAnnouncer";
import type { FilterState } from "@/types/filters";
import {
  createEmptyState,
  createCondition,
  addCondition,
} from "@/lib/filter-utils";

function makeStateWith(
  ...filters: Array<{ field: string; values: string[] }>
): FilterState {
  let state = createEmptyState();
  for (const f of filters) {
    state = addCondition(state, createCondition(f.field, f.values));
  }
  return state;
}

describe("FilterAnnouncer", () => {
  it("renders polite live region", () => {
    render(
      <FilterAnnouncer filterState={createEmptyState()} />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders assertive live region", () => {
    render(
      <FilterAnnouncer filterState={createEmptyState()} />,
    );

    // role="alert" is implicitly assertive
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("announces filter added on state change", () => {
    const emptyState = createEmptyState();
    const stateWith = makeStateWith({ field: "status", values: ["Blocked"] });

    const { rerender } = render(
      <FilterAnnouncer filterState={emptyState} />,
    );

    rerender(<FilterAnnouncer filterState={stateWith} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter added");
    expect(status.textContent).toContain("Status");
    expect(status.textContent).toContain("Blocked");
    expect(status.textContent).toContain("1 filter active");
  });

  it("announces filter removed on state change", () => {
    const stateWith = makeStateWith(
      { field: "status", values: ["Blocked"] },
      { field: "type", values: ["XSS"] },
    );
    const stateWithout = makeStateWith({ field: "status", values: ["Blocked"] });

    const { rerender } = render(
      <FilterAnnouncer filterState={stateWith} />,
    );

    rerender(<FilterAnnouncer filterState={stateWithout} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter removed");
    expect(status.textContent).toContain("1 filter active");
  });

  it("announces all filters cleared", () => {
    const stateWith = makeStateWith({ field: "status", values: ["Blocked"] });
    const emptyState = createEmptyState();

    const { rerender } = render(
      <FilterAnnouncer filterState={stateWith} />,
    );

    rerender(<FilterAnnouncer filterState={emptyState} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("All filters cleared");
  });

  it("does not announce on initial render", () => {
    render(
      <FilterAnnouncer filterState={createEmptyState()} />,
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
  });

  it("announces zero results assertively when filters active", () => {
    const stateWith = makeStateWith({ field: "status", values: ["Blocked"] });

    render(
      <FilterAnnouncer filterState={stateWith} resultCount={0} />,
    );

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toContain(
      "No results match your current filters",
    );
  });

  it("does not announce zero results when no filters active", () => {
    render(
      <FilterAnnouncer filterState={createEmptyState()} resultCount={0} />,
    );

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toBe("");
  });

  it("clears assertive message when results become available", () => {
    const stateWith = makeStateWith({ field: "status", values: ["Blocked"] });

    const { rerender } = render(
      <FilterAnnouncer filterState={stateWith} resultCount={0} />,
    );

    rerender(<FilterAnnouncer filterState={stateWith} resultCount={5} />);

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toBe("");
  });

  it("announces plural 'filters' for multiple filters", () => {
    const emptyState = createEmptyState();
    const stateWith = makeStateWith(
      { field: "status", values: ["Blocked"] },
      { field: "type", values: ["XSS"] },
    );

    const { rerender } = render(
      <FilterAnnouncer filterState={emptyState} />,
    );

    // Simulate adding both at once (first render had 0, rerender has 2)
    // The announcer sees nextCount > prevCount, finds one new condition
    // but count is 2
    rerender(<FilterAnnouncer filterState={stateWith} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("2 filters active");
  });
});
