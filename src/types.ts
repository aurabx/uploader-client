/**
 * Type definitions for the Aura Uploader API client.
 */

/**
 * Configuration options for the AuraUploaderClient.
 */
export interface AuraClientOptions {
  /** Base URL for the Aura API (e.g., "https://aura.example.com") */
  baseUrl: string;
  /** Application public ID */
  appId: string;
  /** Application secret key */
  appSecret: string;
  /** API key for additional authentication */
  apiKey: string;
  /** Token time-to-live in seconds (default: 3600) */
  tokenTtl?: number;
  /** Default scopes for token exchange (default: ["upload:init", "upload:manage", "integration:read"]) */
  defaultScopes?: string[];
}

/**
 * Request for token exchange endpoint.
 */
export interface TokenExchangeRequest {
  /** Token time-to-live in seconds (default: 3600) */
  ttl?: number;
  /** Requested scopes for the token */
  scopes?: string[];
}

/**
 * Response from token exchange endpoint.
 */
export interface TokenExchangeResponse {
  /** The access token */
  access_token: string;
  /** Token type (typically "Bearer") */
  token_type: string;
  /** Token expiration time in seconds */
  expires_in: number;
  /** Granted scopes */
  scopes?: string[];
}

/**
 * Request for submit endpoint.
 */
export interface SubmitRequest {
  /** Upload ID to submit */
  upload_id: string;
  /** Optional metadata to attach to the upload */
  metadata?: Record<string, unknown>;
}

/**
 * Response from submit endpoint.
 */
export interface SubmitResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** The upload ID */
  upload_id: string;
  /** Current status of the upload */
  status: string;
  /** Optional message with additional details */
  message?: string;
}

/**
 * Request for withdraw endpoint.
 */
export interface WithdrawRequest {
  /** Upload ID to withdraw */
  upload_id: string;
  /** Optional reason for withdrawal */
  reason?: string;
}

/**
 * Response from withdraw endpoint.
 */
export interface WithdrawResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** The upload ID */
  upload_id: string;
  /** Current status of the upload */
  status: string;
  /** Optional message with additional details */
  message?: string;
}

/**
 * HTTP request structure for HMAC signing.
 */
export interface HttpRequest {
  /** HTTP method (GET, POST, PUT, PATCH, DELETE) */
  method: string;
  /** Base URL for the request */
  baseUrl?: string;
  /** URL path (can include query string) */
  url: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Query parameters */
  query?: Record<string, string | number | boolean>;
  /** Request body (object will be JSON serialized) */
  body?: unknown;
}

/**
 * Error thrown when an API request fails.
 */
export class AuraApiError extends Error {
  /** HTTP status code */
  public readonly statusCode: number;
  /** Response body content */
  public readonly responseContent: string;

  constructor(message: string, statusCode: number, responseContent: string) {
    super(message);
    this.name = "AuraApiError";
    this.statusCode = statusCode;
    this.responseContent = responseContent;
  }
}
