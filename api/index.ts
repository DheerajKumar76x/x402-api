import express from "express";
import portfolio from "./portfolio";
import { errorHandler, notFound } from "../src/middleware/errors";
import scrapedData from "../src/routes/scraped-data";
import openapi from "../docs/openapi.json";
import mcp from "../.well-known/mcp.json";
import { flatPrice } from "@x402/x402-middleware";
import { x402 } from "../src/middleware/x402";

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.get("/", (_req, res) => res.json({ name: "x402 API Portfolio", openapi: "/docs/openapi.json", mcp: "/.well-known/mcp.json" }));
app.get("/health", (_req, res) => res.json({ status: "ok", network: process.env.NETWORK || "base" }));
app.get("/openapi.json", (_req, res) => res.json(openapi));
app.get("/docs/openapi.json", (_req, res) => res.json(openapi));
app.get("/.well-known/mcp.json", (_req, res) => res.json(mcp));
app.use(x402({ path: "/api/scraped-data", pricing: flatPrice("$0.01"), description: "Returns fresh scraped JSON data for a given target URL" }));
app.use("/api/scraped-data", scrapedData);
app.use(portfolio);
app.use(notFound);
app.use(errorHandler);

export default app;
