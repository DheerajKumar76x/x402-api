import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export function createPaidFetch(privateKey: string): typeof fetch {
  if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
    throw new Error("AGENT_WALLET_PRIVATE_KEY must be a 0x-prefixed 32-byte hex private key");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const network = process.env.NETWORK === "base-sepolia" ? "eip155:84532" : "eip155:8453";
  const client = new x402Client().register(network, new ExactEvmScheme(account));
  return wrapFetchWithPayment(fetch, client);
}
