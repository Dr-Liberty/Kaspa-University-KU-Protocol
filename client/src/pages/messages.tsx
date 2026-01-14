import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useWallet } from "@/lib/wallet-context";
import { queryClient, apiRequest, getAuthToken, getWalletAddress } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useConversationKeys } from "@/hooks/use-conversation-keys";
const kasiaLogo = "/thumbnails/kasia_encrypted_messaging.png";

interface UserProfile {
  displayName: string | null;
  avatarUrl: string | null;
}
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
  onClick,
  profiles,
}: { 
  conversation: Conversation; 
  walletAddress: string;
  isActive: boolean;
  onClick: () => void;
  profiles: Record<string, UserProfile>;
}) {
  const isInitiator = conversation.initiatorAddress === walletAddress;
  const otherAddress = isInitiator ? conversation.recipientAddress : conversation.initiatorAddress;
  const otherAlias = isInitiator ? conversation.recipientAlias : conversation.initiatorAlias;
  const otherProfile = profiles[otherAddress];
  const avatarColor = generateJazzicon(otherAddress);
  const truncatedAddress = `${otherAddress.slice(0, 8)}...${otherAddress.slice(-4)}`;
  const displayName = otherProfile?.displayName || otherAlias || truncatedAddress;

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
      <Avatar className="h-10 w-10 shrink-0">
        {otherProfile?.avatarUrl ? (
          <AvatarImage src={otherProfile.avatarUrl} alt={displayName} />
        ) : null}
        <AvatarFallback style={{ backgroundColor: avatarColor }}>
          <User className="h-5 w-5 text-white" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm flex-1 min-w-0">
            {displayName}
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
  const [keyInitialized, setKeyInitialized] = useState(false);
  
  const { hasKey, initializeKey, tryLoadKeyFromServer, encryptContent, tryDecryptMessage } = useConversationKeys(walletAddress);

  const isInitiator = conversation.initiatorAddress === walletAddress;
  const otherAddress = isInitiator ? conversation.recipientAddress : conversation.initiatorAddress;
  const otherAlias = isInitiator ? conversation.recipientAlias : conversation.initiatorAlias;
  const truncatedAddress = `${otherAddress.slice(0, 10)}...${otherAddress.slice(-4)}`;

  useEffect(() => {
    const initKey = async () => {
      if (conversation.status === "active" && !hasKey(conversation.id)) {
        const loadedKey = await tryLoadKeyFromServer(conversation.id, walletAddress, otherAddress, isInitiator);
        if (loadedKey) {
          setKeyInitialized(true);
          return;
        }
        
        if (window.kasware) {
          try {
            const key = await initializeKey(
              conversation.id, 
              walletAddress, 
              otherAddress,
              async (msg) => {
                return await window.kasware!.signMessage(msg, { type: "schnorr" });
              },
              isInitiator
            );
            if (key) {
              setKeyInitialized(true);
            }
          } catch (error) {
            console.error("[E2EE] Failed to initialize conversation key:", error);
          }
        }
      } else if (hasKey(conversation.id)) {
        setKeyInitialized(true);
      }
    };
    initKey();
  }, [conversation.id, conversation.status, hasKey, initializeKey, tryLoadKeyFromServer, walletAddress, otherAddress, isInitiator]);

  const { data: messagesData, isLoading, refetch } = useQuery<{ messages: PrivateMessage[]; conversation: Conversation; source: string }>({
    queryKey: ["/api/conversations", conversation.id, "messages"],
    enabled: conversation.status === "active",
    refetchInterval: 10000,
  });
  
  const messages = messagesData?.messages || [];

  // Retrieve messages from on-chain indexer
  const retrieveMessages = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/conversations/${conversation.id}/sync`);
      return response.json();
    },
    onSuccess: async (data) => {
      // Invalidate and immediately refetch for instant UI update
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      await refetch();
      toast({
        title: "Messages Retrieved",
        description: data.syncedCount > 0 
          ? `Found ${data.syncedCount} new message${data.syncedCount > 1 ? "s" : ""} from the Kasia indexer. Total: ${data.totalMessages}`
          : `No new messages found on-chain. Total: ${data.totalMessages}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Could not retrieve messages from the indexer.",
        variant: "destructive",
      });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      setIsSigning(true);
      try {
        if (!keyInitialized || !hasKey(conversation.id)) {
          throw new Error("E2EE key not initialized. Please sign the encryption key request first.");
        }
        
        const encryptedContent = encryptContent(conversation.id, content);
        if (!encryptedContent) {
          throw new Error("Failed to encrypt message. Cannot send unencrypted content.");
        }
        
        const prepareRes = await apiRequest("POST", "/api/messages/prepare", {
          content: encryptedContent,
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
            
            // Validate recipient address before sending
            if (!otherAddress || !otherAddress.startsWith("kaspa:")) {
              throw new Error(`Invalid recipient address: ${otherAddress}`);
            }
            
            // 0.2 KAS per message - this amount works with KasWare wallet
            const MESSAGE_AMOUNT_SOMPI = 20000000; // 0.2 KAS
            
            let rawTxHash = await window.kasware.sendKaspa(
              otherAddress,
              MESSAGE_AMOUNT_SOMPI,
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

        const response = await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          encryptedContent: encryptedContent,
          txHash,
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
        
        console.log("[Handshake] Raw response from KasWare:", rawTxHash, "type:", typeof rawTxHash);
        
        // Normalize txHash - handle various return formats from KasWare
        // First, try parsing if it's a JSON string
        if (typeof rawTxHash === "string" && rawTxHash.startsWith("{")) {
          try {
            rawTxHash = JSON.parse(rawTxHash);
            console.log("[Handshake] Parsed JSON string:", rawTxHash);
          } catch (e) {
            console.log("[Handshake] Failed to parse as JSON");
          }
        }
        
        if (typeof rawTxHash === "object" && rawTxHash !== null) {
          // Extract txid from object response - check all possible field names
          const objHash = (rawTxHash as any).id || (rawTxHash as any).txid || (rawTxHash as any).txHash || (rawTxHash as any).hash || (rawTxHash as any).transactionId;
          console.log("[Handshake] Extracted from object:", objHash);
          rawTxHash = objHash || JSON.stringify(rawTxHash);
        }
        if (typeof rawTxHash === "string" && rawTxHash.startsWith("0x")) {
          rawTxHash = rawTxHash.slice(2);
        }
        
        // Validate format
        if (typeof rawTxHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(rawTxHash)) {
          console.error("[Handshake] Invalid txHash format:", rawTxHash);
          throw new Error(`Wallet returned invalid transaction format: ${typeof rawTxHash === 'string' ? rawTxHash.slice(0,30) + '...' : typeof rawTxHash}`);
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
      // Invalidate ALL conversation queries (partial match)
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"], exact: false });
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
        {conversation.status === "active" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => retrieveMessages.mutate()}
            disabled={retrieveMessages.isPending}
            title="Retrieve messages from Kasia indexer"
            data-testid="button-retrieve-messages"
          >
            <RefreshCw className={`h-4 w-4 ${retrieveMessages.isPending ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {conversation.status === "pending" && !isInitiator && (
        <div className="border-b border-border/50 bg-muted/30 p-4 shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">Handshake Request</p>
              <p className="text-xs text-muted-foreground">
                {truncatedAddress} wants to start an encrypted conversation with you.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations"], exact: false });
                }}
                data-testid="button-sync-pending-recipient"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Sync
              </Button>
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
        </div>
      )}

      {conversation.status === "pending" && isInitiator && (
        <div className="border-b border-border/50 bg-muted/30 p-4 text-center shrink-0">
          <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Waiting for {truncatedAddress} to accept your handshake request...
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/conversations"], exact: false });
            }}
            data-testid="button-sync-pending-initiator"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Check status
          </Button>
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
              const { decrypted, content: displayContent } = tryDecryptMessage(
                conversation.id,
                msg.encryptedContent
              );
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
                    <p className="text-sm">{displayContent}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] opacity-70">
                      <span>{formatTime(msg.createdAt)}</span>
                      {decrypted && <Lock className="h-2.5 w-2.5" />}
                    </div>
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
          {!keyInitialized && (
            <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">E2EE Key Required</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sign a message to initialize end-to-end encryption for this conversation.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={async () => {
                  if (window.kasware) {
                    try {
                      const key = await initializeKey(
                        conversation.id,
                        walletAddress,
                        otherAddress,
                        async (msg) => window.kasware!.signMessage(msg, { type: "schnorr" }),
                        isInitiator
                      );
                      if (key) {
                        setKeyInitialized(true);
                        toast({ title: "E2EE Enabled", description: "Your messages are now end-to-end encrypted." });
                      } else {
                        toast({ title: "Waiting for other party", description: "Both parties need to initialize E2EE. Please wait for the other user.", variant: "default" });
                      }
                    } catch (error) {
                      toast({ title: "Key Initialization Failed", description: "Please try again.", variant: "destructive" });
                    }
                  }
                }}
                data-testid="button-init-e2ee"
              >
                <Lock className="h-3 w-3 mr-2" />
                Initialize E2EE
              </Button>
            </div>
          )}
          <div className="flex items-end gap-3 w-full">
            <div className="flex-1 min-w-0">
              <Textarea
                placeholder={keyInitialized ? "Type your encrypted message..." : "Initialize E2EE first..."}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value.slice(0, 25))}
                className="min-h-[80px] max-h-[120px] resize-y text-sm w-full"
                disabled={!keyInitialized}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && keyInitialized) {
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
                {keyInitialized && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" />
                    E2EE Active
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={!keyInitialized || !messageContent.trim() || sendMessage.isPending || isSigning || messageContent.length > 25}
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
            {keyInitialized ? "End-to-end encrypted via ChaCha20-Poly1305" : "Sign to enable E2EE messaging"}
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
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"], exact: false });
      
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
  const { wallet, isAuthenticated } = useWallet();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  
  // Check for stored wallet address even if wallet context hasn't restored yet
  // Try multiple sources: direct address key, or parse from wallet object
  const getStoredWalletAddress = (): string | null => {
    if (typeof window === "undefined") return null;
    // First try the direct address key
    const directAddress = localStorage.getItem("kaspa-university-wallet-address");
    if (directAddress) return directAddress;
    // Fallback: parse from wallet object
    const walletJson = localStorage.getItem("kaspa-university-wallet");
    if (walletJson) {
      try {
        const parsed = JSON.parse(walletJson);
        return parsed?.address || null;
      } catch { return null; }
    }
    return null;
  };
  const storedWalletAddress = getStoredWalletAddress();
  const effectiveWalletAddress = wallet?.address || storedWalletAddress;
  
  // Debug logging for auth state
  useEffect(() => {
    console.log(`[Messages] Auth state: wallet=${wallet?.address?.slice(0, 20) || "null"}, stored=${storedWalletAddress?.slice(0, 20) || "null"}, isAuthenticated=${isAuthenticated}`);
  }, [wallet, isAuthenticated, storedWalletAddress]);
  
  const { data: conversationsData, isLoading, refetch, isFetching } = useQuery<{ conversations: Conversation[], source?: string }>({
    queryKey: ["/api/conversations", "onchain", effectiveWalletAddress || "noWallet"],
    queryFn: async () => {
      console.log("[Messages] Fetching conversations from server...");
      const url = "/api/conversations?source=onchain";
      const headers: Record<string, string> = {};
      const token = getAuthToken() || localStorage.getItem("kaspa-university-auth-token");
      const walletAddress = getWalletAddress() || localStorage.getItem("kaspa-university-wallet-address");
      console.log(`[Messages] Headers: token=${token ? "yes" : "no"}, wallet=${walletAddress?.slice(0, 20) || "null"}`);
      if (token) headers["x-auth-token"] = token;
      if (walletAddress) headers["x-wallet-address"] = walletAddress;
      
      const res = await fetch(url, { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      console.log(`[Messages] Received ${data.conversations?.length || 0} conversations from source: ${data.source}`);
      return data;
    },
    // Fire query as soon as we have ANY wallet address (from context OR localStorage)
    enabled: !!effectiveWalletAddress,
    refetchInterval: 10000,
    refetchOnMount: "always",
    staleTime: 0,
  });
  
  // Force refetch when wallet context becomes available
  useEffect(() => {
    if (effectiveWalletAddress) {
      console.log("[Messages] Wallet address available, triggering refetch...");
      refetch();
    }
  }, [effectiveWalletAddress, refetch]);
  
  const conversations = conversationsData?.conversations;
  
  // Fetch profiles for all addresses in conversations
  useEffect(() => {
    if (!conversations || conversations.length === 0) return;
    
    const addresses = new Set<string>();
    conversations.forEach(conv => {
      addresses.add(conv.initiatorAddress);
      addresses.add(conv.recipientAddress);
    });
    
    const addressList = Array.from(addresses).filter(a => !profiles[a]);
    if (addressList.length === 0) return;
    
    apiRequest("POST", "/api/profiles/batch", { walletAddresses: addressList.slice(0, 50) })
      .then(res => res.json())
      .then(data => {
        if (data.profiles) {
          setProfiles(prev => ({ ...prev, ...data.profiles }));
        }
      })
      .catch(err => console.error("[Messages] Failed to fetch profiles:", err));
  }, [conversations]);
  
  // Sync selectedConversation with latest data from the list
  // This ensures status updates (e.g., pending -> active) are reflected
  useEffect(() => {
    if (selectedConversation && conversations) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated && updated.status !== selectedConversation.status) {
        console.log(`[Messages] Syncing conversation ${updated.id}: status ${selectedConversation.status} -> ${updated.status}`);
        setSelectedConversation(updated);
      }
    }
  }, [conversations, selectedConversation]);

  // Only block if no wallet address at all (neither from context nor localStorage)
  if (!effectiveWalletAddress) {
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
                          walletAddress={effectiveWalletAddress}
                          isActive={selectedConversation?.id === conv.id}
                          onClick={() => {
                            setSelectedConversation(conv);
                            setShowNewConversation(false);
                          }}
                          profiles={profiles}
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
                  walletAddress={effectiveWalletAddress}
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
