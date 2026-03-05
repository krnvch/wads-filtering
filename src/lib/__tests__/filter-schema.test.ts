import { describe, it, expect } from "vitest";
import {
  FILTER_FIELDS,
  getFieldByKey,
  getFieldsByCategory,
  getEnumFields,
  getDateFields,
  getNumericFields,
  getIpFields,
} from "../filter-schema";

describe("FILTER_FIELDS", () => {
  it("has 12 total fields", () => {
    expect(FILTER_FIELDS).toHaveLength(12);
  });

  it("has 6 Attack characteristics fields", () => {
    const fields = getFieldsByCategory("Attack characteristics");
    expect(fields).toHaveLength(6);
    expect(fields.map((f) => f.key)).toEqual([
      "type",
      "status",
      "blocking_status",
      "http_status_code",
      "impact",
      "response_code",
    ]);
  });

  it("has 4 Target & Context fields", () => {
    const fields = getFieldsByCategory("Target & Context");
    expect(fields).toHaveLength(4);
    expect(fields.map((f) => f.key)).toEqual([
      "endpoints",
      "host",
      "parameter",
      "sources.ips",
    ]);
  });

  it("has 2 Temporal fields", () => {
    const fields = getFieldsByCategory("Temporal");
    expect(fields).toHaveLength(2);
    expect(fields.map((f) => f.key)).toEqual([
      "timeline.last_seen",
      "timeline.first_detected",
    ]);
  });

  it("has 5 enum, 3 text, 2 date, 1 numeric, and 1 ip field", () => {
    expect(getEnumFields()).toHaveLength(5);
    expect(FILTER_FIELDS.filter((f) => f.type === "text")).toHaveLength(3);
    expect(getDateFields()).toHaveLength(2);
    expect(getNumericFields()).toHaveLength(1);
    expect(getIpFields()).toHaveLength(1);
  });

  it("all fields have operators arrays", () => {
    for (const field of FILTER_FIELDS) {
      expect(field.operators).toBeDefined();
      expect(field.operators!.length).toBeGreaterThan(0);
    }
  });
});

describe("getFieldByKey", () => {
  it("returns the field definition for a known key", () => {
    const field = getFieldByKey("status");
    expect(field).toBeDefined();
    expect(field!.label).toBe("Status");
    expect(field!.values).toEqual(["Blocked", "Monitored", "Started"]);
  });

  it("returns undefined for an unknown key", () => {
    expect(getFieldByKey("nonexistent")).toBeUndefined();
  });
});

describe("getFieldsByCategory", () => {
  it("returns only fields matching the category", () => {
    const fields = getFieldsByCategory("Target & Context");
    expect(fields.every((f) => f.category === "Target & Context")).toBe(true);
  });
});

describe("getEnumFields", () => {
  it("returns only enum-type fields with values arrays", () => {
    const fields = getEnumFields();
    for (const field of fields) {
      expect(field.type).toBe("enum");
      expect(Array.isArray(field.values)).toBe(true);
    }
  });

  it("includes HTTP status code with string values", () => {
    const httpField = getEnumFields().find(
      (f) => f.key === "http_status_code",
    );
    expect(httpField).toBeDefined();
    expect(httpField!.values).toEqual(["200", "401", "403", "404", "500"]);
  });
});

describe("getIpFields", () => {
  it("has IP field with correct operators", () => {
    const ipField = getFieldByKey("sources.ips");
    expect(ipField).toBeDefined();
    expect(ipField!.type).toBe("ip");
    expect(ipField!.operators).toContain("in");
    expect(ipField!.operators).toContain("not_in");
    expect(ipField!.operators).toContain("is_set");
    expect(ipField!.operators).toContain("is_not_set");
  });
});
