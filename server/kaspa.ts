/**
 * Kaspa Blockchain Integration Service
 * 
 * Handles KAS reward distribution and on-chain verification for Kaspa University.
 * Uses the official Kaspa WASM SDK for transaction creation and signing.
 * 
 * SECURITY NOTE: This service manages a treasury wallet for reward distribution.
 * The mnemonic must be stored as a secret (KASPA_TREASURY_MNEMONIC).
 * For production, use a dedicated hot wallet with limited funds.
 */

interface KaspaConfig {
  network: "mainnet" | "testnet-10" | "testnet-11";
  rpcUrl: string;
  treasuryMnemonic?: string;
}

interface RewardTransaction {
  txHash: string;
  amount: number;
  recipientAddress: string;
  lessonId: string;
  score: number;
  timestamp: number;
}

interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Default configuration - uses testnet for hackathon demo
const DEFAULT_CONFIG: KaspaConfig = {
  network: "testnet-11",
  rpcUrl: "seeder1.kaspad.net:16210", // Testnet-11 seeder
};

class KaspaService {
  private config: KaspaConfig;
  private initialized: boolean = false;
  private kaspaModule: any = null;
  private rpcClient: any = null;
  private treasuryWallet: any = null;

  constructor(config: Partial<KaspaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the Kaspa SDK and connect to the network
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Dynamic import of kaspa module (WASM)
      const kaspa = await import("kaspa");
      this.kaspaModule = kaspa;

      // Check if treasury mnemonic is available
      const mnemonic = process.env.KASPA_TREASURY_MNEMONIC;
      
      if (!mnemonic) {
        console.log("[Kaspa] No treasury mnemonic configured - running in demo mode");
        console.log("[Kaspa] Set KASPA_TREASURY_MNEMONIC secret to enable real rewards");
        this.initialized = true;
        return true;
      }

      // Initialize RPC client
      const { RpcClient, Encoding, Resolver } = kaspa;
      
      this.rpcClient = new RpcClient({
        resolver: new Resolver(),
        encoding: Encoding.Borsh,
        networkId: this.config.network,
      });

      await this.rpcClient.connect();
      console.log(`[Kaspa] Connected to ${this.config.network}`);

      // Initialize treasury wallet from mnemonic
      const { Mnemonic, XPrv, PublicKeyGenerator, Address } = kaspa;
      
      const mnemonicObj = new Mnemonic(mnemonic);
      const seed = mnemonicObj.toSeed();
      const xprv = new XPrv(seed);
      
      // Derive the first receiving address (m/44'/111111'/0'/0/0 for Kaspa)
      const derivePath = "m/44'/111111'/0'/0/0";
      const privateKey = xprv.derivePath(derivePath).toPrivateKey();
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress(this.config.network);

      this.treasuryWallet = {
        privateKey,
        publicKey,
        address: address.toString(),
      };

      console.log(`[Kaspa] Treasury wallet initialized: ${this.treasuryWallet.address}`);
      
      // Get balance
      const balance = await this.getBalance(this.treasuryWallet.address);
      console.log(`[Kaspa] Treasury balance: ${balance} KAS`);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("[Kaspa] Failed to initialize:", error);
      this.initialized = true; // Allow demo mode on error
      return false;
    }
  }

  /**
   * Check if the service is running with a real treasury wallet
   */
  isLive(): boolean {
    return this.treasuryWallet !== null && this.rpcClient !== null;
  }

  /**
   * Get the treasury wallet address (for funding)
   */
  getTreasuryAddress(): string | null {
    return this.treasuryWallet?.address ?? null;
  }

  /**
   * Get balance for an address in KAS
   */
  async getBalance(address: string): Promise<number> {
    if (!this.rpcClient) return 0;

    try {
      const result = await this.rpcClient.getBalanceByAddress({ address });
      // Convert from sompi (1 KAS = 100,000,000 sompi)
      return Number(result.balance) / 100_000_000;
    } catch (error) {
      console.error("[Kaspa] Failed to get balance:", error);
      return 0;
    }
  }

  /**
   * Send KAS reward to a user's wallet with embedded quiz completion data
   * 
   * The transaction includes OP_RETURN data with:
   * - Platform identifier: "KU" (Kaspa University)
   * - Lesson ID
   * - Score
   * - Timestamp
   * 
   * This creates an immutable on-chain proof of quiz completion.
   */
  async sendReward(
    recipientAddress: string,
    amountKas: number,
    lessonId: string,
    score: number
  ): Promise<TransactionResult> {
    if (!this.isLive()) {
      // Demo mode - generate mock transaction
      const mockTxHash = `demo_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
      console.log(`[Kaspa] Demo mode - mock reward: ${amountKas} KAS to ${recipientAddress}`);
      return {
        success: true,
        txHash: mockTxHash,
      };
    }

    try {
      const kaspa = this.kaspaModule;
      const { createTransactions, PaymentOutput, Address } = kaspa;

      // Convert KAS to sompi (1 KAS = 100,000,000 sompi)
      const amountSompi = BigInt(Math.floor(amountKas * 100_000_000));

      // Create embedded data for OP_RETURN
      // Format: "KU:<lessonId>:<score>:<timestamp>"
      const timestamp = Date.now();
      const opReturnData = `KU:${lessonId}:${score}:${timestamp}`;
      const opReturnBytes = new TextEncoder().encode(opReturnData);

      // Get UTXOs for treasury wallet
      const utxos = await this.rpcClient.getUtxosByAddresses({
        addresses: [this.treasuryWallet.address],
      });

      if (!utxos.entries || utxos.entries.length === 0) {
        return { success: false, error: "Insufficient funds in treasury" };
      }

      // Create payment output
      const recipientAddr = new Address(recipientAddress);
      const payment = new PaymentOutput(recipientAddr, amountSompi);

      // Create and sign transaction
      const { transactions } = await createTransactions({
        entries: utxos.entries,
        outputs: [payment],
        changeAddress: new Address(this.treasuryWallet.address),
        priorityFee: 0n,
        payload: opReturnBytes, // Embedded quiz completion data
      });

      // Sign and submit each transaction
      for (const tx of transactions) {
        tx.sign([this.treasuryWallet.privateKey]);
        await tx.submit(this.rpcClient);
      }

      const txHash = transactions[0]?.id ?? "";
      console.log(`[Kaspa] Reward sent: ${amountKas} KAS to ${recipientAddress}, txHash: ${txHash}`);

      return {
        success: true,
        txHash,
      };
    } catch (error: any) {
      console.error("[Kaspa] Failed to send reward:", error);
      return {
        success: false,
        error: error.message ?? "Transaction failed",
      };
    }
  }

  /**
   * Verify a transaction on-chain
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    if (!this.rpcClient || txHash.startsWith("demo_")) {
      return txHash.startsWith("demo_"); // Demo transactions are "verified"
    }

    try {
      // Query transaction from node
      // Note: Full verification would check block confirmations
      const result = await this.rpcClient.getTransaction({ transactionId: txHash });
      return !!result;
    } catch (error) {
      console.error("[Kaspa] Failed to verify transaction:", error);
      return false;
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<any> {
    if (!this.rpcClient) {
      return { network: this.config.network, status: "demo" };
    }

    try {
      const info = await this.rpcClient.getServerInfo();
      return {
        network: this.config.network,
        status: "live",
        ...info,
      };
    } catch (error) {
      return { network: this.config.network, status: "error" };
    }
  }

  /**
   * Disconnect from the network
   */
  async disconnect(): Promise<void> {
    if (this.rpcClient) {
      await this.rpcClient.disconnect();
      console.log("[Kaspa] Disconnected");
    }
  }
}

// Singleton instance
let kaspaServiceInstance: KaspaService | null = null;

export async function getKaspaService(): Promise<KaspaService> {
  if (!kaspaServiceInstance) {
    kaspaServiceInstance = new KaspaService();
    await kaspaServiceInstance.initialize();
  }
  return kaspaServiceInstance;
}

export { KaspaService, KaspaConfig, RewardTransaction, TransactionResult };
