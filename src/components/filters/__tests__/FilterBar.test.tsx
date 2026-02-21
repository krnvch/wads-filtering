import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import type { Token, FilterChipToken, AndToken, OrToken, OpenParenToken, CloseParenToken } from "@/types/tokens";
import type { TokenFilterOperator } from "@/types/tokens";
import type { FilterGroup } from "@/types/filters";
import { tokensToExpressionTree } from "@/lib/token-parser";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useFilterUIStore } from "@/stores/filter-ui-store";

let _idCounter = 0;
function uid(): string {
  return `test-${++_idCounter}`;
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

function makeAnd(id?: string): AndToken {
  return { type: "and", id: id ?? uid() };
}

function makeOr(id?: string): OrToken {
  return { type: "or", id: id ?? uid() };
}

function makeOpenParen(pairId: string, id?: string): OpenParenToken {
  return { type: "open_paren", id: id ?? uid(), pairId };
}

function makeCloseParen(pairId: string, id?: string): CloseParenToken {
  return { type: "close_paren", id: id ?? uid(), pairId };
}

function deriveTree(tokens: Token[]): FilterGroup {
  if (tokens.filter((t) => t.type === "filter_chip").length === 0) {
    return { id: "root", connector: "AND", children: [] };
  }
  return tokensToExpressionTree(tokens);
}

function renderBar(tokens: Token[], overrides: Record<string, unknown> = {}) {
  const chipCount = tokens.filter((t) => t.type === "filter_chip").length;
  return render(
    <TooltipProvider>
      <FilterBar
        tokens={tokens}
        expressionTree={deriveTree(tokens)}
        hasErrors={false}
        chipCount={chipCount}
        onAddFilter={vi.fn()}
        onRemoveToken={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onToggleConnector={vi.fn()}
        onInsertParen={vi.fn()}
        onClearAll={vi.fn()}
        {...overrides}
      />
    </TooltipProvider>,
  );
}

describe("FilterBar", () => {
  beforeEach(() => {
    _idCounter = 0;
    useFilterUIStore.getState().clearRecentFilters();
  });

  it("renders placeholder when no filters", () => {
    renderBar([]);
    expect(screen.getByPlaceholderText("Filter...")).toBeInTheDocument();
  });

  it("renders custom placeholder", () => {
    renderBar([], { placeholder: "Search attacks..." });
    expect(screen.getByPlaceholderText("Search attacks...")).toBeInTheDocument();
  });

  it("renders chips for active filters", () => {
    renderBar([makeChip()]);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("renders AND connector between multiple chips", () => {
    const tokens: Token[] = [
      makeChip(),
      makeAnd(),
      makeChip({ field: "type", fieldLabel: "Attack type", values: ["XSS"] }),
    ];
    renderBar(tokens);
    expect(screen.getByText("AND")).toBeInTheDocument();
  });

  it("shows clear-all button when filters exist", () => {
    renderBar([makeChip()]);
    expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
  });

  it("does not show clear-all button when empty", () => {
    renderBar([]);
    expect(
      screen.queryByLabelText("Clear all filters"),
    ).not.toBeInTheDocument();
  });

  it("calls onClearAll when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    renderBar([makeChip()], { onClearAll });

    await user.click(screen.getByLabelText("Clear all filters"));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("opens palette when clicking the placeholder area", async () => {
    const user = userEvent.setup();
    renderBar([]);

    await user.click(screen.getByLabelText("Add filter"));
    expect(screen.getByText("Attack type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("shows text input when a text field is selected from palette", async () => {
    const user = userEvent.setup();
    renderBar([]);

    await user.click(screen.getByLabelText("Add filter"));
    await user.click(screen.getByText("Endpoint"));

    expect(screen.getByLabelText("Enter Endpoint value")).toBeInTheDocument();
  });

  it("passes onUpdateOperator to chips", async () => {
    const user = userEvent.setup();
    const onUpdateOperator = vi.fn();
    renderBar([makeChip()], { onUpdateOperator });

    await user.click(screen.getByLabelText("Change Status operator"));
    await user.click(screen.getByText("is not"));

    expect(onUpdateOperator).toHaveBeenCalled();
  });
});

describe("FilterBar (group rendering)", () => {
  beforeEach(() => {
    _idCounter = 0;
  });

  it("renders parentheses and OR for grouped tokens", () => {
    const pairId = uid();
    const tokens: Token[] = [
      makeOpenParen(pairId),
      makeChip(),
      makeOr(),
      makeChip({ field: "type", fieldLabel: "Attack type", values: ["XSS"] }),
      makeCloseParen(pairId),
    ];
    renderBar(tokens);

    expect(screen.getByText("(")).toBeInTheDocument();
    expect(screen.getByText(")")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Attack type")).toBeInTheDocument();
  });

  it("renders clickable AND connectors that call onToggleConnector", async () => {
    const user = userEvent.setup();
    const onToggleConnector = vi.fn();
    const andId = "and-1";
    const tokens: Token[] = [
      makeChip(),
      makeAnd(andId),
      makeChip({ field: "type", fieldLabel: "Attack type", values: ["XSS"] }),
    ];
    renderBar(tokens, { onToggleConnector });

    await user.click(screen.getByText("AND"));
    expect(onToggleConnector).toHaveBeenCalledWith(andId);
  });

  it("renders validation error alert when hasErrors is true", () => {
    renderBar([makeChip()], { hasErrors: true });

    const alerts = screen.getAllByRole("alert");
    const validationAlert = alerts.find(
      (el) => el.getAttribute("data-slot") === "alert",
    );
    expect(validationAlert).toBeDefined();
  });

  it("applies destructive border when hasErrors is true", () => {
    renderBar([makeChip()], { hasErrors: true });

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.className).toContain("border-destructive");
  });

  it("does not render validation alert when no errors", () => {
    renderBar([makeChip()], { hasErrors: false });

    // The announcer has assertive alert, but no validation Alert should exist
    const alerts = screen.getAllByRole("alert");
    const validationAlert = alerts.find(
      (el) => el.getAttribute("data-slot") === "alert",
    );
    expect(validationAlert).toBeUndefined();
  });

  it("renders mixed group + condition tokens", () => {
    const pairId = uid();
    const tokens: Token[] = [
      makeOpenParen(pairId),
      makeChip(),
      makeOr(),
      makeChip({ field: "type", fieldLabel: "Attack type", values: ["XSS"] }),
      makeCloseParen(pairId),
      makeAnd(),
      makeChip({ field: "impact", fieldLabel: "Impact", values: ["High"] }),
    ];
    renderBar(tokens);

    expect(screen.getByText("(")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});

describe("FilterBar (accessibility)", () => {
  beforeEach(() => {
    _idCounter = 0;
  });

  it("has role='search' on outer wrapper", () => {
    renderBar([]);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("has aria-label='Filter search' on outer wrapper", () => {
    renderBar([]);
    expect(screen.getByRole("search")).toHaveAttribute(
      "aria-label",
      "Filter search",
    );
  });

  it("has role='toolbar' on inner bar", () => {
    renderBar([]);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("has data-filter-palette-trigger on palette trigger button", () => {
    renderBar([]);
    const trigger = screen.getByLabelText("Add filter");
    expect(trigger).toHaveAttribute("data-filter-palette-trigger");
  });

  it("renders FilterAnnouncer with polite live region", () => {
    renderBar([]);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("opens palette when F key is pressed", async () => {
    const user = userEvent.setup();
    renderBar([]);

    document.body.focus();
    await user.keyboard("f");

    expect(screen.getByText("Attack type")).toBeInTheDocument();
  });

  it("calls onClearAll when Shift+F is pressed with filters", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    renderBar([makeChip()], { onClearAll });

    document.body.focus();
    await user.keyboard("{Shift>}f{/Shift}");

    expect(onClearAll).toHaveBeenCalled();
  });

  it("does not call onClearAll when Shift+F is pressed without filters", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    renderBar([], { onClearAll });

    document.body.focus();
    await user.keyboard("{Shift>}f{/Shift}");

    expect(onClearAll).not.toHaveBeenCalled();
  });

  it("wraps onRemoveToken with focus management", async () => {
    const user = userEvent.setup();
    const onRemoveToken = vi.fn();
    renderBar([makeChip()], { onRemoveToken });

    await user.click(screen.getByLabelText("Remove Status filter"));
    expect(onRemoveToken).toHaveBeenCalled();
  });
});
