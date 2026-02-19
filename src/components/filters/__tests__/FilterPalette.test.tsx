import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPalette } from "../FilterPalette";
import type { FilterFieldDef } from "@/types/filters";

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

    // Target & Context fields (disabled)
    expect(screen.getByText("Endpoint")).toBeInTheDocument();
    expect(screen.getByText("Hostname")).toBeInTheDocument();
    expect(screen.getByText("Parameter")).toBeInTheDocument();
  });

  it("shows 'Coming soon' on text fields", () => {
    render(
      <FilterPalette
        open={true}
        onOpenChange={vi.fn()}
        onSelectField={vi.fn()}
      >
        <button>trigger</button>
      </FilterPalette>,
    );

    const comingSoonLabels = screen.getAllByText("Coming soon");
    expect(comingSoonLabels).toHaveLength(3);
  });

  it("calls onSelectField when clicking an enabled field", async () => {
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

  it("does not call onSelectField for disabled fields", async () => {
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
    expect(onSelectField).not.toHaveBeenCalled();
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
