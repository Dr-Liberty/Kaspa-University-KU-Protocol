
/**
 * Kasia On-Chain Indexer - PURE ON-CHAIN MODE
 * 
 * Indexes Kasia protocol messages from the Kaspa blockchain.
 * The PUBLIC KASIA INDEXER (https://indexer.kasia.fyi/) is the SOURCE OF TRUTH.
 * 
 * ARCHITECTURE:
 * - READ: ONLY from on-chain indexer (never from database)
 * - WRITE: Database is a write-only cache for performance
 * - All conversation/message data comes from the public indexer
 * - Database is NEVER used to retrieve message data
 * 
 * Protocol formats indexed:
 * - ciph_msg:1:hs:{convId}:{addr}:{alias}:{ts} - Handshake initiation
 * - ciph_msg:1:hr:{convId}:{addr}:{alias}:{ts} - Handshake response
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
import { getConversationsFromIndexer, isConversationActive, getMessagesForConversation } from "./kasia-client";

export interface IndexedConversation {
  id: string;
  initiatorAddress: string;
  recipientAddress: string;
  initiatorAlias?: string;
  recipientAlias?: string;
  alias?: string; // Kasia protocol alias for message correlation (derived from handshake)
  status: "pending" | "active" | "archived";
  handshakeTxHash?: string;
  responseTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
  isAdminConversation?: boolean;
  e2eInitiatorSig?: string | null;
  e2eRecipientSig?: string | null;
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
  // Per-wallet conversation cache to prevent cross-wallet leakage
  private walletConversations: Map<string, Map<string, IndexedConversation>> = new Map();
  private isRunning = false;
  private storage: any = null;
  private lastSyncTime: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private supportAddress: string = "";

  constructor() {
    console.log("[Kasia Indexer] Initialized on-chain message indexer (ON-CHAIN FIRST)");
  }

  /**
   * Normalize a Kaspa address to a canonical form for consistent cache keying
   * Strips network prefix and converts to lowercase for consistent comparison
   */
  private normalizeAddress(address: string): string {
    if (!address) return "";
    // Remove network prefix (kaspa: or kaspatest:) and lowercase
    return address.replace(/^kaspatest:/, "").replace(/^kaspa:/, "").toLowerCase().trim();
  }

  /**
   * Add a conversation to a wallet's per-wallet cache
   */
  private addToWalletCache(walletAddress: string, conversation: IndexedConversation): void {
    const normalizedWallet = this.normalizeAddress(walletAddress);
    if (!normalizedWallet) return;
    
    let walletCache = this.walletConversations.get(normalizedWallet);
    if (!walletCache) {
      walletCache = new Map();
      this.walletConversations.set(normalizedWallet, walletCache);
    }
    walletCache.set(conversation.id, conversation);
  }

  /**
   * Add a conversation to both participants' wallet caches
   */
  private addToBothWalletCaches(conversation: IndexedConversation): void {
    this.addToWalletCache(conversation.initiatorAddress, conversation);
    this.addToWalletCache(conversation.recipientAddress, conversation);
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
   * Validate if a txHash looks like a valid on-chain transaction hash
   * Rejects JSON garbage, objects, and other invalid formats
   */
  private isValidTxHash(txHash: string | undefined | null): boolean {
    if (!txHash) return false;
    if (typeof txHash !== 'string') return false;
    if (txHash.length < 60) return false; // Valid Kaspa txHashes are 64 chars
    if (txHash.startsWith('{')) return false; // JSON garbage
    if (txHash.includes(':')) return false; // Object stringification garbage
    if (!/^[0-9a-f]+$/i.test(txHash)) return false; // Not valid hex
    return true;
  }

  /**
   * Start the indexer with PURE ON-CHAIN approach
   * NEVER loads from database - only syncs from public Kasia indexer
   * Database is ONLY used for writing (caching), NEVER for reading
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log("[Kasia Indexer] Starting on-chain indexer (PURE ON-CHAIN MODE)...");
    this.isRunning = true;
    
    // Clear all caches - we will populate ONLY from on-chain indexer
    this.conversations.clear();
    this.messages.clear();
    this.handshakes.clear();
    this.walletConversations.clear(); // Clear per-wallet caches to prevent stale data
    
    // DO NOT load from database - database is write-only cache
    // All data comes from the public Kasia indexer (on-chain source of truth)
    console.log("[Kasia Indexer] Database is write-only cache - not loading from DB");
    
    // Sync from on-chain indexer for support address (async, don't block startup)
    if (this.supportAddress) {
      console.log(`[Kasia Indexer] Syncing from public indexer for support wallet...`);
      this.syncForWallet(this.supportAddress).catch(error => {
        console.error(`[Kasia Indexer] Background sync error: ${error.message}`);
      });
    }
    
    // Start periodic sync job (every 60 seconds)
    this.startPeriodicSync();
    
    console.log("[Kasia Indexer] Ready to index Kasia protocol messages (PURE ON-CHAIN)");
  }

  /**
   * Load only validated conversations from storage
   * Rejects records with invalid/garbage txHashes
   */
  private async loadValidatedFromStorage(): Promise<number> {
    if (!this.storage) return 0;
    
    try {
      let validCount = 0;
      
      const convertConversation = (conv: any): IndexedConversation | null => {
        // Skip conversations with garbage handshakeTxHash
        // These are stale records from before proper on-chain integration
        if (conv.handshakeTxHash && !this.isValidTxHash(conv.handshakeTxHash)) {
          console.log(`[Kasia Indexer] Skipping conversation ${conv.id} with invalid txHash`);
          return null;
        }
        
        return {
          id: conv.id,
          initiatorAddress: conv.initiatorAddress,
          recipientAddress: conv.recipientAddress,
          initiatorAlias: conv.initiatorAlias,
          recipientAlias: conv.recipientAlias,
          alias: conv.id,
          status: conv.status === "pending_handshake" || conv.status === "handshake_received" ? "pending" : 
                  conv.status === "active" ? "active" : 
                  conv.status === "archived" ? "archived" : "pending",
          handshakeTxHash: conv.handshakeTxHash,
          responseTxHash: conv.responseTxHash,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt || conv.createdAt),
          isAdminConversation: conv.isAdminConversation || false,
        };
      };
      
      // Load active conversations
      const activeConvs = await this.storage.getActiveConversations?.() || [];
      for (const conv of activeConvs) {
        const indexed = convertConversation(conv);
        if (indexed) {
          this.conversations.set(indexed.id, indexed);
          this.addToBothWalletCaches(indexed);
          validCount++;
          
          // Also load messages for active conversations
          try {
            const messages = await this.storage.getPrivateMessages(indexed.id, 100);
            for (const msg of messages) {
              const indexedMsg: IndexedMessage = {
                id: msg.id,
                txHash: msg.txHash || "",
                conversationId: msg.conversationId,
                senderAddress: msg.senderAddress,
                encryptedContent: msg.encryptedContent,
                timestamp: new Date(msg.createdAt),
              };
              this.messages.set(msg.id, indexedMsg);
            }
          } catch (error) {
            // Continue even if message loading fails
          }
        }
      }
      
      // Load pending conversations
      const pendingConvs = await this.storage.getPendingConversations?.() || [];
      for (const conv of pendingConvs) {
        const indexed = convertConversation(conv);
        if (indexed) {
          this.conversations.set(indexed.id, indexed);
          this.addToBothWalletCaches(indexed);
          validCount++;
        }
      }
      
      console.log(`[Kasia Indexer] Loaded ${this.messages.size} messages for validated conversations`);
      
      return validCount;
    } catch (error: any) {
      console.error(`[Kasia Indexer] Validated load error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Start periodic background sync from on-chain
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) return;
    
    const SYNC_INTERVAL_MS = 30_000; // 30 seconds (reduced from 60s for faster verification)
    
    this.syncInterval = setInterval(async () => {
      if (this.supportAddress) {
        try {
          await this.syncForWallet(this.supportAddress);
        } catch (error: any) {
          console.error(`[Kasia Indexer] Periodic sync error: ${error.message}`);
        }
      }
    }, SYNC_INTERVAL_MS);
    
    console.log("[Kasia Indexer] Started periodic on-chain sync (every 30s)");
  }

  /**
   * Sync conversations for a specific wallet from the public Kasia indexer
   * This is the ON-CHAIN FIRST approach - fetches from blockchain indexer
   * Uses UPSERT pattern to update existing records with on-chain state
   */
  async syncForWallet(walletAddress: string): Promise<number> {
    console.log(`[Kasia Indexer] Syncing from on-chain for ${walletAddress.slice(0, 20)}...`);
    
    try {
      const onChainConversations = await getConversationsFromIndexer(walletAddress);
      let syncedCount = 0;
      
      for (const conv of onChainConversations) {
        // Check existing data in DB first - database may have the TRUE initiator
        // (when treasury broadcasts on behalf of a user, indexer sees treasury as sender)
        let existingDb: any = null;
        if (this.storage) {
          try {
            existingDb = await this.storage.getConversation(conv.id);
          } catch (error: any) {
            // Ignore errors
          }
        }
        
        // Determine the TRUE initiator: prefer database (set at creation time) over indexer
        // The indexer may show treasury as initiator when it was actually relaying for a user
        let trueInitiator = conv.initiatorAddress;
        let trueRecipient = conv.recipientAddress;
        let trueInitiatorAlias = conv.initiatorAlias;
        
        if (existingDb && existingDb.initiatorAddress !== conv.initiatorAddress) {
          // Database has different initiator - trust the database
          // This happens when treasury relays handshakes on behalf of users
          if (existingDb.initiatorAddress !== this.supportAddress) {
            // DB initiator is not treasury, so it's the real user
            trueInitiator = existingDb.initiatorAddress;
            trueRecipient = existingDb.recipientAddress;
            trueInitiatorAlias = existingDb.initiatorAlias || conv.initiatorAlias;
          }
        }
        
        console.log(`[Kasia Indexer] Processing on-chain conversation: id=${conv.id}, initiator=${trueInitiator.slice(0, 20)}..., recipient=${trueRecipient.slice(0, 20)}..., status=${conv.status}, alias=${trueInitiatorAlias || 'none'}`);
        const isAdminConv = this.supportAddress ? 
          (trueInitiator === this.supportAddress || trueRecipient === this.supportAddress) : false;
        
        const indexed: IndexedConversation = {
          id: conv.id,
          initiatorAddress: trueInitiator,
          recipientAddress: trueRecipient,
          initiatorAlias: trueInitiatorAlias,
          alias: trueInitiatorAlias || conv.id, // Use handshake alias for message correlation, fallback to convId
          status: conv.status,
          handshakeTxHash: conv.handshakeTxHash,
          responseTxHash: conv.responseTxHash,
          createdAt: conv.createdAt,
          updatedAt: new Date(),
          isAdminConversation: isAdminConv,
        };
        
        // UPSERT: Update in-memory cache with on-chain data (blockchain is source of truth)
        // Generate a unique storage key that includes both participants to prevent ID collisions
        // Same conversation ID can occur when same initiator messages multiple recipients with same alias
        const initiatorNorm = this.normalizeAddress(trueInitiator);
        const recipientNorm = this.normalizeAddress(trueRecipient);
        const storageKey = `${conv.id}:${initiatorNorm}:${recipientNorm}`;
        
        // Check existing by storage key (not just conversation ID)
        const existing = this.conversations.get(storageKey);
        
        // Skip update if local is "active" but on-chain is still "pending"
        // Trust local state until on-chain confirms (prevents reversion after accept)
        if (existing?.status === "active" && conv.status === "pending") {
          console.log(`[Kasia Indexer] Skipping on-chain update for ${conv.id}: local is active, on-chain is pending (tx not indexed yet)`);
          continue;
        }
        
        const isNewOrUpdated = !existing || 
          existing.status !== conv.status ||
          existing.responseTxHash !== conv.responseTxHash ||
          existing.initiatorAlias !== conv.initiatorAlias;
        
        if (isNewOrUpdated) {
          // Preserve local data if it's newer
          if (existing) {
            indexed.recipientAlias = existing.recipientAlias || indexed.recipientAlias;
            // Also preserve initiator if existing has a non-treasury initiator
            if (existing.initiatorAddress !== this.supportAddress) {
              indexed.initiatorAddress = existing.initiatorAddress;
            }
          }
          // Store with composite key to prevent collisions, but keep original ID in object
          this.conversations.set(storageKey, indexed);
          
          // Add to per-wallet caches for both participants
          this.addToBothWalletCaches(indexed);
          
          syncedCount++;
          
          // UPSERT to database cache
          if (this.storage) {
            try {
              const dbStatus = indexed.status === "pending" ? "pending_handshake" : indexed.status;
              
              if (!existingDb) {
                // Insert new
                await this.storage.createConversation({
                  id: indexed.id,
                  initiatorAddress: indexed.initiatorAddress,
                  recipientAddress: indexed.recipientAddress,
                  status: dbStatus,
                  handshakeTxHash: indexed.handshakeTxHash,
                  initiatorAlias: indexed.initiatorAlias,
                  isAdminConversation: indexed.isAdminConversation,
                });
              } else if (existingDb.status !== dbStatus || existingDb.responseTxHash !== indexed.responseTxHash) {
                // Update existing with on-chain state (but preserve initiator!)
                await this.storage.updateConversationStatus(
                  conv.id, 
                  dbStatus, 
                  indexed.responseTxHash, 
                  indexed.recipientAlias
                );
              }
            } catch (error: any) {
              // Ignore cache errors
            }
          }
        }
      }
      
      this.lastSyncTime = new Date();
      if (syncedCount > 0) {
        console.log(`[Kasia Indexer] Synced ${syncedCount} conversations from on-chain`);
      }
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
   * Sync messages for a specific conversation from the public Kasia indexer
   * This fetches contextual messages from both participants and updates the local cache
   */
  async syncMessagesForConversation(conversationId: string): Promise<number> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      console.log(`[Kasia Indexer] Cannot sync messages - conversation ${conversationId} not found`);
      return 0;
    }
    
    // Kasia protocol uses alias for message correlation, fall back to conversationId
    // The alias is set during handshake and must match what was used when sending messages
    const messageAlias = conversation.alias || conversation.initiatorAlias || conversationId;
    
    console.log(`[Kasia Indexer] Syncing messages for conversation ${conversationId}`);
    console.log(`[Kasia Indexer] Initiator: ${conversation.initiatorAddress.slice(0, 20)}...`);
    console.log(`[Kasia Indexer] Recipient: ${conversation.recipientAddress.slice(0, 20)}...`);
    console.log(`[Kasia Indexer] Alias for query: ${messageAlias}`);
    
    try {
      // Try querying with both the alias and conversationId to find all messages
      const onChainMessages = await getMessagesForConversation(
        messageAlias,
        conversation.initiatorAddress,
        conversation.recipientAddress
      );
      
      // Also try with conversationId if different from alias
      let additionalMessages: typeof onChainMessages = [];
      if (messageAlias !== conversationId) {
        additionalMessages = await getMessagesForConversation(
          conversationId,
          conversation.initiatorAddress,
          conversation.recipientAddress
        );
      }
      
      // Merge results, avoiding duplicates by txId
      const allMessages = [...onChainMessages];
      const seenTxIds = new Set(onChainMessages.map(m => m.txId));
      for (const msg of additionalMessages) {
        if (!seenTxIds.has(msg.txId)) {
          allMessages.push(msg);
          seenTxIds.add(msg.txId);
        }
      }
      
      console.log(`[Kasia Indexer] Indexer returned ${allMessages.length} messages (alias: ${messageAlias}, convId: ${conversationId})`);
      
      let syncedCount = 0;
      
      for (const msg of allMessages) {
        const messageKey = msg.txId;
        if (!this.messages.has(messageKey)) {
          const indexed: IndexedMessage = {
            id: msg.txId,
            txHash: msg.txId,
            conversationId: conversationId,
            senderAddress: msg.sender,
            encryptedContent: msg.encryptedContent,
            timestamp: new Date(msg.blockTime),
          };
          
          this.messages.set(messageKey, indexed);
          syncedCount++;
          
          // Persist to database cache
          if (this.storage) {
            try {
              await this.storage.createPrivateMessage({
                id: indexed.id,
                conversationId: indexed.conversationId,
                senderAddress: indexed.senderAddress,
                encryptedContent: indexed.encryptedContent,
                txHash: indexed.txHash,
                txStatus: "confirmed",
              });
            } catch (error: any) {
              // Ignore duplicate errors
            }
          }
        }
      }
      
      if (syncedCount > 0) {
        console.log(`[Kasia Indexer] Synced ${syncedCount} messages from on-chain for conversation ${conversationId}`);
      }
      
      return syncedCount;
    } catch (error: any) {
      console.error(`[Kasia Indexer] Message sync error: ${error.message}`);
      return 0;
    }
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
        alias: conv.initiatorAlias || conv.id, // Use handshake alias for message correlation
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
        pending: allConversations.filter((c: any) => c.status === "pending" || c.status === "pending_handshake").length,
        active: allConversations.filter((c: any) => c.status === "active").length,
        archived: allConversations.filter((c: any) => c.status === "archived").length,
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
   * Stop the indexer and clean up resources
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log("[Kasia Indexer] Stopping indexer...");
    
    // Clear periodic sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
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
          alias: record.conversationId, // Kasia uses conversation ID as alias
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
      alias: params.id, // Kasia protocol uses conversation ID as the alias for message correlation
      status: params.status || "pending",
      handshakeTxHash: params.handshakeTxHash,
      isAdminConversation: params.isAdminConversation,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(params.id, conversation);
    
    // Add to per-wallet caches for both participants
    this.addToBothWalletCaches(conversation);
    
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
   * Get a conversation by ID (memory cache only - populated from on-chain sync)
   * STRICT MODE: No database fallback - only on-chain verified data is returned
   */
  async getConversation(id: string, participantWallet?: string): Promise<IndexedConversation | undefined> {
    // STRICT: Only return conversations that are in memory cache
    // Memory cache is populated from on-chain sync - no database fallback
    // With composite storage keys, we need to search by conversation ID, not storage key
    const normalizedParticipant = participantWallet ? this.normalizeAddress(participantWallet) : null;
    
    for (const conv of Array.from(this.conversations.values())) {
      if (conv.id === id) {
        // If a participant wallet is specified, only return if they're a participant
        if (normalizedParticipant) {
          const initiatorNorm = this.normalizeAddress(conv.initiatorAddress);
          const recipientNorm = this.normalizeAddress(conv.recipientAddress);
          if (initiatorNorm === normalizedParticipant || recipientNorm === normalizedParticipant) {
            return conv;
          }
        } else {
          return conv;
        }
      }
    }
    return undefined;
  }

  /**
   * Get a conversation by ID (sync version for quick checks)
   */
  getConversationSync(id: string, participantWallet?: string): IndexedConversation | undefined {
    const normalizedParticipant = participantWallet ? this.normalizeAddress(participantWallet) : null;
    
    for (const conv of Array.from(this.conversations.values())) {
      if (conv.id === id) {
        // If a participant wallet is specified, only return if they're a participant
        if (normalizedParticipant) {
          const initiatorNorm = this.normalizeAddress(conv.initiatorAddress);
          const recipientNorm = this.normalizeAddress(conv.recipientAddress);
          if (initiatorNorm === normalizedParticipant || recipientNorm === normalizedParticipant) {
            return conv;
          }
        } else {
          return conv;
        }
      }
    }
    return undefined;
  }

  /**
   * Get all conversations for a wallet address
   * First checks per-wallet cache, then scans global conversations map for any
   * where the wallet is a participant (handles case where indexer returns empty
   * but conversations exist from other participant's sync)
   */
  getConversationsForWallet(walletAddress: string): IndexedConversation[] {
    const normalizedWallet = this.normalizeAddress(walletAddress);
    if (!normalizedWallet) {
      console.log(`[Kasia Indexer] getConversationsForWallet: invalid wallet address`);
      return [];
    }
    
    // Get from per-wallet cache first (fast path)
    const walletCache = this.walletConversations.get(normalizedWallet);
    
    // Also scan global conversations map for any where this wallet is a participant
    // This handles the case where the Kasia indexer returns empty for this wallet
    // but conversations exist from another participant's sync (e.g., treasury sync)
    const globalMatches: IndexedConversation[] = [];
    for (const conv of Array.from(this.conversations.values())) {
      const initiatorNorm = this.normalizeAddress(conv.initiatorAddress);
      const recipientNorm = this.normalizeAddress(conv.recipientAddress);
      if (initiatorNorm === normalizedWallet || recipientNorm === normalizedWallet) {
        globalMatches.push(conv);
        // Also add to per-wallet cache for future lookups
        this.addToWalletCache(walletAddress, conv);
      }
    }
    
    // Merge wallet cache and global matches (dedupe by ID)
    const conversationsMap = new Map<string, IndexedConversation>();
    
    if (walletCache) {
      for (const conv of Array.from(walletCache.values())) {
        conversationsMap.set(conv.id, conv);
      }
    }
    
    for (const conv of globalMatches) {
      conversationsMap.set(conv.id, conv);
    }
    
    const conversations = Array.from(conversationsMap.values());
    
    if (conversations.length === 0) {
      console.log(`[Kasia Indexer] getConversationsForWallet: no conversations for ${walletAddress.slice(0, 20)}... (normalized: ${normalizedWallet.slice(0,15)}...) - checked wallet cache and global map`);
      return [];
    }
    
    console.log(`[Kasia Indexer] getConversationsForWallet: returning ${conversations.length} conversations for ${walletAddress.slice(0, 20)}... (cache: ${walletCache?.size || 0}, global: ${globalMatches.length})`);
    for (const conv of conversations) {
      console.log(`[Kasia Indexer]   - ${conv.id}: status=${conv.status}, initiator=${conv.initiatorAddress.slice(0,15)}..., recipient=${conv.recipientAddress.slice(0,15)}...`);
    }
    
    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get all conversations for a wallet by querying the public Kasia indexer
   * STRICT MODE: This is the ONLY source of truth - no local fallbacks
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
        alias: conv.id, // Kasia protocol uses conversation ID as alias
        status: conv.status,
        handshakeTxHash: conv.handshakeTxHash,
        responseTxHash: conv.responseTxHash,
        createdAt: conv.createdAt,
        updatedAt: conv.createdAt,
      }));
      
      console.log(`[Kasia Indexer] Found ${onChainConversations.length} on-chain conversations (STRICT MODE - no local fallback)`);
      
      return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      console.error(`[Kasia Indexer] Error fetching on-chain conversations: ${error.message}`);
      // STRICT MODE: Return empty array on error, don't fall back to local data
      return [];
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
      const oldStatus = conv.status;
      conv.status = status;
      if (responseTxHash) conv.responseTxHash = responseTxHash;
      if (recipientAlias) conv.recipientAlias = recipientAlias;
      conv.updatedAt = new Date();
      this.conversations.set(id, conv);
      
      console.log(`[Kasia Indexer] updateConversationStatus: ${id} status ${oldStatus} -> ${status}`);
      console.log(`[Kasia Indexer] Updating wallet caches for initiator=${conv.initiatorAddress.slice(0,20)}..., recipient=${conv.recipientAddress.slice(0,20)}...`);
      
      // Update per-wallet caches for both participants
      this.addToBothWalletCaches(conv);
      
      // Persist to database
      if (this.storage) {
        try {
          const dbStatus = status === "pending" ? "pending_handshake" : status;
          await this.storage.updateConversationStatus(id, dbStatus, responseTxHash, recipientAlias);
        } catch (error: any) {
          console.error(`[Kasia Indexer] Storage update error: ${error.message}`);
        }
      }
    } else {
      console.error(`[Kasia Indexer] updateConversationStatus: conversation ${id} NOT FOUND in global Map`);
    }
  }

  /**
   * Delete a conversation (for cleaning up stale records without on-chain proof)
   */
  async deleteConversation(id: string): Promise<void> {
    // Get conversation before deleting to know which wallet caches to update
    const conv = this.conversations.get(id);
    
    // Remove from in-memory cache
    this.conversations.delete(id);
    
    // Remove from per-wallet caches
    if (conv) {
      const initiatorNorm = this.normalizeAddress(conv.initiatorAddress);
      const recipientNorm = this.normalizeAddress(conv.recipientAddress);
      
      const initiatorCache = this.walletConversations.get(initiatorNorm);
      if (initiatorCache) initiatorCache.delete(id);
      
      const recipientCache = this.walletConversations.get(recipientNorm);
      if (recipientCache) recipientCache.delete(id);
    }
    
    // Remove from database
    if (this.storage) {
      try {
        await this.storage.deleteConversation(id);
      } catch (error: any) {
        console.error(`[Kasia Indexer] Delete conversation error: ${error.message}`);
      }
    }
    
    console.log(`[Kasia Indexer] Deleted stale conversation: ${id}`);
  }

  /**
   * Get messages for a conversation
   */
  getMessages(conversationId: string, limit = 50, offset = 0): IndexedMessage[] {
    // Debug: Log all message conversation IDs
    const allMsgs = Array.from(this.messages.values());
    console.log(`[Kasia Indexer] getMessages for convId=${conversationId}: total messages in cache=${allMsgs.length}`);
    if (allMsgs.length > 0) {
      const uniqueConvIds = Array.from(new Set(allMsgs.map(m => m.conversationId)));
      console.log(`[Kasia Indexer]   Unique convIds in cache: ${uniqueConvIds.join(", ")}`);
    }
    
    const filtered = allMsgs
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(offset, offset + limit);
    
    console.log(`[Kasia Indexer]   Found ${filtered.length} messages matching convId=${conversationId}`);
    return filtered;
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
