"use client";

import { useState, useCallback, useMemo } from "react";
import type { FilterState } from "@/types/filters";
import {
  createEmptyState,
  createCondition,
  addCondition,
  removeCondition,
  updateConditionValues,
} from "@/lib/filter-utils";
import type { FilterOperator } from "@/types/filters";

export function useFilterState(initialState?: FilterState) {
  const [filterState, setFilterState] = useState<FilterState>(
    initialState ?? createEmptyState(),
  );

  const addFilter = useCallback(
    (field: string, values: string[], operator: FilterOperator = "is") => {
      const condition = createCondition(field, values, operator);
      setFilterState((prev) => addCondition(prev, condition));
      return condition.id;
    },
    [],
  );

  const removeFilter = useCallback((id: string) => {
    setFilterState((prev) => removeCondition(prev, id));
  }, []);

  const updateFilterValues = useCallback((id: string, values: string[]) => {
    setFilterState((prev) => updateConditionValues(prev, id, values));
  }, []);

  const clearAll = useCallback(() => {
    setFilterState(createEmptyState());
  }, []);

  const hasActiveFilters = useMemo(
    () => filterState.expression.children.length > 0,
    [filterState],
  );

  const activeFilterCount = useMemo(
    () => filterState.expression.children.length,
    [filterState],
  );

  return {
    filterState,
    addFilter,
    removeFilter,
    updateFilterValues,
    clearAll,
    hasActiveFilters,
    activeFilterCount,
  };
}
