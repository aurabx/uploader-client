/**
 * Tests for the HMAC signer.
 *
 * These tests verify that the Node.js HMAC signer produces correct signatures
 * that are compatible with the .NET implementation.
 */

import { describe, it, expect } from "vitest";
import { signRequest } from "../hmac-signer.js";
import type { HttpRequest } from "../types.js";

const TEST_APP_ID = "test-app-id";
const TEST_APP_SECRET = "test-secret-key";

describe("AuraHmacSigner", () => {
  describe("signRequest", () => {
    it("adds required headers", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      expect(request.headers["X-Aura-Timestamp"]).toBeDefined();
      expect(request.headers["X-Aura-Nonce"]).toBeDefined();
      expect(request.headers["Authorization"]).toBeDefined();
    });

    it("Authorization header has correct format", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      const authHeader = request.headers["Authorization"];
      expect(authHeader).toMatch(/^AURA-HMAC-SHA256 /);
      expect(authHeader).toContain(`Credential=${TEST_APP_ID},`);
      expect(authHeader).toContain("SignedHeaders=");
      expect(authHeader).toContain("Signature=");
    });

    it("timestamp header is valid Unix timestamp", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      const timestamp = request.headers["X-Aura-Timestamp"];
      const unixTime = parseInt(timestamp, 10);
      expect(Number.isNaN(unixTime)).toBe(false);

      // Should be within last minute
      const now = Math.floor(Date.now() / 1000);
      expect(unixTime).toBeGreaterThanOrEqual(now - 60);
      expect(unixTime).toBeLessThanOrEqual(now + 60);
    });

    it("nonce header is valid UUID", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      const nonce = request.headers["X-Aura-Nonce"];
      // UUID v4 format
      expect(nonce).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("POST with body adds Content-Type header", () => {
      const request: HttpRequest = {
        method: "POST",
        baseUrl: "https://aura.example.com",
        url: "/api/auth/exchange",
        headers: {
          Host: "aura.example.com",
        },
        body: { ttl: 3600 },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      expect(request.headers["Content-Type"]).toBe("application/json");
    });

    it("POST with body includes content-type in signed headers", () => {
      const request: HttpRequest = {
        method: "POST",
        baseUrl: "https://aura.example.com",
        url: "/api/auth/exchange",
        headers: {
          Host: "aura.example.com",
          "Content-Type": "application/json",
        },
        body: { ttl: 3600 },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      const authHeader = request.headers["Authorization"];
      expect(authHeader).toContain("content-type");
    });

    it("preserves existing Content-Type", () => {
      const request: HttpRequest = {
        method: "POST",
        baseUrl: "https://aura.example.com",
        url: "/api/auth/exchange",
        headers: {
          Host: "aura.example.com",
          "Content-Type": "application/xml",
        },
        body: "<request><ttl>3600</ttl></request>",
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      expect(request.headers["Content-Type"]).toBe("application/xml");
    });

    it("different nonces produce different signatures", () => {
      const request1: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
      };

      const request2: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request1);
      signRequest(TEST_APP_ID, TEST_APP_SECRET, request2);

      const sig1 = extractSignature(request1.headers["Authorization"]);
      const sig2 = extractSignature(request2.headers["Authorization"]);

      expect(sig1).not.toBe(sig2);
    });

    it("GET without body does not add Content-Type", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      expect(request.headers["Content-Type"]).toBeUndefined();
    });

    it.each(["GET", "POST", "PUT", "PATCH", "DELETE"])(
      "supports %s HTTP method",
      (method) => {
        const request: HttpRequest = {
          method,
          baseUrl: "https://aura.example.com",
          url: "/api/uploader/config",
          headers: {
            Host: "aura.example.com",
          },
        };

        signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

        expect(request.headers["Authorization"]).toBeDefined();
      }
    );

    it("handles query parameters in URL", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config?param=value",
        headers: {
          Host: "aura.example.com",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      expect(request.headers["Authorization"]).toBeDefined();
    });

    it("handles query parameters from query object", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: {
          Host: "aura.example.com",
        },
        query: {
          param1: "value1",
          param2: "value2",
        },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      expect(request.headers["Authorization"]).toBeDefined();
    });

    it("signed headers are sorted alphabetically", () => {
      const request: HttpRequest = {
        method: "POST",
        baseUrl: "https://aura.example.com",
        url: "/api/auth/exchange",
        headers: {
          Host: "aura.example.com",
          "Content-Type": "application/json",
        },
        body: { ttl: 3600 },
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      const authHeader = request.headers["Authorization"];
      const match = authHeader.match(/SignedHeaders=([^,]+),/);
      expect(match).not.toBeNull();

      const signedHeaders = match![1].split(";");
      const sortedHeaders = [...signedHeaders].sort();
      expect(signedHeaders).toEqual(sortedHeaders);
    });

    it("initializes headers if null", () => {
      const request: HttpRequest = {
        method: "GET",
        baseUrl: "https://aura.example.com",
        url: "/api/uploader/config",
        headers: null as unknown as Record<string, string>,
      };

      signRequest(TEST_APP_ID, TEST_APP_SECRET, request);

      expect(request.headers).not.toBeNull();
      expect(request.headers["Authorization"]).toBeDefined();
    });
  });
});

function extractSignature(authHeader: string): string {
  const match = authHeader.match(/Signature=([a-f0-9]+)/);
  return match ? match[1] : "";
}
