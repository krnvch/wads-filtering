import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBarInput } from "../FilterBarInput";

describe("FilterBarInput", () => {
  it("renders with placeholder when no filters", () => {
    render(
      <FilterBarInput
        searchValue=""
        onSearchChange={vi.fn()}
        onOpenPalette={vi.fn()}
        hasFilters={false}
      />,
    );
    expect(screen.getByPlaceholderText("Filter...")).toBeInTheDocument();
  });

  it("keeps placeholder visible when filters exist", () => {
    render(
      <FilterBarInput
        searchValue=""
        onSearchChange={vi.fn()}
        onOpenPalette={vi.fn()}
        hasFilters={true}
      />,
    );
    const input = screen.getByLabelText("Add filter");
    expect(input).toHaveAttribute("placeholder", "Filter...");
  });

  it("calls onOpenPalette when clicked", async () => {
    const user = userEvent.setup();
    const onOpenPalette = vi.fn();
    render(
      <FilterBarInput
        searchValue=""
        onSearchChange={vi.fn()}
        onOpenPalette={onOpenPalette}
        hasFilters={false}
      />,
    );
    await user.click(screen.getByLabelText("Add filter"));
    expect(onOpenPalette).toHaveBeenCalled();
  });

  it("has data-filter-bar-input attribute", () => {
    render(
      <FilterBarInput
        searchValue=""
        onSearchChange={vi.fn()}
        onOpenPalette={vi.fn()}
        hasFilters={false}
      />,
    );
    expect(screen.getByLabelText("Add filter")).toHaveAttribute(
      "data-filter-bar-input",
    );
  });
});
