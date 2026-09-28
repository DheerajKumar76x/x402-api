const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "openapi.json");
const outputDir = path.join(root, "docs");
const openapi = JSON.parse(fs.readFileSync(source, "utf8"));
openapi.openapi = "3.0.3";
openapi.info.description = "Paid REST APIs on Base using x402 and USDC. A 402 response advertises payment requirements; send the signed payload in X-PAYMENT and retry.";
openapi.components.responses.PaymentRequired.description = "HTTP 402 payment challenge. The requirements identify the USDC asset, required amount in six-decimal atomic units, Base network, and payTo facilitator receiver address. Sign the EIP-3009 authorization, send it as X-PAYMENT, and retry. Successful responses include PAYMENT-RESPONSE.";
openapi.paths["/api/scraped-data"].get.parameters[0].description = "Absolute HTTP or HTTPS URL to scrape. Defaults to https://example.com.";
openapi.paths["/api/scraped-data"].get.responses["400"] = {
  description: "Invalid target URL.",
  content: { "application/json": { schema: { type: "object", required: ["success", "error"], properties: { success: { type: "boolean", example: false }, error: { type: "string", example: "Invalid target URL" }, message: { type: "string" } } } } }
};
for (const [route, methods] of Object.entries(openapi.paths)) {
  for (const operation of Object.values(methods)) {
    operation.responses ||= {};
    operation.responses["400"] ||= { description: "Invalid request parameters or body." };
    operation.responses["500"] = { description: "Unexpected server error." };
    for (const code of ["200", "202"]) {
      if (operation.responses[code]) {
        operation.responses[code].headers ||= {};
        operation.responses[code].headers["PAYMENT-RESPONSE"] ||= { "$ref": "#/components/headers/PaymentResponse" };
      }
    }
    if (!route.startsWith("/health")) operation.responses["402"] ||= { "$ref": "#/components/responses/PaymentRequired" };
  }
}
const mcp = JSON.parse(fs.readFileSync(path.join(root, "mcp.json"), "utf8"));
const discovery = {
  name: mcp.name,
  version: mcp.version,
  description: mcp.description,
  transport: "stdio",
  tools: mcp.tools
};

if (process.argv.includes("--check")) {
  if (!openapi.paths || !openapi.components?.responses?.PaymentRequired || !discovery.tools.length) {
    throw new Error("Generated API catalog is missing paths, a payment response, or MCP tools");
  }
  console.log(`Validated ${Object.keys(openapi.paths).length} OpenAPI paths and ${discovery.tools.length} MCP tools.`);
} else {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(root, ".well-known"), { recursive: true });
  fs.writeFileSync(path.join(outputDir, "openapi.json"), `${JSON.stringify(openapi, null, 2)}\n`);
  fs.writeFileSync(path.join(root, ".well-known", "mcp.json"), `${JSON.stringify(discovery, null, 2)}\n`);
  console.log("Generated docs/openapi.json and .well-known/mcp.json");
}
