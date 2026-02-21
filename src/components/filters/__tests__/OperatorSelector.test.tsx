import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OperatorSelector } from "../OperatorSelector";

describe("OperatorSelector", () => {
  it("renders trigger children", () => {
    render(
      <OperatorSelector
        currentOperator="is"
        fieldType="enum"
        onSelect={vi.fn()}
      >
        <button>is</button>
      </OperatorSelector>,
    );

    expect(screen.getByText("is")).toBeInTheDocument();
  });

  it("shows enum operators when opened for enum field", async () => {
    const user = userEvent.setup();

    render(
      <OperatorSelector
        currentOperator="is"
        fieldType="enum"
        onSelect={vi.fn()}
      >
        <button>is</button>
      </OperatorSelector>,
    );

    await user.click(screen.getByText("is"));

    expect(screen.getByText("is not")).toBeInTheDocument();
    expect(screen.getByText("is any of")).toBeInTheDocument();
    expect(screen.getByText("is not any of")).toBeInTheDocument();
  });

  it("shows 2 text operators when opened for text field", async () => {
    const user = userEvent.setup();

    render(
      <OperatorSelector
        currentOperator="contains"
        fieldType="text"
        onSelect={vi.fn()}
      >
        <button>contains</button>
      </OperatorSelector>,
    );

    await user.click(screen.getByText("contains"));

    expect(screen.getByText("does not contain")).toBeInTheDocument();
    // Should NOT show enum operators
    expect(screen.queryByText("is any of")).not.toBeInTheDocument();
    expect(screen.queryByText("is none of")).not.toBeInTheDocument();
  });

  it("shows checkmark on current operator", async () => {
    const user = userEvent.setup();

    render(
      <OperatorSelector
        currentOperator="is_not"
        fieldType="enum"
        onSelect={vi.fn()}
      >
        <button>is not</button>
      </OperatorSelector>,
    );

    await user.click(screen.getByText("is not"));

    // The "is not" menu item should be checked (role=menuitemcheckbox, aria-checked=true)
    const isNotItem = screen.getByRole("menuitemcheckbox", { name: "is not" });
    expect(isNotItem).toHaveAttribute("aria-checked", "true");

    const isItem = screen.getByRole("menuitemcheckbox", { name: /^is$/ });
    expect(isItem).toHaveAttribute("aria-checked", "false");
  });

  it("calls onSelect with operator value when an item is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <OperatorSelector
        currentOperator="is"
        fieldType="enum"
        onSelect={onSelect}
      >
        <button>is</button>
      </OperatorSelector>,
    );

    await user.click(screen.getByText("is"));
    await user.click(screen.getByText("is any of"));

    expect(onSelect).toHaveBeenCalledWith("is_any_of");
  });

  it("calls onSelect with is_none_of when selected", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <OperatorSelector
        currentOperator="is"
        fieldType="enum"
        onSelect={onSelect}
      >
        <button>is</button>
      </OperatorSelector>,
    );

    await user.click(screen.getByText("is"));
    await user.click(screen.getByText("is not any of"));

    expect(onSelect).toHaveBeenCalledWith("is_none_of");
  });

  it("closes dropdown after selection", async () => {
    const user = userEvent.setup();

    render(
      <OperatorSelector
        currentOperator="is"
        fieldType="enum"
        onSelect={vi.fn()}
      >
        <button>is</button>
      </OperatorSelector>,
    );

    await user.click(screen.getByText("is"));
    await user.click(screen.getByText("is any of"));

    // Dropdown should close — menu items should not be in DOM
    expect(screen.queryByText("is none of")).not.toBeInTheDocument();
  });
});
