"use client";

import { useEffect, useRef } from "react";
import type { Token, FilterChipToken } from "@/types/tokens";
import { isChipToken } from "@/types/tokens";

interface FilterAnnouncerProps {
  tokens: Token[];
  resultCount?: number;
}

function countChips(tokens: Token[]): number {
  return tokens.filter(isChipToken).length;
}

function formatOperator(operator: string): string {
  return operator.replace(/_/g, " ");
}

function findNewChip(
  prevTokens: Token[],
  nextTokens: Token[],
): FilterChipToken | null {
  const prevIds = new Set(
    prevTokens.filter(isChipToken).map((t) => t.id),
  );
  return (
    nextTokens
      .filter(isChipToken)
      .find((t) => !prevIds.has(t.id)) ?? null
  );
}

export function FilterAnnouncer({
  tokens,
  resultCount,
}: FilterAnnouncerProps) {
  const prevTokensRef = useRef<Token[]>(tokens);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = prevTokensRef.current;
    prevTokensRef.current = tokens;

    const prevCount = countChips(prev);
    const nextCount = countChips(tokens);

    let message = "";

    if (nextCount === 0 && prevCount > 0) {
      message = "All filters cleared.";
    } else if (nextCount > prevCount) {
      const newChip = findNewChip(prev, tokens);
      if (newChip) {
        message = `Filter added: ${newChip.fieldLabel} ${formatOperator(newChip.operator)} ${newChip.values.join(", ")}. ${nextCount} ${nextCount === 1 ? "filter" : "filters"} active.`;
      }
    } else if (nextCount < prevCount) {
      message = `Filter removed. ${nextCount} ${nextCount === 1 ? "filter" : "filters"} active.`;
    }

    if (message && politeRef.current) {
      politeRef.current.textContent = message;
    }
  }, [tokens]);

  useEffect(() => {
    if (
      resultCount === 0 &&
      countChips(tokens) > 0 &&
      assertiveRef.current
    ) {
      assertiveRef.current.textContent =
        "No results match your current filters.";
    } else if (assertiveRef.current) {
      assertiveRef.current.textContent = "";
    }
  }, [resultCount, tokens]);

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
