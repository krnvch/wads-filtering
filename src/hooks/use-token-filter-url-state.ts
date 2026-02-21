"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { TokenFilterState, TokenFilterOperator } from "@/types/tokens";
import type { FilterGroup } from "@/types/filters";
import {
  createEmptyTokenState,
  addChipToken,
  removeToken,
  updateChipValues,
  updateChipOperator,
  toggleConnectorType,
  insertParenToken,
  countChipTokens,
  clearAllTokens,
} from "@/lib/token-utils";
import {
  serializeTokens,
  deserializeTokens,
  isLegacyUrlFormat,
  migrateLegacyToTokens,
} from "@/lib/token-url";
import { tokensToExpressionTree } from "@/lib/token-parser";
import { validateTokens, hasTokenErrors } from "@/lib/token-validation";

export function useTokenFilterUrlState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Derive token state from URL
  const tokenState: TokenFilterState = useMemo(() => {
    // Check for new format: `q` param
    const q = searchParams.get("q");
    if (q) {
      return { tokens: deserializeTokens(q) };
    }

    // Check for legacy format
    if (isLegacyUrlFormat(searchParams)) {
      return { tokens: migrateLegacyToTokens(searchParams) };
    }

    return createEmptyTokenState();
  }, [searchParams]);

  // Derive expression tree for engine evaluation
  const expressionTree: FilterGroup = useMemo(
    () => tokensToExpressionTree(tokenState.tokens),
    [tokenState.tokens],
  );

  // Validate tokens
  const validatedTokens = useMemo(
    () => validateTokens(tokenState.tokens),
    [tokenState.tokens],
  );

  const hasErrors = useMemo(
    () => hasTokenErrors(validatedTokens),
    [validatedTokens],
  );

  const chipCount = useMemo(
    () => countChipTokens(tokenState),
    [tokenState],
  );

  // Push state to URL
  const pushState = useCallback(
    (newState: TokenFilterState) => {
      const serialized = serializeTokens(newState.tokens);
      const url = serialized ? `${pathname}?q=${encodeURIComponent(serialized)}` : pathname;
      router.push(url);
    },
    [router, pathname],
  );

  const addFilter = useCallback(
    (field: string, values: string[], operator?: TokenFilterOperator) => {
      const newState = addChipToken(tokenState, field, values, operator);
      pushState(newState);
    },
    [tokenState, pushState],
  );

  const removeFilter = useCallback(
    (tokenId: string) => {
      const newState = removeToken(tokenState, tokenId);
      pushState(newState);
    },
    [tokenState, pushState],
  );

  const updateFilterValues = useCallback(
    (chipId: string, values: string[]) => {
      const newState = updateChipValues(tokenState, chipId, values);
      pushState(newState);
    },
    [tokenState, pushState],
  );

  const updateOperator = useCallback(
    (chipId: string, operator: TokenFilterOperator) => {
      const newState = updateChipOperator(tokenState, chipId, operator);
      pushState(newState);
    },
    [tokenState, pushState],
  );

  const toggleConnector = useCallback(
    (connectorId: string) => {
      const newState = toggleConnectorType(tokenState, connectorId);
      pushState(newState);
    },
    [tokenState, pushState],
  );

  const insertParen = useCallback(
    (type: "open_paren" | "close_paren") => {
      const newState = insertParenToken(tokenState, type);
      pushState(newState);
    },
    [tokenState, pushState],
  );

  const clearAll = useCallback(() => {
    pushState(clearAllTokens());
  }, [pushState]);

  return {
    tokenState,
    tokens: tokenState.tokens,
    validatedTokens,
    expressionTree,
    hasErrors,
    chipCount,
    hasActiveFilters: chipCount > 0,
    addFilter,
    removeFilter,
    updateFilterValues,
    updateOperator,
    toggleConnector,
    insertParen,
    clearAll,
  };
}
