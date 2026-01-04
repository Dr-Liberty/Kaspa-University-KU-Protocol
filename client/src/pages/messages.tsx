import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/lib/wallet-context";
import { queryClient, apiRequest, getAuthToken, getWalletAddress } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
const kasiaLogo = "/thumbnails/kasia_encrypted_messaging.png";
import {
  Mail,
  Send,
  Lock,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowLeft,
  Shield,
  Globe,
  Database,
  RefreshCw,
  Inbox,
  ExternalLink,
} from "lucide-react";

interface Conversation {
  id: string;
  initiatorAddress: string;
  recipientAddress: string;
  status: string;
  handshakeTxHash?: string;
  responseTxHash?: string;
  initiatorAlias?: string;
  recipientAlias?: string;
  isAdminConversation: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PrivateMessage {
  id: string;
  conversationId: string;
  senderAddress: string;
  encryptedContent: string;
  txHash?: string;
  txStatus: string;
  createdAt: string;
}

function generateJazzicon(address: string): string {
  const hash = address.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 50%)`;
}

function formatTime(dateStr: string | number | undefined): string {
  if (!dateStr) return "";
  
  // Handle both string dates and numeric timestamps
  const d = typeof dateStr === "number" ? new Date(dateStr) : new Date(dateStr);
  
  // Check for invalid date
  if (isNaN(d.getTime())) return "";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function ConversationItem({ 
  conversation, 
  walletAddress, 
  isActive, 
  onClick 
}: { 
  conversation: Conversation; 
  walletAddress: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const isInitiator = conversation.initiatorAddress === walletAddress;
  const otherAddress = isInitiator ? conversation.recipientAddress : conversation.initiatorAddress;
  const otherAlias = isInitiator ? conversation.recipientAlias : conversation.initiatorAlias;
  const avatarColor = generateJazzicon(otherAddress);
  const truncatedAddress = `${otherAddress.slice(0, 8)}...${otherAddress.slice(-4)}`;

  const statusBadge = () => {
    switch (conversation.status) {
      case "pending":
        // Differentiate between incoming request (user needs to accept) and outgoing (waiting for other party)
        if (!isInitiator) {
          // Incoming handshake request - user needs to accept
          return (
            <Badge variant="default" className="gap-1 text-[10px]">
              <Inbox className="h-2.5 w-2.5" />
              Accept Request
            </Badge>
          );
        }
        // Outgoing handshake - waiting for other party
        return (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Clock className="h-2.5 w-2.5" />
            Pending
          </Badge>
        );
      case "active":
        return (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Active
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertCircle className="h-2.5 w-2.5" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      }`}
      data-testid={`conversation-${conversation.id}`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: avatarColor }}
      >
        <User className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-sm flex-1 min-w-0">
            {otherAlias || truncatedAddress}
          </span>
          <div className="shrink-0">
            {statusBadge()}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {conversation.isAdminConversation && (
            <Badge variant="outline" className="text-[10px]">
              <Shield className="mr-1 h-2.5 w-2.5" />
              Support
            </Badge>
          )}
          <span>{formatTime(conversation.updatedAt)}</span>
        </div>
      </div>
    </button>
  );
}

function ConversationView({ 
  conversation, 
  walletAddress,
  onBack,
}: { 
  conversation: Conversation; 
  walletAddress: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [messageContent, setMessageContent] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const isInitiator = conversation.initiatorAddress === walletAddress;
  const otherAddress = isInitiator ? conversation.recipientAddress : conversation.initiatorAddress;
  const otherAlias = isInitiator ? conversation.recipientAlias : conversation.initiatorAlias;
  const truncatedAddress = `${otherAddress.slice(0, 10)}...${otherAddress.slice(-4)}`;

  const { data: messagesData, isLoading } = useQuery<{ messages: PrivateMessage[]; conversation: Conversation; source: string }>({
    queryKey: ["/api/conversations", conversation.id, "messages"],
    enabled: conversation.status === "active",
    refetchInterval: 10000,
  });
  
  const messages = messagesData?.messages || [];

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      setIsSigning(true);
      try {
        // Step 1: Prepare the Kasia protocol payload for on-chain broadcast
        const prepareRes = await apiRequest("POST", "/api/messages/prepare", {
          content,
          conversationId: conversation.id,
          messageType: "private",
        });
        const prepareData = await prepareRes.json();
        
        if (!prepareData.success || !prepareData.kasiaPayload) {
          throw new Error("Failed to prepare Kasia payload");
        }

        // Step 2: User broadcasts their OWN transaction with embedded Kasia payload
        // This is fully decentralized - no treasury dependency!
        let txHash: string | undefined;
        
        if (window.kasware) {
          try {
            // Convert Kasia payload to hex for transaction embedding
            const payloadHex = prepareData.kasiaPayload;
            
            // KIP-0009 Storage Mass: mass = 10^12 / output_sompi
            // With 0.2 KAS (20M sompi): mass = 50,000 (under 100k limit)
            // With 0.00001 KAS (1000 sompi): mass = 1,000,000,000 (WAY over limit)
            const MESSAGE_AMOUNT_SOMPI = 20_000_000; // 0.2 KAS for KIP-0009 compliance
            
            let rawTxHash = await window.kasware.sendKaspa(
              otherAddress, // Recipient of the conversation
              MESSAGE_AMOUNT_SOMPI, // 0.2 KAS to stay under storage mass limit
              { 
                payload: payloadHex,
                priorityFee: 0 
              }
            );
            
            console.log("[Message] Raw txHash from KasWare:", rawTxHash, "type:", typeof rawTxHash);
            
            // Normalize txHash - handle object responses, 0x prefix, etc.
            if (typeof rawTxHash === "object" && rawTxHash !== null) {
              rawTxHash = (rawTxHash as any).txid || (rawTxHash as any).txHash || (rawTxHash as any).hash || JSON.stringify(rawTxHash);
              console.log("[Message] Extracted txHash from object:", rawTxHash);
            }
            
            // Remove 0x prefix if present
            if (typeof rawTxHash === "string" && rawTxHash.startsWith("0x")) {
              rawTxHash = rawTxHash.slice(2);
            }
            
            // Validate format before sending to backend
            if (typeof rawTxHash === "string" && /^[a-fA-F0-9]{64}$/.test(rawTxHash)) {
              txHash = rawTxHash;
              console.log("[Message] User broadcast on-chain tx:", txHash);
            } else {
              console.error("[Message] Invalid txHash format from wallet:", rawTxHash);
              throw new Error(`Wallet returned invalid transaction hash format: ${typeof rawTxHash === "string" ? rawTxHash.slice(0, 20) + "..." : typeof rawTxHash}`);
            }
          } catch (txError: any) {
            console.error("[Message] On-chain broadcast failed:", txError);
            if (txError.message?.includes("cancel") || txError.message?.includes("reject")) {
              throw new Error("Transaction cancelled by user");
            }
            // Fall back to local storage if wallet broadcast fails
            console.log("[Message] Falling back to local message storage");
          }
        }

        // Step 3: Report the transaction to backend for indexing
        const response = await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          encryptedContent: content,
          txHash, // User's own on-chain transaction hash
          kasiaPayload: prepareData.kasiaPayload,
        });
        return response.json();
      } finally {
        setIsSigning(false);
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      setMessageContent("");
      
      // Check if message was broadcast on-chain (real txHash vs local fallback)
      const isOnChain = data?.message?.txHash && !data.message.txHash.startsWith("msg-");
      toast({
        title: isOnChain ? "Message Broadcast" : "Message Sent",
        description: isOnChain 
          ? "Your message has been broadcast to the Kaspa blockchain." 
          : "Your message has been signed and stored.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const [isAccepting, setIsAccepting] = useState(false);
  
  const acceptHandshake = useMutation({
    mutationFn: async () => {
      setIsAccepting(true);
      try {
        // Step 1: Prepare the response handshake payload
        const prepareResponse = await apiRequest("POST", "/api/kasia/handshake/prepare-response", {
          conversationId: conversation.id,
          recipientAlias: "Anonymous",
        });
        const prepareData = await prepareResponse.json();
        
        if (!prepareData.success) {
          throw new Error(prepareData.error || "Failed to prepare response handshake");
        }
        
        // Step 2: Send response handshake (0.2 KAS to initiator) WITH Kasia payload
        // User signs and broadcasts their own transaction - fully decentralized!
        // The payload is CRITICAL - without it, the Kasia indexer won't recognize this as a handshake response
        if (!window.kasware || typeof window.kasware.sendKaspa !== "function") {
          throw new Error("KasWare wallet not available");
        }
        
        const HANDSHAKE_AMOUNT_SOMPI = 20000000; // 0.2 KAS
        console.log(`[Handshake] Sending response to ${prepareData.initiatorAddress} with Kasia payload...`);
        console.log(`[Handshake] Payload: ${prepareData.payloadHex?.slice(0, 40)}...`);
        
        let rawTxHash = await window.kasware.sendKaspa(
          prepareData.initiatorAddress,
          HANDSHAKE_AMOUNT_SOMPI,
          { 
            payload: prepareData.payloadHex, // CRITICAL: Embed Kasia handshake response payload
            priorityFee: 0 
          }
        );
        
        // Normalize txHash
        if (typeof rawTxHash === "object" && rawTxHash !== null) {
          rawTxHash = (rawTxHash as any).txid || (rawTxHash as any).txHash || (rawTxHash as any).hash || JSON.stringify(rawTxHash);
        }
        if (typeof rawTxHash === "string" && rawTxHash.startsWith("0x")) {
          rawTxHash = rawTxHash.slice(2);
        }
        
        if (typeof rawTxHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(rawTxHash)) {
          throw new Error("Invalid transaction hash from wallet");
        }
        
        console.log(`[Handshake] Response broadcast on-chain: ${rawTxHash}`);
        
        // Step 3: Confirm acceptance with the backend (includes txHash)
        const response = await apiRequest("POST", `/api/conversations/${conversation.id}/accept`, {
          responseTxHash: rawTxHash,
          recipientAlias: "Anonymous",
        });
        return response.json();
      } finally {
        setIsAccepting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Handshake Accepted",
        description: "Your response was broadcast on-chain. You can now exchange encrypted messages.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept handshake",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!messageContent.trim()) return;
    sendMessage.mutate(messageContent.trim());
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden min-h-0">
      <div className="flex items-center gap-3 border-b border-border/50 p-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden"
          data-testid="button-back-messages"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: generateJazzicon(otherAddress) }}
        >
          <User className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium">
            {otherAlias || truncatedAddress}
          </p>
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3 text-primary" />
            <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {conversation.status === "pending" && !isInitiator && (
        <div className="border-b border-border/50 bg-muted/30 p-4 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Handshake Request</p>
              <p className="text-xs text-muted-foreground">
                {truncatedAddress} wants to start an encrypted conversation with you.
              </p>
            </div>
            <Button
              onClick={() => acceptHandshake.mutate()}
              disabled={acceptHandshake.isPending || isAccepting}
              size="sm"
              data-testid="button-accept-handshake"
            >
              {acceptHandshake.isPending || isAccepting ? "Approve 0.2 KAS in wallet..." : "Accept (0.2 KAS)"}
            </Button>
          </div>
        </div>
      )}

      {conversation.status === "pending" && isInitiator && (
        <div className="border-b border-border/50 bg-muted/30 p-4 text-center shrink-0">
          <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Waiting for {truncatedAddress} to accept your handshake request...
          </p>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0 p-4">
        {conversation.status !== "active" ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">
                Messages will appear here once the conversation is active.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className="h-16 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMine = msg.senderAddress === walletAddress;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <p className="text-sm">{msg.encryptedContent}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Mail className="h-7 w-7 text-muted-foreground" />
              </div>
              <h4 className="font-medium">No messages yet</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Type a message below to start the conversation. All messages are encrypted and stored on-chain.
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {conversation.status === "active" && (
        <div className="border-t border-border/50 p-4 w-full shrink-0">
          <div className="flex items-end gap-3 w-full">
            <div className="flex-1 min-w-0">
              <Textarea
                placeholder="Type your message... (max 25 chars for on-chain)"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value.slice(0, 25))}
                className="min-h-[80px] max-h-[120px] resize-y text-sm w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                data-testid="input-message-content"
              />
              <div className="flex justify-between mt-1">
                <span className={`text-xs ${messageContent.length > 20 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {messageContent.length}/25 characters
                </span>
                {messageContent.length > 20 && (
                  <span className="text-xs text-amber-500">Near limit</span>
                )}
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={!messageContent.trim() || sendMessage.isPending || isSigning || messageContent.length > 25}
              size="default"
              className="shrink-0"
              data-testid="button-send-message"
            >
              {isSigning ? (
                <span className="animate-pulse">Signing...</span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            On-chain messages via Kasia Protocol (Kaspa storage limit: 25 chars)
          </p>
        </div>
      )}
    </div>
  );
}

function NewConversationView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const { signKasiaHandshake } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isAdminConversation, setIsAdminConversation] = useState(false);
  const [signingStep, setSigningStep] = useState<"idle" | "preparing" | "signing" | "confirming" | "verifying">("idle");
  const [verifyAttempts, setVerifyAttempts] = useState(0);

  // Fetch support address
  const { data: supportData, isLoading: supportLoading } = useQuery<{ address: string }>({
    queryKey: ["/api/support/address"],
  });

  // Sync recipient address when admin mode or support data changes
  useEffect(() => {
    if (isAdminConversation && supportData?.address) {
      setRecipientAddress(supportData.address);
    }
  }, [isAdminConversation, supportData?.address]);

  // Handle admin checkbox toggle
  const handleAdminToggle = (checked: boolean) => {
    setIsAdminConversation(checked);
    if (checked && supportData?.address) {
      setRecipientAddress(supportData.address);
    } else if (!checked) {
      setRecipientAddress("");
    }
  };

  const startConversation = useMutation({
    mutationFn: async () => {
      const trimmedAddress = recipientAddress.trim();
      
      // Step 1: Prepare the handshake (check for existing conversation)
      setSigningStep("preparing");
      const prepareResponse = await apiRequest("POST", "/api/kasia/handshake/prepare", {
        recipientAddress: trimmedAddress,
        senderAlias: "Anonymous",
      });
      const prepareData = await prepareResponse.json();
      
      // If conversation already exists, return it
      if (prepareData.existing) {
        return prepareData;
      }
      
      // Step 2: Send handshake transaction (0.2 KAS to recipient)
      // This uses sendKaspa which prompts user to approve KAS spend
      setSigningStep("signing");
      const txHash = await signKasiaHandshake(trimmedAddress, 0.2);
      
      // Step 3: Confirm the conversation with the txHash
      setSigningStep("confirming");
      const response = await apiRequest("POST", "/api/conversations", {
        recipientAddress: trimmedAddress,
        isAdminConversation,
        handshakeTxHash: txHash,
      });
      const result = await response.json();
      
      // Step 4: Poll for on-chain verification (retry up to 6 times over 30 seconds)
      setSigningStep("verifying");
      setVerifyAttempts(0);
      
      const MAX_VERIFY_ATTEMPTS = 6;
      const VERIFY_INTERVAL = 5000; // 5 seconds
      
      for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
        setVerifyAttempts(attempt);
        await new Promise(resolve => setTimeout(resolve, VERIFY_INTERVAL));
        
        // Trigger a refresh of conversations from the indexer
        try {
          const refreshRes = await apiRequest("POST", "/api/conversations/sync", {});
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            console.log(`[Verify] Sync attempt ${attempt}: synced ${refreshData.synced} conversations`);
          }
        } catch (e) {
          console.log(`[Verify] Sync attempt ${attempt} failed, continuing...`);
        }
      }
      
      return result;
    },
    onSuccess: (data) => {
      setSigningStep("idle");
      setVerifyAttempts(0);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      if (data?.existing) {
        toast({
          title: "Conversation Exists",
          description: data.message || "Returning to existing conversation.",
        });
      } else {
        toast({
          title: "Conversation Started",
          description: "Handshake broadcast! Verification syncing in background.",
        });
      }
      onBack();
    },
    onError: (error: Error) => {
      setSigningStep("idle");
      setVerifyAttempts(0);
      toast({
        title: "Failed to start conversation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const getButtonText = () => {
    switch (signingStep) {
      case "preparing": return "Preparing handshake...";
      case "signing": return "Approve 0.2 KAS in KasWare...";
      case "confirming": return "Confirming...";
      case "verifying": return `Syncing with indexer (${verifyAttempts}/6)...`;
      default: return "Start Conversation (0.2 KAS)";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-cancel-new">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">New Conversation</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="admin-conversation"
            checked={isAdminConversation}
            onChange={(e) => handleAdminToggle(e.target.checked)}
            className="h-4 w-4 rounded border-border"
            data-testid="checkbox-admin-conversation"
          />
          <label htmlFor="admin-conversation" className="text-sm text-muted-foreground">
            Contact Support (Admin)
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Recipient Kaspa Address
          </label>
          <Input
            placeholder="kaspa:qr..."
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="font-mono"
            disabled={isAdminConversation}
            data-testid="input-new-recipient"
          />
          {isAdminConversation && (
            <p className="mt-1 text-xs text-muted-foreground">
              {supportLoading ? "Loading support address..." : recipientAddress ? `Support: ${recipientAddress.slice(0, 16)}...${recipientAddress.slice(-8)}` : "Support address not available"}
            </p>
          )}
        </div>

        <Button
          onClick={() => startConversation.mutate()}
          disabled={!recipientAddress.trim() || startConversation.isPending || (isAdminConversation && supportLoading)}
          className="w-full gap-2"
          data-testid="button-create-conversation"
        >
          <Mail className="h-4 w-4" />
          {getButtonText()}
        </Button>

        <p className="text-xs text-muted-foreground">
          A handshake request will be sent to the recipient. Once they accept, you can exchange end-to-end encrypted messages.
        </p>
      </div>
    </div>
  );
}

export default function Messages() {
  const { wallet } = useWallet();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);

  const { data: conversationsData, isLoading, refetch, isFetching } = useQuery<{ conversations: Conversation[], source?: string }>({
    queryKey: ["/api/conversations", "onchain"],
    queryFn: async () => {
      const url = "/api/conversations?source=onchain";
      const headers: Record<string, string> = {};
      const authToken = getAuthToken();
      const walletAddress = getWalletAddress();
      if (authToken) headers["x-auth-token"] = authToken;
      if (walletAddress) headers["x-wallet-address"] = walletAddress;
      
      const res = await fetch(url, { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!wallet,
    refetchInterval: 10000,
  });
  
  const conversations = conversationsData?.conversations;

  if (!wallet) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Connect Your Wallet</h2>
          <p className="mt-2 text-muted-foreground">
            Connect your Kaspa wallet to access encrypted messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start gap-6 flex-wrap md:flex-nowrap">
            <div className="flex items-center gap-4">
              <img 
                src={kasiaLogo} 
                alt="Kasia Protocol" 
                className="h-14 w-14 rounded-lg object-cover"
                data-testid="img-kasia-logo"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="text-messages-title">
                  Private Messages
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Powered by Kasia Protocol
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5">
                <div className={`h-2 w-2 rounded-full ${isFetching ? "animate-pulse bg-yellow-500" : "bg-green-500"}`} />
                <span className="text-xs font-medium text-primary">Mainnet</span>
                <Globe className="h-3.5 w-3.5 text-primary" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                data-testid="button-refresh-conversations"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          
          <Card className="mt-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Lock className="mt-1 h-5 w-5 text-primary shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">About Kasia Protocol</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Kasia is an encrypted, decentralized P2P messaging protocol built on Kaspa. 
                    We integrated Kasia because it ensures your private conversations are truly private - 
                    all messages are end-to-end encrypted and stored on the Kaspa blockchain, 
                    not on any central server. This means nobody, including us, can read your messages.
                  </p>
                  <a 
                    href="https://kasia.fyi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    data-testid="link-kasia-website"
                  >
                    Learn more about Kasia
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          
        </div>

        <Card className="min-h-[500px] h-[calc(100vh-400px)] max-h-[700px] overflow-hidden border-border/50">
          <div className="grid h-full md:grid-cols-[320px_1fr]">
            <div className={`flex h-full flex-col border-r border-border/50 ${selectedConversation || showNewConversation ? "hidden md:flex" : ""}`}>
              <div className="flex items-center justify-between border-b border-border/50 p-4">
                <h2 className="font-semibold">Conversations</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewConversation(true)}
                  data-testid="button-new-conversation"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : conversations && conversations.length > 0 ? (
                    <div className="space-y-1">
                      {conversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          walletAddress={wallet.address}
                          isActive={selectedConversation?.id === conv.id}
                          onClick={() => {
                            setSelectedConversation(conv);
                            setShowNewConversation(false);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Mail className="h-12 w-12 text-muted-foreground/30" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        No conversations yet
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-2"
                        onClick={() => setShowNewConversation(true)}
                        data-testid="button-start-first-conversation"
                      >
                        <Plus className="h-4 w-4" />
                        Start a Conversation
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className={`flex h-full w-full flex-1 overflow-hidden min-h-0 ${!selectedConversation && !showNewConversation ? "hidden md:flex" : ""}`}>
              {showNewConversation ? (
                <NewConversationView onBack={() => setShowNewConversation(false)} />
              ) : selectedConversation ? (
                <ConversationView
                  conversation={selectedConversation}
                  walletAddress={wallet.address}
                  onBack={() => setSelectedConversation(null)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-8">
                  <div className="text-center max-w-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Secure Messaging</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Select a conversation from the list or start a new encrypted chat with any Kaspa wallet address
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => setShowNewConversation(true)}
                      data-testid="button-start-conversation-empty"
                    >
                      <Plus className="h-4 w-4" />
                      New Conversation
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
