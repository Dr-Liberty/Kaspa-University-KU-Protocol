/**
 * Simplified Certificate Proof System for Kaspa University
 * 
 * This replaces the complex KRC-721 P2SH commit/reveal pattern with a simple
 * single-transaction approach that cannot fail or lock funds.
 * 
 * How it works:
 * 1. Certificate data is stored off-chain (database + optional IPFS)
 * 2. A proof transaction is sent to the user's wallet with:
 *    - Small dust amount (0.001 KAS)
 *    - KU Protocol payload containing certificate hash
 * 3. The transaction hash serves as the on-chain proof of completion
 * 
 * Benefits:
 * - Cannot trap/lose funds (only sends to user wallet)
 * - Single transaction (no commit/reveal)
 * - Works reliably on first try
 * - Verifiable on-chain via transaction payload
 * - Much lower fees (~0.001 KAS vs ~3.5+ KAS)
 */

import { createHash, randomBytes } from "crypto";
import { storage } from "./storage";
import { stringToHex, KU_PREFIX, KU_VERSION, KU_DELIM } from "./ku-protocol";

export const CERT_PROOF_VERSION = "1";
export const CERT_PROOF_AMOUNT_KAS = 0.001;

export interface CertificateProofData {
  certificateId: string;
  courseId: string;
  courseName: string;
  recipientAddress: string;
  recipientDisplayName?: string;
  score: number;
  completedAt: number;
  kasReward: number;
}

export interface CertificateProofResult {
  success: boolean;
  txHash?: string;
  verificationCode?: string;
  error?: string;
}

export function generateVerificationCode(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}

export function createCertificateHash(data: CertificateProofData): string {
  const content = [
    data.certificateId,
    data.courseId,
    data.recipientAddress,
    data.score.toString(),
    data.completedAt.toString(),
  ].join(":");
  
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}

export function createCertificateProofPayload(data: CertificateProofData): string {
  const hash = createCertificateHash(data);
  const verificationCode = generateVerificationCode();
  
  const payloadStr = [
    KU_PREFIX,
    CERT_PROOF_VERSION,
    "cert",
    data.certificateId.slice(0, 16),
    data.courseId.slice(0, 16),
    data.score.toString(),
    data.completedAt.toString(),
    hash.slice(0, 16),
    verificationCode,
  ].join(KU_DELIM);
  
  return stringToHex(payloadStr);
}

export function parseCertificateProofPayload(payloadHex: string): {
  certificateId: string;
  courseId: string;
  score: number;
  timestamp: number;
  hash: string;
  verificationCode: string;
} | null {
  try {
    const bytes = new Uint8Array(payloadHex.length / 2);
    for (let i = 0; i < payloadHex.length; i += 2) {
      bytes[i / 2] = parseInt(payloadHex.slice(i, i + 2), 16);
    }
    const payloadStr = new TextDecoder().decode(bytes);
    
    const parts = payloadStr.split(KU_DELIM);
    if (parts.length < 9 || parts[0] !== KU_PREFIX || parts[2] !== "cert") {
      return null;
    }
    
    return {
      certificateId: parts[3],
      courseId: parts[4],
      score: parseInt(parts[5], 10),
      timestamp: parseInt(parts[6], 10),
      hash: parts[7],
      verificationCode: parts[8],
    };
  } catch {
    return null;
  }
}

export async function issueCertificateProof(
  kaspaService: any,
  data: CertificateProofData
): Promise<CertificateProofResult> {
  const verificationCode = generateVerificationCode();
  const payloadHex = createCertificateProofPayload(data);
  
  console.log(`[CertProof] Issuing certificate proof for ${data.courseId} to ${data.recipientAddress.slice(0, 20)}...`);
  console.log(`[CertProof] Payload: ${payloadHex.length / 2} bytes, verification: ${verificationCode}`);
  
  if (!kaspaService.isLive()) {
    console.log(`[CertProof] Demo mode - simulating certificate proof`);
    const demoTxHash = `demo_cert_${Date.now().toString(16)}_${randomBytes(8).toString("hex")}`;
    return {
      success: true,
      txHash: demoTxHash,
      verificationCode,
    };
  }
  
  try {
    const result = await kaspaService.sendTransactionWithPayload(
      data.recipientAddress,
      CERT_PROOF_AMOUNT_KAS,
      payloadHex
    );
    
    if (result.success && result.txHash) {
      console.log(`[CertProof] Certificate proof issued: ${result.txHash}`);
      return {
        success: true,
        txHash: result.txHash,
        verificationCode,
      };
    } else {
      console.error(`[CertProof] Failed to issue certificate proof: ${result.error}`);
      return {
        success: false,
        error: result.error || "Transaction failed",
      };
    }
  } catch (error: any) {
    console.error(`[CertProof] Error issuing certificate proof:`, error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

export async function verifyCertificateOnChain(
  kaspaService: any,
  txHash: string
): Promise<{
  valid: boolean;
  data?: ReturnType<typeof parseCertificateProofPayload>;
  error?: string;
}> {
  try {
    const txData = await kaspaService.getTransactionPayload(txHash);
    if (!txData || !txData.payload) {
      return { valid: false, error: "Transaction not found or has no payload" };
    }
    
    const parsed = parseCertificateProofPayload(txData.payload);
    if (!parsed) {
      return { valid: false, error: "Invalid certificate proof payload" };
    }
    
    return { valid: true, data: parsed };
  } catch (error: any) {
    return { valid: false, error: error.message || "Verification failed" };
  }
}
