/**
 * Cryptographic utilities for Kaspa University
 * 
 * Uses @kluster/kaspa-signature for Schnorr verification and rusty-kaspa WASM for address derivation
 * Handles:
 * - Wallet signature verification (Schnorr + ECDSA)
 * - Address derivation from public keys
 * - Quiz session management
 * 
 * NOTE: Main authentication now uses SIWK (server/siwk-auth.ts)
 * This module handles quiz sessions and Kasia message verification
 */

import { createHash, randomBytes } from "crypto";
import { verifySignature as verifyKlusterSignature } from "@kluster/kaspa-signature";
import { KaspaAddress } from "@kluster/kaspa-address";

// Lazy-loaded kaspa WASM module for address derivation
let kaspaWasmModule: any = null;

async function loadKaspaWasm(): Promise<any> {
  if (kaspaWasmModule) return kaspaWasmModule;
  
  try {
    const pathModule = await import("path");
    const fs = await import("fs");
    const url = await import("url");
    
    // Try multiple path strategies for maximum compatibility
    const pathCandidates: string[] = [];
    
    // Strategy 1: Relative to bundle file (production deployment)
    try {
      const bundleDir = pathModule.dirname(url.fileURLToPath(import.meta.url));
      pathCandidates.push(pathModule.join(bundleDir, "wasm/kaspa.js"));
    } catch {}
    
    // Strategy 2: process.cwd() + dist/wasm (production)
    pathCandidates.push(pathModule.join(process.cwd(), "dist/wasm/kaspa.js"));
    
    // Strategy 3: process.cwd() + server/wasm (development)
    pathCandidates.push(pathModule.join(process.cwd(), "server/wasm/kaspa.js"));
    
    // Strategy 4: Just "wasm/kaspa.js" relative to cwd
    pathCandidates.push(pathModule.join(process.cwd(), "wasm/kaspa.js"));
    
    let wasmPath: string | null = null;
    for (const candidate of pathCandidates) {
      if (fs.existsSync(candidate)) {
        wasmPath = candidate;
        break;
      }
    }
    
    if (!wasmPath) {
      console.warn("[Crypto] Kaspa WASM not found in any candidate paths");
      return null;
    }
    
    kaspaWasmModule = require(wasmPath);
    return kaspaWasmModule;
  } catch (error: any) {
    console.error("[Crypto] Failed to load Kaspa WASM:", error.message);
    return null;
  }
}

interface QuizSession {
  sessionId: string;
  lessonId: string;
  walletAddress: string;
  questionHashes: string[];
  startTime: number;
  expiresAt: number;
}

const QUIZ_SESSION_EXPIRY_MS = 30 * 60 * 1000;
const quizSessions: Map<string, QuizSession> = new Map();

/**
 * Verify a wallet signature for Kasia message authorization
 * Uses @kluster/kaspa-signature for Schnorr verification with ECDSA fallback for KasWare
 * Used for authorizing treasury broadcasts
 * 
 * Security: 
 * - Verifies public key's x-coordinate matches address payload
 * - Cryptographic signature verification validates signer identity
 */
export async function verifyMessageSignature(
  walletAddress: string,
  message: string,
  signatureBase64: string,
  publicKeyHex: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Normalize pubkey (remove 0x prefix if present)
    let normalizedPubKey = publicKeyHex;
    if (publicKeyHex && publicKeyHex.startsWith("0x")) {
      normalizedPubKey = publicKeyHex.slice(2);
    }
    
    // Validate public key format (compressed = 33 bytes = 66 hex chars)
    if (!normalizedPubKey || normalizedPubKey.length !== 66) {
      console.warn(`[Crypto] Invalid public key length: ${publicKeyHex?.length || 0} chars`);
      return { valid: false, error: "Invalid public key format" };
    }
    
    // Validate wallet address format using @kluster/kaspa-address
    let kaspaAddress: KaspaAddress;
    try {
      kaspaAddress = KaspaAddress.fromString(walletAddress);
    } catch {
      return { valid: false, error: "Invalid wallet address format" };
    }
    
    // SECURITY: Verify public key derives to claimed wallet address
    // Uses rusty-kaspa WASM PublicKey.toAddress for canonical Bech32 derivation
    const kaspa = await loadKaspaWasm();
    if (kaspa && typeof kaspa.PublicKey === "function") {
      try {
        const pubKey = new kaspa.PublicKey(normalizedPubKey);
        const derivedAddress = pubKey.toAddress("mainnet").toString();
        
        if (derivedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          console.warn(`[Crypto] Address mismatch: derived=${derivedAddress.slice(0, 25)}..., claimed=${walletAddress.slice(0, 25)}...`);
          return { valid: false, error: "Public key does not match wallet address" };
        }
      } catch (addressError: any) {
        console.error(`[Crypto] Address derivation failed: ${addressError.message}`);
        return { valid: false, error: "Address verification failed" };
      }
    } else {
      // Fallback: compare x-coordinate with address payload (works for Schnorr addresses)
      const pubKeyBuffer = Buffer.from(normalizedPubKey, "hex");
      const xCoordinate = pubKeyBuffer.slice(1);
      const addressPayload = Buffer.from(kaspaAddress.payload);
      
      if (addressPayload.length === 32) {
        if (!xCoordinate.equals(addressPayload)) {
          console.warn(`[Crypto] Public key x-coordinate does not match address`);
          return { valid: false, error: "Public key does not match wallet address" };
        }
      } else {
        console.warn(`[Crypto] WASM unavailable and non-Schnorr address - cannot verify`);
        return { valid: false, error: "Address verification unavailable" };
      }
    }
    
    // Decode base64 signature to hex for verification
    // KasWare returns base64-encoded ECDSA signatures
    let signatureHex: string;
    try {
      const sigBuffer = Buffer.from(signatureBase64, "base64");
      // KasWare ECDSA signatures are 65 bytes (recovery byte + 64-byte signature)
      // Strip recovery byte if present for verification
      if (sigBuffer.length === 65) {
        signatureHex = sigBuffer.slice(1).toString("hex");
      } else {
        signatureHex = sigBuffer.toString("hex");
      }
    } catch {
      // Try treating as hex directly
      signatureHex = signatureBase64.replace(/^0x/, "");
    }
    
    // Try @kluster/kaspa-signature for Schnorr verification first
    try {
      const isValid = await verifyKlusterSignature(message, signatureHex, kaspaAddress);
      if (isValid) {
        console.log(`[Crypto] Schnorr signature verified for ${walletAddress.slice(0, 25)}...`);
        return { valid: true };
      }
    } catch {
      // Schnorr verification failed, try ECDSA fallback
    }
    
    // Fallback: ECDSA verification with secp256k1 using the provided public key
    // This handles KasWare's ECDSA signature format (raw 64/65 bytes or DER-encoded 70-72 bytes)
    try {
      const secp256k1 = await import("secp256k1");
      const secp = secp256k1.default || secp256k1;
      
      const messageHash = createHash("sha256").update(message).digest();
      let signature = Buffer.from(signatureHex, "hex");
      const publicKey = Buffer.from(normalizedPubKey, "hex");
      
      // Handle different signature formats:
      // - 64 bytes: raw compact signature
      // - 65 bytes: raw compact signature with recovery byte (strip first byte)
      // - 70-72 bytes: DER-encoded signature (needs conversion)
      
      if (signature.length === 65) {
        // Strip recovery byte
        signature = signature.slice(1);
      } else if (signature.length >= 70 && signature.length <= 72) {
        // DER-encoded signature - convert to compact format
        try {
          signature = Buffer.from(secp.signatureImport(signature));
          console.log(`[Crypto] Converted DER signature to compact (${signature.length} bytes)`);
        } catch (derError) {
          console.warn("[Crypto] DER signature import failed, trying as raw");
        }
      }
      
      if (signature.length === 64) {
        const isValid = secp.ecdsaVerify(signature, messageHash, publicKey);
        if (isValid) {
          console.log(`[Crypto] ECDSA signature verified for ${walletAddress.slice(0, 25)}...`);
          return { valid: true };
        }
      }
    } catch (ecdsaError: any) {
      console.error("[Crypto] ECDSA verification error:", ecdsaError.message);
    }
    
    return { valid: false, error: "Invalid signature" };
  } catch (error: any) {
    console.error("[Crypto] Message signature verification error:", error.message);
    return { valid: false, error: "Verification failed" };
  }
}

export function createQuizSession(
  walletAddress: string,
  lessonId: string,
  questions: Array<{ id: string; question: string; options: string[] }>
): QuizSession {
  const sessionId = randomBytes(16).toString("hex");
  const now = Date.now();
  
  const questionHashes = questions.map(q => 
    createHash("sha256")
      .update(JSON.stringify({ id: q.id, question: q.question, options: q.options }))
      .digest("hex")
  );
  
  const session: QuizSession = {
    sessionId,
    lessonId,
    walletAddress: walletAddress.toLowerCase(),
    questionHashes,
    startTime: now,
    expiresAt: now + QUIZ_SESSION_EXPIRY_MS,
  };
  
  const key = `${walletAddress.toLowerCase()}:${lessonId}`;
  quizSessions.set(key, session);
  
  return session;
}

export function validateQuizSession(
  walletAddress: string,
  lessonId: string,
  sessionId: string
): { valid: boolean; session?: QuizSession; error?: string } {
  const key = `${walletAddress.toLowerCase()}:${lessonId}`;
  const session = quizSessions.get(key);
  
  if (!session) {
    return { valid: false, error: "No active quiz session found" };
  }
  
  if (session.sessionId !== sessionId) {
    return { valid: false, error: "Invalid session ID" };
  }
  
  if (Date.now() > session.expiresAt) {
    quizSessions.delete(key);
    return { valid: false, error: "Quiz session expired" };
  }
  
  return { valid: true, session };
}

export function getQuizSession(walletAddress: string, lessonId: string): QuizSession | undefined {
  const key = `${walletAddress.toLowerCase()}:${lessonId}`;
  return quizSessions.get(key);
}

export function clearQuizSession(walletAddress: string, lessonId: string): void {
  const key = `${walletAddress.toLowerCase()}:${lessonId}`;
  quizSessions.delete(key);
}

export function hashAnswers(answers: number[]): string {
  return createHash("sha256").update(JSON.stringify(answers)).digest("hex");
}

// Cleanup expired quiz sessions every minute
setInterval(() => {
  const now = Date.now();
  
  for (const [key, session] of Array.from(quizSessions.entries())) {
    if (now > session.expiresAt) {
      quizSessions.delete(key);
    }
  }
}, 60 * 1000);
