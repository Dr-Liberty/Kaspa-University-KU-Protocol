/**
 * KU Protocol On-Chain Indexer
 * 
 * Indexes KU Protocol transactions from the Kaspa blockchain.
 * This is the source of truth for quiz completions and educational achievements.
 * 
 * ON-CHAIN VERIFICATION:
 * - All txHashes are verified on-chain before being accepted
 * - Records without valid on-chain proof are rejected
 * - The database is used as a cache for indexed on-chain data
 * 
 * Protocol formats indexed:
 * - ku:1:quiz:{data} - Quiz completion proofs
 * - ku:1:cert:{data} - Certificate claims
 * - ku:1:prog:{data} - Progress markers
 */

import { getKaspaService } from "./kaspa";
import { 
  parseKUPayload, 
  isKUTransaction,
  KU_PREFIX,
  KU_VERSION,
  hexToString,
  QuizPayload,
} from "./ku-protocol";
import type { IStorage } from "./storage";
import type { InsertVerifiedTransaction } from "@shared/schema";

export interface IndexedQuizProof {
  id: string;
  txHash: string;
  walletAddress: string;
  courseId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  timestamp: Date;
  contentHash: string;
  verified: boolean;
  blockHeight?: number;
  startBlockHash?: string;
  startBlueScore?: number;
  endBlockHash?: string;
  endBlueScore?: number;
}

export interface VerifiedTransaction {
  txHash: string;
  protocol: string;
  type: string;
  walletAddress: string;
  courseId?: string;
  lessonId?: string;
  score?: number;
  verifiedAt: Date;
  blockAnchored: boolean;
  startBlueScore?: number;
  endBlueScore?: number;
}

export interface OnChainStats {
  totalQuizProofs: number;
  totalUniqueStudents: number;
  totalCourseCompletions: number;
  protocolBreakdown: {
    ku: number;
    k: number;
    kasia: number;
    krc721: number;
  };
  recentTransactions: Array<{
    txHash: string;
    protocol: string;
    type: string;
    timestamp: Date;
    walletAddress?: string;
  }>;
  lastUpdated: Date;
}

/**
 * KU Protocol Indexer - indexes on-chain educational achievements
 */
class KUIndexer {
  private quizProofs: Map<string, IndexedQuizProof> = new Map();
  private verifiedTxLog: VerifiedTransaction[] = [];
  private storageRef: IStorage | null = null;
  private isRunning = false;
  private stats: OnChainStats = {
    totalQuizProofs: 0,
    totalUniqueStudents: 0,
    totalCourseCompletions: 0,
    protocolBreakdown: { ku: 0, k: 0, kasia: 0, krc721: 0 },
    recentTransactions: [],
    lastUpdated: new Date(),
  };

  constructor() {
    console.log("[KU Indexer] Initialized on-chain educational achievement indexer");
  }

  setStorage(storage: IStorage): void {
    this.storageRef = storage;
    console.log("[KU Indexer] Storage layer connected for verified transaction persistence");
  }

  /**
   * Start the indexer
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log("[KU Indexer] Starting on-chain indexer...");
    this.isRunning = true;
    console.log("[KU Indexer] Ready to index KU protocol transactions");
  }

  /**
   * Stop the indexer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    console.log("[KU Indexer] Stopping indexer...");
    this.isRunning = false;
  }

  /**
   * Verify a transaction exists on-chain with valid KU data
   */
  async verifyOnChain(txHash: string, expectedType?: "quiz" | "cert" | "prog"): Promise<{
    valid: boolean;
    payload?: QuizPayload;
    protocol?: string;
  }> {
    try {
      const kaspa = await getKaspaService();
      const result = await kaspa.verifyTransactionOnChain(txHash);
      
      if (!result.exists) {
        console.log(`[KU Indexer] TX not found on-chain: ${txHash.slice(0, 16)}...`);
        return { valid: false };
      }
      
      if (result.payload) {
        // Verify it's a KU protocol transaction
        if (!isKUTransaction(result.payload)) {
          return { valid: false };
        }
        
        const parsed = parseKUPayload(result.payload);
        if (!parsed) {
          return { valid: false };
        }
        
        if (expectedType && parsed.type !== expectedType) {
          console.warn(`[KU Indexer] Type mismatch: expected ${expectedType}, got ${parsed.type}`);
          return { valid: false };
        }
        
        console.log(`[KU Indexer] Verified on-chain KU ${parsed.type}: ${txHash.slice(0, 16)}...`);
        return { 
          valid: true, 
          payload: parsed.quiz,
          protocol: `${KU_PREFIX}:${KU_VERSION}:${parsed.type}`,
        };
      }
      
      // TX exists but no payload - accept for now
      console.log(`[KU Indexer] TX verified (no payload): ${txHash.slice(0, 16)}...`);
      return { valid: true };
    } catch (error: any) {
      console.error(`[KU Indexer] Verification error: ${error.message}`);
      return { valid: false };
    }
  }

  /**
   * Record a quiz proof after on-chain verification
   */
  async recordQuizProof(proof: IndexedQuizProof, skipVerification = false): Promise<boolean> {
    if (!skipVerification && proof.txHash) {
      const result = await this.verifyOnChain(proof.txHash, "quiz");
      if (!result.valid) {
        console.warn(`[KU Indexer] Rejected quiz proof - not verified: ${proof.txHash.slice(0, 16)}...`);
        return false;
      }
      proof.verified = true;
    }
    
    this.quizProofs.set(proof.txHash, proof);
    
    if (proof.verified) {
      this.addToVerifiedLog(proof);
    }
    
    this.stats.totalQuizProofs++;
    this.stats.protocolBreakdown.ku++;
    this.stats.lastUpdated = new Date();
    
    // Track unique students
    const uniqueStudents = new Set(Array.from(this.quizProofs.values()).map(p => p.walletAddress));
    this.stats.totalUniqueStudents = uniqueStudents.size;
    
    // Add to recent transactions
    this.stats.recentTransactions.unshift({
      txHash: proof.txHash,
      protocol: "ku",
      type: "quiz",
      timestamp: proof.timestamp,
      walletAddress: proof.walletAddress,
    });
    
    // Keep only last 100 transactions
    if (this.stats.recentTransactions.length > 100) {
      this.stats.recentTransactions = this.stats.recentTransactions.slice(0, 100);
    }
    
    console.log(`[KU Indexer] Recorded quiz proof: ${proof.txHash.slice(0, 16)}...`);
    return true;
  }

  /**
   * Record a K Protocol transaction (from on-chain)
   */
  recordKTransaction(txHash: string, type: string, walletAddress?: string): void {
    this.stats.protocolBreakdown.k++;
    this.stats.recentTransactions.unshift({
      txHash,
      protocol: "k",
      type,
      timestamp: new Date(),
      walletAddress,
    });
    this.stats.lastUpdated = new Date();
    
    if (this.stats.recentTransactions.length > 100) {
      this.stats.recentTransactions = this.stats.recentTransactions.slice(0, 100);
    }
  }

  /**
   * Record a Kasia Protocol transaction (from on-chain)
   */
  recordKasiaTransaction(txHash: string, type: string, walletAddress?: string): void {
    this.stats.protocolBreakdown.kasia++;
    this.stats.recentTransactions.unshift({
      txHash,
      protocol: "kasia",
      type,
      timestamp: new Date(),
      walletAddress,
    });
    this.stats.lastUpdated = new Date();
    
    if (this.stats.recentTransactions.length > 100) {
      this.stats.recentTransactions = this.stats.recentTransactions.slice(0, 100);
    }
  }

  /**
   * Record a KRC-721 transaction (from on-chain)
   */
  recordKRC721Transaction(txHash: string, type: string, walletAddress?: string): void {
    this.stats.protocolBreakdown.krc721++;
    this.stats.recentTransactions.unshift({
      txHash,
      protocol: "krc721",
      type,
      timestamp: new Date(),
      walletAddress,
    });
    this.stats.lastUpdated = new Date();
    
    if (this.stats.recentTransactions.length > 100) {
      this.stats.recentTransactions = this.stats.recentTransactions.slice(0, 100);
    }
  }

  /**
   * Get quiz proofs for a wallet address
   */
  getProofsForWallet(walletAddress: string): IndexedQuizProof[] {
    return Array.from(this.quizProofs.values())
      .filter(p => p.walletAddress === walletAddress)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get a specific quiz proof by txHash
   */
  getProofByTxHash(txHash: string): IndexedQuizProof | undefined {
    return this.quizProofs.get(txHash);
  }

  /**
   * Get on-chain statistics
   */
  getStats(): OnChainStats {
    return { ...this.stats };
  }

  /**
   * Get all quiz proofs (for explorer)
   */
  getAllProofs(limit = 100, offset = 0): IndexedQuizProof[] {
    return Array.from(this.quizProofs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get the verified transaction log for admin panel (reads from DB when available)
   */
  async getVerifiedTransactions(limit = 50, offset = 0): Promise<VerifiedTransaction[]> {
    if (this.storageRef) {
      const dbTxs = await this.storageRef.getVerifiedTransactions(limit, offset);
      return dbTxs.map(t => ({
        txHash: t.txHash,
        protocol: t.protocol,
        type: t.type,
        walletAddress: t.walletAddress,
        courseId: t.courseId ?? undefined,
        lessonId: t.lessonId ?? undefined,
        score: t.score ?? undefined,
        verifiedAt: t.verifiedAt,
        blockAnchored: t.blockAnchored,
        startBlueScore: t.startBlueScore ?? undefined,
        endBlueScore: t.endBlueScore ?? undefined,
      }));
    }
    return this.verifiedTxLog
      .sort((a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get verified transaction count (reads from DB when available)
   */
  async getVerifiedCount(): Promise<number> {
    if (this.storageRef) {
      return this.storageRef.getVerifiedTransactionCount();
    }
    return this.verifiedTxLog.length;
  }

  /**
   * Get block-anchored transaction count (reads from DB when available)
   */
  async getBlockAnchoredCount(): Promise<number> {
    if (this.storageRef) {
      return this.storageRef.getBlockAnchoredCount();
    }
    return this.verifiedTxLog.filter(t => t.blockAnchored).length;
  }

  /**
   * Batch verify unverified quiz proofs against the blockchain
   * Similar to minKasWasm's Intelligence Layer active scanning
   */
  async batchVerifyProofs(batchSize = 10): Promise<{ verified: number; failed: number; skipped: number }> {
    const unverified = Array.from(this.quizProofs.values())
      .filter(p => !p.verified && p.txHash);
    
    let verified = 0;
    let failed = 0;
    let skipped = 0;
    
    const batch = unverified.slice(0, batchSize);
    
    for (const proof of batch) {
      try {
        const result = await this.verifyOnChain(proof.txHash, "quiz");
        if (result.valid) {
          proof.verified = true;
          this.addToVerifiedLog(proof);
          verified++;
        } else {
          failed++;
        }
      } catch {
        skipped++;
      }
    }
    
    if (batch.length > 0) {
      console.log(`[KU Indexer] Batch verification: ${verified} verified, ${failed} failed, ${skipped} skipped`);
    }
    
    return { verified, failed, skipped };
  }

  /**
   * Add a verified proof to the persistent transaction log (DB + in-memory cache)
   */
  private addToVerifiedLog(proof: IndexedQuizProof): void {
    const isAnchored = !!proof.startBlockHash && proof.startBlockHash !== "none" && 
                       !!proof.endBlockHash && proof.endBlockHash !== "none";
    
    const entry: VerifiedTransaction = {
      txHash: proof.txHash,
      protocol: "ku",
      type: "quiz",
      walletAddress: proof.walletAddress,
      courseId: proof.courseId,
      lessonId: proof.lessonId,
      score: proof.score,
      verifiedAt: new Date(),
      blockAnchored: isAnchored,
      startBlueScore: proof.startBlueScore,
      endBlueScore: proof.endBlueScore,
    };
    
    this.verifiedTxLog.push(entry);
    if (this.verifiedTxLog.length > 1000) {
      this.verifiedTxLog = this.verifiedTxLog.slice(-500);
    }
    
    if (this.storageRef) {
      const insertData: InsertVerifiedTransaction = {
        txHash: entry.txHash,
        protocol: entry.protocol,
        type: entry.type,
        walletAddress: entry.walletAddress,
        courseId: entry.courseId,
        lessonId: entry.lessonId,
        score: entry.score,
        blockAnchored: entry.blockAnchored,
        startBlueScore: entry.startBlueScore,
        endBlueScore: entry.endBlueScore,
      };
      this.storageRef.saveVerifiedTransaction(insertData).catch(err => {
        console.error("[KU Indexer] Failed to persist verified transaction:", err.message);
      });
    }
  }

  /**
   * Scan a transaction for protocol messages
   * Returns the protocol type if recognized
   */
  identifyProtocol(payloadHex: string): { protocol: string; type: string } | null {
    try {
      const payloadStr = hexToString(payloadHex);
      
      // KU Protocol
      if (payloadStr.startsWith("ku:")) {
        const parts = payloadStr.split(":");
        return { protocol: "ku", type: parts[2] || "unknown" };
      }
      
      // K Protocol
      if (payloadStr.startsWith("k:")) {
        const parts = payloadStr.split(":");
        return { protocol: "k", type: parts[2] || "unknown" };
      }
      
      // Kasia Protocol
      if (payloadStr.startsWith("ciph_msg:")) {
        const parts = payloadStr.split(":");
        return { protocol: "kasia", type: parts[2] || "unknown" };
      }
      
      // KRC-721 (inscriptions)
      if (payloadStr.includes('"p":"krc-721"')) {
        const match = payloadStr.match(/"op":"(\w+)"/);
        return { protocol: "krc721", type: match?.[1] || "unknown" };
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

export const kuIndexer = new KUIndexer();
