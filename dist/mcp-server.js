#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const x402_paid_fetch_1 = require("./x402-paid-fetch");
const API_BASE_URL = process.env.API_BASE_URL || "https://x402-api-91r3.vercel.app";
let paidFetch;
function getPaidFetch() {
    if (!paidFetch) {
        const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("AGENT_WALLET_PRIVATE_KEY is required to pay for tool calls");
        }
        paidFetch = (0, x402_paid_fetch_1.createPaidFetch)(privateKey);
    }
    return paidFetch;
}
function toolError(message) {
    console.error(message);
    return {
        content: [{ type: "text", text: message }],
        isError: true,
    };
}
const server = new mcp_js_1.McpServer({
    name: "x402-scraped-data",
    version: "1.0.0",
});
server.registerTool("get_scraped_data", {
    title: "Get scraped data",
    description: "Fetches scraped JSON data for a target URL. Costs $0.01 USDC on Base per call, paid automatically from the configured wallet.",
    inputSchema: {
        target: zod_1.z
            .string()
            .url()
            .describe("The absolute URL to fetch scraped data for"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
    },
}, async ({ target }) => {
    try {
        const url = `${API_BASE_URL}/api/scraped-data?target=${encodeURIComponent(target)}`;
        const res = await getPaidFetch()(url);
        if (!res.ok) {
            const errorText = await res.text();
            return toolError(`Request failed with status ${res.status}: ${errorText}`);
        }
        const json = await res.json();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(json, null, 2),
                },
            ],
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return toolError(`get_scraped_data failed: ${message}`);
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("x402 MCP server running on stdio");
}
void main().catch((err) => {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error("MCP server failed to start:", message);
    process.exit(1);
});
