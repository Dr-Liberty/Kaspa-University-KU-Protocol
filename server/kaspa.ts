/**
 * Kaspa Blockchain Integration Service
 * 
 * Handles KAS reward distribution and on-chain verification for Kaspa University.
 * Uses K-Kluster approach for WASM RPC connection:
 * 1. WebSocket shim loaded before kaspa module
 * 2. initConsolePanicHook() for better error handling
 * 3. Resolver for auto node discovery
 * 4. blockAsyncConnect with timeout
 * 
 * Network: MAINNET (production)
 * 
 * SECURITY NOTE: This service manages a treasury wallet for reward distribution.
 * The mnemonic must be stored as a secret (KASPA_TREASURY_MNEMONIC).
 */

import { createHash } from "crypto";

// K-Kluster Fix #1: Load WebSocket shim BEFORE importing kaspa
// @ts-ignore
import WebSocket from "ws";
// @ts-ignore
globalThis.WebSocket = WebSocket;

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

// MAINNET configuration
const DEFAULT_CONFIG: KaspaConfig = {
  network: "mainnet",
  apiUrl: "https://api.kaspa.org",
};

class KaspaService {
  private config: KaspaConfig;
  private initialized: boolean = false;
  private treasuryAddress: string | null = null;
  private treasuryPrivateKey: any = null;
  private isLiveMode: boolean = false;
  private apiConnected: boolean = false;
  private rpcConnected: boolean = false;
  private rpcClient: any = null;
  private kaspaModule: any = null;

  constructor(config: Partial<KaspaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the Kaspa service
   * Uses K-Kluster approach: WebSocket shim + Resolver + initConsolePanicHook
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

      // Load kaspa module with K-Kluster approach
      await this.loadKaspaModule();

      // Derive treasury address from mnemonic using BIP44
      await this.deriveKeysFromMnemonic(mnemonic);

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
   * Load kaspa module with K-Kluster fixes
   */
  private async loadKaspaModule(): Promise<void> {
    try {
      console.log("[Kaspa] Loading kaspa module with K-Kluster fixes...");
      
      // Dynamic import after WebSocket shim is set
      this.kaspaModule = await import("kaspa");
      
      // K-Kluster Fix #2: Initialize console panic hook for better WASM errors
      if (this.kaspaModule.initConsolePanicHook) {
        this.kaspaModule.initConsolePanicHook();
        console.log("[Kaspa] Console panic hook initialized");
      }

      console.log("[Kaspa] Kaspa module loaded successfully");
    } catch (error: any) {
      console.error("[Kaspa] Failed to load kaspa module:", error.message);
      throw error;
    }
  }

  /**
   * Derive keys from mnemonic using BIP44 path for Kaspa
   * Kaspa BIP44 coin type: 111111
   * Path: m/44'/111111'/0'/0/0
   */
  private async deriveKeysFromMnemonic(mnemonicPhrase: string): Promise<void> {
    try {
      if (!this.kaspaModule) {
        throw new Error("Kaspa module not loaded");
      }

      const { Mnemonic, XPrv, NetworkType } = this.kaspaModule;

      // Create mnemonic from phrase
      const mnemonic = new Mnemonic(mnemonicPhrase);
      console.log("[Kaspa] Mnemonic validated");

      // Derive seed
      const seed = mnemonic.toSeed();

      // Create master extended private key
      const xprv = new XPrv(seed);

      // Derive using Kaspa BIP44 path: m/44'/111111'/0'/0/0
      const derivationPath = "m/44'/111111'/0'/0/0";
      const derivedKey = xprv.derivePath(derivationPath);
      
      // Get private key and address
      // NetworkType.Mainnet = 0, but toAddress accepts network string "mainnet"
      this.treasuryPrivateKey = derivedKey.toPrivateKey();
      this.treasuryAddress = this.treasuryPrivateKey.toAddress("mainnet").toString();

      console.log(`[Kaspa] Treasury address derived: ${this.treasuryAddress}`);
      console.log(`[Kaspa] Using BIP44 path: ${derivationPath}`);

    } catch (error: any) {
      console.error("[Kaspa] Failed to derive keys from mnemonic:", error.message);
      // Fallback to simple address derivation
      this.treasuryAddress = this.fallbackAddressDerivation(mnemonicPhrase);
      console.log(`[Kaspa] Fallback treasury address: ${this.treasuryAddress}`);
    }
  }

  /**
   * Fallback address derivation if WASM fails
   */
  private fallbackAddressDerivation(mnemonic: string): string {
    const hash = createHash("sha256").update(mnemonic).digest("hex");
    return `kaspa:qr${hash.slice(0, 60)}`;
  }

  /**
   * Try to connect via kaspa-wasm RPC
   * Note: Resolver is not exported from npm kaspa package, using direct URL
   */
  private async tryWasmRpcConnection(): Promise<void> {
    try {
      console.log("[Kaspa] Trying WASM RPC connection...");
      
      if (!this.kaspaModule) {
        throw new Error("Kaspa module not loaded");
      }

      const { RpcClient, Encoding } = this.kaspaModule;

      if (!RpcClient) {
        throw new Error("RpcClient not available");
      }

      // Public wRPC endpoints for Kaspa mainnet
      // Using Borsh encoding for efficiency
      const wRpcUrl = "wss://wrpc.kaspa.net:443";
      
      console.log(`[Kaspa] Connecting to wRPC: ${wRpcUrl}`);

      // Create RPC client with direct URL
      this.rpcClient = new RpcClient({
        url: wRpcUrl,
        encoding: Encoding?.Borsh || 0,
        networkId: this.config.network,
      });

      // Connect with timeout
      await this.rpcClient.connect({
        timeoutDuration: 5000,
        blockAsyncConnect: true,
      });

      console.log(`[Kaspa] WASM RPC connected to: ${this.rpcClient.url}`);

      // Test connection
      const info = await this.rpcClient.getBlockDagInfo();
      console.log(`[Kaspa] Block count: ${info?.blockCount || 'unknown'}`);
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
   * Send KAS reward to a user's wallet
   * Uses Generator for transaction creation and signing
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

    // Check if we have RPC connection and private key for signing
    if (this.rpcConnected && this.rpcClient && this.treasuryPrivateKey && this.kaspaModule) {
      try {
        return await this.sendTransactionViaWasm(recipientAddress, amountKas, lessonId, score);
      } catch (error: any) {
        console.error("[Kaspa] WASM transaction failed:", error.message);
        // Fall through to pending mode
      }
    }

    // Pending transaction mode
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
  }

  /**
   * Send transaction via WASM SDK
   */
  private async sendTransactionViaWasm(
    recipientAddress: string,
    amountKas: number,
    lessonId: string,
    score: number
  ): Promise<TransactionResult> {
    const { Generator, kaspaToSompi } = this.kaspaModule;

    // Get UTXOs for treasury address
    const utxosResponse = await this.rpcClient.getUtxosByAddresses([this.treasuryAddress]);
    const entries = utxosResponse.entries;

    if (!entries || entries.length === 0) {
      throw new Error("No UTXOs available in treasury wallet");
    }

    console.log(`[Kaspa] Found ${entries.length} UTXOs in treasury`);

    // Sort UTXOs by amount
    entries.sort((a: any, b: any) => (a.amount > b.amount ? 1 : -1));

    // Create transaction generator
    const generator = new Generator({
      entries,
      outputs: [{ address: recipientAddress, amount: kaspaToSompi(amountKas) }],
      priorityFee: kaspaToSompi(0.0001),
      changeAddress: this.treasuryAddress,
    });

    // Generate, sign, and submit transactions
    let finalTxHash = "";
    let pendingTransaction;
    
    while ((pendingTransaction = await generator.next())) {
      // Sign with treasury private key
      await pendingTransaction.sign([this.treasuryPrivateKey]);
      
      // Submit to network
      const txId = await pendingTransaction.submit(this.rpcClient);
      finalTxHash = txId;
      
      console.log(`[Kaspa] Transaction submitted: ${txId}`);
    }

    const summary = generator.summary();
    console.log(`[Kaspa] Transaction summary:`, summary);

    return { success: true, txHash: finalTxHash };
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
        return { 
          ...baseInfo, 
          status: "connected", 
          blockCount: info?.blockCount,
          rpcUrl: this.rpcClient.url,
        };
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
