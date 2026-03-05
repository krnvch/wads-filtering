/**
 * Validate a single IPv4 octet (0-255).
 */
export function isValidOctet(s: string): boolean {
  if (!s || !/^\d{1,3}$/.test(s)) return false;
  const n = parseInt(s, 10);
  return n >= 0 && n <= 255;
}

/**
 * Validate a complete IPv4 address (4 octets, each 0-255).
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every(isValidOctet);
}

/**
 * Validate a CIDR notation string (e.g. "192.168.0.0/24").
 * Returns true if the IP part is valid and prefix is 0-32.
 */
export function isValidCIDR(cidr: string): boolean {
  const slash = cidr.indexOf("/");
  if (slash === -1) return false;
  const ip = cidr.slice(0, slash);
  const prefix = cidr.slice(slash + 1);
  if (!isValidIPv4(ip)) return false;
  if (!/^\d{1,2}$/.test(prefix)) return false;
  const n = parseInt(prefix, 10);
  return n >= 0 && n <= 32;
}

/**
 * Validate an IP filter value — either a valid IPv4 or valid CIDR.
 */
export function isValidIpValue(value: string): boolean {
  return isValidIPv4(value) || isValidCIDR(value);
}

/**
 * Parse the user's partial IP input and return complete octets.
 * Returns { octets: string[], partial: string } where octets are
 * the fully entered octets and partial is the in-progress octet.
 *
 * Examples:
 *   "44."       → { octets: ["44"], partial: "" }
 *   "44.209."   → { octets: ["44", "209"], partial: "" }
 *   "44.20"     → { octets: ["44"], partial: "20" }
 *   "44.209.156.240" → { octets: ["44", "209", "156", "240"], partial: "" }
 */
export function parsePartialIp(input: string): {
  octets: string[];
  partial: string;
} {
  if (!input) return { octets: [], partial: "" };
  const parts = input.split(".");
  if (input.endsWith(".")) {
    return { octets: parts.slice(0, -1), partial: "" };
  }
  // 4 parts without trailing dot = complete IP (all octets done)
  if (parts.length === 4) {
    return { octets: parts, partial: "" };
  }
  return { octets: parts.slice(0, -1), partial: parts[parts.length - 1] };
}

/**
 * Compute CIDR suggestions based on the number of complete octets entered.
 *
 * Rules:
 *   1 complete octet → [X.0.0.0/8]
 *   2 complete octets → [X.Y.0.0/16]
 *   3 complete octets → [X.Y.Z.0/24]
 *   4 complete octets (full IP) → [] (no suggestion)
 *   0 complete octets → []
 */
export function computeCidrSuggestions(input: string): string[] {
  const { octets } = parsePartialIp(input);
  if (octets.length === 0 || octets.length > 3) return [];
  if (!octets.every(isValidOctet)) return [];

  const padded = [...octets, ...Array(4 - octets.length).fill("0")];
  const prefix = octets.length * 8;
  return [`${padded.join(".")}/${prefix}`];
}

/**
 * Filter a list of IPs to those that prefix-match the user's input.
 */
export function filterMatchingIps(
  datasetIps: string[],
  input: string,
): string[] {
  if (!input) return [];
  return datasetIps.filter((ip) => ip.startsWith(input));
}

/**
 * Check if an IPv4 address falls within a CIDR range.
 */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const slash = cidr.indexOf("/");
  if (slash === -1) return false;
  const baseIp = cidr.slice(0, slash);
  const prefix = parseInt(cidr.slice(slash + 1), 10);
  if (prefix < 0 || prefix > 32) return false;

  const ipNum = ipToNumber(ip);
  const baseNum = ipToNumber(baseIp);
  if (ipNum === null || baseNum === null) return false;

  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

/**
 * Convert an IPv4 address string to a 32-bit unsigned number.
 * Returns null if invalid.
 */
export function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    result = (result << 8) | n;
  }
  return result >>> 0;
}

/**
 * Check if a character is allowed in IP input.
 * Allowed: digits (0-9), dot (.), slash (/).
 */
export function isAllowedIpChar(char: string): boolean {
  return /^[\d./]$/.test(char);
}

/**
 * Validate whether a slash keystroke should be accepted.
 * Only allow "/" if the text before cursor is a valid complete IPv4 address.
 */
export function shouldAcceptSlash(currentText: string): boolean {
  return isValidIPv4(currentText);
}

/**
 * Validate whether a dot keystroke should be accepted.
 * Block if: input is empty, or last char is already a dot.
 */
export function shouldAcceptDot(currentText: string): boolean {
  if (!currentText) return false;
  if (currentText.endsWith(".")) return false;
  return true;
}
