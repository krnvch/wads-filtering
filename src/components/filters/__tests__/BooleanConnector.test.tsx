import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BooleanConnector } from "../BooleanConnector";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("BooleanConnector", () => {
  it("renders AND as a span by default", () => {
    renderWithTooltip(<BooleanConnector type="AND" />);
    const el = screen.getByText("AND");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders OR as a span by default", () => {
    renderWithTooltip(<BooleanConnector type="OR" />);
    const el = screen.getByText("OR");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders as a button when onClick is provided", () => {
    renderWithTooltip(<BooleanConnector type="AND" onClick={vi.fn()} />);
    const el = screen.getByRole("button");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("AND");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithTooltip(<BooleanConnector type="AND" onClick={onClick} />);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows tooltip text for AND connector", () => {
    renderWithTooltip(<BooleanConnector type="AND" onClick={vi.fn()} />);
    expect(screen.getByLabelText("Click to change to OR")).toBeInTheDocument();
  });

  it("shows tooltip text for OR connector", () => {
    renderWithTooltip(<BooleanConnector type="OR" onClick={vi.fn()} />);
    expect(screen.getByLabelText("Click to change to AND")).toBeInTheDocument();
  });

  it("applies destructive styling when isInvalid", () => {
    renderWithTooltip(<BooleanConnector type="OR" isInvalid />);
    const el = screen.getByText("OR");
    expect(el.className).toContain("text-destructive");
  });

  it("applies custom className", () => {
    renderWithTooltip(<BooleanConnector type="AND" className="custom-class" />);
    const el = screen.getByText("AND");
    expect(el.className).toContain("custom-class");
  });
});
