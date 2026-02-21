import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import { useTokenFilterState } from "@/hooks/use-token-filter-state";
import { evaluateExpression } from "@/lib/filter-engine";
import { addChipToken, createEmptyTokenState } from "@/lib/token-utils";
import type { TokenFilterState } from "@/types/tokens";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useFilterUIStore } from "@/stores/filter-ui-store";

const mockData = [
  { id: "1", type: "XSS", status: "Blocked", impact: "High", response_code: 200, host: "api.example.com", endpoints: "GET /v1/api/search", parameter: "query.filter" },
  { id: "2", type: "SQL Injection", status: "Monitored", impact: "Medium", response_code: 401, host: "orders.example.com", endpoints: "POST /v1/auth/login", parameter: "body.username" },
  { id: "3", type: "XSS", status: "Started", impact: "Low", response_code: 500, host: "api.example.com", endpoints: "GET /v1/api/data", parameter: "query.page" },
  { id: "4", type: "BOLA Attack", status: "Blocked", impact: "High", response_code: 403, host: "admin.example.com", endpoints: "POST /v1/admin/exec", parameter: "body.command" },
  { id: "5", type: "Brute Force", status: "Monitored", impact: "Medium", response_code: 404, host: "login.example.com", endpoints: "POST /v1/auth/login", parameter: "body.password" },
];

function TestHarness({ initialState }: { initialState?: TokenFilterState }) {
  const {
    tokens,
    expressionTree,
    hasErrors,
    chipCount,
    addFilter,
    removeFilter,
    updateFilterValues,
    updateOperator,
    toggleConnector,
    insertParen,
    clearAll,
  } = useTokenFilterState(initialState);

  const filtered = evaluateExpression(
    mockData as unknown as Record<string, unknown>[],
    { expression: expressionTree },
  );

  return (
    <TooltipProvider>
      <div>
        <FilterBar
          tokens={tokens}
          expressionTree={expressionTree}
          hasErrors={hasErrors}
          chipCount={chipCount}
          onAddFilter={addFilter}
          onRemoveToken={removeFilter}
          onUpdateValues={updateFilterValues}
          onUpdateOperator={updateOperator}
          onToggleConnector={toggleConnector}
          onInsertParen={insertParen}
          onClearAll={clearAll}
        />
        <div data-testid="result-count">{filtered.length} results</div>
        <ul data-testid="results">
          {(filtered as typeof mockData).map((d) => (
            <li key={d.id}>{d.id}</li>
          ))}
        </ul>
      </div>
    </TooltipProvider>
  );
}

describe("Filter Flow Integration", () => {
  beforeEach(() => {
    useFilterUIStore.getState().clearRecentFilters();
  });
  afterEach(() => {
    cleanup();
    document.querySelectorAll("[data-radix-popper-content-wrapper]").forEach(el => el.remove());
    document.querySelectorAll("[role='dialog']").forEach(el => el.remove());
    document.querySelectorAll("[data-radix-portal]").forEach(el => el.remove());
  });

  it("full add filter flow: keyboard navigation through palette and value selector", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    expect(screen.getByTestId("result-count")).toHaveTextContent("5 results");

    // Open palette by clicking input
    await user.click(screen.getByLabelText("Add filter"));
    // ArrowDown to "Status" (index 1), then Enter to select
    await user.keyboard("{ArrowDown}{Enter}");
    // Value selector opens with Blocked at focusedIndex 0
    // Enter toggles Blocked ON and applies
    await user.keyboard("{Enter}");

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");
  });

  it("multi-filter AND: add 2 chips → both render with AND between", () => {
    const state = addChipToken(
      addChipToken(createEmptyTokenState(), "status", ["Blocked"]),
      "impact",
      ["High"],
    );
    render(<TestHarness initialState={state} />);

    expect(screen.getByText("AND")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");
  });

  it("remove chip: click × → chip gone → results reset", async () => {
    const user = userEvent.setup();
    const state = addChipToken(createEmptyTokenState(), "status", ["Blocked"]);
    render(<TestHarness initialState={state} />);

    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");

    await user.click(screen.getByLabelText("Remove Status filter"));
    expect(screen.getByTestId("result-count")).toHaveTextContent("5 results");
  });

  it("clear all: click × → all gone → empty state", async () => {
    const user = userEvent.setup();
    const state = addChipToken(
      addChipToken(createEmptyTokenState(), "status", ["Blocked"]),
      "impact",
      ["High"],
    );
    render(<TestHarness initialState={state} />);

    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");

    await user.click(screen.getByLabelText("Clear all filters"));
    expect(screen.getByTestId("result-count")).toHaveTextContent("5 results");
    expect(screen.getByPlaceholderText("Filter...")).toBeInTheDocument();
  });

  it("data filtering: evaluateExpression produces correct results", () => {
    const result = evaluateExpression(mockData as unknown as Record<string, unknown>[], {
      expression: {
        id: "root",
        connector: "AND",
        children: [
          { id: "c1", field: "status", fieldLabel: "Status", operator: "is", values: ["Blocked"] },
          { id: "c2", field: "type", fieldLabel: "Attack type", operator: "is", values: ["XSS"] },
        ],
      },
    });
    expect(result).toHaveLength(1);
    expect((result[0] as typeof mockData[0]).id).toBe("1");
  });

  it("operator change: switch from 'is' to 'is not' updates filtered results", async () => {
    const user = userEvent.setup();
    const state = addChipToken(createEmptyTokenState(), "status", ["Blocked"]);
    render(<TestHarness initialState={state} />);

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByTestId("result-count")).toHaveTextContent("2 results");

    await user.click(screen.getByLabelText("Change Status operator"));
    await user.click(screen.getByText("is not"));

    expect(screen.getByTestId("result-count")).toHaveTextContent("3 results");
  });
});
