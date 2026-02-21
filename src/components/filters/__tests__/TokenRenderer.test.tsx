import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenRenderer } from "../TokenRenderer";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  FilterChipToken,
  AndToken,
  OrToken,
  OpenParenToken,
  CloseParenToken,
} from "@/types/tokens";

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const defaultCallbacks = {
  onRemoveToken: vi.fn(),
  onUpdateValues: vi.fn(),
  onUpdateOperator: vi.fn(),
  onToggleConnector: vi.fn(),
};

describe("TokenRenderer", () => {
  it("renders filter chip for filter_chip token", () => {
    const token: FilterChipToken = {
      type: "filter_chip",
      id: "chip-1",
      field: "status",
      fieldLabel: "Status",
      operator: "is",
      values: ["Blocked"],
    };
    renderWithProviders(
      <TokenRenderer token={token} {...defaultCallbacks} />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("renders AND connector chip", () => {
    const token: AndToken = { type: "and", id: "and-1" };
    renderWithProviders(
      <TokenRenderer token={token} {...defaultCallbacks} />,
    );
    expect(screen.getByText("AND")).toBeInTheDocument();
  });

  it("renders OR connector chip", () => {
    const token: OrToken = { type: "or", id: "or-1" };
    renderWithProviders(
      <TokenRenderer token={token} {...defaultCallbacks} />,
    );
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("renders open paren", () => {
    const token: OpenParenToken = {
      type: "open_paren",
      id: "op-1",
      pairId: "pair-1",
    };
    renderWithProviders(
      <TokenRenderer token={token} {...defaultCallbacks} />,
    );
    expect(screen.getByText("(")).toBeInTheDocument();
  });

  it("renders close paren", () => {
    const token: CloseParenToken = {
      type: "close_paren",
      id: "cp-1",
      pairId: "pair-1",
    };
    renderWithProviders(
      <TokenRenderer token={token} {...defaultCallbacks} />,
    );
    expect(screen.getByText(")")).toBeInTheDocument();
  });

  it("returns null for unknown field", () => {
    const token: FilterChipToken = {
      type: "filter_chip",
      id: "chip-1",
      field: "nonexistent_field_xyz",
      fieldLabel: "Unknown",
      operator: "is",
      values: ["val"],
    };
    const { container } = renderWithProviders(
      <TokenRenderer token={token} {...defaultCallbacks} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
