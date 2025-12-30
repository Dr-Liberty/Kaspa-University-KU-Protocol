/**
 * Kasia Protocol Implementation
 * 
 * Implements the Kasia messaging protocol for ecosystem compatibility.
 * Based on https://github.com/K-Kluster/Kasia
 * 
 * Protocol format: {VERSION}:{type}:{data}
 * 
 * Types:
 * - bcast: Public broadcast message (plain text)
 * 
 * Using Kasia protocol enables:
 * - Cross-platform discovery via Kasia indexers
 * - Ecosystem compatibility with other Kaspa apps
 * - Standard message format for decentralized communication
 * 
 * Note: This is a simplified implementation using plain text broadcasts.
 * Metadata (lesson ID, author address) is stored server-side.
 * 
 * KU Protocol (ku-protocol.ts) is still used for:
 * - Quiz result proofs (Kaspa University-specific)
 * - Certificate records
 */

// Protocol configuration (matches Kasia's config/protocol.ts)
export const KASIA_VERSION = "1";
export const KASIA_DELIM = ":";

// Message types
export type KasiaMessageType = "bcast" | "handshake" | "comm" | "payment" | "self_stash";

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

// Create protocol header
const createHeader = (type: KasiaMessageType) => {
  const str = `${KASIA_VERSION}${KASIA_DELIM}${type}${KASIA_DELIM}`;
  return { type, string: str, hex: stringToHex(str) };
};

// Protocol headers (pre-computed hex values for efficiency)
export const KASIA_PROTOCOL = {
  version: KASIA_VERSION,
  delim: KASIA_DELIM,
  headers: {
    BROADCAST: createHeader("bcast"),
    HANDSHAKE: createHeader("handshake"),
    COMM: createHeader("comm"),
    PAYMENT: createHeader("payment"),
    SELF_STASH: createHeader("self_stash"),
  },
} as const;

/**
 * Maximum content length for on-chain storage
 * Content is truncated to this limit for transaction size management
 */
export const MAX_BROADCAST_CONTENT_LENGTH = 500;

/**
 * Maximum payload size in bytes
 * Kaspa allows ~84KB but we stay conservative for comments
 */
export const MAX_BROADCAST_BYTES = 2048;

/**
 * Create a plain text broadcast payload
 * Format: 1:bcast:{content}
 * 
 * Returns hex-encoded string ready for transaction payload
 */
export function createBroadcast(content: string): string {
  // Truncate content to stay within size limits
  const truncatedContent = content.slice(0, MAX_BROADCAST_CONTENT_LENGTH);
  
  // Wrap in Kasia broadcast format: 1:bcast:{content}
  const fullPayload = KASIA_PROTOCOL.headers.BROADCAST.string + truncatedContent;
  
  return stringToHex(fullPayload);
}

/**
 * Parsed Kasia broadcast message
 */
export interface ParsedKasiaBroadcast {
  version: string;
  type: KasiaMessageType;
  content: string;
}

/**
 * Check if a transaction payload is a Kasia broadcast message
 */
export function isKasiaBroadcast(payloadHex: string): boolean {
  return payloadHex.startsWith(KASIA_PROTOCOL.headers.BROADCAST.hex);
}

/**
 * Parse a Kasia broadcast message from transaction payload
 */
export function parseKasiaBroadcast(payloadHex: string): ParsedKasiaBroadcast | null {
  if (!isKasiaBroadcast(payloadHex)) {
    return null;
  }

  try {
    const payloadStr = hexToString(payloadHex);
    const parts = payloadStr.split(KASIA_DELIM);
    
    if (parts.length < 3) {
      return null;
    }

    const version = parts[0];
    const type = parts[1] as KasiaMessageType;
    // Content is everything after "1:bcast:"
    const content = parts.slice(2).join(KASIA_DELIM);

    return { version, type, content };
  } catch (error) {
    console.error("[Kasia Protocol] Failed to parse payload:", error);
    return null;
  }
}

/**
 * Validate payload size before creating transaction
 */
export function validateBroadcastSize(payloadHex: string): boolean {
  return payloadHex.length / 2 <= MAX_BROADCAST_BYTES;
}
