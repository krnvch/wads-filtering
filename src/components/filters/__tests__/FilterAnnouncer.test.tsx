import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterAnnouncer } from "../FilterAnnouncer";
import type { Token, FilterChipToken, AndToken } from "@/types/tokens";

let _idCounter = 0;
function uid(): string {
  return `ann-${++_idCounter}`;
}

function makeChip(overrides: Partial<FilterChipToken> = {}): FilterChipToken {
  return {
    type: "filter_chip",
    id: uid(),
    field: "status",
    fieldLabel: "Status",
    operator: "is",
    values: ["Blocked"],
    ...overrides,
  };
}

function makeAnd(): AndToken {
  return { type: "and", id: uid() };
}

function makeTokensWithFilters(
  ...filters: Array<{ field: string; fieldLabel: string; values: string[] }>
): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < filters.length; i++) {
    if (i > 0) tokens.push(makeAnd());
    tokens.push(
      makeChip({
        field: filters[i].field,
        fieldLabel: filters[i].fieldLabel,
        values: filters[i].values,
      }),
    );
  }
  return tokens;
}

describe("FilterAnnouncer", () => {
  beforeEach(() => {
    _idCounter = 0;
  });

  it("renders polite live region", () => {
    render(<FilterAnnouncer tokens={[]} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders assertive live region", () => {
    render(<FilterAnnouncer tokens={[]} />);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("announces filter added on state change", () => {
    const emptyTokens: Token[] = [];
    const tokensWithChip = makeTokensWithFilters({
      field: "status",
      fieldLabel: "Status",
      values: ["Blocked"],
    });

    const { rerender } = render(<FilterAnnouncer tokens={emptyTokens} />);
    rerender(<FilterAnnouncer tokens={tokensWithChip} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter added");
    expect(status.textContent).toContain("Status");
    expect(status.textContent).toContain("Blocked");
    expect(status.textContent).toContain("1 filter active");
  });

  it("announces filter removed on state change", () => {
    const twoChipTokens = makeTokensWithFilters(
      { field: "status", fieldLabel: "Status", values: ["Blocked"] },
      { field: "type", fieldLabel: "Attack type", values: ["XSS"] },
    );
    const oneChipTokens = makeTokensWithFilters({
      field: "status",
      fieldLabel: "Status",
      values: ["Blocked"],
    });

    const { rerender } = render(
      <FilterAnnouncer tokens={twoChipTokens} />,
    );
    rerender(<FilterAnnouncer tokens={oneChipTokens} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter removed");
    expect(status.textContent).toContain("1 filter active");
  });

  it("announces all filters cleared", () => {
    const tokensWithChip = makeTokensWithFilters({
      field: "status",
      fieldLabel: "Status",
      values: ["Blocked"],
    });
    const emptyTokens: Token[] = [];

    const { rerender } = render(
      <FilterAnnouncer tokens={tokensWithChip} />,
    );
    rerender(<FilterAnnouncer tokens={emptyTokens} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("All filters cleared");
  });

  it("does not announce on initial render", () => {
    render(<FilterAnnouncer tokens={[]} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
  });

  it("announces zero results assertively when filters active", () => {
    const tokens = makeTokensWithFilters({
      field: "status",
      fieldLabel: "Status",
      values: ["Blocked"],
    });

    render(<FilterAnnouncer tokens={tokens} resultCount={0} />);

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toContain(
      "No results match your current filters",
    );
  });

  it("does not announce zero results when no filters active", () => {
    render(<FilterAnnouncer tokens={[]} resultCount={0} />);

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toBe("");
  });

  it("clears assertive message when results become available", () => {
    const tokens = makeTokensWithFilters({
      field: "status",
      fieldLabel: "Status",
      values: ["Blocked"],
    });

    const { rerender } = render(
      <FilterAnnouncer tokens={tokens} resultCount={0} />,
    );
    rerender(<FilterAnnouncer tokens={tokens} resultCount={5} />);

    const alerts = screen.getAllByRole("alert");
    const assertive = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(assertive?.textContent).toBe("");
  });

  it("announces plural 'filters' for multiple filters", () => {
    const emptyTokens: Token[] = [];
    const twoChipTokens = makeTokensWithFilters(
      { field: "status", fieldLabel: "Status", values: ["Blocked"] },
      { field: "type", fieldLabel: "Attack type", values: ["XSS"] },
    );

    const { rerender } = render(
      <FilterAnnouncer tokens={emptyTokens} />,
    );
    rerender(<FilterAnnouncer tokens={twoChipTokens} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("2 filters active");
  });
});
