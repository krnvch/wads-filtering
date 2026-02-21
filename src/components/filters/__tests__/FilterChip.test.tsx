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

const endpointField: FilterFieldDef = {
  key: "endpoints",
  label: "Endpoint",
  category: "Target & Context",
  type: "text",
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
        onUpdateOperator={vi.fn()}
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
        onUpdateOperator={vi.fn()}
      />,
    );

    expect(screen.getByText("is not")).toBeInTheDocument();
  });

  it("joins multiple values with commas", () => {
    const condition = makeCondition({ values: ["Blocked", "Monitored"] });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    expect(screen.getByText("Blocked, Monitored")).toBeInTheDocument();
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
        onUpdateOperator={vi.fn()}
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
        onUpdateOperator={vi.fn()}
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
        onUpdateOperator={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Edit Status values"));

    // Popover should show checkboxes
    expect(screen.getByLabelText("Blocked")).toBeInTheDocument();
    expect(screen.getByLabelText("Monitored")).toBeInTheDocument();
    expect(screen.getByLabelText("Started")).toBeInTheDocument();
  });

  it("opens operator dropdown when operator text is clicked", async () => {
    const user = userEvent.setup();
    const condition = makeCondition();

    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Change Status operator"));

    expect(screen.getByText("is not")).toBeInTheDocument();
    expect(screen.getByText("is any of")).toBeInTheDocument();
    expect(screen.getByText("is not any of")).toBeInTheDocument();
  });

  it("calls onUpdateOperator when a different operator is selected", async () => {
    const user = userEvent.setup();
    const onUpdateOperator = vi.fn();
    const condition = makeCondition();

    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={onUpdateOperator}
      />,
    );

    await user.click(screen.getByLabelText("Change Status operator"));
    await user.click(screen.getByText("is not"));

    expect(onUpdateOperator).toHaveBeenCalledWith("c1", "is_not");
  });

  it("has tabIndex=0 for keyboard focus", () => {
    const condition = makeCondition();
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    const chip = screen.getByRole("listitem");
    expect(chip).toHaveAttribute("tabindex", "0");
  });

  it("has data-filter-id attribute", () => {
    const condition = makeCondition({ id: "test-123" });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    const chip = screen.getByRole("listitem");
    expect(chip).toHaveAttribute("data-filter-id", "test-123");
  });

  it("has descriptive aria-label with comma-separated values", () => {
    const condition = makeCondition({
      values: ["Blocked", "Monitored"],
      operator: "is_not",
    });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    const chip = screen.getByRole("listitem");
    expect(chip).toHaveAttribute(
      "aria-label",
      "Status is not Blocked, Monitored",
    );
  });

  it("calls onRemove when Backspace is pressed on chip", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const condition = makeCondition();

    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={onRemove}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    const chip = screen.getByRole("listitem");
    chip.focus();
    await user.keyboard("{Backspace}");
    expect(onRemove).toHaveBeenCalledWith("c1");
  });

  it("calls onRemove when Delete is pressed on chip", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const condition = makeCondition();

    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={onRemove}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    const chip = screen.getByRole("listitem");
    chip.focus();
    await user.keyboard("{Delete}");
    expect(onRemove).toHaveBeenCalledWith("c1");
  });

  it("does not call onRemove when Backspace is pressed on child button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const condition = makeCondition();

    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={onRemove}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    // Focus the remove button (child), not the chip itself
    const removeBtn = screen.getByLabelText("Remove Status filter");
    removeBtn.focus();
    await user.keyboard("{Backspace}");
    // onRemove should NOT be called via the chip's keydown handler
    // (it might still be called if the button handles it, but that's separate)
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("has role listitem", () => {
    const condition = makeCondition();
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("displays is_any_of operator as 'is any of'", () => {
    const condition = makeCondition({
      operator: "is_any_of",
      values: ["Blocked", "Monitored"],
    });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    expect(screen.getByText("is any of")).toBeInTheDocument();
    expect(screen.getByText("Blocked, Monitored")).toBeInTheDocument();
  });

  it("displays is_none_of operator as 'is not any of'", () => {
    const condition = makeCondition({
      operator: "is_none_of",
      values: ["Blocked", "Monitored"],
    });
    render(
      <FilterChip
        condition={condition}
        fieldDef={statusField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    expect(screen.getByText("is not any of")).toBeInTheDocument();
    expect(screen.getByText("Blocked, Monitored")).toBeInTheDocument();
  });

  it("renders TextValueInput for text field type", async () => {
    const user = userEvent.setup();
    const condition = makeCondition({
      field: "endpoints",
      fieldLabel: "Endpoint",
      operator: "contains",
      values: ["api"],
    });

    render(
      <FilterChip
        condition={condition}
        fieldDef={endpointField}
        onRemove={vi.fn()}
        onUpdateValues={vi.fn()}
        onUpdateOperator={vi.fn()}
      />,
    );

    // Click value to open text input
    await user.click(screen.getByLabelText("Edit Endpoint values"));

    // Should show text input, not checkboxes
    expect(screen.getByLabelText("Enter Endpoint value")).toBeInTheDocument();
  });
});
