import { describe, it, expect } from "vitest";
import {
  FILTER_FIELDS,
  getFieldByKey,
  getFieldsByCategory,
  getEnumFields,
  getDateFields,
  getNumericFields,
} from "../filter-schema";

describe("FILTER_FIELDS", () => {
  it("has 11 total fields", () => {
    expect(FILTER_FIELDS).toHaveLength(11);
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

  it("has 3 Target & Context fields", () => {
    const fields = getFieldsByCategory("Target & Context");
    expect(fields).toHaveLength(3);
    expect(fields.map((f) => f.key)).toEqual([
      "endpoints",
      "host",
      "parameter",
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

  it("has 5 enum fields, 3 text fields, 2 date fields, and 1 numeric field", () => {
    const enumFields = getEnumFields();
    expect(enumFields).toHaveLength(5);
    const textFields = FILTER_FIELDS.filter((f) => f.type === "text");
    expect(textFields).toHaveLength(3);
    const dateFields = getDateFields();
    expect(dateFields).toHaveLength(2);
    const numericFields = getNumericFields();
    expect(numericFields).toHaveLength(1);
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
