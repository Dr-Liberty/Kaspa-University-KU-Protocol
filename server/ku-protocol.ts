/**
 * Kaspa University On-Chain Protocol
 * 
 * Inspired by Kasia (K-Kluster) messaging protocol.
 * Stores verifiable educational achievements and Q&A on Kaspa blockchain.
 * 
 * Protocol format: ku:{version}:{type}:{data}
 * 
 * Types:
 * - quiz: Verifiable quiz completion proof
 * - qa_q: Q&A question
 * - qa_a: Q&A answer
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
 * Create Q&A question payload for on-chain storage
 */
export function createQAQuestionPayload(data: Omit<QAQuestionPayload, "contentHash">): string {
  const contentHash = createContentHash(data.content);
  
  // Truncate content for on-chain storage (max ~2KB to stay within transaction limits)
  const truncatedContent = data.content.slice(0, 500);
  
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
 * Create Q&A answer payload for on-chain storage
 */
export function createQAAnswerPayload(data: Omit<QAAnswerPayload, "contentHash">): string {
  const contentHash = createContentHash(data.content);
  
  // Truncate content for on-chain storage
  const truncatedContent = data.content.slice(0, 500);
  
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
