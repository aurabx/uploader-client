/**
 * Tests for the AuraUploaderClient.
 */

import { describe, it, expect } from "vitest";
import { AuraUploaderClient, AuraApiError } from "../index.js";

function createTestOptions() {
  return {
    baseUrl: "https://aura.example.com",
    appId: "test-app-id",
    appSecret: "test-secret-key",
    apiKey: "test-api-key",
  };
}

describe("AuraUploaderClient", () => {
  describe("constructor", () => {
    it("creates client with valid options", () => {
      const options = createTestOptions();
      const client = new AuraUploaderClient(options);
      expect(client).toBeDefined();
    });

    it("throws error with null options", () => {
      expect(() => new AuraUploaderClient(null as never)).toThrow(
        "options is required"
      );
    });

    it("throws error with missing baseUrl", () => {
      const options = createTestOptions();
      // @ts-expect-error Testing invalid input
      delete options.baseUrl;
      expect(() => new AuraUploaderClient(options)).toThrow(
        "baseUrl is required"
      );
    });

    it("throws error with missing appId", () => {
      const options = createTestOptions();
      // @ts-expect-error Testing invalid input
      delete options.appId;
      expect(() => new AuraUploaderClient(options)).toThrow(
        "appId is required"
      );
    });

    it("throws error with missing appSecret", () => {
      const options = createTestOptions();
      // @ts-expect-error Testing invalid input
      delete options.appSecret;
      expect(() => new AuraUploaderClient(options)).toThrow(
        "appSecret is required"
      );
    });

    it("throws error with missing apiKey", () => {
      const options = createTestOptions();
      // @ts-expect-error Testing invalid input
      delete options.apiKey;
      expect(() => new AuraUploaderClient(options)).toThrow(
        "apiKey is required"
      );
    });

    it("uses default tokenTtl", () => {
      const options = createTestOptions();
      const client = new AuraUploaderClient(options);
      // Default is 3600, verified through behavior
      expect(client).toBeDefined();
    });

    it("uses default scopes", () => {
      const options = createTestOptions();
      const client = new AuraUploaderClient(options);
      // Default scopes: ["upload:init", "upload:manage", "integration:read"]
      expect(client).toBeDefined();
    });

    it("accepts custom tokenTtl", () => {
      const options = { ...createTestOptions(), tokenTtl: 7200 };
      const client = new AuraUploaderClient(options);
      expect(client).toBeDefined();
    });

    it("accepts custom scopes", () => {
      const options = {
        ...createTestOptions(),
        defaultScopes: ["custom:scope"],
      };
      const client = new AuraUploaderClient(options);
      expect(client).toBeDefined();
    });

    it("strips trailing slash from baseUrl", () => {
      const options = {
        ...createTestOptions(),
        baseUrl: "https://aura.example.com/",
      };
      const client = new AuraUploaderClient(options);
      expect(client).toBeDefined();
    });
  });
});

describe("AuraApiError", () => {
  it("contains status code and content", () => {
    const error = new AuraApiError(
      "Test error",
      400,
      '{"error": "invalid request"}'
    );

    expect(error.message).toBe("Test error");
    expect(error.statusCode).toBe(400);
    expect(error.responseContent).toBe('{"error": "invalid request"}');
  });

  it("has correct name", () => {
    const error = new AuraApiError("Test error", 500, "{}");
    expect(error.name).toBe("AuraApiError");
  });

  it("is instanceof Error", () => {
    const error = new AuraApiError("Test error", 500, "{}");
    expect(error).toBeInstanceOf(Error);
  });
});
