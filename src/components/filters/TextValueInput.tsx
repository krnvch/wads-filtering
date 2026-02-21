"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { FilterFieldDef } from "@/types/filters";
import { cn } from "@/lib/utils";

interface TextValueInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldDef: FilterFieldDef;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onConfirm: (overrideValues?: string[]) => void;
  suggestions?: string[];
  children: React.ReactNode;
}

export function TextValueInput({
  open,
  onOpenChange,
  fieldDef,
  selectedValues,
  onSelectionChange,
  onConfirm,
  suggestions = [],
  children,
}: TextValueInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const lower = inputValue.toLowerCase();
    return suggestions.filter(
      (s) =>
        s.toLowerCase().includes(lower) && !selectedValues.includes(s),
    );
  }, [inputValue, suggestions, selectedValues]);

  const addValue = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !selectedValues.includes(trimmed)) {
        onSelectionChange([...selectedValues, trimmed]);
      }
      setInputValue("");
    },
    [selectedValues, onSelectionChange],
  );

  const removeValue = useCallback(
    (value: string) => {
      onSelectionChange(selectedValues.filter((v) => v !== value));
    },
    [selectedValues, onSelectionChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const newValues = inputValue.trim()
          ? [...selectedValues.filter((v) => v !== inputValue.trim()), inputValue.trim()]
          : selectedValues;
        if (inputValue.trim()) {
          addValue(inputValue);
        }
        onConfirm(newValues);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (inputValue.trim()) {
          addValue(inputValue);
        }
      }

      if (
        e.key === "Backspace" &&
        inputValue === "" &&
        selectedValues.length > 0
      ) {
        onSelectionChange(selectedValues.slice(0, -1));
      }
    },
    [inputValue, addValue, onConfirm, selectedValues, onSelectionChange],
  );

  useEffect(() => {
    if (open) {
      setInputValue("");
      // Focus input after popover opens
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {/* Selected values as removable badges */}
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b px-3 py-2">
              {selectedValues.map((value) => (
                <Badge
                  key={value}
                  variant="secondary"
                  className="gap-1 text-xs"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => removeValue(value)}
                    aria-label={`Remove ${value}`}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Text input */}
          <div className="px-3 py-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type ${fieldDef.label.toLowerCase()}...`}
              className="h-8 text-sm"
              aria-label={`Enter ${fieldDef.label} value`}
            />
          </div>

          {/* Filtered suggestions */}
          {filteredSuggestions.length > 0 && (
            <div
              className="max-h-[160px] overflow-y-auto border-t py-1"
              role="listbox"
              aria-label={`${fieldDef.label} suggestions`}
            >
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => addValue(suggestion)}
                  role="option"
                  aria-selected={false}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Keyboard hint */}
          <div className="border-t px-3 py-2">
            <span className="text-xs text-muted-foreground">
              ↵ to add &middot; ⌘ ↵ to apply
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
