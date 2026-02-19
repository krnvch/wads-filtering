import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import { useFilterState } from "@/hooks/use-filter-state";
import { evaluateExpression } from "@/lib/filter-engine";
import { createEmptyState, createCondition, addCondition } from "@/lib/filter-utils";

const mockData = [
  { id: "1", type: "XSS", status: "Blocked", impact: "High", response_code: 200, host: "api.example.com" },
  { id: "2", type: "SQL Injection", status: "Monitored", impact: "Medium", response_code: 401, host: "orders.example.com" },
  { id: "3", type: "XSS", status: "Started", impact: "Low", response_code: 500, host: "api.example.com" },
  { id: "4", type: "BOLA Attack", status: "Blocked", impact: "High", response_code: 403, host: "admin.example.com" },
  { id: "5", type: "Brute Force", status: "Monitored", impact: "Medium", response_code: 404, host: "login.example.com" },
];

function TestHarness() {
  const {
    filterState,
    addFilter,
    removeFilter,
    updateFilterValues,
    clearAll,
  } = useFilterState();

  const filtered = evaluateExpression(mockData, filterState);

  return (
    <div>
      <FilterBar
        filterState={filterState}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onUpdateFilterValues={updateFilterValues}
        onClearAll={clearAll}
      />
      <div data-testid="result-count">{filtered.length} results</div>
      <ul data-testid="results">
        {(filtered as typeof mockData).map((d) => (
          <li key={d.id}>{d.id}</li>
        ))}
      </ul>
    </div>
  );
}

describe("Filter Flow Integration", () => {
  it("full add filter flow: click bar → palette → field → values → chip appears", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    // Initially shows all results
    expect(screen.getByTestId("result-count")).toHaveTextContent("5 results");

    // Click the placeholder to open palette
    await user.click(screen.getByLabelText("Add filter"));

    // Select Status from palette
    await user.click(screen.getByText("Status"));

    // Value selector should open — check Blocked
    await user.click(screen.getByLabelText("Blocked"));

    // Confirm with Cmd+Enter
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    // Chip should appear with the field and value
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();

    // Data should be filtered
    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");
  });

  it("multi-filter AND: add 2 chips → both render with AND between", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    // Add first filter: Status is Blocked
    await user.click(screen.getByLabelText("Add filter"));
    await user.click(screen.getByText("Status"));
    await user.click(screen.getByLabelText("Blocked"));
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    // Add second filter: Impact is High
    await user.click(screen.getByLabelText("Add filter"));
    await user.click(screen.getByText("Impact"));
    await user.click(screen.getByLabelText("High"));
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    // Both chips should be visible with AND connector
    expect(screen.getByText("AND")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();

    // Both Blocked + High = records 1 and 4
    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");
  });

  it("remove chip: hover → click × → chip gone", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    // Add a filter
    await user.click(screen.getByLabelText("Add filter"));
    await user.click(screen.getByText("Status"));
    await user.click(screen.getByLabelText("Blocked"));
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");

    // Remove it
    await user.click(screen.getByLabelText("Remove Status filter"));

    // Should be back to 5 results
    expect(screen.getByTestId("result-count")).toHaveTextContent("5 results");
  });

  it("clear all: click × → all gone → empty state", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    // Add two filters
    await user.click(screen.getByLabelText("Add filter"));
    await user.click(screen.getByText("Status"));
    await user.click(screen.getByLabelText("Blocked"));
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    await user.click(screen.getByLabelText("Add filter"));
    await user.click(screen.getByText("Impact"));
    await user.click(screen.getByLabelText("High"));
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    // Clear all
    await user.click(screen.getByLabelText("Clear all filters"));

    // Back to all results
    expect(screen.getByTestId("result-count")).toHaveTextContent("5 results");

    // Placeholder should be back
    expect(screen.getByText("Filter...")).toBeInTheDocument();
  });

  it("data filtering: evaluateExpression produces correct results", () => {
    let state = createEmptyState();
    state = addCondition(state, createCondition("status", ["Blocked"]));
    state = addCondition(state, createCondition("type", ["XSS"]));

    const result = evaluateExpression(mockData, state);
    expect(result).toHaveLength(1);
    expect((result[0] as typeof mockData[0]).id).toBe("1");
  });
});
