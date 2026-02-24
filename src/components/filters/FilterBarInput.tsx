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
      onOpenPalette,
      hasFilters,
      placeholder = "Filter...",
      className,
      ...rest
    },
    ref,
  ) {

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
