# @aurabx/uploader-client

A TypeScript/Node.js client library for the Aura Uploader API. This library provides the same API as the .NET `AuraUploaderClient`.

## Requirements

- Node.js 18.0.0 or later
- TypeScript 5.x (for development)

## Installation

```bash
npm install @aurabx/uploader-client
# or
pnpm add @aurabx/uploader-client
```

## Quick Start

```typescript
import { AuraUploaderClient } from "@aurabx/uploader-client";

const client = new AuraUploaderClient({
  baseUrl: "https://aura.example.com",
  appId: "your-app-id",
  appSecret: "your-app-secret",
  apiKey: "your-api-key",
});

// Authenticate (automatically called by other methods)
const token = await client.ensureAuthenticated();

// Submit an upload for processing
const submitResult = await client.submit({
  upload_id: "your-upload-id",
  metadata: {
    patient_id: "12345",
    study_type: "CT",
  },
});

// Withdraw an upload
const withdrawResult = await client.withdraw({
  upload_id: "your-upload-id",
  reason: "Duplicate upload",
});
```

## API Reference

### AuraUploaderClient

The main client class for interacting with the Aura Uploader API.

#### Constructor

```typescript
new AuraUploaderClient(options: AuraClientOptions)
```

**Options:**
| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `baseUrl` | `string` | Yes | - | Base URL for the Aura API |
| `appId` | `string` | Yes | - | Application public ID |
| `appSecret` | `string` | Yes | - | Application secret key |
| `apiKey` | `string` | Yes | - | API key for additional authentication |
| `tokenTtl` | `number` | No | `3600` | Token time-to-live in seconds |
| `defaultScopes` | `string[]` | No | `["upload:init", "upload:manage", "integration:read"]` | Default scopes for token exchange |

#### Methods

##### `exchangeToken(request?: TokenExchangeRequest): Promise<TokenExchangeResponse>`

Exchange HMAC credentials for a bearer token.

```typescript
const response = await client.exchangeToken({
  ttl: 3600,
  scopes: ["upload:init", "upload:manage"],
});
console.log(response.access_token);
```

##### `ensureAuthenticated(): Promise<string>`

Ensures a valid access token is available, refreshing if necessary. Returns the access token.

```typescript
const token = await client.ensureAuthenticated();
```

##### `submit(request: SubmitRequest): Promise<SubmitResponse>`

Submit an upload for processing.

```typescript
const result = await client.submit({
  upload_id: "your-upload-id",
  metadata: { patient_id: "12345" },
});
```

##### `withdraw(request: WithdrawRequest): Promise<WithdrawResponse>`

Withdraw a previously submitted upload.

```typescript
const result = await client.withdraw({
  upload_id: "your-upload-id",
  reason: "Duplicate upload",
});
```

### Low-Level HMAC Signing

For advanced use cases, you can use the `signRequest` function directly:

```typescript
import { signRequest, type HttpRequest } from "@aurabx/uploader-client";

const request: HttpRequest = {
  method: "POST",
  baseUrl: "https://aura.example.com",
  url: "/api/auth/exchange",
  headers: {
    Host: "aura.example.com",
    "Content-Type": "application/json",
    "X-Api-Key": "your-api-key",
  },
  body: { ttl: 3600 },
};

signRequest("your-app-id", "your-app-secret", request);
// request.headers now contains Authorization, X-Aura-Timestamp, X-Aura-Nonce
```

## Error Handling

The client throws `AuraApiError` for API errors:

```typescript
import { AuraApiError } from "@aurabx/uploader-client";

try {
  await client.submit({ upload_id: "invalid" });
} catch (error) {
  if (error instanceof AuraApiError) {
    console.error("Status:", error.statusCode);
    console.error("Response:", error.responseContent);
  }
}
```

## Request Cancellation

All methods accept an optional `AbortSignal` for request cancellation:

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  await client.submit({ upload_id: "..." }, controller.signal);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Request cancelled");
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build

# Run example
pnpm example
```

## API Endpoints

This client covers the following API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/exchange` | POST | Exchange HMAC credentials for bearer token |
| `/api/uploader/manage/submit` | POST | Submit an upload for processing |
| `/api/uploader/manage/withdraw` | POST | Withdraw a previously submitted upload |

## Compatibility

This library is designed to be API-compatible with the .NET `AuraUploaderClient`. The HMAC signing algorithm produces identical signatures for the same inputs.

## License

UNLICENSED
