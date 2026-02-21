import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnumValueSelector } from "../EnumValueSelector";
import type { FilterFieldDef } from "@/types/filters";

const statusField: FilterFieldDef = {
  key: "status",
  label: "Status",
  category: "Attack characteristics",
  type: "enum",
  values: ["Blocked", "Monitored", "Started"],
};

describe("EnumValueSelector", () => {
  it("renders checkboxes for each value when open", () => {
    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={[]}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    expect(screen.getByLabelText("Blocked")).toBeInTheDocument();
    expect(screen.getByLabelText("Monitored")).toBeInTheDocument();
    expect(screen.getByLabelText("Started")).toBeInTheDocument();
  });

  it("shows keyboard hint", () => {
    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={[]}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    expect(screen.getByText(/↵ apply/)).toBeInTheDocument();
    expect(screen.getByText(/⌘ ↵ select more/)).toBeInTheDocument();
  });

  it("calls onSelectionChange when a checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    await user.click(screen.getByLabelText("Blocked"));
    expect(onSelectionChange).toHaveBeenCalledWith(["Blocked"]);
  });

  it("removes value when unchecking", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={["Blocked", "Monitored"]}
        onSelectionChange={onSelectionChange}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    await user.click(screen.getByLabelText("Blocked"));
    expect(onSelectionChange).toHaveBeenCalledWith(["Monitored"]);
  });

  it("Cmd+Enter toggles focused value without closing", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    // Cmd+Enter toggles first item (Blocked) but does NOT call onConfirm
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSelectionChange).toHaveBeenCalledWith(["Blocked"]);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Enter toggles focused value and applies", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    // Enter toggles first item (Blocked) AND calls onConfirm with new values
    await user.keyboard("{Enter}");
    expect(onSelectionChange).toHaveBeenCalledWith(["Blocked"]);
    expect(onConfirm).toHaveBeenCalledWith(["Blocked"]);
  });

  it("ArrowDown/ArrowUp moves focus between values", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    // ArrowDown to Monitored (index 1), then Enter to toggle+apply
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelectionChange).toHaveBeenCalledWith(["Monitored"]);
    expect(onConfirm).toHaveBeenCalledWith(["Monitored"]);
  });

  it("Cmd+Enter multi-select then Enter to apply", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    // Cmd+Enter to toggle Blocked (stay open)
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSelectionChange).toHaveBeenCalledWith(["Blocked"]);
    expect(onConfirm).not.toHaveBeenCalled();

    // Simulate parent re-render with updated selection
    rerender(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={["Blocked"]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    // ArrowDown to Monitored, then Enter to toggle + apply
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelectionChange).toHaveBeenCalledWith(["Blocked", "Monitored"]);
    expect(onConfirm).toHaveBeenCalledWith(["Blocked", "Monitored"]);
  });
});
