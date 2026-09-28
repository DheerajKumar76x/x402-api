"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = exports.paymentOptions = void 0;
exports.createCdpAuthFacilitator = createCdpAuthFacilitator;
require("dotenv/config");
const server_1 = require("@x402/core/server");
const auth_1 = require("@coinbase/cdp-sdk/auth");
function createCdpAuthFacilitator() {
    const configuredUrl = process.env.FACILITATOR_URL || "https://api.cdp.coinbase.com/platform/v2/x402";
    const baseUrl = configuredUrl.replace(/\/facilitator\/?$/, "");
    const endpoint = new URL(baseUrl);
    const basePath = endpoint.pathname.replace(/\/$/, "");
    const apiKeyId = process.env.CDP_API_KEY_ID || "";
    const apiKeySecret = process.env.CDP_API_KEY_SECRET || "";
    const headersFor = (path, method) => (0, auth_1.getAuthHeaders)({
        apiKeyId,
        apiKeySecret,
        requestMethod: method,
        requestHost: endpoint.host,
        requestPath: `${basePath}/${path}`
    });
    return new server_1.HTTPFacilitatorClient({
        url: baseUrl,
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
const paymentOptions = () => {
    const payTo = process.env.PAY_TO || process.env.WALLET_ADDRESS;
    if (!payTo || !/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
        throw new Error("PAY_TO must be a valid EVM address");
    }
    return {
        payTo: payTo,
        network: (process.env.NETWORK === "base-sepolia" ? "eip155:84532" : "eip155:8453"),
        createFacilitator: createCdpAuthFacilitator
    };
};
exports.paymentOptions = paymentOptions;
const start = (app) => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, "0.0.0.0", () => {
        console.log(`${process.env.SERVICE_NAME || "x402-service"} listening on ${port}`);
    });
};
exports.start = start;
