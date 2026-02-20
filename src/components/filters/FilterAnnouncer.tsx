"use client";

import { useEffect, useRef } from "react";
import type { FilterState } from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";
import type { FilterCondition, FilterGroup } from "@/types/filters";

interface FilterAnnouncerProps {
  filterState: FilterState;
  resultCount?: number;
}

function countConditions(
  children: (FilterCondition | FilterGroup)[],
): number {
  let count = 0;
  for (const child of children) {
    if (isFilterCondition(child)) {
      count += 1;
    } else if (isFilterGroup(child)) {
      count += countConditions(child.children);
    }
  }
  return count;
}

function formatOperator(operator: string): string {
  return operator.replace(/_/g, " ");
}

function findNewCondition(
  prevChildren: (FilterCondition | FilterGroup)[],
  nextChildren: (FilterCondition | FilterGroup)[],
): FilterCondition | null {
  const prevIds = new Set<string>();
  function collectIds(children: (FilterCondition | FilterGroup)[]) {
    for (const child of children) {
      if (isFilterCondition(child)) {
        prevIds.add(child.id);
      } else if (isFilterGroup(child)) {
        collectIds(child.children);
      }
    }
  }
  collectIds(prevChildren);

  function findNew(
    children: (FilterCondition | FilterGroup)[],
  ): FilterCondition | null {
    for (const child of children) {
      if (isFilterCondition(child) && !prevIds.has(child.id)) {
        return child;
      }
      if (isFilterGroup(child)) {
        const found = findNew(child.children);
        if (found) return found;
      }
    }
    return null;
  }

  return findNew(nextChildren);
}

export function FilterAnnouncer({
  filterState,
  resultCount,
}: FilterAnnouncerProps) {
  const prevStateRef = useRef<FilterState>(filterState);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = filterState;

    const prevCount = countConditions(prev.expression.children);
    const nextCount = countConditions(filterState.expression.children);

    let message = "";

    if (nextCount === 0 && prevCount > 0) {
      message = "All filters cleared.";
    } else if (nextCount > prevCount) {
      const newCondition = findNewCondition(
        prev.expression.children,
        filterState.expression.children,
      );
      if (newCondition) {
        message = `Filter added: ${newCondition.fieldLabel} ${formatOperator(newCondition.operator)} ${newCondition.values.join(" or ")}. ${nextCount} ${nextCount === 1 ? "filter" : "filters"} active.`;
      }
    } else if (nextCount < prevCount) {
      message = `Filter removed. ${nextCount} ${nextCount === 1 ? "filter" : "filters"} active.`;
    }

    if (message && politeRef.current) {
      politeRef.current.textContent = message;
    }
  }, [filterState]);

  useEffect(() => {
    if (
      resultCount === 0 &&
      countConditions(filterState.expression.children) > 0 &&
      assertiveRef.current
    ) {
      assertiveRef.current.textContent =
        "No results match your current filters.";
    } else if (assertiveRef.current) {
      assertiveRef.current.textContent = "";
    }
  }, [resultCount, filterState]);

  return (
    <>
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
