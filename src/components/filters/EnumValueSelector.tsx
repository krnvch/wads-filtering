"use client";

import { useCallback, useEffect } from "react";
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
  onConfirm: () => void;
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

  const toggleValue = useCallback(
    (value: string) => {
      const next = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onSelectionChange(next);
    },
    [selectedValues, onSelectionChange],
  );

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onConfirm]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-56 p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col" role="listbox" aria-label={`Select ${fieldDef.label} values`}>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {values.map((value) => {
              const checked = selectedValues.includes(value);
              return (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent",
                    checked && "bg-accent/50",
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
              ⌘ ↵ to select multiple
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
