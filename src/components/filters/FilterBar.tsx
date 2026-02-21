"use client";

import { useState, useCallback, useMemo } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterPalette } from "./FilterPalette";
import { FilterAnnouncer } from "./FilterAnnouncer";
import { EnumValueSelector } from "./EnumValueSelector";
import { TextValueInput } from "./TextValueInput";
import { DateValueSelector } from "./DateValueSelector";
import { NumericValueInput } from "./NumericValueInput";
import { TokenRenderer } from "./TokenRenderer";
import { FilterBarInput } from "./FilterBarInput";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFilterFocus } from "@/hooks/use-filter-focus";
import type { Token, TokenFilterState, TokenFilterOperator } from "@/types/tokens";
import { isChipToken } from "@/types/tokens";
import type { FilterFieldDef } from "@/types/filters";
import type { FilterGroup } from "@/types/filters";
import { getFieldByKey } from "@/lib/filter-schema";
import { tokenAutoUpgradeOperator } from "@/lib/token-utils";
import { OPERATOR_LABELS } from "@/types/tokens";
import { useFilterUIStore } from "@/stores/filter-ui-store";
import type { RecentFilter } from "@/stores/filter-ui-store";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  tokens: Token[];
  expressionTree: FilterGroup;
  hasErrors: boolean;
  chipCount: number;
  onAddFilter: (
    field: string,
    values: string[],
    operator?: TokenFilterOperator,
  ) => void;
  onRemoveToken: (id: string) => void;
  onUpdateValues: (id: string, values: string[]) => void;
  onUpdateOperator: (id: string, operator: TokenFilterOperator) => void;
  onToggleConnector: (connectorId: string) => void;
  onInsertParen: (type: "open_paren" | "close_paren") => void;
  onClearAll: () => void;
  textSuggestions?: Record<string, string[]>;
  resultCount?: number;
  placeholder?: string;
  className?: string;
}

export function FilterBar({
  tokens,
  expressionTree,
  hasErrors,
  chipCount,
  onAddFilter,
  onRemoveToken,
  onUpdateValues,
  onUpdateOperator,
  onToggleConnector,
  onInsertParen,
  onClearAll,
  textSuggestions,
  resultCount,
  placeholder = "Filter...",
  className,
}: FilterBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [pendingField, setPendingField] = useState<FilterFieldDef | null>(null);
  const [pendingValues, setPendingValues] = useState<string[]>([]);

  const recentFilters = useFilterUIStore((s) => s.recentFilters);
  const addRecentFilter = useFilterUIStore((s) => s.addRecentFilter);

  const hasFilters = chipCount > 0;

  const { focusAfterRemove, focusAfterAdd, focusAfterClearAll } =
    useFilterFocus();

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
        onAddFilter(pendingField.key, vals, op);
        saveRecent(pendingField, op, vals);
        focusAfterAdd();
      }
      setPendingField(null);
      setPendingValues([]);
    },
    [pendingField, pendingValues, onAddFilter, focusAfterAdd, saveRecent],
  );

  const handlePendingOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (pendingField && pendingValues.length > 0) {
          const baseOp = getDefaultOperatorForField(pendingField);
          const op = tokenAutoUpgradeOperator(baseOp, pendingValues.length);
          onAddFilter(pendingField.key, pendingValues, op);
          saveRecent(pendingField, op, pendingValues);
          focusAfterAdd();
        }
        setPendingField(null);
        setPendingValues([]);
      }
    },
    [pendingField, pendingValues, onAddFilter, focusAfterAdd, saveRecent],
  );

  const handleApplyRecent = useCallback(
    (recent: RecentFilter) => {
      setPaletteOpen(false);
      setSearchText("");
      onAddFilter(recent.field, recent.values, recent.operator);
      addRecentFilter(recent);
      focusAfterAdd();
    },
    [onAddFilter, addRecentFilter, focusAfterAdd],
  );

  const handleRemoveToken = useCallback(
    (id: string) => {
      focusAfterRemove(id);
      onRemoveToken(id);
    },
    [onRemoveToken, focusAfterRemove],
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

  const handlePaletteOpenChange = useCallback(
    (open: boolean) => {
      setPaletteOpen(open);
      if (!open) {
        setSearchText("");
      }
    },
    [],
  );

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
          hasErrors && "border-destructive",
        )}
        onClick={handleBarClick}
        role="toolbar"
        aria-label="Filter bar"
      >
        {tokens.map((token) => (
          <TokenRenderer
            key={token.id}
            token={token}
            onRemoveToken={handleRemoveToken}
            onUpdateValues={(id, values) =>
              onUpdateValues(id, values)
            }
            onUpdateOperator={onUpdateOperator}
            onToggleConnector={onToggleConnector}
            textSuggestions={textSuggestions}
          />
        ))}

        {pendingSelector}

        {!pendingField && (
          <FilterPalette
            open={paletteOpen}
            onOpenChange={handlePaletteOpenChange}
            onSelectField={handleSelectField}
            onApplyRecent={handleApplyRecent}
            search={searchText}
            recentFilters={recentFilters}
          >
            <FilterBarInput
              searchValue={searchText}
              onSearchChange={setSearchText}
              onInsertParen={onInsertParen}
              onOpenPalette={() => setPaletteOpen(true)}
              hasFilters={hasFilters}
              placeholder={placeholder}
            />
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

      <FilterAnnouncer
        tokens={tokens}
        resultCount={resultCount}
      />

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            Some filters have validation errors. Hover over highlighted tokens for details.
          </AlertDescription>
        </Alert>
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
