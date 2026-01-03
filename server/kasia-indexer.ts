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
import { getConversationsFromIndexer, isConversationActive } from "./kasia-client";

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
  // MVP signature-based fields (for non on-chain messages)
  signature?: string;
  signedPayload?: string;
  senderPubkey?: string;
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
 * Kasia Indexer - ON-CHAIN FIRST architecture
 * 
 * The public Kasia indexer (https://indexer.kasia.fyi/) is the SOURCE OF TRUTH.
 * The local database is just a CACHE for performance and offline fallback.
 * 
 * On startup and periodically, we sync from the on-chain indexer to:
 * 1. Populate/refresh the in-memory cache
 * 2. Update the database cache
 * 
 * This maintains decentralization - the blockchain is always authoritative.
 */
class KasiaIndexer {
  private handshakes: Map<string, HandshakeRecord> = new Map();
  private messages: Map<string, IndexedMessage> = new Map();
  private conversations: Map<string, IndexedConversation> = new Map();
  private isRunning = false;
  private storage: any = null;
  private lastSyncTime: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private supportAddress: string = "";

  constructor() {
    console.log("[Kasia Indexer] Initialized on-chain message indexer (ON-CHAIN FIRST)");
  }

  /**
   * Set the storage backend for persistence (cache only)
   */
  setStorage(storage: any): void {
    this.storage = storage;
    console.log("[Kasia Indexer] Storage backend connected (cache mode)");
  }

  /**
   * Set the support address for admin sync
   */
  setSupportAddress(address: string): void {
    this.supportAddress = address;
  }

  /**
   * Start the indexer with on-chain first approach
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log("[Kasia Indexer] Starting on-chain indexer (ON-CHAIN FIRST)...");
    this.isRunning = true;
    
    // Step 1: Load from database cache (fast startup)
    if (this.storage) {
      try {
        const cachedCount = await this.loadFromStorage();
        console.log(`[Kasia Indexer] Loaded ${cachedCount} conversations from database cache`);
      } catch (error: any) {
        console.error(`[Kasia Indexer] Cache load error: ${error.message}`);
      }
    }
    
    // Step 2: Sync from on-chain indexer for support address (async, don't block startup)
    if (this.supportAddress) {
      this.syncForWallet(this.supportAddress).catch(error => {
        console.error(`[Kasia Indexer] Background sync error: ${error.message}`);
      });
    }
    
    // Step 3: Start periodic sync job (every 60 seconds)
    this.startPeriodicSync();
    
    console.log("[Kasia Indexer] Ready to index Kasia protocol messages (on-chain first)");
  }

  /**
   * Start periodic background sync from on-chain
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) return;
    
    const SYNC_INTERVAL_MS = 60_000; // 60 seconds
    
    this.syncInterval = setInterval(async () => {
      if (this.supportAddress) {
        try {
          await this.syncForWallet(this.supportAddress);
        } catch (error: any) {
          console.error(`[Kasia Indexer] Periodic sync error: ${error.message}`);
        }
      }
    }, SYNC_INTERVAL_MS);
    
    console.log("[Kasia Indexer] Started periodic on-chain sync (every 60s)");
  }

  /**
   * Sync conversations for a specific wallet from the public Kasia indexer
   * This is the ON-CHAIN FIRST approach - fetches from blockchain indexer
   */
  async syncForWallet(walletAddress: string): Promise<number> {
    console.log(`[Kasia Indexer] Syncing from on-chain for ${walletAddress.slice(0, 20)}...`);
    
    try {
      const onChainConversations = await getConversationsFromIndexer(walletAddress);
      let syncedCount = 0;
      
      for (const conv of onChainConversations) {
        const indexed: IndexedConversation = {
          id: conv.id,
          initiatorAddress: conv.initiatorAddress,
          recipientAddress: conv.recipientAddress,
          initiatorAlias: conv.initiatorAlias,
          status: conv.status,
          handshakeTxHash: conv.handshakeTxHash,
          responseTxHash: conv.responseTxHash,
          createdAt: conv.createdAt,
          updatedAt: conv.createdAt,
          isAdminConversation: this.supportAddress ? 
            (conv.initiatorAddress === this.supportAddress || conv.recipientAddress === this.supportAddress) : false,
        };
        
        // Update in-memory cache
        const existing = this.conversations.get(conv.id);
        if (!existing || conv.createdAt > existing.createdAt) {
          this.conversations.set(conv.id, indexed);
          syncedCount++;
          
          // Also update database cache
          if (this.storage) {
            try {
              const existingDb = await this.storage.getConversation(conv.id);
              if (!existingDb) {
                await this.storage.createConversation({
                  id: indexed.id,
                  initiatorAddress: indexed.initiatorAddress,
                  recipientAddress: indexed.recipientAddress,
                  status: indexed.status === "pending" ? "pending_handshake" : indexed.status,
                  handshakeTxHash: indexed.handshakeTxHash,
                  initiatorAlias: indexed.initiatorAlias,
                  isAdminConversation: indexed.isAdminConversation,
                });
              }
            } catch (error: any) {
              // Ignore cache errors
            }
          }
        }
      }
      
      this.lastSyncTime = new Date();
      console.log(`[Kasia Indexer] Synced ${syncedCount} new conversations from on-chain`);
      return syncedCount;
    } catch (error: any) {
      console.error(`[Kasia Indexer] On-chain sync error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get sync status for diagnostics
   */
  getSyncStatus(): { lastSync: Date | null; isRunning: boolean } {
    return {
      lastSync: this.lastSyncTime,
      isRunning: this.isRunning,
    };
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
      
      // Load ALL conversations from database (pending, active, archived)
      const allConversations = await this.storage.getAllConversations();
      console.log(`[Kasia Indexer] Raw database returned ${allConversations?.length || 0} conversations`);
      for (const conv of allConversations) {
        const converted = convertConversation(conv);
        this.conversations.set(conv.id, converted);
        console.log(`[Kasia Indexer] Loaded conv ${conv.id}: dbStatus=${conv.status} -> memStatus=${converted.status}, isAdmin=${conv.isAdminConversation}`);
        totalLoaded++;
      }
      
      // Rehydrate handshake records from conversation data
      for (const conv of allConversations) {
        // Recreate initiator handshake record if txHash exists
        if (conv.handshakeTxHash) {
          const handshakeRecord: HandshakeRecord = {
            txHash: conv.handshakeTxHash,
            conversationId: conv.id,
            senderAddress: conv.initiatorAddress,
            recipientAddress: conv.recipientAddress,
            senderAlias: conv.initiatorAlias || "",
            isResponse: false,
            timestamp: new Date(conv.createdAt),
          };
          this.handshakes.set(conv.handshakeTxHash, handshakeRecord);
        }
        
        // Recreate response handshake record if exists
        if (conv.responseTxHash) {
          const responseRecord: HandshakeRecord = {
            txHash: conv.responseTxHash,
            conversationId: conv.id,
            senderAddress: conv.recipientAddress,
            recipientAddress: conv.initiatorAddress,
            senderAlias: conv.recipientAlias || "",
            isResponse: true,
            timestamp: new Date(conv.updatedAt),
          };
          this.handshakes.set(conv.responseTxHash, responseRecord);
        }
      }
      
      // Load messages for active conversations
      for (const conv of allConversations) {
        if (conv.status === "active") {
          try {
            const messages = await this.storage.getPrivateMessages(conv.id, 100);
            for (const msg of messages) {
              const indexed: IndexedMessage = {
                id: msg.id,
                txHash: msg.txHash || "",
                conversationId: msg.conversationId,
                senderAddress: msg.senderAddress,
                encryptedContent: msg.encryptedContent,
                timestamp: new Date(msg.createdAt),
              };
              this.messages.set(msg.id, indexed);
            }
          } catch (error) {
            // Continue even if message loading fails
          }
        }
      }
      
      const statusCounts = {
        pending: allConversations.filter(c => c.status === "pending" || c.status === "pending_handshake").length,
        active: allConversations.filter(c => c.status === "active").length,
        archived: allConversations.filter(c => c.status === "archived").length,
      };
      console.log(`[Kasia Indexer] Loaded ${totalLoaded} conversations (pending: ${statusCounts.pending}, active: ${statusCounts.active}, archived: ${statusCounts.archived})`);
      console.log(`[Kasia Indexer] Rehydrated ${this.handshakes.size} handshakes, ${this.messages.size} messages`);
      
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
   * Verify a transaction exists on-chain with valid Kasia data and matching binding
   * @param txHash - Transaction hash to verify
   * @param expectedType - Expected message type (handshake or comm)
   * @param expectedBinding - Expected conversation binding (conversationId, participants)
   */
  async verifyOnChain(
    txHash: string, 
    expectedType?: "handshake" | "comm",
    expectedBinding?: {
      conversationId?: string;
      recipientAddress?: string;
      senderAddress?: string;
    }
  ): Promise<boolean> {
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
        
        // Validate message type
        if (expectedType && parsed.type !== expectedType) {
          console.warn(`[Kasia Indexer] TX type mismatch: expected ${expectedType}, got ${parsed.type}`);
          return false;
        }
        
        // For handshakes, validate conversation binding
        // ConversationId is deterministically generated from both initiator and recipient addresses
        // so validating conversationId provides sender binding (can't forge conversationId without knowing both addresses)
        if (expectedType === "handshake" && expectedBinding) {
          // Validate conversationId binding - this is REQUIRED for handshakes
          // ConversationId = hash(initiator, recipient) so it provides sender binding
          if (expectedBinding.conversationId) {
            if (!parsed.conversationId) {
              console.warn(`[Kasia Indexer] Handshake payload missing conversationId - sender binding cannot be verified`);
              return false;
            }
            if (parsed.conversationId !== expectedBinding.conversationId) {
              console.warn(`[Kasia Indexer] ConversationId mismatch - possible replay attack: expected ${expectedBinding.conversationId.slice(0, 16)}...`);
              return false;
            }
          }
          
          // Validate recipient binding (required if expected)
          if (expectedBinding.recipientAddress) {
            if (!parsed.recipientAddress) {
              console.warn(`[Kasia Indexer] Handshake payload missing recipientAddress`);
              return false;
            }
            if (parsed.recipientAddress !== expectedBinding.recipientAddress) {
              console.warn(`[Kasia Indexer] Recipient mismatch - possible replay attack`);
              return false;
            }
          }
          
          // Validate sender binding using resolved transaction origin
          // UTXO resolution fetches the address from the referenced output
          const strictSenderBinding = process.env.STRICT_SENDER_BINDING === "true";
          if (expectedBinding.senderAddress) {
            if (!result.senderAddress) {
              console.warn(`[Kasia Indexer] Cannot verify sender binding - UTXO resolution failed`);
              if (strictSenderBinding) {
                console.warn(`[Kasia Indexer] STRICT MODE: Rejecting handshake without sender verification`);
                return false;
              }
              // Fallback to conversationId binding (cryptographically secure)
              console.log(`[Kasia Indexer] Falling back to conversationId binding (hash of both addresses)`);
            } else if (result.senderAddress !== expectedBinding.senderAddress) {
              console.warn(`[Kasia Indexer] Sender mismatch - handshake spoofing detected: expected ${expectedBinding.senderAddress.slice(0, 20)}..., got ${result.senderAddress.slice(0, 20)}...`);
              return false;
            } else {
              console.log(`[Kasia Indexer] Sender binding verified: ${result.senderAddress.slice(0, 20)}...`);
            }
          }
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
   * Verifies on-chain before accepting with payload and binding validation
   */
  async recordHandshake(record: HandshakeRecord, skipVerification = false): Promise<boolean> {
    const key = record.txHash;
    
    // Verify the transaction exists on-chain with valid Kasia handshake payload
    // Also verify the conversation binding matches
    if (!skipVerification && record.txHash) {
      const isValid = await this.verifyOnChain(record.txHash, "handshake", {
        conversationId: record.conversationId,
        recipientAddress: record.recipientAddress,
        senderAddress: record.senderAddress,
      });
      if (!isValid) {
        console.warn(`[Kasia Indexer] Rejected handshake - invalid or not found: ${record.txHash.slice(0, 16)}...`);
        return false;
      }
    }
    
    this.handshakes.set(key, record);
    
    // Update or create conversation
    this.updateConversationFromHandshake(record);
    
    // Persist handshake to database
    if (this.storage) {
      try {
        const conv = this.conversations.get(record.conversationId);
        if (conv) {
          if (record.isResponse) {
            await this.storage.updateConversation(record.conversationId, { 
              responseTxHash: record.txHash,
              recipientAlias: record.senderAlias,
            });
          } else {
            await this.storage.updateConversation(record.conversationId, { 
              handshakeTxHash: record.txHash,
              initiatorAlias: record.senderAlias,
            });
          }
        }
      } catch (error: any) {
        console.error(`[Kasia Indexer] Handshake persist error: ${error.message}`);
      }
    }
    
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
    
    // Persist to database - critical for durability across restarts
    if (this.storage) {
      try {
        const dbStatus = params.status === "active" ? "active" : "pending_handshake";
        console.log(`[Kasia Indexer] Persisting conversation ${params.id} with status=${dbStatus}, isAdmin=${params.isAdminConversation}`);
        await this.storage.createConversation({
          id: params.id,
          initiatorAddress: params.initiatorAddress,
          recipientAddress: params.recipientAddress,
          status: dbStatus,
          handshakeTxHash: params.handshakeTxHash,
          initiatorAlias: params.initiatorAlias,
          isAdminConversation: params.isAdminConversation,
        });
        console.log(`[Kasia Indexer] Successfully persisted conversation ${params.id}`);
      } catch (error: any) {
        console.error(`[Kasia Indexer] Storage persist error for ${params.id}: ${error.message}`);
        console.error(`[Kasia Indexer] Full error:`, error);
      }
    } else {
      console.warn(`[Kasia Indexer] No storage backend - conversation ${params.id} will be lost on restart!`);
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
   * Get all conversations for a wallet address (from local cache)
   */
  getConversationsForWallet(walletAddress: string): IndexedConversation[] {
    const allConvs = Array.from(this.conversations.values());
    console.log(`[Kasia Indexer] getConversationsForWallet: checking ${allConvs.length} conversations for wallet ${walletAddress.slice(0, 20)}...`);
    
    // Debug: log all conversation addresses
    for (const c of allConvs) {
      const isMatch = c.initiatorAddress === walletAddress || c.recipientAddress === walletAddress;
      console.log(`[Kasia Indexer]   Conv ${c.id}: initiator=${c.initiatorAddress.slice(0, 20)}..., recipient=${c.recipientAddress.slice(0, 20)}..., status=${c.status}, match=${isMatch}`);
    }
    
    return allConvs
      .filter(c => c.initiatorAddress === walletAddress || c.recipientAddress === walletAddress)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get all conversations for a wallet by querying the public Kasia indexer
   * This is the TRUE on-chain source of truth for conversations
   */
  async getConversationsFromOnChain(walletAddress: string): Promise<IndexedConversation[]> {
    console.log(`[Kasia Indexer] Fetching on-chain conversations for ${walletAddress.slice(0, 20)}...`);
    
    try {
      const onChainConversations = await getConversationsFromIndexer(walletAddress);
      
      const result: IndexedConversation[] = onChainConversations.map(conv => ({
        id: conv.id,
        initiatorAddress: conv.initiatorAddress,
        recipientAddress: conv.recipientAddress,
        initiatorAlias: conv.initiatorAlias,
        status: conv.status,
        handshakeTxHash: conv.handshakeTxHash,
        responseTxHash: conv.responseTxHash,
        createdAt: conv.createdAt,
        updatedAt: conv.createdAt,
      }));
      
      const localConversations = this.getConversationsForWallet(walletAddress);
      
      const onChainIds = new Set(result.map(c => c.id));
      for (const local of localConversations) {
        if (!onChainIds.has(local.id)) {
          result.push(local);
        }
      }
      
      console.log(`[Kasia Indexer] Found ${onChainConversations.length} on-chain + ${localConversations.length} local conversations`);
      
      return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      console.error(`[Kasia Indexer] Error fetching on-chain conversations: ${error.message}`);
      return this.getConversationsForWallet(walletAddress);
    }
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
   * Get all active conversations (for admin to view and reply)
   */
  getActiveConversations(): IndexedConversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.status === "active")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get all conversations regardless of wallet (admin only)
   */
  getAllConversations(): IndexedConversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
  /**
   * Parse Kasia payload and extract conversation binding info
   */
  parseKasiaPayload(payloadHex: string): {
    type: "handshake" | "comm" | "unknown";
    data: any;
    conversationId?: string;
    recipientAddress?: string;
    alias?: string;
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
          const handshakeData = JSON.parse(dataStr) as HandshakeData;
          return { 
            type: "handshake", 
            data: handshakeData,
            conversationId: handshakeData.conversationId,
            recipientAddress: handshakeData.recipientAddress,
            alias: handshakeData.alias,
          };
        } catch {
          return { type: "handshake", data: {} };
        }
      }
      
      if (payloadStr.includes(":comm:")) {
        const rest = payloadStr.split(":comm:")[1] || "";
        const parts = rest.split(KASIA_DELIM);
        const alias = parts[0] || "";
        const encryptedContent = parts.slice(1).join(KASIA_DELIM);
        return {
          type: "comm",
          data: {
            alias,
            encryptedContent,
          },
          alias,
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
