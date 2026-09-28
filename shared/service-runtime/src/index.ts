import "dotenv/config";
import type { Express } from "express";
import type { MiddlewareOptions } from "@x402/x402-middleware";
import type { Network } from "@x402/core/types";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { getAuthHeaders } from "@coinbase/cdp-sdk/auth";

export function createCdpAuthFacilitator(): HTTPFacilitatorClient {
  const configuredUrl = process.env.FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/v2/x402";
  const baseUrl = configuredUrl.replace(/\/facilitator\/?$/, "");
  const endpoint = new URL(baseUrl);
  const basePath = endpoint.pathname.replace(/\/$/, "");
  const apiKeyId = process.env.CDP_API_KEY_ID || "";
  const apiKeySecret = process.env.CDP_API_KEY_SECRET || "";

  const headersFor = (path: string, method: string) => getAuthHeaders({
    apiKeyId,
    apiKeySecret,
    requestMethod: method,
    requestHost: endpoint.host,
    requestPath: `${basePath}/${path}`
  });

  return new HTTPFacilitatorClient({
    url: baseUrl as `${string}://${string}`,
    createAuthHeaders: async () => {
      const [verify, settle, supported] = await Promise.all([
        headersFor("verify", "POST"),
        headersFor("settle", "POST"),
        headersFor("supported", "GET")
      ]);
      return { verify, settle, supported };
    }
  });
}

export const paymentOptions = (): MiddlewareOptions => {
  const payTo = process.env.PAY_TO || process.env.WALLET_ADDRESS;
  if (!payTo || !/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
    throw new Error("PAY_TO must be a valid EVM address");
  }

  return {
    payTo: payTo as `0x${string}`,
    network: (process.env.NETWORK === "base-sepolia" ? "eip155:84532" : "eip155:8453") as Network,
    createFacilitator: createCdpAuthFacilitator
  };
};

export const start = (app: Express): void => {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`${process.env.SERVICE_NAME || "x402-service"} listening on ${port}`);
  });
};
