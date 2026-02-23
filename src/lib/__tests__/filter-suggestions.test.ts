import { describe, it, expect } from "vitest";
import { generateSuggestions } from "../filter-suggestions";
import type { FilterFieldDef } from "@/types/filters";

const enumField: FilterFieldDef = {
  key: "status",
  label: "Status",
  category: "Attack characteristics",
  type: "enum",
  values: ["Blocked", "Monitored", "Started"],
};

const enumField2: FilterFieldDef = {
  key: "impact",
  label: "Impact",
  category: "Attack characteristics",
  type: "enum",
  values: ["High", "Medium", "Low"],
};

const enumField3: FilterFieldDef = {
  key: "type",
  label: "Attack type",
  category: "Attack characteristics",
  type: "enum",
  values: ["XSS", "SQL Injection", "BOLA Attack"],
};

const textField: FilterFieldDef = {
  key: "endpoints",
  label: "Endpoint",
  category: "Target & Context",
  type: "text",
};

const dateField: FilterFieldDef = {
  key: "timeline.last_seen",
  label: "Last seen",
  category: "Temporal",
  type: "date",
};

const numericField: FilterFieldDef = {
  key: "response_code",
  label: "Response code",
  category: "Attack characteristics",
  type: "numeric",
};

describe("generateSuggestions", () => {
  it("returns empty array when searchText is empty", () => {
    expect(generateSuggestions([enumField], "")).toEqual([]);
  });

  it("returns empty array when matchingFields is empty", () => {
    expect(generateSuggestions([], "test")).toEqual([]);
  });

  it("excludes numeric fields", () => {
    const result = generateSuggestions([numericField], "response");
    expect(result).toEqual([]);
  });

  it("generates enum suggestion with value-match boost", () => {
    const result = generateSuggestions([enumField], "blo");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: "status",
      fieldLabel: "Status",
      operator: "is",
      operatorLabel: "is",
      values: ["Blocked"],
    });
  });

  it("generates enum suggestion with first value as fallback", () => {
    const result = generateSuggestions([enumField], "sta");
    expect(result).toHaveLength(1);
    // "sta" matches "Status" label but also "Started" value
    // "Started" is a value match, so it gets boosted
    expect(result[0]).toEqual({
      field: "status",
      fieldLabel: "Status",
      operator: "is",
      operatorLabel: "is",
      values: ["Started"],
    });
  });

  it("enum fields without value match use first value", () => {
    // "impact" matches the label but no value contains "impact"
    const result = generateSuggestions([enumField2], "impact");
    expect(result).toHaveLength(1);
    expect(result[0].values).toEqual(["High"]);
  });

  it("generates date suggestion with in_the_last 7d", () => {
    const result = generateSuggestions([dateField], "last");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: "timeline.last_seen",
      fieldLabel: "Last seen",
      operator: "in_the_last",
      operatorLabel: "in the last",
      values: ["7d"],
    });
  });

  it("generates text suggestion with contains operator using search text", () => {
    const result = generateSuggestions([textField], "api");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: "endpoints",
      fieldLabel: "Endpoint",
      operator: "contains",
      operatorLabel: "contains",
      values: ["api"],
    });
  });

  it("excludes text fields when search is less than 2 chars", () => {
    const result = generateSuggestions([textField], "a");
    expect(result).toEqual([]);
  });

  it("includes text fields when search is exactly 2 chars", () => {
    const result = generateSuggestions([textField], "ap");
    expect(result).toHaveLength(1);
    expect(result[0].operator).toBe("contains");
  });

  it("respects maxSuggestions cap", () => {
    const result = generateSuggestions(
      [enumField, enumField2, enumField3, dateField, textField],
      "a", // matches multiple fields
      2,
    );
    expect(result).toHaveLength(2);
  });

  it("distributes across multiple fields (round-robin)", () => {
    const result = generateSuggestions(
      [enumField, enumField2, dateField],
      "a", // single char so text excluded
      3,
    );
    expect(result).toHaveLength(3);
    const fields = result.map((s) => s.field);
    // Each field appears exactly once
    expect(new Set(fields).size).toBe(3);
  });

  it("prioritizes enum value-match over enum without match", () => {
    // "blo" matches "Blocked" in enumField but not values of enumField2
    const result = generateSuggestions([enumField2, enumField], "blo");
    // enumField should come first because it has a value match
    expect(result[0].field).toBe("status");
    expect(result[0].values).toEqual(["Blocked"]);
  });

  it("prioritizes enum over date over text", () => {
    const result = generateSuggestions(
      [textField, dateField, enumField2],
      "im", // matches Impact label, 2 chars so text included
      3,
    );
    // enum first, then date, then text
    expect(result[0].field).toBe("impact");
    expect(result[0].operator).toBe("is");
    expect(result[1].field).toBe("timeline.last_seen");
    expect(result[1].operator).toBe("in_the_last");
    expect(result[2].field).toBe("endpoints");
    expect(result[2].operator).toBe("contains");
  });

  it("defaults maxSuggestions to 3", () => {
    const result = generateSuggestions(
      [enumField, enumField2, enumField3, dateField, textField],
      "at", // 2 chars, text included
    );
    expect(result).toHaveLength(3);
  });
});
