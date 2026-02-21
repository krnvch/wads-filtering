import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPalette } from "../FilterPalette";

describe("FilterPalette", () => {
  afterEach(() => {
    cleanup();
    document
      .querySelectorAll("[data-radix-popper-content-wrapper]")
      .forEach((el) => el.remove());
    document
      .querySelectorAll("[data-radix-portal]")
      .forEach((el) => el.remove());
  });

  it("renders all fields as a flat list when open", () => {
    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={vi.fn()}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    expect(screen.getByText("Attack type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocking status")).toBeInTheDocument();
    expect(screen.getByText("HTTP status code")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("Endpoint")).toBeInTheDocument();
    expect(screen.getByText("Hostname")).toBeInTheDocument();
    expect(screen.getByText("Parameter")).toBeInTheDocument();
    expect(screen.getByText("Last seen")).toBeInTheDocument();
    expect(screen.getByText("Response code")).toBeInTheDocument();
  });

  it("all fields are enabled and selectable", () => {
    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={vi.fn()}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    // No "Coming soon" labels
    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
  });

  it("calls onSelectField when clicking an enum field", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();

    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={onSelectField}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    await user.click(screen.getByText("Status"));
    expect(onSelectField).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "status",
        label: "Status",
        type: "enum",
      }),
    );
  });

  it("calls onSelectField when clicking a text field", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();

    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={onSelectField}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    await user.click(screen.getByText("Endpoint"));
    expect(onSelectField).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "endpoints",
        label: "Endpoint",
        type: "text",
      }),
    );
  });

  it("does not show group headings", () => {
    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={vi.fn()}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    expect(screen.queryByText("Attack characteristics")).not.toBeInTheDocument();
    expect(screen.queryByText("Target & Context")).not.toBeInTheDocument();
    expect(screen.queryByText("Temporal")).not.toBeInTheDocument();
  });

  it("Enter selects first highlighted field by default", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();

    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={onSelectField}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    // Enter selects first item (Attack type) without any arrow navigation
    await user.keyboard("{Enter}");
    expect(onSelectField).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "type",
        label: "Attack type",
      }),
    );
  });

  it("ArrowDown + Enter selects second field", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();

    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={onSelectField}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    // ArrowDown moves to Status (index 1), Enter selects
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelectField).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "status",
        label: "Status",
      }),
    );
  });

  it("ArrowUp wraps to last field", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();

    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={onSelectField}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    // ArrowUp from index 0 wraps to the last item in FILTER_FIELDS
    await user.keyboard("{ArrowUp}{Enter}");
    expect(onSelectField).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "response_code",
        label: "Response code",
      }),
    );
  });

  it("filters fields and resets highlight on search", () => {
    const onSelectField = vi.fn();

    const { rerender } = render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={onSelectField}
        search=""
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    // Search for "sta" should show Status, Blocking status, Started-related items
    rerender(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={onSelectField}
        search="sta"
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocking status")).toBeInTheDocument();
    // "Attack type" should be filtered out
    expect(screen.queryByText("Attack type")).not.toBeInTheDocument();
  });
});
