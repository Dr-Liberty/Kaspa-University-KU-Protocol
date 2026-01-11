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
// - Non-whitelisted: royaltyFee (20,000 KAS) + PoW fee (10 KAS) = ~20,010 KAS total
// - Whitelisted: discountFee (10 KAS) + PoW fee (10 KAS) = ~20 KAS total
//
// PoW fee (10 KAS) is burned to the network (required by indexer for minting)
// discountFee is the royalty amount whitelisted users pay INSTEAD of royaltyFee
const DISCOUNT_FEE_KAS = 10; // 10 KAS discount fee for whitelisted users
const DISCOUNT_FEE_SOMPI = BigInt(DISCOUNT_FEE_KAS * 100_000_000); // 10 KAS = 1,000,000,000 sompi

// Dynamic ticker based on current network mode
// MUST match the ticker used in krc721.ts deploy inscription
function getCollectionTicker(): string {
  const isTestnet = process.env.KRC721_TESTNET === "true";
  if (isTestnet) {
    return process.env.KRC721_TESTNET_TICKER || "KUDIPLOMA";
  }
  return process.env.KRC721_TICKER || "KUDIPLOMA";
}

interface DiscountResult {
  success: boolean;
  commitTxHash?: string;
  revealTxHash?: string;
  error?: string;
}

// KRC-721 Discount inscription format per official spec
// discountFee sets the amount whitelisted users pay instead of royaltyFee
// Reference: https://mainnet.krc721.stream/docs (KRC-721 Specifications)
interface DiscountInscription {
  p: "krc-721";
  op: "discount";
  tick: string;
  to: string; // recipient address to whitelist
  discountFee: string; // amount in SOMPI that whitelisted user pays - MUST be "discountFee" per KRC-721 spec
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
   * Build the discount inscription JSON per KRC-721 spec
   * Reference: https://kaspa-krc721d.kaspa.com/docs#krc-721-specifications
   */
  buildDiscountInscription(walletAddress: string): DiscountInscription {
    return {
      p: "krc-721",
      op: "discount",
      tick: getCollectionTicker(),
      to: walletAddress,
      discountFee: DISCOUNT_FEE_SOMPI.toString(), // 10 KAS in sompi - MUST be "discountFee" per KRC-721 spec
    };
  }

  /**
   * Check if a wallet is already whitelisted via the indexer API
   * Uses the official KSPR KRC-721 indexer /royalties endpoint
   */
  async isWalletWhitelisted(walletAddress: string): Promise<boolean> {
    try {
      const isTestnet = process.env.KRC721_TESTNET === "true";
      const network = isTestnet ? "testnet-10" : "mainnet";
      // Use official KSPR KRC-721 indexer (same as krc721.ts)
      const indexerUrl = isTestnet 
        ? "https://testnet-10.krc721.stream" 
        : "https://mainnet.krc721.stream";
      
      const apiUrl = `${indexerUrl}/api/v1/krc721/${network}/royalties/${walletAddress}/${getCollectionTicker()}`;
      console.log(`[DiscountService] Checking whitelist status at: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[DiscountService] Indexer response:`, JSON.stringify(data));
        
        // Handle null/undefined result (not whitelisted)
        if (data && data.message === "success") {
          if (data.result === null || data.result === undefined || data.result === "") {
            console.log(`[DiscountService] No discount registered for wallet`);
            return false;
          }
          try {
            const discountFee = BigInt(data.result);
            const isWhitelisted = discountFee <= DISCOUNT_FEE_SOMPI;
            console.log(`[DiscountService] Discount fee: ${discountFee}, threshold: ${DISCOUNT_FEE_SOMPI}, whitelisted: ${isWhitelisted}`);
            return isWhitelisted;
          } catch (e) {
            console.log(`[DiscountService] Failed to parse discount fee: ${data.result}`);
            return false;
          }
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
      const msg = `Network mismatch - Treasury: ${isTreasuryTestnet ? 'testnet' : 'mainnet'}, Target: ${isTestnetAddress ? 'testnet' : 'mainnet'}`;
      console.log(`[DiscountService] ${msg}`);
      return {
        success: false,
        error: `Cannot whitelist: ${msg}. Please ensure wallet network matches treasury network.`,
      };
    }

    if (!this.isLive()) {
      console.log(`[DiscountService] Not live - Treasury: ${this.treasuryAddress || 'none'}, RPC: ${!!this.rpcClient}, PrivateKey: ${!!this.privateKey}`);
      return {
        success: false,
        error: "Whitelist service not available. Treasury credentials or RPC connection missing. Please try again later.",
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
        
        // Verify the discount was indexed
        const verified = await this.verifyDiscountApplied(walletAddress, 5);
        if (!verified) {
          console.log(`[DiscountService] Warning: Discount not yet visible in indexer for ${walletAddress}`);
        }
      }
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || "Unknown error during discount operation";
      console.error(`[DiscountService] Failed to apply discount: ${errorMsg}`);
      console.error(`[DiscountService] Full error:`, error);
      return { success: false, error: errorMsg };
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
    // WASM NetworkId enum for addressFromScriptPublicKey
    const wasmNetworkId = isTestnet 
      ? this.kaspaModule.NetworkId.testnet10 
      : this.kaspaModule.NetworkId.mainnet;
    // String networkId for createTransactions (Generator requires string format)
    const networkIdString = isTestnet ? "testnet-10" : "mainnet";
    
    const p2shAddress = addressFromScriptPublicKey(
      script.createPayToScriptHashScript(),
      wasmNetworkId
    )?.toString();

    if (!p2shAddress) {
      throw new Error("Failed to create P2SH address");
    }

    const utxos = await this.getUtxos();
    if (!utxos || utxos.length === 0) {
      // Provide detailed error message with recovery instructions
      const status = await this.getTreasuryStatus();
      if (status.lockedP2shUtxos > 0) {
        const lockedKas = Number(status.lockedBalanceSompi) / 100_000_000;
        throw new Error(
          `Treasury has ${status.lockedP2shUtxos} locked UTXO(s) (~${lockedKas.toFixed(2)} KAS) from previous inscriptions. ` +
          `Please send at least 1 KAS to ${this.treasuryAddress} to enable whitelisting.`
        );
      }
      throw new Error("No UTXOs available for transaction - treasury needs funding");
    }

    // Log first UTXO structure for debugging
    if (utxos[0]) {
      console.log(`[DiscountService] UTXO structure sample:`, JSON.stringify(utxos[0], null, 2).substring(0, 500));
    }

    const entries = utxos.map((utxo: any) => {
      // Handle different UTXO structures from RPC
      const amount = utxo.utxoEntry?.amount ?? utxo.amount ?? utxo.satoshis ?? BigInt(0);
      // WASM SDK requires scriptPublicKey as object: { script: hexString, version: 0 }
      // RPC returns either {version, scriptPublicKey} object or flat hex string
      const spkRaw = utxo.utxoEntry?.scriptPublicKey ?? utxo.scriptPublicKey ?? "";
      let scriptPublicKey: { script: string; version: number };
      if (typeof spkRaw === 'object' && spkRaw.scriptPublicKey) {
        // RPC object format: { version, scriptPublicKey }
        scriptPublicKey = { script: spkRaw.scriptPublicKey, version: spkRaw.version ?? 0 };
      } else if (typeof spkRaw === 'object' && spkRaw.script) {
        // Already correct format
        scriptPublicKey = { script: spkRaw.script, version: spkRaw.version ?? 0 };
      } else {
        // Flat hex string - wrap in object with version 0
        scriptPublicKey = { script: spkRaw, version: 0 };
      }
      // blockDaaScore must be BigInt for WASM SDK
      const blockDaaScoreRaw = utxo.utxoEntry?.blockDaaScore ?? utxo.blockDaaScore ?? "0";
      const blockDaaScore = BigInt(blockDaaScoreRaw);
      const isCoinbase = utxo.utxoEntry?.isCoinbase ?? utxo.isCoinbase ?? false;
      const transactionId = utxo.outpoint?.transactionId ?? utxo.transactionId ?? "";
      const index = utxo.outpoint?.index ?? utxo.index ?? 0;
      
      return {
        address: this.treasuryAddress,
        outpoint: {
          transactionId,
          index,
        },
        utxoEntry: {
          amount: BigInt(amount),
          scriptPublicKey,
          blockDaaScore,
          isCoinbase,
        },
      };
    }).filter((e: any) => e.utxoEntry.amount > BigInt(0));

    const commitAmount = kaspaToSompi("0.3");
    const { transactions: commitTxs } = await createTransactions({
      entries,
      outputs: [{ address: p2shAddress, amount: commitAmount }],
      changeAddress: this.treasuryAddress,
      priorityFee: kaspaToSompi("0.001"),
      networkId: networkIdString,
    });

    if (!commitTxs || commitTxs.length === 0) {
      throw new Error("Failed to create commit transaction");
    }

    // Track UTXOs used in commit to exclude from reveal
    const commitUsedUtxoIds = new Set<string>();
    const commitTx = commitTxs[0];
    if (commitTx.transaction && commitTx.transaction.inputs) {
      for (const input of commitTx.transaction.inputs) {
        if (input.previousOutpoint) {
          const id = `${input.previousOutpoint.transactionId}-${input.previousOutpoint.index}`;
          commitUsedUtxoIds.add(id);
        }
      }
    }
    console.log(`[DiscountService] Commit uses ${commitUsedUtxoIds.size} UTXOs`);
    
    // sign() modifies transaction in place and may not return a value
    // Use commitTx directly after signing
    commitTx.sign([this.privateKey]);
    const commitResult = await this.submitTransaction(commitTx);
    
    if (!commitResult.success) {
      throw new Error(`Commit failed: ${commitResult.error}`);
    }

    console.log(`[DiscountService] Commit tx: ${commitResult.txHash}`);
    
    // Wait longer for commit to be confirmed before fetching reveal UTXOs
    console.log(`[DiscountService] Waiting for commit confirmation...`);
    await this.waitForConfirmation(3000);

    const revealUtxos = await this.getUtxosForAddress(p2shAddress);
    if (!revealUtxos || revealUtxos.length === 0) {
      throw new Error("P2SH UTXO not found for reveal");
    }

    const revealEntries = revealUtxos.map((utxo: any) => {
      const amount = utxo.utxoEntry?.amount ?? utxo.amount ?? BigInt(0);
      // blockDaaScore must be BigInt for WASM SDK
      const blockDaaScoreRaw = utxo.utxoEntry?.blockDaaScore ?? utxo.blockDaaScore ?? "0";
      const blockDaaScore = BigInt(blockDaaScoreRaw);
      const isCoinbase = utxo.utxoEntry?.isCoinbase ?? utxo.isCoinbase ?? false;
      const transactionId = utxo.outpoint?.transactionId ?? utxo.transactionId ?? "";
      const index = utxo.outpoint?.index ?? utxo.index ?? 0;
      
      return {
        address: p2shAddress,
        outpoint: { transactionId, index },
        utxoEntry: {
          amount: BigInt(amount),
          // WASM SDK requires scriptPublicKey as object: { script, version }
          scriptPublicKey: { script: script.createPayToScriptHashScript().toString(), version: 0 },
          blockDaaScore,
          isCoinbase,
        },
      };
    });

    // Get fresh UTXOs from treasury, excluding those used in commit
    const freshUtxos = await this.getUtxos();
    const filteredUtxos = freshUtxos.filter((utxo: any) => {
      const transactionId = utxo.outpoint?.transactionId ?? utxo.transactionId ?? "";
      const index = utxo.outpoint?.index ?? utxo.index ?? 0;
      const id = `${transactionId}-${index}`;
      return !commitUsedUtxoIds.has(id);
    });
    console.log(`[DiscountService] Reveal has ${filteredUtxos.length} fresh treasury UTXOs (filtered ${freshUtxos.length - filteredUtxos.length})`);
    
    const treasuryEntries = filteredUtxos.map((utxo: any) => {
      const amount = utxo.utxoEntry?.amount ?? utxo.amount ?? BigInt(0);
      // WASM SDK requires scriptPublicKey as object: { script: hexString, version: 0 }
      const spkRaw = utxo.utxoEntry?.scriptPublicKey ?? utxo.scriptPublicKey ?? "";
      let scriptPublicKey: { script: string; version: number };
      if (typeof spkRaw === 'object' && spkRaw.scriptPublicKey) {
        scriptPublicKey = { script: spkRaw.scriptPublicKey, version: spkRaw.version ?? 0 };
      } else if (typeof spkRaw === 'object' && spkRaw.script) {
        scriptPublicKey = { script: spkRaw.script, version: spkRaw.version ?? 0 };
      } else {
        scriptPublicKey = { script: spkRaw, version: 0 };
      }
      // blockDaaScore must be BigInt for WASM SDK
      const blockDaaScoreRaw = utxo.utxoEntry?.blockDaaScore ?? utxo.blockDaaScore ?? "0";
      const blockDaaScore = BigInt(blockDaaScoreRaw);
      const isCoinbase = utxo.utxoEntry?.isCoinbase ?? utxo.isCoinbase ?? false;
      const transactionId = utxo.outpoint?.transactionId ?? utxo.transactionId ?? "";
      const index = utxo.outpoint?.index ?? utxo.index ?? 0;
      
      return {
        address: this.treasuryAddress,
        outpoint: { transactionId, index },
        utxoEntry: {
          amount: BigInt(amount),
          scriptPublicKey,
          blockDaaScore,
          isCoinbase,
        },
      };
    }).filter((e: any) => e.utxoEntry.amount > BigInt(0));

    const { transactions: revealTxs } = await createTransactions({
      priorityEntries: revealEntries, // P2SH UTXO as priority
      entries: treasuryEntries, // Treasury UTXOs for fees
      outputs: [],
      changeAddress: this.treasuryAddress,
      priorityFee: kaspaToSompi("0.01"), // Small fee for discount op
      networkId: networkIdString,
    });

    if (!revealTxs || revealTxs.length === 0) {
      throw new Error("Failed to create reveal transaction");
    }

    // Sign reveal transaction following KRC-721 commit-reveal pattern
    // Per mint.ts: sign with checkSigs=false, then fill P2SH input with script signature
    const revealTx = revealTxs[0];
    revealTx.sign([this.privateKey], false); // Sign without checkSigs
    
    // Find the P2SH input (has empty signatureScript) and fill with script signature
    const ourOutput = revealTx.transaction.inputs.findIndex(
      (input: any) => input.signatureScript === ''
    );
    
    if (ourOutput !== -1) {
      const signature = await revealTx.createInputSignature(ourOutput, this.privateKey);
      revealTx.fillInput(ourOutput, script.encodePayToScriptHashSignatureScript(signature));
      console.log(`[DiscountService] Filled P2SH input ${ourOutput} with script signature`);
    }
    
    const revealResult = await this.submitTransaction(revealTx);
    
    if (!revealResult.success) {
      throw new Error(`Reveal failed: ${revealResult.error}`);
    }

    // Wait a bit and verify with indexer
    console.log(`[DiscountService] Waiting for indexer to process discount...`);
    await this.waitForConfirmation(3000);

    return {
      success: true,
      commitTxHash: commitResult.txHash,
      revealTxHash: revealResult.txHash,
    };
  }

  private async getUtxos(): Promise<any[]> {
    if (!this.treasuryAddress || !this.rpcClient) return [];
    const allUtxos = await this.getUtxosForAddress(this.treasuryAddress);
    
    // Filter to only include P2PK UTXOs that the treasury can sign
    // P2SH UTXOs (from commit transactions) cannot be signed by the treasury key
    // P2PK scripts end with 'ac' (OP_CHECKSIG) and are 66 hex chars (33 bytes)
    // P2SH scripts end with '87' (OP_EQUAL) and have different lengths
    const signableUtxos = allUtxos.filter((utxo: any) => {
      const spkRaw = utxo.utxoEntry?.scriptPublicKey ?? utxo.scriptPublicKey ?? "";
      const scriptHex = typeof spkRaw === 'object' && spkRaw.scriptPublicKey 
        ? spkRaw.scriptPublicKey 
        : spkRaw;
      
      // Kaspa P2PK (pay-to-public-key) scripts use 32-byte x-only Schnorr pubkeys:
      // - 68 hex chars (34 bytes): 0x20 (length prefix 32) + 32-byte pubkey + OP_CHECKSIG (0xac)
      // - Start with '20' (0x20 = 32, the pubkey length for x-only Schnorr keys)
      // - End with 'ac' (OP_CHECKSIG opcode = 0xAC)
      // P2SH scripts end with '87' (OP_EQUAL) - these are commit UTXOs
      const isP2PK = typeof scriptHex === 'string' && 
                     scriptHex.length === 68 && 
                     scriptHex.startsWith('20') &&
                     scriptHex.endsWith('ac');
      
      if (!isP2PK) {
        console.log(`[DiscountService] Filtering out non-P2PK UTXO: script=${scriptHex?.substring(0, 20)}...`);
      }
      
      return isP2PK;
    });
    
    console.log(`[DiscountService] Filtered ${allUtxos.length} UTXOs -> ${signableUtxos.length} signable P2PK UTXOs`);
    return signableUtxos;
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
   * Poll the indexer to verify discount was applied
   */
  async verifyDiscountApplied(walletAddress: string, maxAttempts: number = 10): Promise<boolean> {
    const pollIntervalMs = 3000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[DiscountService] Verifying discount (attempt ${attempt}/${maxAttempts})...`);
      
      const isWhitelisted = await this.isWalletWhitelisted(walletAddress);
      if (isWhitelisted) {
        console.log(`[DiscountService] Discount verified for ${walletAddress}`);
        return true;
      }
      
      if (attempt < maxAttempts) {
        await this.waitForConfirmation(pollIntervalMs);
      }
    }
    
    console.log(`[DiscountService] Discount not yet indexed for ${walletAddress} after ${maxAttempts} attempts`);
    return false;
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

  /**
   * Get treasury status including UTXO breakdown
   */
  async getTreasuryStatus(): Promise<{
    address: string | null;
    isLive: boolean;
    totalUtxos: number;
    spendableUtxos: number;
    lockedP2shUtxos: number;
    totalBalanceSompi: bigint;
    spendableBalanceSompi: bigint;
    lockedBalanceSompi: bigint;
    needsFunding: boolean;
    message: string;
  }> {
    await this.initialize();

    if (!this.treasuryAddress || !this.rpcClient) {
      return {
        address: null,
        isLive: false,
        totalUtxos: 0,
        spendableUtxos: 0,
        lockedP2shUtxos: 0,
        totalBalanceSompi: BigInt(0),
        spendableBalanceSompi: BigInt(0),
        lockedBalanceSompi: BigInt(0),
        needsFunding: true,
        message: "Treasury not configured - missing credentials or RPC connection",
      };
    }

    const allUtxos = await this.getUtxosForAddress(this.treasuryAddress);
    
    let spendableCount = 0;
    let lockedCount = 0;
    let spendableBalance = BigInt(0);
    let lockedBalance = BigInt(0);

    for (const utxo of allUtxos) {
      const amount = BigInt(utxo.utxoEntry?.amount ?? utxo.amount ?? 0);
      const spkRaw = utxo.utxoEntry?.scriptPublicKey ?? utxo.scriptPublicKey ?? "";
      const scriptHex = typeof spkRaw === 'object' && spkRaw.scriptPublicKey 
        ? spkRaw.scriptPublicKey 
        : spkRaw;
      
      // Kaspa P2PK (pay-to-public-key) scripts use 32-byte x-only Schnorr pubkeys:
      // - 68 hex chars (34 bytes): 0x20 (length prefix 32) + 32-byte pubkey + OP_CHECKSIG (0xac)
      // - Start with '20' (0x20 = 32, the pubkey length for x-only Schnorr keys)
      // - End with 'ac' (OP_CHECKSIG opcode = 0xAC)
      const isP2PK = typeof scriptHex === 'string' && 
                     scriptHex.length === 68 && 
                     scriptHex.startsWith('20') &&
                     scriptHex.endsWith('ac');
      
      if (isP2PK) {
        spendableCount++;
        spendableBalance += amount;
      } else {
        lockedCount++;
        lockedBalance += amount;
      }
    }

    const needsFunding = spendableCount === 0;
    let message = "";
    
    if (needsFunding) {
      const lockedKas = Number(lockedBalance) / 100_000_000;
      message = `Treasury has ${lockedCount} locked P2SH UTXO(s) containing ~${lockedKas.toFixed(2)} KAS from previous inscriptions. ` +
                `To enable whitelisting, please send at least 1 KAS to: ${this.treasuryAddress}`;
    } else {
      const spendableKas = Number(spendableBalance) / 100_000_000;
      message = `Treasury ready with ${spendableCount} spendable UTXO(s) (~${spendableKas.toFixed(2)} KAS)`;
    }

    return {
      address: this.treasuryAddress,
      isLive: this.isLive(),
      totalUtxos: allUtxos.length,
      spendableUtxos: spendableCount,
      lockedP2shUtxos: lockedCount,
      totalBalanceSompi: spendableBalance + lockedBalance,
      spendableBalanceSompi: spendableBalance,
      lockedBalanceSompi: lockedBalance,
      needsFunding,
      message,
    };
  }
}

export const discountService = new DiscountService();

export function getDiscountService(): DiscountService {
  return discountService;
}
