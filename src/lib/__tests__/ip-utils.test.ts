import { describe, it, expect } from "vitest";
import {
  isValidOctet,
  isValidIPv4,
  isValidCIDR,
  isValidIpValue,
  parsePartialIp,
  computeCidrSuggestions,
  filterMatchingIps,
  ipMatchesCidr,
  ipToNumber,
  isAllowedIpChar,
  shouldAcceptSlash,
  shouldAcceptDot,
} from "../ip-utils";

describe("isValidOctet", () => {
  it("accepts valid octets", () => {
    expect(isValidOctet("0")).toBe(true);
    expect(isValidOctet("128")).toBe(true);
    expect(isValidOctet("255")).toBe(true);
  });

  it("rejects invalid octets", () => {
    expect(isValidOctet("256")).toBe(false);
    expect(isValidOctet("-1")).toBe(false);
    expect(isValidOctet("abc")).toBe(false);
    expect(isValidOctet("")).toBe(false);
    expect(isValidOctet("1000")).toBe(false);
  });
});

describe("isValidIPv4", () => {
  it("accepts valid IPs", () => {
    expect(isValidIPv4("192.168.0.1")).toBe(true);
    expect(isValidIPv4("0.0.0.0")).toBe(true);
    expect(isValidIPv4("255.255.255.255")).toBe(true);
  });

  it("rejects invalid IPs", () => {
    expect(isValidIPv4("192.168.0")).toBe(false);
    expect(isValidIPv4("999.0.0.1")).toBe(false);
    expect(isValidIPv4("1.2.3.4.5")).toBe(false);
    expect(isValidIPv4("")).toBe(false);
  });
});

describe("isValidCIDR", () => {
  it("accepts valid CIDR", () => {
    expect(isValidCIDR("10.0.0.0/8")).toBe(true);
    expect(isValidCIDR("192.168.0.0/24")).toBe(true);
    expect(isValidCIDR("0.0.0.0/0")).toBe(true);
    expect(isValidCIDR("10.0.0.1/32")).toBe(true);
  });

  it("rejects invalid CIDR", () => {
    expect(isValidCIDR("10.0.0.0/33")).toBe(false);
    expect(isValidCIDR("10.0.0/8")).toBe(false);
    expect(isValidCIDR("10.0.0.0")).toBe(false);
    expect(isValidCIDR("")).toBe(false);
  });
});

describe("isValidIpValue", () => {
  it("accepts valid IP", () => {
    expect(isValidIpValue("10.0.0.1")).toBe(true);
  });

  it("accepts valid CIDR", () => {
    expect(isValidIpValue("10.0.0.0/24")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidIpValue("10.0.0")).toBe(false);
    expect(isValidIpValue("abc")).toBe(false);
  });
});

describe("parsePartialIp", () => {
  it("parses empty input", () => {
    expect(parsePartialIp("")).toEqual({ octets: [], partial: "" });
  });

  it("parses single octet with trailing dot", () => {
    expect(parsePartialIp("44.")).toEqual({ octets: ["44"], partial: "" });
  });

  it("parses two octets with trailing dot", () => {
    expect(parsePartialIp("44.209.")).toEqual({ octets: ["44", "209"], partial: "" });
  });

  it("parses partial second octet", () => {
    expect(parsePartialIp("44.20")).toEqual({ octets: ["44"], partial: "20" });
  });

  it("parses complete IP", () => {
    expect(parsePartialIp("44.209.156.240")).toEqual({
      octets: ["44", "209", "156", "240"],
      partial: "",
    });
  });
});

describe("computeCidrSuggestions", () => {
  it("returns /8 for 1 complete octet", () => {
    expect(computeCidrSuggestions("44.")).toEqual(["44.0.0.0/8"]);
  });

  it("returns /16 for 2 complete octets", () => {
    expect(computeCidrSuggestions("44.209.")).toEqual(["44.209.0.0/16"]);
  });

  it("returns /24 for 3 complete octets", () => {
    expect(computeCidrSuggestions("44.209.156.")).toEqual(["44.209.156.0/24"]);
  });

  it("returns empty for 4 complete octets", () => {
    expect(computeCidrSuggestions("44.209.156.240")).toEqual([]);
  });

  it("returns empty for 0 octets", () => {
    expect(computeCidrSuggestions("")).toEqual([]);
    expect(computeCidrSuggestions("44")).toEqual([]);
  });

  it("returns empty for invalid octets", () => {
    expect(computeCidrSuggestions("999.")).toEqual([]);
  });
});

describe("filterMatchingIps", () => {
  const ips = ["10.0.0.1", "10.0.0.2", "192.168.1.1"];

  it("returns matching IPs", () => {
    expect(filterMatchingIps(ips, "10.")).toEqual(["10.0.0.1", "10.0.0.2"]);
  });

  it("returns empty for empty input", () => {
    expect(filterMatchingIps(ips, "")).toEqual([]);
  });

  it("returns empty for no matches", () => {
    expect(filterMatchingIps(ips, "172.")).toEqual([]);
  });
});

describe("ipMatchesCidr", () => {
  it("matches IP in /24 range", () => {
    expect(ipMatchesCidr("10.0.0.1", "10.0.0.0/24")).toBe(true);
    expect(ipMatchesCidr("10.0.0.255", "10.0.0.0/24")).toBe(true);
  });

  it("rejects IP outside /24 range", () => {
    expect(ipMatchesCidr("10.0.1.1", "10.0.0.0/24")).toBe(false);
    expect(ipMatchesCidr("192.168.0.1", "10.0.0.0/24")).toBe(false);
  });

  it("handles /0 (matches everything)", () => {
    expect(ipMatchesCidr("192.168.1.1", "0.0.0.0/0")).toBe(true);
  });

  it("handles /32 (exact match only)", () => {
    expect(ipMatchesCidr("10.0.0.1", "10.0.0.1/32")).toBe(true);
    expect(ipMatchesCidr("10.0.0.2", "10.0.0.1/32")).toBe(false);
  });

  it("handles /8 range", () => {
    expect(ipMatchesCidr("10.1.2.3", "10.0.0.0/8")).toBe(true);
    expect(ipMatchesCidr("11.0.0.0", "10.0.0.0/8")).toBe(false);
  });
});

describe("ipToNumber", () => {
  it("converts valid IPs", () => {
    expect(ipToNumber("0.0.0.0")).toBe(0);
    expect(ipToNumber("0.0.0.1")).toBe(1);
    expect(ipToNumber("255.255.255.255")).toBe(4294967295);
    expect(ipToNumber("10.0.0.1")).toBe(167772161);
  });

  it("returns null for invalid IPs", () => {
    expect(ipToNumber("")).toBeNull();
    expect(ipToNumber("10.0.0")).toBeNull();
    expect(ipToNumber("abc")).toBeNull();
  });
});

describe("isAllowedIpChar", () => {
  it("allows digits", () => {
    expect(isAllowedIpChar("0")).toBe(true);
    expect(isAllowedIpChar("9")).toBe(true);
  });

  it("allows dot and slash", () => {
    expect(isAllowedIpChar(".")).toBe(true);
    expect(isAllowedIpChar("/")).toBe(true);
  });

  it("rejects letters and special chars", () => {
    expect(isAllowedIpChar("a")).toBe(false);
    expect(isAllowedIpChar("@")).toBe(false);
    expect(isAllowedIpChar(" ")).toBe(false);
  });
});

describe("shouldAcceptSlash", () => {
  it("accepts after valid complete IP", () => {
    expect(shouldAcceptSlash("10.0.0.1")).toBe(true);
  });

  it("rejects after partial IP", () => {
    expect(shouldAcceptSlash("10.0.0")).toBe(false);
    expect(shouldAcceptSlash("10.0.0.")).toBe(false);
  });

  it("rejects after invalid IP", () => {
    expect(shouldAcceptSlash("999.0.0.1")).toBe(false);
  });
});

describe("shouldAcceptDot", () => {
  it("rejects for empty input", () => {
    expect(shouldAcceptDot("")).toBe(false);
  });

  it("rejects after existing dot", () => {
    expect(shouldAcceptDot("10.")).toBe(false);
  });

  it("accepts normally", () => {
    expect(shouldAcceptDot("10")).toBe(true);
    expect(shouldAcceptDot("10.0")).toBe(true);
  });
});
