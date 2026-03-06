import { describe, it, expect } from "vitest";
import {
  validateTokens,
  hasTokenErrors,
  getTokenErrorSummary,
} from "../token-validation";
import type {
  Token,
  FilterChipToken,
  AndToken,
  OrToken,
  OpenParenToken,
  CloseParenToken,
} from "@/types/tokens";
import { generateTokenId, generatePairId } from "../token-parser";

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

function andTok(): AndToken {
  return { type: "and", id: generateTokenId() };
}

function orTok(): OrToken {
  return { type: "or", id: generateTokenId() };
}

function openP(pairId: string): OpenParenToken {
  return { type: "open_paren", id: generateTokenId(), pairId };
}

function closeP(pairId: string): CloseParenToken {
  return { type: "close_paren", id: generateTokenId(), pairId };
}

describe("validateTokens", () => {
  it("returns empty for empty tokens", () => {
    const result = validateTokens([]);
    expect(result).toHaveLength(0);
  });

  it("returns no errors for valid single chip", () => {
    const result = validateTokens([chip("status", ["Blocked"])]);
    expect(hasTokenErrors(result)).toBe(false);
  });

  it("returns no errors for valid A AND B", () => {
    const tokens: Token[] = [
      chip("status", ["Blocked"]),
      andTok(),
      chip("type", ["XSS"]),
    ];
    const result = validateTokens(tokens);
    expect(hasTokenErrors(result)).toBe(false);
  });

  it("returns no errors for valid ( A OR B )", () => {
    const pId = generatePairId();
    const tokens: Token[] = [
      openP(pId),
      chip("status", ["Blocked"]),
      orTok(),
      chip("type", ["XSS"]),
      closeP(pId),
    ];
    const result = validateTokens(tokens);
    expect(hasTokenErrors(result)).toBe(false);
  });

  describe("TOP_LEVEL_OR", () => {
    it("flags OR at top level", () => {
      const tokens: Token[] = [
        chip("status", ["Blocked"]),
        orTok(),
        chip("type", ["XSS"]),
      ];
      const result = validateTokens(tokens);
      expect(result[1].error?.code).toBe("TOP_LEVEL_OR");
    });

    it("does not flag OR inside parens", () => {
      const pId = generatePairId();
      const tokens: Token[] = [
        openP(pId),
        chip("status", ["Blocked"]),
        orTok(),
        chip("type", ["XSS"]),
        closeP(pId),
      ];
      const result = validateTokens(tokens);
      expect(result[2].error).toBeUndefined();
    });
  });

  describe("UNBALANCED_PAREN", () => {
    it("flags unmatched open paren", () => {
      const pId = generatePairId();
      const tokens: Token[] = [openP(pId), chip("status", ["Blocked"])];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("UNBALANCED_PAREN");
    });

    it("flags unmatched close paren", () => {
      const pId = generatePairId();
      const tokens: Token[] = [chip("status", ["Blocked"]), closeP(pId)];
      const result = validateTokens(tokens);
      expect(result[1].error?.code).toBe("UNBALANCED_PAREN");
    });

    it("no error for matched parens", () => {
      const pId = generatePairId();
      const tokens: Token[] = [
        openP(pId),
        chip("status", ["Blocked"]),
        orTok(),
        chip("type", ["XSS"]),
        closeP(pId),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
      expect(result[4].error).toBeUndefined();
    });
  });

  describe("CONSECUTIVE_CONNECTOR", () => {
    it("flags two connectors in a row", () => {
      const tokens: Token[] = [
        chip("status", ["Blocked"]),
        andTok(),
        andTok(),
        chip("type", ["XSS"]),
      ];
      const result = validateTokens(tokens);
      expect(result[2].error?.code).toBe("CONSECUTIVE_CONNECTOR");
    });
  });

  describe("LEADING_CONNECTOR (tolerated)", () => {
    it("does not flag connector at start", () => {
      const tokens: Token[] = [andTok(), chip("status", ["Blocked"])];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
    });

    it("does not flag connector after open paren", () => {
      const pId = generatePairId();
      const tokens: Token[] = [
        openP(pId),
        andTok(),
        chip("status", ["Blocked"]),
        closeP(pId),
      ];
      const result = validateTokens(tokens);
      expect(result[1].error).toBeUndefined();
    });
  });

  describe("TRAILING_CONNECTOR (tolerated)", () => {
    it("does not flag connector at end", () => {
      const tokens: Token[] = [chip("status", ["Blocked"]), andTok()];
      const result = validateTokens(tokens);
      expect(result[1].error).toBeUndefined();
    });

    it("does not flag connector before close paren", () => {
      const pId = generatePairId();
      const tokens: Token[] = [
        openP(pId),
        chip("status", ["Blocked"]),
        orTok(),
        closeP(pId),
      ];
      const result = validateTokens(tokens);
      expect(result[2].error).toBeUndefined();
    });
  });

  describe("EMPTY_GROUP", () => {
    it("flags empty parens", () => {
      const pId = generatePairId();
      const tokens: Token[] = [openP(pId), closeP(pId)];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("EMPTY_GROUP");
      expect(result[1].error?.code).toBe("EMPTY_GROUP");
    });
  });

  describe("SINGLE_CHILD_GROUP", () => {
    it("flags parens with single chip", () => {
      const pId = generatePairId();
      const tokens: Token[] = [
        openP(pId),
        chip("status", ["Blocked"]),
        closeP(pId),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("SINGLE_CHILD_GROUP");
      expect(result[2].error?.code).toBe("SINGLE_CHILD_GROUP");
    });
  });

  describe("UNKNOWN_FIELD", () => {
    it("flags chip with unknown field", () => {
      const tokens: Token[] = [chip("nonexistent_field", ["val"])];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("UNKNOWN_FIELD");
    });
  });

  describe("INVALID_OPERATOR", () => {
    it("flags enum field with text-only operator", () => {
      const tokens: Token[] = [chip("status", ["Blocked"], "starts_with")];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("INVALID_OPERATOR");
    });
  });

  describe("EMPTY_VALUES", () => {
    it("flags chip with empty values for non-unary operator", () => {
      const tokens: Token[] = [chip("status", [], "is")];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("EMPTY_VALUES");
    });

    it("does not flag unary operator with empty values", () => {
      const tokens: Token[] = [chip("status", [], "is_set")];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
    });
  });

  describe("MISSING_CONNECTOR", () => {
    it("flags two adjacent chips without connector", () => {
      const tokens: Token[] = [
        chip("status", ["Blocked"]),
        chip("type", ["XSS"]),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("MISSING_CONNECTOR");
      expect(result[1].error?.code).toBe("MISSING_CONNECTOR");
    });

    it("flags chip after close paren without connector", () => {
      const pId = generatePairId();
      const tokens: Token[] = [
        openP(pId),
        chip("status", ["Blocked"]),
        orTok(),
        chip("type", ["XSS"]),
        closeP(pId),
        chip("impact", ["High"], "is"),
      ];
      const result = validateTokens(tokens);
      expect(result[4].error?.code).toBe("MISSING_CONNECTOR");
      expect(result[5].error?.code).toBe("MISSING_CONNECTOR");
    });

    it("no error when connector is present between chips", () => {
      const tokens: Token[] = [
        chip("status", ["Blocked"]),
        andTok(),
        chip("type", ["XSS"]),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
      expect(result[2].error).toBeUndefined();
    });
  });

  describe("INVALID_ENUM_VALUE", () => {
    it("flags enum chip with invalid value", () => {
      const tokens: Token[] = [chip("status", ["Blicked"])];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("INVALID_ENUM_VALUE");
      expect(result[0].error?.invalidValues).toEqual(["Blicked"]);
    });

    it("no error for valid enum value", () => {
      const tokens: Token[] = [chip("status", ["Blocked"])];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
    });

    it("flags only invalid values in multi-value enum", () => {
      const tokens: Token[] = [
        chip("status", ["Blocked", "Blicked", "Monitored"], "is_any_of"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("INVALID_ENUM_VALUE");
      expect(result[0].error?.invalidValues).toEqual(["Blicked"]);
    });
  });

  describe("INVALID_IP_VALUE", () => {
    it("flags IP chip with invalid value", () => {
      const tokens: Token[] = [
        chip("sources.ips", ["999.999.999.999"], "in"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("INVALID_IP_VALUE");
      expect(result[0].error?.invalidValues).toEqual(["999.999.999.999"]);
    });

    it("no error for valid IPv4", () => {
      const tokens: Token[] = [
        chip("sources.ips", ["192.168.1.1"], "in"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
    });

    it("no error for valid CIDR", () => {
      const tokens: Token[] = [
        chip("sources.ips", ["10.0.0.0/8"], "in"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
    });

    it("flags only invalid IPs in multi-value", () => {
      const tokens: Token[] = [
        chip("sources.ips", ["192.168.1.1", "not-an-ip", "10.0.0.0/8"], "in"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("INVALID_IP_VALUE");
      expect(result[0].error?.invalidValues).toEqual(["not-an-ip"]);
    });

    it("no error for valid IPv6", () => {
      const tokens: Token[] = [
        chip("sources.ips", ["2001:0db8:85a3:0000:0000:8a2e:0370:7334"], "in"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
    });

    it("no error for valid IPv6 with shorthand", () => {
      const tokens: Token[] = [
        chip("sources.ips", ["::1"], "in"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error).toBeUndefined();
    });

    it("flags invalid IPv6", () => {
      const tokens: Token[] = [
        chip("sources.ips", ["2001:gg:85a3::1"], "in"),
      ];
      const result = validateTokens(tokens);
      expect(result[0].error?.code).toBe("INVALID_IP_VALUE");
    });
  });

  it("does not mutate input tokens", () => {
    const tokens: Token[] = [
      chip("status", ["Blocked"]),
      orTok(),
      chip("type", ["XSS"]),
    ];
    const original = tokens.map((t) => ({ ...t }));
    validateTokens(tokens);
    expect(tokens).toEqual(original);
  });
});

describe("hasTokenErrors", () => {
  it("returns false for no errors", () => {
    const result = validateTokens([chip("status", ["Blocked"])]);
    expect(hasTokenErrors(result)).toBe(false);
  });

  it("returns true when errors exist", () => {
    const result = validateTokens([chip("nonexistent", ["val"])]);
    expect(hasTokenErrors(result)).toBe(true);
  });
});

describe("getTokenErrorSummary", () => {
  it("returns zero count for no errors", () => {
    const result = validateTokens([chip("status", ["Blocked"])]);
    const summary = getTokenErrorSummary(result);
    expect(summary.count).toBe(0);
    expect(summary.messages).toHaveLength(0);
  });

  it("returns correct count and messages", () => {
    const pId = generatePairId();
    const tokens: Token[] = [openP(pId)]; // unmatched paren
    const result = validateTokens(tokens);
    const summary = getTokenErrorSummary(result);
    expect(summary.count).toBeGreaterThan(0);
    expect(summary.messages.length).toBeGreaterThan(0);
  });
});
