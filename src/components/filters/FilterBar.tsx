"use client";

import { useState, useCallback, useMemo, forwardRef } from "react";
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

/**
 * Thin clickable gap between tokens. On hover, shows a vertical cursor line.
 * Acts as the click target for repositioning the insertion cursor.
 */
function InsertionPoint({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="group flex h-7 w-1.5 shrink-0 cursor-text items-center justify-center"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="h-4 w-0.5 rounded-full bg-transparent transition-colors group-hover:bg-primary/50" />
    </button>
  );
}

/**
 * Active insertion cursor — a thin visible line at the active insertion position.
 * Same dimensions as InsertionPoint so layout doesn't shift when activated.
 * Used as the PopoverAnchor for the palette when inserting in the middle.
 *
 * Must use forwardRef so Radix PopoverAnchor asChild can measure its position.
 */
const ActiveInsertionCursor = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(function ActiveInsertionCursor(props, ref) {
  return (
    <span
      ref={ref}
      {...props}
      className={cn(
        "flex h-7 w-1.5 shrink-0 items-center justify-center",
        props.className,
      )}
      data-filter-palette-trigger
    >
      <span className="h-5 w-0.5 rounded-full bg-primary" />
    </span>
  );
});

interface FilterBarProps {
  tokens: Token[];
  expressionTree: FilterGroup;
  hasErrors: boolean;
  chipCount: number;
  onAddFilter: (
    field: string,
    values: string[],
    operator?: TokenFilterOperator,
    atIndex?: number,
  ) => void;
  onRemoveToken: (id: string) => void;
  onUpdateValues: (id: string, values: string[]) => void;
  onUpdateOperator: (id: string, operator: TokenFilterOperator) => void;
  onToggleConnector: (connectorId: string) => void;
  onInsertConnector: (type: "and" | "or", atIndex?: number) => void;
  onInsertParen: (type: "open_paren" | "close_paren", atIndex?: number) => void;
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
  onInsertConnector,
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
  // Insertion cursor position: index in the token array where new tokens will be inserted.
  // Defaults to tokens.length (end). Clicking between chips repositions it.
  const [insertionIndex, setInsertionIndex] = useState(tokens.length);

  const recentFilters = useFilterUIStore((s) => s.recentFilters);
  const addRecentFilter = useFilterUIStore((s) => s.addRecentFilter);

  const hasFilters = chipCount > 0;

  // Clamp insertion index to valid range when tokens change externally
  const clampedInsertionIndex = Math.min(insertionIndex, tokens.length);

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
        onAddFilter(pendingField.key, vals, op, clampedInsertionIndex);
        saveRecent(pendingField, op, vals);
        setInsertionIndex(clampedInsertionIndex + 1);
        focusAfterAdd();
      }
      setPendingField(null);
      setPendingValues([]);
    },
    [pendingField, pendingValues, onAddFilter, focusAfterAdd, saveRecent, clampedInsertionIndex],
  );

  const handlePendingOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (pendingField && pendingValues.length > 0) {
          const baseOp = getDefaultOperatorForField(pendingField);
          const op = tokenAutoUpgradeOperator(baseOp, pendingValues.length);
          onAddFilter(pendingField.key, pendingValues, op, clampedInsertionIndex);
          saveRecent(pendingField, op, pendingValues);
          setInsertionIndex(clampedInsertionIndex + 1);
          focusAfterAdd();
        }
        setPendingField(null);
        setPendingValues([]);
      }
    },
    [pendingField, pendingValues, onAddFilter, focusAfterAdd, saveRecent, clampedInsertionIndex],
  );

  const handleApplyRecent = useCallback(
    (recent: RecentFilter) => {
      setPaletteOpen(false);
      setSearchText("");
      onAddFilter(recent.field, recent.values, recent.operator, clampedInsertionIndex);
      addRecentFilter(recent);
      setInsertionIndex(clampedInsertionIndex + 1);
      focusAfterAdd();
    },
    [onAddFilter, addRecentFilter, focusAfterAdd, clampedInsertionIndex],
  );

  const handleSelectConnector = useCallback(
    (type: "and" | "or") => {
      setPaletteOpen(false);
      setSearchText("");
      onInsertConnector(type, clampedInsertionIndex);
      setInsertionIndex(clampedInsertionIndex + 1);
      focusAfterAdd();
    },
    [onInsertConnector, focusAfterAdd, clampedInsertionIndex],
  );

  const handleSelectParen = useCallback(
    (type: "open_paren" | "close_paren") => {
      setPaletteOpen(false);
      setSearchText("");
      onInsertParen(type, clampedInsertionIndex);
      setInsertionIndex(clampedInsertionIndex + 1);
      focusAfterAdd();
    },
    [onInsertParen, focusAfterAdd, clampedInsertionIndex],
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
    setInsertionIndex(0);
    focusAfterClearAll();
  }, [onClearAll, focusAfterClearAll]);

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !pendingField) {
        setInsertionIndex(tokens.length);
        setPaletteOpen(true);
      }
    },
    [pendingField, tokens.length],
  );

  const handleGapClick = useCallback(
    (index: number) => {
      if (pendingField) return;
      setInsertionIndex(index);
      setSearchText("");
      setPaletteOpen(true);
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
        handler: () => {
          setInsertionIndex(tokens.length);
          setPaletteOpen(true);
        },
      },
      {
        key: "f",
        modifiers: { shift: true } as const,
        handler: handleClearAll,
        enabled: hasFilters,
      },
    ],
    [handleClearAll, hasFilters, tokens.length],
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

  const isInsertionAtEnd = clampedInsertionIndex >= tokens.length;

  // Build interleaved elements:
  //   [gap] [token0] [gap] [token1] ... [tokenN-1] [end-input]
  //
  // Active gap in the middle → ActiveInsertionCursor (thin line) + palette anchored to it.
  // Active gap at the end → FilterBarInput + palette (type-to-search).
  // FilterBarInput with "Filter..." always appears at the end.
  const barElements: React.ReactNode[] = [];

  for (let pos = 0; pos < tokens.length; pos++) {
    // Insertion slot before token[pos]
    if (pos === clampedInsertionIndex && !isInsertionAtEnd) {
      // Active cursor in the middle
      if (pendingSelector) {
        barElements.push(
          <span key="active-input">{pendingSelector}</span>,
        );
      } else if (!pendingField) {
        barElements.push(
          <FilterPalette
            key="active-cursor"
            open={paletteOpen}
            onOpenChange={handlePaletteOpenChange}
            onSelectField={handleSelectField}
            onSelectConnector={handleSelectConnector}
            onSelectParen={handleSelectParen}
            onApplyRecent={handleApplyRecent}
            search={searchText}
            recentFilters={recentFilters}
          >
            <ActiveInsertionCursor />
          </FilterPalette>,
        );
      }
    } else {
      // Inactive gap — thin clickable area
      barElements.push(
        <InsertionPoint
          key={`gap-${pos}`}
          onClick={() => handleGapClick(pos)}
        />,
      );
    }

    // Token at this position
    barElements.push(
      <TokenRenderer
        key={tokens[pos].id}
        token={tokens[pos]}
        onRemoveToken={handleRemoveToken}
        onUpdateValues={(id, values) => onUpdateValues(id, values)}
        onUpdateOperator={onUpdateOperator}
        onToggleConnector={onToggleConnector}
        textSuggestions={textSuggestions}
      />,
    );
  }

  // End section: FilterBarInput with "Filter..." always at the end.
  if (isInsertionAtEnd) {
    // Active insertion at end — palette wraps the full input
    if (pendingSelector) {
      barElements.push(
        <span key="active-input">{pendingSelector}</span>,
      );
    } else if (!pendingField) {
      barElements.push(
        <FilterPalette
          key="active-input"
          open={paletteOpen}
          onOpenChange={handlePaletteOpenChange}
          onSelectField={handleSelectField}
          onSelectConnector={handleSelectConnector}
          onSelectParen={handleSelectParen}
          onApplyRecent={handleApplyRecent}
          search={searchText}
          recentFilters={recentFilters}
        >
          <FilterBarInput
            searchValue={searchText}
            onSearchChange={setSearchText}
            onOpenPalette={() => setPaletteOpen(true)}
            hasFilters={hasFilters}
            placeholder={placeholder}
          />
        </FilterPalette>,
      );
    }
  } else if (!pendingField) {
    // Cursor is in the middle — standalone end input (clicking moves cursor to end)
    barElements.push(
      <FilterBarInput
        key="end-input"
        searchValue=""
        onSearchChange={(val) => {
          setSearchText(val);
          setInsertionIndex(tokens.length);
        }}
        onOpenPalette={() => {
          setInsertionIndex(tokens.length);
          setPaletteOpen(true);
        }}
        hasFilters={hasFilters}
        placeholder={placeholder}
      />,
    );
  }

  return (
    <div
      className={cn("space-y-2", className)}
      role="search"
      aria-label="Filter search"
    >
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-0.5 rounded-lg border bg-background px-3 py-1.5",
          hasErrors && "border-destructive",
        )}
        onClick={handleBarClick}
        role="toolbar"
        aria-label="Filter bar"
      >
        {barElements}

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
