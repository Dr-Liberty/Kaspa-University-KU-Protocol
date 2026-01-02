import { storage } from "./storage";

const KASIA_INDEXER_URL = "https://dev-indexer.kasia.fyi";
const POLL_INTERVAL_MS = 30000;

interface KasiaIndexerResponse {
  success: boolean;
  data?: {
    txHash: string;
    sender: string;
    recipient: string;
    type: string;
    alias?: string;
    timestamp: number;
  }[];
}

export class HandshakePoller {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    if (this.isRunning) {
      console.log("[HandshakePoller] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[HandshakePoller] Starting background job (every 30s)");

    this.intervalId = setInterval(() => {
      this.pollPendingHandshakes().catch(err => {
        console.error("[HandshakePoller] Error polling handshakes:", err.message);
      });
    }, POLL_INTERVAL_MS);

    this.pollPendingHandshakes().catch(err => {
      console.error("[HandshakePoller] Initial poll error:", err.message);
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[HandshakePoller] Stopped");
  }

  private async pollPendingHandshakes(): Promise<void> {
    try {
      const pendingConversations = await this.getPendingConversations();
      
      if (pendingConversations.length === 0) {
        return;
      }

      console.log(`[HandshakePoller] Checking ${pendingConversations.length} pending handshakes`);

      for (const conversation of pendingConversations) {
        try {
          await this.checkHandshakeAcceptance(conversation);
        } catch (err: any) {
          console.error(`[HandshakePoller] Error checking conversation ${conversation.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[HandshakePoller] Error getting pending conversations:", err.message);
    }
  }

  private async getPendingConversations(): Promise<any[]> {
    const allConversations = await storage.getConversationsForWallet("__all__");
    return [];
  }

  private async checkHandshakeAcceptance(conversation: any): Promise<void> {
    const recipientAddress = conversation.recipientAddress;
    
    try {
      const response = await fetch(
        `${KASIA_INDEXER_URL}/api/messages?recipient=${conversation.initiatorAddress}&type=handshake_accept`,
        {
          headers: {
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.warn(`[HandshakePoller] Indexer returned ${response.status} for ${conversation.id}`);
        return;
      }

      const data = await response.json() as KasiaIndexerResponse;
      
      if (!data.success || !data.data) {
        return;
      }

      const acceptMessage = data.data.find(
        (msg) => msg.sender === recipientAddress && msg.type === "handshake_accept"
      );

      if (acceptMessage) {
        console.log(`[HandshakePoller] Found acceptance for conversation ${conversation.id}`);
        
        await storage.updateConversationStatus(
          conversation.id,
          "active",
          acceptMessage.txHash,
          acceptMessage.alias
        );
      }
    } catch (err: any) {
      if (err.name === "TimeoutError") {
        console.warn(`[HandshakePoller] Timeout checking ${conversation.id}`);
      } else {
        throw err;
      }
    }
  }
}

export const handshakePoller = new HandshakePoller();
