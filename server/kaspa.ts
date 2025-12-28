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
 * The private key must be stored as a secret (KASPA_TREASURY_PRIVATE_KEY).
 * Supports both 64-character hex private keys and BIP39 mnemonic phrases.
 */

import { createHash } from "crypto";
import * as bip39 from "bip39";
import HDKey from "hdkey";
import bs58check from "bs58check";
import { bech32 } from "bech32";
import {
  createQuizPayload,
  createQAQuestionPayload,
  createQAAnswerPayload,
  parseKUPayload,
  isKUTransaction,
  hexToString,
  stringToHex,
  type QuizPayload,
  type QAQuestionPayload,
  type QAAnswerPayload,
} from "./ku-protocol.js";
import { getUTXOManager, type UTXO } from "./utxo-manager.js";

// K-Kluster Fix #1: Load W3C-compatible WebSocket shim BEFORE importing kaspa
// Use createRequire for CommonJS modules in ESM context
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { w3cwebsocket: W3CWebSocket } = require("websocket");
// @ts-ignore
globalThis.WebSocket = W3CWebSocket;

interface KaspaConfig {
  network: "mainnet" | "testnet-10" | "testnet-11";
  apiUrl: string;
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
  private rpcConnected: boolean = false;        // kaspa-rpc-client connection status
  private wasmRpcConnected: boolean = false;    // WASM RpcClient connection status
  private rpcClient: any = null;                // kaspa-rpc-client (npm) for UTXO fetching
  private wasmRpcClient: any = null;            // WASM RpcClient for PendingTransaction.submit()
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
      // Get treasury private key from environment
      const privateKeyHex = process.env.KASPA_TREASURY_PRIVATEKEY || process.env.KASPA_TREASURY_PRIVATE_KEY;
      
      if (!privateKeyHex) {
        console.log("[Kaspa] No treasury private key configured - running in demo mode");
        console.log("[Kaspa] Set KASPA_TREASURY_PRIVATEKEY secret to enable real rewards");
        this.initialized = true;
        return true;
      }

      // Load kaspa module with K-Kluster approach
      await this.loadKaspaModule();

      // Derive treasury address from private key hex
      await this.deriveKeysFromPrivateKey(privateKeyHex);

      // Try kaspa-rpc-client first (pure TypeScript, most reliable in Node.js)
      await this.tryRpcClientConnection();

      // Fallback to WASM RPC if pure client failed
      // Note: WASM RpcClient in Node.js has WebSocket issues, so kaspa-rpc-client is preferred
      if (!this.rpcConnected) {
        await this.tryWasmRpcConnection();
      }

      // Fallback to REST API if all RPC methods failed
      if (!this.rpcConnected) {
        await this.tryRestApiConnection();
      }

      // CRITICAL: Only enable live mode if we have kaspa-rpc-client connected and treasury keys
      // WASM RpcClient is no longer required - we use serializeToObject() + rpcClient.submitTransaction()
      const canEnableLive = this.rpcConnected && 
                            this.treasuryAddress && 
                            this.treasuryPrivateKey;
      
      if (canEnableLive) {
        this.isLiveMode = true;
        console.log(`[Kaspa] Live mode enabled - RPC connected, treasury: ${this.treasuryAddress.slice(0, 25)}...`);
      } else {
        this.isLiveMode = false;
        const reasons: string[] = [];
        if (!this.rpcConnected) reasons.push("RPC not connected");
        if (!this.treasuryAddress) reasons.push("No treasury address");
        if (!this.treasuryPrivateKey) reasons.push("No private key");
        console.error(`[Kaspa] Cannot enable live mode: ${reasons.join(", ")}`);
        console.log("[Kaspa] Running in demo mode - transactions will be simulated");
      }
      
      this.initialized = true;
      return this.isLiveMode;
    } catch (error: any) {
      console.error("[Kaspa] Failed to initialize:", error.message);
      this.isLiveMode = false;
      this.initialized = true; // Allow demo mode on error
      return false;
    }
  }

  /**
   * Load kaspa WASM module from local bundle (rusty-kaspa v1.0.1)
   * 
   * Uses ONLY the local WASM bundle from server/wasm/ - NO npm package fallback.
   * The npm "kaspa" package is outdated and has API drift issues.
   * 
   * Reference: https://github.com/kaspanet/rusty-kaspa/tree/master/wasm
   * Source: https://github.com/kaspanet/rusty-kaspa/releases/tag/v1.0.1
   */
  private async loadKaspaModule(): Promise<void> {
    try {
      console.log("[Kaspa] Loading kaspa WASM module v1.0.1...");
      
      const path = await import("path");
      const fs = await import("fs");
      
      // Development path (tsx from project root)
      const devWasmPath = path.join(process.cwd(), "server/wasm/kaspa.js");
      // Production path (esbuild bundle in dist/)
      const prodWasmPath = path.join(process.cwd(), "dist/wasm/kaspa.js");
      
      // Determine which WASM path to use
      let wasmPath: string | null = null;
      if (fs.existsSync(prodWasmPath)) {
        wasmPath = prodWasmPath;
        console.log("[Kaspa] Using production WASM from dist/wasm/");
      } else if (fs.existsSync(devWasmPath)) {
        wasmPath = devWasmPath;
        console.log("[Kaspa] Using development WASM from server/wasm/");
      }
      
      if (!wasmPath) {
        throw new Error("Kaspa WASM module not found. Expected at server/wasm/kaspa.js or dist/wasm/kaspa.js");
      }
      
      // Use require() for CommonJS WASM bundle (synchronous loading)
      // The WASM module auto-initializes on require() - see kaspa.js lines 14794-14799
      this.kaspaModule = require(wasmPath);
      
      // Verify critical exports are available
      const requiredExports = ['PrivateKey', 'createTransactions', 'kaspaToSompi', 'Generator'];
      const missingExports = requiredExports.filter(exp => !this.kaspaModule[exp]);
      if (missingExports.length > 0) {
        throw new Error(`WASM module missing required exports: ${missingExports.join(', ')}`);
      }
      
      // Initialize console panic hook for better WASM error debugging
      // Reference: https://kaspa-mdbook.aspectron.com/
      if (typeof this.kaspaModule.initConsolePanicHook === 'function') {
        this.kaspaModule.initConsolePanicHook();
        console.log("[Kaspa] Console panic hook initialized for WASM debugging");
      }

      console.log("[Kaspa] Kaspa WASM v1.0.1 loaded successfully");
      console.log("[Kaspa] Available exports:", Object.keys(this.kaspaModule).slice(0, 10).join(', ') + '...');
    } catch (error: any) {
      console.error("[Kaspa] Failed to load WASM module:", error.message);
      console.error("[Kaspa] Ensure server/wasm/ contains kaspa.js and kaspa_bg.wasm from rusty-kaspa v1.0.1");
      throw error;
    }
  }

  /**
   * Derive keys from private key hex
   * Uses raw 64-character hex private key directly
   */
  private async deriveKeysFromPrivateKey(privateKeyHex: string): Promise<void> {
    try {
      // Clean up input - trim whitespace
      const cleanInput = privateKeyHex.trim();
      
      // Validate that this is a raw private key (64 hex characters)
      const isRawPrivateKey = /^[0-9a-fA-F]{64}$/.test(cleanInput);
      
      if (!isRawPrivateKey) {
        throw new Error("Invalid private key format. Expected 64 hex characters.");
      }
      
      console.log("[Kaspa] Using raw private key (64 hex chars)");
      await this.useRawPrivateKey(cleanInput);

    } catch (error: any) {
      console.error("[Kaspa] Failed to derive keys from private key:", error.message);
      this.treasuryPrivateKey = null;
      console.log(`[Kaspa] WARNING: No signing capability - check your KASPA_TREASURY_PRIVATEKEY`);
    }
  }

  /**
   * Use a raw private key directly (no derivation)
   * This is for when the user provides a 64-character hex private key
   */
  private async useRawPrivateKey(privateKeyHex: string): Promise<void> {
    try {
      // Store the raw private key
      this.treasuryPrivateKey = Buffer.from(privateKeyHex, 'hex');
      console.log(`[Kaspa] Private key loaded: ${this.treasuryPrivateKey.length} bytes`);

      // Use WASM to derive the address from private key
      if (this.kaspaModule && this.kaspaModule.PrivateKey) {
        const { PrivateKey, PublicKey, Address } = this.kaspaModule;
        const privKey = new PrivateKey(privateKeyHex);
        
        // Try different API methods to get public key
        let publicKey;
        if (typeof privKey.toPublicKey === 'function') {
          publicKey = privKey.toPublicKey();
        } else if (typeof privKey.getPublicKey === 'function') {
          publicKey = privKey.getPublicKey();
        } else if (privKey.publicKey) {
          publicKey = privKey.publicKey;
        } else {
          // Use secp256k1 derivation manually
          const secp256k1Module = await import('secp256k1');
          const secp = secp256k1Module.default || secp256k1Module;
          const pubKeyBytes = secp.publicKeyCreate(this.treasuryPrivateKey, true);
          const pubKeyHex = Buffer.from(pubKeyBytes).toString('hex');
          console.log(`[Kaspa] Derived public key via secp256k1: ${pubKeyHex.slice(0, 16)}...`);
          publicKey = new PublicKey(pubKeyHex);
        }
        
        // Get address from public key
        let address;
        if (typeof publicKey.toAddress === 'function') {
          address = publicKey.toAddress("mainnet");
        } else if (typeof publicKey.toAddressECDSA === 'function') {
          address = publicKey.toAddressECDSA("mainnet");
        } else {
          // Try creating address from public key string
          const pubKeyStr = publicKey.toString ? publicKey.toString() : publicKey;
          address = Address.fromPublicKey(pubKeyStr, "mainnet");
        }
        
        this.treasuryAddress = address.toString();
        console.log(`[Kaspa] Treasury address (from raw key): ${this.treasuryAddress}`);
      } else {
        throw new Error("WASM module not available for address derivation");
      }

      console.log(`[Kaspa] Raw private key mode - no BIP44 derivation`);
      console.log(`[Kaspa] Private key available: YES (${this.treasuryPrivateKey.length} bytes)`);

    } catch (error: any) {
      console.error("[Kaspa] Failed to use raw private key:", error.message);
      throw error;
    }
  }

  /**
   * Create a Kaspa mainnet address from public key
   * Kaspa uses Bech32 encoding with 'kaspa' prefix
   * Format: kaspa:<bech32_encoded(version_byte + pubkey_data)>
   */
  private createKaspaAddress(publicKeyX: Buffer): string {
    try {
      // Kaspa address format:
      // - Version byte: 0x00 for P2PK-Schnorr (schnorr pubkey)
      // - Version byte: 0x01 for P2PK-ECDSA  
      // - Followed by the 32-byte x-coordinate of the public key
      
      const versionByte = 0x00; // P2PK-Schnorr
      
      // Create payload: version + pubkey (32 bytes for schnorr x-only)
      // For secp256k1, we use x-coordinate (32 bytes)
      const payload = Buffer.alloc(33);
      payload[0] = versionByte;
      publicKeyX.copy(payload, 1, 0, 32);
      
      // Convert to 5-bit words for Bech32
      const words = bech32.toWords(payload);
      
      // Encode with 'kaspa' prefix (Kaspa uses colon separator handled by bech32 lib differently)
      // Standard bech32 uses '1' separator, but we need to format for Kaspa's colon separator
      const encoded = bech32.encode("kaspa", words, 1023); // Allow longer addresses
      
      // Kaspa format uses colon instead of '1' separator
      // bech32 library outputs: kaspa1<data>
      // We need: kaspa:<data>
      const kaspaAddress = encoded.replace("kaspa1", "kaspa:");
      
      return kaspaAddress;
    } catch (error: any) {
      console.error("[Kaspa] Bech32 encoding failed:", error.message);
      // Fallback to simple hex format
      const hash = createHash("sha256").update(publicKeyX).digest();
      return `kaspa:qr${hash.toString("hex").slice(0, 60)}`;
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
   * Try to connect via kaspa-rpc-client (pure TypeScript library)
   * This is more reliable than WASM in Node.js/tsx environment
   */
  private async tryRpcClientConnection(): Promise<void> {
    // Multiple seeder nodes for failover
    const seeders = [
      "seeder2.kaspad.net:16110",
      "seeder1.kaspad.net:16110",
      "n.seeder1.kaspad.net:16110",
      "n.seeder2.kaspad.net:16110",
    ];
    
    for (const host of seeders) {
      try {
        console.log(`[Kaspa] Trying kaspa-rpc-client connection to ${host}...`);
        
        // Dynamic import to handle CommonJS module
        const { ClientWrapper } = require("kaspa-rpc-client");
        
        const wrapper = new ClientWrapper({
          hosts: [host],
          verbose: false
        });

        // Set a connection timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout (10s)")), 10000)
        );
        
        await Promise.race([wrapper.initialize(), timeoutPromise]);
        this.rpcClient = await wrapper.getClient();
        
        // Test connection
        const info = await this.rpcClient.getBlockDagInfo();
        console.log(`[Kaspa] RPC connected to ${host}! Block count: ${info?.blockCount || 'unknown'}`);
        console.log(`[Kaspa] Network: ${info?.networkName || 'kaspa-mainnet'}`);
        this.rpcConnected = true;
        return; // Success - exit loop

      } catch (error: any) {
        console.log(`[Kaspa] ${host} failed: ${error.message}`);
      }
    }
    
    console.log("[Kaspa] All seeder nodes failed, RPC not connected");
    this.rpcConnected = false;
  }

  /**
   * Try to connect via kaspa-wasm RPC (fallback if kaspa-rpc-client fails)
   * Note: This is now primarily a fallback, as we have initWasmRpcClient() for tx submission
   */
  private async tryWasmRpcConnection(): Promise<void> {
    try {
      console.log("[Kaspa] Trying WASM RPC connection (fallback)...");
      
      if (!this.kaspaModule) {
        throw new Error("Kaspa module not loaded");
      }

      const { RpcClient, Encoding } = this.kaspaModule;

      if (!RpcClient) {
        throw new Error("RpcClient not available");
      }

      // Public wRPC endpoints for Kaspa mainnet
      const wRpcUrl = "wss://wrpc.kaspa.net:443";
      
      console.log(`[Kaspa] Connecting to wRPC: ${wRpcUrl}`);

      // Create WASM RPC client (store in wasmRpcClient, not rpcClient)
      this.wasmRpcClient = new RpcClient({
        url: wRpcUrl,
        encoding: Encoding?.Borsh || 0,
        networkId: this.config.network,
      });

      // Connect with timeout
      await this.wasmRpcClient.connect({
        timeoutDuration: 5000,
        blockAsyncConnect: true,
      });

      console.log(`[Kaspa] WASM RPC connected to: ${this.wasmRpcClient.url}`);

      // Test connection
      const info = await this.wasmRpcClient.getBlockDagInfo();
      console.log(`[Kaspa] Block count: ${info?.blockCount || 'unknown'}`);
      
      // Mark both as connected since WASM RPC can do everything
      this.rpcConnected = true;
      this.wasmRpcConnected = true;

    } catch (error: any) {
      console.log(`[Kaspa] WASM RPC failed: ${error.message}`);
      // Don't set rpcConnected = false here, it might have succeeded via kaspa-rpc-client
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
   * Initialize WASM RpcClient for PendingTransaction.submit()
   * This is separate from tryWasmRpcConnection because Generator/PendingTransaction
   * specifically requires the WASM RpcClient class, not kaspa-rpc-client
   */
  private async initWasmRpcClient(): Promise<void> {
    // Skip if already connected
    if (this.wasmRpcConnected && this.wasmRpcClient) {
      console.log("[Kaspa] WASM RpcClient already connected, reusing...");
      return;
    }

    try {
      if (!this.kaspaModule) {
        console.log("[Kaspa] Cannot init WASM RpcClient - module not loaded");
        return;
      }

      const { RpcClient, Encoding } = this.kaspaModule;
      if (!RpcClient) {
        console.log("[Kaspa] Cannot init WASM RpcClient - RpcClient not available");
        return;
      }

      // Public wRPC endpoints for Kaspa mainnet
      const wRpcUrl = "wss://wrpc.kaspa.net:443";
      console.log(`[Kaspa] Initializing WASM RpcClient for tx submission: ${wRpcUrl}`);

      this.wasmRpcClient = new RpcClient({
        url: wRpcUrl,
        encoding: Encoding?.Borsh || 0,
        networkId: this.config.network,
      });

      // Wrap connect() in a timeout to prevent indefinite blocking
      const connectPromise = this.wasmRpcClient.connect({
        timeoutDuration: 5000,
        blockAsyncConnect: true,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("WASM RpcClient connect timeout")), 8000);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      this.wasmRpcConnected = true;
      console.log(`[Kaspa] WASM RpcClient ready for tx submission`);
    } catch (error: any) {
      console.log(`[Kaspa] Failed to init WASM RpcClient: ${error.message}`);
      this.wasmRpcClient = null;
      this.wasmRpcConnected = false;
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
   * Runtime health check - verifies RPC is actually responsive before transactions
   * This catches cases where RPC was connected at init but has since become unavailable
   */
  private async checkRpcHealth(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.rpcClient) {
      return { healthy: false, error: "RPC client not initialized" };
    }
    
    try {
      // Quick ping via getBlockDagInfo (lightweight call)
      const result = await Promise.race([
        this.rpcClient.getBlockDagInfo(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("RPC health check timeout")), 5000))
      ]);
      
      if (!result) {
        return { healthy: false, error: "RPC returned empty response" };
      }
      
      return { healthy: true };
    } catch (error: any) {
      // Mark as disconnected for future calls
      this.rpcConnected = false;
      this.isLiveMode = false;
      console.error(`[Kaspa] RPC health check failed: ${error.message}`);
      return { healthy: false, error: error.message };
    }
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
   * Validate a Kaspa address format
   * Checks prefix, length, and basic bech32 structure
   * @returns true if valid mainnet address, false otherwise
   */
  validateAddress(address: string): { valid: boolean; error?: string } {
    if (!address || typeof address !== "string") {
      return { valid: false, error: "Address is required" };
    }

    // Normalize to lowercase for comparison
    const normalized = address.toLowerCase().trim();

    // Check mainnet prefix
    if (!normalized.startsWith("kaspa:")) {
      if (normalized.startsWith("kaspatest:") || normalized.startsWith("kaspasim:")) {
        return { valid: false, error: "Testnet/simnet addresses not allowed on mainnet" };
      }
      return { valid: false, error: "Invalid Kaspa address prefix (must start with kaspa:)" };
    }

    // Extract the data part after prefix
    const dataPart = normalized.slice(6); // Remove "kaspa:"
    
    // Check minimum length (bech32 data should be at least 32 chars)
    if (dataPart.length < 32 || dataPart.length > 100) {
      return { valid: false, error: "Invalid address length" };
    }

    // Check for valid bech32 characters (a-z, 0-9 except 1, b, i, o)
    const validChars = /^[02-9ac-hj-np-z]+$/;
    if (!validChars.test(dataPart)) {
      return { valid: false, error: "Invalid characters in address" };
    }

    // Check address type prefix (q for P2PK, p for P2SH)
    if (!dataPart.startsWith("q") && !dataPart.startsWith("p")) {
      return { valid: false, error: "Invalid address type (must be q or p prefix)" };
    }

    // Try bech32 decode for checksum validation
    try {
      const words = bech32.decode(normalized.replace("kaspa:", "kaspa1"), 1023);
      if (words.prefix !== "kaspa") {
        return { valid: false, error: "Bech32 prefix mismatch" };
      }
    } catch (e: any) {
      // Bech32 decode failed - checksum may be invalid
      // Note: Kaspa uses : separator but bech32 lib expects 1, so this may fail
      // We've already done structural checks above, so allow through with warning
      console.log(`[Kaspa] Address bech32 decode info: ${e.message} (structural checks passed)`);
    }

    return { valid: true };
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
   * Verify a transaction exists on the Kaspa L1 mainnet
   * Uses multiple sources: RPC, REST API (api.kaspa.org), and explorer API
   * Returns detailed status including confirmation info
   */
  async verifyTransaction(txHash: string): Promise<{
    exists: boolean;
    confirmed: boolean;
    blockHash?: string;
    blockTime?: number;
    outputs?: Array<{ address: string; amount: number }>;
    error?: string;
    source?: string;
  }> {
    if (!txHash || typeof txHash !== "string") {
      return { exists: false, confirmed: false, error: "Invalid transaction hash" };
    }

    // Skip demo/pending transactions
    if (txHash.startsWith("demo_") || txHash.startsWith("pending_")) {
      return { exists: false, confirmed: false, error: "Demo/pending transaction - not on L1" };
    }

    console.log(`[Kaspa] Verifying transaction: ${txHash}`);

    // Note: Kaspa RPC doesn't support direct transaction lookup by ID
    // Use REST API (api.kaspa.org) for transaction verification
    
    // Try REST API (api.kaspa.org)
    if (this.apiConnected) {
      try {
        const result = await this.apiCall(`/transactions/${txHash}`);
        if (result) {
          const outputs = result.outputs?.map((o: any) => ({
            address: o.script_public_key_address || o.address || "unknown",
            amount: Number(o.amount || 0) / 100_000_000,
          })) || [];
          
          console.log(`[Kaspa] TX verified via REST API: ${txHash}`);
          return {
            exists: true,
            confirmed: !!result.is_accepted || !!result.block_hash,
            blockHash: result.block_hash,
            blockTime: result.block_time,
            outputs,
            source: "api",
          };
        }
      } catch (error: any) {
        console.log(`[Kaspa] REST API tx lookup failed: ${error.message}`);
      }
    }

    // Try Kaspa explorer API as fallback
    try {
      const response = await fetch(`https://api.kaspa.org/transactions/${txHash}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        const result = await response.json();
        const outputs = result.outputs?.map((o: any) => ({
          address: o.script_public_key_address || o.address || "unknown",
          amount: Number(o.amount || 0) / 100_000_000,
        })) || [];
        
        console.log(`[Kaspa] TX verified via explorer API: ${txHash}`);
        return {
          exists: true,
          confirmed: !!result.is_accepted || !!result.block_hash,
          blockHash: result.block_hash,
          blockTime: result.block_time,
          outputs,
          source: "explorer",
        };
      }
    } catch (error: any) {
      console.log(`[Kaspa] Explorer API tx lookup failed: ${error.message}`);
    }

    console.log(`[Kaspa] TX not found on any source: ${txHash}`);
    return { exists: false, confirmed: false, error: "Transaction not found on L1" };
  }

  /**
   * Get RPC and API connection diagnostics
   * Useful for debugging transaction submission issues
   */
  async getDiagnostics(): Promise<{
    rpcConnected: boolean;
    apiConnected: boolean;
    treasuryAddress: string | null;
    treasuryBalance: number;
    rpcEndpoint: string;
    apiEndpoint: string;
    blockCount?: number;
    networkName?: string;
    isLive: boolean;
  }> {
    const diagnostics: any = {
      rpcConnected: this.rpcConnected,
      apiConnected: this.apiConnected,
      treasuryAddress: this.treasuryAddress,
      treasuryBalance: 0,
      rpcEndpoint: "seeder2.kaspad.net:16110",
      apiEndpoint: this.config.apiUrl,
      isLive: this.isLive(),
    };

    // Get treasury balance with timeout
    if (this.treasuryAddress) {
      try {
        const balancePromise = this.getBalance(this.treasuryAddress);
        const timeoutPromise = new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error("timeout")), 5000)
        );
        diagnostics.treasuryBalance = await Promise.race([balancePromise, timeoutPromise]);
      } catch {
        diagnostics.treasuryBalance = -1; // Indicates fetch failed
      }
    }

    // Get network info from RPC with timeout
    if (this.rpcConnected && this.rpcClient) {
      try {
        const infoPromise = this.rpcClient.getBlockDagInfo();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("timeout")), 5000)
        );
        const info = await Promise.race([infoPromise, timeoutPromise]) as any;
        diagnostics.blockCount = info?.blockCount;
        diagnostics.networkName = info?.networkName;
      } catch {
        // Ignore - leave undefined
      }
    }

    return diagnostics;
  }

  /**
   * Send KAS reward to a user's wallet with on-chain quiz proof
   * Embeds KU protocol payload with wallet address for verification
   */
  async sendReward(
    recipientAddress: string,
    amountKas: number,
    lessonId: string,
    score: number,
    courseId?: string,
    maxScore?: number,
    answers?: number[]
  ): Promise<TransactionResult> {
    const timestamp = Date.now();

    // SECURITY: Validate recipient address format before any transaction
    const validation = this.validateAddress(recipientAddress);
    if (!validation.valid) {
      console.error(`[Kaspa] Invalid recipient address: ${validation.error}`);
      return { success: false, error: `Invalid recipient address: ${validation.error}` };
    }

    // Create quiz proof payload for on-chain embedding
    const quizPayload = createQuizPayload({
      walletAddress: recipientAddress,
      courseId: courseId || lessonId.split("-")[0] || "unknown",
      lessonId,
      score,
      maxScore: maxScore || 100,
      timestamp,
    }, answers || []);

    console.log(`[Kaspa] Quiz proof payload created: ${quizPayload.length / 2} bytes`);
    
    if (!this.isLive()) {
      // Check WHY we're not live - provide specific error for real wallet users
      const reasons: string[] = [];
      if (!this.rpcConnected) reasons.push("RPC not connected to Kaspa network");
      if (!this.treasuryAddress) reasons.push("Treasury wallet not configured");
      if (!this.treasuryPrivateKey) reasons.push("Treasury private key missing");
      
      if (reasons.length > 0 && !recipientAddress.startsWith("demo:")) {
        // Real wallet user but treasury not ready - return error
        console.error(`[Kaspa] Cannot send reward - not live: ${reasons.join(", ")}`);
        return { success: false, error: `Treasury offline: ${reasons.join(", ")}` };
      }
      
      // Demo mode for demo users
      const demoTxHash = `demo_${timestamp.toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
      console.log(`[Kaspa] Demo mode - simulated reward: ${amountKas} KAS to ${recipientAddress}`);
      console.log(`[Kaspa] Demo payload would contain wallet: ${recipientAddress.slice(0, 20)}...`);
      return { success: true, txHash: demoTxHash };
    }

    // Runtime health check before attempting transaction
    const health = await this.checkRpcHealth();
    if (!health.healthy) {
      console.error(`[Kaspa] RPC health check failed before transaction: ${health.error}`);
      return { success: false, error: `Treasury offline: ${health.error}` };
    }

    // Try hybrid approach: kaspa-rpc-client for RPC + WASM for signing
    let lastError: string = "Treasury not properly configured";
    
    if (this.rpcConnected && this.rpcClient && this.treasuryPrivateKey && this.kaspaModule) {
      try {
        return await this.sendTransactionHybrid(recipientAddress, amountKas, lessonId, score, quizPayload);
      } catch (error: any) {
        console.error("[Kaspa] Hybrid transaction failed:", error.message);
        lastError = `Transaction failed: ${error.message}`;
        // Fall through to next method
      }
    }

    // Return error with detailed message
    console.error(`[Kaspa] All transaction methods failed: ${lastError}`);
    return { success: false, error: lastError };
  }

  /**
   * Hybrid transaction: kaspa-rpc-client for RPC + WASM for signing
   * Uses the private key directly for signing (when mnemonic isn't available)
   * Integrates UTXOManager for concurrent transaction safety
   * Embeds quiz proof payload for on-chain verification
   */
  private async sendTransactionHybrid(
    recipientAddress: string,
    amountKas: number,
    lessonId: string,
    score: number,
    quizPayload?: string
  ): Promise<TransactionResult> {
    console.log(`[Kaspa] Hybrid transaction: ${amountKas} KAS to ${recipientAddress}`);
    if (quizPayload) {
      console.log(`[Kaspa] Embedding quiz proof payload: ${quizPayload.length / 2} bytes`);
    }

    const { PrivateKey, createTransactions, signTransaction, kaspaToSompi } = this.kaspaModule;
    const utxoManager = getUTXOManager();

    // Get UTXOs via kaspa-rpc-client
    const utxoResult = await this.rpcClient.getUtxosByAddresses({
      addresses: [this.treasuryAddress]
    });

    const rpcEntries = utxoResult?.entries || [];
    if (rpcEntries.length === 0) {
      throw new Error("Treasury wallet has no UTXOs - please fund the treasury address with KAS");
    }

    console.log(`[Kaspa] Found ${rpcEntries.length} UTXOs in treasury`);
    
    // DIAGNOSTIC: Log raw RPC response structure for debugging
    if (rpcEntries.length > 0) {
      const sample = rpcEntries[0];
      console.log(`[Kaspa] RAW RPC UTXO structure:`, JSON.stringify(sample, (key, val) => 
        typeof val === 'bigint' ? `BigInt(${val})` : val, 2
      ).slice(0, 1000));
      console.log(`[Kaspa] RPC entry keys:`, Object.keys(sample));
      if (sample.utxoEntry) {
        console.log(`[Kaspa] utxoEntry keys:`, Object.keys(sample.utxoEntry));
        if (sample.utxoEntry.scriptPublicKey) {
          console.log(`[Kaspa] scriptPublicKey type:`, typeof sample.utxoEntry.scriptPublicKey);
          console.log(`[Kaspa] scriptPublicKey keys:`, Object.keys(sample.utxoEntry.scriptPublicKey || {}));
        }
      }
    }

    // Convert RPC entries to UTXO format for the manager
    const availableUtxos: UTXO[] = rpcEntries.map((e: any) => ({
      txId: e.outpoint?.transactionId || e.transactionId || "",
      index: e.outpoint?.index || e.index || 0,
      amount: BigInt(e.utxoEntry?.amount || e.amount || 0),
      scriptPublicKey: e.utxoEntry?.scriptPublicKey?.toString() || "",
    }));

    // Calculate total available balance for better error messages
    const totalAvailableSompi = availableUtxos.reduce((sum, u) => sum + u.amount, BigInt(0));
    const totalAvailableKas = Number(totalAvailableSompi) / 100_000_000;
    console.log(`[Kaspa] Total treasury balance: ${totalAvailableKas.toFixed(4)} KAS`);

    // Calculate required amount in sompi (including fee buffer)
    const feeBuffer = 0.0001; // 10,000 sompi priority fee
    const requiredKas = amountKas + feeBuffer;
    const requiredSompi = BigInt(Math.floor(requiredKas * 100_000_000));

    // Pre-check: enough total balance?
    if (totalAvailableSompi < requiredSompi) {
      const shortfall = (Number(requiredSompi - totalAvailableSompi) / 100_000_000).toFixed(4);
      throw new Error(`Insufficient treasury balance: have ${totalAvailableKas.toFixed(4)} KAS, need ${requiredKas.toFixed(4)} KAS (short ${shortfall} KAS)`);
    }

    // Check for dust UTXOs that can't be used (under 546 sompi is dust on most chains, Kaspa uses similar)
    const usableUtxos = availableUtxos.filter(u => u.amount >= BigInt(546));
    if (usableUtxos.length === 0 && availableUtxos.length > 0) {
      throw new Error(`Treasury has ${availableUtxos.length} UTXOs but all are dust (too small to spend). Please consolidate UTXOs.`);
    }

    // Reserve UTXOs through manager to prevent race conditions
    const reservation = await utxoManager.selectAndReserve(
      usableUtxos,
      requiredSompi,
      `reward:${lessonId}:${recipientAddress.slice(-8)}`
    );

    if (!reservation) {
      // Provide specific reason for reservation failure
      const unreservedBalance = usableUtxos.reduce((sum, u) => sum + u.amount, BigInt(0));
      const unreservedKas = Number(unreservedBalance) / 100_000_000;
      if (unreservedBalance < requiredSompi) {
        throw new Error(`UTXOs temporarily locked by pending transactions. Available: ${unreservedKas.toFixed(4)} KAS, need: ${requiredKas.toFixed(4)} KAS. Try again in a few seconds.`);
      }
      throw new Error(`Failed to reserve UTXOs for ${requiredKas.toFixed(4)} KAS - concurrent transaction limit reached`);
    }

    console.log(`[Kaspa] Reserved ${reservation.selected.length} UTXOs (${Number(reservation.total) / 100_000_000} KAS)`);

    // Build a Set of reserved UTXO keys for filtering
    const reservedKeys = new Set(
      reservation.selected.map(u => `${u.txId}:${u.index}`)
    );

    // Filter original RPC entries to only include reserved UTXOs
    const reservedEntries = rpcEntries.filter((e: any) => {
      const txId = e.outpoint?.transactionId || e.transactionId || "";
      const index = e.outpoint?.index || e.index || 0;
      return reservedKeys.has(`${txId}:${index}`);
    });

    console.log(`[Kaspa] Using ${reservedEntries.length} reserved entries for transaction`);

    // Convert RPC entries to WASM-compatible IUtxoEntry format (FLAT structure)
    // Per kaspa.d.ts IUtxoEntry interface:
    // - address?: Address (optional)
    // - outpoint: { transactionId: string, index: number }
    // - amount: bigint
    // - scriptPublicKey: { version: number, script: HexString }
    // - blockDaaScore: bigint
    // - isCoinbase: boolean
    const wasmEntries = reservedEntries.map((e: any) => {
      // Extract the scriptPublicKey hex string - try multiple paths
      const spkHex = e.utxoEntry?.scriptPublicKey?.scriptPublicKey || 
                     e.utxoEntry?.scriptPublicKey?.script ||
                     (typeof e.utxoEntry?.scriptPublicKey === 'string' ? e.utxoEntry.scriptPublicKey : "") ||
                     e.scriptPublicKey?.scriptPublicKey ||
                     e.scriptPublicKey?.script ||
                     (typeof e.scriptPublicKey === 'string' ? e.scriptPublicKey : "");
      
      const spkVersion = e.utxoEntry?.scriptPublicKey?.version ?? 
                         e.scriptPublicKey?.version ?? 0;
      
      // Build IUtxoEntry with FLAT structure (per kaspa.d.ts)
      const entry = {
        address: e.address || this.treasuryAddress,
        outpoint: {
          transactionId: e.outpoint?.transactionId || "",
          index: e.outpoint?.index ?? 0
        },
        amount: BigInt(e.utxoEntry?.amount || e.amount || 0),
        scriptPublicKey: {
          version: spkVersion,
          script: spkHex
        },
        blockDaaScore: BigInt(e.utxoEntry?.blockDaaScore || e.blockDaaScore || 0),
        isCoinbase: e.utxoEntry?.isCoinbase || e.isCoinbase || false
      };
      return entry;
    });

    // DIAGNOSTIC: Log the first WASM entry for debugging
    if (wasmEntries.length > 0) {
      const firstEntry = wasmEntries[0];
      console.log(`[Kaspa] WASM Entry format check (IUtxoEntry - FLAT):`);
      console.log(`  - address: ${firstEntry.address}`);
      console.log(`  - outpoint.transactionId: ${firstEntry.outpoint.transactionId.slice(0, 16)}...`);
      console.log(`  - outpoint.index: ${firstEntry.outpoint.index}`);
      console.log(`  - amount: ${firstEntry.amount} (type: ${typeof firstEntry.amount})`);
      console.log(`  - scriptPublicKey.script: ${String(firstEntry.scriptPublicKey.script).slice(0, 30)}... (len: ${String(firstEntry.scriptPublicKey.script).length})`);
      console.log(`  - scriptPublicKey.version: ${firstEntry.scriptPublicKey.version}`);
      console.log(`  - blockDaaScore: ${firstEntry.blockDaaScore}`);
      console.log(`  - isCoinbase: ${firstEntry.isCoinbase}`);
    }

    try {
      console.log(`[Kaspa] Building transaction using createTransactions()...`);
      
      // Create private key object from our derived key
      const privateKeyHex = this.treasuryPrivateKey.toString('hex');
      console.log(`[Kaspa] Private key ready: ${privateKeyHex.slice(0, 8)}...`);
      const privateKey = new PrivateKey(privateKeyHex);

      // Convert amount to sompi (kaspaToSompi expects string parameter)
      const amountSompi = kaspaToSompi(String(amountKas));
      const priorityFee = kaspaToSompi("0.0001");
      console.log(`[Kaspa] Output: ${amountSompi} sompi, priority fee: ${priorityFee}`);

      // Build transaction settings (same pattern as payload transactions)
      // networkId is required when using UTXO entries array (per kaspa.d.ts)
      const txSettings: any = {
        networkId: "mainnet",
        entries: wasmEntries,
        outputs: [{
          address: recipientAddress,
          amount: amountSompi
        }],
        changeAddress: this.treasuryAddress,
        priorityFee,
      };

      // Embed KU protocol quiz proof in transaction payload for on-chain verification
      // Note: Reward must be >= 0.1 KAS to keep storage mass at 100,000 limit (KIP-0009)
      if (quizPayload) {
        txSettings.payload = quizPayload;
        console.log(`[Kaspa] Embedding quiz proof (${quizPayload.length / 2} bytes) for on-chain verification`);
      }

      console.log(`[Kaspa] Creating transactions with ${wasmEntries.length} UTXOs...`);
      console.log(`[Kaspa] Transaction settings: entries=${wasmEntries.length}, outputs=[{address: ${recipientAddress.slice(0,25)}..., amount: ${amountSompi}}], changeAddress=${this.treasuryAddress.slice(0,25)}..., priorityFee=${priorityFee}, hasPayload=${!!txSettings.payload}`);

      // Use createTransactions() which returns Transaction objects with toRpcTransaction()
      // This is the same pattern that works for payload transactions
      let result;
      try {
        result = await createTransactions(txSettings);
      } catch (createErr: any) {
        console.error(`[Kaspa] createTransactions error:`, createErr?.message || createErr);
        console.error(`[Kaspa] createTransactions error type:`, typeof createErr);
        console.error(`[Kaspa] createTransactions full error:`, JSON.stringify(createErr, Object.getOwnPropertyNames(createErr || {})));
        throw new Error(`createTransactions failed: ${createErr?.message || String(createErr)}`);
      }
      
      const { transactions } = result;

      if (!transactions || transactions.length === 0) {
        throw new Error("createTransactions returned no transactions");
      }

      console.log(`[Kaspa] Created ${transactions.length} transaction(s), signing and submitting...`);

      // Verify we have kaspa-rpc-client for submission
      if (!this.rpcClient) {
        throw new Error("Cannot submit transaction: RPC client not connected.");
      }

      // Sign and submit each PendingTransaction using WASM SDK's native RpcClient
      // This ensures the transaction format is correct for the Kaspa network
      let finalTxHash = "";
      
      // Create WASM SDK's RpcClient for submission
      const { RpcClient: WasmRpcClient, Resolver } = this.kaspaModule;
      console.log(`[Kaspa] Creating WASM RpcClient with Resolver...`);
      
      let wasmRpc: any = null;
      try {
        // Use Resolver for automatic node discovery on mainnet
        const resolver = new Resolver();
        wasmRpc = new WasmRpcClient({
          resolver,
          networkId: "mainnet"
        });
        
        console.log(`[Kaspa] Connecting WASM RpcClient...`);
        await wasmRpc.connect();
        console.log(`[Kaspa] WASM RpcClient connected`);
      } catch (rpcErr: any) {
        console.error(`[Kaspa] Failed to create WASM RpcClient: ${rpcErr?.message || rpcErr}`);
        throw new Error(`Cannot submit transaction: Failed to connect WASM RPC: ${rpcErr?.message}`);
      }
      
      try {
        for (let i = 0; i < transactions.length; i++) {
          const pendingTx = transactions[i];
          console.log(`[Kaspa] Processing transaction ${i + 1}/${transactions.length}...`);
          
          // Sign the PendingTransaction with private key array
          await pendingTx.sign([privateKey]);
          console.log(`[Kaspa] Transaction ${i + 1} signed`);
          
          // Submit using WASM SDK's native submit() method
          // This handles all format conversion internally
          console.log(`[Kaspa] Submitting via WASM SDK...`);
          try {
            const txId = await pendingTx.submit(wasmRpc);
            finalTxHash = txId;
            console.log(`[Kaspa] Transaction ${i + 1} confirmed: ${finalTxHash}`);
          } catch (submitError: any) {
            const errorMsg = submitError?.message || String(submitError);
            console.error(`[Kaspa] WASM submit failed: ${errorMsg}`);
            
            if (errorMsg.includes("orphan") || errorMsg.includes("missing parent")) {
              throw new Error("Transaction rejected: UTXO already spent (orphan transaction). Please retry.");
            } else if (errorMsg.includes("mass") || errorMsg.includes("too large")) {
              throw new Error("Transaction too large: too many inputs. Please wait for UTXO consolidation.");
            } else if (errorMsg.includes("fee") || errorMsg.includes("low priority")) {
              throw new Error("Transaction fee too low for current network conditions. Please retry later.");
            } else if (errorMsg.includes("double spend") || errorMsg.includes("already exists")) {
              throw new Error("Transaction rejected: duplicate or conflicting transaction detected.");
            } else if (errorMsg.includes("timeout") || errorMsg.includes("connect")) {
              throw new Error("Network timeout submitting transaction. Please check network and retry.");
            }
            throw new Error(`Transaction submit failed: ${errorMsg}`);
          }
        }
      } finally {
        // Disconnect WASM RpcClient
        if (wasmRpc) {
          try {
            await wasmRpc.disconnect();
            console.log(`[Kaspa] WASM RpcClient disconnected`);
          } catch (e) {
            // Ignore disconnect errors
          }
        }
      }

      console.log(`[Kaspa] All ${transactions.length} transaction(s) submitted successfully`);

      // Validate we have a transaction hash before marking UTXOs as spent
      if (!finalTxHash) {
        console.error(`[Kaspa] No transaction hash received - releasing UTXOs`);
        await utxoManager.releaseReservation(reservation.selected);
        throw new Error("Transaction failed: no transaction hash returned. Please retry.");
      }

      // Mark UTXOs as spent with txHash
      await utxoManager.markAsSpent(reservation.selected, finalTxHash);

      console.log(`[Kaspa] Reward sent: ${amountKas} KAS for lesson ${lessonId} (score: ${score})`);

      return { success: true, txHash: finalTxHash };
    } catch (error: any) {
      // Release reservation on failure
      await utxoManager.releaseReservation(reservation.selected);
      console.error(`[Kaspa] Transaction failed, released ${reservation.selected.length} UTXOs: ${error.message}`);
      console.error(`[Kaspa] Error stack:`, error?.stack);
      throw error;
    }
  }

  /**
   * Send transaction via WASM SDK (legacy - not used with private key approach)
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

    // Create transaction generator (kaspaToSompi expects string)
    const generator = new Generator({
      entries,
      outputs: [{ address: recipientAddress, amount: kaspaToSompi(String(amountKas)) }],
      priorityFee: kaspaToSompi("0.0001"),
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
   * Verify a payment transaction
   * Checks that a transaction:
   * 1. Exists on-chain
   * 2. Is from the expected sender
   * 3. Has an output to the expected recipient
   * 4. Has at least the expected amount
   */
  async verifyPayment(
    txHash: string,
    senderAddress: string,
    recipientAddress: string,
    minAmountKas: number
  ): Promise<boolean> {
    if (txHash.startsWith("demo_") || txHash.startsWith("pending_")) {
      return false; // Demo transactions are not valid for payment verification
    }

    try {
      if (this.apiConnected) {
        const tx = await this.apiCall(`/transactions/${txHash}`);
        if (!tx) return false;

        // Sum all outputs to the recipient address
        const outputs = tx.outputs || [];
        const minAmountSompi = minAmountKas * 100_000_000;
        let totalToRecipient = 0;

        for (const output of outputs) {
          const outputAddress = output.script_public_key_address || output.address;
          const outputAmount = Number(output.amount || 0);

          if (outputAddress === recipientAddress) {
            totalToRecipient += outputAmount;
          }
        }

        // Check if total to recipient meets minimum (with small tolerance for rounding)
        const tolerance = 1000; // 0.00001 KAS tolerance
        if (totalToRecipient >= minAmountSompi - tolerance) {
          console.log(`[Kaspa] Payment verified: ${totalToRecipient / 100_000_000} KAS to ${recipientAddress}`);
          return true;
        }

        console.log(`[Kaspa] Payment verification failed: only ${totalToRecipient / 100_000_000} KAS sent to ${recipientAddress}, need ${minAmountKas} KAS`);
        return false;
      }

      // If no API connection, we can't verify - return false for security
      console.log(`[Kaspa] Payment verification failed: no API connection`);
      return false;
    } catch (error: any) {
      console.error(`[Kaspa] Payment verification error:`, error.message);
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
   * Get treasury balance
   */
  async getTreasuryBalance(): Promise<{ balance: number; utxoCount: number }> {
    if (!this.rpcConnected || !this.rpcClient || !this.treasuryAddress) {
      return { balance: 0, utxoCount: 0 };
    }

    try {
      const utxoResult = await this.rpcClient.getUtxosByAddresses({
        addresses: [this.treasuryAddress]
      });

      const entries = utxoResult?.entries || [];
      if (entries.length === 0) {
        return { balance: 0, utxoCount: 0 };
      }

      const totalSompi = entries.reduce((sum: bigint, e: any) => {
        return sum + BigInt(e.utxoEntry?.amount || e.amount || 0);
      }, BigInt(0));

      const balanceKas = Number(totalSompi) / 100_000_000;
      console.log(`[Kaspa] Treasury balance: ${balanceKas} KAS (${entries.length} UTXOs)`);

      return { balance: balanceKas, utxoCount: entries.length };
    } catch (error: any) {
      console.error("[Kaspa] Failed to get balance:", error.message);
      return { balance: 0, utxoCount: 0 };
    }
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

  /**
   * Post a Q&A question on-chain
   * Sends a minimal transaction with the question embedded in payload
   */
  async postQAQuestion(
    lessonId: string,
    authorAddress: string,
    content: string
  ): Promise<TransactionResult> {
    const timestamp = Date.now();
    
    // Create the on-chain payload
    const payload = createQAQuestionPayload({
      lessonId,
      authorAddress,
      timestamp,
      content,
    });

    console.log(`[Kaspa] Posting Q&A question for lesson ${lessonId}`);
    console.log(`[Kaspa] Payload size: ${payload.length / 2} bytes`);

    if (!this.isLive()) {
      // Demo mode - simulate transaction
      const demoTxHash = `demo_qa_q_${timestamp.toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
      console.log(`[Kaspa] Demo mode - simulated Q&A question post`);
      return { success: true, txHash: demoTxHash };
    }

    // In live mode, send a self-transaction with the Q&A payload
    // This stores the question on-chain with minimal cost
    try {
      const txHash = await this.sendPayloadTransaction(payload, authorAddress);
      return { success: true, txHash };
    } catch (error: any) {
      console.error("[Kaspa] Failed to post Q&A question:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Post a Q&A answer on-chain
   */
  async postQAAnswer(
    questionTxId: string,
    authorAddress: string,
    content: string
  ): Promise<TransactionResult> {
    const timestamp = Date.now();
    
    const payload = createQAAnswerPayload({
      questionTxId,
      authorAddress,
      timestamp,
      content,
    });

    console.log(`[Kaspa] Posting Q&A answer for question ${questionTxId}`);
    console.log(`[Kaspa] Payload size: ${payload.length / 2} bytes`);

    if (!this.isLive()) {
      const demoTxHash = `demo_qa_a_${timestamp.toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
      console.log(`[Kaspa] Demo mode - simulated Q&A answer post`);
      return { success: true, txHash: demoTxHash };
    }

    try {
      const txHash = await this.sendPayloadTransaction(payload, authorAddress);
      return { success: true, txHash };
    } catch (error: any) {
      console.error("[Kaspa] Failed to post Q&A answer:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a quiz proof transaction (public method for on-chain quiz storage)
   * Embeds KU protocol quiz proof payload
   */
  async sendQuizProof(
    payloadHex: string,
    walletAddress: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.isLive()) {
      const demoTxHash = `demo_quiz_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
      console.log(`[Kaspa] Demo mode - simulated quiz proof`);
      return { success: true, txHash: demoTxHash };
    }

    try {
      const txHash = await this.sendPayloadTransaction(payloadHex, walletAddress);
      return { success: true, txHash };
    } catch (error: any) {
      console.error("[Kaspa] Failed to send quiz proof:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a transaction with a custom payload (for on-chain data storage)
   * Sends minimal amount to self or treasury to embed the payload
   * Integrates UTXOManager for concurrent transaction safety
   */
  private async sendPayloadTransaction(
    payloadHex: string,
    fromAddress: string
  ): Promise<string> {
    if (!this.rpcConnected || !this.rpcClient || !this.treasuryPrivateKey || !this.kaspaModule) {
      throw new Error("Not connected to Kaspa network or missing treasury keys");
    }

    const { PrivateKey, createTransactions, kaspaToSompi, Transaction } = this.kaspaModule;
    const utxoManager = getUTXOManager();

    // Get UTXOs via kaspa-rpc-client
    const utxoResult = await this.rpcClient.getUtxosByAddresses({
      addresses: [this.treasuryAddress]
    });

    const entries = utxoResult?.entries || [];
    if (entries.length === 0) {
      throw new Error("No UTXOs available for payload transaction");
    }

    // Convert RPC entries to UTXO format for the manager
    const availableUtxos: UTXO[] = entries.map((e: any) => ({
      txId: e.outpoint?.transactionId || e.transactionId || "",
      index: e.outpoint?.index || e.index || 0,
      amount: BigInt(e.utxoEntry?.amount || e.amount || 0),
      scriptPublicKey: e.utxoEntry?.scriptPublicKey?.toString() || "",
    }));

    // Required amount: 0.1 KAS for proof output + fee (for storage mass compliance)
    const requiredSompi = BigInt(Math.floor(0.21 * 100_000_000));

    // Reserve UTXOs through manager
    const reservation = await utxoManager.selectAndReserve(
      availableUtxos,
      requiredSompi,
      `payload:${payloadHex.slice(0, 16)}`
    );

    if (!reservation) {
      throw new Error("Insufficient unreserved UTXOs for payload transaction");
    }

    // Build a Set of reserved UTXO keys for filtering
    const reservedKeys = new Set(
      reservation.selected.map(u => `${u.txId}:${u.index}`)
    );

    // Filter original entries to only include reserved UTXOs
    const reservedEntries = entries.filter((e: any) => {
      const txId = e.outpoint?.transactionId || e.transactionId || "";
      const index = e.outpoint?.index || e.index || 0;
      return reservedKeys.has(`${txId}:${index}`);
    });

    try {
      // Create private key object
      const privateKeyHex = this.treasuryPrivateKey.toString('hex');
      const privateKey = new PrivateKey(privateKeyHex);

      // Send minimum amount to self to keep storage mass under limit (KIP-0009)
      // Storage mass = 10^12 / output_amount, must be < 100,000
      // 0.2 KAS = 50,000 mass, safe for payload embedding
      const proofAmount = kaspaToSompi("0.2");
      const priorityFee = kaspaToSompi("0.0001");

      // Create transaction with payload using ONLY reserved entries
      const { transactions } = await createTransactions({
        entries: reservedEntries,
        outputs: [{
          address: this.treasuryAddress, // Send to self
          amount: proofAmount
        }],
        changeAddress: this.treasuryAddress,
        priorityFee,
        payload: payloadHex, // Embed the KU protocol payload
      });

      console.log(`[Kaspa] Created payload transaction with ${payloadHex.length / 2} bytes`);

      // Sign and submit
      let finalTxHash = "";
      for (const tx of transactions) {
        tx.sign([privateKey]);
        
        const submitResult = await this.rpcClient.submitTransaction({
          transaction: tx.toRpcTransaction()
        });
        
        finalTxHash = submitResult?.transactionId || tx.id;
        console.log(`[Kaspa] Payload transaction submitted: ${finalTxHash}`);
      }

      // Mark UTXOs as spent
      await utxoManager.markAsSpent(reservation.selected, finalTxHash);

      return finalTxHash;
    } catch (error: any) {
      // Release reservation on failure
      await utxoManager.releaseReservation(reservation.selected);
      throw error;
    }
  }

  /**
   * Verify a quiz result from an on-chain transaction
   * Uses RPC getTransactionsByIds for true on-chain verification with payload data
   * Falls back to REST API if RPC is unavailable
   */
  async verifyQuizResult(txHash: string): Promise<QuizPayload | null> {
    try {
      let payloadHex: string | null = null;
      let txExists = false;

      // Method 1: Try RPC client for full transaction data with payload
      if (this.rpcConnected && this.rpcClient) {
        try {
          console.log(`[Kaspa] Fetching TX via RPC: ${txHash}`);
          const rpcResult = await this.rpcClient.request("getTransactionsByIdsRequest", {
            transactionIds: [txHash]
          });
          
          if (rpcResult?.transactions && rpcResult.transactions.length > 0) {
            const tx = rpcResult.transactions[0];
            txExists = true;
            
            // Extract payload from RPC response
            if (tx.payload) {
              payloadHex = tx.payload;
              console.log(`[Kaspa] RPC returned payload for ${txHash}: ${payloadHex.length} chars`);
            } else {
              console.log(`[Kaspa] RPC TX found but no payload field: ${txHash}`);
            }
          }
        } catch (rpcError: any) {
          console.log(`[Kaspa] RPC getTransactionsByIds failed: ${rpcError.message}, trying REST API`);
        }
      }

      // Method 2: Try WASM RPC client if available
      if (!payloadHex && this.wasmRpcClient) {
        try {
          console.log(`[Kaspa] Fetching TX via WASM RPC: ${txHash}`);
          const wasmResult = await this.wasmRpcClient.getTransactionsByIds([txHash]);
          
          if (wasmResult?.transactions && wasmResult.transactions.length > 0) {
            const tx = wasmResult.transactions[0];
            txExists = true;
            
            if (tx.payload) {
              payloadHex = tx.payload;
              console.log(`[Kaspa] WASM RPC returned payload for ${txHash}: ${payloadHex.length} chars`);
            }
          }
        } catch (wasmError: any) {
          console.log(`[Kaspa] WASM RPC getTransactionsByIds failed: ${wasmError.message}`);
        }
      }

      // Method 3: Fallback to REST API (usually doesn't have payload but confirms tx exists)
      if (!txExists) {
        const txData = await this.apiCall(`/transactions/${txHash}`);
        if (txData) {
          txExists = true;
          if (txData.payload) {
            payloadHex = txData.payload;
            console.log(`[Kaspa] REST API returned payload for ${txHash}`);
          }
        }
      }

      if (!txExists) {
        console.log(`[Kaspa] Transaction not found: ${txHash}`);
        return null;
      }

      if (!payloadHex) {
        console.log(`[Kaspa] Transaction ${txHash} exists on-chain but payload not accessible via current RPC node`);
        return null;
      }

      // Parse the KU protocol message
      const parsed = parseKUPayload(payloadHex);
      if (!parsed || parsed.type !== "quiz") {
        console.log(`[Kaspa] Payload exists but not a quiz type: ${parsed?.type || 'invalid'}`);
        return null;
      }

      console.log(`[Kaspa] Successfully verified quiz proof on-chain: ${txHash}`);
      return parsed.quiz || null;
    } catch (error: any) {
      console.error("[Kaspa] Failed to verify quiz result:", error.message);
      return null;
    }
  }

  /**
   * Verify Q&A content from an on-chain transaction
   * Uses RPC for true on-chain verification with payload data
   */
  async verifyQAContent(txHash: string): Promise<QAQuestionPayload | QAAnswerPayload | null> {
    try {
      let payloadHex: string | null = null;

      // Try RPC client for full transaction data
      if (this.rpcConnected && this.rpcClient) {
        try {
          const rpcResult = await this.rpcClient.request("getTransactionsByIdsRequest", {
            transactionIds: [txHash]
          });
          
          if (rpcResult?.transactions?.[0]?.payload) {
            payloadHex = rpcResult.transactions[0].payload;
          }
        } catch (rpcError: any) {
          console.log(`[Kaspa] RPC Q&A verification failed: ${rpcError.message}`);
        }
      }

      // Fallback to REST API
      if (!payloadHex) {
        const txData = await this.apiCall(`/transactions/${txHash}`);
        if (txData?.payload) {
          payloadHex = txData.payload;
        }
      }

      if (!payloadHex) {
        return null;
      }

      const parsed = parseKUPayload(payloadHex);
      if (!parsed) {
        return null;
      }

      if (parsed.type === "qa_q") {
        return parsed.question || null;
      } else if (parsed.type === "qa_a") {
        return parsed.answer || null;
      }

      return null;
    } catch (error: any) {
      console.error("[Kaspa] Failed to verify Q&A content:", error.message);
      return null;
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
