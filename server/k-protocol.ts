/**
 * K Protocol Implementation
 * 
 * Implements the K microblogging protocol for public comments and Q&A.
 * Based on https://github.com/thesheepcat/K-indexer
 * 
 * Protocol format: k:1:{action}:{sender_pubkey}:{sender_signature}:{base64_message}:{mentioned_pubkeys}:{reference_tx_id}
 * 
 * Actions:
 * - post: Create a new post (lesson comment)
 * - reply: Reply to an existing post
 * - vote: Upvote a post
 * 
 * Using K Protocol enables:
 * - Cross-platform discovery via K-indexer
 * - Ecosystem compatibility with K Social and other Kaspa apps
 * - Standard message format for decentralized microblogging
 */

// Protocol configuration
export const K_VERSION = "1";
export const K_DELIM = ":";
export const K_PREFIX = "k";

// Message types
export type KProtocolAction = "post" | "reply" | "vote" | "broadcast";

// Convert string to base64
export const stringToBase64 = (str: string): string => {
  return Buffer.from(str, 'utf-8').toString('base64');
};

// Convert base64 to string
export const base64ToString = (base64: string): string => {
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return "";
  }
};

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

// K Protocol headers
export const K_PROTOCOL = {
  version: K_VERSION,
  delim: K_DELIM,
  prefix: K_PREFIX,
  actions: {
    POST: "post",
    REPLY: "reply",
    VOTE: "vote",
    BROADCAST: "broadcast",
  },
} as const;

/**
 * Maximum content length for on-chain storage
 */
export const MAX_K_CONTENT_LENGTH = 1000;

/**
 * Maximum payload size in bytes (conservative for K protocol)
 */
export const MAX_K_PAYLOAD_BYTES = 4096;

/**
 * Interface for K Protocol post payload
 */
export interface KPostPayload {
  action: "post";
  senderPubkey: string;
  senderSignature: string;
  message: string;
  mentionedPubkeys: string[];
}

/**
 * Interface for K Protocol reply payload
 */
export interface KReplyPayload {
  action: "reply";
  senderPubkey: string;
  senderSignature: string;
  message: string;
  mentionedPubkeys: string[];
  referenceTxId: string;
}

/**
 * Interface for K Protocol vote payload
 */
export interface KVotePayload {
  action: "vote";
  senderPubkey: string;
  senderSignature: string;
  referenceTxId: string;
}

export type KPayload = KPostPayload | KReplyPayload | KVotePayload;

/**
 * Parsed K Protocol message
 */
export interface ParsedKMessage {
  version: string;
  action: KProtocolAction;
  senderPubkey: string;
  senderSignature: string;
  message?: string;
  mentionedPubkeys?: string[];
  referenceTxId?: string;
}

/**
 * Create a K Protocol post payload
 * Format: k:1:post:sender_pubkey:sender_signature:base64_encoded_message:mentioned_pubkeys
 * 
 * Returns hex-encoded string ready for transaction payload
 */
export function createKPost(
  senderPubkey: string,
  senderSignature: string,
  message: string,
  mentionedPubkeys: string[] = []
): string {
  const truncatedMessage = message.slice(0, MAX_K_CONTENT_LENGTH);
  const base64Message = stringToBase64(truncatedMessage);
  const mentionsStr = mentionedPubkeys.length > 0 ? mentionedPubkeys.join(",") : "";
  
  // k:1:post:pubkey:signature:base64message:mentions
  const payload = [
    K_PREFIX,
    K_VERSION,
    K_PROTOCOL.actions.POST,
    senderPubkey,
    senderSignature,
    base64Message,
    mentionsStr,
  ].join(K_DELIM);
  
  return stringToHex(payload);
}

/**
 * Create a K Protocol reply payload
 * Format: k:1:reply:sender_pubkey:sender_signature:base64_encoded_message:mentioned_pubkeys:reference_tx_id
 * 
 * Returns hex-encoded string ready for transaction payload
 */
export function createKReply(
  senderPubkey: string,
  senderSignature: string,
  message: string,
  referenceTxId: string,
  mentionedPubkeys: string[] = []
): string {
  const truncatedMessage = message.slice(0, MAX_K_CONTENT_LENGTH);
  const base64Message = stringToBase64(truncatedMessage);
  const mentionsStr = mentionedPubkeys.length > 0 ? mentionedPubkeys.join(",") : "";
  
  // k:1:reply:pubkey:signature:base64message:mentions:referenceTxId
  const payload = [
    K_PREFIX,
    K_VERSION,
    K_PROTOCOL.actions.REPLY,
    senderPubkey,
    senderSignature,
    base64Message,
    mentionsStr,
    referenceTxId,
  ].join(K_DELIM);
  
  return stringToHex(payload);
}

/**
 * Create a K Protocol vote payload
 * Format: k:1:vote:sender_pubkey:sender_signature:reference_tx_id
 */
export function createKVote(
  senderPubkey: string,
  senderSignature: string,
  referenceTxId: string
): string {
  const payload = [
    K_PREFIX,
    K_VERSION,
    "vote",
    senderPubkey,
    senderSignature,
    referenceTxId,
  ].join(K_DELIM);
  
  return stringToHex(payload);
}

/**
 * Check if a transaction payload is a K protocol message
 */
export function isKProtocolPayload(payloadHex: string): boolean {
  const prefix = stringToHex(`${K_PREFIX}${K_DELIM}${K_VERSION}${K_DELIM}`);
  return payloadHex.startsWith(prefix);
}

/**
 * Parse a K protocol message from transaction payload
 */
export function parseKPayload(payloadHex: string): ParsedKMessage | null {
  if (!isKProtocolPayload(payloadHex)) {
    return null;
  }

  try {
    const payloadStr = hexToString(payloadHex);
    const parts = payloadStr.split(K_DELIM);
    
    if (parts.length < 4) {
      return null;
    }

    const [prefix, version, action, senderPubkey, senderSignature, ...rest] = parts;
    
    if (prefix !== K_PREFIX || version !== K_VERSION) {
      return null;
    }

    const result: ParsedKMessage = {
      version,
      action: action as KProtocolAction,
      senderPubkey,
      senderSignature,
    };

    if (action === K_PROTOCOL.actions.POST || action === K_PROTOCOL.actions.REPLY) {
      const base64Message = rest[0] || "";
      const mentionsStr = rest[1] || "";
      
      result.message = base64ToString(base64Message);
      result.mentionedPubkeys = mentionsStr ? mentionsStr.split(",").filter(Boolean) : [];
      
      if (action === K_PROTOCOL.actions.REPLY) {
        result.referenceTxId = rest[2] || "";
      }
    } else if (action === "vote") {
      result.referenceTxId = rest[0] || "";
    }

    return result;
  } catch (error) {
    console.error("[K Protocol] Failed to parse payload:", error);
    return null;
  }
}

/**
 * Validate payload size before creating transaction
 */
export function validateKPayloadSize(payloadHex: string): boolean {
  return payloadHex.length / 2 <= MAX_K_PAYLOAD_BYTES;
}

/**
 * Create the message that needs to be signed for K Protocol
 * The signature proves the sender owns the private key
 */
export function createMessageToSign(action: KProtocolAction, content: string, referenceTxId?: string): string {
  const timestamp = Date.now().toString();
  if (action === "reply" && referenceTxId) {
    return `k:${action}:${content}:${referenceTxId}:${timestamp}`;
  }
  return `k:${action}:${content}:${timestamp}`;
}

/**
 * K-Indexer API client for querying indexed K protocol messages
 */
export class KIndexerClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://api.ksocial.app") {
    this.baseUrl = baseUrl;
  }

  /**
   * Get posts by a specific wallet address
   */
  async getPostsByAddress(address: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/posts?address=${address}&limit=${limit}`
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("[K-Indexer] Failed to fetch posts:", error);
      return [];
    }
  }

  /**
   * Get replies to a specific post
   */
  async getReplies(postTxId: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/replies?tx_id=${postTxId}&limit=${limit}`
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("[K-Indexer] Failed to fetch replies:", error);
      return [];
    }
  }

  /**
   * Search posts by content
   */
  async searchPosts(query: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("[K-Indexer] Failed to search posts:", error);
      return [];
    }
  }
}

// Export singleton client instance
export const kIndexer = new KIndexerClient();
