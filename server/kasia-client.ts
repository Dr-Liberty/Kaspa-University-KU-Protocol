/**
 * Kasia Indexer Client
 * 
 * Queries the public Kasia indexer API to fetch on-chain handshakes and messages.
 * The Kasia indexer scans the Kaspa blockchain and indexes all Kasia protocol messages.
 * 
 * Public indexer URLs:
 * - Mainnet: https://indexer.kasia.fyi/
 * - Testnet: https://dev-indexer.kasia.fyi/
 */

const KASIA_INDEXER_MAINNET = "https://indexer.kasia.fyi";
const KASIA_INDEXER_TESTNET = "https://dev-indexer.kasia.fyi";

export interface HandshakeResponse {
  tx_id: string;
  sender: string;
  receiver: string;
  block_time: number;
  accepting_block: string | null;
  accepting_daa_score: number | null;
  message_payload: string;
}

export interface ContextualMessageResponse {
  tx_id: string;
  sender: string;
  block_time: number;
  accepting_block: string | null;
  accepting_daa_score: number | null;
  message_payload: string;
}

export interface ParsedHandshake {
  txId: string;
  sender: string;
  receiver: string;
  blockTime: number;
  conversationId?: string;
  alias?: string;
  timestamp?: number;
  isResponse: boolean;
}

/**
 * Get the indexer URL based on the network (mainnet vs testnet)
 */
function getIndexerUrl(address: string): string {
  if (address.startsWith("kaspatest:")) {
    return KASIA_INDEXER_TESTNET;
  }
  return KASIA_INDEXER_MAINNET;
}

/**
 * Fetch handshakes sent by an address
 */
export async function getHandshakesBySender(
  address: string,
  limit: number = 50
): Promise<HandshakeResponse[]> {
  const baseUrl = getIndexerUrl(address);
  const url = `${baseUrl}/handshakes/by-sender?address=${encodeURIComponent(address)}&limit=${limit}`;
  
  console.log(`[Kasia Client] Fetching handshakes by sender from ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Kasia Client] Error fetching handshakes by sender: ${response.status}`);
      return [];
    }
    const data = await response.json();
    console.log(`[Kasia Client] Found ${data.length} handshakes sent by ${address.slice(0, 20)}...`);
    return data;
  } catch (error: any) {
    console.error(`[Kasia Client] Fetch error: ${error.message}`);
    return [];
  }
}

/**
 * Fetch handshakes received by an address
 */
export async function getHandshakesByReceiver(
  address: string,
  limit: number = 50
): Promise<HandshakeResponse[]> {
  const baseUrl = getIndexerUrl(address);
  const url = `${baseUrl}/handshakes/by-receiver?address=${encodeURIComponent(address)}&limit=${limit}`;
  
  console.log(`[Kasia Client] Fetching handshakes by receiver from ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Kasia Client] Error fetching handshakes by receiver: ${response.status}`);
      return [];
    }
    const data = await response.json();
    console.log(`[Kasia Client] Found ${data.length} handshakes received by ${address.slice(0, 20)}...`);
    return data;
  } catch (error: any) {
    console.error(`[Kasia Client] Fetch error: ${error.message}`);
    return [];
  }
}

/**
 * Parse a handshake payload to extract conversation metadata
 * 
 * Kasia indexer returns the payload in hex format. It may be:
 * 1. Raw hex-encoded JSON (indexer strips ciph_msg: prefix)
 * 2. Double hex-encoded (hex-encoded "hex-encoded JSON")
 * 3. Full format with prefix: ciph_msg:{hex_encoded_json}
 * 
 * JSON has: { alias, timestamp, conversation_id, version, recipient_address, send_to_recipient, is_response }
 */
export function parseHandshakePayload(hexPayload: string): {
  conversationId?: string;
  recipient?: string;
  alias?: string;
  timestamp?: number;
  isResponse: boolean;
} | null {
  try {
    // First decode from hex
    let payload = Buffer.from(hexPayload, "hex").toString("utf-8");
    
    // Check if it's double-encoded (starts with hex chars that decode to JSON)
    // If the result looks like hex (all hex chars), decode again
    if (/^[0-9a-fA-F]+$/.test(payload)) {
      payload = Buffer.from(payload, "hex").toString("utf-8");
    }
    
    // Try to parse as direct JSON (indexer may strip ciph_msg: prefix)
    if (payload.startsWith("{")) {
      try {
        const jsonData = JSON.parse(payload);
        return {
          conversationId: jsonData.conversation_id,
          recipient: jsonData.recipient_address,
          alias: jsonData.alias,
          timestamp: jsonData.timestamp ? new Date(jsonData.timestamp).getTime() : undefined,
          isResponse: jsonData.is_response === true,
        };
      } catch (e) {
        console.log(`[Kasia Parser] JSON parse failed: ${e}`);
      }
    }
    
    // Check if it has ciph_msg prefix
    if (payload.startsWith("ciph_msg:")) {
      const parts = payload.split(":");
      
      // OFFICIAL Kasia format: ciph_msg:{hex_encoded_json}
      if (parts.length === 2 && parts[1]) {
        try {
          const jsonHex = parts[1];
          const jsonString = Buffer.from(jsonHex, "hex").toString("utf-8");
          const jsonData = JSON.parse(jsonString);
          
          return {
            conversationId: jsonData.conversation_id,
            recipient: jsonData.recipient_address,
            alias: jsonData.alias,
            timestamp: jsonData.timestamp ? new Date(jsonData.timestamp).getTime() : undefined,
            isResponse: jsonData.is_response === true,
          };
        } catch (e) {
          console.log(`[Kasia Parser] Official format parse failed: ${e}`);
        }
      }
      
      // Legacy compact format: ciph_msg:1:handshake[_r]:convId:recipient:alias:timestamp
      if (parts.length >= 6 && (parts[2] === "handshake" || parts[2] === "handshake_r")) {
        const isResponse = parts[2] === "handshake_r";
        return {
          conversationId: parts[3],
          recipient: parts[4],
          alias: parts[5],
          timestamp: parts[6] ? parseInt(parts[6], 36) : undefined,
          isResponse,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.log(`[Kasia Parser] Error: ${error}`);
    return null;
  }
}

/**
 * Get all conversations for an address by fetching handshakes from the Kasia indexer
 */
export async function getConversationsFromIndexer(
  walletAddress: string
): Promise<{
  id: string;
  initiatorAddress: string;
  recipientAddress: string;
  status: "pending" | "active";
  initiatorAlias?: string;
  handshakeTxHash?: string;
  responseTxHash?: string;
  createdAt: Date;
}[]> {
  console.log(`[Kasia Client] Getting conversations for ${walletAddress.slice(0, 20)}...`);
  
  const [sentHandshakes, receivedHandshakes] = await Promise.all([
    getHandshakesBySender(walletAddress),
    getHandshakesByReceiver(walletAddress),
  ]);
  
  const conversationsMap = new Map<string, {
    id: string;
    initiatorAddress: string;
    recipientAddress: string;
    status: "pending" | "active";
    initiatorAlias?: string;
    handshakeTxHash?: string;
    responseTxHash?: string;
    createdAt: Date;
    hasResponse: boolean;
  }>();
  
  // Process sent handshakes - add initial handshakes and track response handshakes
  for (const hs of sentHandshakes) {
    const parsed = parseHandshakePayload(hs.message_payload);
    if (!parsed) continue;
    
    const convId = parsed.conversationId || hs.tx_id.slice(0, 16);
    
    if (parsed.isResponse) {
      // This is a response handshake sent by this wallet
      // Update the conversation to active if it exists
      const existing = conversationsMap.get(convId);
      if (existing) {
        existing.status = "active";
        existing.responseTxHash = hs.tx_id;
        existing.hasResponse = true;
        
        // IMPORTANT: If response has a recipient, THEY are the original initiator
        // (we're sending response TO them, so they started the conversation)
        if (parsed.recipient && parsed.recipient !== hs.sender) {
          // The response is TO the initiator, so update initiatorAddress
          existing.initiatorAddress = parsed.recipient;
        }
      } else {
        // Response exists but no initial handshake found yet
        // Create placeholder conversation - the recipient of the response is the original initiator
        if (parsed.recipient) {
          conversationsMap.set(convId, {
            id: convId,
            initiatorAddress: parsed.recipient, // Recipient of response = original initiator
            recipientAddress: walletAddress, // We (responder) are the recipient
            status: "active",
            initiatorAlias: undefined, // Will be filled from initial handshake
            handshakeTxHash: undefined,
            responseTxHash: hs.tx_id,
            createdAt: new Date(hs.block_time),
            hasResponse: true,
          });
        }
      }
    } else if (!conversationsMap.has(convId)) {
      // Initial handshake - but check if this wallet is just relaying for someone else
      // (treasury broadcasts user's handshake on their behalf)
      const recipientAddress = parsed.recipient || hs.receiver;
      
      // If recipient is this wallet, then the real initiator is whoever sent this TO us
      // This happens when someone sends a handshake directly TO us
      // But if we're sending a handshake TO someone else, we're the initiator
      if (recipientAddress === walletAddress) {
        // Skip - this will be handled in receivedHandshakes
        continue;
      }
      
      conversationsMap.set(convId, {
        id: convId,
        initiatorAddress: hs.sender,
        recipientAddress: recipientAddress,
        status: "pending",
        initiatorAlias: parsed.alias,
        handshakeTxHash: hs.tx_id,
        createdAt: new Date(hs.block_time),
        hasResponse: false,
      });
    }
  }
  
  // Process received handshakes - add incoming handshakes and track responses to our handshakes
  for (const hs of receivedHandshakes) {
    const parsed = parseHandshakePayload(hs.message_payload);
    if (!parsed) continue;
    
    const convId = parsed.conversationId || hs.tx_id.slice(0, 16);
    
    if (parsed.isResponse) {
      // This is a response handshake sent TO this wallet
      // The sender of this response is accepting our handshake
      const existing = conversationsMap.get(convId);
      if (existing) {
        existing.status = "active";
        existing.responseTxHash = hs.tx_id;
        existing.hasResponse = true;
      }
    } else {
      // Initial handshake received - someone wants to start a conversation with us
      const existing = conversationsMap.get(convId);
      if (existing) {
        // Already have this conversation (from response processing), update missing fields
        // The sender of this initial handshake is the TRUE initiator
        existing.initiatorAddress = hs.sender;
        existing.initiatorAlias = parsed.alias;
        existing.handshakeTxHash = hs.tx_id;
        if (!existing.createdAt || new Date(hs.block_time) < existing.createdAt) {
          existing.createdAt = new Date(hs.block_time);
        }
      } else {
        conversationsMap.set(convId, {
          id: convId,
          initiatorAddress: hs.sender,
          recipientAddress: walletAddress,
          status: "pending",
          initiatorAlias: parsed.alias,
          handshakeTxHash: hs.tx_id,
          createdAt: new Date(hs.block_time),
          hasResponse: false,
        });
      }
    }
  }
  
  // Additional pass: Look for response handshakes by checking if sender sent a response to receiver
  // This handles cases where the response uses a different conversationId format
  for (const hs of sentHandshakes) {
    const parsed = parseHandshakePayload(hs.message_payload);
    if (!parsed || !parsed.isResponse) continue;
    
    const convId = parsed.conversationId;
    if (convId) {
      const existing = conversationsMap.get(convId);
      if (existing && !existing.hasResponse) {
        existing.status = "active";
        existing.responseTxHash = hs.tx_id;
        existing.hasResponse = true;
      }
    }
  }
  
  const result = Array.from(conversationsMap.values()).map(({ hasResponse, ...conv }) => conv);
  
  console.log(`[Kasia Client] Found ${result.length} conversations (${result.filter(c => c.status === "active").length} active)`);
  
  return result;
}

/**
 * Check if a conversation has been completed (both parties sent handshakes)
 */
export async function isConversationActive(
  initiatorAddress: string,
  recipientAddress: string
): Promise<boolean> {
  const [sentByInitiator, sentByRecipient] = await Promise.all([
    getHandshakesBySender(initiatorAddress),
    getHandshakesBySender(recipientAddress),
  ]);
  
  const initiatorSentToRecipient = sentByInitiator.some(hs => hs.receiver === recipientAddress);
  const recipientSentToInitiator = sentByRecipient.some(hs => hs.receiver === initiatorAddress);
  
  return initiatorSentToRecipient && recipientSentToInitiator;
}

/**
 * Fetch contextual messages sent by an address for a specific conversation alias from the Kasia indexer
 */
export async function getContextualMessagesBySender(
  address: string,
  alias: string,
  limit: number = 100
): Promise<ContextualMessageResponse[]> {
  const baseUrl = getIndexerUrl(address);
  const url = `${baseUrl}/contextual-messages/by-sender?address=${encodeURIComponent(address)}&alias=${encodeURIComponent(alias)}&limit=${limit}`;
  
  console.log(`[Kasia Client] Fetching contextual messages from ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Kasia Client] Error fetching contextual messages: ${response.status} - ${errorText}`);
      return [];
    }
    const data = await response.json();
    console.log(`[Kasia Client] Found ${data.length} contextual messages sent by ${address.slice(0, 20)}... for alias ${alias}`);
    return data;
  } catch (error: any) {
    console.error(`[Kasia Client] Fetch error: ${error.message}`);
    return [];
  }
}

/**
 * Parse a contextual message payload to extract conversation alias and content
 * Format: ciph_msg:1:comm:{alias}:{sealed_hex}
 */
export function parseContextualMessagePayload(payload: string): {
  alias: string;
  encryptedContent: string;
} | null {
  try {
    // Decode hex if needed
    let decoded = payload;
    if (/^[0-9a-fA-F]+$/.test(payload) && payload.length >= 20) {
      try {
        decoded = Buffer.from(payload, "hex").toString("utf-8");
      } catch {
        decoded = payload;
      }
    }
    
    // Format: ciph_msg:1:comm:{alias}:{sealed_hex}
    const parts = decoded.split(":");
    if (parts.length >= 5 && parts[0] === "ciph_msg" && parts[1] === "1" && parts[2] === "comm") {
      return {
        alias: parts[3],
        encryptedContent: parts.slice(4).join(":"),
      };
    }
    
    return null;
  } catch (error) {
    console.log(`[Kasia Parser] Error parsing contextual message: ${error}`);
    return null;
  }
}

/**
 * Fetch all messages for a conversation from both participants
 */
export async function getMessagesForConversation(
  conversationAlias: string,
  initiatorAddress: string,
  recipientAddress: string,
  limit: number = 100
): Promise<{
  txId: string;
  sender: string;
  blockTime: number;
  alias: string;
  encryptedContent: string;
}[]> {
  console.log(`[Kasia Client] Fetching messages for conversation ${conversationAlias}`);
  
  // Fetch contextual messages from both participants for this specific conversation alias
  const [initiatorMessages, recipientMessages] = await Promise.all([
    getContextualMessagesBySender(initiatorAddress, conversationAlias, limit),
    getContextualMessagesBySender(recipientAddress, conversationAlias, limit),
  ]);
  
  const allMessages: {
    txId: string;
    sender: string;
    blockTime: number;
    alias: string;
    encryptedContent: string;
  }[] = [];
  
  // Process initiator messages
  for (const msg of initiatorMessages) {
    const parsed = parseContextualMessagePayload(msg.message_payload);
    if (parsed) {
      allMessages.push({
        txId: msg.tx_id,
        sender: initiatorAddress,
        blockTime: msg.block_time,
        alias: parsed.alias,
        encryptedContent: parsed.encryptedContent,
      });
    }
  }
  
  // Process recipient messages
  for (const msg of recipientMessages) {
    const parsed = parseContextualMessagePayload(msg.message_payload);
    if (parsed) {
      allMessages.push({
        txId: msg.tx_id,
        sender: recipientAddress,
        blockTime: msg.block_time,
        alias: parsed.alias,
        encryptedContent: parsed.encryptedContent,
      });
    }
  }
  
  // Sort by block time
  allMessages.sort((a, b) => a.blockTime - b.blockTime);
  
  console.log(`[Kasia Client] Found ${allMessages.length} messages for conversation ${conversationAlias}`);
  return allMessages;
}
