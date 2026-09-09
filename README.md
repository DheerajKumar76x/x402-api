# x402 API Portfolio

Five Express + TypeScript x402 services share one Vercel deployment and one Base USDC treasury.

## Production access

Base URL: `https://x402-api-91r3.vercel.app`

- AlphaRoute: `/alpharoute`
- SentinelFeed: `/sentinelfeed`
- ComplyRail: `/complyrail`
- DistillForge: `/distillforge`
- ProofMesh: `/proofmesh`
- Original scraper: `/api/scraped-data`

Every public operation is paid. An unpaid request returns HTTP 402 with a `PAYMENT-REQUIRED` header. Sign the EIP-3009 USDC payment and retry it in `X-PAYMENT`; the successful response includes `PAYMENT-RESPONSE`.

The complete marketplace-ready catalog is in [MARKETPLACE.md](MARKETPLACE.md). Copy-paste payloads and schemas for every business endpoint are in [MARKETPLACE_METADATA.md](MARKETPLACE_METADATA.md), and the machine-readable API contract is [openapi.json](openapi.json).

## MCP server (stdio)

Build and run the marketplace adapter with JSON-RPC on stdin/stdout. Internal logs go to stderr.

```powershell
npm install
npm run build
$env:AGENT_WALLET_PRIVATE_KEY="0x..."
npm run mcp
```

Cursor/Claude config is in [mcp-config.json](mcp-config.json). Smithery config is [smithery.yaml](smithery.yaml). The CLI binary after build is `x402-mcp` (`dist/mcp-server.js`).

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run build:all
npm run dev:alpharoute
```

Use [scripts/smoke-test.ps1](scripts/smoke-test.ps1) for unpaid 402 checks. Use `npm run smoke` with `AGENT_WALLET_PRIVATE_KEY` set locally for signed retries.

The business responses are launch stubs and must be replaced before production use.
## Publishing to MCPmarket & Smithery

### 1. Prepare the package
- Ensure `package.json` has correct `name`, `version`, `description`, `repository`, `keywords` (include `mcp`, `model-context-protocol`).
- Verify `bin` points to `dist/mcp-server.js`.
- Confirm `smithery.yaml` and `mcp.json` are present in the repo root.

### 2. Build the distribution
```powershell
npm run build
```
The compiled files are emitted to `dist/`.

### 3. Publish to the MCP marketplace
1. Log in to the MCPmarket portal and create a new “MCP Server” entry.
2. Upload the `dist/` folder as a zip archive or point the entry to the public Vercel URL.
3. Fill in the metadata using the schemas from `MARKETPLACE_METADATA.md`.
4. Submit for review. Once approved, the server will be discoverable via the MCP marketplace.

### 4. Register on Smithery
1. Open the Smithery dashboard → “Add MCP Server”.
2. Provide the endpoint URL (e.g., `https://x402-api-91r3.vercel.app/api/mcp`).
3. Upload `smithery.yaml` from the repo.
4. Save and verify the health check passes.

### 5. Make it discoverable
- Add relevant tags to `package.json` (`"mcp", "model-context-protocol", "x402"`).
- Publish a short announcement on the **MCPmarket Community** and **Smithery Forum** with links to the GitHub repository.
- Include a badge in the README:
```markdown
[![MCP Server](https://img.shields.io/badge/MCP-Server-blue)](https://mcpmarket.com/servers/x402-api)
```

### 6. Verify
Run the smoke‑test script:
```powershell
scripts/smoke-test.ps1
```
All endpoints should return valid JSON and respect the payment flow.

*After publishing, update the repository’s `README.md` with the badge and a “Published on” badge showing the version.*
