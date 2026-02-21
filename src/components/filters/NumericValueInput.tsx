"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RANGE_OPERATORS } from "@/types/tokens";
import type { TokenFilterOperator } from "@/types/tokens";

interface NumericValueInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: TokenFilterOperator;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onConfirm: (overrideValues?: string[]) => void;
  children: React.ReactNode;
}

export function NumericValueInput({
  open,
  onOpenChange,
  operator,
  selectedValues,
  onSelectionChange,
  onConfirm,
  children,
}: NumericValueInputProps) {
  const isRange = RANGE_OPERATORS.has(operator);
  const [value1, setValue1] = useState(selectedValues[0] ?? "");
  const [value2, setValue2] = useState(selectedValues[1] ?? "");

  useEffect(() => {
    if (open) {
      setValue1(selectedValues[0] ?? "");
      setValue2(selectedValues[1] ?? "");
    }
  }, [open, selectedValues]);

  const handleApply = useCallback(() => {
    if (isRange) {
      if (value1 !== "" && value2 !== "") {
        const vals = [value1, value2];
        onSelectionChange(vals);
        onConfirm(vals);
      }
    } else {
      if (value1 !== "") {
        const vals = [value1];
        onSelectionChange(vals);
        onConfirm(vals);
      }
    }
  }, [isRange, value1, value2, onSelectionChange, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleApply();
      }
    },
    [handleApply],
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          {isRange ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input
                  type="number"
                  value={value1}
                  onChange={(e) => setValue1(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Min"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input
                  type="number"
                  value={value2}
                  onChange={(e) => setValue2(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Max"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                value={value1}
                onChange={(e) => setValue1(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter number"
                autoFocus
              />
            </div>
          )}
          <Button
            size="sm"
            className="w-full"
            onClick={handleApply}
            disabled={isRange ? value1 === "" || value2 === "" : value1 === ""}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
