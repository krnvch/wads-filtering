import { create } from "zustand";
import type { FilterFieldDef } from "@/types/filters";
import type { TokenFilterOperator } from "@/types/tokens";

export interface RecentFilter {
  field: string;
  fieldLabel: string;
  operator: TokenFilterOperator;
  operatorLabel: string;
  values: string[];
  usedAt: number; // timestamp
}

const MAX_RECENT_FILTERS = 3;
const RECENT_FILTERS_KEY = "wads-filter-recent";

const DEFAULT_RECENT_FILTERS: RecentFilter[] = [
  { field: "status", fieldLabel: "Status", operator: "is", operatorLabel: "is", values: ["Blocked"], usedAt: Date.now() - 60_000 },
  { field: "timeline.last_seen", fieldLabel: "Last seen", operator: "in_the_last", operatorLabel: "in the last", values: ["7d"], usedAt: Date.now() - 120_000 },
  { field: "impact", fieldLabel: "Impact", operator: "is", operatorLabel: "is", values: ["High"], usedAt: Date.now() - 180_000 },
];

function isValidRecentFilter(r: unknown): r is RecentFilter {
  if (typeof r !== "object" || r === null) return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.field === "string" && obj.field.length > 0 &&
    typeof obj.fieldLabel === "string" && obj.fieldLabel.length > 0 &&
    typeof obj.operator === "string" && obj.operator.length > 0 &&
    typeof obj.operatorLabel === "string" && obj.operatorLabel.length > 0 &&
    Array.isArray(obj.values) && obj.values.length > 0
  );
}

function loadRecentFilters(): RecentFilter[] {
  if (typeof window === "undefined") return DEFAULT_RECENT_FILTERS;
  try {
    const stored = localStorage.getItem(RECENT_FILTERS_KEY);
    if (!stored) return DEFAULT_RECENT_FILTERS;
    const parsed = JSON.parse(stored) as unknown[];
    const valid = parsed.filter(isValidRecentFilter);
    if (valid.length === 0) {
      // Corrupted data — reset to defaults and rewrite localStorage
      saveRecentFilters(DEFAULT_RECENT_FILTERS);
      return DEFAULT_RECENT_FILTERS;
    }
    const result = valid.slice(0, MAX_RECENT_FILTERS);
    // Rewrite if invalid entries were filtered out (self-heal)
    if (valid.length < parsed.length) saveRecentFilters(result);
    return result;
  } catch {
    return DEFAULT_RECENT_FILTERS;
  }
}

function saveRecentFilters(filters: RecentFilter[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Silently fail if localStorage is full
  }
}

/** Build a dedup key so the same field+operator+values combo is treated as one entry */
function recentKey(r: RecentFilter): string {
  return `${r.field}|${r.operator}|${r.values.join(",")}`;
}

interface FilterUIState {
  paletteOpen: boolean;
  pendingField: FilterFieldDef | null;
  pendingValues: string[];
  focusedTokenIndex: number | null;
  recentFilters: RecentFilter[];
}

interface FilterUIActions {
  openPalette: () => void;
  closePalette: () => void;
  setPendingField: (field: FilterFieldDef | null) => void;
  setPendingValues: (values: string[]) => void;
  setFocusedTokenIndex: (index: number | null) => void;
  addRecentFilter: (filter: RecentFilter) => void;
  clearRecentFilters: () => void;
  reset: () => void;
}

export type FilterUIStore = FilterUIState & FilterUIActions;

const initialState: FilterUIState = {
  paletteOpen: false,
  pendingField: null,
  pendingValues: [],
  focusedTokenIndex: null,
  recentFilters: [],
};

export const useFilterUIStore = create<FilterUIStore>((set) => ({
  ...initialState,
  recentFilters: loadRecentFilters(),

  openPalette: () => set({ paletteOpen: true }),
  closePalette: () =>
    set({ paletteOpen: false, pendingField: null, pendingValues: [] }),

  setPendingField: (field) => set({ pendingField: field, pendingValues: [] }),
  setPendingValues: (values) => set({ pendingValues: values }),

  setFocusedTokenIndex: (index) => set({ focusedTokenIndex: index }),

  addRecentFilter: (filter) =>
    set((state) => {
      const key = recentKey(filter);
      const filtered = state.recentFilters.filter(
        (r) => recentKey(r) !== key,
      );
      const updated = [filter, ...filtered].slice(0, MAX_RECENT_FILTERS);
      saveRecentFilters(updated);
      return { recentFilters: updated };
    }),

  clearRecentFilters: () => {
    saveRecentFilters([]);
    set({ recentFilters: [] });
  },

  reset: () => {
    set({ ...initialState, recentFilters: loadRecentFilters() });
  },
}));
