import type { Request } from "express";
import type { Network } from "@x402/core/types";
import type { HTTPFacilitatorClient } from "@x402/core/server";
export type PricingResolver = (request: Request) => string | Promise<string>;
export type PaymentRouteOptions = {
    path: string;
    method?: string;
    pricing: PricingResolver;
    description: string;
    network?: Network;
    extensions?: Record<string, unknown>;
    mimeType?: string;
};
export type MiddlewareOptions = {
    payTo: `0x${string}`;
    network?: Network;
    createFacilitator: () => HTTPFacilitatorClient;
};
