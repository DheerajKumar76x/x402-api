#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPaidFetch } from "./x402-paid-fetch";

const API_BASE_URL = process.env.API_BASE_URL || "https://x402-api-91r3.vercel.app";

let paidFetch: typeof fetch | undefined;

function getPaidFetch(): typeof fetch {
  if (!paidFetch) {
    const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("AGENT_WALLET_PRIVATE_KEY is required to pay for tool calls");
    }
    paidFetch = createPaidFetch(privateKey);
  }
  return paidFetch;
}

function toolError(message: string) {
  console.error(message);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

const server = new McpServer({
  name: "x402-scraped-data",
  version: "1.0.0",
});

server.registerTool(
  "get_scraped_data",
  {
    title: "Get scraped data",
    description:
      "Fetches scraped JSON data for a target URL. Costs $0.01 USDC on Base per call, paid automatically from the configured wallet.",
    inputSchema: {
      target: z
        .string()
        .url()
        .describe("The absolute URL to fetch scraped data for"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  async ({ target }: { target: string }) => {
    try {
      const url = `${API_BASE_URL}/api/scraped-data?target=${encodeURIComponent(target)}`;
      const res = await getPaidFetch()(url);

      if (!res.ok) {
        const errorText = await res.text();
        return toolError(`Request failed with status ${res.status}: ${errorText}`);
      }

      const json: unknown = await res.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(json, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return toolError(`get_scraped_data failed: ${message}`);
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("x402 MCP server running on stdio");
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("MCP server failed to start:", message);
  process.exit(1);
});
