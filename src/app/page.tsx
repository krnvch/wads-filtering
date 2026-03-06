"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/filters/FilterBar";
import { useTokenFilterUrlState } from "@/hooks/use-token-filter-url-state";
import { evaluateExpression } from "@/lib/filter-engine";
import {
  MOCK_ATTACKS,
  statusColors,
  impactColors,
  formatRelativeTime,
  computeTextSuggestions,
  type Attack,
} from "@/lib/mock-attacks";

function HomeContent() {
  const {
    validatedTokens,
    expressionTree,
    hasErrors,
    chipCount,
    addFilter,
    removeFilter,
    updateFilterValues,
    updateOperator,
    toggleConnector,
    insertConnector,
    insertParen,
    clearAll,
    triggerSearch,
  } = useTokenFilterUrlState();

  const textSuggestions = useMemo(
    () => computeTextSuggestions(MOCK_ATTACKS),
    [],
  );

  const filteredAttacks = useMemo(
    () =>
      evaluateExpression(
        MOCK_ATTACKS as unknown as Record<string, unknown>[],
        { expression: expressionTree },
      ) as unknown as Attack[],
    [expressionTree],
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Attacks:{" "}
          <span className="text-muted-foreground">
            {filteredAttacks.length}
          </span>
        </h1>
        <Link
          href="/simple"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Switch to Simple filters
        </Link>
      </div>

      <FilterBar
        tokens={validatedTokens}
        expressionTree={expressionTree}
        hasErrors={hasErrors}
        chipCount={chipCount}
        onAddFilter={addFilter}
        onRemoveToken={removeFilter}
        onUpdateValues={updateFilterValues}
        onUpdateOperator={updateOperator}
        onToggleConnector={toggleConnector}
        onInsertConnector={insertConnector}
        onInsertParen={insertParen}
        onClearAll={clearAll}
        onSearch={triggerSearch}
        textSuggestions={textSuggestions}
        resultCount={filteredAttacks.length}
        className="mb-4"
      />

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Attack Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Impact</th>
              <th className="px-4 py-3 text-left font-medium">HTTP Status</th>
              <th className="px-4 py-3 text-left font-medium">Hostname</th>
              <th className="px-4 py-3 text-left font-medium">First detected</th>
              <th className="px-4 py-3 text-left font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttacks.map((attack) => (
              <tr
                key={attack.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3 font-medium">{attack.name}</td>
                <td className="px-4 py-3">{attack.type}</td>
                <td className={`px-4 py-3 ${statusColors[attack.status]}`}>
                  {attack.status}
                </td>
                <td className={`px-4 py-3 ${impactColors[attack.impact]}`}>
                  {attack.impact}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {attack.response_code}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {attack.host}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatRelativeTime(attack.timeline.first_detected)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatRelativeTime(attack.timeline.last_seen)}
                </td>
              </tr>
            ))}
            {filteredAttacks.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No attacks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>
      </main>
    </div>
  );
}
