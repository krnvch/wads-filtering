import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextValueInput } from "../TextValueInput";
import type { FilterFieldDef } from "@/types/filters";

const endpointField: FilterFieldDef = {
  key: "endpoints",
  label: "Endpoint",
  category: "Target & Context",
  type: "text",
};

const suggestions = [
  "GET /v1/api/search",
  "POST /v1/auth/login",
  "GET /v1/api/orders/{id}",
  "GET /v1/catalog",
  "POST /v1/upload",
];

describe("TextValueInput", () => {
  it("renders trigger children", () => {
    render(
      <TextValueInput
        open={false}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={[]}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn()}
      >
        <button>Add endpoint</button>
      </TextValueInput>,
    );

    expect(screen.getByText("Add endpoint")).toBeInTheDocument();
  });

  it("shows input field when open", () => {
    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={[]}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    expect(screen.getByLabelText("Enter Endpoint value")).toBeInTheDocument();
  });

  it("shows selected values as badges", () => {
    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={["GET /v1/api/search", "POST /v1/auth/login"]}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    expect(screen.getByText("GET /v1/api/search")).toBeInTheDocument();
    expect(screen.getByText("POST /v1/auth/login")).toBeInTheDocument();
  });

  it("adds typed text as value on Enter", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    const input = screen.getByLabelText("Enter Endpoint value");
    await user.type(input, "api/users{Enter}");

    expect(onSelectionChange).toHaveBeenCalledWith(["api/users"]);
  });

  it("calls onConfirm on Cmd+Enter", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={["existing"]}
        onSelectionChange={vi.fn()}
        onConfirm={onConfirm}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    const input = screen.getByLabelText("Enter Endpoint value");
    await user.click(input);
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    expect(onConfirm).toHaveBeenCalled();
  });

  it("filters suggestions by input text", async () => {
    const user = userEvent.setup();

    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={[]}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn()}
        suggestions={suggestions}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    const input = screen.getByLabelText("Enter Endpoint value");
    await user.type(input, "auth");

    // Should show the auth-related suggestion
    expect(screen.getByText("POST /v1/auth/login")).toBeInTheDocument();
    // Should not show non-matching ones
    expect(screen.queryByText("GET /v1/catalog")).not.toBeInTheDocument();
  });

  it("adds suggestion to values when clicked", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={vi.fn()}
        suggestions={suggestions}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    const input = screen.getByLabelText("Enter Endpoint value");
    await user.type(input, "catalog");

    await user.click(screen.getByText("GET /v1/catalog"));

    expect(onSelectionChange).toHaveBeenCalledWith(["GET /v1/catalog"]);
  });

  it("removes value when badge × is clicked", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={["GET /v1/api/search", "POST /v1/auth/login"]}
        onSelectionChange={onSelectionChange}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    await user.click(screen.getByLabelText("Remove GET /v1/api/search"));

    expect(onSelectionChange).toHaveBeenCalledWith(["POST /v1/auth/login"]);
  });

  it("does not add duplicate values", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <TextValueInput
        open={true}
        onOpenChange={vi.fn()}
        fieldDef={endpointField}
        selectedValues={["existing"]}
        onSelectionChange={onSelectionChange}
        onConfirm={vi.fn()}
      >
        <button>trigger</button>
      </TextValueInput>,
    );

    const input = screen.getByLabelText("Enter Endpoint value");
    await user.type(input, "existing{Enter}");

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
