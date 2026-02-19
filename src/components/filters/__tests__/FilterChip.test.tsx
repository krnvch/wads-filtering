import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChip } from "../FilterChip";
import type { FilterCondition, FilterFieldDef } from "@/types/filters";

const statusField: FilterFieldDef = {
  key: "status",
  label: "Status",
  category: "Attack characteristics",
  type: "enum",
  values: ["Blocked", "Monitored", "Started"],
};

function makeCondition(
  overrides: Partial<FilterCondition> = {},
): FilterCondition {
  return {
    id: "c1",
    field: "status",
    fieldLabel: "Status",
    operator: "is",
    values: ["Blocked"],
    ...overrides,
  };
}

describe("FilterChip", () => {
  it("renders field label, operator, and values", () => {
    const condition = makeCondition();
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
      />,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("is")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("formats is_not operator as 'is not'", () => {
    const condition = makeCondition({ operator: "is_not" });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
      />,
    );

    expect(screen.getByText("is not")).toBeInTheDocument();
  });

  it("joins multiple values with 'or' when 2 values", () => {
    const condition = makeCondition({ values: ["Blocked", "Monitored"] });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
      />,
    );

    expect(screen.getByText("Blocked or Monitored")).toBeInTheDocument();
  });

  it("joins 3+ values with commas", () => {
    const condition = makeCondition({
      values: ["Blocked", "Monitored", "Started"],
    });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Blocked, Monitored, Started"),
    ).toBeInTheDocument();
  });

  it("calls onRemove when × button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const condition = makeCondition();

    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={onRemove}
        onUpdateValues={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Remove Status filter"));
    expect(onRemove).toHaveBeenCalledWith("c1");
  });

  it("opens value selector when value text is clicked", async () => {
    const user = userEvent.setup();
    const condition = makeCondition();

    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Edit Status values"));

    // Popover should show checkboxes
    expect(screen.getByLabelText("Blocked")).toBeInTheDocument();
    expect(screen.getByLabelText("Monitored")).toBeInTheDocument();
    expect(screen.getByLabelText("Started")).toBeInTheDocument();
  });
});
