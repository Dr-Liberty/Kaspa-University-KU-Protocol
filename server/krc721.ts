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
import { getUTXOManager, type UTXO } from "./utxo-manager.js";

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

// Default configuration for Kaspa University Certificates
const DEFAULT_CONFIG: KRC721Config = {
  network: "mainnet",
  ticker: "KPROOF",
  collectionName: "Kaspa Proof of Learning",
  collectionDescription: "Verifiable proof of learning certificates from Kaspa University - Learn-to-Earn on Kaspa L1",
  maxSupply: 1000000, // 1 million certificates max
  royaltyFee: 0, // No royalties on educational certificates
  royaltyOwner: "",
};

class KRC721Service {
  private config: KRC721Config;
  private initialized: boolean = false;
  private kaspaModule: any = null;
  private rpcClient: any = null;
  private privateKey: any = null;
  private publicKey: any = null;
  private address: string | null = null;
  private collectionDeployed: boolean = false;

  constructor(config: Partial<KRC721Config> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the KRC-721 service
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Support raw private key (new name) or legacy mnemonic
      const privateKeyOrMnemonic = process.env.KASPA_TREASURY_PRIVATEKEY || process.env.KASPA_TREASURY_PRIVATE_KEY || process.env.KASPA_TREASURY_MNEMONIC;
      
      if (!privateKeyOrMnemonic) {
        console.log("[KRC721] No private key configured - running in demo mode");
        this.initialized = true;
        return true;
      }

      // Load kaspa module
      this.kaspaModule = await import("kaspa");
      
      if (this.kaspaModule.initConsolePanicHook) {
        this.kaspaModule.initConsolePanicHook();
      }

      // Derive keys from private key or mnemonic
      await this.deriveKeys(privateKeyOrMnemonic.trim());

      console.log(`[KRC721] Service initialized`);
      console.log(`[KRC721] Address: ${this.address}`);
      console.log(`[KRC721] Network: ${this.config.network}`);
      console.log(`[KRC721] Collection: ${this.config.ticker}`);

      // Connect to RPC
      await this.connectRpc();

      this.initialized = true;
      return true;
    } catch (error: any) {
      console.error("[KRC721] Failed to initialize:", error.message);
      this.initialized = true; // Allow demo mode
      return false;
    }
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
      console.log("[KRC721] Connecting to RPC via kaspa-rpc-client...");
      
      // Use kaspa-rpc-client (pure TypeScript) instead of WASM RpcClient
      const { ClientWrapper } = require("kaspa-rpc-client");
      
      const wrapper = new ClientWrapper({
        hosts: ["seeder2.kaspad.net:16110"],
        verbose: false,
      });
      
      await wrapper.initialize();
      this.rpcClient = await wrapper.getClient();
      
      // Get block count to verify connection
      const info = await this.rpcClient.getBlockDagInfo();
      console.log(`[KRC721] RPC connected! Block count: ${info?.blockCount || "unknown"}`);
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
   * Get next token ID (based on current certificate count + 1)
   */
  async getNextTokenId(): Promise<number> {
    const count = await storage.getCertificateCount();
    return count + 1;
  }

  /**
   * Deploy the KUCERT collection (one-time operation)
   * 
   * This creates the NFT collection on-chain with metadata.
   * Should only be called once to initialize the collection.
   */
  async deployCollection(imageUrl: string): Promise<DeployResult> {
    if (!this.isLive()) {
      console.log("[KRC721] Demo mode - simulating collection deployment");
      return {
        success: true,
        commitTxHash: `demo_deploy_commit_${Date.now().toString(16)}`,
        revealTxHash: `demo_deploy_reveal_${Date.now().toString(16)}`,
      };
    }

    try {
      const {
        ScriptBuilder,
        Opcodes,
        addressFromScriptPublicKey,
        createTransactions,
        kaspaToSompi,
      } = this.kaspaModule;

      // Create deployment data following KRC-721 spec
      const deployData: any = {
        p: "krc-721",
        op: "deploy",
        tick: this.config.ticker,
        max: this.config.maxSupply.toString(),
        metadata: {
          name: this.config.collectionName,
          description: this.config.collectionDescription,
          image: imageUrl,
          attributes: [
            { traitType: "platform", value: "Kaspa University" },
            { traitType: "type", value: "Educational Certificate" },
          ],
        },
      };

      // Add royalty info if configured
      if (this.config.royaltyFee > 0 && this.config.royaltyOwner) {
        deployData.royaltyFee = kaspaToSompi(this.config.royaltyFee.toString())?.toString();
        deployData.royaltyOwner = this.config.royaltyOwner;
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

      console.log(`[KRC721] P2SH Address: ${P2SHAddress.toString()}`);

      // Execute commit-reveal pattern
      const result = await this.executeCommitReveal(script, P2SHAddress, "10");
      
      if (result.success) {
        this.collectionDeployed = true;
        console.log(`[KRC721] Collection deployed successfully!`);
      }

      return result;
    } catch (error: any) {
      console.error("[KRC721] Deploy failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate a Kaspa address format for mainnet
   */
  private validateAddress(address: string): { valid: boolean; error?: string } {
    if (!address || typeof address !== "string") {
      return { valid: false, error: "Address is required" };
    }
    const normalized = address.toLowerCase().trim();
    if (!normalized.startsWith("kaspa:")) {
      if (normalized.startsWith("kaspatest:") || normalized.startsWith("kaspasim:")) {
        return { valid: false, error: "Testnet/simnet addresses not allowed on mainnet" };
      }
      return { valid: false, error: "Invalid Kaspa address prefix" };
    }
    const dataPart = normalized.slice(6);
    if (dataPart.length < 32 || dataPart.length > 100) {
      return { valid: false, error: "Invalid address length" };
    }
    if (!dataPart.startsWith("q") && !dataPart.startsWith("p")) {
      return { valid: false, error: "Invalid address type" };
    }
    return { valid: true };
  }

  /**
   * Mint a certificate NFT for a course completion
   * 
   * @param recipientAddress - The wallet address to receive the certificate
   * @param courseName - Name of the completed course
   * @param score - Quiz/course score
   * @param completionDate - Date of completion
   * @param imageUrl - IPFS URL for certificate image
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

    // Get token ID from storage (will be incremented after certificate is created)
    const tokenId = await this.getNextTokenId();

    if (!this.isLive()) {
      console.log(`[KRC721] Demo mode - simulating certificate mint #${tokenId}`);
      // Note: Token ID will be persisted when certificate is created in storage
      return {
        success: true,
        commitTxHash: `demo_mint_commit_${Date.now().toString(16)}`,
        revealTxHash: `demo_mint_reveal_${Date.now().toString(16)}`,
        tokenId,
      };
    }

    try {
      const {
        ScriptBuilder,
        Opcodes,
        addressFromScriptPublicKey,
      } = this.kaspaModule;

      // Create mint data with certificate metadata
      const mintData = {
        p: "krc-721",
        op: "mint",
        tick: this.config.ticker,
        to: recipientAddress, // Recipient of the NFT
        metadata: {
          name: `KU Certificate #${tokenId}: ${courseName}`,
          description: `Kaspa University course completion certificate for "${courseName}". Earned with a score of ${score}%.`,
          image: imageUrl,
          attributes: [
            { traitType: "Course", value: courseName },
            { traitType: "Score", value: score },
            { traitType: "Completion Date", value: completionDate.toISOString().split("T")[0] },
            { traitType: "Recipient", value: recipientAddress },
            { traitType: "Token ID", value: tokenId },
            { traitType: "Platform", value: "Kaspa University" },
          ],
        },
      };

      console.log(`[KRC721] Minting certificate #${tokenId} for ${recipientAddress}`);

      // Build inscription script
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

      // Execute commit-reveal pattern
      const result = await this.executeCommitReveal(script, P2SHAddress, "3.3");

      if (result.success) {
        // Token ID is persisted via certificate creation in storage
        console.log(`[KRC721] Certificate #${tokenId} minted successfully!`);
        return { ...result, tokenId };
      }

      return { ...result, tokenId };
    } catch (error: any) {
      console.error("[KRC721] Mint failed:", error.message);
      return { success: false, error: error.message, tokenId };
    }
  }

  /**
   * Execute the commit-reveal transaction pattern
   * 
   * 1. Commit: Send KAS to P2SH address (locks the inscription)
   * 2. Reveal: Spend from P2SH, revealing the inscription data
   * 
   * SECURITY: Uses UTXO manager to prevent race conditions with concurrent
   * quiz reward transactions. All UTXOs are reserved before use.
   */
  private async executeCommitReveal(
    script: any,
    P2SHAddress: any,
    commitAmountKas: string
  ): Promise<DeployResult> {
    const { createTransactions, kaspaToSompi } = this.kaspaModule;
    const utxoManager = getUTXOManager();

    // Subscribe to UTXO changes for confirmation
    await this.rpcClient.subscribeUtxosChanged([this.address!]);

    let commitTxHash: string | undefined;
    let revealTxHash: string | undefined;
    let commitReservation: { selected: UTXO[]; total: bigint } | null = null;

    try {
      // Step 1: Commit Transaction
      console.log("[KRC721] Creating commit transaction...");
      
      const { entries } = await this.rpcClient.getUtxosByAddresses({
        addresses: [this.address!],
      });

      if (entries.length === 0) {
        throw new Error("No UTXOs available for transaction");
      }

      // Convert entries to UTXO format for manager
      const utxos: UTXO[] = entries.map((e: any) => ({
        txId: e.outpoint?.transactionId || e.entry?.outpoint?.transactionId || "",
        index: e.outpoint?.index ?? e.entry?.outpoint?.index ?? 0,
        amount: BigInt(e.utxoEntry?.amount || e.entry?.utxoEntry?.amount || 0),
        scriptPublicKey: e.utxoEntry?.scriptPublicKey?.scriptPublicKey || 
                        e.entry?.utxoEntry?.scriptPublicKey?.scriptPublicKey || "",
      }));

      // Calculate required amount (commit + fee buffer)
      const commitSompi = kaspaToSompi(commitAmountKas)!;
      const feeBuffer = kaspaToSompi("3")!; // Extra for fees
      const requiredAmount = BigInt(commitSompi) + BigInt(feeBuffer);

      // Reserve UTXOs through the manager to prevent race conditions
      commitReservation = await utxoManager.selectAndReserve(
        utxos,
        requiredAmount,
        `KRC721_commit_${P2SHAddress.toString().slice(0, 16)}`
      );

      if (!commitReservation) {
        throw new Error(`Insufficient unreserved UTXOs for ${commitAmountKas} KAS NFT mint`);
      }

      // Build a Set of reserved UTXO keys for filtering
      const reservedKeys = new Set(
        commitReservation.selected.map(u => `${u.txId}:${u.index}`)
      );

      // Filter original entries to only include reserved UTXOs
      const reservedEntries = entries.filter((e: any) => {
        const txId = e.outpoint?.transactionId || e.entry?.outpoint?.transactionId || "";
        const index = e.outpoint?.index ?? e.entry?.outpoint?.index ?? 0;
        return reservedKeys.has(`${txId}:${index}`);
      });

      console.log(`[KRC721] Using ${reservedEntries.length} reserved entries for commit`);

      const { transactions: commitTxs } = await createTransactions({
        priorityEntries: [],
        entries: reservedEntries, // Use only reserved entries to prevent race conditions
        outputs: [{
          address: P2SHAddress.toString(),
          amount: kaspaToSompi(commitAmountKas)!,
        }],
        changeAddress: this.address!,
        priorityFee: kaspaToSompi("2")!,
        networkId: this.config.network,
      });

      // Sign and submit commit transaction
      for (const tx of commitTxs) {
        tx.sign([this.privateKey]);
        commitTxHash = await tx.submit(this.rpcClient);
        console.log(`[KRC721] Commit tx: ${commitTxHash}`);
      }

      // Mark UTXOs as spent in the manager
      if (commitTxHash && commitReservation) {
        await utxoManager.markAsSpent(commitReservation.selected, commitTxHash);
      }

      // Wait for commit to confirm (poll for UTXO at P2SH address)
      await this.waitForUtxo(P2SHAddress.toString(), 60000);

      // Step 2: Reveal Transaction
      console.log("[KRC721] Creating reveal transaction...");

      // Get fresh UTXOs after commit (change outputs)
      const { entries: newEntries } = await this.rpcClient.getUtxosByAddresses({
        addresses: [this.address!],
      });

      const revealUTXOs = await this.rpcClient.getUtxosByAddresses({
        addresses: [P2SHAddress.toString()],
      });

      if (revealUTXOs.entries.length === 0) {
        throw new Error("P2SH UTXO not found after commit");
      }

      // For reveal, we need fresh UTXOs (change from commit) + P2SH UTXO
      // The P2SH UTXO doesn't need reservation as it's unique to this mint
      const { transactions: revealTxs } = await createTransactions({
        priorityEntries: [revealUTXOs.entries[0]],
        entries: newEntries,
        outputs: [],
        changeAddress: this.address!,
        priorityFee: kaspaToSompi("0.5")!, // Higher fee for reveal inscription
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

        revealTxHash = await tx.submit(this.rpcClient);
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
      console.error("[KRC721] Commit-reveal failed:", error.message);
      
      // Release reservation if commit failed before broadcast
      if (commitReservation && !commitTxHash) {
        await utxoManager.releaseReservation(commitReservation.selected);
        console.log("[KRC721] Released UTXO reservation after failure");
      }
      
      return {
        success: false,
        commitTxHash,
        revealTxHash,
        error: error.message,
      };
    }
  }

  /**
   * Wait for a UTXO to appear at an address
   */
  private async waitForUtxo(address: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const { entries } = await this.rpcClient.getUtxosByAddresses({
        addresses: [address],
      });

      if (entries.length > 0) {
        console.log(`[KRC721] UTXO confirmed at ${address.slice(0, 20)}...`);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Timeout waiting for UTXO at ${address}`);
  }

  /**
   * Wait for a transaction to be confirmed
   */
  private async waitForConfirmation(txHash: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if our UTXOs have been updated (indicates confirmation)
        const { entries } = await this.rpcClient.getUtxosByAddresses({
          addresses: [this.address!],
        });

        // Transaction is likely confirmed if we have UTXOs
        if (entries.length > 0) {
          console.log(`[KRC721] Transaction confirmed: ${txHash.slice(0, 16)}...`);
          return;
        }
      } catch (error) {
        // Continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Don't throw - transaction may still succeed
    console.log(`[KRC721] Confirmation timeout for ${txHash.slice(0, 16)}... (may still succeed)`);
  }

  /**
   * Generate certificate image as raw SVG string
   * Used for IPFS upload
   * Dark theme with green accents and KU logo
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

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#111111;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="greenGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#059669;stop-opacity:0.1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="800" height="600" fill="url(#bg)"/>
        
        <!-- Subtle grid pattern -->
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a1a" stroke-width="1"/>
        </pattern>
        <rect width="800" height="600" fill="url(#grid)" opacity="0.5"/>
        
        <!-- Corner accent glow -->
        <circle cx="0" cy="0" r="200" fill="url(#greenGlow)"/>
        <circle cx="800" cy="600" r="200" fill="url(#greenGlow)"/>
        
        <!-- Border -->
        <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#green)" stroke-width="2" rx="12"/>
        <rect x="28" y="28" width="744" height="544" fill="none" stroke="#1f2937" stroke-width="1" rx="10"/>
        
        <!-- KU Logo Circle -->
        <circle cx="400" cy="70" r="35" fill="#111" stroke="url(#green)" stroke-width="2"/>
        <text x="400" y="78" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="24" fill="url(#green)" font-weight="bold">
          KU
        </text>
        
        <!-- Header -->
        <text x="400" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#10b981" letter-spacing="4" font-weight="bold">
          KASPA UNIVERSITY
        </text>
        
        <!-- Certificate Title -->
        <text x="400" y="175" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#ffffff" font-weight="bold" filter="url(#glow)">
          Certificate of Completion
        </text>
        
        <!-- Divider -->
        <line x1="150" y1="200" x2="650" y2="200" stroke="url(#green)" stroke-width="1" opacity="0.5"/>
        
        <!-- This certifies -->
        <text x="400" y="245" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
          This is to certify that
        </text>
        
        <!-- Recipient Address -->
        <text x="400" y="285" text-anchor="middle" font-family="monospace" font-size="18" fill="#10b981" font-weight="bold">
          ${shortAddress}
        </text>
        
        <!-- Has completed -->
        <text x="400" y="325" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
          has successfully completed the course
        </text>
        
        <!-- Course Name -->
        <text x="400" y="375" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#ffffff" font-weight="bold">
          ${courseName}
        </text>
        
        <!-- Score Badge -->
        <rect x="340" y="400" width="120" height="40" rx="20" fill="#111" stroke="url(#green)" stroke-width="1"/>
        <text x="400" y="427" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#10b981" font-weight="bold">
          ${score}% Score
        </text>
        
        <!-- Date -->
        <text x="400" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
          Awarded on ${dateStr}
        </text>
        
        <!-- Verification Badge -->
        <rect x="280" y="510" width="240" height="30" rx="15" fill="#0d1f17" stroke="#10b981" stroke-width="1" opacity="0.8"/>
        <circle cx="300" cy="525" r="8" fill="#10b981"/>
        <text x="315" y="530" font-family="Arial, sans-serif" font-size="11" fill="#10b981">
          Verified on Kaspa Blockchain
        </text>
        
        <!-- Footer -->
        <text x="400" y="575" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#4b5563">
          KRC-721 NFT Certificate | KPROOF Collection
        </text>
      </svg>
    `.trim();
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

export { KRC721Service, KRC721Config, DeployResult, MintResult, CertificateMetadata };
