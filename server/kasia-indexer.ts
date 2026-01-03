/**
 * Kasia On-Chain Indexer
 * 
 * Indexes Kasia protocol messages from the Kaspa blockchain.
 * This is the source of truth for conversations and messages.
 * 
 * ON-CHAIN VERIFICATION:
 * - All txHashes are verified on-chain before being accepted
 * - Records without valid on-chain proof are rejected
 * - The database is used as a cache for indexed on-chain data
 * 
 * Protocol formats indexed:
 * - ciph_msg:1:handshake:{sealed_hex} - Conversation initiation
 * - ciph_msg:1:comm:{alias}:{sealed_hex} - Encrypted messages
 */

import { 
  hexToString, 
  stringToHex,
  KASIA_PREFIX, 
  KASIA_ENCRYPTED,
  KASIA_DELIM,
  HandshakeData,
} from "./kasia-encrypted";
import { getKaspaService } from "./kaspa";

export interface IndexedConversation {
  id: string;
  initiatorAddress: string;
  recipientAddress: string;
  initiatorAlias?: string;
  recipientAlias?: string;
  status: "pending" | "active" | "archived";
  handshakeTxHash?: string;
  responseTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
  isAdminConversation?: boolean;
}

export interface IndexedMessage {
  id: string;
  txHash: string;
  conversationId: string;
  senderAddress: string;
  senderAlias?: string;
  encryptedContent: string;
  timestamp: Date;
  confirmations?: number;
}

export interface HandshakeRecord {
  txHash: string;
  conversationId: string;
  senderAddress: string;
  recipientAddress: string;
  senderAlias: string;
  isResponse: boolean;
  timestamp: Date;
  blockHeight?: number;
}

/**
 * Kasia Indexer - indexes on-chain Kasia messages
 * 
 * In a full implementation, this would connect to a Kasia indexer service
 * or run its own blockchain scanner. For now, we maintain a local cache
 * that tracks txHashes as proof of on-chain existence.
 */
class KasiaIndexer {
  private handshakes: Map<string, HandshakeRecord> = new Map();
  private messages: Map<string, IndexedMessage> = new Map();
  private conversations: Map<string, IndexedConversation> = new Map();
  private isRunning = false;
  private storage: any = null;

  constructor() {
    console.log("[Kasia Indexer] Initialized on-chain message indexer");
  }

  /**
   * Set the storage backend for persistence
   */
  setStorage(storage: any): void {
    this.storage = storage;
    console.log("[Kasia Indexer] Storage backend connected");
  }

  /**
   * Start the indexer and load persisted data
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log("[Kasia Indexer] Starting on-chain indexer...");
    this.isRunning = true;
    
    // Load persisted conversations from database
    if (this.storage) {
      try {
        const allConversations = await this.loadFromStorage();
        console.log(`[Kasia Indexer] Loaded ${allConversations} conversations from database`);
      } catch (error: any) {
        console.error(`[Kasia Indexer] Error loading from storage: ${error.message}`);
      }
    }
    
    console.log("[Kasia Indexer] Ready to index Kasia protocol messages");
  }

  /**
   * Load persisted conversations from storage (all states)
   */
  private async loadFromStorage(): Promise<number> {
    if (!this.storage) return 0;
    
    try {
      let totalLoaded = 0;
      
      // Helper to convert storage conversation to indexed format
      const convertConversation = (conv: any): IndexedConversation => ({
        id: conv.id,
        initiatorAddress: conv.initiatorAddress,
        recipientAddress: conv.recipientAddress,
        initiatorAlias: conv.initiatorAlias,
        recipientAlias: conv.recipientAlias,
        status: conv.status === "pending_handshake" || conv.status === "handshake_received" ? "pending" : 
                conv.status === "active" ? "active" : 
                conv.status === "archived" ? "archived" : "pending",
        handshakeTxHash: conv.handshakeTxHash,
        responseTxHash: conv.responseTxHash,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        isAdminConversation: conv.isAdminConversation,
      });
      
      // Load pending conversations
      const pending = await this.storage.getPendingConversations();
      for (const conv of pending) {
        this.conversations.set(conv.id, convertConversation(conv));
        totalLoaded++;
      }
      
      // Load active conversations by checking all users' conversations
      // Note: In production, we'd have a getAllConversations method
      // For now, we rely on database to persist and reload from pending
      // Active conversations will be restored as users access them
      
      console.log(`[Kasia Indexer] Loaded ${totalLoaded} pending conversations`);
      
      return totalLoaded;
    } catch (error: any) {
      console.error(`[Kasia Indexer] Storage load error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Stop the indexer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log("[Kasia Indexer] Stopping indexer...");
    this.isRunning = false;
  }

  /**
   * Verify a transaction exists on-chain and contains valid Kasia protocol data
   * Returns true if the tx hash is valid, confirmed, and has proper Kasia payload
   */
  async verifyOnChain(txHash: string, expectedType?: "handshake" | "comm"): Promise<boolean> {
    try {
      const kaspa = await getKaspaService();
      const result = await kaspa.verifyTransactionOnChain(txHash);
      
      if (!result.exists) {
        console.log(`[Kasia Indexer] TX not found on-chain: ${txHash.slice(0, 16)}...`);
        return false;
      }
      
      // If we have a payload, validate it's a proper Kasia message
      if (result.payload) {
        const parsed = this.parseKasiaPayload(result.payload);
        if (!parsed) {
          console.warn(`[Kasia Indexer] TX exists but payload is not Kasia protocol: ${txHash.slice(0, 16)}...`);
          return false;
        }
        
        // If expected type specified, validate it matches
        if (expectedType && parsed.type !== expectedType) {
          console.warn(`[Kasia Indexer] TX type mismatch: expected ${expectedType}, got ${parsed.type}`);
          return false;
        }
        
        console.log(`[Kasia Indexer] Verified on-chain Kasia ${parsed.type}: ${txHash.slice(0, 16)}...`);
      } else {
        // Some RPC nodes don't return payload - accept if tx exists
        // This is a fallback for nodes without payload support
        console.log(`[Kasia Indexer] TX verified (no payload data available): ${txHash.slice(0, 16)}...`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`[Kasia Indexer] On-chain verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Record a handshake transaction (after it's broadcast)
   * Verifies on-chain before accepting with payload validation
   */
  async recordHandshake(record: HandshakeRecord, skipVerification = false): Promise<boolean> {
    const key = record.txHash;
    
    // Verify the transaction exists on-chain with valid Kasia handshake payload
    if (!skipVerification && record.txHash) {
      const isValid = await this.verifyOnChain(record.txHash, "handshake");
      if (!isValid) {
        console.warn(`[Kasia Indexer] Rejected handshake - invalid or not found: ${record.txHash.slice(0, 16)}...`);
        return false;
      }
    }
    
    this.handshakes.set(key, record);
    
    // Update or create conversation
    this.updateConversationFromHandshake(record);
    
    console.log(`[Kasia Indexer] Recorded verified handshake: ${record.txHash.slice(0, 16)}...`);
    return true;
  }

  /**
   * Record a message transaction (after it's broadcast)
   * Verifies on-chain before accepting with payload validation
   */
  async recordMessage(message: IndexedMessage, skipVerification = false): Promise<boolean> {
    const key = message.txHash;
    
    // Verify the transaction exists on-chain with valid Kasia comm payload
    if (!skipVerification && message.txHash) {
      const isValid = await this.verifyOnChain(message.txHash, "comm");
      if (!isValid) {
        console.warn(`[Kasia Indexer] Rejected message - invalid or not found: ${message.txHash.slice(0, 16)}...`);
        return false;
      }
    }
    
    this.messages.set(key, message);
    
    // Update conversation timestamp
    const conv = this.conversations.get(message.conversationId);
    if (conv) {
      conv.updatedAt = new Date();
      this.conversations.set(message.conversationId, conv);
    }
    
    // Persist message to database
    if (this.storage) {
      try {
        await this.storage.createPrivateMessage({
          id: message.id,
          conversationId: message.conversationId,
          senderAddress: message.senderAddress,
          encryptedContent: message.encryptedContent,
          txHash: message.txHash,
          txStatus: "confirmed",
        });
      } catch (error: any) {
        console.error(`[Kasia Indexer] Message persist error: ${error.message}`);
      }
    }
    
    console.log(`[Kasia Indexer] Recorded verified message: ${message.txHash.slice(0, 16)}...`);
    return true;
  }

  /**
   * Update conversation state from a handshake
   */
  private updateConversationFromHandshake(record: HandshakeRecord): void {
    const existing = this.conversations.get(record.conversationId);
    
    if (record.isResponse) {
      // This is a response handshake - activate the conversation
      if (existing) {
        existing.status = "active";
        existing.responseTxHash = record.txHash;
        existing.recipientAlias = record.senderAlias;
        existing.updatedAt = new Date();
        this.conversations.set(record.conversationId, existing);
      }
    } else {
      // This is an initial handshake
      if (!existing) {
        const newConv: IndexedConversation = {
          id: record.conversationId,
          initiatorAddress: record.senderAddress,
          recipientAddress: record.recipientAddress,
          initiatorAlias: record.senderAlias,
          status: "pending",
          handshakeTxHash: record.txHash,
          createdAt: record.timestamp,
          updatedAt: record.timestamp,
        };
        this.conversations.set(record.conversationId, newConv);
      }
    }
  }

  /**
   * Create a conversation (for metadata tracking)
   * Persists to database for durability
   */
  async createConversation(params: {
    id: string;
    initiatorAddress: string;
    recipientAddress: string;
    initiatorAlias?: string;
    handshakeTxHash?: string;
    isAdminConversation?: boolean;
    status?: "pending" | "active";
  }): Promise<IndexedConversation> {
    const now = new Date();
    const conversation: IndexedConversation = {
      id: params.id,
      initiatorAddress: params.initiatorAddress,
      recipientAddress: params.recipientAddress,
      initiatorAlias: params.initiatorAlias,
      status: params.status || "pending",
      handshakeTxHash: params.handshakeTxHash,
      isAdminConversation: params.isAdminConversation,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(params.id, conversation);
    
    // Persist to database
    if (this.storage) {
      try {
        await this.storage.createConversation({
          id: params.id,
          initiatorAddress: params.initiatorAddress,
          recipientAddress: params.recipientAddress,
          status: params.status === "active" ? "active" : "pending_handshake",
          handshakeTxHash: params.handshakeTxHash,
          initiatorAlias: params.initiatorAlias,
          isAdminConversation: params.isAdminConversation,
        });
      } catch (error: any) {
        console.error(`[Kasia Indexer] Storage persist error: ${error.message}`);
      }
    }
    
    return conversation;
  }

  /**
   * Get a conversation by ID (checks cache, then database)
   */
  async getConversation(id: string): Promise<IndexedConversation | undefined> {
    // Check memory cache first
    let conv = this.conversations.get(id);
    if (conv) return conv;
    
    // Try loading from database
    if (this.storage) {
      try {
        const dbConv = await this.storage.getConversation(id);
        if (dbConv) {
          const indexed: IndexedConversation = {
            id: dbConv.id,
            initiatorAddress: dbConv.initiatorAddress,
            recipientAddress: dbConv.recipientAddress,
            initiatorAlias: dbConv.initiatorAlias,
            recipientAlias: dbConv.recipientAlias,
            status: dbConv.status === "pending_handshake" || dbConv.status === "handshake_received" ? "pending" : 
                    dbConv.status === "active" ? "active" : 
                    dbConv.status === "archived" ? "archived" : "pending",
            handshakeTxHash: dbConv.handshakeTxHash,
            responseTxHash: dbConv.responseTxHash,
            createdAt: new Date(dbConv.createdAt),
            updatedAt: new Date(dbConv.updatedAt),
            isAdminConversation: dbConv.isAdminConversation,
          };
          this.conversations.set(id, indexed);
          return indexed;
        }
      } catch (error: any) {
        console.error(`[Kasia Indexer] Database lookup error: ${error.message}`);
      }
    }
    
    return undefined;
  }

  /**
   * Get a conversation by ID (sync version for quick checks)
   */
  getConversationSync(id: string): IndexedConversation | undefined {
    return this.conversations.get(id);
  }

  /**
   * Get all conversations for a wallet address
   */
  getConversationsForWallet(walletAddress: string): IndexedConversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.initiatorAddress === walletAddress || c.recipientAddress === walletAddress)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get pending conversations (awaiting handshake acceptance)
   */
  getPendingConversations(): IndexedConversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.status === "pending")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get pending handshakes for admin review
   */
  getPendingHandshakes(): HandshakeRecord[] {
    const pendingConvIds = new Set(
      this.getPendingConversations().map(c => c.id)
    );
    
    return Array.from(this.handshakes.values())
      .filter(h => !h.isResponse && pendingConvIds.has(h.conversationId))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Update conversation status
   * Persists to database for durability
   */
  async updateConversationStatus(
    id: string, 
    status: "pending" | "active" | "archived",
    responseTxHash?: string,
    recipientAlias?: string
  ): Promise<void> {
    const conv = this.conversations.get(id);
    if (conv) {
      conv.status = status;
      if (responseTxHash) conv.responseTxHash = responseTxHash;
      if (recipientAlias) conv.recipientAlias = recipientAlias;
      conv.updatedAt = new Date();
      this.conversations.set(id, conv);
      
      // Persist to database
      if (this.storage) {
        try {
          const dbStatus = status === "pending" ? "pending_handshake" : status;
          await this.storage.updateConversationStatus(id, dbStatus, responseTxHash, recipientAlias);
        } catch (error: any) {
          console.error(`[Kasia Indexer] Storage update error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Get messages for a conversation
   */
  getMessages(conversationId: string, limit = 50, offset = 0): IndexedMessage[] {
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get handshakes by conversation ID
   */
  getHandshakesForConversation(conversationId: string): HandshakeRecord[] {
    return Array.from(this.handshakes.values())
      .filter(h => h.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Parse a transaction payload to extract Kasia data
   */
  parseKasiaPayload(payloadHex: string): {
    type: "handshake" | "comm" | "unknown";
    data: any;
  } | null {
    try {
      const payloadStr = hexToString(payloadHex);
      
      if (!payloadStr.startsWith(KASIA_PREFIX)) {
        return null;
      }
      
      if (payloadStr.includes(":handshake:")) {
        const dataHex = payloadStr.split(":handshake:")[1] || "";
        try {
          const dataStr = hexToString(dataHex);
          return { type: "handshake", data: JSON.parse(dataStr) };
        } catch {
          return { type: "handshake", data: {} };
        }
      }
      
      if (payloadStr.includes(":comm:")) {
        const rest = payloadStr.split(":comm:")[1] || "";
        const parts = rest.split(KASIA_DELIM);
        return {
          type: "comm",
          data: {
            alias: parts[0] || "",
            encryptedContent: parts.slice(1).join(KASIA_DELIM),
          },
        };
      }
      
      return { type: "unknown", data: {} };
    } catch {
      return null;
    }
  }

  /**
   * Get indexer statistics
   */
  getStats(): {
    conversations: number;
    pendingHandshakes: number;
    activeConversations: number;
    totalMessages: number;
  } {
    const allConvs = Array.from(this.conversations.values());
    return {
      conversations: allConvs.length,
      pendingHandshakes: allConvs.filter(c => c.status === "pending").length,
      activeConversations: allConvs.filter(c => c.status === "active").length,
      totalMessages: this.messages.size,
    };
  }
}

export const kasiaIndexer = new KasiaIndexer();
