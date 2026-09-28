import "dotenv/config";
import express from "express";
import scrapedData from "./routes/scraped-data";
import { errorHandler, notFound } from "./middleware/errors";
import { getPaymentConfig } from "./config/payment";
import { flatPrice } from "@x402/x402-middleware";
import { x402 } from "./middleware/x402";

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.get("/", (_req, res) => res.status(200).json({ name: "x402 API Portfolio", openapi: "/docs/openapi.json", mcp: "/.well-known/mcp.json" }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", network: process.env.NETWORK || "base" }));
app.use(x402({ path: "/api/scraped-data", pricing: flatPrice("$0.01"), description: "Returns fresh scraped JSON data for a given target URL" }));
app.use("/api/scraped-data", scrapedData);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4021);
const payment = getPaymentConfig();
app.listen(port, "0.0.0.0", () => {
  console.log(`x402 API listening on ${port} (${payment.network})`);
  console.log(`Payment receiver: ${payment.payTo}`);
});
