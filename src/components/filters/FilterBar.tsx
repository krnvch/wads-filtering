"use client";

import { useState, useCallback } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterChip } from "./FilterChip";
import { FilterPalette } from "./FilterPalette";
import { EnumValueSelector } from "./EnumValueSelector";
import { TextValueInput } from "./TextValueInput";
import { BooleanConnector } from "./BooleanConnector";
import { FilterGroupComponent } from "./FilterGroupComponent";
import { isFilterCondition, isFilterGroup } from "@/types/filters";
import type {
  FilterState,
  FilterFieldDef,
  FilterOperator,
} from "@/types/filters";
import type { ValidationError } from "@/lib/filter-validation";
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
  onToggleConnector?: (leftIndex: number) => void;
  validationErrors?: ValidationError[];
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
  onToggleConnector,
  validationErrors,
  textSuggestions,
  placeholder = "Filter...",
  className,
}: FilterBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingField, setPendingField] = useState<FilterFieldDef | null>(null);
  const [pendingValues, setPendingValues] = useState<string[]>([]);

  const children = filterState.expression.children;
  const hasFilters = children.length > 0;
  const hasErrors = validationErrors && validationErrors.length > 0;

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
      if (e.target === e.currentTarget && !pendingField) {
        setPaletteOpen(true);
      }
    },
    [pendingField],
  );

  const handleToggleGroupConnector = useCallback(
    (groupId: string) => {
      // Find the group index in children and delegate to onToggleConnector
      // For OR groups inside the bar, clicking the OR connector should
      // ungroup (toggle OR→AND). We find which leftIndex corresponds to
      // this group and call onToggleConnector with that index.
      const idx = children.findIndex(
        (c) => isFilterGroup(c) && c.id === groupId,
      );
      if (idx !== -1 && onToggleConnector) {
        // When clicking OR inside a group, we pass the group's own index
        // as leftIndex so toggleConnector finds it and ungroups
        onToggleConnector(idx);
      }
    },
    [children, onToggleConnector],
  );

  /**
   * Determine if the AND connector between children[index-1] and children[index]
   * should be clickable. Rules:
   * - onToggleConnector must be provided
   * - Both adjacent items must be conditions (not groups) to allow grouping
   */
  function isConnectorClickable(index: number): boolean {
    if (!onToggleConnector) return false;
    if (index === 0) return false;

    const left = children[index - 1];
    const right = children[index];

    // Only allow grouping two conditions; prevent nesting
    return isFilterCondition(left) && isFilterCondition(right);
  }

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
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex min-h-10 items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5",
          hasErrors && "border-destructive",
        )}
        onClick={handleBarClick}
        role="toolbar"
        aria-label="Filter bar"
      >
        {children.map((child, index) => {
          if (isFilterGroup(child)) {
            return (
              <span key={child.id} className="inline-flex items-center gap-1.5">
                {index > 0 && <BooleanConnector type="AND" />}
                <FilterGroupComponent
                  group={child}
                  onRemoveCondition={onRemoveFilter}
                  onUpdateConditionValues={onUpdateFilterValues}
                  onUpdateConditionOperator={onUpdateOperator}
                  onToggleGroupConnector={handleToggleGroupConnector}
                  textSuggestions={textSuggestions}
                />
              </span>
            );
          }

          if (isFilterCondition(child)) {
            const fieldDef = getFieldByKey(child.field);
            if (!fieldDef) return null;

            const clickable = isConnectorClickable(index);

            return (
              <span key={child.id} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <BooleanConnector
                    type="AND"
                    onClick={
                      clickable
                        ? () => onToggleConnector!(index - 1)
                        : undefined
                    }
                  />
                )}
                <FilterChip
                  condition={child}
                  fieldDef={fieldDef}
                  onRemove={onRemoveFilter}
                  onUpdateValues={onUpdateFilterValues}
                  onUpdateOperator={onUpdateOperator}
                  suggestions={textSuggestions?.[child.field]}
                />
              </span>
            );
          }

          return null;
        })}

        {pendingSelector}

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

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            {validationErrors!.map((e) => e.message).join(" ")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
