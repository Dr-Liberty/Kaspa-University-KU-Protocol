import { useCallback, useRef, useEffect } from "react";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";

const NONCE_LENGTH = 12;
const KEY_LENGTH = 32;
const DB_NAME = "kasia-keys";
const STORE_NAME = "conversation-keys";

interface ConversationKey {
  conversationId: string;
  symmetricKey: Uint8Array;
  createdAt: number;
  myAddress: string;
  otherAddress: string;
}

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

/**
 * Validate that a string is a valid X25519 public key (64 hex chars).
 * Legacy signatures are longer and don't match this format.
 */
function isValidX25519PublicKey(hex: string | null): boolean {
  if (!hex) return false;
  // X25519 public keys are exactly 32 bytes = 64 hex chars
  if (hex.length !== 64) return false;
  // Must be valid hex
  return /^[a-fA-F0-9]{64}$/.test(hex);
}

/**
 * Derive an X25519 keypair from a signature.
 * The signature acts as entropy to derive a deterministic keypair.
 * This allows ECDH key exchange without exposing wallet private keys.
 */
function deriveX25519KeypairFromSignature(
  signature: string,
  conversationId: string
): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const signatureBytes = new TextEncoder().encode(signature);
  const salt = new TextEncoder().encode(`kasia:x25519:v1:${conversationId}`);
  const info = new TextEncoder().encode("kasia-ecdh-keypair");
  
  const privateKey = hkdf(sha256, signatureBytes, salt, info, 32);
  const publicKey = x25519.getPublicKey(privateKey);
  
  return { privateKey, publicKey };
}

/**
 * Perform X25519 ECDH to derive a shared secret.
 * Uses my private key + their public key.
 */
function computeSharedSecret(
  myPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array,
  conversationId: string
): Uint8Array {
  const rawShared = x25519.getSharedSecret(myPrivateKey, theirPublicKey);
  const salt = new TextEncoder().encode(`kasia:shared:v4:${conversationId}`);
  const info = new TextEncoder().encode("kasia-e2ee-symmetric");
  
  return hkdf(sha256, rawShared, salt, info, KEY_LENGTH);
}

export function useConversationKeys(walletAddress: string | null) {
  const keysCache = useRef<Map<string, Uint8Array>>(new Map());
  const keypairCache = useRef<Map<string, { privateKey: Uint8Array; publicKey: Uint8Array }>>(new Map());
  const dbRef = useRef<IDBDatabase | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    const dbName = `${DB_NAME}-${walletAddress.slice(-8)}`;
    const request = indexedDB.open(dbName, 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "conversationId" });
      }
    };

    request.onsuccess = () => {
      dbRef.current = request.result;
      loadAllKeys();
    };

    request.onerror = () => {
      console.error("[ConversationKeys] Failed to open IndexedDB:", request.error);
    };

    return () => {
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, [walletAddress]);

  const loadAllKeys = useCallback(async () => {
    if (!dbRef.current) return;

    const tx = dbRef.current.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const keys = request.result as ConversationKey[];
      keys.forEach((k) => {
        keysCache.current.set(k.conversationId, k.symmetricKey);
      });
      console.log(`[ConversationKeys] Loaded ${keys.length} keys from IndexedDB`);
    };
  }, []);

  const storeKey = useCallback(async (conversationId: string, key: Uint8Array) => {
    keysCache.current.set(conversationId, key);

    if (!dbRef.current) return;

    const tx = dbRef.current.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({
      conversationId,
      symmetricKey: key,
      createdAt: Date.now(),
    });
  }, []);

  const getKey = useCallback((conversationId: string): Uint8Array | null => {
    return keysCache.current.get(conversationId) || null;
  }, []);

  const hasKey = useCallback((conversationId: string): boolean => {
    return keysCache.current.has(conversationId);
  }, []);

  /**
   * Fetch ECDH public keys from server for key exchange.
   */
  const fetchEcdhKeys = useCallback(async (conversationId: string): Promise<{
    initiatorPublicKey: string | null;
    recipientPublicKey: string | null;
    keyExchangeComplete: boolean;
  } | null> => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/e2e-key`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[ConversationKeys] Failed to fetch ECDH keys:", error);
      return null;
    }
  }, []);

  /**
   * Submit my ECDH public key to server and get the other party's if available.
   */
  const submitEcdhPublicKey = useCallback(async (
    conversationId: string,
    publicKeyHex: string
  ): Promise<{
    initiatorPublicKey: string | null;
    recipientPublicKey: string | null;
    keyExchangeComplete: boolean;
  } | null> => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/e2e-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publicKey: publicKeyHex }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[ConversationKeys] Failed to submit ECDH public key:", error);
      return null;
    }
  }, []);

  /**
   * Initialize E2E encryption key using single-signature ECDH.
   * 
   * Flow:
   * 1. User signs a deterministic message for this conversation
   * 2. Signature is used to derive an X25519 keypair locally
   * 3. Public key is sent to server for the other party
   * 4. When both public keys are available, ECDH derives the shared secret
   * 
   * Key insight: Only YOUR signature is needed. The shared secret is derived
   * from your private key + their public key, which is standard ECDH.
   */
  const initializeKey = useCallback(async (
    conversationId: string,
    myAddress: string,
    otherAddress: string,
    signMessage: (msg: string) => Promise<string>,
    isInitiator: boolean
  ): Promise<Uint8Array | null> => {
    const existing = keysCache.current.get(conversationId);
    if (existing) {
      console.log("[ConversationKeys] Using cached symmetric key");
      return existing;
    }

    let keypair = keypairCache.current.get(conversationId);
    
    if (!keypair) {
      const initiatorAddress = isInitiator ? myAddress : otherAddress;
      const recipientAddress = isInitiator ? otherAddress : myAddress;
      const messageToSign = `kasia:ecdh:v1:${initiatorAddress}:${recipientAddress}:${conversationId}`;
      
      console.log("[ConversationKeys] Requesting signature for ECDH keypair derivation...");
      const mySignature = await signMessage(messageToSign);
      
      keypair = deriveX25519KeypairFromSignature(mySignature, conversationId);
      keypairCache.current.set(conversationId, keypair);
      console.log("[ConversationKeys] Derived X25519 keypair from signature");
    }
    
    const myPublicKeyHex = bytesToHex(keypair.publicKey);
    const result = await submitEcdhPublicKey(conversationId, myPublicKeyHex);
    
    if (!result) {
      console.error("[ConversationKeys] Failed to submit public key to server");
      return null;
    }
    
    if (result.keyExchangeComplete) {
      const theirPublicKeyHex = isInitiator 
        ? result.recipientPublicKey! 
        : result.initiatorPublicKey!;
      
      // Validate that the other party's key is a valid X25519 public key (not a legacy signature)
      if (!isValidX25519PublicKey(theirPublicKeyHex)) {
        console.warn("[ConversationKeys] Other party has legacy signature, not X25519 public key. Waiting for upgrade.");
        return null;
      }
      
      const theirPublicKey = hexToBytes(theirPublicKeyHex);
      
      const sharedKey = computeSharedSecret(keypair.privateKey, theirPublicKey, conversationId);
      await storeKey(conversationId, sharedKey);
      
      console.log("[ConversationKeys] ECDH complete - symmetric key derived");
      return sharedKey;
    }
    
    console.log("[ConversationKeys] Waiting for other party's public key");
    return null;
  }, [storeKey, submitEcdhPublicKey]);

  /**
   * Try to load/derive the key from server if the other party has already
   * submitted their public key. Requires that we've already signed and have
   * our keypair cached.
   */
  const tryLoadKeyFromServer = useCallback(async (
    conversationId: string,
    myAddress: string,
    otherAddress: string,
    isInitiator: boolean
  ): Promise<Uint8Array | null> => {
    const existing = keysCache.current.get(conversationId);
    if (existing) return existing;

    const keypair = keypairCache.current.get(conversationId);
    if (!keypair) {
      return null;
    }

    const result = await fetchEcdhKeys(conversationId);
    if (!result || !result.keyExchangeComplete) {
      return null;
    }

    const theirPublicKeyHex = isInitiator 
      ? result.recipientPublicKey! 
      : result.initiatorPublicKey!;
    
    // Validate that the other party's key is a valid X25519 public key (not a legacy signature)
    if (!isValidX25519PublicKey(theirPublicKeyHex)) {
      console.warn("[ConversationKeys] Other party has legacy signature, not X25519 public key. Cannot compute shared key.");
      return null;
    }
    
    const theirPublicKey = hexToBytes(theirPublicKeyHex);
    
    const sharedKey = computeSharedSecret(keypair.privateKey, theirPublicKey, conversationId);
    await storeKey(conversationId, sharedKey);
    
    console.log("[ConversationKeys] ECDH complete (from server check) - symmetric key derived");
    return sharedKey;
  }, [storeKey, fetchEcdhKeys]);

  const encryptContent = useCallback((conversationId: string, plaintext: string): string | null => {
    const key = keysCache.current.get(conversationId);
    if (!key) {
      console.warn("[ConversationKeys] No key found for conversation:", conversationId);
      return null;
    }

    try {
      const nonce = randomBytes(NONCE_LENGTH);
      const plaintextBytes = new TextEncoder().encode(plaintext);
      const cipher = chacha20poly1305(key, nonce);
      const ciphertext = cipher.encrypt(plaintextBytes);
      
      const combined = new Uint8Array(NONCE_LENGTH + ciphertext.length);
      combined.set(nonce, 0);
      combined.set(ciphertext, NONCE_LENGTH);
      
      return `sym:${bytesToHex(combined)}`;
    } catch (error) {
      console.error("[ConversationKeys] Encryption failed:", error);
      return null;
    }
  }, []);

  const decryptContent = useCallback((conversationId: string, encryptedHex: string): string | null => {
    const key = keysCache.current.get(conversationId);
    if (!key) {
      console.warn("[ConversationKeys] No key found for conversation:", conversationId);
      return null;
    }

    try {
      let hex = encryptedHex;
      if (hex.startsWith("sym:")) {
        hex = hex.slice(4);
      }
      
      const combined = hexToBytes(hex);
      const nonce = combined.slice(0, NONCE_LENGTH);
      const ciphertext = combined.slice(NONCE_LENGTH);
      
      const cipher = chacha20poly1305(key, nonce);
      const plaintextBytes = cipher.decrypt(ciphertext);
      
      return new TextDecoder().decode(plaintextBytes);
    } catch (error) {
      console.error("[ConversationKeys] Decryption failed:", error);
      return null;
    }
  }, []);

  const tryDecryptMessage = useCallback((conversationId: string, content: string): { decrypted: boolean; content: string } => {
    if (!content) {
      return { decrypted: false, content: "" };
    }

    if (content.startsWith("sym:")) {
      const decrypted = decryptContent(conversationId, content);
      if (decrypted !== null) {
        return { decrypted: true, content: decrypted };
      }
      return { decrypted: false, content: "[Encrypted - Key Required]" };
    }

    if (content.startsWith("ciph_msg:")) {
      return { decrypted: false, content: "[Legacy E2EE - Cannot Decrypt]" };
    }

    return { decrypted: false, content };
  }, [decryptContent]);

  return {
    hasKey,
    getKey,
    initializeKey,
    tryLoadKeyFromServer,
    encryptContent,
    decryptContent,
    tryDecryptMessage,
  };
}
