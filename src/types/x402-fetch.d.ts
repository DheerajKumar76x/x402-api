declare module "@x402/fetch" {
  export class x402Client {
    register(network: string, scheme: unknown, protocolVersion?: number): this;
  }

  export function wrapFetchWithPayment(
    fetchFunction: typeof fetch,
    client: x402Client
  ): typeof fetch;
}
