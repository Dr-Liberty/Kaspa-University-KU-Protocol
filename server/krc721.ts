/**
 * KRC-721 NFT Certificate Service for Kaspa University
 * 
 * Based on: https://github.com/coinchimp/kaspa-krc721-apps
 * 
 * Implements the KRC-721 standard for NFT inscriptions on Kaspa:
 * - Commit-and-Reveal transaction pattern
 * - ScriptBuilder with kspr marker
 * - Collection deployment and token minting
 * 
 * Network: MAINNET
 * Collection Ticker: KUCERT (Kaspa University Certificates)
 */

import { createHash } from "crypto";
import { storage } from "./storage";
import * as bip39 from "bip39";
import HDKey from "hdkey";
import { getUTXOManager, resetUTXOManager, type UTXO } from "./utxo-manager.js";

// WebSocket shim must be loaded before kaspa module
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { w3cwebsocket: W3CWebSocket } = require("websocket");
// @ts-ignore
globalThis.WebSocket = globalThis.WebSocket || W3CWebSocket;

interface KRC721Config {
  network: "mainnet" | "testnet-10" | "testnet-11";
  ticker: string;
  collectionName: string;
  collectionDescription: string;
  maxSupply: number;
  royaltyFee: number; // basis points (100 = 1%)
  royaltyOwner: string;
}

interface DeployResult {
  success: boolean;
  commitTxHash?: string;
  revealTxHash?: string;
  error?: string;
}

interface MintResult {
  success: boolean;
  commitTxHash?: string;
  revealTxHash?: string;
  tokenId?: number;
  error?: string;
}

interface CertificateMetadata {
  name: string;
  description: string;
  image: string; // IPFS URL or data URI
  attributes: Array<{
    traitType: string;
    value: string | number;
  }>;
}

// KRC-721 fees per official spec (https://mainnet.krc721.stream)
// Deploy: Minimum 1,000 KAS reveal transaction fee required
// Mint: Minimum 10 KAS reveal transaction fee required
const KRC721_DEPLOY_FEE_KAS = "1000"; // 1000 KAS deploy fee (REQUIRED by indexer)
const KRC721_DEPLOY_FEE_SOMPI = BigInt(100000000000); // 1000 KAS in sompi
const KRC721_MINT_FEE_KAS = "10.5"; // 10.5 KAS mint fee (above 10 KAS minimum)
const KRC721_MINT_FEE_SOMPI = BigInt(1050000000); // 10.5 KAS in sompi (1 KAS = 100,000,000 sompi)

// Get the indexer URL based on network
// Use KSPR indexer (mainnet.krc721.stream) - the standard KRC-721 indexer
function getIndexerUrl(): string {
  return useTestnet 
    ? "https://testnet-10.krc721.stream"
    : "https://mainnet.krc721.stream";
}

/**
 * Verify that a collection is indexed by the KRC-721 indexer
 * This confirms the deploy transaction was actually accepted
 * 
 * API endpoint: /api/v1/krc721/{network}/nfts/{tick}
 * Reference: https://testnet-10.krc721.stream/docs
 */
async function verifyCollectionIndexed(ticker: string): Promise<{ indexed: boolean; error?: string }> {
  try {
    const indexerUrl = getIndexerUrl();
    const network = useTestnet ? "testnet-10" : "mainnet";
    // Use correct API path per KSPR indexer docs
    const apiUrl = `${indexerUrl}/api/v1/krc721/${network}/nfts/${ticker}`;
    console.log(`[KRC721] Verifying collection at: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    
    if (response.ok) {
      const data = await response.json();
      // Response format: { message: "success", result: { tick, buri, max, ... } }
      if (data && data.message === "success" && data.result) {
        console.log(`[KRC721] Collection ${ticker} verified in indexer`);
        return { indexed: true };
      }
    }
    
    if (response.status === 400 || response.status === 404) {
      const errorData = await response.json().catch(() => ({}));
      return { indexed: false, error: errorData.message || "Collection not found in indexer" };
    }
    
    return { indexed: false, error: `Indexer returned status ${response.status}` };
  } catch (error: any) {
    console.log(`[KRC721] Indexer verification failed: ${error.message}`);
    return { indexed: false, error: error.message };
  }
}

/**
 * Verify that a token is indexed by the KRC-721 indexer
 * This confirms the mint transaction was actually accepted
 * 
 * API endpoint: /api/v1/krc721/{network}/nfts/{tick}/{id}
 * Reference: https://testnet-10.krc721.stream/docs
 */
async function verifyTokenIndexed(ticker: string, tokenId: number): Promise<{ indexed: boolean; error?: string }> {
  try {
    const indexerUrl = getIndexerUrl();
    const network = useTestnet ? "testnet-10" : "mainnet";
    // Use correct API path per KSPR indexer docs
    const apiUrl = `${indexerUrl}/api/v1/krc721/${network}/nfts/${ticker}/${tokenId}`;
    console.log(`[KRC721] Verifying token at: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    
    if (response.ok) {
      const data = await response.json();
      // Response format: { message: "success", result: { tick, tokenId, owner, buri } }
      if (data && data.message === "success" && data.result) {
        console.log(`[KRC721] Token ${ticker}#${tokenId} verified in indexer`);
        return { indexed: true };
      }
    }
    
    if (response.status === 400 || response.status === 404) {
      const errorData = await response.json().catch(() => ({}));
      return { indexed: false, error: errorData.message || "Token not found in indexer" };
    }
    
    return { indexed: false, error: `Indexer returned status ${response.status}` };
  } catch (error: any) {
    console.log(`[KRC721] Token verification failed: ${error.message}`);
    return { indexed: false, error: error.message };
  }
}

/**
 * Poll the indexer until collection is indexed or timeout
 */
async function waitForCollectionIndexed(ticker: string, timeoutMs: number = 120000): Promise<{ indexed: boolean; error?: string }> {
  const startTime = Date.now();
  const pollIntervalMs = 3000; // Check every 3 seconds
  
  console.log(`[KRC721] Waiting for collection ${ticker} to be indexed (timeout: ${timeoutMs/1000}s)...`);
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await verifyCollectionIndexed(ticker);
    if (result.indexed) {
      return result;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return { indexed: false, error: `Timeout waiting for collection ${ticker} to be indexed after ${timeoutMs/1000}s` };
}

/**
 * Poll the indexer until token is indexed or timeout
 */
async function waitForTokenIndexed(ticker: string, tokenId: number, timeoutMs: number = 120000): Promise<{ indexed: boolean; error?: string }> {
  const startTime = Date.now();
  const pollIntervalMs = 3000; // Check every 3 seconds
  
  console.log(`[KRC721] Waiting for token ${ticker}#${tokenId} to be indexed (timeout: ${timeoutMs/1000}s)...`);
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await verifyTokenIndexed(ticker, tokenId);
    if (result.indexed) {
      return result;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return { indexed: false, error: `Timeout waiting for token ${ticker}#${tokenId} to be indexed after ${timeoutMs/1000}s` };
}

// Testnet mode - controlled by environment variable or runtime toggle
// Set KRC721_TESTNET=true to use testnet-10 for testing before mainnet deployment
let useTestnet = process.env.KRC721_TESTNET === "true";

export function isTestnetMode(): boolean {
  return useTestnet;
}

export function setTestnetMode(enabled: boolean): void {
  useTestnet = enabled;
  console.log(`[KRC721] Testnet mode ${enabled ? "ENABLED" : "DISABLED"}`);
}

function getNetworkId(): "mainnet" | "testnet-10" {
  return useTestnet ? "testnet-10" : "mainnet";
}

function getAddressPrefix(): string {
  return useTestnet ? "kaspatest:" : "kaspa:";
}

// Import the database-backed mint storage service
import { mintStorage, PendingMintReservation } from "./mint-storage";

// Re-export the database-backed functions
export async function getAndClearExpiredCertificateIds(): Promise<string[]> {
  return await mintStorage.markExpiredReservations();
}

export async function hasActiveReservation(certificateId: string): Promise<boolean> {
  return await mintStorage.hasActiveReservation(certificateId);
}

export async function getPendingMintByCertificateId(certificateId: string): Promise<PendingMintReservation | null> {
  return await mintStorage.getByCertificateId(certificateId);
}

export async function updatePendingMintCommitTx(p2shAddress: string, commitTxHash: string): Promise<boolean> {
  return await mintStorage.updateCommitTx(p2shAddress, commitTxHash);
}

// Cleanup old reservations every hour
setInterval(async () => {
  await mintStorage.cleanupOldReservations();
}, 60 * 60 * 1000);

// Default configuration for Kaspa University Certificates
// Network is determined dynamically based on testnet mode
function getDefaultConfig(): KRC721Config {
  return {
    network: getNetworkId(),
    ticker: useTestnet ? "KTEST" : "KUPROOF", // Use different ticker for testnet
    collectionName: "Kaspa Proof of Learning",
    collectionDescription: "Verifiable proof of learning certificates from Kaspa University - Learn-to-Earn on Kaspa L1",
    maxSupply: 10000, // 10,000 certificates max
    royaltyFee: 0, // No royalties on educational certificates
    royaltyOwner: "",
  };
}

class KRC721Service {
  private config: KRC721Config;
  private initialized: boolean = false;
  private kaspaModule: any = null;
  private rpcClient: any = null;        // kaspa-rpc-client for UTXO queries
  private wasmRpcClient: any = null;    // WASM RpcClient for PendingTransaction.submit()
  private privateKey: any = null;
  private publicKey: any = null;
  private address: string | null = null;
  private collectionDeployed: boolean = false;
  // In-memory cache for current session (script objects can't be serialized)
  private _pendingMints: Map<string, { script: any; mintData: any; tokenId: number; certificateId: string; recipientAddress: string }> = new Map();

  constructor(config: Partial<KRC721Config> = {}) {
    this.config = { ...getDefaultConfig(), ...config };
  }

  /**
   * Switch network between mainnet and testnet-10
   * Requires reinitialization to reconnect RPC
   */
  async switchNetwork(testnet: boolean): Promise<boolean> {
    if (useTestnet === testnet) {
      console.log(`[KRC721] Already on ${testnet ? "testnet-10" : "mainnet"}`);
      return true;
    }

    console.log(`[KRC721] Switching network from ${this.config.network} to ${testnet ? "testnet-10" : "mainnet"}...`);
    
    setTestnetMode(testnet);
    this.config = { ...getDefaultConfig() };
    
    // Disconnect existing RPC
    if (this.rpcClient) {
      try {
        await this.rpcClient.disconnect();
      } catch (e) {}
      this.rpcClient = null;
    }
    if (this.wasmRpcClient) {
      try {
        await this.wasmRpcClient.disconnect();
      } catch (e) {}
      this.wasmRpcClient = null;
    }

    // Reset UTXO manager singleton to clear mainnet/testnet cached UTXOs
    resetUTXOManager();

    // Clear in-memory pending mints (network-specific)
    this._pendingMints.clear();
    console.log(`[KRC721] Cleared pending mints cache`);

    // Reinitialize with new network
    this.initialized = false;
    this.collectionDeployed = false;
    
    console.log(`[KRC721] Reinitializing for ${this.config.network}...`);
    const success = await this.initialize();
    
    if (success) {
      console.log(`[KRC721] Successfully switched to ${this.config.network}`);
      console.log(`[KRC721] Ticker: ${this.config.ticker}`);
      console.log(`[KRC721] Address: ${this.address}`);
    }
    
    return success;
  }

  /**
   * Get current network configuration
   */
  getNetworkInfo(): { network: string; ticker: string; testnet: boolean; indexerUrl: string } {
    return {
      network: this.config.network,
      ticker: this.config.ticker,
      testnet: useTestnet,
      indexerUrl: useTestnet 
        ? "https://testnet-10.krc721.stream" 
        : "https://kaspa-krc721d.kaspa.com"
    };
  }

  /**
   * Initialize the KRC-721 service
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Get treasury private key from environment
      const privateKeyHex = process.env.KASPA_TREASURY_PRIVATEKEY || process.env.KASPA_TREASURY_PRIVATE_KEY;
      const mnemonic = process.env.KASPA_TREASURY_MNEMONIC;
      
      const keyInput = privateKeyHex || mnemonic;
      
      if (!keyInput) {
        console.log("[KRC721] No private key or mnemonic configured - running in demo mode");
        this.initialized = true;
        return true;
      }

      // Load kaspa module with production/development path detection
      await this.loadKaspaModule();
      
      if (this.kaspaModule.initConsolePanicHook) {
        this.kaspaModule.initConsolePanicHook();
      }

      // Derive keys from private key hex or mnemonic
      await this.deriveKeys(keyInput.trim());

      console.log(`[KRC721] Service initialized`);
      console.log(`[KRC721] Address: ${this.address}`);
      console.log(`[KRC721] Network: ${this.config.network}`);
      console.log(`[KRC721] Collection: ${this.config.ticker}`);

      // Connect to RPC
      await this.connectRpc();

      // Load deployment status from database
      await this.loadDeploymentStatus();

      // Log live mode status with reasons if not live
      if (this.isLive()) {
        console.log(`[KRC721] Live mode enabled - RPC connected, keys ready`);
      } else {
        const reasons: string[] = [];
        if (!this.rpcClient) reasons.push("RPC not connected");
        if (!this.privateKey) reasons.push("No private key");
        console.error(`[KRC721] Cannot enable live mode: ${reasons.join(", ")}`);
        console.log("[KRC721] Running in demo mode - NFT minting will be simulated");
      }

      this.initialized = true;
      return this.isLive();
    } catch (error: any) {
      console.error("[KRC721] Failed to initialize:", error.message);
      this.initialized = true; // Allow demo mode
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
    const path = await import("path");
    const fs = await import("fs");
    
    console.log("[KRC721] Loading kaspa WASM module v1.0.1...");
    
    // Development path (tsx from project root)
    const devWasmPath = path.join(process.cwd(), "server/wasm/kaspa.js");
    // Production path (esbuild bundle in dist/)
    const prodWasmPath = path.join(process.cwd(), "dist/wasm/kaspa.js");
    
    // Determine which WASM path to use
    let wasmPath: string | null = null;
    if (fs.existsSync(prodWasmPath)) {
      wasmPath = prodWasmPath;
      console.log("[KRC721] Using production WASM from dist/wasm/");
    } else if (fs.existsSync(devWasmPath)) {
      wasmPath = devWasmPath;
      console.log("[KRC721] Using development WASM from server/wasm/");
    }
    
    if (!wasmPath) {
      throw new Error("Kaspa WASM module not found. Expected at server/wasm/kaspa.js or dist/wasm/kaspa.js");
    }
    
    // Use require() for CommonJS WASM bundle (synchronous loading)
    // The WASM module auto-initializes on require() - see kaspa.js lines 14794-14799
    this.kaspaModule = require(wasmPath);
    
    // Verify critical exports for KRC721 operations
    const requiredExports = ['PrivateKey', 'PublicKey', 'ScriptBuilder', 'addressFromScriptPublicKey'];
    const missingExports = requiredExports.filter(exp => !this.kaspaModule[exp]);
    if (missingExports.length > 0) {
      throw new Error(`WASM module missing required exports: ${missingExports.join(', ')}`);
    }
    
    // Initialize console panic hook for better WASM error debugging
    if (typeof this.kaspaModule.initConsolePanicHook === 'function') {
      this.kaspaModule.initConsolePanicHook();
      console.log("[KRC721] Console panic hook initialized for WASM debugging");
    }

    console.log("[KRC721] Kaspa WASM v1.0.1 loaded successfully");
  }

  /**
   * Derive keys from raw private key or mnemonic phrase
   */
  private async deriveKeys(input: string): Promise<void> {
    const { PrivateKey, PublicKey, Address } = this.kaspaModule;
    
    // Check if this is a raw private key (64 hex characters)
    const isRawPrivateKey = /^[0-9a-fA-F]{64}$/.test(input);
    let privateKeyHex: string;
    
    if (isRawPrivateKey) {
      console.log("[KRC721] Using raw private key");
      privateKeyHex = input;
    } else {
      // Treat as BIP39 mnemonic
      console.log("[KRC721] Deriving keys from mnemonic...");
      const cleanMnemonic = input.replace(/\s+/g, " ");
      
      // Derive seed from mnemonic
      const seed = await bip39.mnemonicToSeed(cleanMnemonic);
      
      // Create HD key and derive using Kaspa BIP44 path: m/44'/111111'/0'/0/0
      const hdkey = HDKey.fromMasterSeed(seed);
      const derivedKey = hdkey.derive("m/44'/111111'/0'/0/0");
      
      if (!derivedKey.privateKey) {
        throw new Error("Failed to derive private key from mnemonic");
      }
      
      privateKeyHex = derivedKey.privateKey.toString("hex");
    }

    // Store raw private key buffer for transaction signing
    const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
    
    // Use secp256k1 to derive public key (more reliable than WASM methods)
    const secp256k1Module = await import("secp256k1");
    const secp = secp256k1Module.default || secp256k1Module;
    const pubKeyBytes = secp.publicKeyCreate(privateKeyBuffer, true);
    const pubKeyHex = Buffer.from(pubKeyBytes).toString("hex");
    console.log(`[KRC721] Derived public key: ${pubKeyHex.slice(0, 16)}...`);
    
    // Create Kaspa PrivateKey and PublicKey objects for transaction signing
    this.privateKey = new PrivateKey(privateKeyHex);
    this.publicKey = new PublicKey(pubKeyHex);
    
    // Get address from public key
    let address;
    if (typeof this.publicKey.toAddress === "function") {
      address = this.publicKey.toAddress(this.config.network);
    } else if (typeof this.publicKey.toAddressECDSA === "function") {
      address = this.publicKey.toAddressECDSA(this.config.network);
    } else {
      // Try alternative methods
      const pubKeyStr = this.publicKey.toString ? this.publicKey.toString() : pubKeyHex;
      address = Address.fromPublicKey(pubKeyStr, this.config.network);
    }
    
    this.address = address.toString();
    console.log("[KRC721] Keys derived successfully");
  }

  /**
   * Connect to Kaspa RPC using kaspa-rpc-client (pure TypeScript, more reliable in Node.js)
   */
  private async connectRpc(): Promise<void> {
    try {
      const networkId = this.config.network;
      console.log(`[KRC721] Connecting to RPC via kaspa-rpc-client (${networkId})...`);
      
      // Use kaspa-rpc-client (pure TypeScript) for UTXO queries
      const { ClientWrapper } = require("kaspa-rpc-client");
      
      // Select appropriate seeder based on network
      // Mainnet: seeder2.kaspad.net:16110
      // Testnet-10: seeder1-testnet.kaspad.net:16210 (port 16210 for testnet-10)
      const hosts = networkId === "testnet-10" 
        ? ["seeder1-testnet.kaspad.net:16210"] 
        : ["seeder2.kaspad.net:16110"];
      
      console.log(`[KRC721] Using RPC hosts: ${hosts.join(", ")}`);
      
      const wrapper = new ClientWrapper({
        hosts,
        verbose: false,
      });
      
      await wrapper.initialize();
      this.rpcClient = await wrapper.getClient();
      
      // Get block count to verify connection
      const info = await this.rpcClient.getBlockDagInfo();
      console.log(`[KRC721] RPC connected to ${networkId}! Block count: ${info?.blockCount || "unknown"}`);
      
      // Also connect WASM RpcClient for PendingTransaction.submit()
      // WASM SDK's PendingTransaction.submit() requires WASM RpcClient, not kaspa-rpc-client
      try {
        const { RpcClient: WasmRpcClient, Resolver } = this.kaspaModule;
        const resolver = new Resolver();
        this.wasmRpcClient = new WasmRpcClient({
          resolver,
          networkId: this.config.network,
        });
        await this.wasmRpcClient.connect();
        console.log(`[KRC721] WASM RpcClient connected for transaction submission`);
      } catch (wasmError: any) {
        console.log(`[KRC721] WASM RpcClient connection failed: ${wasmError.message}`);
        // Will fall back to kaspa-rpc-client (may not work for submit)
      }
    } catch (error: any) {
      console.log(`[KRC721] RPC connection failed: ${error.message}`);
      // Continue without RPC - will use demo mode
    }
  }

  /**
   * Check if service is live (has real signing capability)
   */
  isLive(): boolean {
    return this.privateKey !== null && this.rpcClient !== null;
  }

  /**
   * Load deployment status from database
   */
  private async loadDeploymentStatus(): Promise<void> {
    try {
      const { db } = await import("./db");
      const { appSettings } = await import("./db/schema");
      const { eq } = await import("drizzle-orm");
      
      const result = await db.select().from(appSettings).where(eq(appSettings.key, `krc721_deployed_${this.config.ticker}`));
      if (result.length > 0 && result[0].value === "true") {
        this.collectionDeployed = true;
        console.log(`[KRC721] Collection ${this.config.ticker} is already deployed (from database)`);
      }
    } catch (error: any) {
      console.log(`[KRC721] Could not load deployment status: ${error.message}`);
    }
  }

  /**
   * Save deployment status to database
   */
  private async saveDeploymentStatus(deployed: boolean): Promise<void> {
    try {
      const { db } = await import("./db");
      const { appSettings } = await import("./db/schema");
      
      await db.insert(appSettings)
        .values({
          key: `krc721_deployed_${this.config.ticker}`,
          value: deployed ? "true" : "false",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: deployed ? "true" : "false", updatedAt: new Date() },
        });
      
      console.log(`[KRC721] Deployment status saved to database: ${deployed}`);
    } catch (error: any) {
      console.error(`[KRC721] Could not save deployment status: ${error.message}`);
    }
  }

  /**
   * Save deploy P2SH address for recovery in case of failure
   */
  private async saveDeployP2SHAddress(p2shAddress: string): Promise<void> {
    try {
      const { db } = await import("./db");
      const { appSettings } = await import("./db/schema");
      
      await db.insert(appSettings)
        .values({
          key: `krc721_deploy_p2sh_${this.config.ticker}`,
          value: p2shAddress,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: p2shAddress, updatedAt: new Date() },
        });
      
      console.log(`[KRC721] Deploy P2SH address saved for recovery: ${p2shAddress}`);
    } catch (error: any) {
      console.error(`[KRC721] Could not save deploy P2SH address: ${error.message}`);
    }
  }

  /**
   * Check treasury balance before attempting operations
   */
  private async checkTreasuryBalance(): Promise<{ balanceKas: number; balanceSompi: bigint }> {
    if (!this.wasmRpcClient || !this.address) {
      return { balanceKas: 0, balanceSompi: BigInt(0) };
    }
    
    try {
      const { entries } = await this.wasmRpcClient.getUtxosByAddresses([this.address]);
      let totalSompi = BigInt(0);
      for (const e of entries) {
        const amt = e.utxoEntry?.amount ?? e.amount ?? BigInt(0);
        totalSompi += BigInt(amt);
      }
      const balanceKas = Number(totalSompi) / 1e8;
      return { balanceKas, balanceSompi: totalSompi };
    } catch (error: any) {
      console.error(`[KRC721] Balance check failed: ${error.message}`);
      return { balanceKas: 0, balanceSompi: BigInt(0) };
    }
  }

  /**
   * Runtime health check - verifies RPC is actually responsive before transactions
   */
  private async checkRpcHealth(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.rpcClient) {
      return { healthy: false, error: "RPC client not initialized" };
    }
    
    try {
      const result = await Promise.race([
        this.rpcClient.getBlockDagInfo(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("RPC health check timeout")), 5000))
      ]);
      
      if (!result) {
        return { healthy: false, error: "RPC returned empty response" };
      }
      
      return { healthy: true };
    } catch (error: any) {
      console.error(`[KRC721] RPC health check failed: ${error.message}`);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Get next token ID (based on highest existing token ID + 1)
   * Uses the mint reservations table to track the highest minted token
   */
  async getNextTokenId(): Promise<number> {
    const highestFromReservations = await mintStorage.getHighestTokenId();
    const certificateCount = await storage.getCertificateCount();
    
    // Use the maximum of reservation highest or certificate count to avoid duplicates
    const nextId = Math.max(highestFromReservations, certificateCount) + 1;
    console.log(`[KRC721] Next token ID: ${nextId} (reservations max: ${highestFromReservations}, cert count: ${certificateCount})`);
    return nextId;
  }

  /**
   * Deploy the KUCERT collection (one-time operation)
   * 
   * This creates the NFT collection on-chain with metadata.
   * Should only be called once to initialize the collection.
   * 
   * SAFETY: If deploy fails after commit, funds can be recovered via admin P2SH recovery.
   * The deploy P2SH address is logged and stored in app_settings for recovery.
   */
  async deployCollection(imageUrl: string): Promise<DeployResult> {
    if (!this.isLive()) {
      console.error("[KRC721] Cannot deploy - service not in live mode");
      return { success: false, error: "NFT service not configured. Treasury private key required." };
    }

    try {
      const {
        ScriptBuilder,
        Opcodes,
        addressFromScriptPublicKey,
        createTransactions,
        kaspaToSompi,
      } = this.kaspaModule;

      // PRE-FLIGHT CHECK: Verify sufficient balance before attempting deploy
      const requiredKas = 1005; // 1000 KAS deploy + ~5 KAS for fees
      const balanceCheck = await this.checkTreasuryBalance();
      if (balanceCheck.balanceKas < requiredKas) {
        const error = `Insufficient treasury balance. Need ${requiredKas} KAS, have ${balanceCheck.balanceKas.toFixed(2)} KAS. Fund the treasury first.`;
        console.error(`[KRC721] ${error}`);
        return { success: false, error };
      }
      console.log(`[KRC721] Pre-flight check passed: ${balanceCheck.balanceKas.toFixed(2)} KAS available`);

      // Create deployment data following EXACT KRC-721 spec from KSPR indexer docs
      // Reference: https://testnet-10.krc721.stream/docs
      // The opData in indexer shows: { buri, max, royaltyFee, daaMintStart, premint }
      // Keep it minimal - only include required fields
      const deployData: any = {
        p: "krc-721",
        op: "deploy",
        tick: this.config.ticker,
        buri: imageUrl, // Base URI - MUST be ipfs:// prefix
        max: this.config.maxSupply.toString(),
      };

      // Add royalty info if configured (use royaltyTo per spec)
      if (this.config.royaltyFee > 0 && this.config.royaltyOwner) {
        // royaltyFee is in SOMPI (10^-8 KAS)
        deployData.royaltyFee = kaspaToSompi(this.config.royaltyFee.toString())?.toString();
        deployData.royaltyTo = this.config.royaltyOwner;
      }

      console.log(`[KRC721] Deploying collection: ${JSON.stringify(deployData)}`);

      // Build inscription script
      const script = new ScriptBuilder()
        .addData(this.publicKey.toXOnlyPublicKey().toString())
        .addOp(Opcodes.OpCheckSig)
        .addOp(Opcodes.OpFalse)
        .addOp(Opcodes.OpIf)
        .addData(Buffer.from("kspr"))
        .addI64(BigInt(0))
        .addData(Buffer.from(JSON.stringify(deployData, null, 0)))
        .addOp(Opcodes.OpEndIf);

      // Get P2SH address for commit transaction
      const P2SHAddress = addressFromScriptPublicKey(
        script.createPayToScriptHashScript(),
        this.config.network
      )!;

      const p2shAddressStr = P2SHAddress.toString();
      console.log(`[KRC721] Deploy P2SH Address: ${p2shAddressStr}`);
      
      // SAFETY: Store P2SH address for recovery in case of failure
      await this.saveDeployP2SHAddress(p2shAddressStr);
      console.log(`[KRC721] Deploy P2SH stored for recovery: ${p2shAddressStr}`);

      // Execute commit-reveal pattern with 1000 KAS deploy fee (required by indexer)
      const result = await this.executeCommitReveal(script, P2SHAddress, KRC721_DEPLOY_FEE_KAS);
      
      if (result.success) {
        // CRITICAL: Verify the collection was actually indexed before marking as deployed
        console.log(`[KRC721] Transactions submitted, verifying with indexer...`);
        const indexerResult = await waitForCollectionIndexed(this.config.ticker, 180000); // 3 minute timeout
        
        if (indexerResult.indexed) {
          this.collectionDeployed = true;
          await this.saveDeploymentStatus(true);
          console.log(`[KRC721] Collection ${this.config.ticker} deployed and VERIFIED in indexer!`);
        } else {
          // Transaction was submitted but indexer rejected or didn't process it
          console.error(`[KRC721] Deploy transactions submitted but NOT indexed: ${indexerResult.error}`);
          return { 
            success: false, 
            commitTxHash: result.commitTxHash,
            revealTxHash: result.revealTxHash,
            error: `Transactions submitted but collection not indexed: ${indexerResult.error}. Check reveal tx fees meet minimum (1000 KAS).`
          };
        }
      }

      return result;
    } catch (error: any) {
      console.error("[KRC721] Deploy failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate a Kaspa address format based on current network mode
   */
  private validateAddress(address: string): { valid: boolean; error?: string } {
    if (!address || typeof address !== "string") {
      return { valid: false, error: "Address is required" };
    }
    const normalized = address.toLowerCase().trim();
    const expectedPrefix = getAddressPrefix();
    
    if (useTestnet) {
      // Testnet mode - accept kaspatest: addresses
      if (!normalized.startsWith("kaspatest:")) {
        if (normalized.startsWith("kaspa:")) {
          return { valid: false, error: "Mainnet addresses not allowed in testnet mode" };
        }
        return { valid: false, error: "Invalid Kaspa testnet address prefix" };
      }
      const dataPart = normalized.slice(10); // "kaspatest:" is 10 chars
      if (dataPart.length < 32 || dataPart.length > 100) {
        return { valid: false, error: "Invalid address length" };
      }
      if (!dataPart.startsWith("q") && !dataPart.startsWith("p")) {
        return { valid: false, error: "Invalid address type" };
      }
    } else {
      // Mainnet mode - accept kaspa: addresses
      if (!normalized.startsWith("kaspa:")) {
        if (normalized.startsWith("kaspatest:") || normalized.startsWith("kaspasim:")) {
          return { valid: false, error: "Testnet/simnet addresses not allowed on mainnet" };
        }
        return { valid: false, error: "Invalid Kaspa address prefix" };
      }
      const dataPart = normalized.slice(6); // "kaspa:" is 6 chars
      if (dataPart.length < 32 || dataPart.length > 100) {
        return { valid: false, error: "Invalid address length" };
      }
      if (!dataPart.startsWith("q") && !dataPart.startsWith("p")) {
        return { valid: false, error: "Invalid address type" };
      }
    }
    return { valid: true };
  }

  /**
   * Mint a certificate NFT for a course completion
   * 
   * Per KRC-721 spec (aspectron/krc721):
   * - Mint operations require minimum 10 KAS fee
   * - Image URLs must use ipfs:// prefix (data URIs not accepted by indexer)
   * 
   * @param recipientAddress - The wallet address to receive the certificate
   * @param courseName - Name of the completed course
   * @param score - Quiz/course score
   * @param completionDate - Date of completion
   * @param imageUrl - IPFS URL for certificate image (must start with ipfs://)
   */
  async mintCertificate(
    recipientAddress: string,
    courseName: string,
    score: number,
    completionDate: Date,
    imageUrl: string
  ): Promise<MintResult> {
    // SECURITY: Validate recipient address before minting
    const validation = this.validateAddress(recipientAddress);
    if (!validation.valid) {
      console.error(`[KRC721] Invalid recipient address: ${validation.error}`);
      return { success: false, error: `Invalid recipient address: ${validation.error}` };
    }

    // Validate IPFS URL per KRC-721 spec
    // Note: In production, we require IPFS URLs. Data URIs are only accepted in demo mode.
    const isIpfsUrl = imageUrl.startsWith("ipfs://");
    const isDataUri = imageUrl.startsWith("data:");
    
    if (!isIpfsUrl && !isDataUri) {
      console.error(`[KRC721] Invalid image URL: must be ipfs:// or data: URI`);
      return { success: false, error: "Image URL must use ipfs:// protocol" };
    }

    // Get token ID from storage (will be incremented after certificate is created)
    const tokenId = await this.getNextTokenId();

    if (!this.isLive()) {
      // Check WHY we're not live - provide specific error
      const reasons: string[] = [];
      if (!this.rpcClient) reasons.push("RPC not connected to Kaspa network");
      if (!this.privateKey) reasons.push("Treasury private key not configured");
      
      console.error(`[KRC721] Cannot mint - not live: ${reasons.join(", ")}`);
      return { success: false, error: `NFT service offline: ${reasons.join(", ")}`, tokenId };
    }

    // In production mode, require IPFS URLs (indexer rejects data URIs)
    if (!isIpfsUrl) {
      console.error(`[KRC721] IPFS URL required for production minting. Data URIs are rejected by the KRC-721 indexer.`);
      console.error(`[KRC721] Configure Pinata IPFS credentials (PINATA_API_KEY, PINATA_SECRET_KEY) for NFT minting.`);
      return { 
        success: false, 
        error: "IPFS URL required. Configure Pinata credentials for NFT minting.", 
        tokenId 
      };
    }

    try {
      const {
        ScriptBuilder,
        Opcodes,
        addressFromScriptPublicKey,
      } = this.kaspaModule;

      // Create MINIMAL mint data per KRC-721 spec to avoid 520-byte limit
      // Reference: https://github.com/coinchimp/kaspa-krc721-apps/blob/main/mint.ts
      // CRITICAL: Include "to" field to specify recipient address!
      const crypto = await import("crypto");
      const nonce = crypto.randomBytes(8).toString("hex");
      
      const mintData: any = {
        p: "krc-721",
        op: "mint",
        tick: this.config.ticker,
        to: recipientAddress, // CRITICAL: Recipient address for the NFT
        nonce, // Ensures unique P2SH address per attempt
      };

      console.log(`[KRC721] Minting certificate #${tokenId} for ${recipientAddress}`);

      // Build inscription script per coinchimp reference
      const script = new ScriptBuilder()
        .addData(this.publicKey.toXOnlyPublicKey().toString())
        .addOp(Opcodes.OpCheckSig)
        .addOp(Opcodes.OpFalse)
        .addOp(Opcodes.OpIf)
        .addData(Buffer.from("kspr"))
        .addI64(BigInt(0))
        .addData(Buffer.from(JSON.stringify(mintData, null, 0)))
        .addOp(Opcodes.OpEndIf);

      // Get P2SH address
      const P2SHAddress = addressFromScriptPublicKey(
        script.createPayToScriptHashScript(),
        this.config.network
      )!;

      // Execute commit-reveal pattern using spec-compliant fee
      const result = await this.executeCommitReveal(script, P2SHAddress, KRC721_MINT_FEE_KAS);

      if (result.success) {
        // CRITICAL: Verify the token was actually indexed before marking as minted
        console.log(`[KRC721] Mint transactions submitted, verifying with indexer...`);
        const indexerResult = await waitForTokenIndexed(this.config.ticker, tokenId, 180000); // 3 minute timeout
        
        if (indexerResult.indexed) {
          console.log(`[KRC721] Certificate #${tokenId} minted and VERIFIED in indexer!`);
          return { ...result, tokenId };
        } else {
          // Transaction was submitted but indexer rejected or didn't process it
          console.error(`[KRC721] Mint transactions submitted but NOT indexed: ${indexerResult.error}`);
          return { 
            success: false, 
            commitTxHash: result.commitTxHash,
            revealTxHash: result.revealTxHash,
            tokenId,
            error: `Mint transactions submitted but token not indexed: ${indexerResult.error}. Check reveal tx fees meet minimum (10 KAS).`
          };
        }
      }

      return { ...result, tokenId };
    } catch (error: any) {
      console.error("[KRC721] Mint failed:", error.message);
      return { success: false, error: error.message, tokenId };
    }
  }

  /**
   * Prepare a non-custodial NFT mint
   * 
   * Returns the P2SH address and amount for the user to send directly from their wallet.
   * This is fully non-custodial - funds go directly from user to P2SH, never through treasury.
   * 
   * @param certificateId - The certificate ID to mint
   * @param recipientAddress - The wallet address to receive the certificate
   * @param courseName - Name of the completed course
   * @param score - Quiz/course score
   * @param completionDate - Date of completion
   * @param imageUrl - IPFS URL for certificate image
   */
  async prepareMint(
    certificateId: string,
    recipientAddress: string,
    courseName: string,
    score: number,
    completionDate: Date,
    imageUrl: string
  ): Promise<{ success: boolean; p2shAddress?: string; amountSompi?: string; tokenId?: number; expiresAt?: number; error?: string }> {
    // Validate recipient address
    const validation = this.validateAddress(recipientAddress);
    if (!validation.valid) {
      console.error(`[KRC721] Invalid recipient address: ${validation.error}`);
      return { success: false, error: `Invalid recipient address: ${validation.error}` };
    }

    // Validate IPFS URL
    const isIpfsUrl = imageUrl.startsWith("ipfs://");
    const isDataUri = imageUrl.startsWith("data:");
    
    if (!isIpfsUrl && !isDataUri) {
      return { success: false, error: "Image URL must use ipfs:// protocol" };
    }

    // Get token ID
    const tokenId = await this.getNextTokenId();

    if (!this.isLive()) {
      // Check WHY we're not live - provide specific error
      const reasons: string[] = [];
      if (!this.rpcClient) reasons.push("RPC not connected to Kaspa network");
      if (!this.privateKey) reasons.push("Treasury private key not configured");
      if (!this.publicKey) reasons.push("Public key not derived");
      
      console.error(`[KRC721] Cannot prepare mint - not live: ${reasons.join(", ")}`);
      return { success: false, error: `NFT service offline: ${reasons.join(", ")}` };
    }

    // Production mode - require IPFS URLs
    if (!isIpfsUrl) {
      return { 
        success: false, 
        error: "IPFS URL required. Configure Pinata credentials for NFT minting." 
      };
    }

    // Runtime health check before attempting transaction
    const health = await this.checkRpcHealth();
    if (!health.healthy) {
      console.error(`[KRC721] RPC health check failed before mint: ${health.error}`);
      return { success: false, error: `NFT service offline: ${health.error}` };
    }

    try {
      const {
        ScriptBuilder,
        Opcodes,
        addressFromScriptPublicKey,
      } = this.kaspaModule;

      // Create MINIMAL mint data per KRC-721 spec
      // Reference: https://github.com/coinchimp/kaspa-krc721-apps/blob/main/mint.ts
      // CRITICAL: Include "to" field to specify recipient address (otherwise goes to treasury!)
      // Include nonce for unique P2SH address per mint attempt (allows retries)
      const crypto = await import("crypto");
      const nonce = crypto.randomBytes(8).toString("hex");
      
      const mintData: any = {
        p: "krc-721",
        op: "mint",
        tick: this.config.ticker,
        to: recipientAddress, // CRITICAL: Recipient address for the NFT
        nonce, // Ensures unique P2SH address per attempt
      };

      // Calculate data size to prevent 520-byte limit errors
      // CRITICAL: Store this EXACT string - it must be reproduced byte-for-byte for script reconstruction
      const mintDataStr = JSON.stringify(mintData, null, 0);
      console.log(`[KRC721] Mint data: ${mintDataStr}`);
      console.log(`[KRC721] Mint data size: ${mintDataStr.length} bytes (limit: 520)`);
      
      if (mintDataStr.length > 500) {
        console.error(`[KRC721] Mint data too large: ${mintDataStr.length} bytes`);
        return { success: false, error: "Mint data exceeds script size limit" };
      }

      // Build inscription script per coinchimp reference implementation
      // CRITICAL: Store the xOnlyPubKey for script reconstruction after server restart
      const xOnlyPubKey = this.publicKey.toXOnlyPublicKey().toString();
      console.log(`[KRC721] Building script with pubkey: ${xOnlyPubKey.slice(0, 16)}...`);
      
      const script = new ScriptBuilder()
        .addData(xOnlyPubKey)
        .addOp(Opcodes.OpCheckSig)
        .addOp(Opcodes.OpFalse)
        .addOp(Opcodes.OpIf)
        .addData(Buffer.from("kspr"))
        .addI64(BigInt(0)) // BigInt(0) for ES2019 compatibility
        .addData(Buffer.from(mintDataStr))
        .addOp(Opcodes.OpEndIf);

      // Get P2SH address
      const P2SHAddress = addressFromScriptPublicKey(
        script.createPayToScriptHashScript(),
        this.config.network
      )!;

      const p2shAddressStr = P2SHAddress.toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minute expiry

      // Clean up any existing reservation for this certificate before creating new one
      const existingReservation = await mintStorage.getByCertificateId(certificateId);
      if (existingReservation) {
        console.log(`[KRC721] Cleaning up existing reservation for certificate ${certificateId}`);
        await mintStorage.deleteReservation(existingReservation.p2shAddress);
      }

      // Store pending mint in database for finalization
      // CRITICAL: Store xOnlyPubKey AND exact mintDataStr for byte-perfect script reconstruction
      const reservation = await mintStorage.createReservation({
        certificateId,
        recipientAddress,
        tokenId,
        p2shAddress: p2shAddressStr,
        xOnlyPubKey, // Store pubkey for script reconstruction - prevents lost funds on restart
        scriptData: mintDataStr, // Store the EXACT string used in script (not script.toString())
        mintData,
        expiresAt: new Date(expiresAt),
      });

      if (!reservation) {
        const dbError = mintStorage.getLastError();
        console.error(`[KRC721] Reservation creation failed: ${dbError}`);
        return { success: false, error: `Failed to store mint reservation: ${dbError || 'unknown error'}` };
      }

      // Also keep in memory for the current session (faster lookup)
      this._pendingMints.set(p2shAddressStr, {
        script,
        mintData,
        tokenId,
        certificateId,
        recipientAddress,
      });

      console.log(`[KRC721] Prepared non-custodial mint #${tokenId} -> P2SH: ${p2shAddressStr.slice(0, 25)}...`);

      return {
        success: true,
        p2shAddress: p2shAddressStr,
        amountSompi: KRC721_MINT_FEE_SOMPI.toString(),
        tokenId,
        expiresAt,
      };
    } catch (error: any) {
      console.error("[KRC721] Prepare mint failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Finalize a non-custodial NFT mint after user has sent funds to P2SH
   * 
   * Verifies the commit transaction exists and submits the reveal transaction.
   * 
   * @param p2shAddress - The P2SH address user sent funds to
   * @param certificateId - The certificate ID being minted (for verification)
   * @param commitTxHash - The transaction hash of the user's commit (optional, for verification)
   */
  async finalizeMint(
    p2shAddress: string,
    certificateId: string,
    commitTxHash?: string
  ): Promise<MintResult> {
    // First try in-memory cache (for current session)
    let pending = this._pendingMints.get(p2shAddress);
    
    // If not in memory, check database
    let dbReservation = await mintStorage.getByP2shAddress(p2shAddress);
    
    if (!pending && !dbReservation) {
      console.error(`[KRC721] No pending mint found for P2SH: ${p2shAddress.slice(0, 25)}...`);
      return { success: false, error: "Mint reservation not found or expired" };
    }

    // Verify the certificate ID matches
    const reservationCertId = pending?.certificateId || dbReservation?.certificateId;
    if (reservationCertId !== certificateId) {
      console.error(`[KRC721] Certificate ID mismatch: expected ${reservationCertId}, got ${certificateId}`);
      return { success: false, error: "Certificate ID mismatch" };
    }

    // Check expiry from database
    if (dbReservation) {
      const expiresAt = dbReservation.expiresAt.getTime();
      if (expiresAt < Date.now() && dbReservation.status === "pending") {
        await mintStorage.markFailed(p2shAddress);
        return { success: false, error: "Mint reservation expired", expired: true } as any;
      }
    }

    const tokenId = pending?.tokenId || dbReservation?.tokenId || 0;

    if (!this.isLive()) {
      console.error(`[KRC721] Cannot finalize mint - service not in live mode`);
      return { success: false, error: "NFT service not configured", tokenId };
    }

    // In production, we need the script object for signing
    // If we only have database data (server restarted), we need to rebuild the script
    if (!pending && dbReservation) {
      // Try to rebuild the script from stored data
      try {
        const mintData = JSON.parse(dbReservation.mintData);
        const {
          ScriptBuilder,
          Opcodes,
        } = this.kaspaModule;

        // CRITICAL: Use the stored xOnlyPubKey, NOT the current publicKey
        // This ensures the P2SH address matches even if the server key changes
        let xOnlyPubKey = dbReservation.xOnlyPubKey;
        
        if (!xOnlyPubKey) {
          // Fallback for old reservations without stored pubkey
          // Check if P2SH would match with current key
          console.log(`[KRC721] WARNING: No stored xOnlyPubKey, using current key (may fail if key changed)`);
          xOnlyPubKey = this.publicKey.toXOnlyPublicKey().toString();
        }

        // CRITICAL: Use the stored scriptData (exact mintDataStr) - NOT regenerated JSON
        // The scriptData field now stores the exact string used in the original script
        // This ensures byte-for-byte matching for P2SH address derivation
        const storedMintDataStr = dbReservation.scriptData;
        
        // Verify it looks like JSON (not hex from old script.toString())
        const isValidJson = storedMintDataStr.startsWith("{") && storedMintDataStr.endsWith("}");
        const mintDataStrToUse = isValidJson 
          ? storedMintDataStr 
          : JSON.stringify(mintData, null, 0); // Fallback for old format
        
        if (!isValidJson) {
          console.log(`[KRC721] WARNING: scriptData appears to be old format, regenerating mintData string`);
        }

        // Rebuild the inscription script with the EXACT pubkey and EXACT data string
        const script = new ScriptBuilder()
          .addData(xOnlyPubKey)
          .addOp(Opcodes.OpCheckSig)
          .addOp(Opcodes.OpFalse)
          .addOp(Opcodes.OpIf)
          .addData(Buffer.from("kspr"))
          .addI64(BigInt(0))
          .addData(Buffer.from(mintDataStrToUse))
          .addOp(Opcodes.OpEndIf);

        // Verify the reconstructed P2SH matches what's stored
        const { addressFromScriptPublicKey } = this.kaspaModule;
        const reconstructedP2sh = addressFromScriptPublicKey(
          script.createPayToScriptHashScript(),
          this.config.network
        )!.toString();
        
        if (reconstructedP2sh !== p2shAddress) {
          console.error(`[KRC721] P2SH mismatch! Stored: ${p2shAddress.slice(0, 30)}, Rebuilt: ${reconstructedP2sh.slice(0, 30)}`);
          return { 
            success: false, 
            error: "Script reconstruction failed - P2SH address mismatch. Funds may be recoverable by admin.",
            tokenId 
          };
        }

        pending = {
          script,
          mintData,
          tokenId: dbReservation.tokenId,
          certificateId: dbReservation.certificateId,
          recipientAddress: dbReservation.recipientAddress,
        };
        
        console.log(`[KRC721] Successfully rebuilt script from database for certificate ${certificateId}`);
      } catch (rebuildError: any) {
        console.error(`[KRC721] Failed to rebuild script: ${rebuildError.message}`);
        return { 
          success: false, 
          error: "Server restarted. Mint reservation lost - please start over.",
          tokenId 
        };
      }
    }

    if (!pending) {
      return { success: false, error: "Mint data not available", tokenId };
    }

    try {
      const { createTransactions, kaspaToSompi } = this.kaspaModule;

      // Step 1: Verify UTXO exists at P2SH address (user's commit transaction)
      // Use WASM RpcClient for consistent entry format with createTransactions
      console.log(`[KRC721] Checking for UTXO at ${p2shAddress.slice(0, 25)}...`);
      
      if (!this.wasmRpcClient) {
        return { success: false, error: "WASM RpcClient not initialized" };
      }
      
      const { entries: p2shEntries } = await this.wasmRpcClient.getUtxosByAddresses([p2shAddress]);

      if (p2shEntries.length === 0) {
        return { 
          success: false, 
          error: "Funds not yet received at P2SH address. Please wait for your transaction to confirm." 
        };
      }

      // Verify amount is sufficient - WASM RpcClient stores amount at entry.amount
      const p2shUtxo = p2shEntries[0];
      const receivedAmount = BigInt(p2shUtxo.amount ?? p2shUtxo.utxoEntry?.amount ?? 0);
      
      if (receivedAmount < KRC721_MINT_FEE_SOMPI) {
        return {
          success: false,
          error: `Insufficient funds at P2SH. Received: ${Number(receivedAmount) / 1e8} KAS, Required: ${KRC721_MINT_FEE_KAS} KAS minimum`,
        };
      }

      console.log(`[KRC721] Found ${Number(receivedAmount) / 1e8} KAS at P2SH. Proceeding with reveal...`);

      // Step 2: Get treasury UTXOs for reveal transaction fees using WASM RpcClient
      const { entries: treasuryEntries } = await this.wasmRpcClient.getUtxosByAddresses([this.address!]);

      // Step 3: Create reveal transaction - pass entries directly without transformation
      // CRITICAL: priorityFee MUST match the mint fee to burn the full inscription fee!
      // The indexer verifies that the reveal tx burns >= 10 KAS for mint
      const { transactions: revealTxs } = await createTransactions({
        priorityEntries: [p2shUtxo], // P2SH UTXO first
        entries: treasuryEntries, // Treasury UTXOs for fee
        outputs: [], // All funds go to change
        changeAddress: this.address!, // Change goes to treasury (covers reveal fee)
        priorityFee: kaspaToSompi(KRC721_MINT_FEE_KAS)!, // BURN the full 10 KAS mint fee
        networkId: this.config.network,
      });

      // Step 4: Sign reveal transaction with script signature
      let revealTxHash: string | undefined;
      
      for (const tx of revealTxs) {
        tx.sign([this.privateKey], false);

        // Find and fill the P2SH input with inscription script
        const p2shInputIndex = tx.transaction.inputs.findIndex(
          (input: any) => input.signatureScript === ""
        );

        if (p2shInputIndex !== -1) {
          const signature = await tx.createInputSignature(p2shInputIndex, this.privateKey);
          tx.fillInput(
            p2shInputIndex,
            pending.script.encodePayToScriptHashSignatureScript(signature)
          );
        }

        // Use WASM RpcClient for PendingTransaction.submit() - kaspa-rpc-client won't work
        const rpcForSubmit = this.wasmRpcClient || this.rpcClient;
        revealTxHash = await tx.submit(rpcForSubmit);
        console.log(`[KRC721] Reveal tx: ${revealTxHash}`);
      }

      // Clean up pending mint from cache and mark as finalized in database
      this._pendingMints.delete(p2shAddress);
      await mintStorage.markFinalized(p2shAddress);

      // Wait for confirmation
      if (revealTxHash) {
        await this.waitForConfirmation(revealTxHash, 60000);
      }

      console.log(`[KRC721] Non-custodial mint #${tokenId} completed successfully!`);

      return {
        success: true,
        commitTxHash: commitTxHash,
        revealTxHash,
        tokenId,
      };
    } catch (error: any) {
      console.error("[KRC721] Finalize mint failed:", error.message);
      return { success: false, error: error.message, tokenId };
    }
  }

  /**
   * Get the mint fee info for display to users
   */
  getMintFeeInfo(): { kasAmount: string; sompiAmount: string; description: string } {
    return {
      kasAmount: KRC721_MINT_FEE_KAS,
      sompiAmount: KRC721_MINT_FEE_SOMPI.toString(),
      description: "KRC-721 NFT mint fee (based on coinchimp reference implementation)",
    };
  }

  /**
   * Execute the commit-reveal transaction pattern
   * 
   * 1. Commit: Send KAS to P2SH address (locks the inscription)
   * 2. Reveal: Spend from P2SH, revealing the inscription data
   * 
   * Based on coinchimp/kaspa-krc721-apps reference implementation
   */
  private async executeCommitReveal(
    script: any,
    P2SHAddress: any,
    commitAmountKas: string
  ): Promise<DeployResult> {
    const { createTransactions, kaspaToSompi } = this.kaspaModule;

    let commitTxHash: string | undefined;
    let revealTxHash: string | undefined;

    try {
      // Step 1: Commit Transaction
      console.log("[KRC721] Creating commit transaction...");
      
      // Use WASM RpcClient for getUtxosByAddresses - it returns entries in the exact format
      // that createTransactions expects (matching the coinchimp/kaspa-krc721-apps reference)
      if (!this.wasmRpcClient) {
        throw new Error("WASM RpcClient not initialized");
      }
      
      const { entries } = await this.wasmRpcClient.getUtxosByAddresses([this.address!]);
      console.log(`[KRC721] Got ${entries.length} UTXOs from WASM RpcClient`);

      if (entries.length === 0) {
        throw new Error("No UTXOs available for transaction");
      }

      // Debug: Log entry structure to understand WASM format
      if (entries.length > 0) {
        const sample = entries[0];
        console.log(`[KRC721] Sample UTXO structure:`, JSON.stringify({
          hasOutpoint: !!sample.outpoint,
          hasAddress: !!sample.address,
          hasUtxoEntry: !!sample.utxoEntry,
          outpointKeys: sample.outpoint ? Object.keys(sample.outpoint) : [],
          utxoEntryKeys: sample.utxoEntry ? Object.keys(sample.utxoEntry) : [],
          amount: sample.utxoEntry?.amount?.toString() || sample.amount?.toString() || 'not found',
        }));
      }

      // Calculate total available from entries
      let totalAvailable = BigInt(0);
      for (const e of entries) {
        // WASM RpcClient may store amount at different paths
        const amt = e.utxoEntry?.amount ?? e.amount ?? BigInt(0);
        totalAvailable += BigInt(amt);
      }
      console.log(`[KRC721] Total available in wallet: ${totalAvailable} sompi (${Number(totalAvailable) / 1e8} KAS)`);

      // Calculate required amount (commit + fee buffer)
      const commitSompi = kaspaToSompi(commitAmountKas)!;
      const feeBuffer = kaspaToSompi("3")!; // Extra for fees
      const requiredAmount = BigInt(commitSompi) + BigInt(feeBuffer);

      if (totalAvailable < requiredAmount) {
        const requiredKas = Number(requiredAmount) / 1e8;
        const availableKas = Number(totalAvailable) / 1e8;
        throw new Error(`Insufficient funds: need ${requiredKas} KAS, have ${availableKas} KAS`);
      }

      console.log(`[KRC721] Using ${entries.length} entries for commit (passing directly to createTransactions)`);

      // Pass entries DIRECTLY to createTransactions without transformation
      // This matches the reference implementation from coinchimp/kaspa-krc721-apps
      const { transactions: commitTxs } = await createTransactions({
        priorityEntries: [],
        entries: entries,
        outputs: [{
          address: P2SHAddress.toString(),
          amount: kaspaToSompi(commitAmountKas)!,
        }],
        changeAddress: this.address!,
        priorityFee: kaspaToSompi("2")!,
        networkId: this.config.network,
      });

      console.log(`[KRC721] Created ${commitTxs.length} commit transactions`);

      // Sign and submit commit transaction
      // Use WASM RpcClient for PendingTransaction.submit() - kaspa-rpc-client won't work
      const rpcForSubmit = this.wasmRpcClient || this.rpcClient;
      for (const tx of commitTxs) {
        console.log(`[KRC721] Signing tx with ${tx.transaction?.inputs?.length || 0} inputs`);
        try {
          await tx.sign([this.privateKey]);
          console.log(`[KRC721] Signing successful, submitting...`);
        } catch (signError: any) {
          console.error(`[KRC721] Sign error details:`, signError);
          throw signError;
        }
        commitTxHash = await tx.submit(rpcForSubmit);
        console.log(`[KRC721] Commit tx: ${commitTxHash}`);
      }


      // Wait for commit to confirm (poll for UTXO at P2SH address)
      await this.waitForUtxo(P2SHAddress.toString(), 60000);

      // Step 2: Reveal Transaction
      console.log("[KRC721] Creating reveal transaction...");

      // Get fresh UTXOs after commit using WASM RpcClient (change outputs)
      const { entries: newEntries } = await this.wasmRpcClient.getUtxosByAddresses([this.address!]);
      
      // Get P2SH UTXO using WASM RpcClient
      const revealUTXOs = await this.wasmRpcClient.getUtxosByAddresses([P2SHAddress.toString()]);

      if (revealUTXOs.entries.length === 0) {
        throw new Error("P2SH UTXO not found after commit");
      }

      console.log(`[KRC721] Got ${newEntries.length} new entries and ${revealUTXOs.entries.length} P2SH entries for reveal`);

      // Pass entries DIRECTLY to createTransactions without transformation
      // This matches the reference implementation from coinchimp/kaspa-krc721-apps
      // CRITICAL: priorityFee MUST match commitAmountKas to burn the full inscription fee!
      // The indexer verifies that the reveal tx burns >= 1000 KAS for deploy, 10 KAS for mint
      const { transactions: revealTxs } = await createTransactions({
        priorityEntries: [revealUTXOs.entries[0]],
        entries: newEntries,
        outputs: [],
        changeAddress: this.address!,
        priorityFee: kaspaToSompi(commitAmountKas)!, // BURN the full inscription fee
        networkId: this.config.network,
      });

      // Sign reveal transaction with script signature
      for (const tx of revealTxs) {
        tx.sign([this.privateKey], false);

        // Find and fill the P2SH input
        const p2shInputIndex = tx.transaction.inputs.findIndex(
          (input: any) => input.signatureScript === ""
        );

        if (p2shInputIndex !== -1) {
          const signature = await tx.createInputSignature(p2shInputIndex, this.privateKey);
          tx.fillInput(
            p2shInputIndex,
            script.encodePayToScriptHashSignatureScript(signature)
          );
        }

        revealTxHash = await tx.submit(rpcForSubmit);
        console.log(`[KRC721] Reveal tx: ${revealTxHash}`);
      }

      // Wait for reveal to confirm
      await this.waitForConfirmation(revealTxHash!, 60000);

      return {
        success: true,
        commitTxHash,
        revealTxHash,
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString?.() || JSON.stringify(error) || "Unknown error";
      console.error("[KRC721] Commit-reveal failed:", errorMessage);
      console.error("[KRC721] Full error:", error);
      
      return {
        success: false,
        commitTxHash,
        revealTxHash,
        error: errorMessage,
      };
    }
  }

  /**
   * Wait for a UTXO to appear at an address
   */
  private async waitForUtxo(address: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      // Use WASM RpcClient for consistency
      const rpc = this.wasmRpcClient || this.rpcClient;
      const { entries } = await rpc.getUtxosByAddresses([address]);

      if (entries.length > 0) {
        console.log(`[KRC721] UTXO confirmed at ${address.slice(0, 20)}...`);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Timeout waiting for UTXO at ${address}`);
  }

  /**
   * Wait for a transaction to be confirmed (change outputs to appear in treasury)
   * This is a basic check - the indexer verification provides the real confirmation
   */
  private async waitForConfirmation(txHash: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Use WASM RpcClient for consistency
        const rpc = this.wasmRpcClient || this.rpcClient;
        const { entries } = await rpc.getUtxosByAddresses([this.address!]);

        // Transaction is likely confirmed if we have UTXOs (change outputs)
        if (entries.length > 0) {
          console.log(`[KRC721] Transaction broadcast confirmed: ${txHash.slice(0, 16)}...`);
          return;
        }
      } catch (error) {
        // Continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Throw error - if we can't confirm the tx was broadcast, something is wrong
    throw new Error(`Timeout waiting for transaction ${txHash.slice(0, 16)}... to be confirmed on network`);
  }

  /**
   * Generate certificate image as raw SVG string
   * Used for IPFS upload
   * Dark theme with floating DAG background and KU hexagon logo
   */
  generateCertificateImageSvg(
    recipientAddress: string,
    courseName: string,
    score: number,
    completionDate: Date
  ): string {
    const dateStr = completionDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const shortAddress = `${recipientAddress.slice(0, 12)}...${recipientAddress.slice(-8)}`;

    // Generate static DAG nodes for background
    const dagNodes = this.generateStaticDAGNodes();

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#0f0f0f;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="hexGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#047857;stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="800" height="600" fill="url(#bg)"/>
        
        <!-- Floating DAG Structure Background -->
        <g opacity="0.4">
          ${dagNodes}
        </g>
        
        <!-- Border -->
        <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#green)" stroke-width="2" rx="12"/>
        <rect x="28" y="28" width="744" height="544" fill="none" stroke="#1f2937" stroke-width="1" rx="10"/>
        
        <!-- KU Hexagon Logo -->
        <g transform="translate(400, 70)">
          <!-- Outer hexagon glow -->
          <polygon points="0,-42 36,-21 36,21 0,42 -36,21 -36,-21" fill="none" stroke="#10b981" stroke-width="3" opacity="0.3" filter="url(#nodeGlow)"/>
          <!-- Main hexagon -->
          <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="#0a0a0a" stroke="url(#hexGreen)" stroke-width="2"/>
          <!-- Inner hexagon accent -->
          <polygon points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14" fill="none" stroke="#10b981" stroke-width="1" opacity="0.5"/>
          <!-- KU Text -->
          <text x="0" y="8" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" fill="url(#green)" font-weight="bold">KU</text>
        </g>
        
        <!-- Header -->
        <text x="400" y="135" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#10b981" letter-spacing="4" font-weight="bold">
          KASPA UNIVERSITY
        </text>
        
        <!-- Certificate Title -->
        <text x="400" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#ffffff" font-weight="bold" filter="url(#glow)">
          Certificate of Completion
        </text>
        
        <!-- Divider -->
        <line x1="150" y1="205" x2="650" y2="205" stroke="url(#green)" stroke-width="1" opacity="0.5"/>
        
        <!-- This certifies -->
        <text x="400" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
          This is to certify that
        </text>
        
        <!-- Recipient Address -->
        <text x="400" y="290" text-anchor="middle" font-family="monospace" font-size="18" fill="#10b981" font-weight="bold">
          ${shortAddress}
        </text>
        
        <!-- Has completed -->
        <text x="400" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
          has successfully completed the course
        </text>
        
        <!-- Course Name -->
        <text x="400" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#ffffff" font-weight="bold">
          ${courseName}
        </text>
        
        <!-- Score Badge -->
        <rect x="340" y="405" width="120" height="40" rx="20" fill="#0a0a0a" stroke="url(#green)" stroke-width="1"/>
        <text x="400" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#10b981" font-weight="bold">
          ${score}% Score
        </text>
        
        <!-- Date -->
        <text x="400" y="485" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
          Awarded on ${dateStr}
        </text>
        
        <!-- Verification Badge -->
        <rect x="140" y="505" width="520" height="32" rx="16" fill="#0d1f17" stroke="#10b981" stroke-width="1" opacity="0.8"/>
        <circle cx="165" cy="521" r="8" fill="#10b981"/>
        <text x="400" y="526" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#10b981">
          Quiz data has been embedded on Kaspa layer one for future verification
        </text>
        
        <!-- Footer -->
        <text x="400" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#4b5563">
          KRC-721 NFT Certificate | KUPROOF Collection
        </text>
      </svg>
    `.trim();
  }

  /**
   * Generate static DAG nodes and connections for certificate background
   * Creates a visually appealing floating DAG structure
   */
  private generateStaticDAGNodes(): string {
    // Predefined node positions for consistent, aesthetic layout
    const nodes = [
      // Top-left cluster
      { x: 60, y: 80, size: 4 },
      { x: 120, y: 50, size: 3 },
      { x: 90, y: 130, size: 5 },
      { x: 150, y: 100, size: 3 },
      // Top-right cluster
      { x: 680, y: 60, size: 4 },
      { x: 740, y: 90, size: 3 },
      { x: 700, y: 140, size: 5 },
      { x: 650, y: 110, size: 3 },
      // Bottom-left cluster
      { x: 70, y: 480, size: 4 },
      { x: 130, y: 520, size: 3 },
      { x: 100, y: 550, size: 5 },
      { x: 160, y: 490, size: 3 },
      // Bottom-right cluster
      { x: 690, y: 470, size: 4 },
      { x: 730, y: 510, size: 3 },
      { x: 710, y: 560, size: 5 },
      { x: 650, y: 530, size: 3 },
      // Mid-left scattered
      { x: 50, y: 250, size: 3 },
      { x: 80, y: 320, size: 4 },
      { x: 45, y: 380, size: 3 },
      // Mid-right scattered
      { x: 750, y: 260, size: 3 },
      { x: 720, y: 330, size: 4 },
      { x: 760, y: 400, size: 3 },
    ];

    // Connections between nodes (pairs of indices)
    const connections = [
      [0, 1], [1, 3], [0, 2], [2, 3],
      [4, 5], [5, 7], [4, 6], [6, 7],
      [8, 9], [9, 11], [8, 10], [10, 11],
      [12, 13], [13, 15], [12, 14], [14, 15],
      [16, 17], [17, 18],
      [19, 20], [20, 21],
      [2, 16], [6, 19], [10, 18], [14, 21],
    ];

    let svg = '';

    // Draw connections (lines)
    connections.forEach(([from, to]) => {
      const n1 = nodes[from];
      const n2 = nodes[to];
      svg += `<line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" stroke="#10b981" stroke-width="1" opacity="0.3"/>`;
    });

    // Draw nodes (circles with glow)
    nodes.forEach((node) => {
      // Outer glow
      svg += `<circle cx="${node.x}" cy="${node.y}" r="${node.size * 3}" fill="#10b981" opacity="0.1"/>`;
      // Main node
      svg += `<circle cx="${node.x}" cy="${node.y}" r="${node.size}" fill="#10b981" opacity="0.6"/>`;
      // Inner bright spot
      svg += `<circle cx="${node.x}" cy="${node.y}" r="${node.size * 0.4}" fill="#ffffff" opacity="0.4"/>`;
    });

    return svg;
  }

  /**
   * Generate certificate image as base64 data URI
   * Returns a simple SVG certificate image
   */
  generateCertificateImage(
    recipientAddress: string,
    courseName: string,
    score: number,
    completionDate: Date
  ): string {
    const svg = this.generateCertificateImageSvg(recipientAddress, courseName, score, completionDate);
    const base64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Get collection info
   */
  async getCollectionInfo() {
    const nextTokenId = await this.getNextTokenId();
    return {
      ticker: this.config.ticker,
      name: this.config.collectionName,
      description: this.config.collectionDescription,
      maxSupply: this.config.maxSupply,
      nextTokenId,
      isDeployed: this.collectionDeployed,
      network: this.config.network,
      address: this.address,
      isLive: this.isLive(),
    };
  }

  /**
   * Verify deployment status against the KRC-721 indexer
   * Returns true if the collection exists in the indexer
   */
  async verifyDeploymentWithIndexer(): Promise<{ 
    localStatus: boolean; 
    indexerStatus: boolean; 
    mismatch: boolean;
    error?: string;
  }> {
    const localStatus = this.collectionDeployed;
    const result = await verifyCollectionIndexed(this.config.ticker);
    
    return {
      localStatus,
      indexerStatus: result.indexed,
      mismatch: localStatus !== result.indexed,
      error: result.error,
    };
  }

  /**
   * Reset deployment status to undeployed
   * Use this when the database says deployed but indexer shows otherwise
   */
  async resetDeploymentStatus(): Promise<void> {
    console.log(`[KRC721] Resetting deployment status for ${this.config.ticker}...`);
    this.collectionDeployed = false;
    await this.saveDeploymentStatus(false);
    console.log(`[KRC721] Deployment status reset to FALSE`);
  }
}

// Singleton instance
let krc721ServiceInstance: KRC721Service | null = null;

export async function getKRC721Service(): Promise<KRC721Service> {
  if (!krc721ServiceInstance) {
    krc721ServiceInstance = new KRC721Service();
    await krc721ServiceInstance.initialize();
  }
  return krc721ServiceInstance;
}

// Export verification functions for admin routes
export { verifyCollectionIndexed, verifyTokenIndexed };

export { KRC721Service, KRC721Config, DeployResult, MintResult, CertificateMetadata };
