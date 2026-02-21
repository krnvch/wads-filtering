"use client";

import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface FilterBarInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onType" | "value" | "onChange" | "type"
  > {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onInsertParen: (type: "open_paren" | "close_paren") => void;
  onOpenPalette: () => void;
  hasFilters: boolean;
  placeholder?: string;
  className?: string;
}

export const FilterBarInput = forwardRef<HTMLInputElement, FilterBarInputProps>(
  function FilterBarInput(
    {
      searchValue,
      onSearchChange,
      onInsertParen,
      onOpenPalette,
      hasFilters,
      placeholder = "Filter...",
      className,
      ...rest
    },
    ref,
  ) {
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const key = e.key;

        if (key === "(") {
          e.preventDefault();
          onInsertParen("open_paren");
          return;
        }

        if (key === ")") {
          e.preventDefault();
          onInsertParen("close_paren");
          return;
        }

        if (key === "Escape") {
          // Let Popover handle Escape — don't prevent
          return;
        }
      },
      [onInsertParen],
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onSearchChange(val);
        // Open palette on any typing
        if (val.length > 0) {
          onOpenPalette();
        }
      },
      [onSearchChange, onOpenPalette],
    );

    const handleClick = useCallback(() => {
      onOpenPalette();
    }, [onOpenPalette]);

    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        value={searchValue}
        onChange={handleChange}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-w-[80px] flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
          className,
        )}
        placeholder={placeholder}
        aria-label="Add filter"
        data-filter-bar-input
        data-filter-palette-trigger
      />
    );
  },
);
