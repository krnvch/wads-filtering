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
import { OPERATOR_LABELS, OPERATORS_BY_FIELD_TYPE } from "@/types/tokens";
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
  /** "inline" renders as a chip in the filter bar. "popover" wraps children in a Popover (for FilterChip editing). */
  variant?: "inline" | "popover";
  /** Current operator (inline variant) */
  operator?: TokenFilterOperator;
  /** Whether operator has been confirmed (inline variant). When false, shows operator picker. */
  operatorConfirmed?: boolean;
  /** Called when user selects an operator in the picker (inline variant) */
  onOperatorChange?: (op: TokenFilterOperator) => void;
  /** Called to cancel/dismiss the inline creation */
  onCancel?: () => void;
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

/** Suggestions dropdown content */
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

      {matchingIps.length > 0 && cidrSuggestions.length > 0 && <Separator />}

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
  operatorConfirmed = true,
  onOperatorChange,
  onCancel,
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

      if (newValue.length < oldValue.length) {
        setInputValue(newValue);
        setFocusedIndex(-1);
        return;
      }

      const addedChars = newValue.slice(oldValue.length);
      let validated = oldValue;
      for (const char of addedChars) {
        if (char === "," || char === " ") {
          commitCurrentValue();
          return;
        }
        if (!isAllowedIpChar(char, validated)) return;
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
        onCancel?.();
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
      onCancel,
      addValue,
    ],
  );

  useEffect(() => {
    if (open && operatorConfirmed) {
      setInputValue("");
      setFocusedIndex(-1);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open, operatorConfirmed]);

  const operatorLabel =
    OPERATOR_LABELS[operator] ?? operator.replace(/_/g, " ");

  // Format values for display in the chip (like "192.0.0.0/8, 10.0.0.1")
  const valuesText = selectedValues.join(", ");

  // ── Inline variant: renders as a chip in the filter bar (matching FilterChip styling) ──
  if (variant === "inline") {
    if (!open) return <>{children}</>;

    const ipOperators = OPERATORS_BY_FIELD_TYPE.ip;

    // Determine what to show in the dropdown
    const showOperatorPicker = !operatorConfirmed;
    const showSuggestions = operatorConfirmed && hasSuggestions;
    const dropdownOpen = showOperatorPicker || showSuggestions;

    return (
      <Popover open={dropdownOpen} onOpenChange={() => {}}>
        <PopoverAnchor asChild>
          {/* Single chip — matches FilterChip's Badge styling exactly */}
          <Badge
            variant="secondary"
            className="group relative gap-1 rounded-md py-1 pl-2 pr-2 text-sm font-normal"
          >
            {/* Field label */}
            <span className="text-foreground">{fieldDef.label}</span>

            {/* Operator */}
            <span className="text-muted-foreground">{operatorLabel}</span>

            {/* Committed values (blue, like FilterChip) */}
            {valuesText && (
              <span className="text-blue-600 dark:text-blue-400">
                {valuesText}
              </span>
            )}

            {/* Inline input for typing new values */}
            {operatorConfirmed && (
              <input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={selectedValues.length > 0 ? "" : "IP address..."}
                className="w-24 min-w-12 flex-shrink bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label={`Enter ${fieldDef.label} value`}
                autoComplete="off"
                onBlur={(e) => {
                  // Don't close if clicking inside the dropdown
                  const popoverContent = e.currentTarget.closest(
                    "[data-radix-popper-content-wrapper]",
                  );
                  if (popoverContent?.contains(e.relatedTarget as Node)) return;

                  // Commit and close on blur outside
                  if (inputValue.trim()) {
                    commitCurrentValue();
                  }
                  // Small delay to allow click handlers on suggestions to fire
                  setTimeout(() => {
                    if (!document.activeElement?.closest("[data-radix-popper-content-wrapper]")) {
                      if (selectedValues.length > 0 || inputValue.trim()) {
                        onConfirm();
                      } else {
                        onCancel?.();
                        onOpenChange(false);
                      }
                    }
                  }, 150);
                }}
              />
            )}

            {/* Remove / Cancel button */}
            <button
              type="button"
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
              className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              aria-label="Cancel"
            >
              <X className="size-3" />
            </button>
          </Badge>
        </PopoverAnchor>

        <PopoverContent
          className="w-56 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Operator picker */}
          {showOperatorPicker && (
            <div className="py-1" role="listbox" aria-label="Select operator">
              {[...ipOperators.primary, ...ipOperators.advanced].map((op) => (
                <button
                  key={op}
                  type="button"
                  className={cn(
                    "w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-accent",
                    op === operator && "bg-accent font-medium",
                  )}
                  onClick={() => onOperatorChange?.(op)}
                  role="option"
                  aria-selected={op === operator}
                >
                  {OPERATOR_LABELS[op] ?? op.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && (
            <>
              <SuggestionsContent
                matchingIps={matchingIps}
                cidrSuggestions={cidrSuggestions}
                focusedIndex={focusedIndex}
                onSelect={addValue}
              />
              <div className="border-t px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  ↵ to apply &middot; Space/Comma to add value
                </span>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // ── Popover variant (used in FilterChip editing) ──
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b px-3 py-2">
              <TooltipProvider delayDuration={300}>
                {selectedValues.map((value) => {
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
                        onClick={() => removeValue(value)}
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
            </div>
          )}

          <div className="px-3 py-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="IP address..."
              className="h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground"
              aria-label={`Enter ${fieldDef.label} value`}
              autoComplete="off"
            />
          </div>

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
