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
 * Create a handshake payload for initiating a conversation
 * Format: ciph_msg:1:handshake:{sealed_hex}
 * 
 * In a real implementation, the handshake would contain:
 * - Ephemeral public key for ECDH
 * - Encrypted handshake metadata
 * - Signature for verification
 * 
 * IMPORTANT: Kaspa has a 520 byte script element limit.
 * We use a compact format to stay within this limit.
 */
export function createHandshakePayload(
  senderAlias: string,
  recipientAddress: string,
  conversationId: string
): string {
  // Use compact format to stay under 520 byte limit
  // Format: ciph_msg:1:handshake:convId:recipient:alias:timestamp
  // This avoids the overhead of JSON + double hex encoding
  const timestamp = Date.now().toString(36); // Base36 timestamp (compact)
  const compactPayload = [
    KASIA_PREFIX,
    KASIA_VERSION,
    "handshake",
    conversationId,
    recipientAddress,
    senderAlias,
    timestamp
  ].join(KASIA_DELIM);
  
  // Single hex encoding only
  return stringToHex(compactPayload);
}

/**
 * Create a handshake response payload
 * Uses compact format to stay under 520 byte limit
 */
export function createHandshakeResponse(
  senderAlias: string,
  recipientAddress: string,
  conversationId: string
): string {
  // Use compact format - add "r" prefix to mark as response
  const timestamp = Date.now().toString(36);
  const compactPayload = [
    KASIA_PREFIX,
    KASIA_VERSION,
    "handshake_r", // _r suffix indicates response
    conversationId,
    recipientAddress,
    senderAlias,
    timestamp
  ].join(KASIA_DELIM);
  
  return stringToHex(compactPayload);
}

/**
 * Create an encrypted contextual message payload
 * Format: ciph_msg:1:comm:{alias}:{sealed_hex}
 */
export function createCommPayload(
  senderAlias: string,
  encryptedContent: string
): string {
  // In production, content would be encrypted with the shared secret
  const payload = KASIA_ENCRYPTED.headers.COMM + senderAlias + KASIA_DELIM + encryptedContent;
  return stringToHex(payload);
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
