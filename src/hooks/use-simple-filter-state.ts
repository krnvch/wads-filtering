"use client";

import { useState, useCallback, useMemo } from "react";
import type { FilterCondition, FilterGroup, FilterOperator } from "@/types/filters";
import { getFieldByKey } from "@/lib/filter-schema";

let _nextId = 0;
function generateId(): string {
  return `sf-${++_nextId}-${Date.now().toString(36)}`;
}

export type SimpleFilterMode = "all" | "any";

interface SimpleFilterStateReturn {
  conditions: FilterCondition[];
  mode: SimpleFilterMode;
  expressionTree: FilterGroup;
  chipCount: number;
  hasActiveFilters: boolean;
  addCondition: (field: string, values: string[], operator?: FilterOperator) => void;
  removeCondition: (id: string) => void;
  updateValues: (id: string, values: string[]) => void;
  updateOperator: (id: string, operator: FilterOperator) => void;
  setMode: (mode: SimpleFilterMode) => void;
  clearAll: () => void;
}

function getDefaultOperator(fieldKey: string): FilterOperator {
  const field = getFieldByKey(fieldKey);
  if (!field) return "is";
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

function autoUpgradeOperator(
  operator: FilterOperator,
  valueCount: number,
): FilterOperator {
  if (valueCount <= 1) {
    if (operator === "is_any_of") return "is";
    if (operator === "is_none_of") return "is_not";
  } else {
    if (operator === "is") return "is_any_of";
    if (operator === "is_not") return "is_none_of";
  }
  return operator;
}

export function useSimpleFilterState(): SimpleFilterStateReturn {
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [mode, setMode] = useState<SimpleFilterMode>("all");

  const addCondition = useCallback(
    (field: string, values: string[], operator?: FilterOperator) => {
      const fieldDef = getFieldByKey(field);
      const defaultOp = operator ?? getDefaultOperator(field);
      const op = autoUpgradeOperator(defaultOp, values.length);

      const condition: FilterCondition = {
        id: generateId(),
        field,
        fieldLabel: fieldDef?.label ?? field,
        operator: op,
        values,
      };

      setConditions((prev) => [...prev, condition]);
    },
    [],
  );

  const removeCondition = useCallback((id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateValues = useCallback((id: string, values: string[]) => {
    if (values.length === 0) {
      setConditions((prev) => prev.filter((c) => c.id !== id));
      return;
    }
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newOp = autoUpgradeOperator(c.operator, values.length);
        return { ...c, values, operator: newOp };
      }),
    );
  }, []);

  const updateOperator = useCallback((id: string, operator: FilterOperator) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, operator } : c)),
    );
  }, []);

  const clearAll = useCallback(() => {
    setConditions([]);
  }, []);

  const expressionTree: FilterGroup = useMemo(() => {
    return {
      id: "root",
      connector: mode === "all" ? "AND" : "OR",
      children: conditions,
    };
  }, [conditions, mode]);

  return {
    conditions,
    mode,
    expressionTree,
    chipCount: conditions.length,
    hasActiveFilters: conditions.length > 0,
    addCondition,
    removeCondition,
    updateValues,
    updateOperator,
    setMode,
    clearAll,
  };
}
