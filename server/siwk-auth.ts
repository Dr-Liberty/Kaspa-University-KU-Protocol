/**
 * Sign-In with Kaspa (SIWK) Authentication Service
 * 
 * Uses @kluster/kaspa-auth for standardized, secure wallet authentication.
 * Implements EIP-4361 style authentication for Kaspa.
 * 
 * Supports both Schnorr (native @kluster) and ECDSA (KasWare) signatures.
 */

import { verifySiwk, buildMessage } from "@kluster/kaspa-auth";
import type { SiwkFields } from "@kluster/kaspa-auth/types";
import crypto, { createHash } from "crypto";
import { blake2b } from "@noble/hashes/blake2b";

const personalKey = new TextEncoder().encode("PersonalMessageSigningHash");

function getPersonalMessageDigest(msg: string): Uint8Array {
  return blake2b(new TextEncoder().encode(msg), {
    key: personalKey,
    dkLen: 32,
  });
}

async function verifyEcdsaSignature(
  message: string,
  signatureHex: string,
  walletAddress: string
): Promise<boolean> {
  try {
    const secp256k1 = await import("secp256k1");
    const secp = (secp256k1 as any).default || secp256k1;
    
    const messageDigest = getPersonalMessageDigest(message);
    
    let signature = Buffer.from(signatureHex, "hex");
    
    if (signature.length === 65) {
      const recoveryByte = signature[0];
      const sig = signature.slice(1);
      
      try {
        const recoveredPubKey = secp.ecdsaRecover(sig, recoveryByte - 27, messageDigest, true);
        
        const addressPayload = walletAddress.split(":")[1];
        if (!addressPayload) return false;
        
        const { bech32m } = await import("bech32");
        const decoded = bech32m.decode(walletAddress);
        const data = bech32m.fromWords(decoded.words);
        
        if (data.length > 1) {
          const payloadBytes = Uint8Array.from(data.slice(1));
          
          if (payloadBytes.length === 33) {
            const pubKeyMatch = Buffer.from(recoveredPubKey).equals(Buffer.from(payloadBytes));
            if (pubKeyMatch) {
              return secp.ecdsaVerify(sig, messageDigest, recoveredPubKey);
            }
          }
          
          if (payloadBytes.length === 32) {
            const recoveredX = Buffer.from(recoveredPubKey).slice(1);
            if (recoveredX.equals(Buffer.from(payloadBytes))) {
              return secp.ecdsaVerify(sig, messageDigest, recoveredPubKey);
            }
          }
        }
      } catch (e) {
      }
    }
    
    if (signature.length === 64) {
      const { bech32m } = await import("bech32");
      const decoded = bech32m.decode(walletAddress);
      const data = bech32m.fromWords(decoded.words);
      
      if (data.length > 1) {
        const payloadBytes = Uint8Array.from(data.slice(1));
        if (payloadBytes.length === 33) {
          return secp.ecdsaVerify(signature, messageDigest, payloadBytes);
        }
      }
    }
    
    return false;
  } catch (error: any) {
    console.error("[SIWK] ECDSA verification error:", error.message);
    return false;
  }
}

interface AuthSession {
  walletAddress: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

interface PendingChallenge {
  fields: SiwkFields;
  createdAt: number;
  expiresAt: number;
}

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

const pendingChallenges: Map<string, PendingChallenge> = new Map();
const activeSessions: Map<string, AuthSession> = new Map();
const usedNonces: Set<string> = new Set();

function getDomain(): string {
  return process.env.SIWK_DOMAIN || "kaspa-university.replit.app";
}

function getUri(): string {
  return process.env.SIWK_URI || "https://kaspa-university.replit.app";
}

export function generateSiwkChallenge(walletAddress: string): { fields: SiwkFields; message: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_EXPIRY_MS);
  
  const fields: SiwkFields = {
    domain: getDomain(),
    address: walletAddress,
    statement: "Sign in to Kaspa University to access courses and earn rewards.",
    uri: getUri(),
    version: "1",
    chainId: "kaspa:mainnet",
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: expiresAt.toISOString(),
  };
  
  const { message } = buildMessage(fields);
  
  pendingChallenges.set(nonce, {
    fields,
    createdAt: now.getTime(),
    expiresAt: expiresAt.getTime(),
  });
  
  setTimeout(() => {
    pendingChallenges.delete(nonce);
  }, CHALLENGE_EXPIRY_MS);
  
  console.log(`[SIWK] Challenge generated for ${walletAddress.slice(0, 25)}...`);
  
  return { fields, message };
}

export async function verifySiwkSignature(
  fields: SiwkFields,
  signature: string,
  clientIP: string
): Promise<{ valid: boolean; token?: string; expiresAt?: number; error?: string }> {
  try {
    const pending = pendingChallenges.get(fields.nonce);
    
    if (!pending) {
      return { valid: false, error: "Challenge not found or expired" };
    }
    
    if (Date.now() > pending.expiresAt) {
      pendingChallenges.delete(fields.nonce);
      return { valid: false, error: "Challenge expired" };
    }
    
    if (usedNonces.has(fields.nonce)) {
      return { valid: false, error: "Nonce already used (replay attack prevented)" };
    }
    
    let isValid = false;
    let verifyError = "";
    
    const result = await verifySiwk(fields, signature, {
      domain: getDomain(),
      checkNonce: async (nonce: string) => {
        return true;
      },
    });
    
    if (result.valid) {
      isValid = true;
      console.log(`[SIWK] Schnorr verification succeeded for ${fields.address.slice(0, 25)}...`);
    } else {
      verifyError = result.reason || "Schnorr verification failed";
      console.log(`[SIWK] Schnorr failed (${verifyError}), trying ECDSA fallback...`);
      
      const { message } = buildMessage(fields);
      const ecdsaValid = await verifyEcdsaSignature(message, signature, fields.address);
      
      if (ecdsaValid) {
        isValid = true;
        console.log(`[SIWK] ECDSA verification succeeded for ${fields.address.slice(0, 25)}...`);
      } else {
        verifyError = "signature/address mismatch (both Schnorr and ECDSA failed)";
      }
    }
    
    if (!isValid) {
      console.warn(`[SIWK] Verification failed: ${verifyError}`);
      return { valid: false, error: verifyError };
    }
    
    usedNonces.add(fields.nonce);
    setTimeout(() => usedNonces.delete(fields.nonce), CHALLENGE_EXPIRY_MS * 2);
    
    pendingChallenges.delete(fields.nonce);
    
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const expiresAt = now + SESSION_EXPIRY_MS;
    
    activeSessions.set(token, {
      walletAddress: fields.address.toLowerCase(),
      token,
      createdAt: now,
      expiresAt,
      ip: clientIP,
    });
    
    console.log(`[SIWK] Session created for ${fields.address.slice(0, 25)}...`);
    
    return { valid: true, token, expiresAt };
  } catch (error: any) {
    console.error("[SIWK] Verification error:", error.message);
    return { valid: false, error: "Verification failed" };
  }
}

export function validateSiwkSession(
  token: string,
  walletAddress: string,
  clientIP?: string
): { valid: boolean; error?: string } {
  const session = activeSessions.get(token);
  
  if (!session) {
    return { valid: false, error: "Session not found" };
  }
  
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return { valid: false, error: "Session expired" };
  }
  
  if (session.walletAddress !== walletAddress.toLowerCase()) {
    return { valid: false, error: "Wallet address mismatch" };
  }
  
  const strictIPBinding = process.env.STRICT_IP_BINDING === "true";
  if (strictIPBinding && clientIP && session.ip !== clientIP) {
    return { valid: false, error: "IP address changed" };
  }
  
  return { valid: true };
}

export function invalidateSiwkSession(token: string): void {
  activeSessions.delete(token);
}

export function getSiwkSessionWallet(token: string): string | null {
  const session = activeSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    return null;
  }
  return session.walletAddress;
}
