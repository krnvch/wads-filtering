import { describe, it, expect } from "vitest";
import {
  tokensToExpressionTree,
  expressionTreeToTokens,
  generateTokenId,
  generatePairId,
} from "../token-parser";
import type {
  Token,
  FilterChipToken,
  AndToken,
  OrToken,
  OpenParenToken,
  CloseParenToken,
} from "@/types/tokens";
import type { FilterGroup, FilterCondition } from "@/types/filters";
import { isFilterCondition, isFilterGroup } from "@/types/filters";

// Helper to create chip tokens for tests
function chip(
  field: string,
  values: string[],
  operator: string = "is",
): FilterChipToken {
  return {
    type: "filter_chip",
    id: generateTokenId(),
    field,
    fieldLabel: field,
    operator: operator as FilterChipToken["operator"],
    values,
  };
}

function and(): AndToken {
  return { type: "and", id: generateTokenId() };
}

function or(): OrToken {
  return { type: "or", id: generateTokenId() };
}

function openParen(pairId: string): OpenParenToken {
  return { type: "open_paren", id: generateTokenId(), pairId };
}

function closeParen(pairId: string): CloseParenToken {
  return { type: "close_paren", id: generateTokenId(), pairId };
}

describe("tokensToExpressionTree", () => {
  it("returns empty root for empty tokens", () => {
    const tree = tokensToExpressionTree([]);
    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(0);
  });

  it("converts single chip to single-condition AND group", () => {
    const tokens: Token[] = [chip("status", ["Blocked"])];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(1);
    expect(isFilterCondition(tree.children[0])).toBe(true);

    const cond = tree.children[0] as FilterCondition;
    expect(cond.field).toBe("status");
    expect(cond.values).toEqual(["Blocked"]);
  });

  it("converts A AND B to AND group with 2 children", () => {
    const tokens: Token[] = [
      chip("status", ["Blocked"]),
      and(),
      chip("type", ["XSS"]),
    ];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(2);

    const c1 = tree.children[0] as FilterCondition;
    const c2 = tree.children[1] as FilterCondition;
    expect(c1.field).toBe("status");
    expect(c2.field).toBe("type");
  });

  it("converts ( A OR B ) to AND group containing OR subgroup", () => {
    const pId = generatePairId();
    const tokens: Token[] = [
      openParen(pId),
      chip("status", ["Blocked"]),
      or(),
      chip("type", ["XSS"]),
      closeParen(pId),
    ];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(1);
    expect(isFilterGroup(tree.children[0])).toBe(true);

    const orGroup = tree.children[0] as FilterGroup;
    expect(orGroup.connector).toBe("OR");
    expect(orGroup.children).toHaveLength(2);
  });

  it("converts ( A OR B ) AND C correctly", () => {
    const pId = generatePairId();
    const tokens: Token[] = [
      openParen(pId),
      chip("status", ["Blocked"]),
      or(),
      chip("type", ["XSS"]),
      closeParen(pId),
      and(),
      chip("impact", ["High"]),
    ];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(2);

    expect(isFilterGroup(tree.children[0])).toBe(true);
    const orGroup = tree.children[0] as FilterGroup;
    expect(orGroup.connector).toBe("OR");
    expect(orGroup.children).toHaveLength(2);

    expect(isFilterCondition(tree.children[1])).toBe(true);
    const cond = tree.children[1] as FilterCondition;
    expect(cond.field).toBe("impact");
  });

  it("converts A AND ( B OR C ) AND D correctly", () => {
    const pId = generatePairId();
    const tokens: Token[] = [
      chip("status", ["Blocked"]),
      and(),
      openParen(pId),
      chip("type", ["XSS"]),
      or(),
      chip("type", ["CSRF"]),
      closeParen(pId),
      and(),
      chip("impact", ["High"]),
    ];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(3);

    expect(isFilterCondition(tree.children[0])).toBe(true);
    expect(isFilterGroup(tree.children[1])).toBe(true);
    expect(isFilterCondition(tree.children[2])).toBe(true);

    const orGroup = tree.children[1] as FilterGroup;
    expect(orGroup.connector).toBe("OR");
    expect(orGroup.children).toHaveLength(2);
  });

  it("handles multiple chips without explicit connectors (implicit AND)", () => {
    const tokens: Token[] = [
      chip("status", ["Blocked"]),
      chip("type", ["XSS"]),
    ];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(2);
  });

  it("handles empty parens gracefully", () => {
    const pId = generatePairId();
    const tokens: Token[] = [openParen(pId), closeParen(pId)];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.connector).toBe("AND");
    expect(tree.children).toHaveLength(0);
  });

  it("handles single chip in parens", () => {
    const pId = generatePairId();
    const tokens: Token[] = [
      openParen(pId),
      chip("status", ["Blocked"]),
      closeParen(pId),
    ];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.children).toHaveLength(1);
    expect(isFilterCondition(tree.children[0])).toBe(true);
  });

  it("preserves operator from chip token", () => {
    const tokens: Token[] = [chip("status", ["Blocked", "Monitored"], "is_any_of")];
    const tree = tokensToExpressionTree(tokens);

    const cond = tree.children[0] as FilterCondition;
    expect(cond.operator).toBe("is_any_of");
    expect(cond.values).toEqual(["Blocked", "Monitored"]);
  });

  it("handles nested parens ( ( A OR B ) AND C )", () => {
    const outerPairId = generatePairId();
    const innerPairId = generatePairId();
    const tokens: Token[] = [
      openParen(outerPairId),
      openParen(innerPairId),
      chip("status", ["Blocked"]),
      or(),
      chip("status", ["Monitored"]),
      closeParen(innerPairId),
      and(),
      chip("type", ["XSS"]),
      closeParen(outerPairId),
    ];
    const tree = tokensToExpressionTree(tokens);

    expect(tree.children).toHaveLength(1);
    // The outer paren creates an AND group
    const outerGroup = tree.children[0] as FilterGroup;
    expect(outerGroup.connector).toBe("AND");
    expect(outerGroup.children).toHaveLength(2);
  });

  it("handles unmatched close paren gracefully (no throw)", () => {
    const tokens: Token[] = [
      chip("status", ["Blocked"]),
      closeParen("orphan"),
    ];

    // Should not throw
    const tree = tokensToExpressionTree(tokens);
    expect(tree.children.length).toBeGreaterThanOrEqual(1);
  });
});

describe("expressionTreeToTokens", () => {
  it("converts empty tree to empty tokens", () => {
    const tree: FilterGroup = { id: "root", connector: "AND", children: [] };
    const tokens = expressionTreeToTokens(tree);
    expect(tokens).toHaveLength(0);
  });

  it("converts single condition to single chip token", () => {
    const tree: FilterGroup = {
      id: "root",
      connector: "AND",
      children: [
        { id: "1", field: "status", fieldLabel: "Status", operator: "is", values: ["Blocked"] },
      ],
    };
    const tokens = expressionTreeToTokens(tree);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("filter_chip");
  });

  it("converts 2 AND conditions to chip AND chip", () => {
    const tree: FilterGroup = {
      id: "root",
      connector: "AND",
      children: [
        { id: "1", field: "status", fieldLabel: "Status", operator: "is", values: ["Blocked"] },
        { id: "2", field: "type", fieldLabel: "Type", operator: "is", values: ["XSS"] },
      ],
    };
    const tokens = expressionTreeToTokens(tree);
    expect(tokens).toHaveLength(3); // chip AND chip
    expect(tokens[0].type).toBe("filter_chip");
    expect(tokens[1].type).toBe("and");
    expect(tokens[2].type).toBe("filter_chip");
  });

  it("converts OR group to ( chip OR chip )", () => {
    const tree: FilterGroup = {
      id: "root",
      connector: "AND",
      children: [
        {
          id: "g1",
          connector: "OR",
          children: [
            { id: "1", field: "status", fieldLabel: "Status", operator: "is", values: ["Blocked"] },
            { id: "2", field: "type", fieldLabel: "Type", operator: "is", values: ["XSS"] },
          ],
        },
      ],
    };
    const tokens = expressionTreeToTokens(tree);
    expect(tokens).toHaveLength(5); // ( chip OR chip )
    expect(tokens[0].type).toBe("open_paren");
    expect(tokens[1].type).toBe("filter_chip");
    expect(tokens[2].type).toBe("or");
    expect(tokens[3].type).toBe("filter_chip");
    expect(tokens[4].type).toBe("close_paren");
  });

  it("converts ( A OR B ) AND C correctly", () => {
    const tree: FilterGroup = {
      id: "root",
      connector: "AND",
      children: [
        {
          id: "g1",
          connector: "OR",
          children: [
            { id: "1", field: "status", fieldLabel: "Status", operator: "is", values: ["Blocked"] },
            { id: "2", field: "type", fieldLabel: "Type", operator: "is", values: ["XSS"] },
          ],
        },
        { id: "3", field: "impact", fieldLabel: "Impact", operator: "is", values: ["High"] },
      ],
    };
    const tokens = expressionTreeToTokens(tree);
    // ( chip OR chip ) AND chip = 7 tokens
    expect(tokens).toHaveLength(7);
    expect(tokens[0].type).toBe("open_paren");
    expect(tokens[4].type).toBe("close_paren");
    expect(tokens[5].type).toBe("and");
    expect(tokens[6].type).toBe("filter_chip");
  });

  it("preserves pairId on parens", () => {
    const tree: FilterGroup = {
      id: "root",
      connector: "AND",
      children: [
        {
          id: "g1",
          connector: "OR",
          children: [
            { id: "1", field: "status", fieldLabel: "Status", operator: "is", values: ["Blocked"] },
            { id: "2", field: "type", fieldLabel: "Type", operator: "is", values: ["XSS"] },
          ],
        },
      ],
    };
    const tokens = expressionTreeToTokens(tree);

    const openParen = tokens[0] as OpenParenToken;
    const closeParen = tokens[4] as CloseParenToken;
    expect(openParen.pairId).toBe(closeParen.pairId);
  });
});

describe("round-trip: tokens → tree → tokens", () => {
  it("preserves single chip", () => {
    const original: Token[] = [chip("status", ["Blocked"])];
    const tree = tokensToExpressionTree(original);
    const result = expressionTreeToTokens(tree);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("filter_chip");
    expect((result[0] as FilterChipToken).field).toBe("status");
  });

  it("preserves A AND B", () => {
    const original: Token[] = [
      chip("status", ["Blocked"]),
      and(),
      chip("type", ["XSS"]),
    ];
    const tree = tokensToExpressionTree(original);
    const result = expressionTreeToTokens(tree);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("filter_chip");
    expect(result[1].type).toBe("and");
    expect(result[2].type).toBe("filter_chip");
  });

  it("preserves ( A OR B ) AND C", () => {
    const pId = generatePairId();
    const original: Token[] = [
      openParen(pId),
      chip("status", ["Blocked"]),
      or(),
      chip("type", ["XSS"]),
      closeParen(pId),
      and(),
      chip("impact", ["High"]),
    ];
    const tree = tokensToExpressionTree(original);
    const result = expressionTreeToTokens(tree);

    // Structural equivalence: same shape
    expect(result).toHaveLength(7); // ( chip OR chip ) AND chip
    expect(result[0].type).toBe("open_paren");
    expect(result[2].type).toBe("or");
    expect(result[4].type).toBe("close_paren");
    expect(result[5].type).toBe("and");
  });
});

describe("generateTokenId", () => {
  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTokenId()));
    expect(ids.size).toBe(100);
  });
});

describe("generatePairId", () => {
  it("returns unique pair IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePairId()));
    expect(ids.size).toBe(100);
  });
});
