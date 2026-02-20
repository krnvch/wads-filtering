"use client";

import { FilterChip } from "./FilterChip";
import { BooleanConnector } from "./BooleanConnector";
import { isFilterCondition } from "@/types/filters";
import type {
  FilterGroup,
  FilterOperator,
} from "@/types/filters";
import { getFieldByKey } from "@/lib/filter-schema";
import { cn } from "@/lib/utils";

interface FilterGroupComponentProps {
  group: FilterGroup;
  onRemoveCondition: (conditionId: string) => void;
  onUpdateConditionValues: (conditionId: string, values: string[]) => void;
  onUpdateConditionOperator: (conditionId: string, operator: FilterOperator) => void;
  onToggleGroupConnector: (groupId: string) => void;
  textSuggestions?: Record<string, string[]>;
  className?: string;
}

export function FilterGroupComponent({
  group,
  onRemoveCondition,
  onUpdateConditionValues,
  onUpdateConditionOperator,
  onToggleGroupConnector,
  textSuggestions,
  className,
}: FilterGroupComponentProps) {
  const conditions = group.children.filter(isFilterCondition);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-1.5 py-0.5",
        className,
      )}
      role="group"
      aria-label={`${group.connector} filter group`}
    >
      <span className="text-xs text-muted-foreground select-none">(</span>
      {conditions.map((condition, index) => {
        const fieldDef = getFieldByKey(condition.field);
        if (!fieldDef) return null;

        return (
          <span key={condition.id} className="inline-flex items-center gap-1">
            {index > 0 && (
              <BooleanConnector
                type={group.connector}
                onClick={() => onToggleGroupConnector(group.id)}
              />
            )}
            <FilterChip
              condition={condition}
              fieldDef={fieldDef}
              onRemove={onRemoveCondition}
              onUpdateValues={onUpdateConditionValues}
              onUpdateOperator={onUpdateConditionOperator}
              suggestions={textSuggestions?.[condition.field]}
            />
          </span>
        );
      })}
      <span className="text-xs text-muted-foreground select-none">)</span>
    </span>
  );
}
