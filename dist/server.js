"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const scraped_data_1 = __importDefault(require("./routes/scraped-data"));
const errors_1 = require("./middleware/errors");
const payment_1 = require("./config/payment");
const x402_middleware_1 = require("@x402/x402-middleware");
const x402_1 = require("./middleware/x402");
const app = (0, express_1.default)();
app.set("trust proxy", true);
app.use(express_1.default.json());
app.get("/", (_req, res) => res.status(200).json({ name: "x402 API Portfolio", openapi: "/docs/openapi.json", mcp: "/.well-known/mcp.json" }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", network: process.env.NETWORK || "base" }));
app.use((0, x402_1.x402)({ path: "/api/scraped-data", pricing: (0, x402_middleware_1.flatPrice)("$0.01"), description: "Returns fresh scraped JSON data for a given target URL" }));
app.use("/api/scraped-data", scraped_data_1.default);
app.use(errors_1.notFound);
app.use(errors_1.errorHandler);
const port = Number(process.env.PORT || 4021);
const payment = (0, payment_1.getPaymentConfig)();
app.listen(port, "0.0.0.0", () => {
    console.log(`x402 API listening on ${port} (${payment.network})`);
    console.log(`Payment receiver: ${payment.payTo}`);
});
