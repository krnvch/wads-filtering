import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterGroupComponent } from "../FilterGroupComponent";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { FilterGroup } from "@/types/filters";

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function makeGroup(connector: "AND" | "OR" = "OR"): FilterGroup {
  return {
    id: "g1",
    connector,
    children: [
      {
        id: "c1",
        field: "status",
        fieldLabel: "Status",
        operator: "is",
        values: ["Blocked"],
      },
      {
        id: "c2",
        field: "type",
        fieldLabel: "Attack type",
        operator: "is",
        values: ["XSS"],
      },
    ],
  };
}

const defaultProps = {
  onRemoveCondition: vi.fn(),
  onUpdateConditionValues: vi.fn(),
  onUpdateConditionOperator: vi.fn(),
  onToggleGroupConnector: vi.fn(),
};

describe("FilterGroupComponent", () => {
  it("renders parentheses around group content", () => {
    renderWithTooltip(
      <FilterGroupComponent group={makeGroup()} {...defaultProps} />,
    );
    expect(screen.getByText("(")).toBeInTheDocument();
    expect(screen.getByText(")")).toBeInTheDocument();
  });

  it("renders conditions inside the group", () => {
    renderWithTooltip(
      <FilterGroupComponent group={makeGroup()} {...defaultProps} />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Attack type")).toBeInTheDocument();
  });

  it("renders OR connector between conditions", () => {
    renderWithTooltip(
      <FilterGroupComponent group={makeGroup("OR")} {...defaultProps} />,
    );
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("OR connector inside group is clickable", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderWithTooltip(
      <FilterGroupComponent
        group={makeGroup("OR")}
        {...defaultProps}
        onToggleGroupConnector={onToggle}
      />,
    );

    await user.click(screen.getByLabelText("Click to change to AND"));
    expect(onToggle).toHaveBeenCalledWith("g1");
  });

  it("has group role with aria-label", () => {
    renderWithTooltip(
      <FilterGroupComponent group={makeGroup("OR")} {...defaultProps} />,
    );
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-label",
      "OR filter group",
    );
  });

  it("renders values in chips", () => {
    renderWithTooltip(
      <FilterGroupComponent group={makeGroup()} {...defaultProps} />,
    );
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("XSS")).toBeInTheDocument();
  });

  it("calls onRemoveCondition when chip remove is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithTooltip(
      <FilterGroupComponent
        group={makeGroup()}
        {...defaultProps}
        onRemoveCondition={onRemove}
      />,
    );

    const removeButtons = screen.getAllByLabelText(/Remove .* filter/);
    await user.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalled();
  });

  it("passes text suggestions to chips", () => {
    const group: FilterGroup = {
      id: "g1",
      connector: "OR",
      children: [
        {
          id: "c1",
          field: "host",
          fieldLabel: "Hostname",
          operator: "contains",
          values: ["api"],
        },
        {
          id: "c2",
          field: "status",
          fieldLabel: "Status",
          operator: "is",
          values: ["Blocked"],
        },
      ],
    };

    // This test just verifies it doesn't crash with suggestions
    renderWithTooltip(
      <FilterGroupComponent
        group={group}
        {...defaultProps}
        textSuggestions={{ host: ["api.example.com"] }}
      />,
    );
    expect(screen.getByText("Hostname")).toBeInTheDocument();
  });
});
