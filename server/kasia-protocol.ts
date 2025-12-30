/**
 * Kasia Protocol Implementation
 * 
 * Implements the Kasia messaging protocol for ecosystem compatibility.
 * Based on https://github.com/K-Kluster/Kasia
 * 
 * Protocol format: {VERSION}:{type}:{data}
 * 
 * Types:
 * - bcast: Public broadcast message (for Q&A, comments, discussions)
 * 
 * Using Kasia protocol enables:
 * - Cross-platform discovery via Kasia indexers
 * - Ecosystem compatibility with other Kaspa apps
 * - Standard message format for decentralized communication
 * 
 * Note: KU Protocol (ku-protocol.ts) is still used for:
 * - Quiz result proofs (Kaspa University-specific)
 * - Certificate records
 */

import { createHash } from "crypto";

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
 * Kaspa University Broadcast Data Structure
 * 
 * For Q&A and discussions, we embed structured data in the broadcast message.
 * Format: 1:bcast:ku_qa:{version}:{type}:{data}
 * 
 * This allows Kasia indexers to pick up the message while we maintain
 * structure for our specific use case.
 */

// Sub-types for KU broadcasts within Kasia
export type KUBroadcastType = "qa_q" | "qa_a" | "comment";

// KU Broadcast prefix (embedded in bcast data)
export const KU_BROADCAST_PREFIX = "ku_qa";
export const KU_BROADCAST_VERSION = "1";

/**
 * Q&A Question Payload (broadcast)
 * Full format: 1:bcast:ku_qa:1:qa_q:{lessonId}:{authorAddress}:{timestamp}:{contentHash}:{content}
 */
export interface QAQuestionBroadcast {
  lessonId: string;
  authorAddress: string;
  timestamp: number;
  contentHash: string;
  content: string;
}

/**
 * Q&A Answer Payload (broadcast)
 * Full format: 1:bcast:ku_qa:1:qa_a:{questionTxId}:{authorAddress}:{timestamp}:{contentHash}:{content}
 */
export interface QAAnswerBroadcast {
  questionTxId: string;
  authorAddress: string;
  timestamp: number;
  contentHash: string;
  content: string;
}

/**
 * Create a content hash for verification
 */
export function createContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Create a KU broadcast data string
 */
function createKUBroadcastData(type: KUBroadcastType, fields: string[]): string {
  return [KU_BROADCAST_PREFIX, KU_BROADCAST_VERSION, type, ...fields].join(KASIA_DELIM);
}

/**
 * Maximum content length for on-chain storage
 * Content is truncated to this limit before hashing and storage
 */
export const MAX_QA_CONTENT_LENGTH = 500;

/**
 * Create Q&A question broadcast payload
 * Returns hex-encoded string ready for transaction payload
 * 
 * Note: Content is truncated to MAX_QA_CONTENT_LENGTH chars before hashing
 * to ensure hash verification works with the stored content.
 */
export function createQAQuestionBroadcast(data: Omit<QAQuestionBroadcast, "contentHash">): string {
  // Truncate content FIRST, then hash the truncated version
  // This ensures the hash matches what's actually stored on-chain
  const truncatedContent = data.content.slice(0, MAX_QA_CONTENT_LENGTH);
  const contentHash = createContentHash(truncatedContent);
  
  // Build the KU-specific data portion
  const kuData = createKUBroadcastData("qa_q", [
    data.lessonId,
    data.authorAddress,
    data.timestamp.toString(),
    contentHash,
    truncatedContent,
  ]);
  
  // Wrap in Kasia broadcast format: 1:bcast:{kuData}
  const fullPayload = KASIA_PROTOCOL.headers.BROADCAST.string + kuData;
  
  return stringToHex(fullPayload);
}

/**
 * Create Q&A answer broadcast payload
 * Returns hex-encoded string ready for transaction payload
 * 
 * Note: Content is truncated to MAX_QA_CONTENT_LENGTH chars before hashing
 * to ensure hash verification works with the stored content.
 */
export function createQAAnswerBroadcast(data: Omit<QAAnswerBroadcast, "contentHash">): string {
  // Truncate content FIRST, then hash the truncated version
  // This ensures the hash matches what's actually stored on-chain
  const truncatedContent = data.content.slice(0, MAX_QA_CONTENT_LENGTH);
  const contentHash = createContentHash(truncatedContent);
  
  // Build the KU-specific data portion
  const kuData = createKUBroadcastData("qa_a", [
    data.questionTxId,
    data.authorAddress,
    data.timestamp.toString(),
    contentHash,
    truncatedContent,
  ]);
  
  // Wrap in Kasia broadcast format: 1:bcast:{kuData}
  const fullPayload = KASIA_PROTOCOL.headers.BROADCAST.string + kuData;
  
  return stringToHex(fullPayload);
}

/**
 * Parsed Kasia broadcast message
 */
export interface ParsedKasiaBroadcast {
  version: string;
  type: KasiaMessageType;
  rawData: string;
  kuBroadcast?: {
    type: KUBroadcastType;
    version: string;
    question?: QAQuestionBroadcast;
    answer?: QAAnswerBroadcast;
  };
}

/**
 * Check if a transaction payload is a Kasia protocol message
 */
export function isKasiaTransaction(payloadHex: string): boolean {
  // Check for Kasia broadcast header
  return payloadHex.startsWith(KASIA_PROTOCOL.headers.BROADCAST.hex);
}

/**
 * Check if a Kasia broadcast contains KU Q&A data
 */
export function isKUBroadcast(payloadStr: string): boolean {
  // After "1:bcast:", check for "ku_qa:"
  const afterHeader = payloadStr.slice(KASIA_PROTOCOL.headers.BROADCAST.string.length);
  return afterHeader.startsWith(KU_BROADCAST_PREFIX + KASIA_DELIM);
}

/**
 * Parse a Kasia protocol message from transaction payload
 */
export function parseKasiaBroadcast(payloadHex: string): ParsedKasiaBroadcast | null {
  if (!isKasiaTransaction(payloadHex)) {
    return null;
  }

  try {
    const payloadStr = hexToString(payloadHex);
    const parts = payloadStr.split(KASIA_DELIM);
    
    if (parts.length < 2) {
      return null;
    }

    const version = parts[0];
    const type = parts[1] as KasiaMessageType;
    const rawData = parts.slice(2).join(KASIA_DELIM);

    const result: ParsedKasiaBroadcast = { version, type, rawData };

    // Check if this is a KU broadcast
    if (type === "bcast" && isKUBroadcast(payloadStr)) {
      // Parse KU-specific data: ku_qa:1:{type}:{data...}
      const kuParts = rawData.split(KASIA_DELIM);
      
      if (kuParts.length >= 3 && kuParts[0] === KU_BROADCAST_PREFIX) {
        const kuVersion = kuParts[1];
        const kuType = kuParts[2] as KUBroadcastType;
        
        result.kuBroadcast = {
          type: kuType,
          version: kuVersion,
        };

        if (kuType === "qa_q" && kuParts.length >= 7) {
          // qa_q:{lessonId}:{authorAddress}:{timestamp}:{contentHash}:{content}
          // Use reverse indexing to handle addresses with colons
          const n = kuParts.length;
          
          // Find contentHash by looking for 16-char hex pattern
          let hashIdx = -1;
          for (let i = 6; i < n; i++) {
            if (kuParts[i].length === 16 && /^[0-9a-f]+$/.test(kuParts[i])) {
              hashIdx = i;
              break;
            }
          }
          
          if (hashIdx >= 6) {
            const contentHash = kuParts[hashIdx];
            const timestamp = parseInt(kuParts[hashIdx - 1], 10);
            const authorAddress = kuParts.slice(4, hashIdx - 1).join(KASIA_DELIM);
            const lessonId = kuParts[3];
            const content = kuParts.slice(hashIdx + 1).join(KASIA_DELIM);
            
            result.kuBroadcast.question = {
              lessonId,
              authorAddress,
              timestamp,
              contentHash,
              content,
            };
          }
        } else if (kuType === "qa_a" && kuParts.length >= 7) {
          // qa_a:{questionTxId}:{authorAddress}:{timestamp}:{contentHash}:{content}
          const n = kuParts.length;
          
          // Find contentHash by looking for 16-char hex pattern
          let hashIdx = -1;
          for (let i = 6; i < n; i++) {
            if (kuParts[i].length === 16 && /^[0-9a-f]+$/.test(kuParts[i])) {
              hashIdx = i;
              break;
            }
          }
          
          if (hashIdx >= 6) {
            const contentHash = kuParts[hashIdx];
            const timestamp = parseInt(kuParts[hashIdx - 1], 10);
            const authorAddress = kuParts.slice(4, hashIdx - 1).join(KASIA_DELIM);
            const questionTxId = kuParts[3];
            const content = kuParts.slice(hashIdx + 1).join(KASIA_DELIM);
            
            result.kuBroadcast.answer = {
              questionTxId,
              authorAddress,
              timestamp,
              contentHash,
              content,
            };
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error("[Kasia Protocol] Failed to parse payload:", error);
    return null;
  }
}

/**
 * Verify Q&A content hash
 */
export function verifyContentHash(content: string, expectedHash: string): boolean {
  const computedHash = createContentHash(content);
  return computedHash === expectedHash;
}

/**
 * Get maximum payload size in bytes
 * Kaspa allows ~84KB but we stay conservative for Q&A content
 */
export const MAX_BROADCAST_BYTES = 2048; // 2KB for Q&A content

/**
 * Validate payload size before creating transaction
 */
export function validateBroadcastSize(payloadHex: string): boolean {
  return payloadHex.length / 2 <= MAX_BROADCAST_BYTES;
}
