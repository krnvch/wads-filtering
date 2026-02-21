"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { FilterFieldDef } from "@/types/filters";
import { cn } from "@/lib/utils";

interface EnumValueSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldDef: FilterFieldDef;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onConfirm: (overrideValues?: string[]) => void;
  children: React.ReactNode;
}

export function EnumValueSelector({
  open,
  onOpenChange,
  fieldDef,
  selectedValues,
  onSelectionChange,
  onConfirm,
  children,
}: EnumValueSelectorProps) {
  const values = fieldDef.values ?? [];
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const toggleValue = useCallback(
    (value: string) => {
      const next = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onSelectionChange(next);
    },
    [selectedValues, onSelectionChange],
  );

  // Reset focused index when opened
  useEffect(() => {
    if (open) {
      setFocusedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || values.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, values.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter": {
          e.preventDefault();
          const focusedValue = values[focusedIndex];
          if (focusedValue === undefined) break;

          // Compute new selection
          const isSelected = selectedValues.includes(focusedValue);
          const newValues = isSelected
            ? selectedValues.filter((v) => v !== focusedValue)
            : [...selectedValues, focusedValue];

          onSelectionChange(newValues);

          if (!e.metaKey && !e.ctrlKey) {
            // Enter: toggle + apply (pass override values to bypass stale closure)
            onConfirm(newValues);
          }
          // Cmd+Enter: just toggle, keep open for multi-select
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, values, focusedIndex, selectedValues, onSelectionChange, onConfirm]);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const focused = listRef.current.querySelector(
      `[data-enum-index="${focusedIndex}"]`,
    );
    focused?.scrollIntoView({ block: "nearest" });
  }, [open, focusedIndex]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-56 p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className="flex flex-col"
          role="listbox"
          aria-label={`Select ${fieldDef.label} values`}
        >
          <div ref={listRef} className="max-h-[240px] overflow-y-auto py-1">
            {values.map((value, index) => {
              const checked = selectedValues.includes(value);
              const isFocused = index === focusedIndex;
              return (
                <label
                  key={value}
                  data-enum-index={index}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
                    isFocused
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent",
                    checked && !isFocused && "bg-accent/50",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleValue(value)}
                    aria-label={value}
                  />
                  <span>{value}</span>
                </label>
              );
            })}
          </div>
          <div className="border-t px-3 py-2">
            <span className="text-xs text-muted-foreground">
              ↵ apply &middot; ⌘ ↵ select more
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
