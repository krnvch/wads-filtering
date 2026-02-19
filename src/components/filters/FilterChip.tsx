"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EnumValueSelector } from "./EnumValueSelector";
import type { FilterCondition, FilterFieldDef } from "@/types/filters";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  condition: FilterCondition;
  fieldDef: FilterFieldDef;
  onRemove: (id: string) => void;
  onUpdateValues: (id: string, values: string[]) => void;
  className?: string;
}

function formatOperator(operator: string): string {
  return operator.replace(/_/g, " ");
}

function formatValues(values: string[]): string {
  if (values.length <= 2) {
    return values.join(" or ");
  }
  return values.join(", ");
}

export function FilterChip({
  condition,
  fieldDef,
  onRemove,
  onUpdateValues,
  className,
}: FilterChipProps) {
  const [valuePopoverOpen, setValuePopoverOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<string[]>(
    condition.values,
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setPendingValues(condition.values);
      }
      setValuePopoverOpen(open);
      if (!open && pendingValues.length > 0) {
        onUpdateValues(condition.id, pendingValues);
      }
    },
    [condition.id, condition.values, pendingValues, onUpdateValues],
  );

  const handleConfirm = useCallback(() => {
    setValuePopoverOpen(false);
    if (pendingValues.length > 0) {
      onUpdateValues(condition.id, pendingValues);
    }
  }, [condition.id, pendingValues, onUpdateValues]);

  return (
    <Badge
      variant="secondary"
      className={cn(
        "group relative gap-1 rounded-md py-1 pl-2 pr-2 text-sm font-normal",
        className,
      )}
    >
      <span className="text-foreground">{condition.fieldLabel}</span>
      <span className="text-muted-foreground">
        {formatOperator(condition.operator)}
      </span>
      <EnumValueSelector
        open={valuePopoverOpen}
        onOpenChange={handleOpenChange}
        fieldDef={fieldDef}
        selectedValues={pendingValues}
        onSelectionChange={setPendingValues}
        onConfirm={handleConfirm}
      >
        <button
          type="button"
          className="cursor-pointer text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          aria-label={`Edit ${condition.fieldLabel} values`}
        >
          {formatValues(condition.values)}
        </button>
      </EnumValueSelector>
      <button
        type="button"
        onClick={() => onRemove(condition.id)}
        className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        aria-label={`Remove ${condition.fieldLabel} filter`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
