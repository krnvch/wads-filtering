"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { FILTER_FIELDS } from "@/lib/filter-schema";
import type { FilterFieldDef } from "@/types/filters";
import type { RecentFilter } from "@/stores/filter-ui-store";
import {
  generateSuggestions,
  type FilterSuggestion,
} from "@/lib/filter-suggestions";

interface FilterPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectField: (field: FilterFieldDef) => void;
  onApplyRecent?: (recent: RecentFilter) => void;
  search: string;
  recentFilters?: RecentFilter[];
  children: React.ReactNode;
}

function filterFields(
  fields: FilterFieldDef[],
  search: string,
): FilterFieldDef[] {
  if (!search) return fields;
  const q = search.toLowerCase();
  return fields.filter(
    (f) =>
      f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q),
  );
}

function RecentLabel({ recent }: { recent: RecentFilter }) {
  return (
    <span className="truncate">
      {recent.fieldLabel}{" "}
      <span className="text-muted-foreground">{recent.operatorLabel}</span>{" "}
      <span className="text-blue-600 dark:text-blue-400">{recent.values.join(", ")}</span>
    </span>
  );
}

function SuggestionLabel({ suggestion }: { suggestion: FilterSuggestion }) {
  return (
    <span className="truncate">
      {suggestion.fieldLabel}{" "}
      <span className="text-muted-foreground">{suggestion.operatorLabel}</span>{" "}
      <span className="text-blue-600 dark:text-blue-400">{suggestion.values.join(", ")}</span>
    </span>
  );
}

/** Stable content-based ID for recent items (avoids index-based key issues with cmdk) */
function recentItemId(r: RecentFilter): string {
  return `recent:${r.field}|${r.operator}|${r.values.join(",")}`;
}

/** Each palette row is a recent filter, a suggestion, or a field def */
type PaletteItem =
  | { kind: "recent"; recent: RecentFilter; id: string }
  | { kind: "suggestion"; suggestion: FilterSuggestion; id: string }
  | { kind: "field"; field: FilterFieldDef; id: string };

export function FilterPalette({
  open,
  onOpenChange,
  onSelectField,
  onApplyRecent,
  search,
  recentFilters = [],
  children,
}: FilterPaletteProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredFields = useMemo(
    () => filterFields(FILTER_FIELDS, search),
    [search],
  );

  type RecentPaletteItem = Extract<PaletteItem, { kind: "recent" }>;
  type SuggestionPaletteItem = Extract<PaletteItem, { kind: "suggestion" }>;
  type FieldPaletteItem = Extract<PaletteItem, { kind: "field" }>;

  // Build recent items only when not searching
  const recentItems = useMemo((): RecentPaletteItem[] => {
    if (search) return [];
    return recentFilters.map((r) => ({
      kind: "recent" as const,
      recent: r,
      id: recentItemId(r),
    }));
  }, [recentFilters, search]);

  // Build suggestion items only when searching
  const suggestionItems = useMemo((): SuggestionPaletteItem[] => {
    if (!search) return [];
    return generateSuggestions(filteredFields, search).map((s) => ({
      kind: "suggestion" as const,
      suggestion: s,
      id: `suggestion:${s.field}|${s.operator}|${s.values.join(",")}`.toLowerCase(),
    }));
  }, [filteredFields, search]);

  const fieldItems = useMemo((): FieldPaletteItem[] => {
    return filteredFields.map((f) => ({
      kind: "field" as const,
      field: f,
      id: f.key,
    }));
  }, [filteredFields]);

  // Combined flat list for keyboard navigation
  const allItems = useMemo(
    () => [...recentItems, ...suggestionItems, ...fieldItems],
    [recentItems, suggestionItems, fieldItems],
  );

  const hasResults = allItems.length > 0;

  // Derive Command value from highlighted index for visual sync
  const highlightedValue = allItems[highlightedIndex]?.id ?? "";

  // Reset highlight when search changes or palette opens
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, open]);

  // Sync highlight when user hovers over items (cmdk onValueChange)
  const handleValueChange = useCallback(
    (val: string) => {
      const idx = allItems.findIndex((item) => item.id === val);
      if (idx >= 0) setHighlightedIndex(idx);
    },
    [allItems],
  );

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      if (item.kind === "recent" && onApplyRecent) {
        onApplyRecent(item.recent);
      } else if (item.kind === "suggestion" && onApplyRecent) {
        onApplyRecent({ ...item.suggestion, usedAt: Date.now() });
      } else if (item.kind === "field") {
        onSelectField(item.field);
      }
    },
    [onSelectField, onApplyRecent],
  );

  // Keyboard navigation via document listener
  useEffect(() => {
    if (!open || allItems.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % allItems.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            (prev - 1 + allItems.length) % allItems.length,
          );
          break;
        case "Enter":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            const item = allItems[highlightedIndex];
            if (item) handleSelect(item);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, allItems, highlightedIndex, handleSelect]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const highlighted = listRef.current.querySelector(
      `[data-value="${highlightedValue}"]`,
    );
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedValue]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        className="w-auto min-w-64 p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          // Keep focus in the filter bar input
          e.preventDefault();
        }}
      >
        <Command
          shouldFilter={false}
          value={highlightedValue}
          onValueChange={handleValueChange}
        >
          <CommandList ref={listRef}>
            {!hasResults && <CommandEmpty>No fields found.</CommandEmpty>}
            {recentItems.length > 0 && (
              <>
                <CommandGroup heading="Recent">
                  {recentItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                    >
                      <RecentLabel recent={item.recent} />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {suggestionItems.length > 0 && (
              <>
                <CommandGroup heading="Suggestions">
                  {suggestionItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                    >
                      <SuggestionLabel suggestion={item.suggestion} />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup>
              {fieldItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item)}
                >
                  {item.field.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
