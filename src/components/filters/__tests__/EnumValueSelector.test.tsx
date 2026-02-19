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

    expect(screen.getByText("⌘ ↵ to select multiple")).toBeInTheDocument();
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

  it("calls onConfirm on Cmd+Enter", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <EnumValueSelector
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={statusField}
        selectedValues={["Blocked"]}
        onSelectionChange={vi.fn()}
        onConfirm={onConfirm}
      >
        <button>trigger</button>
      </EnumValueSelector>,
    );

    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onConfirm).toHaveBeenCalled();
  });
});
