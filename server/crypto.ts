/**
 * Cryptographic utilities for Kaspa University
 * 
 * Handles:
 * - Wallet signature verification
 * - Challenge generation and validation
 * - Session token management
 */

import { createHash, randomBytes } from "crypto";

interface AuthChallenge {
  challenge: string;
  timestamp: number;
  expiresAt: number;
  walletAddress: string;
}

interface SignatureVerification {
  valid: boolean;
  walletAddress?: string;
  error?: string;
}

interface QuizSession {
  sessionId: string;
  lessonId: string;
  walletAddress: string;
  questionHashes: string[];
  startTime: number;
  expiresAt: number;
}

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const QUIZ_SESSION_EXPIRY_MS = 30 * 60 * 1000;

const pendingChallenges: Map<string, AuthChallenge> = new Map();
const verifiedSessions: Map<string, { walletAddress: string; verifiedAt: number; expiresAt: number }> = new Map();
const quizSessions: Map<string, QuizSession> = new Map();

export function generateAuthChallenge(walletAddress: string): { challenge: string; message: string } {
  const challengeBytes = randomBytes(32);
  const challenge = challengeBytes.toString("hex");
  const timestamp = Date.now();
  
  const normalizedAddress = walletAddress.toLowerCase();
  
  pendingChallenges.set(challenge, {
    challenge,
    timestamp,
    expiresAt: timestamp + CHALLENGE_EXPIRY_MS,
    walletAddress: normalizedAddress,
  });
  
  const message = `Kaspa University Authentication\n\nWallet: ${walletAddress}\nChallenge: ${challenge}\nTimestamp: ${timestamp}\n\nSign this message to verify wallet ownership.`;
  
  return { challenge, message };
}

export async function verifySignature(
  challenge: string,
  signature: string,
  publicKey: string,
  walletAddress: string
): Promise<SignatureVerification> {
  try {
    const pendingChallenge = pendingChallenges.get(challenge);
    
    if (!pendingChallenge) {
      return { valid: false, error: "Challenge not found or expired" };
    }
    
    if (Date.now() > pendingChallenge.expiresAt) {
      pendingChallenges.delete(challenge);
      return { valid: false, error: "Challenge expired" };
    }
    
    const normalizedAddress = walletAddress.toLowerCase();
    if (pendingChallenge.walletAddress !== normalizedAddress) {
      return { valid: false, error: "Wallet address mismatch" };
    }
    
    const derivedAddress = deriveAddressFromPublicKey(publicKey);
    if (!derivedAddress || derivedAddress.toLowerCase() !== normalizedAddress) {
      return { valid: false, error: "Public key does not match wallet address" };
    }
    
    const message = `Kaspa University Authentication\n\nWallet: ${walletAddress}\nChallenge: ${challenge}\nTimestamp: ${pendingChallenge.timestamp}\n\nSign this message to verify wallet ownership.`;
    
    const isValid = await verifyKaspaSignature(message, signature, publicKey);
    
    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }
    
    pendingChallenges.delete(challenge);
    
    const sessionToken = randomBytes(32).toString("hex");
    const now = Date.now();
    verifiedSessions.set(sessionToken, {
      walletAddress: normalizedAddress,
      verifiedAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });
    
    return { 
      valid: true, 
      walletAddress: normalizedAddress,
    };
  } catch (error: any) {
    console.error("[Crypto] Signature verification error:", error.message);
    return { valid: false, error: "Verification failed" };
  }
}

export function verifySessionToken(token: string): { valid: boolean; walletAddress?: string } {
  const session = verifiedSessions.get(token);
  
  if (!session) {
    return { valid: false };
  }
  
  if (Date.now() > session.expiresAt) {
    verifiedSessions.delete(token);
    return { valid: false };
  }
  
  return { valid: true, walletAddress: session.walletAddress };
}

function deriveAddressFromPublicKey(publicKeyHex: string): string | null {
  try {
    const pubKeyBuffer = Buffer.from(publicKeyHex, "hex");
    
    if (pubKeyBuffer.length === 33 || pubKeyBuffer.length === 65) {
      const hash = createHash("sha256").update(pubKeyBuffer).digest();
      const ripemd = createHash("ripemd160").update(hash).digest();
      return `kaspa:q${ripemd.toString("hex")}`;
    }
    
    if (pubKeyBuffer.length === 32) {
      return `kaspa:q${pubKeyBuffer.toString("hex")}`;
    }
    
    return null;
  } catch {
    return null;
  }
}

async function verifyKaspaSignature(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const secp256k1 = await import("secp256k1");
    const secp = secp256k1.default || secp256k1;
    
    const messageHash = createHash("sha256").update(message).digest();
    const signature = Buffer.from(signatureHex, "hex");
    const publicKey = Buffer.from(publicKeyHex, "hex");
    
    if (signature.length === 64) {
      return secp.ecdsaVerify(signature, messageHash, publicKey);
    }
    
    if (signature.length === 65) {
      const sig = signature.slice(0, 64);
      return secp.ecdsaVerify(sig, messageHash, publicKey);
    }
    
    return false;
  } catch (error: any) {
    console.error("[Crypto] Secp256k1 verification failed:", error.message);
    return false;
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

setInterval(() => {
  const now = Date.now();
  
  for (const [key, challenge] of Array.from(pendingChallenges.entries())) {
    if (now > challenge.expiresAt) {
      pendingChallenges.delete(key);
    }
  }
  
  for (const [token, session] of Array.from(verifiedSessions.entries())) {
    if (now > session.expiresAt) {
      verifiedSessions.delete(token);
    }
  }
  
  for (const [key, session] of Array.from(quizSessions.entries())) {
    if (now > session.expiresAt) {
      quizSessions.delete(key);
    }
  }
}, 60 * 1000);
