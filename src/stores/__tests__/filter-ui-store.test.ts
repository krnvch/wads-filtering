import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFilterUIStore } from "../filter-ui-store";
import type { RecentFilter } from "../filter-ui-store";
import type { FilterFieldDef } from "@/types/filters";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const mockField: FilterFieldDef = {
  key: "status",
  label: "Status",
  category: "Attack characteristics",
  type: "enum",
  values: ["Blocked", "Monitored", "Started"],
};

function makeRecent(overrides: Partial<RecentFilter> = {}): RecentFilter {
  return {
    field: "status",
    fieldLabel: "Status",
    operator: "is",
    operatorLabel: "is",
    values: ["Blocked"],
    usedAt: Date.now(),
    ...overrides,
  };
}

describe("useFilterUIStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useFilterUIStore.getState().reset();
    useFilterUIStore.getState().clearRecentFilters();
  });

  it("starts with palette closed", () => {
    expect(useFilterUIStore.getState().paletteOpen).toBe(false);
  });

  it("opens and closes palette", () => {
    useFilterUIStore.getState().openPalette();
    expect(useFilterUIStore.getState().paletteOpen).toBe(true);

    useFilterUIStore.getState().closePalette();
    expect(useFilterUIStore.getState().paletteOpen).toBe(false);
  });

  it("closing palette clears pending state", () => {
    useFilterUIStore.getState().openPalette();
    useFilterUIStore.getState().setPendingField(mockField);
    useFilterUIStore.getState().setPendingValues(["Blocked"]);

    useFilterUIStore.getState().closePalette();
    expect(useFilterUIStore.getState().pendingField).toBeNull();
    expect(useFilterUIStore.getState().pendingValues).toEqual([]);
  });

  it("tracks focused token index", () => {
    useFilterUIStore.getState().setFocusedTokenIndex(3);
    expect(useFilterUIStore.getState().focusedTokenIndex).toBe(3);

    useFilterUIStore.getState().setFocusedTokenIndex(null);
    expect(useFilterUIStore.getState().focusedTokenIndex).toBeNull();
  });

  it("adds and deduplicates recent filters", () => {
    const recent = makeRecent();
    useFilterUIStore.getState().addRecentFilter(recent);
    expect(useFilterUIStore.getState().recentFilters).toHaveLength(1);
    expect(useFilterUIStore.getState().recentFilters[0].field).toBe("status");

    // Adding same field+operator+values again should deduplicate
    useFilterUIStore.getState().addRecentFilter(recent);
    expect(useFilterUIStore.getState().recentFilters).toHaveLength(1);
  });

  it("keeps different values as separate entries", () => {
    useFilterUIStore.getState().addRecentFilter(makeRecent({ values: ["Blocked"] }));
    useFilterUIStore.getState().addRecentFilter(makeRecent({ values: ["Monitored"] }));
    expect(useFilterUIStore.getState().recentFilters).toHaveLength(2);
  });

  it("limits recent filters to 3", () => {
    const fields = ["status", "type", "impact", "host"];
    for (const key of fields) {
      useFilterUIStore.getState().addRecentFilter(
        makeRecent({ field: key, fieldLabel: key }),
      );
    }
    expect(useFilterUIStore.getState().recentFilters).toHaveLength(3);
  });

  it("clears recent filters", () => {
    useFilterUIStore.getState().addRecentFilter(makeRecent());
    useFilterUIStore.getState().clearRecentFilters();
    expect(useFilterUIStore.getState().recentFilters).toHaveLength(0);
  });

  it("persists recent filters to localStorage", () => {
    useFilterUIStore.getState().addRecentFilter(makeRecent());
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});
