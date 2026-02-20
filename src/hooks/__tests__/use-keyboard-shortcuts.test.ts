import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";
import type { KeyboardShortcut } from "../use-keyboard-shortcuts";

function fireKey(
  key: string,
  options: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  it("calls handler when matching key is pressed", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("is case-insensitive for key matching", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "F", handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("matches shift modifier", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: "f", modifiers: { shift: true }, handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Without shift — should not fire
    fireKey("f");
    expect(handler).not.toHaveBeenCalled();

    // With shift — should fire
    fireKey("F", { shiftKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("matches meta modifier", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: "k", modifiers: { meta: true }, handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("k");
    expect(handler).not.toHaveBeenCalled();

    fireKey("k", { metaKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire when shortcut is disabled", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: "f", handler, enabled: false },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).not.toHaveBeenCalled();
  });

  it("fires when enabled is true", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: "f", handler, enabled: true },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire when an input element is focused", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("does not fire when a textarea is focused", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it("does not fire when a contenteditable element is focused", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    const div = document.createElement("div");
    div.contentEditable = "true";
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it("does not fire when a combobox role element is focused", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    const div = document.createElement("div");
    div.setAttribute("role", "combobox");
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKey("f");
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it("prevents default on matched shortcut", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = fireKey("f");
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not prevent default on unmatched key", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = fireKey("g");
    expect(event.defaultPrevented).toBe(false);
  });

  it("cleans up listener on unmount", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: "f", handler }];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));
    unmount();

    fireKey("f");
    expect(handler).not.toHaveBeenCalled();
  });
});
