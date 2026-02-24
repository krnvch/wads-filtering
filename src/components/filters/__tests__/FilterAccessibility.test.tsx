import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";
import type { Token, FilterChipToken, AndToken } from "@/types/tokens";
import type { TokenFilterOperator } from "@/types/tokens";
import type { FilterGroup } from "@/types/filters";
import { tokensToExpressionTree } from "@/lib/token-parser";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useFilterUIStore } from "@/stores/filter-ui-store";

let _idCounter = 0;
function uid(): string {
  return `acc-${++_idCounter}`;
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

function deriveTree(tokens: Token[]): FilterGroup {
  if (tokens.filter((t) => t.type === "filter_chip").length === 0) {
    return { id: "root", connector: "AND", children: [] };
  }
  return tokensToExpressionTree(tokens);
}

function renderFilterBar(props: {
  tokens?: Token[];
  onAddFilter?: ReturnType<typeof vi.fn>;
  onRemoveToken?: ReturnType<typeof vi.fn>;
  onClearAll?: ReturnType<typeof vi.fn>;
  resultCount?: number;
}) {
  const tokens = props.tokens ?? [];
  const chipCount = tokens.filter((t) => t.type === "filter_chip").length;
  return render(
    <TooltipProvider>
      <FilterBar
        tokens={tokens}
        expressionTree={deriveTree(tokens)}
        hasErrors={false}
        chipCount={chipCount}
        onAddFilter={props.onAddFilter ?? vi.fn()}
        onRemoveToken={props.onRemoveToken ?? vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
        onToggleConnector={vi.fn()}
        onInsertConnector={vi.fn()}
        onInsertParen={vi.fn()}
        onClearAll={props.onClearAll ?? vi.fn()}
        resultCount={props.resultCount}
      />
    </TooltipProvider>,
  );
}

// --- Global shortcuts ---

describe("FilterAccessibility: Global shortcuts", () => {
  beforeEach(() => {
    _idCounter = 0;
    useFilterUIStore.getState().clearRecentFilters();
  });

  it("press F on body opens palette", async () => {
    const user = userEvent.setup();
    renderFilterBar({});

    document.body.focus();
    await user.keyboard("f");

    expect(screen.getByText("Attack type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("press F inside input does NOT open palette", async () => {
    const user = userEvent.setup();
    renderFilterBar({});

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    await user.keyboard("f");

    expect(screen.queryByText("Attack type")).not.toBeInTheDocument();

    document.body.removeChild(input);
  });

  it("press Shift+F with filters clears all", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const tokens: Token[] = [makeChip()];
    renderFilterBar({ tokens, onClearAll });

    document.body.focus();
    await user.keyboard("{Shift>}f{/Shift}");

    expect(onClearAll).toHaveBeenCalled();
  });

  it("press Escape while palette open closes it", async () => {
    const user = userEvent.setup();
    renderFilterBar({});

    await user.click(screen.getByLabelText("Add filter"));
    expect(screen.getByText("Attack type")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Attack type")).not.toBeInTheDocument();
  });
});

// --- Chip keyboard deletion ---

describe("FilterAccessibility: Chip keyboard deletion", () => {
  beforeEach(() => {
    _idCounter = 0;
  });

  it("tab to chip gives it focus", () => {
    const tokens: Token[] = [makeChip()];
    renderFilterBar({ tokens });

    const chip = screen.getByRole("listitem");
    chip.focus();

    expect(document.activeElement).toBe(chip);
  });

  it("Backspace on focused chip calls onRemoveToken", async () => {
    const user = userEvent.setup();
    const onRemoveToken = vi.fn();
    const tokens: Token[] = [makeChip()];
    renderFilterBar({ tokens, onRemoveToken });

    const chip = screen.getByRole("listitem");
    chip.focus();
    await user.keyboard("{Backspace}");

    expect(onRemoveToken).toHaveBeenCalled();
  });

  it("Delete on focused chip calls onRemoveToken", async () => {
    const user = userEvent.setup();
    const onRemoveToken = vi.fn();
    const tokens: Token[] = [makeChip()];
    renderFilterBar({ tokens, onRemoveToken });

    const chip = screen.getByRole("listitem");
    chip.focus();
    await user.keyboard("{Delete}");

    expect(onRemoveToken).toHaveBeenCalled();
  });
});

// --- ARIA structure ---

describe("FilterAccessibility: ARIA structure", () => {
  beforeEach(() => {
    _idCounter = 0;
  });

  it("outer wrapper has role='search'", () => {
    renderFilterBar({});
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("inner bar has role='toolbar'", () => {
    renderFilterBar({});
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("chips have role='listitem'", () => {
    renderFilterBar({ tokens: [makeChip()] });
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("chips have descriptive aria-label", () => {
    renderFilterBar({ tokens: [makeChip()] });

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
    const emptyTokens: Token[] = [];
    const tokensWithChip: Token[] = [makeChip()];

    const { rerender } = render(
      <TooltipProvider>
        <FilterBar
          tokens={emptyTokens}
          expressionTree={{ id: "root", connector: "AND", children: [] }}
          hasErrors={false}
          chipCount={0}
          onAddFilter={vi.fn()}
          onRemoveToken={vi.fn()}
          onUpdateValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onToggleConnector={vi.fn()}
          onInsertConnector={vi.fn()}
          onInsertParen={vi.fn()}
          onClearAll={vi.fn()}
        />
      </TooltipProvider>,
    );

    rerender(
      <TooltipProvider>
        <FilterBar
          tokens={tokensWithChip}
          expressionTree={deriveTree(tokensWithChip)}
          hasErrors={false}
          chipCount={1}
          onAddFilter={vi.fn()}
          onRemoveToken={vi.fn()}
          onUpdateValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onToggleConnector={vi.fn()}
          onInsertConnector={vi.fn()}
          onInsertParen={vi.fn()}
          onClearAll={vi.fn()}
        />
      </TooltipProvider>,
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter added");
  });

  it("announcer updates on filter remove", () => {
    const chip1 = makeChip();
    const chip2 = makeChip({ field: "type", fieldLabel: "Attack type", values: ["XSS"] });
    const twoChipTokens: Token[] = [chip1, makeAnd(), chip2];
    const oneChipTokens: Token[] = [chip1];

    const { rerender } = render(
      <TooltipProvider>
        <FilterBar
          tokens={twoChipTokens}
          expressionTree={deriveTree(twoChipTokens)}
          hasErrors={false}
          chipCount={2}
          onAddFilter={vi.fn()}
          onRemoveToken={vi.fn()}
          onUpdateValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onToggleConnector={vi.fn()}
          onInsertConnector={vi.fn()}
          onInsertParen={vi.fn()}
          onClearAll={vi.fn()}
        />
      </TooltipProvider>,
    );

    rerender(
      <TooltipProvider>
        <FilterBar
          tokens={oneChipTokens}
          expressionTree={deriveTree(oneChipTokens)}
          hasErrors={false}
          chipCount={1}
          onAddFilter={vi.fn()}
          onRemoveToken={vi.fn()}
          onUpdateValues={vi.fn()}
          onUpdateOperator={vi.fn()}
          onToggleConnector={vi.fn()}
          onInsertConnector={vi.fn()}
          onInsertParen={vi.fn()}
          onClearAll={vi.fn()}
        />
      </TooltipProvider>,
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Filter removed");
  });

  it("announcer shows zero results assertively", () => {
    const tokens: Token[] = [makeChip()];
    renderFilterBar({ tokens, resultCount: 0 });

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
