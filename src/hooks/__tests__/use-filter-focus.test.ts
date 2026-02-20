import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilterFocus } from "../use-filter-focus";

function createChip(id: string): HTMLElement {
  const el = document.createElement("span");
  el.setAttribute("data-filter-id", id);
  el.tabIndex = 0;
  el.focus = vi.fn();
  document.body.appendChild(el);
  return el;
}

function createPaletteTrigger(): HTMLElement {
  const el = document.createElement("button");
  el.setAttribute("data-filter-palette-trigger", "");
  el.focus = vi.fn();
  document.body.appendChild(el);
  return el;
}

function cleanup() {
  document
    .querySelectorAll("[data-filter-id], [data-filter-palette-trigger]")
    .forEach((el) => el.remove());
}

describe("useFilterFocus", () => {
  afterEach(cleanup);

  it("focuses next chip after removing a chip", async () => {
    const chip1 = createChip("c1");
    const chip2 = createChip("c2");
    const chip3 = createChip("c3");

    const { result } = renderHook(() => useFilterFocus());

    // Call focusAfterRemove while c2 still exists in DOM
    act(() => {
      result.current.focusAfterRemove("c2");
    });

    // Simulate React removing the chip before rAF fires
    chip2.remove();

    // Flush rAF
    await vi.waitFor(() => {
      // After c2 is removed, remaining chips are [c1, c3]
      // removedIndex was 1, so focus remainingChips[1] = c3
      expect(chip3.focus).toHaveBeenCalled();
    });
  });

  it("focuses previous chip when last chip is removed", async () => {
    const chip1 = createChip("c1");
    const chip2 = createChip("c2");

    const { result } = renderHook(() => useFilterFocus());

    act(() => {
      result.current.focusAfterRemove("c2");
    });

    chip2.remove();

    await vi.waitFor(() => {
      expect(chip1.focus).toHaveBeenCalled();
    });
  });

  it("focuses palette trigger when only chip is removed", async () => {
    const chip1 = createChip("c1");
    const trigger = createPaletteTrigger();

    const { result } = renderHook(() => useFilterFocus());

    act(() => {
      result.current.focusAfterRemove("c1");
    });

    chip1.remove();

    await vi.waitFor(() => {
      expect(trigger.focus).toHaveBeenCalled();
    });
  });

  it("focusAfterAdd focuses palette trigger", async () => {
    const trigger = createPaletteTrigger();

    const { result } = renderHook(() => useFilterFocus());

    act(() => {
      result.current.focusAfterAdd();
    });

    await vi.waitFor(() => {
      expect(trigger.focus).toHaveBeenCalled();
    });
  });

  it("focusAfterClearAll focuses palette trigger", async () => {
    const trigger = createPaletteTrigger();

    const { result } = renderHook(() => useFilterFocus());

    act(() => {
      result.current.focusAfterClearAll();
    });

    await vi.waitFor(() => {
      expect(trigger.focus).toHaveBeenCalled();
    });
  });

  it("focuses first chip when first chip removed from middle", async () => {
    const chip1 = createChip("c1");
    const chip2 = createChip("c2");
    const chip3 = createChip("c3");

    const { result } = renderHook(() => useFilterFocus());

    act(() => {
      result.current.focusAfterRemove("c1");
    });

    chip1.remove();

    await vi.waitFor(() => {
      // removedIndex was 0, remaining [c2, c3], focus remainingChips[0] = c2
      expect(chip2.focus).toHaveBeenCalled();
    });
  });
});
