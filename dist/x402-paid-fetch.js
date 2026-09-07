"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaidFetch = createPaidFetch;
const fetch_1 = require("@x402/fetch");
const evm_1 = require("@x402/evm");
const accounts_1 = require("viem/accounts");
const PRIVATE_KEY_PATTERN = /^0x[a-fA-F0-9]{64}$/;
function createPaidFetch(privateKey) {
    if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
        throw new Error("AGENT_WALLET_PRIVATE_KEY must be a 0x-prefixed 32-byte hex private key");
    }
    const account = (0, accounts_1.privateKeyToAccount)(privateKey);
    const network = process.env.NETWORK === "base-sepolia" ? "eip155:84532" : "eip155:8453";
    const client = new fetch_1.x402Client().register(network, new evm_1.ExactEvmScheme(account));
    return (0, fetch_1.wrapFetchWithPayment)(fetch, client);
}
