/**
 * Client for the Aura Uploader API, covering auth and manage endpoints.
 *
 * This is the Node.js equivalent of the .NET AuraUploaderClient.
 */

import { signRequest } from "./hmac-signer.js";
import {
  AuraApiError,
  type AuraClientOptions,
  type HttpRequest,
  type SubmitRequest,
  type SubmitResponse,
  type TokenExchangeRequest,
  type TokenExchangeResponse,
  type WithdrawRequest,
  type WithdrawResponse,
} from "./types.js";

const DEFAULT_TOKEN_TTL = 3600;
const DEFAULT_SCOPES = ["upload:init", "upload:manage", "integration:read"];

/**
 * Client for the Aura Uploader API.
 *
 * Provides methods for:
 * - Token exchange (HMAC-signed authentication)
 * - Submit uploads for processing
 * - Withdraw previously submitted uploads
 *
 * @example
 * ```typescript
 * const client = new AuraUploaderClient({
 *   baseUrl: "https://aura.example.com",
 *   appId: "your-app-id",
 *   appSecret: "your-app-secret",
 *   apiKey: "your-api-key",
 * });
 *
 * // Authenticate and get a token
 * const token = await client.ensureAuthenticated();
 *
 * // Submit an upload
 * const result = await client.submit({ upload_id: "abc123" });
 * ```
 */
export class AuraUploaderClient {
  private readonly options: Required<AuraClientOptions>;
  private accessToken?: string;
  private tokenExpiry: number = 0;

  /**
   * Create a new AuraUploaderClient instance.
   *
   * @param options - Client configuration options
   */
  constructor(options: AuraClientOptions) {
    if (!options) {
      throw new Error("options is required");
    }
    if (!options.baseUrl) {
      throw new Error("baseUrl is required");
    }
    if (!options.appId) {
      throw new Error("appId is required");
    }
    if (!options.appSecret) {
      throw new Error("appSecret is required");
    }
    if (!options.apiKey) {
      throw new Error("apiKey is required");
    }

    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ""), // Remove trailing slash
      appId: options.appId,
      appSecret: options.appSecret,
      apiKey: options.apiKey,
      tokenTtl: options.tokenTtl ?? DEFAULT_TOKEN_TTL,
      defaultScopes: options.defaultScopes ?? DEFAULT_SCOPES,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Exchange HMAC credentials for a bearer token.
   * POST /api/auth/exchange
   *
   * @param request - Token exchange request parameters
   * @param signal - Optional AbortSignal for request cancellation
   * @returns Token exchange response with access token
   */
  async exchangeToken(
    request: TokenExchangeRequest = {},
    signal?: AbortSignal
  ): Promise<TokenExchangeResponse> {
    const httpRequest = this.createSignedRequest("POST", "api/auth/exchange", {
      ttl: request.ttl ?? this.options.tokenTtl,
      scopes: request.scopes ?? this.options.defaultScopes,
    });
    return this.send<TokenExchangeResponse>(httpRequest, signal);
  }

  /**
   * Ensures a valid access token is available, refreshing if necessary.
   *
   * @param signal - Optional AbortSignal for request cancellation
   * @returns The valid access token
   */
  async ensureAuthenticated(signal?: AbortSignal): Promise<string> {
    // Check if we have a valid non-expired token (with 1 minute buffer)
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }

    // Exchange for a new token
    const response = await this.exchangeToken(
      {
        ttl: this.options.tokenTtl,
        scopes: this.options.defaultScopes,
      },
      signal
    );

    this.accessToken = response.access_token;
    this.tokenExpiry = now + response.expires_in * 1000;

    return this.accessToken;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Manage Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Submit an upload for processing.
   * POST /api/uploader/manage/submit
   *
   * @param request - Submit request with upload ID and optional metadata
   * @param signal - Optional AbortSignal for request cancellation
   * @returns Submit response with status
   */
  async submit(
    request: SubmitRequest,
    signal?: AbortSignal
  ): Promise<SubmitResponse> {
    await this.ensureAuthenticated(signal);
    const httpRequest = this.createAuthenticatedRequest(
      "POST",
      "api/uploader/manage/submit",
      request
    );
    return this.send<SubmitResponse>(httpRequest, signal);
  }

  /**
   * Withdraw a previously submitted upload.
   * POST /api/uploader/manage/withdraw
   *
   * @param request - Withdraw request with upload ID and optional reason
   * @param signal - Optional AbortSignal for request cancellation
   * @returns Withdraw response with status
   */
  async withdraw(
    request: WithdrawRequest,
    signal?: AbortSignal
  ): Promise<WithdrawResponse> {
    await this.ensureAuthenticated(signal);
    const httpRequest = this.createAuthenticatedRequest(
      "POST",
      "api/uploader/manage/withdraw",
      request
    );
    return this.send<WithdrawResponse>(httpRequest, signal);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create an HMAC-signed request for authentication endpoints.
   */
  private createSignedRequest<TBody>(
    method: string,
    path: string,
    body: TBody
  ): HttpRequest {
    const host = new URL(this.options.baseUrl).host;
    const request: HttpRequest = {
      method,
      baseUrl: this.options.baseUrl,
      url: "/" + path,
      headers: {
        Host: host,
        "Content-Type": "application/json",
        "X-Api-Key": this.options.apiKey,
      },
      body,
    };

    // Sign the request with HMAC
    signRequest(this.options.appId, this.options.appSecret, request);

    return request;
  }

  /**
   * Create a bearer-authenticated request for management endpoints.
   */
  private createAuthenticatedRequest<TBody>(
    method: string,
    path: string,
    body: TBody
  ): HttpRequest {
    return {
      method,
      baseUrl: this.options.baseUrl,
      url: "/" + path,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body,
    };
  }

  /**
   * Send an HTTP request and parse the JSON response.
   */
  private async send<TResponse>(
    request: HttpRequest,
    signal?: AbortSignal
  ): Promise<TResponse> {
    const url = `${this.options.baseUrl}${request.url}`;

    // Build headers for fetch (exclude Host as it's set automatically)
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (key.toLowerCase() !== "host") {
        headers[key] = value;
      }
    }

    // Build request options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal,
    };

    // Add body for non-GET requests
    if (request.body != null && request.method !== "GET") {
      fetchOptions.body =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
    }

    // Send request
    const response = await fetch(url, fetchOptions);
    const content = await response.text();

    // Check for errors
    if (!response.ok) {
      throw new AuraApiError(
        `API request failed with status ${response.status}: ${content}`,
        response.status,
        content
      );
    }

    // Parse response
    try {
      return JSON.parse(content) as TResponse;
    } catch {
      throw new AuraApiError(
        "Failed to parse response as JSON",
        response.status,
        content
      );
    }
  }
}
