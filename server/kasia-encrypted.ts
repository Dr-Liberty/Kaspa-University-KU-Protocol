/**
 * Kasia Encrypted Messaging Service
 * 
 * Implements the Kasia encrypted messaging protocol for private P2P communication.
 * Based on https://github.com/K-Kluster/Kasia
 * 
 * Protocol formats:
 * - ciph_msg:1:handshake:{sealed_hex} - Initiate encrypted conversation
 * - ciph_msg:1:comm:{alias}:{sealed_hex} - Contextual message in conversation
 * - ciph_msg:1:payment:{sealed_hex} - Payment with message
 * 
 * Key Features:
 * - End-to-end encryption using ECDH key exchange
 * - Handshake-based conversation initiation
 * - Indexed by Kasia indexer for P2P discovery
 */

// Protocol configuration (matches Kasia's config/protocol.ts)
export const KASIA_VERSION = "1";
export const KASIA_DELIM = ":";
export const KASIA_PREFIX = "ciph_msg";

// Convert string to hex (UTF-8 encoding)
export const stringToHex = (str: string): string =>
  Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// Convert hex to string
export const hexToString = (hex: string): string => {
  if (!hex || hex.length % 2 !== 0) return "";
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
};

// Message types
export type KasiaMessageType = "handshake" | "comm" | "payment" | "self_stash";

// Kasia Protocol headers
export const KASIA_ENCRYPTED = {
  version: KASIA_VERSION,
  delim: KASIA_DELIM,
  prefix: KASIA_PREFIX,
  headers: {
    HANDSHAKE: `${KASIA_PREFIX}${KASIA_DELIM}${KASIA_VERSION}${KASIA_DELIM}handshake${KASIA_DELIM}`,
    COMM: `${KASIA_PREFIX}${KASIA_DELIM}${KASIA_VERSION}${KASIA_DELIM}comm${KASIA_DELIM}`,
    PAYMENT: `${KASIA_PREFIX}${KASIA_DELIM}${KASIA_VERSION}${KASIA_DELIM}payment${KASIA_DELIM}`,
    SELF_STASH: `${KASIA_PREFIX}${KASIA_DELIM}${KASIA_VERSION}${KASIA_DELIM}self_stash${KASIA_DELIM}`,
  },
} as const;

/**
 * Handshake data structure
 */
export interface HandshakeData {
  alias: string;
  timestamp: string;
  conversationId: string;
  version: number;
  recipientAddress: string;
  sendToRecipient: boolean;
  isResponse?: boolean;
}

/**
 * Contextual message data structure
 */
export interface ContextualMessageData {
  alias: string;
  content: string;
}

/**
 * Conversation status
 */
export type ConversationStatus = 
  | "pending_handshake"    // Handshake sent, waiting for response
  | "handshake_received"   // Received handshake, need to respond
  | "active"               // Both parties have handshaked, can exchange messages
  | "archived";            // Conversation archived

/**
 * Conversation record
 */
export interface Conversation {
  id: string;
  initiatorAddress: string;
  recipientAddress: string;
  status: ConversationStatus;
  handshakeTxHash?: string;
  responseTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Private message record
 */
export interface PrivateMessage {
  id: string;
  conversationId: string;
  senderAddress: string;
  encryptedContent: string;
  txHash: string;
  createdAt: Date;
}

/**
 * Shorten Kaspa address to fit payload budget
 * Takes first 20 chars of address (after stripping prefix)
 * This is enough for unique identification within a conversation context
 */
function shortenAddress(address: string): string {
  const withoutPrefix = address.replace(/^kaspa(test)?:/, '');
  return withoutPrefix.slice(0, 20);
}

/**
 * Shorten conversation ID to fit payload budget
 * Takes first 8 chars of the hex ID for compact representation
 */
function shortenConversationId(conversationId: string): string {
  return conversationId.slice(0, 8);
}

/**
 * Truncate alias to max 6 chars to fit payload budget
 */
function truncateAlias(alias: string): string {
  return alias.slice(0, 6).replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * KASPA OP_RETURN PAYLOAD BUDGET: ~80 bytes (HARD LIMIT)
 * 
 * The Kasia handshake must fit within Kaspa's storage mass limit.
 * Format: ciph_msg:1:hs:{shortConvId}:{shortAddr}:{alias}:{ts}
 * 
 * Budget breakdown (target ≤75 bytes):
 * - ciph_msg:1:hs: = 13 chars
 * - shortConvId = 8 chars
 * - : + shortAddr = 21 chars (20 char truncated address)
 * - : + alias = 7 chars max (6 char alias)
 * - : + timestampBase36 = 9 chars
 * Total: ~58 bytes ✓ (well under limit)
 */
export function createHandshakePayload(
  senderAlias: string,
  recipientAddress: string,
  conversationId: string
): string {
  const timestampBase36 = Date.now().toString(36);
  const shortAddr = shortenAddress(recipientAddress);
  const shortConvId = shortenConversationId(conversationId);
  const safeAlias = truncateAlias(senderAlias);
  
  // Compact format using 'hs' for handshake to save bytes
  // Format: ciph_msg:1:hs:{shortConvId}:{shortAddr}:{alias}:{ts}
  const rawPayload = [
    KASIA_PREFIX,
    KASIA_VERSION,
    "hs",
    shortConvId,
    shortAddr,
    safeAlias,
    timestampBase36
  ].join(KASIA_DELIM);
  
  console.log(`[Kasia] Handshake payload: ${rawPayload.length} bytes`);
  
  if (rawPayload.length > 78) {
    console.warn(`[Kasia] WARNING: Handshake payload exceeds 78 bytes (${rawPayload.length}), may be rejected`);
  }
  
  return stringToHex(rawPayload);
}

/**
 * Create handshake response (acceptance)
 * Uses 'hr' for handshake_response to save bytes
 */
export function createHandshakeResponse(
  senderAlias: string,
  recipientAddress: string,
  conversationId: string
): string {
  const timestampBase36 = Date.now().toString(36);
  const shortAddr = shortenAddress(recipientAddress);
  const shortConvId = shortenConversationId(conversationId);
  const safeAlias = truncateAlias(senderAlias);
  
  // Compact format using 'hr' for handshake_response
  const rawPayload = [
    KASIA_PREFIX,
    KASIA_VERSION,
    "hr",
    shortConvId,
    shortAddr,
    safeAlias,
    timestampBase36
  ].join(KASIA_DELIM);
  
  console.log(`[Kasia] Handshake response payload: ${rawPayload.length} bytes`);
  
  return stringToHex(rawPayload);
}

// Maximum message length in bytes (Kaspa storage mass limit ~80 bytes for OP_RETURN)
// After hex encoding + protocol overhead, limit raw message to ~100 chars
export const MAX_MESSAGE_LENGTH = 100;

/**
 * Create a contextual message payload
 * 
 * Official Kasia protocol format (V1):
 * - Raw bytes: ciph_msg:1:comm:{alias}:{sealed_hex}
 * - sealed_hex contains encrypted message content (hex-encoded once)
 * 
 * IMPORTANT: We return the raw payload string, NOT hex-encoded.
 * The caller (frontend) passes this directly to KasWare's payload field.
 * KasWare handles the transaction encoding internally.
 */
export function createCommPayload(
  conversationAlias: string,
  messageContent: string
): string {
  // Truncate message if too long to avoid storage mass errors
  const truncatedContent = messageContent.slice(0, MAX_MESSAGE_LENGTH);
  
  // Hex-encode only the message content (single encoding)
  const sealedContent = stringToHex(truncatedContent);
  
  // Create the raw payload string (NOT hex-encoded again)
  // Format: ciph_msg:1:comm:{alias}:{sealed_hex}
  const rawPayload = `${KASIA_PREFIX}${KASIA_DELIM}${KASIA_VERSION}${KASIA_DELIM}comm${KASIA_DELIM}${conversationAlias}${KASIA_DELIM}${sealedContent}`;
  
  return rawPayload;
}

/**
 * Check if a transaction payload is a Kasia encrypted message
 */
export function isKasiaEncrypted(payloadHex: string): boolean {
  const prefix = stringToHex(KASIA_PREFIX + KASIA_DELIM);
  return payloadHex.startsWith(prefix);
}

/**
 * Parsed Kasia encrypted message
 */
export interface ParsedKasiaMessage {
  type: KasiaMessageType;
  data: string;
  alias?: string;
}

/**
 * Parse a Kasia encrypted message from transaction payload
 */
export function parseKasiaPayload(payloadHex: string): ParsedKasiaMessage | null {
  if (!isKasiaEncrypted(payloadHex)) {
    return null;
  }

  try {
    const payloadStr = hexToString(payloadHex);
    
    // Check for each message type
    if (payloadStr.startsWith(KASIA_ENCRYPTED.headers.HANDSHAKE)) {
      const data = payloadStr.slice(KASIA_ENCRYPTED.headers.HANDSHAKE.length);
      return { type: "handshake", data };
    }
    
    if (payloadStr.startsWith(KASIA_ENCRYPTED.headers.COMM)) {
      const rest = payloadStr.slice(KASIA_ENCRYPTED.headers.COMM.length);
      const delimIndex = rest.indexOf(KASIA_DELIM);
      if (delimIndex > 0) {
        const alias = rest.slice(0, delimIndex);
        const data = rest.slice(delimIndex + 1);
        return { type: "comm", alias, data };
      }
    }
    
    if (payloadStr.startsWith(KASIA_ENCRYPTED.headers.PAYMENT)) {
      const data = payloadStr.slice(KASIA_ENCRYPTED.headers.PAYMENT.length);
      return { type: "payment", data };
    }

    return null;
  } catch (error) {
    console.error("[Kasia Encrypted] Failed to parse payload:", error);
    return null;
  }
}

/**
 * Generate a unique conversation ID
 * Uses both addresses to create a deterministic ID
 */
export function generateConversationId(address1: string, address2: string): string {
  // Sort addresses to ensure same ID regardless of who initiates
  const sorted = [address1, address2].sort();
  const combined = sorted.join(":");
  // Simple hash for conversation ID
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

/**
 * Kasia Indexer API client for querying encrypted messages
 */
export class KasiaIndexerClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://indexer.kasia.fyi") {
    this.baseUrl = baseUrl;
  }

  /**
   * Get handshakes for a specific address
   */
  async getHandshakes(address: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/handshakes?address=${address}`
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("[Kasia Indexer] Failed to fetch handshakes:", error);
      return [];
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/messages?conversation_id=${conversationId}`
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("[Kasia Indexer] Failed to fetch messages:", error);
      return [];
    }
  }

  /**
   * Check indexer health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton client instance
export const kasiaIndexer = new KasiaIndexerClient();

/**
 * Communication Service
 * 
 * Unified service for managing both public (K Protocol) and private (Kasia) messaging
 */
export class CommunicationService {
  private adminAddress: string;

  constructor(adminAddress?: string) {
    this.adminAddress = adminAddress || process.env.ADMIN_WALLET_ADDRESS || "";
  }

  /**
   * Check if the message is to/from admin
   */
  isAdminConversation(address1: string, address2: string): boolean {
    return address1 === this.adminAddress || address2 === this.adminAddress;
  }

  /**
   * Get display name for an address
   * Returns "Admin" for admin address, truncated address otherwise
   */
  getDisplayName(address: string, alias?: string): string {
    if (address === this.adminAddress) {
      return "Kaspa University Admin";
    }
    if (alias) {
      return alias;
    }
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }
}

export const communicationService = new CommunicationService();
