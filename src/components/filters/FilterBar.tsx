"use client";

import { useState, useCallback, useMemo } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterChip } from "./FilterChip";
import { FilterPalette } from "./FilterPalette";
import { FilterAnnouncer } from "./FilterAnnouncer";
import { EnumValueSelector } from "./EnumValueSelector";
import { TextValueInput } from "./TextValueInput";
import { BooleanConnector } from "./BooleanConnector";
import { FilterGroupComponent } from "./FilterGroupComponent";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFilterFocus } from "@/hooks/use-filter-focus";
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
  resultCount?: number;
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
  resultCount,
  placeholder = "Filter...",
  className,
}: FilterBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingField, setPendingField] = useState<FilterFieldDef | null>(null);
  const [pendingValues, setPendingValues] = useState<string[]>([]);

  const children = filterState.expression.children;
  const hasFilters = children.length > 0;
  const hasErrors = validationErrors && validationErrors.length > 0;

  const { focusAfterRemove, focusAfterAdd, focusAfterClearAll } =
    useFilterFocus();

  const handleSelectField = useCallback((field: FilterFieldDef) => {
    setPaletteOpen(false);
    setPendingField(field);
    setPendingValues([]);
  }, []);

  const handlePendingConfirm = useCallback(() => {
    if (pendingField && pendingValues.length > 0) {
      const defaultOp = pendingField.type === "text" ? "contains" : "is";
      onAddFilter(pendingField.key, pendingValues, defaultOp);
      focusAfterAdd();
    }
    setPendingField(null);
    setPendingValues([]);
  }, [pendingField, pendingValues, onAddFilter, focusAfterAdd]);

  const handlePendingOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (pendingField && pendingValues.length > 0) {
          const defaultOp = pendingField.type === "text" ? "contains" : "is";
          onAddFilter(pendingField.key, pendingValues, defaultOp);
          focusAfterAdd();
        }
        setPendingField(null);
        setPendingValues([]);
      }
    },
    [pendingField, pendingValues, onAddFilter, focusAfterAdd],
  );

  const handleRemoveFilter = useCallback(
    (id: string) => {
      focusAfterRemove(id);
      onRemoveFilter(id);
    },
    [onRemoveFilter, focusAfterRemove],
  );

  const handleClearAll = useCallback(() => {
    onClearAll();
    focusAfterClearAll();
  }, [onClearAll, focusAfterClearAll]);

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
      const idx = children.findIndex(
        (c) => isFilterGroup(c) && c.id === groupId,
      );
      if (idx !== -1 && onToggleConnector) {
        onToggleConnector(idx);
      }
    },
    [children, onToggleConnector],
  );

  function isConnectorClickable(index: number): boolean {
    if (!onToggleConnector) return false;
    if (index === 0) return false;

    const left = children[index - 1];
    const right = children[index];

    return isFilterCondition(left) && isFilterCondition(right);
  }

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        key: "f",
        handler: () => setPaletteOpen(true),
      },
      {
        key: "f",
        modifiers: { shift: true } as const,
        handler: handleClearAll,
        enabled: hasFilters,
      },
    ],
    [handleClearAll, hasFilters],
  );

  useKeyboardShortcuts(shortcuts);

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
      className={cn("space-y-2", className)}
      role="search"
      aria-label="Filter search"
    >
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
                  onRemoveCondition={handleRemoveFilter}
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
                  onRemove={handleRemoveFilter}
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
              data-filter-palette-trigger
            >
              {!hasFilters && placeholder}
            </button>
          </FilterPalette>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleClearAll}
            className="ml-auto shrink-0"
            aria-label="Clear all filters"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      <FilterAnnouncer filterState={filterState} resultCount={resultCount} />

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
