import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPalette } from "../FilterPalette";

describe("FilterPalette", () => {
  it("renders field groups when open", () => {
    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={vi.fn()}
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    // Attack characteristics fields
    expect(screen.getByText("Attack type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Blocking status")).toBeInTheDocument();
    expect(screen.getByText("HTTP status code")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();

    // Target & Context fields
    expect(screen.getByText("Endpoint")).toBeInTheDocument();
    expect(screen.getByText("Hostname")).toBeInTheDocument();
    expect(screen.getByText("Parameter")).toBeInTheDocument();
  });

  it("all fields are enabled and selectable", () => {
    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={vi.fn()}
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

  it("shows group headings", () => {
    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={vi.fn()}
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    expect(screen.getByText("Attack characteristics")).toBeInTheDocument();
    expect(screen.getByText("Target & Context")).toBeInTheDocument();
  });
});
