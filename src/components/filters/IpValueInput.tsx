"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FilterFieldDef } from "@/types/filters";
import {
  isValidIpValue,
  isAllowedIpChar,
  shouldAcceptSlash,
  shouldAcceptDot,
  filterMatchingIps,
  computeCidrSuggestions,
} from "@/lib/ip-utils";
import { cn } from "@/lib/utils";
import { OPERATOR_LABELS } from "@/types/tokens";
import type { TokenFilterOperator } from "@/types/tokens";

interface IpValueInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldDef: FilterFieldDef;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onConfirm: (overrideValues?: string[]) => void;
  datasetIps?: string[];
  children: React.ReactNode;
  /** "inline" renders [Field][Op][Input] with dropdown. "popover" wraps children in a Popover. */
  variant?: "inline" | "popover";
  /** Operator to display in inline variant */
  operator?: TokenFilterOperator;
  /** Callback when operator is toggled in inline variant */
  onOperatorChange?: (op: TokenFilterOperator) => void;
}

function getValidationError(value: string): string | null {
  if (isValidIpValue(value)) return null;
  if (value.includes("/")) {
    const slash = value.indexOf("/");
    const prefix = value.slice(slash + 1);
    const n = parseInt(prefix, 10);
    if (isNaN(n) || n < 0 || n > 32) return "CIDR prefix must be 0-32";
    return "Invalid CIDR notation";
  }
  const parts = value.split(".");
  if (parts.length !== 4) return "Incomplete IP address";
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return `Invalid octet: ${part}`;
  }
  return "Invalid IP address";
}

/** Shared suggestions dropdown content */
function SuggestionsContent({
  matchingIps,
  cidrSuggestions,
  focusedIndex,
  onSelect,
}: {
  matchingIps: string[];
  cidrSuggestions: string[];
  focusedIndex: number;
  onSelect: (value: string) => void;
}) {
  if (matchingIps.length === 0 && cidrSuggestions.length === 0) return null;

  return (
    <div className="flex flex-col">
      {/* Matching IPs section */}
      {matchingIps.length > 0 && (
        <div
          className="max-h-[120px] overflow-y-auto py-1"
          role="listbox"
          aria-label="Matching IPs"
        >
          {matchingIps.map((ip, index) => (
            <button
              key={ip}
              type="button"
              className={cn(
                "w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-accent",
                focusedIndex === index && "bg-accent",
              )}
              onClick={() => onSelect(ip)}
              role="option"
              aria-selected={focusedIndex === index}
            >
              {ip}
            </button>
          ))}
        </div>
      )}

      {/* Separator between sections */}
      {matchingIps.length > 0 && cidrSuggestions.length > 0 && <Separator />}

      {/* CIDR suggestion section */}
      {cidrSuggestions.length > 0 && (
        <div className="py-1" role="listbox" aria-label="CIDR suggestions">
          <div className="px-3 py-1 text-xs text-muted-foreground">
            CIDR range
          </div>
          {cidrSuggestions.map((cidr, index) => {
            const globalIndex = matchingIps.length + index;
            return (
              <button
                key={cidr}
                type="button"
                className={cn(
                  "w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-accent",
                  focusedIndex === globalIndex && "bg-accent",
                )}
                onClick={() => onSelect(cidr)}
                role="option"
                aria-selected={focusedIndex === globalIndex}
              >
                {cidr}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Selected value badges with validation */
function SelectedValueBadges({
  values,
  onRemove,
}: {
  values: string[];
  onRemove: (value: string) => void;
}) {
  if (values.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      {values.map((value) => {
        const error = getValidationError(value);
        const badge = (
          <Badge
            key={value}
            variant={error ? "destructive" : "secondary"}
            className="gap-1 text-xs"
          >
            {value}
            <button
              type="button"
              onClick={() => onRemove(value)}
              aria-label={`Remove ${value}`}
              className="ml-0.5 hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </Badge>
        );

        if (error) {
          return (
            <Tooltip key={value}>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent>{error}</TooltipContent>
            </Tooltip>
          );
        }

        return badge;
      })}
    </TooltipProvider>
  );
}

export function IpValueInput({
  open,
  onOpenChange,
  fieldDef,
  selectedValues,
  onSelectionChange,
  onConfirm,
  datasetIps = [],
  children,
  variant = "popover",
  operator = "in",
  onOperatorChange,
}: IpValueInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchingIps = useMemo(() => {
    return filterMatchingIps(datasetIps, inputValue)
      .filter((ip) => !selectedValues.includes(ip))
      .slice(0, 10);
  }, [datasetIps, inputValue, selectedValues]);

  const cidrSuggestions = useMemo(() => {
    return computeCidrSuggestions(inputValue).filter(
      (cidr) => !selectedValues.includes(cidr),
    );
  }, [inputValue, selectedValues]);

  const allSuggestions = useMemo(
    () => [...matchingIps, ...cidrSuggestions],
    [matchingIps, cidrSuggestions],
  );

  const hasSuggestions = allSuggestions.length > 0;

  const commitCurrentValue = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!selectedValues.includes(trimmed)) {
      onSelectionChange([...selectedValues, trimmed]);
    }
    setInputValue("");
    setFocusedIndex(-1);
  }, [inputValue, selectedValues, onSelectionChange]);

  const addValue = useCallback(
    (value: string) => {
      if (!selectedValues.includes(value)) {
        onSelectionChange([...selectedValues, value]);
      }
      setInputValue("");
      setFocusedIndex(-1);
      // Re-focus input after selecting a suggestion
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [selectedValues, onSelectionChange],
  );

  const removeValue = useCallback(
    (value: string) => {
      onSelectionChange(selectedValues.filter((v) => v !== value));
    },
    [selectedValues, onSelectionChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const oldValue = inputValue;

      // Deletion — always allow
      if (newValue.length < oldValue.length) {
        setInputValue(newValue);
        setFocusedIndex(-1);
        return;
      }

      // Validate each new character
      const addedChars = newValue.slice(oldValue.length);
      let validated = oldValue;
      for (const char of addedChars) {
        if (char === "," || char === " ") {
          commitCurrentValue();
          return;
        }
        if (!isAllowedIpChar(char)) return;
        if (char === "." && !shouldAcceptDot(validated)) return;
        if (char === "/" && !shouldAcceptSlash(validated)) return;
        validated += char;
      }

      setInputValue(newValue);
      setFocusedIndex(-1);
    },
    [inputValue, commitCurrentValue],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allSuggestions.length) {
          addValue(allSuggestions[focusedIndex]);
        } else if (inputValue.trim()) {
          const newValues = [...selectedValues];
          const trimmed = inputValue.trim();
          if (!newValues.includes(trimmed)) {
            newValues.push(trimmed);
          }
          onSelectionChange(newValues);
          setInputValue("");
          onConfirm(newValues);
        } else {
          onConfirm();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < allSuggestions.length - 1 ? prev + 1 : prev,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }

      if (
        e.key === "Backspace" &&
        inputValue === "" &&
        selectedValues.length > 0
      ) {
        onSelectionChange(selectedValues.slice(0, -1));
      }
    },
    [
      inputValue,
      focusedIndex,
      allSuggestions,
      selectedValues,
      onSelectionChange,
      onConfirm,
      onOpenChange,
      addValue,
    ],
  );

  useEffect(() => {
    if (open) {
      setInputValue("");
      setFocusedIndex(-1);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const operatorLabel =
    OPERATOR_LABELS[operator] ?? operator.replace(/_/g, " ");

  // Shared input element
  const inputElement = (
    <input
      ref={inputRef}
      value={inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder="IP address..."
      className={cn(
        "bg-transparent text-sm outline-none placeholder:text-muted-foreground",
        variant === "inline" ? "w-28 min-w-16 flex-1" : "h-8 w-full rounded-md border border-input px-3 py-1",
      )}
      aria-label={`Enter ${fieldDef.label} value`}
      autoComplete="off"
    />
  );

  // ── Inline variant: [Field][Operator][...values][Input] with suggestions dropdown ──
  if (variant === "inline") {
    if (!open) return <>{children}</>;

    return (
      <Popover open={hasSuggestions} onOpenChange={() => {}}>
        <PopoverAnchor asChild>
          <span
            className="inline-flex items-center gap-1"
            onBlur={(e) => {
              // Close when focus leaves the entire inline container
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                if (inputValue.trim()) {
                  commitCurrentValue();
                }
                onOpenChange(false);
              }
            }}
          >
            <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-xs font-medium">
              {fieldDef.label}
            </Badge>
            <Badge
              variant="outline"
              className="shrink-0 cursor-pointer px-2 py-0.5 text-xs font-medium uppercase hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                const next = operator === "in" ? "not_in" : "in";
                onOperatorChange?.(next);
                // Re-focus input after operator toggle
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              role="button"
              aria-label={`Toggle operator, currently ${operatorLabel}`}
            >
              {operatorLabel}
            </Badge>
            <SelectedValueBadges values={selectedValues} onRemove={removeValue} />
            {inputElement}
          </span>
        </PopoverAnchor>
        <PopoverContent
          className="w-64 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <SuggestionsContent
            matchingIps={matchingIps}
            cidrSuggestions={cidrSuggestions}
            focusedIndex={focusedIndex}
            onSelect={addValue}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // ── Popover variant: standard popover with input + suggestions inside ──
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {/* Selected values as removable badges */}
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b px-3 py-2">
              <SelectedValueBadges values={selectedValues} onRemove={removeValue} />
            </div>
          )}

          {/* Input field */}
          <div className="px-3 py-2">{inputElement}</div>

          {/* Suggestions */}
          {hasSuggestions && (
            <div className="border-t">
              <SuggestionsContent
                matchingIps={matchingIps}
                cidrSuggestions={cidrSuggestions}
                focusedIndex={focusedIndex}
                onSelect={addValue}
              />
            </div>
          )}

          {/* Keyboard hint */}
          <div className="border-t px-3 py-2">
            <span className="text-xs text-muted-foreground">
              ↵ to apply &middot; Space/Comma to add value
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
