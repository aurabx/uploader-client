/**
 * Aura Uploader API Client for Node.js
 *
 * A TypeScript/Node.js library for interacting with the Aura Uploader API.
 * Provides the same API as the .NET AuraUploaderClient.
 *
 * @packageDocumentation
 */

// Main client
export { AuraUploaderClient } from "./client.js";

// HMAC signing utilities
export { signRequest } from "./hmac-signer.js";

// Types
export {
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
