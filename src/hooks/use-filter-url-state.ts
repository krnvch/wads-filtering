"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { FilterOperator } from "@/types/filters";
import {
  serializeFilterState,
  deserializeFilterState,
} from "@/lib/filter-url";
import {
  createCondition,
  addCondition,
  removeCondition,
  updateConditionValues,
  updateConditionOperator,
  createEmptyState,
} from "@/lib/filter-utils";

export function useFilterUrlState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filterState = useMemo(
    () => deserializeFilterState(searchParams),
    [searchParams],
  );

  const pushState = useCallback(
    (newState: typeof filterState) => {
      const params = serializeFilterState(newState);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname],
  );

  const addFilter = useCallback(
    (field: string, values: string[], operator: FilterOperator = "is") => {
      const condition = createCondition(field, values, operator);
      const newState = addCondition(filterState, condition);
      pushState(newState);
      return condition.id;
    },
    [filterState, pushState],
  );

  const removeFilter = useCallback(
    (id: string) => {
      const newState = removeCondition(filterState, id);
      pushState(newState);
    },
    [filterState, pushState],
  );

  const updateFilterValues = useCallback(
    (id: string, values: string[]) => {
      const newState = updateConditionValues(filterState, id, values);
      pushState(newState);
    },
    [filterState, pushState],
  );

  const updateOperator = useCallback(
    (id: string, operator: FilterOperator) => {
      const newState = updateConditionOperator(filterState, id, operator);
      pushState(newState);
    },
    [filterState, pushState],
  );

  const clearAll = useCallback(() => {
    pushState(createEmptyState());
  }, [pushState]);

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
    updateOperator,
    clearAll,
    hasActiveFilters,
    activeFilterCount,
  };
}
