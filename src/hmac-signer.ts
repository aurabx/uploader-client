/**
 * HMAC-SHA256 request signer for Aura API authentication.
 *
 * Implements the AURA-HMAC-SHA256 signing protocol.
 * Uses Node.js crypto module for cryptographic operations.
 */

import { createHmac, createHash, randomUUID } from "node:crypto";
import type { HttpRequest } from "./types.js";

const ALGORITHM = "AURA-HMAC-SHA256";
const SERVICE = "aura_request";
const REQUIRED_SIGNED_HEADERS = ["host", "x-aura-nonce", "x-aura-timestamp"];

/**
 * Sign an HTTP request with AURA-HMAC-SHA256 authentication.
 *
 * Mutates the request object by adding the following headers:
 * - X-Aura-Timestamp: Unix timestamp in seconds
 * - X-Aura-Nonce: UUID v4 for replay protection
 * - Authorization: AURA-HMAC-SHA256 signature header
 *
 * @param appId - Application public ID
 * @param appSecret - Application secret key
 * @param request - HTTP request to sign (mutated in place)
 */
export function signRequest(
  appId: string,
  appSecret: string,
  request: HttpRequest
): void {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const date = getDateString();

  // Ensure headers object exists
  request.headers = request.headers || {};

  // Add required headers for signing
  request.headers["X-Aura-Timestamp"] = timestamp;
  request.headers["X-Aura-Nonce"] = nonce;

  // Only set Content-Type for requests with a body (POST, PUT, PATCH)
  const methodUpper = (request.method || "GET").toUpperCase();
  const hasBody =
    ["POST", "PUT", "PATCH"].includes(methodUpper) && request.body != null;
  if (hasBody && !headerExists(request.headers, "Content-Type")) {
    request.headers["Content-Type"] = "application/json";
  }

  // Build canonical request components
  const { path: canonicalPath, query: canonicalQuery } = canonicalizeUrl(
    request.baseUrl,
    request.url,
    request.query
  );
  const payloadHash = hashPayloadSha256Hex(request.body);
  const signedHeaders = computeSignedHeaders(request.headers);
  const canonicalHeaders = buildCanonicalHeaders(request.headers, signedHeaders);

  // Build canonical request
  const canonicalRequest = [
    methodUpper,
    canonicalPath,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Build string to sign
  const canonicalRequestHash = computeSha256Hex(canonicalRequest);
  const credentialScope = `${appId}/${date}/${SERVICE}`;
  const stringToSign = [
    ALGORITHM,
    timestamp,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");

  // Key derivation
  const dateKey = computeHmacSha256Raw(`AURA${appSecret}`, date);
  const signingKey = computeHmacSha256Raw(dateKey, SERVICE);
  const signatureHex = computeHmacSha256Hex(signingKey, stringToSign);

  // Set Authorization header
  request.headers["Authorization"] =
    `${ALGORITHM} Credential=${appId},SignedHeaders=${signedHeaders},Signature=${signatureHex}`;
}

/**
 * Check if a header exists (case-insensitive).
 */
function headerExists(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get header value (case-insensitive).
 */
function getHeaderValue(headers: Record<string, string>, name: string): string {
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? headers[key] : "";
}

/**
 * Normalize header value by trimming and collapsing whitespace.
 */
function normalizeHeaderValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Compute the signed headers list (sorted, semicolon-separated).
 */
function computeSignedHeaders(headers: Record<string, string>): string {
  const signed = new Set<string>(REQUIRED_SIGNED_HEADERS);

  // Add content-type if present
  if (headerExists(headers, "Content-Type")) {
    signed.add("content-type");
  }

  // Filter to headers with non-empty values
  const signedNonEmpty: string[] = [];
  for (const header of signed) {
    const value = getHeaderValue(headers, header);
    if (normalizeHeaderValue(value) !== "") {
      signedNonEmpty.push(header);
    }
  }

  // Sort and join
  signedNonEmpty.sort((a, b) => a.localeCompare(b));
  return signedNonEmpty.join(";");
}

/**
 * Build canonical headers string.
 */
function buildCanonicalHeaders(
  headers: Record<string, string>,
  signedHeadersStr: string
): string {
  const signedList = signedHeadersStr.split(";").filter((h) => h !== "");
  const lines: string[] = [];

  for (const header of signedList) {
    const value = getHeaderValue(headers, header);
    lines.push(`${header}:${normalizeHeaderValue(value)}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Canonicalize URL to extract path and sorted query string.
 */
function canonicalizeUrl(
  baseUrl: string | undefined,
  url: string,
  queryMap?: Record<string, string | number | boolean>
): { path: string; query: string } {
  // Build full URL
  let fullUrl: URL;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      fullUrl = new URL(url);
    } else {
      fullUrl = new URL(url, baseUrl || "http://localhost");
    }
  } catch {
    // Fallback for invalid URLs
    return { path: url.split("?")[0] || "/", query: "" };
  }

  // Get path
  let canonicalPath = fullUrl.pathname;
  if (!canonicalPath.startsWith("/")) {
    canonicalPath = "/" + canonicalPath;
  }

  // Build query string from URL and queryMap
  const queryParams = new URLSearchParams(fullUrl.search);

  // Add additional query parameters from queryMap
  if (queryMap) {
    for (const [key, value] of Object.entries(queryMap)) {
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    }
  }

  // Sort query parameters
  const sortedParams: string[] = [];
  const sortedKeys = Array.from(queryParams.keys()).sort();
  for (const key of sortedKeys) {
    const value = queryParams.get(key);
    if (value !== null) {
      sortedParams.push(`${key}=${value}`);
    }
  }

  return { path: canonicalPath, query: sortedParams.join("&") };
}

/**
 * Hash the request payload using SHA-256.
 */
function hashPayloadSha256Hex(body: unknown): string {
  if (body == null) {
    return computeSha256Hex("");
  }

  let bodyStr: string;
  if (typeof body === "string") {
    bodyStr = body;
  } else if (Buffer.isBuffer(body)) {
    return createHash("sha256").update(body).digest("hex").toLowerCase();
  } else {
    bodyStr = JSON.stringify(body);
  }

  return computeSha256Hex(bodyStr);
}

/**
 * Compute SHA-256 hash as lowercase hex string.
 */
function computeSha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex").toLowerCase();
}

/**
 * Compute HMAC-SHA256 as raw Buffer.
 */
function computeHmacSha256Raw(
  key: string | Buffer,
  data: string
): Buffer {
  const hmac = createHmac("sha256", key);
  hmac.update(data, "utf8");
  return hmac.digest();
}

/**
 * Compute HMAC-SHA256 as lowercase hex string.
 */
function computeHmacSha256Hex(key: Buffer, data: string): string {
  return computeHmacSha256Raw(key, data).toString("hex").toLowerCase();
}

/**
 * Get current date as YYYYMMDD string.
 */
function getDateString(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
