declare module "kaspa" {
  export class RpcClient {
    constructor(config: {
      resolver?: Resolver;
      url?: string;
      encoding?: any;
      networkId?: string;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getInfo(): Promise<any>;
    getServerInfo(): Promise<any>;
    getBalanceByAddress(params: { address: string }): Promise<{ balance: string }>;
    getUtxosByAddresses(params: { addresses: string[] }): Promise<{ entries: any[] }>;
    getTransaction(params: { transactionId: string }): Promise<any>;
  }

  export class Resolver {
    constructor();
  }

  export const Encoding: {
    Borsh: any;
    Json: any;
  };

  export class Mnemonic {
    constructor(phrase: string);
    toSeed(passphrase?: string): Uint8Array;
  }

  export class XPrv {
    constructor(seed: Uint8Array);
    derivePath(path: string): XPrv;
    toPrivateKey(): PrivateKey;
  }

  export class PrivateKey {
    toPublicKey(): PublicKey;
  }

  export class PublicKey {
    toAddress(network: string): Address;
  }

  export class Address {
    constructor(address: string);
    toString(): string;
  }

  export class PaymentOutput {
    constructor(address: Address, amount: bigint);
  }

  export function createTransactions(params: {
    entries: any[];
    outputs: PaymentOutput[];
    changeAddress: Address;
    priorityFee: bigint;
    payload?: Uint8Array;
  }): Promise<{ transactions: Transaction[] }>;

  export class Transaction {
    id: string;
    sign(privateKeys: PrivateKey[]): void;
    submit(rpc: RpcClient): Promise<void>;
  }

  export function version(): string;
}
