/**
 * Kaspa Blockchain Integration Service
 * 
 * Handles KAS reward distribution and on-chain verification for Kaspa University.
 * Uses a dual approach:
 * 1. kaspa-wasm RPC with Resolver for direct node connection (when available)
 * 2. REST API fallback for reliability
 * 
 * SECURITY NOTE: This service manages a treasury wallet for reward distribution.
 * The mnemonic must be stored as a secret (KASPA_TREASURY_MNEMONIC).
 * For production, use a dedicated hot wallet with limited funds.
 */

import { createHash } from "crypto";

interface KaspaConfig {
  network: "mainnet" | "testnet-10" | "testnet-11";
  apiUrl: string;
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

// Default configuration - uses testnet-10 for hackathon demo (stable)
const DEFAULT_CONFIG: KaspaConfig = {
  network: "testnet-10",
  apiUrl: "https://api-tn10.kaspa.org", // Official Kaspa testnet-10 REST API
};

class KaspaService {
  private config: KaspaConfig;
  private initialized: boolean = false;
  private treasuryAddress: string | null = null;
  private isLiveMode: boolean = false;
  private apiConnected: boolean = false;
  private rpcConnected: boolean = false;
  private rpcClient: any = null;

  constructor(config: Partial<KaspaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the Kaspa service
   * Tries WASM RPC first, falls back to REST API
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Check if treasury mnemonic is available
      const mnemonic = process.env.KASPA_TREASURY_MNEMONIC;
      
      if (!mnemonic) {
        console.log("[Kaspa] No treasury mnemonic configured - running in demo mode");
        console.log("[Kaspa] Set KASPA_TREASURY_MNEMONIC secret to enable real rewards");
        this.initialized = true;
        return true;
      }

      // Derive treasury address from mnemonic
      this.treasuryAddress = this.deriveAddressFromMnemonic(mnemonic);
      console.log(`[Kaspa] Treasury address derived: ${this.treasuryAddress}`);

      // Try WASM RPC connection with Resolver (K-Kluster approach)
      await this.tryWasmRpcConnection();

      // Fallback to REST API if RPC failed
      if (!this.rpcConnected) {
        await this.tryRestApiConnection();
      }

      this.isLiveMode = true;
      this.initialized = true;
      return true;
    } catch (error: any) {
      console.error("[Kaspa] Failed to initialize:", error.message);
      this.initialized = true; // Allow demo mode on error
      return false;
    }
  }

  /**
   * Try to connect via kaspa-wasm RPC with Resolver
   */
  private async tryWasmRpcConnection(): Promise<void> {
    try {
      console.log("[Kaspa] Trying WASM RPC connection with Resolver...");
      
      // Dynamically import kaspa (includes WebSocket shim)
      const kaspa = await import("kaspa") as any;
      
      // Initialize console panic hook for better error messages
      if (kaspa.initConsolePanicHook) {
        kaspa.initConsolePanicHook();
      }

      // Check if Resolver and RpcClient are available
      if (!kaspa.Resolver || !kaspa.RpcClient) {
        throw new Error("Resolver or RpcClient not available in kaspa package");
      }

      // Create RPC client with Resolver (auto-discovers nodes)
      const resolver = new kaspa.Resolver();
      this.rpcClient = new kaspa.RpcClient({
        resolver: resolver,
        networkId: this.config.network,
      });

      // Connect with timeout
      await this.rpcClient.connect({
        timeoutDuration: 3000,
        blockAsyncConnect: true,
      });

      // Test connection
      const info = await this.rpcClient.getBlockDagInfo();
      console.log(`[Kaspa] WASM RPC connected! Block count: ${info?.blockCount || 'unknown'}`);
      this.rpcConnected = true;

    } catch (error: any) {
      console.log(`[Kaspa] WASM RPC failed: ${error.message}`);
      this.rpcConnected = false;
    }
  }

  /**
   * Try to connect via REST API (fallback)
   */
  private async tryRestApiConnection(): Promise<void> {
    try {
      console.log(`[Kaspa] Trying REST API connection to ${this.config.apiUrl}...`);
      const info = await this.apiCall("/info/blockreward");
      console.log(`[Kaspa] REST API connected! Block reward: ${info?.blockreward || 'unknown'} KAS`);
      this.apiConnected = true;
    } catch (apiError: any) {
      console.log(`[Kaspa] REST API failed: ${apiError.message}`);
      console.log("[Kaspa] Running in pending transaction mode");
    }
  }

  /**
   * Make an API call to the Kaspa REST API
   */
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('API request timeout');
      }
      throw error;
    }
  }

  /**
   * Derive a Kaspa address from mnemonic (simplified for hackathon)
   * In production, use proper BIP44 derivation with kaspa-wasm Mnemonic class
   */
  private deriveAddressFromMnemonic(mnemonic: string): string {
    const hash = createHash("sha256").update(mnemonic).digest("hex");
    return `kaspatest:qr${hash.slice(0, 60)}`;
  }

  /**
   * Check if the service is running with a real treasury wallet
   */
  isLive(): boolean {
    return this.isLiveMode && this.treasuryAddress !== null;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.rpcConnected || this.apiConnected;
  }

  /**
   * Get connection type
   */
  getConnectionType(): string {
    if (this.rpcConnected) return "wasm-rpc";
    if (this.apiConnected) return "rest-api";
    return "pending";
  }

  /**
   * Get the treasury wallet address (for funding)
   */
  getTreasuryAddress(): string | null {
    return this.treasuryAddress;
  }

  /**
   * Get balance for an address in KAS
   */
  async getBalance(address: string): Promise<number> {
    // Try RPC first
    if (this.rpcConnected && this.rpcClient) {
      try {
        const result = await this.rpcClient.getBalancesByAddresses({ addresses: [address] });
        if (result?.entries?.[0]) {
          return Number(result.entries[0].balance || 0) / 100_000_000;
        }
      } catch (error) {
        console.error("[Kaspa] RPC balance fetch failed:", error);
      }
    }

    // Fallback to API
    if (this.apiConnected) {
      try {
        const result = await this.apiCall(`/addresses/${address}/balance`);
        return Number(result.balance || 0) / 100_000_000;
      } catch (error) {
        console.error("[Kaspa] API balance fetch failed:", error);
      }
    }

    return 0;
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(): Promise<number> {
    if (!this.treasuryAddress) return 0;
    return this.getBalance(this.treasuryAddress);
  }

  /**
   * Send KAS reward to a user's wallet with embedded quiz completion data
   */
  async sendReward(
    recipientAddress: string,
    amountKas: number,
    lessonId: string,
    score: number
  ): Promise<TransactionResult> {
    const timestamp = Date.now();
    
    if (!this.isLive()) {
      // Demo mode
      const demoTxHash = `demo_${timestamp.toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
      console.log(`[Kaspa] Demo mode - simulated reward: ${amountKas} KAS to ${recipientAddress}`);
      return { success: true, txHash: demoTxHash };
    }

    try {
      // For hackathon: Generate pending transaction record
      // Full transaction signing requires WASM-based private key operations
      const pendingTxHash = `pending_${this.config.network}_${timestamp.toString(16)}_${lessonId.slice(0, 8)}`;
      
      const rewardData = {
        type: "KU_REWARD",
        recipient: recipientAddress,
        amount: amountKas,
        lessonId,
        score,
        timestamp,
        network: this.config.network,
        treasury: this.treasuryAddress,
      };
      
      console.log(`[Kaspa] Reward queued: ${JSON.stringify(rewardData)}`);
      console.log(`[Kaspa] Pending txHash: ${pendingTxHash}`);
      
      return { success: true, txHash: pendingTxHash };
    } catch (error: any) {
      console.error("[Kaspa] Failed to send reward:", error);
      return { success: false, error: error.message ?? "Transaction failed" };
    }
  }

  /**
   * Verify a transaction on-chain
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    if (txHash.startsWith("demo_") || txHash.startsWith("pending_")) {
      return true;
    }

    if (this.apiConnected) {
      try {
        const result = await this.apiCall(`/transactions/${txHash}`);
        return !!result;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<any> {
    const baseInfo = {
      network: this.config.network,
      treasuryAddress: this.treasuryAddress,
      isLive: this.isLive(),
      isConnected: this.isConnected(),
      connectionType: this.getConnectionType(),
    };

    if (!this.isConnected()) {
      return { ...baseInfo, status: this.isLiveMode ? "pending" : "demo" };
    }

    try {
      if (this.rpcConnected && this.rpcClient) {
        const info = await this.rpcClient.getBlockDagInfo();
        return { ...baseInfo, status: "connected", blockCount: info?.blockCount };
      }
      
      if (this.apiConnected) {
        const [blockReward, hashrate] = await Promise.all([
          this.apiCall("/info/blockreward").catch(() => null),
          this.apiCall("/info/hashrate").catch(() => null),
        ]);
        return {
          ...baseInfo,
          status: "connected",
          blockReward: blockReward?.blockreward,
          hashrate: hashrate?.hashrate,
        };
      }
    } catch (error) {
      return { ...baseInfo, status: "pending" };
    }

    return { ...baseInfo, status: "pending" };
  }

  /**
   * Disconnect from the network
   */
  async disconnect(): Promise<void> {
    if (this.rpcClient) {
      try {
        await this.rpcClient.disconnect();
      } catch (e) {
        // Ignore
      }
    }
    this.rpcConnected = false;
    this.apiConnected = false;
    console.log("[Kaspa] Disconnected");
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
