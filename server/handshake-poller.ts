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
  private lastPollTime: Map<string, number> = new Map();
  private readonly MIN_POLL_INTERVAL_PER_CONVERSATION = 60000;

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
      const pendingConversations = await storage.getPendingConversations();
      
      if (pendingConversations.length === 0) {
        return;
      }

      console.log(`[HandshakePoller] Checking ${pendingConversations.length} pending handshakes`);

      for (const conversation of pendingConversations) {
        try {
          const lastPoll = this.lastPollTime.get(conversation.id) || 0;
          const now = Date.now();
          
          if (now - lastPoll < this.MIN_POLL_INTERVAL_PER_CONVERSATION) {
            continue;
          }
          
          this.lastPollTime.set(conversation.id, now);
          await this.checkHandshakeAcceptance(conversation);
        } catch (err: any) {
          console.error(`[HandshakePoller] Error checking conversation ${conversation.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[HandshakePoller] Error getting pending conversations:", err.message);
    }
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
        
        try {
          await storage.updateConversationStatus(
            conversation.id,
            "active",
            acceptMessage.txHash,
            acceptMessage.alias
          );
          this.lastPollTime.delete(conversation.id);
        } catch (updateErr: any) {
          console.error(`[HandshakePoller] Failed to update conversation status:`, updateErr.message);
        }
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
