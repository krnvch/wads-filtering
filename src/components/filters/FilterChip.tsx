"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EnumValueSelector } from "./EnumValueSelector";
import { TextValueInput } from "./TextValueInput";
import { DateValueSelector } from "./DateValueSelector";
import { NumericValueInput } from "./NumericValueInput";
import { IpValueInput } from "./IpValueInput";
import { OperatorSelector } from "./OperatorSelector";
import type {
  FilterCondition,
  FilterFieldDef,
  FilterOperator,
} from "@/types/filters";
import { OPERATOR_LABELS } from "@/types/tokens";
import type { TokenFilterOperator, TokenError } from "@/types/tokens";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  condition: FilterCondition;
  fieldDef: FilterFieldDef;
  onRemove: (id: string) => void;
  onUpdateValues: (id: string, values: string[]) => void;
  onUpdateOperator: (id: string, operator: FilterOperator) => void;
  suggestions?: string[];
  error?: TokenError;
  className?: string;
}

function formatOperator(operator: string): string {
  return OPERATOR_LABELS[operator as TokenFilterOperator] ?? operator.replace(/_/g, " ");
}

function formatValues(values: string[]): string {
  return values.join(", ");
}

export function FilterChip({
  condition,
  fieldDef,
  onRemove,
  onUpdateValues,
  onUpdateOperator,
  suggestions,
  error,
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

  const handleConfirm = useCallback(
    (overrideValues?: string[]) => {
      setValuePopoverOpen(false);
      const vals = overrideValues ?? pendingValues;
      if (vals.length > 0) {
        onUpdateValues(condition.id, vals);
      }
    },
    [condition.id, pendingValues, onUpdateValues],
  );

  const handleOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      onUpdateOperator(condition.id, operator);
    },
    [condition.id, onUpdateOperator],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLSpanElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        onRemove(condition.id);
      }
    },
    [condition.id, onRemove],
  );

  const ariaLabel = `${condition.fieldLabel} ${formatOperator(condition.operator)} ${condition.values.join(", ")}`;

  const invalidValues = error?.invalidValues;

  const valueTrigger = (
    <button
      type="button"
      className="cursor-pointer text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      aria-label={`Edit ${condition.fieldLabel} values`}
    >
      {invalidValues && invalidValues.length > 0
        ? condition.values.map((v, i) => {
            const isInvalid = invalidValues.includes(v);
            const separator = i < condition.values.length - 1 ? ", " : "";
            if (isInvalid) {
              return (
                <Tooltip key={`${v}-${i}`}>
                  <TooltipTrigger asChild>
                    <span className="text-destructive underline decoration-wavy decoration-destructive/50">
                      {v}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {error.message}
                  </TooltipContent>
                  {separator && <span>{separator}</span>}
                </Tooltip>
              );
            }
            return (
              <span key={`${v}-${i}`}>
                {v}{separator}
              </span>
            );
          })
        : formatValues(condition.values)}
    </button>
  );

  let valueEditor: React.ReactNode;
  switch (fieldDef.type) {
    case "text":
      valueEditor = (
        <TextValueInput
          open={valuePopoverOpen}
          onOpenChange={handleOpenChange}
          fieldDef={fieldDef}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={handleConfirm}
          suggestions={suggestions}
        >
          {valueTrigger}
        </TextValueInput>
      );
      break;
    case "date":
      valueEditor = (
        <DateValueSelector
          open={valuePopoverOpen}
          onOpenChange={handleOpenChange}
          operator={condition.operator as TokenFilterOperator}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={handleConfirm}
        >
          {valueTrigger}
        </DateValueSelector>
      );
      break;
    case "numeric":
      valueEditor = (
        <NumericValueInput
          open={valuePopoverOpen}
          onOpenChange={handleOpenChange}
          operator={condition.operator as TokenFilterOperator}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={handleConfirm}
        >
          {valueTrigger}
        </NumericValueInput>
      );
      break;
    case "ip":
      valueEditor = (
        <IpValueInput
          open={valuePopoverOpen}
          onOpenChange={handleOpenChange}
          fieldDef={fieldDef}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={handleConfirm}
          datasetIps={suggestions}
        >
          {valueTrigger}
        </IpValueInput>
      );
      break;
    default:
      valueEditor = (
        <EnumValueSelector
          open={valuePopoverOpen}
          onOpenChange={handleOpenChange}
          fieldDef={fieldDef}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={handleConfirm}
        >
          {valueTrigger}
        </EnumValueSelector>
      );
      break;
  }

  return (
    <Badge
      variant="secondary"
      tabIndex={0}
      role="listitem"
      aria-label={ariaLabel}
      data-filter-id={condition.id}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative gap-1 rounded-md py-1 pl-2 pr-2 text-sm font-normal",
        className,
      )}
    >
      <span className="text-foreground">{condition.fieldLabel}</span>
      <OperatorSelector
        currentOperator={condition.operator}
        fieldType={fieldDef.type}
        onSelect={handleOperatorSelect}
      >
        <button
          type="button"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label={`Change ${condition.fieldLabel} operator`}
        >
          {formatOperator(condition.operator)}
        </button>
      </OperatorSelector>
      {valueEditor}
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
