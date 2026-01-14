/**
 * Kasia On-Chain Broadcast Service
 * 
 * Broadcasts Kasia protocol messages to the Kaspa blockchain.
 * All messages are stored on-chain, not in the database.
 * 
 * Protocol formats:
 * - ciph_msg:1:handshake:{sealed_hex} - Initiate encrypted conversation
 * - ciph_msg:1:comm:{alias}:{sealed_hex} - Contextual message in conversation
 * 
 * The platform only reads on-chain data - it never stores messages locally.
 */

import { getKaspaService } from "./kaspa";
import { 
  createHandshakePayload, 
  createHandshakeResponse, 
  createCommPayload,
  stringToHex,
  hexToString,
  KASIA_ENCRYPTED,
  KASIA_PREFIX,
  KASIA_VERSION,
  KASIA_DELIM,
} from "./kasia-encrypted";

export interface KasiaBroadcastResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface HandshakeParams {
  senderAddress: string;
  senderAlias: string;
  recipientAddress: string;
  conversationId: string;
  isResponse?: boolean;
  eciesPubkey?: string;
}

export interface MessageParams {
  senderAddress: string;
  senderAlias: string;
  conversationId: string;
  encryptedContent: string;
  recipientAddress: string;
}

/**
 * Kasia On-Chain Broadcast Service
 * 
 * Broadcasts handshakes and messages to the Kaspa blockchain.
 * Users pay their own transaction fees by signing via KasWare.
 */
class KasiaBroadcastService {
  private isInitialized = false;

  /**
   * Initialize the broadcast service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log("[Kasia Broadcast] Initializing on-chain broadcast service...");
    this.isInitialized = true;
    console.log("[Kasia Broadcast] Service ready for on-chain messaging");
  }

  /**
   * Create a handshake payload for client-side signing
   * The user will sign this with KasWare and broadcast it themselves
   */
  createHandshakeForSigning(params: HandshakeParams): {
    payloadHex: string;
    messageToSign: string;
    protocol: string;
  } {
    const { senderAlias, recipientAddress, conversationId, isResponse, eciesPubkey } = params;
    
    // Create the Kasia protocol payload
    // Include ECIES public key for cross-platform E2E encryption (KU extension)
    const payloadHex = isResponse 
      ? createHandshakeResponse(senderAlias, recipientAddress, conversationId, eciesPubkey)
      : createHandshakePayload(senderAlias, recipientAddress, conversationId, eciesPubkey);
    
    // Create message for wallet signature
    const timestamp = Date.now();
    const messageToSign = `kasia:handshake:${conversationId}:${recipientAddress}:${timestamp}`;
    
    return {
      payloadHex,
      messageToSign,
      protocol: `${KASIA_PREFIX}:${KASIA_VERSION}:handshake`,
    };
  }

  /**
   * Create a comm (message) payload for client-side signing
   * The user will sign this with KasWare and broadcast it themselves
   */
  createMessageForSigning(params: MessageParams): {
    payloadHex: string;
    messageToSign: string;
    protocol: string;
  } {
    const { conversationId, encryptedContent } = params;
    
    // Create the Kasia protocol payload
    // CRITICAL: Use conversationId as the alias, NOT senderAlias
    // This ensures messages are indexed correctly by the Kasia indexer
    const payloadHex = createCommPayload(conversationId, encryptedContent);
    
    // Create message for wallet signature
    const timestamp = Date.now();
    const messageToSign = `kasia:comm:${conversationId}:${timestamp}:${encryptedContent.slice(0, 32)}`;
    
    return {
      payloadHex,
      messageToSign,
      protocol: `${KASIA_PREFIX}:${KASIA_VERSION}:comm`,
    };
  }

  /**
   * Broadcast a signed handshake to the Kaspa blockchain
   * This is called for admin auto-accept of handshakes.
   * 
   * For user-initiated broadcasts, the frontend handles the transaction
   * via KasWare - users sign and pay their own fees.
   * 
   * NOTE: The payload parameter is a raw protocol string (e.g., "ciph_msg:7b22...")
   * This function hex-encodes it before passing to sendQuizProof (WASM SDK requires hex)
   */
  async broadcastHandshake(
    payload: string,
    recipientAddress: string
  ): Promise<KasiaBroadcastResult> {
    try {
      console.log(`[Kasia Broadcast] Broadcasting admin handshake to ${recipientAddress.slice(0, 20)}...`);
      
      const kaspaService = await getKaspaService();
      
      if (!kaspaService.isLive()) {
        return { 
          success: false, 
          error: "Kaspa service not configured" 
        };
      }

      // Hex-encode the raw payload for WASM SDK (treasury broadcasts)
      // KasWare sendKaspa uses raw strings, but WASM createTransactions needs hex
      const payloadHex = stringToHex(payload);
      
      // Broadcast via treasury (for admin auto-accept only)
      const result = await kaspaService.sendQuizProof(payloadHex, recipientAddress);
      
      if (result.success) {
        console.log(`[Kasia Broadcast] Handshake broadcast: ${result.txHash}`);
        return { success: true, txHash: result.txHash };
      }
      
      return { success: false, error: result.error || "Broadcast failed" };
    } catch (error: any) {
      console.error("[Kasia Broadcast] Handshake broadcast failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast a signed message to the Kaspa blockchain (admin only)
   * Regular users broadcast via KasWare directly
   * 
   * NOTE: The payload parameter is a raw protocol string
   * This function hex-encodes it before passing to sendQuizProof (WASM SDK requires hex)
   */
  async broadcastMessage(
    payload: string,
    recipientAddress: string
  ): Promise<KasiaBroadcastResult> {
    try {
      console.log(`[Kasia Broadcast] Broadcasting message...`);
      
      const kaspaService = await getKaspaService();
      
      if (!kaspaService.isLive()) {
        return { 
          success: false, 
          error: "Kaspa service not configured" 
        };
      }

      // Hex-encode the raw payload for WASM SDK (treasury broadcasts)
      const payloadHex = stringToHex(payload);
      
      const result = await kaspaService.sendQuizProof(payloadHex, recipientAddress);
      
      if (result.success) {
        console.log(`[Kasia Broadcast] Message broadcast: ${result.txHash}`);
        return { success: true, txHash: result.txHash };
      }
      
      return { success: false, error: result.error || "Broadcast failed" };
    } catch (error: any) {
      console.error("[Kasia Broadcast] Message broadcast failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse an on-chain Kasia payload
   */
  parseKasiaPayload(payloadHex: string): {
    type: "handshake" | "comm" | "payment" | "unknown";
    data: any;
  } | null {
    try {
      const payloadStr = hexToString(payloadHex);
      
      if (payloadStr.startsWith(KASIA_ENCRYPTED.headers.HANDSHAKE)) {
        const dataHex = payloadStr.slice(KASIA_ENCRYPTED.headers.HANDSHAKE.length);
        const dataStr = hexToString(dataHex);
        return {
          type: "handshake",
          data: JSON.parse(dataStr),
        };
      }
      
      if (payloadStr.startsWith(KASIA_ENCRYPTED.headers.COMM)) {
        const rest = payloadStr.slice(KASIA_ENCRYPTED.headers.COMM.length);
        const parts = rest.split(KASIA_DELIM);
        return {
          type: "comm",
          data: {
            alias: parts[0] || "",
            encryptedContent: parts.slice(1).join(KASIA_DELIM),
          },
        };
      }
      
      if (payloadStr.startsWith(KASIA_ENCRYPTED.headers.PAYMENT)) {
        return { type: "payment", data: {} };
      }
      
      return { type: "unknown", data: {} };
    } catch (error) {
      console.error("[Kasia Broadcast] Failed to parse payload:", error);
      return null;
    }
  }

  /**
   * Check if a payload is a Kasia protocol message
   */
  isKasiaPayload(payloadHex: string): boolean {
    try {
      const payloadStr = hexToString(payloadHex);
      return payloadStr.startsWith(KASIA_PREFIX);
    } catch {
      return false;
    }
  }
}

export const kasiaBroadcast = new KasiaBroadcastService();
