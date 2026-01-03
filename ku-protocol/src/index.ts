/**
 * KU Protocol - Kaspa University Educational Achievement Protocol
 * 
 * This is the core TypeScript implementation for creating and parsing
 * KU Protocol messages for the Kaspa blockchain.
 */

import { createHash } from "crypto";

export const KU_VERSION = "1";
export const KU_DELIM = ":";
export const KU_PREFIX = "ku";

export type KUMessageType = "quiz" | "cert" | "prog";

export const stringToHex = (str: string): string =>
  Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const hexToString = (hex: string): string => {
  if (!hex || hex.length % 2 !== 0) return "";
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
};

export interface QuizPayload {
  walletAddress: string;
  courseId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  timestamp: number;
  contentHash: string;
}

export interface CertPayload {
  walletAddress: string;
  certificateType: string;
  timestamp: number;
  eligibilityHash: string;
}

export interface ProgPayload {
  walletAddress: string;
  courseId: string;
  lessonId: string;
  completionType: string;
  timestamp: number;
}

export interface ParsedKUMessage {
  type: KUMessageType;
  version: string;
  rawData: string;
  quiz?: QuizPayload;
  cert?: CertPayload;
  prog?: ProgPayload;
}

export function createContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function createQuizPayload(
  data: Omit<QuizPayload, "contentHash">, 
  answers: number[]
): string {
  const answerString = answers.join(",");
  const contentHash = createContentHash(`${data.lessonId}:${answerString}:${data.score}`);
  
  const payload: QuizPayload = { ...data, contentHash };
  
  const dataFields = [
    payload.walletAddress,
    payload.courseId,
    payload.lessonId,
    payload.score.toString(),
    payload.maxScore.toString(),
    payload.timestamp.toString(),
    payload.contentHash,
  ].join(KU_DELIM);
  
  const payloadStr = `${KU_PREFIX}${KU_DELIM}${KU_VERSION}${KU_DELIM}quiz${KU_DELIM}${dataFields}`;
  return stringToHex(payloadStr);
}

export function createCertPayload(data: Omit<CertPayload, "eligibilityHash">, completedCourses: string[]): string {
  const eligibilityHash = createContentHash(completedCourses.sort().join(","));
  
  const dataFields = [
    data.walletAddress,
    data.certificateType,
    data.timestamp.toString(),
    eligibilityHash,
  ].join(KU_DELIM);
  
  const payloadStr = `${KU_PREFIX}${KU_DELIM}${KU_VERSION}${KU_DELIM}cert${KU_DELIM}${dataFields}`;
  return stringToHex(payloadStr);
}

export function createProgPayload(data: ProgPayload): string {
  const dataFields = [
    data.walletAddress,
    data.courseId,
    data.lessonId,
    data.completionType,
    data.timestamp.toString(),
  ].join(KU_DELIM);
  
  const payloadStr = `${KU_PREFIX}${KU_DELIM}${KU_VERSION}${KU_DELIM}prog${KU_DELIM}${dataFields}`;
  return stringToHex(payloadStr);
}

export function isKUTransaction(payloadHex: string): boolean {
  const prefix = stringToHex(`${KU_PREFIX}${KU_DELIM}`);
  return payloadHex.startsWith(prefix);
}

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

    if (type === "quiz" && parts.length >= 10) {
      const n = parts.length;
      result.quiz = {
        walletAddress: parts.slice(3, n - 6).join(KU_DELIM),
        courseId: parts[n - 6],
        lessonId: parts[n - 5],
        score: parseInt(parts[n - 4], 10),
        maxScore: parseInt(parts[n - 3], 10),
        timestamp: parseInt(parts[n - 2], 10),
        contentHash: parts[n - 1],
      };
    }

    if (type === "cert" && parts.length >= 7) {
      const n = parts.length;
      result.cert = {
        walletAddress: parts.slice(3, n - 3).join(KU_DELIM),
        certificateType: parts[n - 3],
        timestamp: parseInt(parts[n - 2], 10),
        eligibilityHash: parts[n - 1],
      };
    }

    if (type === "prog" && parts.length >= 8) {
      const n = parts.length;
      result.prog = {
        walletAddress: parts.slice(3, n - 4).join(KU_DELIM),
        courseId: parts[n - 4],
        lessonId: parts[n - 3],
        completionType: parts[n - 2],
        timestamp: parseInt(parts[n - 1], 10),
      };
    }

    return result;
  } catch (error) {
    console.error("[KU Protocol] Failed to parse payload:", error);
    return null;
  }
}

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

export const MAX_PAYLOAD_BYTES = 2048;

export function validatePayloadSize(payloadHex: string): boolean {
  return payloadHex.length / 2 <= MAX_PAYLOAD_BYTES;
}
