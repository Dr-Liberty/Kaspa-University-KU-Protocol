import { useCallback, useRef, useEffect } from "react";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
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

export function useConversationKeys(walletAddress: string | null) {
  const keysCache = useRef<Map<string, Uint8Array>>(new Map());
  const dbRef = useRef<IDBDatabase | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    const dbName = `${DB_NAME}-${walletAddress.slice(-8)}`;
    const request = indexedDB.open(dbName, 1);

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
    };
  }, []);

  const deriveSharedKey = useCallback((
    conversationId: string,
    myAddress: string,
    otherAddress: string,
    mySignature: string,
    otherSignature?: string
  ): Uint8Array => {
    const [addr1, addr2] = [myAddress, otherAddress].sort();
    
    let combinedInput: Uint8Array;
    
    if (otherSignature) {
      const sig1Bytes = new TextEncoder().encode(myAddress < otherAddress ? mySignature : otherSignature);
      const sig2Bytes = new TextEncoder().encode(myAddress < otherAddress ? otherSignature : mySignature);
      const addressBytes = new TextEncoder().encode(`${addr1}:${addr2}`);
      
      combinedInput = new Uint8Array(sig1Bytes.length + sig2Bytes.length + addressBytes.length);
      combinedInput.set(sig1Bytes, 0);
      combinedInput.set(sig2Bytes, sig1Bytes.length);
      combinedInput.set(addressBytes, sig1Bytes.length + sig2Bytes.length);
    } else {
      const sigBytes = new TextEncoder().encode(mySignature);
      const addressBytes = new TextEncoder().encode(`${addr1}:${addr2}`);
      combinedInput = new Uint8Array(sigBytes.length + addressBytes.length);
      combinedInput.set(sigBytes, 0);
      combinedInput.set(addressBytes, sigBytes.length);
    }
    
    const salt = new TextEncoder().encode(`kasia:shared:v2:${conversationId}`);
    const info = new TextEncoder().encode("kasia-e2ee-shared");
    
    return hkdf(sha256, combinedInput, salt, info, KEY_LENGTH);
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

  const fetchE2eKeys = useCallback(async (conversationId: string): Promise<{
    e2eInitiatorSig: string | null;
    e2eRecipientSig: string | null;
    keyExchangeComplete: boolean;
  } | null> => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/e2e-key`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[ConversationKeys] Failed to fetch E2E keys:", error);
      return null;
    }
  }, []);

  const submitE2eSignature = useCallback(async (
    conversationId: string,
    signature: string
  ): Promise<{
    e2eInitiatorSig: string | null;
    e2eRecipientSig: string | null;
    keyExchangeComplete: boolean;
  } | null> => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/e2e-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signature }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[ConversationKeys] Failed to submit E2E signature:", error);
      return null;
    }
  }, []);

  const initializeKey = useCallback(async (
    conversationId: string,
    myAddress: string,
    otherAddress: string,
    signMessage: (msg: string) => Promise<string>,
    isInitiator: boolean
  ): Promise<Uint8Array | null> => {
    const existing = keysCache.current.get(conversationId);
    if (existing) return existing;

    const [addr1, addr2] = [myAddress, otherAddress].sort();
    const messageToSign = `kasia:e2ee:${addr1}:${addr2}:${conversationId}`;
    const mySignature = await signMessage(messageToSign);
    
    const result = await submitE2eSignature(conversationId, mySignature);
    if (!result) {
      console.error("[ConversationKeys] Failed to submit signature to server");
      return null;
    }
    
    if (result.keyExchangeComplete) {
      const initiatorSig = result.e2eInitiatorSig!;
      const recipientSig = result.e2eRecipientSig!;
      const derivedKey = deriveSharedKey(
        conversationId,
        myAddress,
        otherAddress,
        isInitiator ? initiatorSig : recipientSig,
        isInitiator ? recipientSig : initiatorSig
      );
      await storeKey(conversationId, derivedKey);
      return derivedKey;
    }
    
    console.log("[ConversationKeys] Waiting for other party to complete key exchange");
    return null;
  }, [deriveSharedKey, storeKey, submitE2eSignature]);

  const tryLoadKeyFromServer = useCallback(async (
    conversationId: string,
    myAddress: string,
    otherAddress: string,
    isInitiator: boolean
  ): Promise<Uint8Array | null> => {
    const existing = keysCache.current.get(conversationId);
    if (existing) return existing;

    const result = await fetchE2eKeys(conversationId);
    if (!result || !result.keyExchangeComplete) {
      return null;
    }

    const initiatorSig = result.e2eInitiatorSig!;
    const recipientSig = result.e2eRecipientSig!;
    const derivedKey = deriveSharedKey(
      conversationId,
      myAddress,
      otherAddress,
      isInitiator ? initiatorSig : recipientSig,
      isInitiator ? recipientSig : initiatorSig
    );
    await storeKey(conversationId, derivedKey);
    return derivedKey;
  }, [deriveSharedKey, storeKey, fetchE2eKeys]);

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
