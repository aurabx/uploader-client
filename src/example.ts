/**
 * Example usage of the Aura Uploader API Client.
 *
 * This demonstrates how to use the client for:
 * - Token exchange (authentication)
 * - Submitting uploads
 * - Withdrawing uploads
 *
 * Run with: npx tsx src/example.ts
 */

import { AuraUploaderClient, signRequest, type HttpRequest } from "./index.js";

async function main(): Promise<void> {
  console.log("Aura Uploader API Node.js Client");
  console.log("================================\n");

  // Load configuration from environment variables
  const config = {
    baseUrl: process.env.AURA_API_URL ?? "https://aura.example.com",
    appId: process.env.AURA_APP_ID ?? "test-app-id",
    appSecret: process.env.AURA_APP_SECRET ?? "test-secret-key",
    apiKey: process.env.AURA_API_KEY ?? "test-api-key",
  };

  try {
    // 1. Low-level token exchange example
    console.log("1. Low-level token exchange example...");
    await lowLevelTokenExchange(config);

    // 2. High-level client example
    console.log("\n2. High-level client example...");
    await highLevelClientExample(config);

    console.log("\nAll examples completed successfully!");
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Demonstrates low-level HMAC signing and token exchange.
 */
async function lowLevelTokenExchange(config: {
  baseUrl: string;
  appId: string;
  appSecret: string;
  apiKey: string;
}): Promise<void> {
  // Build request
  const request: HttpRequest = {
    method: "POST",
    baseUrl: config.baseUrl,
    url: "/api/auth/exchange",
    headers: {
      "X-Api-Key": config.apiKey,
      Host: new URL(config.baseUrl).host,
      "Content-Type": "application/json",
    },
    body: {
      ttl: 3600,
      scopes: ["upload:init", "upload:manage", "integration:read"],
    },
  };

  // Sign the request
  signRequest(config.appId, config.appSecret, request);

  console.log("  Request signed with headers:");
  console.log(`    Authorization: ${request.headers["Authorization"]?.substring(0, 50)}...`);
  console.log(`    X-Aura-Timestamp: ${request.headers["X-Aura-Timestamp"]}`);
  console.log(`    X-Aura-Nonce: ${request.headers["X-Aura-Nonce"]}`);

  // In a real scenario, you would send this request with fetch:
  // const response = await fetch(`${config.baseUrl}/api/auth/exchange`, {
  //   method: "POST",
  //   headers: { ...request.headers, Host: undefined },
  //   body: JSON.stringify(request.body),
  // });
}

/**
 * Demonstrates using the high-level AuraUploaderClient.
 */
async function highLevelClientExample(config: {
  baseUrl: string;
  appId: string;
  appSecret: string;
  apiKey: string;
}): Promise<void> {
  const client = new AuraUploaderClient(config);

  console.log("  Client created with:");
  console.log(`    Base URL: ${config.baseUrl}`);
  console.log(`    App ID: ${config.appId}`);

  // In a real scenario with a valid API endpoint:
  //
  // // Exchange token
  // console.log("  Exchanging token...");
  // const tokenResponse = await client.exchangeToken({
  //   ttl: 3600,
  //   scopes: ["upload:init", "upload:manage"],
  // });
  // console.log(`  Token received: ${tokenResponse.access_token.substring(0, 20)}...`);
  // console.log(`  Expires in: ${tokenResponse.expires_in} seconds`);
  //
  // // Submit an upload
  // const submitResponse = await client.submit({
  //   upload_id: "your-upload-id",
  //   metadata: {
  //     patient_id: "12345",
  //     study_type: "CT",
  //   },
  // });
  // console.log(`  Submit response: ${submitResponse.status}`);
  //
  // // Withdraw an upload
  // const withdrawResponse = await client.withdraw({
  //   upload_id: "your-upload-id",
  //   reason: "Duplicate upload",
  // });
  // console.log(`  Withdraw response: ${withdrawResponse.status}`);

  console.log("  Client example completed (no actual API calls made).");
}

// Run the main function
main();
