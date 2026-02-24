"use client";

import { useState, useCallback, useMemo } from "react";
import type { TokenFilterState, TokenFilterOperator } from "@/types/tokens";
import type { FilterGroup } from "@/types/filters";
import {
  createEmptyTokenState,
  addChipToken,
  removeToken,
  updateChipValues,
  updateChipOperator,
  toggleConnectorType,
  insertConnectorToken,
  insertParenToken,
  countChipTokens,
  clearAllTokens,
} from "@/lib/token-utils";
import { tokensToExpressionTree } from "@/lib/token-parser";
import { validateTokens, hasTokenErrors } from "@/lib/token-validation";

export function useTokenFilterState(initialState?: TokenFilterState) {
  const [tokenState, setTokenState] = useState<TokenFilterState>(
    initialState ?? createEmptyTokenState(),
  );

  const addFilter = useCallback(
    (
      field: string,
      values: string[],
      operator?: TokenFilterOperator,
      atIndex?: number,
    ) => {
      setTokenState((prev) => addChipToken(prev, field, values, operator, atIndex));
    },
    [],
  );

  const removeFilter = useCallback((tokenId: string) => {
    setTokenState((prev) => removeToken(prev, tokenId));
  }, []);

  const updateFilterValues = useCallback(
    (chipId: string, values: string[]) => {
      setTokenState((prev) => updateChipValues(prev, chipId, values));
    },
    [],
  );

  const updateOperator = useCallback(
    (chipId: string, operator: TokenFilterOperator) => {
      setTokenState((prev) => updateChipOperator(prev, chipId, operator));
    },
    [],
  );

  const toggleConnector = useCallback((connectorId: string) => {
    setTokenState((prev) => toggleConnectorType(prev, connectorId));
  }, []);

  const insertConnector = useCallback(
    (type: "and" | "or", atIndex?: number) => {
      setTokenState((prev) => insertConnectorToken(prev, type, atIndex));
    },
    [],
  );

  const insertParen = useCallback(
    (type: "open_paren" | "close_paren", atIndex?: number) => {
      setTokenState((prev) => insertParenToken(prev, type, atIndex));
    },
    [],
  );

  const clearAll = useCallback(() => {
    setTokenState(clearAllTokens());
  }, []);

  const expressionTree: FilterGroup = useMemo(
    () => tokensToExpressionTree(tokenState.tokens),
    [tokenState.tokens],
  );

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
    insertConnector,
    insertParen,
    clearAll,
  };
}
