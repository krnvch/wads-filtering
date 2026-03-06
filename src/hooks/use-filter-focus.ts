"use client";

import { useCallback, useRef } from "react";

export interface UseFilterFocusReturn {
  focusAfterRemove: (removedId: string) => void;
  focusAfterAdd: () => void;
  focusAfterClearAll: () => void;
}

function getFilterChips(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-filter-id]"));
}

function focusPaletteTrigger(): void {
  const trigger = document.querySelector<HTMLElement>(
    "[data-filter-palette-trigger]",
  );
  trigger?.focus();
}

export function useFilterFocus(): UseFilterFocusReturn {
  const chipOrderRef = useRef<string[]>([]);

  const focusAfterRemove = useCallback((removedId: string) => {
    // Snapshot current chip order before React re-renders
    const chips = getFilterChips();
    chipOrderRef.current = chips.map(
      (el) => el.getAttribute("data-filter-id")!,
    );

    requestAnimationFrame(() => {
      const prevOrder = chipOrderRef.current;
      const removedIndex = prevOrder.indexOf(removedId);

      const remainingChips = getFilterChips();

      if (remainingChips.length === 0) {
        focusPaletteTrigger();
        return;
      }

      // Try to focus the chip that took the removed one's position (next chip)
      if (removedIndex >= 0 && removedIndex < remainingChips.length) {
        remainingChips[removedIndex].focus();
        return;
      }

      // Otherwise focus the last remaining chip (previous)
      remainingChips[remainingChips.length - 1].focus();
    });
  }, []);

  const focusAfterAdd = useCallback(() => {
    requestAnimationFrame(() => {
      focusPaletteTrigger();
    });
  }, []);

  const focusAfterClearAll = useCallback(() => {
    requestAnimationFrame(() => {
      focusPaletteTrigger();
    });
  }, []);

  return { focusAfterRemove, focusAfterAdd, focusAfterClearAll };
}
