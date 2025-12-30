/**
 * Wallet Authentication Service
 * 
 * Implements challenge-response authentication for wallet verification.
 * 
 * SECURITY NOTE: Full BIP-322 signature verification is not yet implemented.
 * The rusty-kaspa WASM verifyMessage expects BIP-322 formatted virtual transactions,
 * but constructing these from plain messages requires implementing the BIP-322 spec.
 * 
 * Current security model relies on:
 * 1. Server-generated unique nonce (prevents replay attacks)
 * 2. Public key → address verification (cryptographically sound)
 * 3. Challenge bound to specific wallet address
 * 4. 5-minute challenge expiry
 * 5. Signature format validation
 * 
 * TODO: Implement BIP-322 virtual transaction construction for full cryptographic
 * signature verification. See rusty-kaspa wallet/wasm/src/bip322.rs for reference.
 * 
 * Uses Kaspa WASM module for address derivation.
 */

import crypto from "crypto";

// Lazy-loaded kaspa module for signature verification
let kaspaModule: any = null;

async function loadKaspaModule(): Promise<any> {
  if (kaspaModule) return kaspaModule;
  
  try {
    const path = await import("path");
    const fs = await import("fs");
    
    const devWasmPath = path.join(process.cwd(), "server/wasm/kaspa.js");
    const prodWasmPath = path.join(process.cwd(), "dist/wasm/kaspa.js");
    
    let wasmPath: string | null = null;
    if (fs.existsSync(prodWasmPath)) {
      wasmPath = prodWasmPath;
    } else if (fs.existsSync(devWasmPath)) {
      wasmPath = devWasmPath;
    }
    
    if (!wasmPath) {
      console.warn("[Auth] Kaspa WASM not found, signature verification will be format-only");
      return null;
    }
    
    kaspaModule = require(wasmPath);
    console.log("[Auth] Kaspa WASM module loaded for signature verification");
    return kaspaModule;
  } catch (error: any) {
    console.error("[Auth] Failed to load Kaspa WASM:", error.message);
    return null;
  }
}

interface AuthChallenge {
  nonce: string;
  message: string;
  walletAddress: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthSession {
  walletAddress: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const pendingChallenges: Map<string, AuthChallenge> = new Map();
const activeSessions: Map<string, AuthSession> = new Map();

export function generateChallenge(walletAddress: string): AuthChallenge {
  const nonce = crypto.randomBytes(32).toString("hex");
  const timestamp = Date.now();
  const message = `Kaspa University Authentication\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}\n\nSign this message to verify wallet ownership.`;
  
  const challenge: AuthChallenge = {
    nonce,
    message,
    walletAddress: walletAddress.toLowerCase(),
    createdAt: timestamp,
    expiresAt: timestamp + CHALLENGE_EXPIRY_MS,
  };
  
  pendingChallenges.set(nonce, challenge);
  
  setTimeout(() => {
    pendingChallenges.delete(nonce);
  }, CHALLENGE_EXPIRY_MS);
  
  return challenge;
}

export async function verifySignature(
  walletAddress: string,
  message: string,
  signatureBase64: string,
  publicKeyHex: string,
  nonce: string
): Promise<{ valid: boolean; error?: string }> {
  const challenge = pendingChallenges.get(nonce);
  
  if (!challenge) {
    return { valid: false, error: "Challenge expired or not found" };
  }
  
  if (challenge.walletAddress !== walletAddress.toLowerCase()) {
    return { valid: false, error: "Wallet address mismatch" };
  }
  
  if (Date.now() > challenge.expiresAt) {
    pendingChallenges.delete(nonce);
    return { valid: false, error: "Challenge expired" };
  }
  
  if (challenge.message !== message) {
    return { valid: false, error: "Message mismatch" };
  }
  
  try {
    // Validate Kaspa address format
    const addressParts = walletAddress.split(":");
    if (addressParts.length !== 2 || addressParts[0] !== "kaspa") {
      return { valid: false, error: "Invalid Kaspa address format" };
    }
    
    // Validate public key format (compressed = 33 bytes hex)
    // KasWare may return with 0x prefix (68 chars) or without (66 chars)
    // Keep original for verifyMessage, normalize for length check
    const originalPubKey = publicKeyHex;
    let normalizedPubKey = publicKeyHex;
    if (publicKeyHex && publicKeyHex.startsWith("0x")) {
      normalizedPubKey = publicKeyHex.slice(2);
    }
    
    if (!normalizedPubKey || normalizedPubKey.length !== 66) {
      console.warn(`[Auth] Invalid public key length: ${publicKeyHex?.length || 0} chars`);
      return { valid: false, error: "Invalid public key format" };
    }
    
    // Load Kaspa WASM module for verification
    const kaspa = await loadKaspaModule();
    
    // Step 1: Verify the public key matches the claimed address using WASM
    if (!kaspa) {
      console.error("[Auth] Kaspa WASM module not available for signature verification");
      return { valid: false, error: "Signature verification unavailable" };
    }
    
    // Verify address matches public key
    // WASM PublicKey accepts either format, try original first
    if (typeof kaspa.PublicKey === "function") {
      try {
        const pubKey = new kaspa.PublicKey(originalPubKey);
        const derivedAddress = pubKey.toAddress("mainnet").toString();
        
        if (derivedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          console.warn(`[Auth] Address mismatch: derived=${derivedAddress}, claimed=${walletAddress}`);
          return { valid: false, error: "Public key does not match wallet address" };
        }
        console.log(`[Auth] Address verified: ${walletAddress.slice(0, 25)}...`);
      } catch (addressError: any) {
        console.error(`[Auth] Address verification failed: ${addressError.message}`);
        return { valid: false, error: "Address verification failed" };
      }
    } else {
      console.error("[Auth] Kaspa WASM PublicKey not available");
      return { valid: false, error: "Address verification unavailable" };
    }
    
    // Step 2: Verify the signature cryptographically using WASM verifyMessage
    // The WASM module handles BIP-322 format internally
    // 
    // KasWare signMessage returns different formats depending on version:
    // - Hex string (with or without 0x prefix)
    // - Base64 encoded string
    // We need to detect and handle both
    
    // KasWare signMessage returns:
    // - ECDSA type: Base64-encoded signature (e.g., "G+LrYa7T5d...")
    // - Default: Base64-encoded signature
    // 
    // rusty-kaspa verifyMessage expects hex-encoded signature
    let signatureHex: string;
    
    // Check if signature looks like base64 (contains +, /, =, or uppercase letters common in base64)
    const isLikelyBase64 = /^[A-Za-z0-9+/]+=*$/.test(signatureBase64) && 
                           (signatureBase64.includes('+') || 
                            signatureBase64.includes('/') || 
                            signatureBase64.endsWith('=') ||
                            signatureBase64.length % 4 === 0);
    
    // Check if signature is already hex (only 0-9, a-f, with optional 0x prefix)
    const isHex = /^(0x)?[0-9a-fA-F]+$/.test(signatureBase64);
    
    if (isLikelyBase64 && !isHex) {
      // Decode base64 to hex for WASM (NO 0x prefix - WASM expects raw hex)
      try {
        const signatureBuffer = Buffer.from(signatureBase64, "base64");
        // KasWare ECDSA signatures are 65 bytes (recovery byte + 64-byte signature)
        // rusty-kaspa verifyMessage expects 64 bytes without recovery byte
        if (signatureBuffer.length === 65) {
          // Strip the first byte (recovery byte) to get raw 64-byte signature
          signatureHex = signatureBuffer.slice(1).toString("hex");
          console.log(`[Auth] Signature is base64 with recovery byte, stripped to 64 bytes`);
        } else {
          signatureHex = signatureBuffer.toString("hex");
          console.log(`[Auth] Signature is base64, decoded to ${signatureBuffer.length} bytes hex`);
        }
      } catch (e) {
        console.warn(`[Auth] Failed to decode base64, trying as hex`);
        signatureHex = signatureBase64.replace(/^0x/, '');
      }
    } else if (isHex) {
      // Already hex, strip 0x prefix if present (WASM expects raw hex)
      signatureHex = signatureBase64.replace(/^0x/, '');
      // Handle 65-byte signatures (130 hex chars) by stripping recovery byte
      if (signatureHex.length === 130) {
        signatureHex = signatureHex.slice(2); // Remove first byte (2 hex chars)
        console.log(`[Auth] Signature is hex with recovery byte, stripped to 64 bytes`);
      } else {
        console.log(`[Auth] Signature is hex format, length: ${signatureHex.length / 2} bytes`);
      }
    } else {
      // Unknown format, try as-is
      console.warn(`[Auth] Unknown signature format, trying as-is`);
      signatureHex = signatureBase64;
    }
    
    // Step 3: Verify the signature using WASM verifyMessage
    if (typeof kaspa.verifyMessage !== "function") {
      console.error("[Auth] Kaspa WASM verifyMessage not available");
      return { valid: false, error: "Signature verification unavailable" };
    }
    
    // Validate signature length (WASM signMessage produces 64 bytes = 128 hex chars)
    // KasWare may produce different lengths, be flexible
    const sigBytes = signatureHex.length / 2;
    if (sigBytes < 64) {
      console.warn(`[Auth] Signature too short: ${sigBytes} bytes`);
      return { valid: false, error: "Invalid signature format" };
    }
    
    console.log(`[Auth] Signature: ${sigBytes} bytes, Public key: ${normalizedPubKey.length / 2} bytes`);
    
    let signatureValid = false;
    
    // Use the stored challenge message to ensure consistency
    const verificationMessage = challenge.message;
    
    try {
      // Log full debug info for troubleshooting
      console.log(`[Auth] Attempting verification with:`);
      console.log(`[Auth]   Message length: ${verificationMessage.length} chars`);
      console.log(`[Auth]   Signature hex length: ${signatureHex.length} chars (${signatureHex.length / 2} bytes)`);
      console.log(`[Auth]   Public key: ${normalizedPubKey.slice(0, 16)}...${normalizedPubKey.slice(-8)}`);
      
      // Use WASM verifyMessage - expects raw hex without 0x prefix
      signatureValid = kaspa.verifyMessage({
        message: verificationMessage,
        signature: signatureHex,
        publicKey: normalizedPubKey,
      });
      
      if (signatureValid) {
        console.log("[Auth] WASM verifyMessage succeeded");
      } else {
        // Try with original full signature (with recovery byte) as fallback
        const signatureBufferFull = Buffer.from(signatureBase64, "base64");
        const fullSigHex = signatureBufferFull.toString("hex");
        
        console.log(`[Auth] First attempt failed, trying with full ${signatureBufferFull.length}-byte signature`);
        
        try {
          signatureValid = kaspa.verifyMessage({
            message: verificationMessage,
            signature: fullSigHex,
            publicKey: normalizedPubKey,
          });
          
          if (signatureValid) {
            console.log("[Auth] WASM verifyMessage succeeded with full signature");
          }
        } catch (e) {
          // Ignore fallback error
        }
        
        if (!signatureValid) {
          console.warn("[Auth] WASM verifyMessage returned false - signature mismatch");
          console.warn(`[Auth]   Message preview: ${verificationMessage.slice(0, 100)}...`);
        }
      }
    } catch (verifyError: any) {
      console.error(`[Auth] WASM verifyMessage error: ${verifyError.message}`);
      console.error(`[Auth]   Stack: ${verifyError.stack?.slice(0, 200)}`);
      console.log(`[Auth]   Full signature hex: ${signatureHex}`);
      console.log(`[Auth]   Message preview: ${verificationMessage.slice(0, 100)}...`);
      console.log(`[Auth]   Full pubkey: ${normalizedPubKey}`);
    }
    
    if (!signatureValid) {
      console.warn(`[Auth] Signature verification failed for ${walletAddress.slice(0, 20)}...`);
      return { valid: false, error: "Invalid signature" };
    }
    
    pendingChallenges.delete(nonce);
    console.log(`[Auth] Signature verified for ${walletAddress.slice(0, 25)}...`);
    return { valid: true };
  } catch (error: any) {
    console.error("[Auth] Signature verification error:", error.message);
    return { valid: false, error: "Signature verification failed" };
  }
}

export function createSession(walletAddress: string, ip: string): AuthSession {
  const token = crypto.randomBytes(48).toString("hex");
  const timestamp = Date.now();
  
  const session: AuthSession = {
    walletAddress: walletAddress.toLowerCase(),
    token,
    createdAt: timestamp,
    expiresAt: timestamp + SESSION_EXPIRY_MS,
    ip,
  };
  
  // Store by token for quick lookup
  activeSessions.set(token, session);
  
  // Cleanup expired sessions periodically
  setTimeout(() => {
    if (activeSessions.get(token)?.expiresAt === session.expiresAt) {
      activeSessions.delete(token);
    }
  }, SESSION_EXPIRY_MS);
  
  console.log(`[Auth] Session created for ${walletAddress.slice(0, 20)}... from ${ip}`);
  
  return session;
}

export function validateSession(
  token: string, 
  walletAddress: string, 
  clientIP?: string
): { valid: boolean; error?: string } {
  if (!token) {
    return { valid: false, error: "No auth token provided" };
  }
  
  const session = activeSessions.get(token);
  
  if (!session) {
    return { valid: false, error: "Session not found or expired" };
  }
  
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return { valid: false, error: "Session expired" };
  }
  
  if (session.walletAddress !== walletAddress.toLowerCase()) {
    return { valid: false, error: "Wallet address mismatch" };
  }
  
  // Enforce IP binding if provided
  // Security: Strict mode blocks session hijacking from different IPs
  // Default is permissive to support mobile networks and NAT environments
  // Set STRICT_IP_BINDING=true for high-security deployments
  const STRICT_IP_BINDING = process.env.STRICT_IP_BINDING === "true"; // Default: disabled
  
  if (clientIP && session.ip !== clientIP) {
    console.warn(`[Auth] IP mismatch for session: expected ${session.ip}, got ${clientIP}`);
    
    if (STRICT_IP_BINDING) {
      // Block session use from different IP - prevents session hijacking
      return { valid: false, error: "Session expired. Please reconnect your wallet." };
    }
    // In permissive mode (default), log but allow for mobile/NAT compatibility
  }
  
  return { valid: true };
}

export function invalidateSession(token: string): void {
  activeSessions.delete(token);
}

export function getSessionByToken(token: string): AuthSession | null {
  const session = activeSessions.get(token);
  if (session && Date.now() <= session.expiresAt) {
    return session;
  }
  if (session) {
    activeSessions.delete(token);
  }
  return null;
}

// Cleanup old sessions every hour
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  const tokensToDelete: string[] = [];
  activeSessions.forEach((session, token) => {
    if (now > session.expiresAt) {
      tokensToDelete.push(token);
    }
  });
  tokensToDelete.forEach(token => {
    activeSessions.delete(token);
    cleaned++;
  });
  if (cleaned > 0) {
    console.log(`[Auth] Cleaned up ${cleaned} expired sessions`);
  }
}, 60 * 60 * 1000);
