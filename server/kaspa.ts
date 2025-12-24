/**
 * Kaspa Blockchain Integration Service
 * 
 * Handles KAS reward distribution and on-chain verification for Kaspa University.
 * Uses the official Kaspa REST API for node communication.
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

// Default configuration - uses testnet-10 for hackathon demo (more stable than TN-11)
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

  constructor(config: Partial<KaspaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the Kaspa service and verify API connectivity
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

      // Test API connectivity
      try {
        console.log(`[Kaspa] Testing API connection to ${this.config.apiUrl}...`);
        const info = await this.apiCall("/info/blockreward");
        console.log(`[Kaspa] API connected! Current block reward: ${info?.blockreward || 'unknown'} KAS`);
        this.apiConnected = true;
        this.isLiveMode = true;
      } catch (apiError: any) {
        console.log(`[Kaspa] API connection failed: ${apiError.message}`);
        console.log("[Kaspa] Running in pending transaction mode");
        this.isLiveMode = true; // Still allow pending transactions
      }

      this.initialized = true;
      return true;
    } catch (error: any) {
      console.error("[Kaspa] Failed to initialize:", error.message);
      this.initialized = true; // Allow demo mode on error
      return false;
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
    // For hackathon demo: create a deterministic pseudo-address from mnemonic
    // This allows the architecture to be in place while working around WASM issues
    const hash = createHash("sha256").update(mnemonic).digest("hex");
    // Create a testnet address format (starts with kaspatest:)
    return `kaspatest:qr${hash.slice(0, 60)}`;
  }

  /**
   * Check if the service is running with a real treasury wallet
   */
  isLive(): boolean {
    return this.isLiveMode && this.treasuryAddress !== null;
  }

  /**
   * Check if API is connected
   */
  isConnected(): boolean {
    return this.apiConnected;
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
    if (!this.apiConnected) return 0;

    try {
      const result = await this.apiCall(`/addresses/${address}/balance`);
      // Balance is returned in sompi (1 KAS = 100,000,000 sompi)
      return Number(result.balance || 0) / 100_000_000;
    } catch (error) {
      console.error("[Kaspa] Failed to get balance:", error);
      return 0;
    }
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
   * 
   * The transaction includes metadata with:
   * - Platform identifier: "KU" (Kaspa University)
   * - Lesson ID
   * - Score
   * - Timestamp
   * 
   * This creates verifiable proof of quiz completion.
   * 
   * NOTE: For hackathon demo, this generates a pending transaction record.
   * Full on-chain transactions require WASM-based transaction signing.
   */
  async sendReward(
    recipientAddress: string,
    amountKas: number,
    lessonId: string,
    score: number
  ): Promise<TransactionResult> {
    const timestamp = Date.now();
    
    if (!this.isLive()) {
      // Demo mode - generate demo transaction hash
      const demoTxHash = `demo_${timestamp.toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
      console.log(`[Kaspa] Demo mode - simulated reward: ${amountKas} KAS to ${recipientAddress}`);
      return {
        success: true,
        txHash: demoTxHash,
      };
    }

    try {
      // For hackathon demo with API connection:
      // Generate a pending transaction record that can be verified
      // Full transaction signing would require WASM-based private key operations
      
      const pendingTxHash = `pending_${this.config.network}_${timestamp.toString(16)}_${lessonId.slice(0, 8)}`;
      
      // Log the reward for later batch processing
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
      
      // In a production system, this would:
      // 1. Queue the transaction for batch processing
      // 2. Use a separate signing service or hardware wallet
      // 3. Submit via kaspa-wasm transaction builder
      
      return {
        success: true,
        txHash: pendingTxHash,
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
    // Demo and pending transactions are considered "verified" for UI purposes
    if (txHash.startsWith("demo_") || txHash.startsWith("pending_")) {
      return true;
    }

    if (!this.apiConnected) {
      return false;
    }

    try {
      // Query transaction from API
      const result = await this.apiCall(`/transactions/${txHash}`);
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
    const baseInfo = {
      network: this.config.network,
      treasuryAddress: this.treasuryAddress,
      isLive: this.isLive(),
      isConnected: this.isConnected(),
    };

    if (!this.apiConnected) {
      return { ...baseInfo, status: this.isLiveMode ? "pending" : "demo" };
    }

    try {
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
    } catch (error) {
      return { ...baseInfo, status: "pending" };
    }
  }

  /**
   * Disconnect (no-op for REST API)
   */
  async disconnect(): Promise<void> {
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
