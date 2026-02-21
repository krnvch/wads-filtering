"use client";

import { useState, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import type { TokenFilterOperator } from "@/types/tokens";
import { cn } from "@/lib/utils";

interface DateValueSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: TokenFilterOperator;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onConfirm: (overrideValues?: string[]) => void;
  children: React.ReactNode;
}

const PRESETS = [
  { label: "Last 24h", value: "24h" },
  { label: "Last 7d", value: "7d" },
  { label: "Last 14d", value: "14d" },
  { label: "Last 30d", value: "30d" },
];

function isRelativeOperator(op: TokenFilterOperator): boolean {
  return op === "in_the_last" || op === "not_in_the_last";
}

function isRangeOperator(op: TokenFilterOperator): boolean {
  return op === "between_dates";
}

export function DateValueSelector({
  open,
  onOpenChange,
  operator,
  selectedValues,
  onSelectionChange,
  onConfirm,
  children,
}: DateValueSelectorProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const handlePresetSelect = useCallback(
    (preset: string) => {
      onSelectionChange([preset]);
      onConfirm([preset]);
    },
    [onSelectionChange, onConfirm],
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const iso = date.toISOString().split("T")[0];

      if (isRangeOperator(operator)) {
        if (selectedValues.length === 0) {
          onSelectionChange([iso]);
        } else if (selectedValues.length === 1) {
          const start = selectedValues[0];
          const range =
            new Date(iso) < new Date(start) ? [iso, start] : [start, iso];
          onSelectionChange(range);
          onConfirm(range);
        } else {
          onSelectionChange([iso]);
        }
      } else {
        onSelectionChange([iso]);
        onConfirm([iso]);
      }
    },
    [operator, selectedValues, onSelectionChange, onConfirm],
  );

  const selectedDate = selectedValues[0]
    ? new Date(selectedValues[0])
    : undefined;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {isRelativeOperator(operator) ? (
          <div className="flex flex-col py-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={cn(
                  "px-4 py-2 text-left text-sm hover:bg-accent",
                  selectedValues[0] === preset.value && "bg-accent/50",
                )}
                onClick={() => handlePresetSelect(preset.value)}
              >
                {preset.label}
              </button>
            ))}
            <Separator />
            <button
              type="button"
              className="px-4 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {showCalendar ? "Hide calendar" : "Custom date..."}
            </button>
            {showCalendar && (
              <div className="border-t p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                />
              </div>
            )}
          </div>
        ) : isRangeOperator(operator) ? (
          <div className="p-2">
            <Label className="mb-2 block text-xs text-muted-foreground">
              {selectedValues.length === 0
                ? "Select start date"
                : selectedValues.length === 1
                  ? "Select end date"
                  : "Range selected"}
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
            />
            {selectedValues.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {selectedValues.join(" to ")}
              </div>
            )}
          </div>
        ) : (
          <div className="p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
