"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterPalette } from "./FilterPalette";
import { FilterChip } from "./FilterChip";
import { FilterBarInput } from "./FilterBarInput";
import { EnumValueSelector } from "./EnumValueSelector";
import { TextValueInput } from "./TextValueInput";
import { DateValueSelector } from "./DateValueSelector";
import { NumericValueInput } from "./NumericValueInput";
import type { FilterCondition, FilterFieldDef, FilterOperator } from "@/types/filters";
import type { TokenFilterOperator } from "@/types/tokens";
import { OPERATOR_LABELS } from "@/types/tokens";
import { tokenAutoUpgradeOperator } from "@/lib/token-utils";
import { getFieldByKey } from "@/lib/filter-schema";
import { useFilterUIStore } from "@/stores/filter-ui-store";
import type { RecentFilter } from "@/stores/filter-ui-store";
import type { SimpleFilterMode } from "@/hooks/use-simple-filter-state";
import { cn } from "@/lib/utils";

interface SimpleFilterBarProps {
  conditions: FilterCondition[];
  mode: SimpleFilterMode;
  chipCount: number;
  onAddCondition: (field: string, values: string[], operator?: FilterOperator) => void;
  onRemoveCondition: (id: string) => void;
  onUpdateValues: (id: string, values: string[]) => void;
  onUpdateOperator: (id: string, operator: FilterOperator) => void;
  onSetMode: (mode: SimpleFilterMode) => void;
  onClearAll: () => void;
  textSuggestions?: Record<string, string[]>;
  resultCount?: number;
  placeholder?: string;
  className?: string;
}

export function SimpleFilterBar({
  conditions,
  mode,
  chipCount,
  onAddCondition,
  onRemoveCondition,
  onUpdateValues,
  onUpdateOperator,
  onSetMode,
  onClearAll,
  textSuggestions,
  resultCount,
  placeholder = "Filter...",
  className,
}: SimpleFilterBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [pendingField, setPendingField] = useState<FilterFieldDef | null>(null);
  const [pendingValues, setPendingValues] = useState<string[]>([]);

  const recentFilters = useFilterUIStore((s) => s.recentFilters);
  const addRecentFilter = useFilterUIStore((s) => s.addRecentFilter);

  const hasFilters = chipCount > 0;

  const handleSelectField = useCallback((field: FilterFieldDef) => {
    setPaletteOpen(false);
    setSearchText("");
    setPendingField(field);
    setPendingValues([]);
  }, []);

  const saveRecent = useCallback(
    (field: FilterFieldDef, op: TokenFilterOperator, vals: string[]) => {
      addRecentFilter({
        field: field.key,
        fieldLabel: field.label,
        operator: op,
        operatorLabel: OPERATOR_LABELS[op] ?? op.replace(/_/g, " "),
        values: vals,
        usedAt: Date.now(),
      });
    },
    [addRecentFilter],
  );

  const handlePendingConfirm = useCallback(
    (overrideValues?: string[]) => {
      const vals = overrideValues ?? pendingValues;
      if (pendingField && vals.length > 0) {
        const baseOp = getDefaultOperatorForField(pendingField);
        const op = tokenAutoUpgradeOperator(baseOp, vals.length);
        onAddCondition(pendingField.key, vals, op as FilterOperator);
        saveRecent(pendingField, op, vals);
      }
      setPendingField(null);
      setPendingValues([]);
    },
    [pendingField, pendingValues, onAddCondition, saveRecent],
  );

  const handlePendingOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (pendingField && pendingValues.length > 0) {
          const baseOp = getDefaultOperatorForField(pendingField);
          const op = tokenAutoUpgradeOperator(baseOp, pendingValues.length);
          onAddCondition(pendingField.key, pendingValues, op as FilterOperator);
          saveRecent(pendingField, op, pendingValues);
        }
        setPendingField(null);
        setPendingValues([]);
      }
    },
    [pendingField, pendingValues, onAddCondition, saveRecent],
  );

  const handleApplyRecent = useCallback(
    (recent: RecentFilter) => {
      setPaletteOpen(false);
      setSearchText("");
      onAddCondition(recent.field, recent.values, recent.operator as FilterOperator);
      addRecentFilter(recent);
    },
    [onAddCondition, addRecentFilter],
  );

  const handlePaletteOpenChange = useCallback(
    (open: boolean) => {
      setPaletteOpen(open);
      if (!open) setSearchText("");
    },
    [],
  );

  const toggleMode = useCallback(() => {
    onSetMode(mode === "all" ? "any" : "all");
  }, [mode, onSetMode]);

  const pendingSelector = pendingField
    ? renderValueSelector(
        pendingField,
        pendingValues,
        setPendingValues,
        handlePendingConfirm,
        handlePendingOpenChange,
        textSuggestions,
      )
    : null;

  return (
    <div
      className={cn("space-y-2", className)}
      role="search"
      aria-label="Filter search"
    >
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5",
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget && !pendingField) {
            setPaletteOpen(true);
          }
        }}
        role="toolbar"
        aria-label="Filter bar"
      >
        {conditions.map((condition) => {
          const fieldDef = getFieldByKey(condition.field);
          if (!fieldDef) return null;

          return (
            <FilterChip
              key={condition.id}
              condition={condition}
              fieldDef={fieldDef}
              onRemove={onRemoveCondition}
              onUpdateValues={onUpdateValues}
              onUpdateOperator={onUpdateOperator}
              suggestions={textSuggestions?.[condition.field]}
            />
          );
        })}

        {pendingSelector}

        {!pendingField && (
          <FilterPalette
            open={paletteOpen}
            onOpenChange={handlePaletteOpenChange}
            onSelectField={handleSelectField}
            onApplyRecent={handleApplyRecent}
            search={searchText}
            recentFilters={recentFilters}
            showStructural={false}
          >
            <FilterBarInput
              searchValue={searchText}
              onSearchChange={setSearchText}
              onOpenPalette={() => setPaletteOpen(true)}
              hasFilters={hasFilters}
              placeholder={placeholder}
            />
          </FilterPalette>
        )}

        {hasFilters && (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {chipCount >= 2 && (
              <Badge
                variant="secondary"
                className="cursor-pointer select-none gap-1 rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-muted"
                onClick={toggleMode}
              >
                {mode === "all" ? "Match all" : "Match any"}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClearAll}
              aria-label="Clear all filters"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {resultCount !== undefined && hasFilters && (
        <p className="text-sm text-muted-foreground" role="status">
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </p>
      )}
    </div>
  );
}

function getDefaultOperatorForField(
  field: FilterFieldDef,
): TokenFilterOperator {
  switch (field.type) {
    case "text":
      return "contains";
    case "date":
      return "in_the_last";
    case "numeric":
      return "equals";
    default:
      return "is";
  }
}

function renderValueSelector(
  field: FilterFieldDef,
  pendingValues: string[],
  setPendingValues: (values: string[]) => void,
  onConfirm: (overrideValues?: string[]) => void,
  onOpenChange: (open: boolean) => void,
  textSuggestions?: Record<string, string[]>,
) {
  const trigger = (
    <span className="text-sm text-muted-foreground">
      {field.label}...
    </span>
  );

  switch (field.type) {
    case "date":
      return (
        <DateValueSelector
          open={true}
          onOpenChange={onOpenChange}
          operator="in_the_last"
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={onConfirm}
        >
          {trigger}
        </DateValueSelector>
      );
    case "numeric":
      return (
        <NumericValueInput
          open={true}
          onOpenChange={onOpenChange}
          operator="equals"
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={onConfirm}
        >
          {trigger}
        </NumericValueInput>
      );
    case "text":
      return (
        <TextValueInput
          open={true}
          onOpenChange={onOpenChange}
          fieldDef={field}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={onConfirm}
          suggestions={textSuggestions?.[field.key]}
        >
          {trigger}
        </TextValueInput>
      );
    default:
      return (
        <EnumValueSelector
          open={true}
          onOpenChange={onOpenChange}
          fieldDef={field}
          selectedValues={pendingValues}
          onSelectionChange={setPendingValues}
          onConfirm={onConfirm}
        >
          {trigger}
        </EnumValueSelector>
      );
  }
}
