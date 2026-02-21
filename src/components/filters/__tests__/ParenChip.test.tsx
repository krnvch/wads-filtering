import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParenChip } from "../ParenChip";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { OpenParenToken, CloseParenToken } from "@/types/tokens";

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function makeOpen(id = "op-1", pairId = "pair-1"): OpenParenToken {
  return { type: "open_paren", id, pairId };
}

function makeClose(id = "cp-1", pairId = "pair-1"): CloseParenToken {
  return { type: "close_paren", id, pairId };
}

describe("ParenChip", () => {
  it("renders ( for open paren", () => {
    renderWithTooltip(
      <ParenChip token={makeOpen()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText("(")).toBeInTheDocument();
  });

  it("renders ) for close paren", () => {
    renderWithTooltip(
      <ParenChip token={makeClose()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText(")")).toBeInTheDocument();
  });

  it("calls onRemove when × is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithTooltip(
      <ParenChip token={makeOpen("op-1")} onRemove={onRemove} />,
    );
    await user.click(screen.getByLabelText("Remove opening parenthesis"));
    expect(onRemove).toHaveBeenCalledWith("op-1");
  });

  it("calls onRemove on Delete key", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithTooltip(
      <ParenChip token={makeOpen("op-1")} onRemove={onRemove} />,
    );
    const el = screen.getByRole("listitem");
    el.focus();
    await user.keyboard("{Delete}");
    expect(onRemove).toHaveBeenCalledWith("op-1");
  });

  it("shows error styling when token has error", () => {
    const token: OpenParenToken = {
      type: "open_paren",
      id: "op-1",
      pairId: "pair-1",
      error: { code: "UNBALANCED_PAREN", message: "Unmatched paren" },
    };
    renderWithTooltip(
      <ParenChip token={token} onRemove={vi.fn()} />,
    );
    const el = screen.getByText("(");
    expect(el.className).toContain("destructive");
  });
});
