import { describe, it, expect } from "vitest";
import {
  createEmptyTokenState,
  addChipToken,
  removeToken,
  updateChipValues,
  updateChipOperator,
  insertConnectorToken,
  insertParenToken,
  toggleConnectorType,
  tokenAutoUpgradeOperator,
  countChipTokens,
  clearAllTokens,
} from "../token-utils";
import type {
  Token,
  TokenFilterState,
  FilterChipToken,
  AndToken,
  OrToken,
  OpenParenToken,
  CloseParenToken,
} from "@/types/tokens";
import {
  isChipToken,
  isConnectorToken,
  isOpenParen,
  isCloseParen,
  isAndToken,
  isOrToken,
  isParenToken,
} from "@/types/tokens";
import { generateTokenId, generatePairId } from "../token-parser";

function chip(
  field: string,
  values: string[],
  operator: string = "is",
  id?: string,
): FilterChipToken {
  return {
    type: "filter_chip",
    id: id ?? generateTokenId(),
    field,
    fieldLabel: field,
    operator: operator as FilterChipToken["operator"],
    values,
  };
}

function andTok(id?: string): AndToken {
  return { type: "and", id: id ?? generateTokenId() };
}

function orTok(id?: string): OrToken {
  return { type: "or", id: id ?? generateTokenId() };
}

function openP(pairId: string, id?: string): OpenParenToken {
  return { type: "open_paren", id: id ?? generateTokenId(), pairId };
}

function closeP(pairId: string, id?: string): CloseParenToken {
  return { type: "close_paren", id: id ?? generateTokenId(), pairId };
}

describe("createEmptyTokenState", () => {
  it("creates state with empty tokens array", () => {
    const state = createEmptyTokenState();
    expect(state.tokens).toEqual([]);
  });
});

describe("addChipToken", () => {
  it("adds first chip without connector", () => {
    const state = createEmptyTokenState();
    const result = addChipToken(state, "status", ["Blocked"]);

    expect(result.tokens).toHaveLength(1);
    expect(isChipToken(result.tokens[0])).toBe(true);
    expect((result.tokens[0] as FilterChipToken).field).toBe("status");
  });

  it("adds second chip with AND connector", () => {
    let state = createEmptyTokenState();
    state = addChipToken(state, "status", ["Blocked"]);
    state = addChipToken(state, "type", ["XSS"]);

    expect(state.tokens).toHaveLength(3);
    expect(isChipToken(state.tokens[0])).toBe(true);
    expect(isAndToken(state.tokens[1])).toBe(true);
    expect(isChipToken(state.tokens[2])).toBe(true);
  });

  it("uses default operator for field type", () => {
    const state = createEmptyTokenState();
    const result = addChipToken(state, "host", ["api"]);

    const c = result.tokens[0] as FilterChipToken;
    expect(c.operator).toBe("contains"); // text field default
  });

  it("uses provided operator", () => {
    const state = createEmptyTokenState();
    const result = addChipToken(state, "status", ["Blocked"], "is_not");

    const c = result.tokens[0] as FilterChipToken;
    expect(c.operator).toBe("is_not");
  });

  it("does not add connector after open paren", () => {
    const pairId = generatePairId();
    const state: TokenFilterState = {
      tokens: [openP(pairId)],
    };
    const result = addChipToken(state, "status", ["Blocked"]);

    expect(result.tokens).toHaveLength(2);
    expect(isOpenParen(result.tokens[0])).toBe(true);
    expect(isChipToken(result.tokens[1])).toBe(true);
  });
});

describe("removeToken", () => {
  it("returns unchanged state when token not found", () => {
    const state: TokenFilterState = { tokens: [chip("status", ["Blocked"])] };
    const result = removeToken(state, "nonexistent");
    expect(result.tokens).toHaveLength(1);
  });

  describe("chip removal", () => {
    it("removes single chip (no connector cascade needed)", () => {
      const c = chip("status", ["Blocked"]);
      const state: TokenFilterState = { tokens: [c] };
      const result = removeToken(state, c.id);
      expect(result.tokens).toHaveLength(0);
    });

    it("removes chip + left adjacent connector", () => {
      const c1 = chip("status", ["Blocked"]);
      const a = andTok();
      const c2 = chip("type", ["XSS"]);
      const state: TokenFilterState = { tokens: [c1, a, c2] };

      const result = removeToken(state, c2.id);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].id).toBe(c1.id);
    });

    it("removes chip + right adjacent connector (when no left connector)", () => {
      const c1 = chip("status", ["Blocked"]);
      const a = andTok();
      const c2 = chip("type", ["XSS"]);
      const state: TokenFilterState = { tokens: [c1, a, c2] };

      const result = removeToken(state, c1.id);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].id).toBe(c2.id);
    });

    it("removes middle chip + one adjacent connector from A AND B AND C", () => {
      const c1 = chip("status", ["Blocked"]);
      const a1 = andTok();
      const c2 = chip("type", ["XSS"]);
      const a2 = andTok();
      const c3 = chip("impact", ["High"]);
      const state: TokenFilterState = { tokens: [c1, a1, c2, a2, c3] };

      const result = removeToken(state, c2.id);
      expect(result.tokens).toHaveLength(3); // c1 AND c3
      expect(result.tokens.filter(isChipToken)).toHaveLength(2);
      expect(result.tokens.filter(isAndToken)).toHaveLength(1);
    });
  });

  describe("chip removal inside paren group", () => {
    it("removes chip from 2-chip group → collapses parens + keeps remaining chip", () => {
      const pId = generatePairId();
      const c1 = chip("status", ["Blocked"]);
      const o = orTok();
      const c2 = chip("type", ["XSS"]);
      const state: TokenFilterState = {
        tokens: [openP(pId), c1, o, c2, closeP(pId)],
      };

      const result = removeToken(state, c1.id);
      // Should keep only c2 (no parens, no connector)
      expect(result.tokens).toHaveLength(1);
      expect(isChipToken(result.tokens[0])).toBe(true);
      expect(result.tokens[0].id).toBe(c2.id);
    });
  });

  describe("connector removal", () => {
    it("removes connector without cascade", () => {
      const c1 = chip("status", ["Blocked"]);
      const a = andTok();
      const c2 = chip("type", ["XSS"]);
      const state: TokenFilterState = { tokens: [c1, a, c2] };

      const result = removeToken(state, a.id);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens.every(isChipToken)).toBe(true);
    });
  });

  describe("paren removal", () => {
    it("removes both parens with matching pairId", () => {
      const pId = generatePairId();
      const op = openP(pId);
      const c1 = chip("status", ["Blocked"]);
      const o = orTok();
      const c2 = chip("type", ["XSS"]);
      const cp = closeP(pId);
      const state: TokenFilterState = { tokens: [op, c1, o, c2, cp] };

      const result = removeToken(state, op.id);
      // Should remove both parens, keep chips and connector
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens.every((t) => !isParenToken(t))).toBe(true);
    });
  });
});

describe("updateChipValues", () => {
  it("updates values for matching chip", () => {
    const c = chip("status", ["Blocked"]);
    const state: TokenFilterState = { tokens: [c] };
    const result = updateChipValues(state, c.id, ["Monitored"]);

    expect((result.tokens[0] as FilterChipToken).values).toEqual(["Monitored"]);
  });

  it("auto-upgrades operator for multiple values", () => {
    const c = chip("status", ["Blocked"]);
    const state: TokenFilterState = { tokens: [c] };
    const result = updateChipValues(state, c.id, ["Blocked", "Monitored"]);

    const updated = result.tokens[0] as FilterChipToken;
    expect(updated.operator).toBe("is_any_of");
    expect(updated.values).toEqual(["Blocked", "Monitored"]);
  });

  it("auto-downgrades operator for single value", () => {
    const c = chip("status", ["Blocked", "Monitored"], "is_any_of");
    const state: TokenFilterState = { tokens: [c] };
    const result = updateChipValues(state, c.id, ["Blocked"]);

    expect((result.tokens[0] as FilterChipToken).operator).toBe("is");
  });

  it("removes chip when values are empty", () => {
    const c = chip("status", ["Blocked"]);
    const state: TokenFilterState = { tokens: [c] };
    const result = updateChipValues(state, c.id, []);

    expect(result.tokens).toHaveLength(0);
  });
});

describe("updateChipOperator", () => {
  it("updates operator for matching chip", () => {
    const c = chip("status", ["Blocked"]);
    const state: TokenFilterState = { tokens: [c] };
    const result = updateChipOperator(state, c.id, "is_not");

    expect((result.tokens[0] as FilterChipToken).operator).toBe("is_not");
  });

  it("does not affect other tokens", () => {
    const c1 = chip("status", ["Blocked"]);
    const a = andTok();
    const c2 = chip("type", ["XSS"]);
    const state: TokenFilterState = { tokens: [c1, a, c2] };
    const result = updateChipOperator(state, c1.id, "is_not");

    expect((result.tokens[0] as FilterChipToken).operator).toBe("is_not");
    expect((result.tokens[2] as FilterChipToken).operator).toBe("is");
  });
});

describe("insertConnectorToken", () => {
  it("inserts AND token", () => {
    const state: TokenFilterState = { tokens: [chip("status", ["Blocked"])] };
    const result = insertConnectorToken(state, "and");

    expect(result.tokens).toHaveLength(2);
    expect(isAndToken(result.tokens[1])).toBe(true);
  });

  it("inserts OR token", () => {
    const state: TokenFilterState = { tokens: [chip("status", ["Blocked"])] };
    const result = insertConnectorToken(state, "or");

    expect(result.tokens).toHaveLength(2);
    expect(isOrToken(result.tokens[1])).toBe(true);
  });
});

describe("insertParenToken", () => {
  it("inserts open paren with new pairId", () => {
    const state = createEmptyTokenState();
    const result = insertParenToken(state, "open_paren");

    expect(result.tokens).toHaveLength(1);
    expect(isOpenParen(result.tokens[0])).toBe(true);
    expect((result.tokens[0] as OpenParenToken).pairId).toBeTruthy();
  });

  it("inserts close paren matching most recent open paren", () => {
    const pId = generatePairId();
    const state: TokenFilterState = {
      tokens: [openP(pId), chip("status", ["Blocked"])],
    };
    const result = insertParenToken(state, "close_paren");

    expect(result.tokens).toHaveLength(3);
    expect(isCloseParen(result.tokens[2])).toBe(true);
    expect((result.tokens[2] as CloseParenToken).pairId).toBe(pId);
  });
});

describe("toggleConnectorType", () => {
  it("toggles AND to OR (wraps adjacent chips in parens)", () => {
    const c1 = chip("status", ["Blocked"]);
    const a = andTok();
    const c2 = chip("type", ["XSS"]);
    const state: TokenFilterState = { tokens: [c1, a, c2] };

    const result = toggleConnectorType(state, a.id);

    // Should now be: ( chip OR chip )
    expect(result.tokens.some(isOpenParen)).toBe(true);
    expect(result.tokens.some(isOrToken)).toBe(true);
    expect(result.tokens.some(isCloseParen)).toBe(true);
  });

  it("toggles OR to AND inside parens (unwraps if only OR)", () => {
    const pId = generatePairId();
    const c1 = chip("status", ["Blocked"]);
    const o = orTok();
    const c2 = chip("type", ["XSS"]);
    const state: TokenFilterState = {
      tokens: [openP(pId), c1, o, c2, closeP(pId)],
    };

    const result = toggleConnectorType(state, o.id);

    // Should unwrap: chip AND chip (no parens)
    expect(result.tokens.some(isOpenParen)).toBe(false);
    expect(result.tokens.some(isCloseParen)).toBe(false);
    expect(result.tokens.some(isAndToken)).toBe(true);
    expect(result.tokens.filter(isChipToken)).toHaveLength(2);
  });

  it("returns unchanged for non-connector token", () => {
    const c = chip("status", ["Blocked"]);
    const state: TokenFilterState = { tokens: [c] };
    const result = toggleConnectorType(state, c.id);
    expect(result).toBe(state);
  });

  it("returns unchanged for nonexistent token", () => {
    const state: TokenFilterState = { tokens: [chip("status", ["Blocked"])] };
    const result = toggleConnectorType(state, "nonexistent");
    expect(result).toBe(state);
  });
});

describe("tokenAutoUpgradeOperator", () => {
  it("upgrades is → is_any_of for 2+ values", () => {
    expect(tokenAutoUpgradeOperator("is", 2)).toBe("is_any_of");
  });

  it("upgrades is_not → is_none_of for 2+ values", () => {
    expect(tokenAutoUpgradeOperator("is_not", 2)).toBe("is_none_of");
  });

  it("downgrades is_any_of → is for 1 value", () => {
    expect(tokenAutoUpgradeOperator("is_any_of", 1)).toBe("is");
  });

  it("downgrades is_none_of → is_not for 1 value", () => {
    expect(tokenAutoUpgradeOperator("is_none_of", 1)).toBe("is_not");
  });

  it("leaves contains unchanged", () => {
    expect(tokenAutoUpgradeOperator("contains", 1)).toBe("contains");
    expect(tokenAutoUpgradeOperator("contains", 3)).toBe("contains");
  });

  it("leaves date operators unchanged", () => {
    expect(tokenAutoUpgradeOperator("before", 1)).toBe("before");
    expect(tokenAutoUpgradeOperator("in_the_last", 1)).toBe("in_the_last");
  });
});

describe("countChipTokens", () => {
  it("returns 0 for empty state", () => {
    expect(countChipTokens(createEmptyTokenState())).toBe(0);
  });

  it("counts only chip tokens", () => {
    const state: TokenFilterState = {
      tokens: [
        chip("status", ["Blocked"]),
        andTok(),
        chip("type", ["XSS"]),
      ],
    };
    expect(countChipTokens(state)).toBe(2);
  });

  it("counts chips inside parens", () => {
    const pId = generatePairId();
    const state: TokenFilterState = {
      tokens: [
        openP(pId),
        chip("status", ["Blocked"]),
        orTok(),
        chip("type", ["XSS"]),
        closeP(pId),
      ],
    };
    expect(countChipTokens(state)).toBe(2);
  });
});

describe("clearAllTokens", () => {
  it("returns empty state", () => {
    const result = clearAllTokens();
    expect(result.tokens).toHaveLength(0);
  });
});
