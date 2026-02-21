import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectorChip } from "../ConnectorChip";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AndToken, OrToken } from "@/types/tokens";

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function makeAnd(id = "and-1"): AndToken {
  return { type: "and", id };
}

function makeOr(id = "or-1"): OrToken {
  return { type: "or", id };
}

describe("ConnectorChip", () => {
  it("renders AND label", () => {
    renderWithTooltip(
      <ConnectorChip token={makeAnd()} onRemove={vi.fn()} onToggle={vi.fn()} />,
    );
    expect(screen.getByText("AND")).toBeInTheDocument();
  });

  it("renders OR label", () => {
    renderWithTooltip(
      <ConnectorChip token={makeOr()} onRemove={vi.fn()} onToggle={vi.fn()} />,
    );
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderWithTooltip(
      <ConnectorChip token={makeAnd("a1")} onRemove={vi.fn()} onToggle={onToggle} />,
    );
    await user.click(screen.getByText("AND"));
    expect(onToggle).toHaveBeenCalledWith("a1");
  });

  it("calls onRemove when × is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithTooltip(
      <ConnectorChip token={makeAnd("a1")} onRemove={onRemove} onToggle={vi.fn()} />,
    );
    const removeButton = screen.getByLabelText("Remove AND connector");
    await user.click(removeButton);
    expect(onRemove).toHaveBeenCalledWith("a1");
  });

  it("shows error styling when token has error", () => {
    const token: AndToken = {
      type: "and",
      id: "a1",
      error: { code: "CONSECUTIVE_CONNECTOR", message: "Two connectors in a row" },
    };
    renderWithTooltip(
      <ConnectorChip token={token} onRemove={vi.fn()} onToggle={vi.fn()} />,
    );
    const badge = screen.getByText("AND").closest("[data-token-id]");
    expect(badge?.className).toContain("destructive");
  });

  it("has data-token-id attribute", () => {
    renderWithTooltip(
      <ConnectorChip token={makeAnd("a1")} onRemove={vi.fn()} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole("listitem")).toHaveAttribute("data-token-id", "a1");
  });
});
