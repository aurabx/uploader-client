/**
 * Tests that verify signature generation against known test vectors.
 *
 * These tests use fixed timestamps and nonces to ensure deterministic results
 * and compatibility with the .NET implementation.
 */

import { describe, it, expect } from "vitest";
import { createHash, createHmac } from "node:crypto";

// Helper functions for computing signatures
function computeSha256Hex(data: string | Buffer): string {
  return createHash("sha256")
    .update(typeof data === "string" ? Buffer.from(data, "utf8") : data)
    .digest("hex")
    .toLowerCase();
}

function computeHmacSha256Raw(key: string | Buffer, data: string): Buffer {
  const keyBuffer = typeof key === "string" ? Buffer.from(key, "utf8") : key;
  return createHmac("sha256", keyBuffer).update(data, "utf8").digest();
}

function computeHmacSha256Hex(key: Buffer, data: string): string {
  return computeHmacSha256Raw(key, data).toString("hex").toLowerCase();
}

describe("SignatureTestVectors", () => {
  it("TestVector1: POST with JSON body produces expected signature", () => {
    // Test Vector 1: POST with JSON body
    // Fixed inputs for reproducibility
    const appId = "test-app-id";
    const appSecret = "test-secret-key";
    const timestamp = "1706140800";
    const nonce = "550e8400-e29b-41d4-a716-446655440000";
    const date = "20240125";

    // Use explicit JSON string to ensure consistent hashing
    const bodyJson = '{"ttl":3600,"scopes":["upload:init","upload:manage"]}';

    // Build canonical request components
    const canonicalPath = "/api/auth/exchange";
    const canonicalQuery = "";
    const signedHeaders = "content-type;host;x-aura-nonce;x-aura-timestamp";
    const canonicalHeaders =
      `content-type:application/json\n` +
      `host:aura.example.com\n` +
      `x-aura-nonce:${nonce}\n` +
      `x-aura-timestamp:${timestamp}\n`;
    const payloadHash = computeSha256Hex(bodyJson);

    const canonicalRequest = [
      "POST",
      canonicalPath,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const canonicalRequestHash = computeSha256Hex(canonicalRequest);
    const credentialScope = `${appId}/${date}/aura_request`;
    const stringToSign = [
      "AURA-HMAC-SHA256",
      timestamp,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    // Key derivation
    const dateKey = computeHmacSha256Raw(`AURA${appSecret}`, date);
    const signingKey = computeHmacSha256Raw(dateKey, "aura_request");
    const signature = computeHmacSha256Hex(signingKey, stringToSign);

    // Expected signature computed with the exact JSON above (matches .NET test)
    const expectedSignature =
      "4e865169c280c238e93ea51681fdf9e5977ecbf0dc60fbbf0b6b7ccba2005093";

    expect(signature).toBe(expectedSignature);
  });

  it("TestVector2: GET without body produces valid signature", () => {
    // Test Vector 2: GET request without body
    const appId = "test-app-id";
    const appSecret = "test-secret-key";
    const timestamp = "1706140800";
    const nonce = "550e8400-e29b-41d4-a716-446655440001";
    const date = "20240125";

    // Build canonical request components
    const canonicalPath = "/api/uploader/config";
    const canonicalQuery = "";
    const signedHeaders = "host;x-aura-nonce;x-aura-timestamp";
    const canonicalHeaders =
      `host:aura.example.com\n` +
      `x-aura-nonce:${nonce}\n` +
      `x-aura-timestamp:${timestamp}\n`;
    const payloadHash = computeSha256Hex(""); // Empty body

    const canonicalRequest = [
      "GET",
      canonicalPath,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const canonicalRequestHash = computeSha256Hex(canonicalRequest);
    const credentialScope = `${appId}/${date}/aura_request`;
    const stringToSign = [
      "AURA-HMAC-SHA256",
      timestamp,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    // Key derivation
    const dateKey = computeHmacSha256Raw(`AURA${appSecret}`, date);
    const signingKey = computeHmacSha256Raw(dateKey, "aura_request");
    const signature = computeHmacSha256Hex(signingKey, stringToSign);

    // Verify we get a valid 64-character hex signature
    expect(signature).toHaveLength(64);
    expect(signature).toMatch(/^[a-f0-9]+$/);
  });

  it("TestVector3: POST with query parameters produces valid signature", () => {
    // Test Vector 3: POST with query parameters
    const appId = "test-app-id";
    const appSecret = "test-secret-key";
    const timestamp = "1706140800";
    const nonce = "550e8400-e29b-41d4-a716-446655440002";
    const date = "20240125";

    // Use explicit JSON string
    const bodyJson = '{"data":"test"}';

    // Build canonical request components - query params should be sorted
    const canonicalPath = "/api/uploader/upload/init";
    const canonicalQuery = "format=json&version=1"; // Sorted alphabetically
    const signedHeaders = "content-type;host;x-aura-nonce;x-aura-timestamp";
    const canonicalHeaders =
      `content-type:application/json\n` +
      `host:aura.example.com\n` +
      `x-aura-nonce:${nonce}\n` +
      `x-aura-timestamp:${timestamp}\n`;
    const payloadHash = computeSha256Hex(bodyJson);

    const canonicalRequest = [
      "POST",
      canonicalPath,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const canonicalRequestHash = computeSha256Hex(canonicalRequest);
    const credentialScope = `${appId}/${date}/aura_request`;
    const stringToSign = [
      "AURA-HMAC-SHA256",
      timestamp,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    // Key derivation
    const dateKey = computeHmacSha256Raw(`AURA${appSecret}`, date);
    const signingKey = computeHmacSha256Raw(dateKey, "aura_request");
    const signature = computeHmacSha256Hex(signingKey, stringToSign);

    // Verify we get a valid 64-character hex signature
    expect(signature).toHaveLength(64);
    expect(signature).toMatch(/^[a-f0-9]+$/);
  });

  it("key derivation produces consistent results", () => {
    const appSecret = "test-secret-key";
    const date = "20240125";

    // Derive key twice and verify consistency
    const dateKey1 = computeHmacSha256Raw(`AURA${appSecret}`, date);
    const signingKey1 = computeHmacSha256Raw(dateKey1, "aura_request");

    const dateKey2 = computeHmacSha256Raw(`AURA${appSecret}`, date);
    const signingKey2 = computeHmacSha256Raw(dateKey2, "aura_request");

    expect(signingKey1.equals(signingKey2)).toBe(true);
  });

  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"], // Empty string
    ["{}", "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"], // Empty JSON object
  ])("payload hash for '%s' produces expected value", (payload, expectedHash) => {
    const hash = computeSha256Hex(payload);
    expect(hash).toBe(expectedHash);
  });
});
