/**
 * Sign-In with Kaspa (SIWK) Authentication Service
 * 
 * Uses @kluster/kaspa-auth for standardized, secure wallet authentication.
 * Implements EIP-4361 style authentication for Kaspa.
 */

import { verifySiwk, buildMessage } from "@kluster/kaspa-auth";
import type { SiwkFields } from "@kluster/kaspa-auth/types";
import crypto from "crypto";

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
    
    const result = await verifySiwk(fields, signature, {
      domain: getDomain(),
      checkNonce: async (nonce: string) => {
        if (usedNonces.has(nonce)) {
          return false;
        }
        usedNonces.add(nonce);
        setTimeout(() => usedNonces.delete(nonce), CHALLENGE_EXPIRY_MS * 2);
        return true;
      },
    });
    
    if (!result.valid) {
      console.warn(`[SIWK] Verification failed: ${result.reason}`);
      return { valid: false, error: result.reason || "Signature verification failed" };
    }
    
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
