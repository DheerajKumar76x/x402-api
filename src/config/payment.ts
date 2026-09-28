import "dotenv/config";
import type { MiddlewareOptions } from "@x402/x402-middleware";

type Network = "eip155:8453" | "eip155:84532";

export function getPaymentConfig(): MiddlewareOptions {
  const payTo = process.env.PAY_TO || process.env.WALLET_ADDRESS;
  if (!payTo || !/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
    throw new Error("PAY_TO must be a valid EVM address");
  }

  const keyId = process.env.CDP_API_KEY_ID || "";
  const keySecret = process.env.CDP_API_KEY_SECRET || "";
  const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return {
    payTo: payTo as `0x${string}`,
    network: (process.env.NETWORK === "base-sepolia" ? "eip155:84532" : "eip155:8453") as Network,
    facilitatorUrl: (process.env.FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/v2/x402/facilitator") as `${string}://${string}`,
    createAuthHeaders: async () => ({
      verify: { Authorization: `Basic ${basic}` },
      settle: { Authorization: `Basic ${basic}` },
      supported: { Authorization: `Basic ${basic}` },
      bazaar: { Authorization: `Basic ${basic}` }
    })
  };
}
