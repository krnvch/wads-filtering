import { describe, it, expect } from "vitest";
import {
  serializeTokens,
  deserializeTokens,
  isLegacyUrlFormat,
  migrateLegacyToTokens,
} from "../token-url";
import type {
  Token,
  FilterChipToken,
  AndToken,
  OrToken,
  OpenParenToken,
  CloseParenToken,
} from "@/types/tokens";
import { isChipToken, isAndToken, isOrToken, isOpenParen, isCloseParen } from "@/types/tokens";
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

describe("serializeTokens", () => {
  it("returns empty string for empty tokens", () => {
    expect(serializeTokens([])).toBe("");
  });

  it("serializes single chip", () => {
    const result = serializeTokens([chip("status", ["Blocked"])]);
    expect(result).toBe("status.is.Blocked");
  });

  it("serializes chip with multiple values", () => {
    const result = serializeTokens([
      chip("status", ["Blocked", "Monitored"], "is_any_of"),
    ]);
    expect(result).toBe("status.is_any_of.Blocked,Monitored");
  });

  it("serializes A AND B", () => {
    const result = serializeTokens([
      chip("status", ["Blocked"]),
      andTok(),
      chip("type", ["XSS"]),
    ]);
    expect(result).toBe("status.is.Blocked~AND~type.is.XSS");
  });

  it("serializes ( A OR B )", () => {
    const pId = generatePairId();
    const result = serializeTokens([
      openP(pId),
      chip("status", ["Blocked"]),
      orTok(),
      chip("type", ["XSS"]),
      closeP(pId),
    ]);
    expect(result).toBe("(~status.is.Blocked~OR~type.is.XSS~)");
  });

  it("serializes ( A OR B ) AND C", () => {
    const pId = generatePairId();
    const result = serializeTokens([
      openP(pId),
      chip("status", ["Blocked"]),
      orTok(),
      chip("type", ["XSS"]),
      closeP(pId),
      andTok(),
      chip("impact", ["High"]),
    ]);
    expect(result).toBe(
      "(~status.is.Blocked~OR~type.is.XSS~)~AND~impact.is.High",
    );
  });

  it("encodes values with special characters", () => {
    const result = serializeTokens([
      chip("host", ["api.example.com"], "contains"),
    ]);
    expect(result).toBe("host.contains.api%2Eexample%2Ecom");
  });

  it("encodes values with tildes", () => {
    const result = serializeTokens([
      chip("parameter", ["~test~"], "contains"),
    ]);
    expect(result).toBe("parameter.contains.%7Etest%7E");
  });

  it("encodes values with commas", () => {
    const result = serializeTokens([
      chip("endpoints", ["a,b"], "is"),
    ]);
    expect(result).toBe("endpoints.is.a%2Cb");
  });

  it("serializes unary operator with no values", () => {
    const result = serializeTokens([
      chip("status", [], "is_set"),
    ]);
    expect(result).toBe("status.is_set.");
  });
});

describe("deserializeTokens", () => {
  it("returns empty for empty string", () => {
    expect(deserializeTokens("")).toHaveLength(0);
  });

  it("returns empty for whitespace", () => {
    expect(deserializeTokens("   ")).toHaveLength(0);
  });

  it("deserializes single chip", () => {
    const tokens = deserializeTokens("status.is.Blocked");
    expect(tokens).toHaveLength(1);
    expect(isChipToken(tokens[0])).toBe(true);
    const c = tokens[0] as FilterChipToken;
    expect(c.field).toBe("status");
    expect(c.operator).toBe("is");
    expect(c.values).toEqual(["Blocked"]);
  });

  it("deserializes chip with multiple values", () => {
    const tokens = deserializeTokens("status.is_any_of.Blocked,Monitored");
    expect(tokens).toHaveLength(1);
    const c = tokens[0] as FilterChipToken;
    expect(c.operator).toBe("is_any_of");
    expect(c.values).toEqual(["Blocked", "Monitored"]);
  });

  it("deserializes A AND B", () => {
    const tokens = deserializeTokens("status.is.Blocked~AND~type.is.XSS");
    expect(tokens).toHaveLength(3);
    expect(isChipToken(tokens[0])).toBe(true);
    expect(isAndToken(tokens[1])).toBe(true);
    expect(isChipToken(tokens[2])).toBe(true);
  });

  it("deserializes ( A OR B )", () => {
    const tokens = deserializeTokens("(~status.is.Blocked~OR~type.is.XSS~)");
    expect(tokens).toHaveLength(5);
    expect(isOpenParen(tokens[0])).toBe(true);
    expect(isChipToken(tokens[1])).toBe(true);
    expect(isOrToken(tokens[2])).toBe(true);
    expect(isChipToken(tokens[3])).toBe(true);
    expect(isCloseParen(tokens[4])).toBe(true);
  });

  it("matches pairIds for parens", () => {
    const tokens = deserializeTokens("(~status.is.Blocked~OR~type.is.XSS~)");
    const open = tokens[0] as OpenParenToken;
    const close = tokens[4] as CloseParenToken;
    expect(open.pairId).toBe(close.pairId);
  });

  it("decodes special characters in values", () => {
    const tokens = deserializeTokens("host.contains.api%2Eexample%2Ecom");
    const c = tokens[0] as FilterChipToken;
    expect(c.values).toEqual(["api.example.com"]);
  });

  it("decodes tildes in values", () => {
    const tokens = deserializeTokens("parameter.contains.%7Etest%7E");
    const c = tokens[0] as FilterChipToken;
    expect(c.values).toEqual(["~test~"]);
  });

  it("decodes commas in values", () => {
    const tokens = deserializeTokens("endpoints.is.a%2Cb");
    const c = tokens[0] as FilterChipToken;
    expect(c.values).toEqual(["a,b"]);
  });

  it("handles unary operator with empty values", () => {
    const tokens = deserializeTokens("status.is_set.");
    expect(tokens).toHaveLength(1);
    const c = tokens[0] as FilterChipToken;
    expect(c.operator).toBe("is_set");
    expect(c.values).toEqual([]);
  });

  it("handles nested parens", () => {
    const tokens = deserializeTokens(
      "(~(~status.is.Blocked~OR~type.is.XSS~)~AND~impact.is.High~)",
    );
    expect(tokens.length).toBeGreaterThanOrEqual(9);
    expect(isOpenParen(tokens[0])).toBe(true);
    expect(isOpenParen(tokens[1])).toBe(true);
  });
});

describe("round-trip: serialize → deserialize", () => {
  it("preserves single chip", () => {
    const original: Token[] = [chip("status", ["Blocked"])];
    const serialized = serializeTokens(original);
    const deserialized = deserializeTokens(serialized);

    expect(deserialized).toHaveLength(1);
    const c = deserialized[0] as FilterChipToken;
    expect(c.field).toBe("status");
    expect(c.values).toEqual(["Blocked"]);
  });

  it("preserves A AND B", () => {
    const original: Token[] = [
      chip("status", ["Blocked"]),
      andTok(),
      chip("type", ["XSS"]),
    ];
    const serialized = serializeTokens(original);
    const deserialized = deserializeTokens(serialized);

    expect(deserialized).toHaveLength(3);
    expect(isChipToken(deserialized[0])).toBe(true);
    expect(isAndToken(deserialized[1])).toBe(true);
    expect(isChipToken(deserialized[2])).toBe(true);
  });

  it("preserves complex expression with parens", () => {
    const pId = generatePairId();
    const original: Token[] = [
      openP(pId),
      chip("status", ["Blocked"]),
      orTok(),
      chip("type", ["XSS"]),
      closeP(pId),
      andTok(),
      chip("impact", ["High"]),
    ];
    const serialized = serializeTokens(original);
    const deserialized = deserializeTokens(serialized);

    expect(deserialized).toHaveLength(7);
    expect(isOpenParen(deserialized[0])).toBe(true);
    expect(isOrToken(deserialized[2])).toBe(true);
    expect(isCloseParen(deserialized[4])).toBe(true);
    expect(isAndToken(deserialized[5])).toBe(true);
  });

  it("round-trips IP filter values with dots", () => {
    const original: Token[] = [
      chip("sources.ips", ["44.209.156.240", "10.0.0.0/8"], "in"),
    ];
    const serialized = serializeTokens(original);
    const deserialized = deserializeTokens(serialized);

    expect(deserialized).toHaveLength(1);
    const c = deserialized[0] as FilterChipToken;
    expect(c.field).toBe("sources.ips");
    expect(c.operator).toBe("in");
    expect(c.values).toEqual(["44.209.156.240", "10.0.0.0/8"]);
  });

  it("preserves multi-value chips", () => {
    const original: Token[] = [
      chip("status", ["Blocked", "Monitored", "Started"], "is_any_of"),
    ];
    const serialized = serializeTokens(original);
    const deserialized = deserializeTokens(serialized);

    const c = deserialized[0] as FilterChipToken;
    expect(c.values).toEqual(["Blocked", "Monitored", "Started"]);
    expect(c.operator).toBe("is_any_of");
  });
});

describe("isLegacyUrlFormat", () => {
  it("returns false for empty params", () => {
    expect(isLegacyUrlFormat(new URLSearchParams())).toBe(false);
  });

  it("returns false when q param exists", () => {
    const params = new URLSearchParams("q=status.is.Blocked");
    expect(isLegacyUrlFormat(params)).toBe(false);
  });

  it("returns true for legacy field params", () => {
    const params = new URLSearchParams("status=Blocked");
    expect(isLegacyUrlFormat(params)).toBe(true);
  });

  it("returns true for legacy group params", () => {
    const params = new URLSearchParams("g1.status=Blocked&g1__op=OR");
    expect(isLegacyUrlFormat(params)).toBe(true);
  });

  it("returns false for unknown params", () => {
    const params = new URLSearchParams("foo=bar");
    expect(isLegacyUrlFormat(params)).toBe(false);
  });
});

describe("migrateLegacyToTokens", () => {
  it("migrates single field param", () => {
    const params = new URLSearchParams("status=Blocked");
    const tokens = migrateLegacyToTokens(params);

    expect(tokens.length).toBeGreaterThanOrEqual(1);
    const chips = tokens.filter(isChipToken);
    expect(chips).toHaveLength(1);
    expect(chips[0].field).toBe("status");
    expect(chips[0].values).toEqual(["Blocked"]);
  });

  it("migrates multiple field params (AND)", () => {
    const params = new URLSearchParams("status=Blocked&type=XSS");
    const tokens = migrateLegacyToTokens(params);

    const chips = tokens.filter(isChipToken);
    expect(chips).toHaveLength(2);
  });

  it("migrates group params (OR)", () => {
    const params = new URLSearchParams(
      "g1.status=Blocked&g1.type=XSS&g1__op=OR",
    );
    const tokens = migrateLegacyToTokens(params);

    // Should contain ( chip OR chip )
    expect(tokens.some(isOpenParen)).toBe(true);
    expect(tokens.some(isOrToken)).toBe(true);
    expect(tokens.some(isCloseParen)).toBe(true);
  });
});
