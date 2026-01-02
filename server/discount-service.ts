/**
 * KRC-721 Discount Service for Kaspa University
 * 
 * Implements the "discount" operation to whitelist wallets for cheaper minting.
 * Uses commit-reveal pattern like other KRC-721 operations.
 * 
 * Flow:
 * 1. User completes a course quiz
 * 2. Backend sends discount operation (treasury signs)
 * 3. User is now whitelisted for the entire collection at discounted price
 * 
 * Reference: https://kaspa-krc721d.kaspa.com/docs
 */

import { storage } from "./storage";

// Discount fee for whitelisted users (course completers)
// Fee structure:
// - Non-whitelisted: pay royaltyFee (20,000 KAS) + PoW fee (10 KAS) = 20,010 KAS total
// - Whitelisted: pay discountFee (0 KAS) + PoW fee (10 KAS) = 10 KAS total
//
// The discountFee is the royalty amount whitelisted users pay INSTEAD of royaltyFee
// It's NOT the total cost - the 10 KAS PoW fee is separate and goes to miners
const DISCOUNT_FEE_SOMPI = BigInt(0); // 0 KAS - whitelisted users pay only PoW fee, no royalty

// Dynamic ticker based on current network mode
// MUST match the ticker used in krc721.ts deploy inscription
function getCollectionTicker(): string {
  const isTestnet = process.env.KRC721_TESTNET === "true";
  if (isTestnet) {
    // Must match the current testnet ticker in krc721.ts
    return process.env.KRC721_TESTNET_TICKER || "KUTEST5";
  }
  return process.env.KRC721_TICKER || "KUPROOF";
}

interface DiscountResult {
  success: boolean;
  commitTxHash?: string;
  revealTxHash?: string;
  error?: string;
}

interface DiscountInscription {
  p: string;
  op: string;
  tick: string;
  to: string;
  discountFee: string;
}

class DiscountService {
  private initialized = false;
  private kaspaModule: any = null;
  private rpcClient: any = null;
  private wasmRpcClient: any = null;
  private privateKey: any = null;
  private publicKey: any = null;
  private treasuryAddress: string | null = null;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Note: Same key generates different address prefixes per network (kaspa: vs kaspatest:)
      const mnemonic = process.env.KASPA_TREASURY_MNEMONIC;
      const privateKeyHex = process.env.KASPA_TREASURY_PRIVATEKEY || process.env.KASPA_TREASURY_PRIVATE_KEY;
      
      if (!mnemonic && !privateKeyHex) {
        console.log("[DiscountService] No treasury credentials - running in demo mode");
        this.initialized = true;
        return false;
      }

      await this.loadKaspaModule();
      await this.deriveKeys(mnemonic || privateKeyHex!);
      await this.connectRpc();

      this.initialized = true;
      console.log(`[DiscountService] Initialized for collection ${getCollectionTicker()}`);
      console.log(`[DiscountService] Treasury: ${this.treasuryAddress}`);
      
      return this.isLive();
    } catch (error: any) {
      console.error("[DiscountService] Failed to initialize:", error.message);
      this.initialized = true;
      return false;
    }
  }

  private async loadKaspaModule(): Promise<void> {
    const path = await import("path");
    const fs = await import("fs");
    
    const devWasmPath = path.join(process.cwd(), "server/wasm/kaspa.js");
    const prodWasmPath = path.join(process.cwd(), "dist/wasm/kaspa.js");
    
    let wasmPath: string | null = null;
    if (fs.existsSync(prodWasmPath)) {
      wasmPath = prodWasmPath;
    } else if (fs.existsSync(devWasmPath)) {
      wasmPath = devWasmPath;
    }
    
    if (!wasmPath) {
      throw new Error("Kaspa WASM module not found");
    }
    
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    this.kaspaModule = require(wasmPath);
    
    if (typeof this.kaspaModule.initConsolePanicHook === 'function') {
      this.kaspaModule.initConsolePanicHook();
    }
  }

  private async deriveKeys(input: string): Promise<void> {
    const { PrivateKey, PublicKey } = this.kaspaModule;
    const isRawPrivateKey = /^[0-9a-fA-F]{64}$/.test(input.trim());
    let privateKeyHex: string;
    
    if (isRawPrivateKey) {
      privateKeyHex = input.trim();
    } else {
      const bip39 = await import("bip39");
      const HDKey = (await import("hdkey")).default;
      
      const seed = await bip39.mnemonicToSeed(input.trim());
      const hdkey = HDKey.fromMasterSeed(seed);
      const derivedKey = hdkey.derive("m/44'/111111'/0'/0/0");
      
      if (!derivedKey.privateKey) {
        throw new Error("Failed to derive private key");
      }
      
      privateKeyHex = derivedKey.privateKey.toString("hex");
    }

    const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
    const secp256k1Module = await import("secp256k1");
    const secp = secp256k1Module.default || secp256k1Module;
    const pubKeyBytes = secp.publicKeyCreate(privateKeyBuffer, true);
    const pubKeyHex = Buffer.from(pubKeyBytes).toString("hex");
    
    this.privateKey = new PrivateKey(privateKeyHex);
    this.publicKey = new PublicKey(pubKeyHex);
    
    // Use NetworkId enum - string names don't work with WASM toAddress()
    const isTestnet = process.env.KRC721_TESTNET === "true";
    const networkId = isTestnet 
      ? this.kaspaModule.NetworkId.testnet10 
      : this.kaspaModule.NetworkId.mainnet;
    
    let address;
    if (typeof this.publicKey.toAddress === "function") {
      address = this.publicKey.toAddress(networkId);
    } else if (typeof this.publicKey.toAddressECDSA === "function") {
      address = this.publicKey.toAddressECDSA(networkId);
    }
    
    this.treasuryAddress = address?.toString() || null;
    console.log(`[DiscountService] Derived treasury for ${isTestnet ? 'testnet' : 'mainnet'}: ${this.treasuryAddress}`);
  }

  private async connectRpc(): Promise<void> {
    try {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      const { ClientWrapper } = require("kaspa-rpc-client");
      
      const isTestnet = process.env.KRC721_TESTNET === "true";
      const hosts = isTestnet 
        ? ["seeder1-testnet.kaspad.net:16210"] 
        : ["seeder2.kaspad.net:16110"];
      
      const wrapper = new ClientWrapper({
        hosts,
        verbose: false,
      });
      
      await wrapper.initialize();
      this.rpcClient = await wrapper.getClient();
      
      // Helper to add timeout to promises
      const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
          )
        ]);
      };

      const { RpcClient: WasmRpcClient, Resolver } = this.kaspaModule;
      const network = isTestnet ? "testnet-10" : "mainnet";
      
      // Try Resolver first, then fallback to direct URL for testnet
      let connected = false;
      
      try {
        console.log("[DiscountService] Trying WASM RPC via Resolver...");
        const resolver = new Resolver();
        this.wasmRpcClient = new WasmRpcClient({
          resolver,
          networkId: network,
        });
        await withTimeout(this.wasmRpcClient.connect(), 15000, "Resolver connect");
        connected = true;
        console.log("[DiscountService] WASM RPC connected via Resolver");
      } catch (resolverError: any) {
        console.log(`[DiscountService] Resolver failed: ${resolverError.message}, trying direct URL...`);
      }
      
      // Fallback to direct wRPC URL for testnet-10
      if (!connected && isTestnet) {
        const directUrl = "wss://wrpc.tn10.kaspa.ws:443";
        console.log(`[DiscountService] Falling back to direct wRPC: ${directUrl}`);
        this.wasmRpcClient = new WasmRpcClient({
          url: directUrl,
          networkId: "testnet-10",
        });
        await withTimeout(this.wasmRpcClient.connect(), 15000, "Direct wRPC connect");
        connected = true;
        console.log("[DiscountService] WASM RPC connected via direct URL");
      }
      
      if (connected) {
        console.log("[DiscountService] RPC connected");
      }
    } catch (error: any) {
      console.log(`[DiscountService] RPC connection failed: ${error.message}`);
    }
  }

  isLive(): boolean {
    return this.privateKey !== null && this.rpcClient !== null;
  }

  /**
   * Build the discount inscription JSON
   */
  buildDiscountInscription(walletAddress: string): DiscountInscription {
    return {
      p: "krc-721",
      op: "discount",
      tick: getCollectionTicker(),
      to: walletAddress,
      discountFee: DISCOUNT_FEE_SOMPI.toString(),
    };
  }

  /**
   * Check if a wallet is already whitelisted via the indexer API
   */
  async isWalletWhitelisted(walletAddress: string): Promise<boolean> {
    try {
      const isTestnet = process.env.KRC721_TESTNET === "true";
      const network = isTestnet ? "testnet-10" : "mainnet";
      const indexerUrl = isTestnet 
        ? "https://testnet-10.krc721.stream" 
        : "https://mainnet.krc721.stream";
      
      const apiUrl = `${indexerUrl}/api/v1/krc721/${network}/royalties/${walletAddress}/${getCollectionTicker()}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.message === "success" && data.result) {
          const discountFee = BigInt(data.result);
          return discountFee <= DISCOUNT_FEE_SOMPI;
        }
      }
      
      return false;
    } catch (error: any) {
      console.log(`[DiscountService] Whitelist check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Apply discount to a wallet (whitelist them for cheaper minting)
   * Uses commit-reveal pattern
   */
  async applyDiscount(walletAddress: string): Promise<DiscountResult> {
    await this.initialize();

    // Detect network mismatch - can't use mainnet treasury for testnet or vice versa
    const isTestnetMode = process.env.KRC721_TESTNET === "true";
    const isTestnetAddress = walletAddress.startsWith("kaspatest:");
    const isTreasuryTestnet = this.treasuryAddress?.startsWith("kaspatest:") || false;
    
    if (isTestnetAddress !== isTreasuryTestnet) {
      console.log(`[DiscountService] Network mismatch - Treasury: ${isTreasuryTestnet ? 'testnet' : 'mainnet'}, Target: ${isTestnetAddress ? 'testnet' : 'mainnet'}`);
      console.log(`[DiscountService] Demo mode - simulating discount for ${walletAddress}`);
      return {
        success: true,
        commitTxHash: `demo-commit-${Date.now().toString(16)}`,
        revealTxHash: `demo-reveal-${Date.now().toString(16)}`,
      };
    }

    if (!this.isLive()) {
      console.log(`[DiscountService] Demo mode - simulating discount for ${walletAddress}`);
      return {
        success: true,
        commitTxHash: `demo-commit-${Date.now().toString(16)}`,
        revealTxHash: `demo-reveal-${Date.now().toString(16)}`,
      };
    }

    try {
      const alreadyWhitelisted = await this.isWalletWhitelisted(walletAddress);
      if (alreadyWhitelisted) {
        console.log(`[DiscountService] Wallet ${walletAddress} already whitelisted`);
        return { success: true };
      }

      console.log(`[DiscountService] Applying discount for ${walletAddress}...`);
      
      const inscription = this.buildDiscountInscription(walletAddress);
      const inscriptionJson = JSON.stringify(inscription);
      
      const result = await this.executeCommitReveal(inscriptionJson);
      
      if (result.success) {
        console.log(`[DiscountService] Discount applied for ${walletAddress}`);
        console.log(`[DiscountService] Commit: ${result.commitTxHash}`);
        console.log(`[DiscountService] Reveal: ${result.revealTxHash}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[DiscountService] Failed to apply discount: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute commit-reveal transaction pattern for discount operation
   */
  private async executeCommitReveal(inscriptionJson: string): Promise<DiscountResult> {
    const {
      ScriptBuilder,
      Opcodes,
      addressFromScriptPublicKey,
      createTransactions,
      kaspaToSompi,
    } = this.kaspaModule;

    // Build inscription script following KRC-721 spec
    // Format: pubkey + OP_CHECKSIG + OP_FALSE + OP_IF + "kspr" + contentType(0) + JSON + OP_ENDIF
    const script = new ScriptBuilder()
      .addData(this.publicKey.toXOnlyPublicKey().toString())
      .addOp(Opcodes.OpCheckSig)
      .addOp(Opcodes.OpFalse)
      .addOp(Opcodes.OpIf)
      .addData(Buffer.from("kspr"))
      .addI64(BigInt(0)) // Content type: 0 = JSON
      .addData(Buffer.from(inscriptionJson))
      .addOp(Opcodes.OpEndIf);

    const isTestnet = process.env.KRC721_TESTNET === "true";
    const networkId = isTestnet 
      ? this.kaspaModule.NetworkId.testnet10 
      : this.kaspaModule.NetworkId.mainnet;
    
    const p2shAddress = addressFromScriptPublicKey(
      script.createPayToScriptHashScript(),
      networkId
    )?.toString();

    if (!p2shAddress) {
      throw new Error("Failed to create P2SH address");
    }

    const utxos = await this.getUtxos();
    if (!utxos || utxos.length === 0) {
      throw new Error("No UTXOs available for transaction");
    }

    const entries = utxos.map((utxo: any) => ({
      address: this.treasuryAddress,
      outpoint: {
        transactionId: utxo.outpoint.transactionId,
        index: utxo.outpoint.index,
      },
      utxoEntry: {
        amount: utxo.utxoEntry.amount,
        scriptPublicKey: utxo.utxoEntry.scriptPublicKey,
        blockDaaScore: utxo.utxoEntry.blockDaaScore,
        isCoinbase: utxo.utxoEntry.isCoinbase,
      },
    }));

    const commitAmount = kaspaToSompi("0.3");
    const { transactions: commitTxs } = await createTransactions({
      entries,
      outputs: [{ address: p2shAddress, amount: commitAmount }],
      changeAddress: this.treasuryAddress,
      priorityFee: kaspaToSompi("0.001"),
    });

    if (!commitTxs || commitTxs.length === 0) {
      throw new Error("Failed to create commit transaction");
    }

    const signedCommit = commitTxs[0].sign([this.privateKey]);
    const commitResult = await this.submitTransaction(signedCommit);
    
    if (!commitResult.success) {
      throw new Error(`Commit failed: ${commitResult.error}`);
    }

    console.log(`[DiscountService] Commit tx: ${commitResult.txHash}`);
    await this.waitForConfirmation(1000);

    const revealUtxos = await this.getUtxosForAddress(p2shAddress);
    if (!revealUtxos || revealUtxos.length === 0) {
      throw new Error("P2SH UTXO not found for reveal");
    }

    const revealEntries = revealUtxos.map((utxo: any) => ({
      address: p2shAddress,
      outpoint: {
        transactionId: utxo.outpoint.transactionId,
        index: utxo.outpoint.index,
      },
      utxoEntry: {
        amount: utxo.utxoEntry.amount,
        scriptPublicKey: script.createPayToScriptHashScript().toString(),
        blockDaaScore: utxo.utxoEntry.blockDaaScore,
        isCoinbase: utxo.utxoEntry.isCoinbase,
      },
    }));

    const { transactions: revealTxs } = await createTransactions({
      entries: revealEntries,
      outputs: [],
      changeAddress: this.treasuryAddress,
      priorityFee: kaspaToSompi("0.001"),
    });

    if (!revealTxs || revealTxs.length === 0) {
      throw new Error("Failed to create reveal transaction");
    }

    const signedReveal = revealTxs[0].sign([this.privateKey], false);
    
    const revealResult = await this.submitTransaction(signedReveal);
    
    if (!revealResult.success) {
      throw new Error(`Reveal failed: ${revealResult.error}`);
    }

    return {
      success: true,
      commitTxHash: commitResult.txHash,
      revealTxHash: revealResult.txHash,
    };
  }

  private async getUtxos(): Promise<any[]> {
    if (!this.treasuryAddress || !this.rpcClient) return [];
    return this.getUtxosForAddress(this.treasuryAddress);
  }

  private async getUtxosForAddress(address: string): Promise<any[]> {
    try {
      const result = await this.rpcClient.getUtxosByAddresses({ addresses: [address] });
      return result?.entries || [];
    } catch (error: any) {
      console.error(`[DiscountService] Failed to get UTXOs: ${error.message}`);
      return [];
    }
  }

  private async submitTransaction(tx: any): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (this.wasmRpcClient && typeof tx.submit === 'function') {
        const txHash = await tx.submit(this.wasmRpcClient);
        return { success: true, txHash };
      }

      const serialized = tx.serializeToObject ? tx.serializeToObject() : tx;
      const result = await this.rpcClient.submitTransaction({
        transaction: serialized,
        allowOrphan: false,
      });
      
      return { success: true, txHash: result?.transactionId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async waitForConfirmation(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the current ticker being used
   */
  getTicker(): string {
    return getCollectionTicker();
  }

  /**
   * Get the discount fee in SOMPI
   */
  getDiscountFeeSompi(): bigint {
    return DISCOUNT_FEE_SOMPI;
  }
}

export const discountService = new DiscountService();

export function getDiscountService(): DiscountService {
  return discountService;
}
