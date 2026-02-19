"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "./FilterChip";
import { FilterPalette } from "./FilterPalette";
import { EnumValueSelector } from "./EnumValueSelector";
import { TextValueInput } from "./TextValueInput";
import { BooleanConnector } from "./BooleanConnector";
import { isFilterCondition } from "@/types/filters";
import type {
  FilterState,
  FilterFieldDef,
  FilterOperator,
} from "@/types/filters";
import { getFieldByKey } from "@/lib/filter-schema";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filterState: FilterState;
  onAddFilter: (
    field: string,
    values: string[],
    operator?: FilterOperator,
  ) => void;
  onRemoveFilter: (id: string) => void;
  onUpdateFilterValues: (id: string, values: string[]) => void;
  onUpdateOperator: (id: string, operator: FilterOperator) => void;
  onClearAll: () => void;
  textSuggestions?: Record<string, string[]>;
  placeholder?: string;
  className?: string;
}

export function FilterBar({
  filterState,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilterValues,
  onUpdateOperator,
  onClearAll,
  textSuggestions,
  placeholder = "Filter...",
  className,
}: FilterBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingField, setPendingField] = useState<FilterFieldDef | null>(null);
  const [pendingValues, setPendingValues] = useState<string[]>([]);

  const conditions = filterState.expression.children.filter(isFilterCondition);
  const hasFilters = conditions.length > 0;

  const handleSelectField = useCallback((field: FilterFieldDef) => {
    setPaletteOpen(false);
    setPendingField(field);
    setPendingValues([]);
  }, []);

  const handlePendingConfirm = useCallback(() => {
    if (pendingField && pendingValues.length > 0) {
      const defaultOp = pendingField.type === "text" ? "contains" : "is";
      onAddFilter(pendingField.key, pendingValues, defaultOp);
    }
    setPendingField(null);
    setPendingValues([]);
  }, [pendingField, pendingValues, onAddFilter]);

  const handlePendingOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (pendingField && pendingValues.length > 0) {
          const defaultOp = pendingField.type === "text" ? "contains" : "is";
          onAddFilter(pendingField.key, pendingValues, defaultOp);
        }
        setPendingField(null);
        setPendingValues([]);
      }
    },
    [pendingField, pendingValues, onAddFilter],
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only open palette when clicking the bar itself, not a child
      if (e.target === e.currentTarget && !pendingField) {
        setPaletteOpen(true);
      }
    },
    [pendingField],
  );

  const pendingSelector = pendingField ? (
    pendingField.type === "text" ? (
      <TextValueInput
        open={true}
        onOpenChange={handlePendingOpenChange}
        fieldDef={pendingField}
        selectedValues={pendingValues}
        onSelectionChange={setPendingValues}
        onConfirm={handlePendingConfirm}
        suggestions={textSuggestions?.[pendingField.key]}
      >
        <span className="text-sm text-muted-foreground">
          {pendingField.label}...
        </span>
      </TextValueInput>
    ) : (
      <EnumValueSelector
        open={true}
        onOpenChange={handlePendingOpenChange}
        fieldDef={pendingField}
        selectedValues={pendingValues}
        onSelectionChange={setPendingValues}
        onConfirm={handlePendingConfirm}
      >
        <span className="text-sm text-muted-foreground">
          {pendingField.label}...
        </span>
      </EnumValueSelector>
    )
  ) : null;

  return (
    <div
      className={cn(
        "flex min-h-10 items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5",
        className,
      )}
      onClick={handleBarClick}
      role="toolbar"
      aria-label="Filter bar"
    >
      {conditions.map((condition, index) => {
        const fieldDef = getFieldByKey(condition.field);
        if (!fieldDef) return null;

        return (
          <span key={condition.id} className="inline-flex items-center gap-1.5">
            {index > 0 && <BooleanConnector type="AND" />}
            <FilterChip
              condition={condition}
              fieldDef={fieldDef}
              onRemove={onRemoveFilter}
              onUpdateValues={onUpdateFilterValues}
              onUpdateOperator={onUpdateOperator}
              suggestions={textSuggestions?.[condition.field]}
            />
          </span>
        );
      })}

      {/* Pending field value selector (two-step add flow) */}
      {pendingSelector}

      {/* Palette trigger — placeholder area */}
      {!pendingField && (
        <FilterPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onSelectField={handleSelectField}
        >
          <button
            type="button"
            className="flex-1 cursor-text text-left text-sm text-muted-foreground outline-none"
            aria-label="Add filter"
          >
            {!hasFilters && placeholder}
          </button>
        </FilterPalette>
      )}

      {/* Clear all button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClearAll}
          className="ml-auto shrink-0"
          aria-label="Clear all filters"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
