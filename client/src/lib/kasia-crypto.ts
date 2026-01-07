/**
 * Kasia Encryption Library (Client-Side)
 * 
 * Implements the Kasia E2EE protocol for full interoperability with
 * external Kasia platforms. Uses the same cryptographic primitives:
 * - ECDH key exchange using secp256k1
 * - HKDF-SHA256 for key derivation
 * - ChaCha20-Poly1305 for symmetric encryption
 * 
 * Message format (matches Kasia):
 * - nonce: 12 bytes
 * - ephemeral_public_key: 33 bytes (SEC1 compressed)
 * - ciphertext: variable (includes 16-byte auth tag)
 */

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { bech32 } from "bech32";

const NONCE_LENGTH = 12;
const EPHEMERAL_KEY_LENGTH = 33;

/**
 * Securely zero out a Uint8Array to prevent key material from lingering in memory
 * Uses crypto.getRandomValues to overwrite, then zeros, to defeat optimization
 */
function zeroize(buffer: Uint8Array): void {
  if (!buffer || buffer.length === 0) return;
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buffer);
  }
  buffer.fill(0);
}

export interface EncryptedMessage {
  nonce: Uint8Array;
  ephemeralPublicKey: Uint8Array;
  ciphertext: Uint8Array;
}

/**
 * Convert a Kaspa address to its public key bytes
 * Uses canonical bech32 decoder with checksum validation
 * Kaspa addresses contain the x-coordinate of the public key in their payload
 * 
 * Note: Kaspa uses ':' as separator (e.g., kaspa:qr...) but bech32 library
 * expects '1' as separator (e.g., kaspa1qr...). We normalize before decoding.
 */
export function addressToPublicKey(kaspaAddress: string): Uint8Array {
  const address = kaspaAddress.toLowerCase();
  
  const validPrefixes = ["kaspa:", "kaspatest:", "kaspadev:", "kaspasim:"];
  const matchedPrefix = validPrefixes.find(p => address.startsWith(p));
  
  if (!matchedPrefix) {
    throw new Error(`Invalid Kaspa address prefix. Expected one of: ${validPrefixes.join(", ")}`);
  }
  
  const hrp = matchedPrefix.slice(0, -1);
  const bech32Address = hrp + "1" + address.slice(matchedPrefix.length);
  
  let decoded;
  try {
    decoded = bech32.decode(bech32Address, 150);
  } catch (error) {
    throw new Error(`Invalid Kaspa address: bech32 decode failed - ${error}`);
  }
  
  const data = bech32.fromWords(decoded.words);
  if (data.length < 2) {
    throw new Error("Invalid Kaspa address: payload too short");
  }
  
  const addressType = data[0];
  const payloadBytes = new Uint8Array(data.slice(1));
  
  if (addressType !== 0 && addressType !== 1) {
    throw new Error(`Unsupported address type: ${addressType} (expected 0=Schnorr or 1=ECDSA)`);
  }
  
  if (payloadBytes.length !== 32 && payloadBytes.length !== 33) {
    throw new Error(`Invalid public key payload length: ${payloadBytes.length}`);
  }
  
  let fullPubKey: Uint8Array;
  if (payloadBytes.length === 33) {
    fullPubKey = payloadBytes;
  } else {
    fullPubKey = new Uint8Array(33);
    fullPubKey[0] = 0x02;
    fullPubKey.set(payloadBytes, 1);
  }
  
  return fullPubKey;
}

/**
 * Perform ECDH key exchange and derive a symmetric key
 * Note: Caller is responsible for zeroizing privateKey if needed
 */
function deriveSharedKey(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  const sharedPoint = secp256k1.getSharedSecret(privateKey, publicKey, true);
  const sharedSecret = new Uint8Array(sharedPoint.slice(1));
  
  try {
    const derivedKey = hkdf(sha256, sharedSecret, undefined, new Uint8Array(0), 32);
    return derivedKey;
  } finally {
    zeroize(sharedSecret);
  }
}

/**
 * Encrypt a message for a recipient using Kasia E2EE protocol
 * Implements key zeroization for ephemeral private key and shared key
 * 
 * @param recipientAddress - The recipient's Kaspa address
 * @param message - The plaintext message to encrypt
 * @returns EncryptedMessage object
 */
export function encryptMessage(
  recipientAddress: string,
  message: string
): EncryptedMessage {
  let recipientPubKey = addressToPublicKey(recipientAddress);
  
  if (!secp256k1.utils.isValidPublicKey(recipientPubKey, true)) {
    const altPubKey = new Uint8Array(recipientPubKey);
    altPubKey[0] = 0x03;
    if (secp256k1.utils.isValidPublicKey(altPubKey, true)) {
      recipientPubKey = altPubKey;
    } else {
      throw new Error("Invalid recipient public key");
    }
  }
  
  const ephemeralPrivKey = new Uint8Array(secp256k1.utils.randomSecretKey());
  let sharedKey: Uint8Array | null = null;
  
  try {
    const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true);
    sharedKey = deriveSharedKey(ephemeralPrivKey, recipientPubKey);
    const nonce = randomBytes(NONCE_LENGTH);
    const messageBytes = new TextEncoder().encode(message);
    const cipher = chacha20poly1305(sharedKey, nonce);
    const ciphertext = cipher.encrypt(messageBytes);
    
    return {
      nonce,
      ephemeralPublicKey: ephemeralPubKey,
      ciphertext,
    };
  } finally {
    zeroize(ephemeralPrivKey);
    if (sharedKey) zeroize(sharedKey);
  }
}

/**
 * Decrypt a message using the recipient's private key
 * Implements key zeroization for shared key after decryption
 * Note: Caller is responsible for zeroizing privateKey if needed
 * 
 * @param encrypted - The encrypted message object
 * @param privateKey - The recipient's private key (32 bytes)
 * @returns The decrypted plaintext message
 */
export function decryptMessage(
  encrypted: EncryptedMessage,
  privateKey: Uint8Array
): string {
  let ephemeralPubKey = encrypted.ephemeralPublicKey;
  
  if (!secp256k1.utils.isValidPublicKey(ephemeralPubKey, true)) {
    const altPubKey = new Uint8Array(ephemeralPubKey);
    altPubKey[0] = altPubKey[0] === 0x02 ? 0x03 : 0x02;
    if (secp256k1.utils.isValidPublicKey(altPubKey, true)) {
      ephemeralPubKey = altPubKey;
    } else {
      throw new Error("Invalid ephemeral public key in encrypted message");
    }
  }
  
  const sharedKey = deriveSharedKey(privateKey, ephemeralPubKey);
  
  try {
    const cipher = chacha20poly1305(sharedKey, encrypted.nonce);
    const plaintext = cipher.decrypt(encrypted.ciphertext);
    return new TextDecoder().decode(plaintext);
  } finally {
    zeroize(sharedKey);
  }
}

/**
 * Serialize an encrypted message to bytes (Kasia format)
 * Format: nonce (12) + ephemeral_public_key (33) + ciphertext (variable)
 */
export function encryptedMessageToBytes(encrypted: EncryptedMessage): Uint8Array {
  const totalLength = NONCE_LENGTH + EPHEMERAL_KEY_LENGTH + encrypted.ciphertext.length;
  const bytes = new Uint8Array(totalLength);
  
  bytes.set(encrypted.nonce, 0);
  bytes.set(encrypted.ephemeralPublicKey, NONCE_LENGTH);
  bytes.set(encrypted.ciphertext, NONCE_LENGTH + EPHEMERAL_KEY_LENGTH);
  
  return bytes;
}

/**
 * Deserialize bytes to an encrypted message (Kasia format)
 */
export function bytesToEncryptedMessage(bytes: Uint8Array): EncryptedMessage {
  const nonce = bytes.slice(0, NONCE_LENGTH);
  
  const isSec1Compressed = bytes.length > 12 && (bytes[12] === 0x02 || bytes[12] === 0x03);
  const keySize = isSec1Compressed ? 33 : 32;
  const keyEnd = NONCE_LENGTH + keySize;
  
  const ephemeralPublicKey = bytes.slice(NONCE_LENGTH, keyEnd);
  const ciphertext = bytes.slice(keyEnd);
  
  return {
    nonce,
    ephemeralPublicKey,
    ciphertext,
  };
}

/**
 * Convert encrypted message to hex string
 */
export function encryptedMessageToHex(encrypted: EncryptedMessage): string {
  const bytes = encryptedMessageToBytes(encrypted);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Parse hex string to encrypted message
 */
export function hexToEncryptedMessage(hex: string): EncryptedMessage {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytesToEncryptedMessage(bytes);
}

/**
 * Derive a conversation-specific encryption key from wallet signature
 * This allows the wallet to "unlock" conversation keys without exposing the private key
 * 
 * @param signature - A signature from the wallet (used as entropy)
 * @param conversationId - The conversation ID for domain separation
 * @returns A derived key for this specific conversation
 */
export function deriveConversationKey(
  signature: string,
  conversationId: string
): Uint8Array {
  const sigBytes = typeof signature === "string" 
    ? new TextEncoder().encode(signature) 
    : signature;
  const salt = new TextEncoder().encode(`kasia:conversation:${conversationId}`);
  
  return hkdf(sha256, sigBytes, salt, new Uint8Array(0), 32);
}

/**
 * Key storage interface for managing conversation keys
 */
export interface ConversationKeyStore {
  getKey(conversationId: string): Uint8Array | null;
  setKey(conversationId: string, key: Uint8Array): void;
  hasKey(conversationId: string): boolean;
  clearAll(): void;
}

/**
 * In-memory key store (for session-based key management)
 */
export function createMemoryKeyStore(): ConversationKeyStore {
  const keys = new Map<string, Uint8Array>();
  
  return {
    getKey: (conversationId) => keys.get(conversationId) || null,
    setKey: (conversationId, key) => keys.set(conversationId, key),
    hasKey: (conversationId) => keys.has(conversationId),
    clearAll: () => keys.clear(),
  };
}

/**
 * IndexedDB-backed key store (for persistent key storage)
 */
export async function createPersistentKeyStore(
  walletAddress: string
): Promise<ConversationKeyStore> {
  const dbName = `kasia-keys-${walletAddress.slice(-8)}`;
  const storeName = "conversation-keys";
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      
      const store: ConversationKeyStore = {
        getKey: (conversationId) => {
          return new Promise((res) => {
            const tx = db.transaction(storeName, "readonly");
            const objStore = tx.objectStore(storeName);
            const req = objStore.get(conversationId);
            req.onsuccess = () => res(req.result || null);
            req.onerror = () => res(null);
          }) as unknown as Uint8Array | null;
        },
        
        setKey: (conversationId, key) => {
          const tx = db.transaction(storeName, "readwrite");
          const objStore = tx.objectStore(storeName);
          objStore.put(key, conversationId);
        },
        
        hasKey: (conversationId) => {
          return new Promise((res) => {
            const tx = db.transaction(storeName, "readonly");
            const objStore = tx.objectStore(storeName);
            const req = objStore.get(conversationId);
            req.onsuccess = () => res(!!req.result);
            req.onerror = () => res(false);
          }) as unknown as boolean;
        },
        
        clearAll: () => {
          const tx = db.transaction(storeName, "readwrite");
          const objStore = tx.objectStore(storeName);
          objStore.clear();
        },
      };
      
      resolve(store);
    };
  });
}

/**
 * Generate a sealed handshake payload for Kasia protocol
 * The handshake data is encrypted to the recipient
 */
export function createSealedHandshake(
  recipientAddress: string,
  senderAlias: string,
  conversationId: string,
  isResponse: boolean = false
): string {
  const handshakeData = {
    alias: senderAlias,
    timestamp: new Date().toISOString(),
    conversation_id: conversationId,
    version: 1,
    recipient_address: recipientAddress,
    send_to_recipient: true,
    is_response: isResponse || null,
  };
  
  const jsonString = JSON.stringify(handshakeData);
  const encrypted = encryptMessage(recipientAddress, jsonString);
  const sealedHex = encryptedMessageToHex(encrypted);
  
  return `ciph_msg:${sealedHex}`;
}

/**
 * Create a sealed contextual message for Kasia protocol
 */
export function createSealedMessage(
  recipientAddress: string,
  conversationAlias: string,
  messageContent: string
): string {
  const encrypted = encryptMessage(recipientAddress, messageContent);
  const sealedHex = encryptedMessageToHex(encrypted);
  
  return `ciph_msg:1:comm:${conversationAlias}:${sealedHex}`;
}

/**
 * Parse and decrypt a sealed handshake payload
 */
export function parseSealedHandshake(
  payload: string,
  privateKey: Uint8Array
): {
  alias: string;
  timestamp: string;
  conversationId: string;
  recipientAddress: string;
  isResponse: boolean;
} | null {
  try {
    let sealedHex = payload;
    if (payload.startsWith("ciph_msg:")) {
      const parts = payload.split(":");
      if (parts.length >= 2) {
        sealedHex = parts[1];
        if (parts.length > 2 && parts[1] === "1") {
          return null;
        }
      }
    }
    
    const encrypted = hexToEncryptedMessage(sealedHex);
    const decrypted = decryptMessage(encrypted, privateKey);
    const data = JSON.parse(decrypted);
    
    return {
      alias: data.alias,
      timestamp: data.timestamp,
      conversationId: data.conversation_id,
      recipientAddress: data.recipient_address,
      isResponse: data.is_response === true,
    };
  } catch (error) {
    console.error("[Kasia Crypto] Failed to parse sealed handshake:", error);
    return null;
  }
}

/**
 * Parse and decrypt a sealed contextual message
 */
export function parseSealedMessage(
  payload: string,
  privateKey: Uint8Array
): { alias: string; content: string } | null {
  try {
    if (!payload.startsWith("ciph_msg:1:comm:")) {
      return null;
    }
    
    const rest = payload.slice("ciph_msg:1:comm:".length);
    const delimIdx = rest.indexOf(":");
    if (delimIdx === -1) return null;
    
    const alias = rest.slice(0, delimIdx);
    const sealedHex = rest.slice(delimIdx + 1);
    
    const encrypted = hexToEncryptedMessage(sealedHex);
    const content = decryptMessage(encrypted, privateKey);
    
    return { alias, content };
  } catch (error) {
    console.error("[Kasia Crypto] Failed to parse sealed message:", error);
    return null;
  }
}
