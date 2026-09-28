import type { RequestHandler } from "express";
import { createPaymentMiddleware } from "@x402/x402-middleware";
import { getPaymentConfig } from "../config/payment";
import type { PaymentRouteOptions } from "@x402/x402-middleware";

/** Creates a reusable x402 payment gate for a single protected route. */
export function x402(route: PaymentRouteOptions): RequestHandler {
  return createPaymentMiddleware(getPaymentConfig(), route);
}
