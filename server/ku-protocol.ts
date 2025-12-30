/**
 * Kaspa University On-Chain Protocol
 * 
 * Protocol format: ku:{version}:{type}:{data}
 * 
 * Active Types:
 * - quiz: Verifiable quiz completion proof (KU-specific, used for reward verification)
 * 
 * DEPRECATED Types (use Kasia Protocol instead - see kasia-protocol.ts):
 * - qa_q: Q&A question - NOW USE Kasia bcast format for ecosystem compatibility
 * - qa_a: Q&A answer - NOW USE Kasia bcast format for ecosystem compatibility
 * 
 * The Q&A parsing functions are kept for backwards compatibility with legacy
 * transactions, but all new Q&A posts should use the Kasia Protocol (1:bcast:...)
 * which enables discovery by Kasia indexers and cross-platform compatibility.
 * 
 * All payloads are hex-encoded for transaction embedding.
 */

import { createHash } from "crypto";

// Protocol version
export const KU_VERSION = "1";
export const KU_DELIM = ":";
export const KU_PREFIX = "ku";

// Convert string to hex
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

// Protocol message types
export type KUMessageType = "quiz" | "qa_q" | "qa_a";

/**
 * Bitmasking System for Transaction Monitoring
 * 
 * Layout (16-bit integer):
 * Bits 0-2:   Transaction Type (0-7)
 * Bits 3-5:   Transaction Status (0-7)
 * Bits 6-7:   Score Range (0-3)
 * Bits 8-15:  Flags (8 individual flags)
 * 
 * This allows quick filtering and monitoring of transactions
 * by using bitwise operations instead of string comparisons.
 */

// Transaction Types (bits 0-2)
export const TX_TYPE = {
  UNKNOWN: 0,      // 0b000
  QUIZ: 1,         // 0b001
  QA_QUESTION: 2,  // 0b010
  QA_ANSWER: 3,    // 0b011
  REWARD: 4,       // 0b100
  CERTIFICATE: 5,  // 0b101
} as const;

// Transaction Status (bits 3-5, shifted by 3)
export const TX_STATUS = {
  PENDING: 0 << 3,    // 0b000000
  CONFIRMED: 1 << 3,  // 0b001000
  FAILED: 2 << 3,     // 0b010000
  EXPIRED: 3 << 3,    // 0b011000
} as const;

// Score Range (bits 6-7, shifted by 6) - for quiz results
export const TX_SCORE = {
  FAIL: 0 << 6,       // 0-69%
  PASS: 1 << 6,       // 70-84%
  EXCELLENT: 2 << 6,  // 85-99%
  PERFECT: 3 << 6,    // 100%
} as const;

// Flags (bits 8-15, each is a single bit)
export const TX_FLAGS = {
  HAS_PAYLOAD: 1 << 8,       // Transaction contains KU protocol payload
  VERIFIED: 1 << 9,          // Payload verified on-chain
  REWARD_CLAIMED: 1 << 10,   // Associated reward was claimed
  NFT_MINTED: 1 << 11,       // Certificate NFT was minted
  DEMO_MODE: 1 << 12,        // Demo/test transaction
  VPN_DETECTED: 1 << 13,     // VPN was detected during submission
  FLAGGED: 1 << 14,          // User was security flagged
  FIRST_ATTEMPT: 1 << 15,    // First quiz attempt for this lesson
} as const;

// Masks for extracting values
export const TX_MASKS = {
  TYPE: 0b0000000000000111,      // Bits 0-2
  STATUS: 0b0000000000111000,    // Bits 3-5
  SCORE: 0b0000000011000000,     // Bits 6-7
  FLAGS: 0b1111111100000000,     // Bits 8-15
} as const;

/**
 * Create a bitmask for a transaction
 */
export function createTxBitmask(options: {
  type: keyof typeof TX_TYPE;
  status: keyof typeof TX_STATUS;
  scorePercent?: number;
  flags?: (keyof typeof TX_FLAGS)[];
}): number {
  let mask = TX_TYPE[options.type];
  mask |= TX_STATUS[options.status];
  
  // Calculate score range
  if (options.scorePercent !== undefined) {
    if (options.scorePercent >= 100) {
      mask |= TX_SCORE.PERFECT;
    } else if (options.scorePercent >= 85) {
      mask |= TX_SCORE.EXCELLENT;
    } else if (options.scorePercent >= 70) {
      mask |= TX_SCORE.PASS;
    } else {
      mask |= TX_SCORE.FAIL;
    }
  }
  
  // Apply flags
  if (options.flags) {
    for (const flag of options.flags) {
      mask |= TX_FLAGS[flag];
    }
  }
  
  return mask;
}

/**
 * Parse a bitmask into readable components
 */
export function parseTxBitmask(mask: number): {
  type: string;
  status: string;
  scoreRange: string;
  flags: string[];
} {
  // Extract type
  const typeValue = mask & TX_MASKS.TYPE;
  const type = Object.entries(TX_TYPE).find(([, v]) => v === typeValue)?.[0] || "UNKNOWN";
  
  // Extract status
  const statusValue = mask & TX_MASKS.STATUS;
  const status = Object.entries(TX_STATUS).find(([, v]) => v === statusValue)?.[0] || "PENDING";
  
  // Extract score range
  const scoreValue = mask & TX_MASKS.SCORE;
  const scoreRange = Object.entries(TX_SCORE).find(([, v]) => v === scoreValue)?.[0] || "FAIL";
  
  // Extract flags
  const flags: string[] = [];
  for (const [name, bit] of Object.entries(TX_FLAGS)) {
    if (mask & bit) {
      flags.push(name);
    }
  }
  
  return { type, status, scoreRange, flags };
}

/**
 * Check if a transaction matches specific criteria using bitmask
 */
export function matchesTxMask(txMask: number, criteria: {
  type?: keyof typeof TX_TYPE;
  status?: keyof typeof TX_STATUS;
  hasFlag?: keyof typeof TX_FLAGS;
  notFlag?: keyof typeof TX_FLAGS;
}): boolean {
  if (criteria.type !== undefined) {
    if ((txMask & TX_MASKS.TYPE) !== TX_TYPE[criteria.type]) return false;
  }
  if (criteria.status !== undefined) {
    if ((txMask & TX_MASKS.STATUS) !== TX_STATUS[criteria.status]) return false;
  }
  if (criteria.hasFlag !== undefined) {
    if (!(txMask & TX_FLAGS[criteria.hasFlag])) return false;
  }
  if (criteria.notFlag !== undefined) {
    if (txMask & TX_FLAGS[criteria.notFlag]) return false;
  }
  return true;
}

/**
 * Convert bitmask to hex string for compact storage (4 chars for 16 bits)
 */
export function bitmaskToHex(mask: number): string {
  return mask.toString(16).padStart(4, "0");
}

/**
 * Parse hex string back to bitmask
 */
export function hexToBitmask(hex: string): number {
  return parseInt(hex, 16);
}

// Protocol headers (pre-computed hex values for efficiency)
const createHeader = (type: KUMessageType) => {
  const str = `${KU_PREFIX}${KU_DELIM}${KU_VERSION}${KU_DELIM}${type}${KU_DELIM}`;
  return { type, string: str, hex: stringToHex(str) };
};

export const KU_PROTOCOL = {
  prefix: {
    string: `${KU_PREFIX}${KU_DELIM}`,
    hex: stringToHex(`${KU_PREFIX}${KU_DELIM}`),
  },
  headers: {
    QUIZ: createHeader("quiz"),
    QA_QUESTION: createHeader("qa_q"),
    QA_ANSWER: createHeader("qa_a"),
  },
} as const;

/**
 * Quiz Result Payload
 * Format: ku:1:quiz:{walletAddress}:{courseId}:{lessonId}:{score}:{maxScore}:{timestamp}:{contentHash}
 */
export interface QuizPayload {
  walletAddress: string;
  courseId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  timestamp: number;
  contentHash: string; // Hash of quiz answers for verification
}

/**
 * Q&A Question Payload
 * Format: ku:1:qa_q:{lessonId}:{authorAddress}:{timestamp}:{contentHash}:{content}
 */
export interface QAQuestionPayload {
  lessonId: string;
  authorAddress: string;
  timestamp: number;
  contentHash: string;
  content: string;
}

/**
 * Q&A Answer Payload
 * Format: ku:1:qa_a:{questionTxId}:{authorAddress}:{timestamp}:{contentHash}:{content}
 */
export interface QAAnswerPayload {
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
 * Create quiz result payload for on-chain storage
 */
export function createQuizPayload(data: Omit<QuizPayload, "contentHash">, answers: number[]): string {
  // Create hash of answers array for verification
  const answerString = answers.join(",");
  const contentHash = createContentHash(`${data.lessonId}:${answerString}:${data.score}`);
  
  const payload: QuizPayload = { ...data, contentHash };
  
  // Format: ku:1:quiz:{wallet}:{courseId}:{lessonId}:{score}:{maxScore}:{timestamp}:{hash}
  // Note: header already includes trailing ":" so we join remaining fields with ":"
  const dataFields = [
    payload.walletAddress, // Full address for verification
    payload.courseId,
    payload.lessonId,
    payload.score.toString(),
    payload.maxScore.toString(),
    payload.timestamp.toString(),
    payload.contentHash,
  ].join(KU_DELIM);
  
  const payloadStr = KU_PROTOCOL.headers.QUIZ.string + dataFields;

  return stringToHex(payloadStr);
}

/**
 * @deprecated Use createQAQuestionBroadcast from kasia-protocol.ts instead.
 * Kept for backwards compatibility with legacy transactions.
 * 
 * Create Q&A question payload for on-chain storage
 */
export function createQAQuestionPayload(data: Omit<QAQuestionPayload, "contentHash">): string {
  // Truncate content FIRST, then hash the truncated version
  // This ensures the hash matches what's actually stored on-chain
  const truncatedContent = data.content.slice(0, 500);
  const contentHash = createContentHash(truncatedContent);
  
  // Format: ku:1:qa_q:{lessonId}:{authorAddress}:{timestamp}:{contentHash}:{content}
  // Note: header already includes trailing ":" so we join remaining fields with ":"
  const dataFields = [
    data.lessonId,
    data.authorAddress, // Full address for verification
    data.timestamp.toString(),
    contentHash,
    truncatedContent,
  ].join(KU_DELIM);
  
  const payloadStr = KU_PROTOCOL.headers.QA_QUESTION.string + dataFields;

  return stringToHex(payloadStr);
}

/**
 * @deprecated Use createQAAnswerBroadcast from kasia-protocol.ts instead.
 * Kept for backwards compatibility with legacy transactions.
 * 
 * Create Q&A answer payload for on-chain storage
 */
export function createQAAnswerPayload(data: Omit<QAAnswerPayload, "contentHash">): string {
  // Truncate content FIRST, then hash the truncated version
  // This ensures the hash matches what's actually stored on-chain
  const truncatedContent = data.content.slice(0, 500);
  const contentHash = createContentHash(truncatedContent);
  
  // Format: ku:1:qa_a:{questionTxId}:{authorAddress}:{timestamp}:{contentHash}:{content}
  // Note: header already includes trailing ":" so we join remaining fields with ":"
  const dataFields = [
    data.questionTxId, // Full txId for cross-reference
    data.authorAddress, // Full address for verification
    data.timestamp.toString(),
    contentHash,
    truncatedContent,
  ].join(KU_DELIM);
  
  const payloadStr = KU_PROTOCOL.headers.QA_ANSWER.string + dataFields;

  return stringToHex(payloadStr);
}

/**
 * Parsed KU Protocol message
 */
export interface ParsedKUMessage {
  type: KUMessageType;
  version: string;
  rawData: string;
  quiz?: QuizPayload;
  question?: QAQuestionPayload;
  answer?: QAAnswerPayload;
}

/**
 * Check if a transaction payload is a KU protocol message
 */
export function isKUTransaction(payloadHex: string): boolean {
  return payloadHex.startsWith(KU_PROTOCOL.prefix.hex);
}

/**
 * Parse a KU protocol message from transaction payload
 * Uses reverse indexing for trailing fields to handle colons in wallet addresses
 */
export function parseKUPayload(payloadHex: string): ParsedKUMessage | null {
  if (!isKUTransaction(payloadHex)) {
    return null;
  }

  try {
    const payloadStr = hexToString(payloadHex);
    const parts = payloadStr.split(KU_DELIM);
    
    if (parts.length < 3 || parts[0] !== KU_PREFIX) {
      return null;
    }

    const version = parts[1];
    const type = parts[2] as KUMessageType;
    const rawData = parts.slice(3).join(KU_DELIM);

    const result: ParsedKUMessage = { type, version, rawData };

    // Parse based on message type using reverse indexing for trailing fixed fields
    // This handles wallet addresses that contain ":" (e.g., kaspa:address)
    if (type === "quiz" && parts.length >= 10) {
      // Format: ku:1:quiz:{walletAddress}:{courseId}:{lessonId}:{score}:{maxScore}:{timestamp}:{contentHash}
      // Last 4 parts are always: score, maxScore, timestamp, contentHash
      const n = parts.length;
      const contentHash = parts[n - 1];
      const timestamp = parseInt(parts[n - 2], 10);
      const maxScore = parseInt(parts[n - 3], 10);
      const score = parseInt(parts[n - 4], 10);
      const lessonId = parts[n - 5];
      const courseId = parts[n - 6];
      // Wallet address may contain ":" so join all remaining parts
      const walletAddress = parts.slice(3, n - 6).join(KU_DELIM);
      
      result.quiz = {
        walletAddress,
        courseId,
        lessonId,
        score,
        maxScore,
        timestamp,
        contentHash,
      };
    } else if (type === "qa_q" && parts.length >= 7) {
      // Format: ku:1:qa_q:{lessonId}:{authorAddress}:{timestamp}:{contentHash}:{content}
      // Parse from end: content is everything after contentHash, 
      // but contentHash and timestamp are fixed positions
      const n = parts.length;
      // Find contentHash position - it's 16 chars hex
      // We need at least: ku:1:qa_q:lessonId:author:timestamp:hash:content
      // But author may have ":" so use reverse indexing
      // Last part(s) = content, then contentHash (16 chars), then timestamp, then author, then lessonId
      // Content can contain ":" too, so we need to be clever
      
      // Try to find contentHash by looking for 16-char hex pattern from position 6 onward
      let hashIdx = -1;
      for (let i = 6; i < n; i++) {
        if (parts[i].length === 16 && /^[0-9a-f]+$/.test(parts[i])) {
          hashIdx = i;
          break;
        }
      }
      
      if (hashIdx >= 6) {
        const contentHash = parts[hashIdx];
        const timestamp = parseInt(parts[hashIdx - 1], 10);
        const authorAddress = parts.slice(4, hashIdx - 1).join(KU_DELIM);
        const lessonId = parts[3];
        const content = parts.slice(hashIdx + 1).join(KU_DELIM);
        
        result.question = {
          lessonId,
          authorAddress,
          timestamp,
          contentHash,
          content,
        };
      } else {
        // Fallback to simple parsing
        result.question = {
          lessonId: parts[3],
          authorAddress: parts.slice(4, n - 3).join(KU_DELIM),
          timestamp: parseInt(parts[n - 3], 10),
          contentHash: parts[n - 2],
          content: parts[n - 1] || "",
        };
      }
    } else if (type === "qa_a" && parts.length >= 7) {
      // Format: ku:1:qa_a:{questionTxId}:{authorAddress}:{timestamp}:{contentHash}:{content}
      const n = parts.length;
      
      // Find contentHash by looking for 16-char hex pattern
      let hashIdx = -1;
      for (let i = 6; i < n; i++) {
        if (parts[i].length === 16 && /^[0-9a-f]+$/.test(parts[i])) {
          hashIdx = i;
          break;
        }
      }
      
      if (hashIdx >= 6) {
        const contentHash = parts[hashIdx];
        const timestamp = parseInt(parts[hashIdx - 1], 10);
        const authorAddress = parts.slice(4, hashIdx - 1).join(KU_DELIM);
        const questionTxId = parts[3];
        const content = parts.slice(hashIdx + 1).join(KU_DELIM);
        
        result.answer = {
          questionTxId,
          authorAddress,
          timestamp,
          contentHash,
          content,
        };
      } else {
        // Fallback to simple parsing
        result.answer = {
          questionTxId: parts[3],
          authorAddress: parts.slice(4, n - 3).join(KU_DELIM),
          timestamp: parseInt(parts[n - 3], 10),
          contentHash: parts[n - 2],
          content: parts[n - 1] || "",
        };
      }
    }

    return result;
  } catch (error) {
    console.error("[KU Protocol] Failed to parse payload:", error);
    return null;
  }
}

/**
 * Verify a quiz result hash matches the expected answers
 */
export function verifyQuizHash(
  lessonId: string,
  answers: number[],
  score: number,
  expectedHash: string
): boolean {
  const answerString = answers.join(",");
  const computedHash = createContentHash(`${lessonId}:${answerString}:${score}`);
  return computedHash === expectedHash;
}

/**
 * Verify Q&A content hash
 */
export function verifyContentHash(content: string, expectedHash: string): boolean {
  const computedHash = createContentHash(content);
  return computedHash === expectedHash;
}

/**
 * Get maximum payload size in bytes (Kaspa allows ~84KB but we stay conservative)
 */
export const MAX_PAYLOAD_BYTES = 2048; // 2KB for Q&A content

/**
 * Validate payload size before creating transaction
 */
export function validatePayloadSize(payloadHex: string): boolean {
  return payloadHex.length / 2 <= MAX_PAYLOAD_BYTES;
}
