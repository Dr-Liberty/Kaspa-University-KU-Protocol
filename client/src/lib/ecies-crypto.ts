/**
 * ECIES Encryption Module for Kasia-Compatible E2E Encryption
 * 
 * Uses ECIES (Elliptic Curve Integrated Encryption Scheme) which embeds
 * an ephemeral public key in each encrypted message. This is more compatible
 * with how the official Kasia app handles encryption.
 * 
 * Key differences from session-based ECDH:
 * - Each message has its own ephemeral keypair
 * - No need for key exchange before messaging
 * - Recipient only needs their static keypair to decrypt
 */

import { PrivateKey, encrypt, decrypt } from "eciesjs";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface EciesKeypair {
  privateKeyHex: string;
  publicKeyHex: string;
}

/**
 * Derive an ECIES keypair from a wallet signature.
 * The signature provides entropy to deterministically derive the keypair.
 * 
 * This allows users to have a consistent encryption identity tied to their wallet,
 * without exposing their actual wallet private key.
 */
export function deriveEciesKeypairFromSignature(
  signature: string,
  walletAddress: string
): EciesKeypair {
  const signatureBytes = new TextEncoder().encode(signature);
  const salt = new TextEncoder().encode(`kasia:ecies:v1:${walletAddress}`);
  const info = new TextEncoder().encode("kasia-ecies-keypair");
  
  const privateKeyBytes = hkdf(sha256, signatureBytes, salt, info, 32);
  const privateKeyHex = bytesToHex(privateKeyBytes);
  
  const privateKey = new PrivateKey(privateKeyBytes);
  const publicKeyHex = privateKey.publicKey.toHex();
  
  return { privateKeyHex, publicKeyHex };
}

/**
 * Encrypt a message using ECIES.
 * 
 * @param recipientPublicKeyHex - The recipient's public key (hex string)
 * @param plaintext - The message to encrypt
 * @returns Encrypted data as hex string with "ecies:" prefix
 */
export function eciesEncrypt(
  recipientPublicKeyHex: string,
  plaintext: string
): string {
  try {
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const encrypted = encrypt(recipientPublicKeyHex, plaintextBytes);
    return `ecies:${bytesToHex(encrypted)}`;
  } catch (error) {
    console.error("[ECIES] Encryption failed:", error);
    throw error;
  }
}

/**
 * Decrypt a message using ECIES.
 * 
 * @param privateKeyHex - The recipient's private key (hex string)
 * @param encryptedHex - The encrypted data (with or without "ecies:" prefix)
 * @returns Decrypted plaintext string
 */
export function eciesDecrypt(
  privateKeyHex: string,
  encryptedHex: string
): string {
  try {
    let hex = encryptedHex;
    if (hex.startsWith("ecies:")) {
      hex = hex.slice(6);
    }
    
    const encryptedBytes = hexToBytes(hex);
    const decrypted = decrypt(privateKeyHex, encryptedBytes);
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("[ECIES] Decryption failed:", error);
    throw error;
  }
}

/**
 * Check if an encrypted string uses ECIES format.
 */
export function isEciesEncrypted(data: string): boolean {
  return data.startsWith("ecies:");
}

/**
 * Validate that a hex string could be a valid secp256k1 public key.
 * Compressed keys are 33 bytes (66 hex), uncompressed are 65 bytes (130 hex).
 */
export function isValidEciesPublicKey(hex: string | null): boolean {
  if (!hex) return false;
  // Compressed: 66 hex chars, Uncompressed: 130 hex chars
  if (hex.length !== 66 && hex.length !== 130) return false;
  // Must be valid hex
  return /^[a-fA-F0-9]+$/.test(hex);
}

/**
 * Get the public key hex from a private key hex.
 */
export function getPublicKeyFromPrivate(privateKeyHex: string): string {
  const privateKey = new PrivateKey(hexToBytes(privateKeyHex));
  return privateKey.publicKey.toHex();
}

const CONTACT_KEYS_STORE = "kasia-contact-keys";
const CONTACT_KEYS_DB = "kaspa-university-contacts";

interface ContactKeyEntry {
  walletAddress: string;
  eciesPubkey: string;
  updatedAt: number;
}

function openContactKeysDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONTACT_KEYS_DB, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CONTACT_KEYS_STORE)) {
        db.createObjectStore(CONTACT_KEYS_STORE, { keyPath: "walletAddress" });
      }
    };
  });
}

export async function storeContactEciesPubkey(
  walletAddress: string,
  eciesPubkey: string
): Promise<void> {
  if (!walletAddress || !eciesPubkey) return;
  
  const normalized = walletAddress.toLowerCase();
  
  try {
    const db = await openContactKeysDb();
    const tx = db.transaction(CONTACT_KEYS_STORE, "readwrite");
    const store = tx.objectStore(CONTACT_KEYS_STORE);
    
    const entry: ContactKeyEntry = {
      walletAddress: normalized,
      eciesPubkey,
      updatedAt: Date.now()
    };
    
    store.put(entry);
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    console.log(`[ECIES] Stored contact pubkey for ${normalized.slice(0, 16)}...`);
  } catch (error) {
    console.error("[ECIES] Failed to store contact pubkey:", error);
  }
}

export async function getContactEciesPubkey(
  walletAddress: string
): Promise<string | null> {
  if (!walletAddress) return null;
  
  const normalized = walletAddress.toLowerCase();
  
  try {
    const db = await openContactKeysDb();
    const tx = db.transaction(CONTACT_KEYS_STORE, "readonly");
    const store = tx.objectStore(CONTACT_KEYS_STORE);
    
    const request = store.get(normalized);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entry = request.result as ContactKeyEntry | undefined;
        resolve(entry?.eciesPubkey ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("[ECIES] Failed to get contact pubkey:", error);
    return null;
  }
}

export async function getAllContactEciesPubkeys(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  try {
    const db = await openContactKeysDb();
    const tx = db.transaction(CONTACT_KEYS_STORE, "readonly");
    const store = tx.objectStore(CONTACT_KEYS_STORE);
    
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entries = request.result as ContactKeyEntry[];
        for (const entry of entries) {
          result.set(entry.walletAddress, entry.eciesPubkey);
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("[ECIES] Failed to get all contact pubkeys:", error);
    return result;
  }
}

export { PrivateKey };
