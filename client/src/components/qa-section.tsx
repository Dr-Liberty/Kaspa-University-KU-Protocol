import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { QAPost } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { 
  MessageSquare, 
  Send, 
  ExternalLink, 
  User, 
  Link as LinkIcon, 
  Shield, 
  CheckCircle2,
  Lock,
  Globe,
  Mail,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QASectionProps {
  lessonId: string;
}

function generateJazzicon(address: string): string {
  const hash = address.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 50%)`;
}

function PostCard({ post }: { post: QAPost }) {
  const avatarColor = generateJazzicon(post.authorAddress);
  const truncatedAddress = `${post.authorAddress.slice(0, 10)}...${post.authorAddress.slice(-4)}`;
  const isOnChain = post.txHash && !post.txHash.startsWith("demo_");
  const isDemo = post.txHash?.startsWith("demo_");

  const formatTime = (date: Date) => {
    const d = new Date(date);
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
  };

  return (
    <div
      className="group flex gap-3 rounded-lg border border-border/50 bg-card/50 p-4 transition-colors hover:border-primary/20 hover:bg-card"
      data-testid={`qa-post-${post.id}`}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: avatarColor }}
      >
        <User className="h-4 w-4 text-white" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {truncatedAddress}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(post.createdAt)}
          </span>
          {post.isQuestion && (
            <Badge variant="outline" className="text-[10px]">
              Question
            </Badge>
          )}
          {isOnChain && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              On-Chain
            </Badge>
          )}
          {isDemo && (
            <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
              <Shield className="h-2.5 w-2.5" />
              Demo
            </Badge>
          )}
        </div>
        <p className="text-sm leading-relaxed">{post.content}</p>
        <div className="flex flex-wrap items-center gap-3">
          {isOnChain && post.txHash && (
            <a
              href={`https://explorer.kaspa.org/txs/${post.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity hover:underline group-hover:opacity-100"
              data-testid={`link-explorer-${post.id}`}
            >
              <ExternalLink className="h-3 w-3" />
              View on Explorer
            </a>
          )}
          {post.txHash && (
            <a
              href={`/verify/${post.txHash}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-primary hover:underline group-hover:opacity-100"
              data-testid={`link-verify-${post.id}`}
            >
              <Shield className="h-3 w-3" />
              Verify
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PublicCommentsTab({ lessonId }: { lessonId: string }) {
  const { wallet, isDemoMode } = useWallet();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isQuestion, setIsQuestion] = useState(true);
  const [postOnChain, setPostOnChain] = useState(true);
  const [isSigning, setIsSigning] = useState(false);

  const { data: posts, isLoading } = useQuery<QAPost[]>({
    queryKey: ["/api/qa", lessonId],
  });

  const createPost = useMutation({
    mutationFn: async (data: { content: string; isQuestion: boolean; postOnChain: boolean }) => {
      let signature: string | undefined;
      let signedPayload: string | undefined;
      let authorPubkey: string | undefined;

      // Request wallet signature for on-chain posts
      if (data.postOnChain && window.kasware) {
        setIsSigning(true);
        try {
          // Prepare the message for signing
          const prepareRes = await apiRequest("POST", "/api/k-protocol/prepare", {
            content: data.content,
            lessonId,
          });
          const prepareData = await prepareRes.json();
          
          if (prepareData.success && prepareData.messageToSign) {
            signedPayload = prepareData.messageToSign;
            authorPubkey = await window.kasware.getPublicKey();
            signature = await window.kasware.signMessage(prepareData.messageToSign, { type: "schnorr" });
          }
        } catch (signError: any) {
          console.error("[K Protocol] Wallet signing failed:", signError);
          if (signError.message?.includes("cancel") || signError.message?.includes("reject")) {
            setIsSigning(false);
            throw new Error("Signing cancelled by user");
          }
        } finally {
          setIsSigning(false);
        }
      }

      const response = await apiRequest("POST", `/api/qa/${lessonId}`, {
        ...data,
        authorAddress: wallet?.address,
        lessonId,
        signature,
        signedPayload,
        authorPubkey,
      });
      return response.json();
    },
    onSuccess: (data: { onChainStatus: string; onChainError?: string; isDemo?: boolean; txHash?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa", lessonId] });
      setContent("");
      
      if (data.onChainStatus === "success") {
        if (data.isDemo) {
          toast({
            title: "Posted (Demo Mode)",
            description: "Your message was saved. Real on-chain storage requires treasury funding.",
          });
        } else {
          toast({
            title: "Posted on-chain!",
            description: "Your message has been permanently recorded on the Kaspa blockchain.",
          });
        }
      } else if (data.onChainStatus === "failed") {
        toast({
          title: "Posted (off-chain only)",
          description: data.onChainError || "On-chain posting failed, but your message was saved locally.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Posted!",
          description: "Your message has been saved.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Failed to post",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim() || !wallet) return;
    createPost.mutate({ content: content.trim(), isQuestion, postOnChain });
  };

  return (
    <div className="space-y-4">
      {wallet ? (
        <div className="space-y-3">
          <Textarea
            placeholder="Ask a question or share your insights..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none border-border/50 bg-background focus:border-primary"
            data-testid="input-qa-content"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                <Button
                  variant={isQuestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsQuestion(true)}
                  data-testid="button-question-type"
                >
                  Question
                </Button>
                <Button
                  variant={!isQuestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsQuestion(false)}
                  data-testid="button-answer-type"
                >
                  Answer / Comment
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="post-on-chain"
                  checked={postOnChain}
                  onCheckedChange={setPostOnChain}
                  data-testid="switch-post-on-chain"
                />
                <Label 
                  htmlFor="post-on-chain" 
                  className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <LinkIcon className="h-3 w-3" />
                  Record on blockchain
                </Label>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || createPost.isPending || isSigning}
              className="gap-2"
              data-testid="button-post-qa"
            >
              <Send className="h-4 w-4" />
              {isSigning ? "Signing..." : createPost.isPending ? "Posting..." : postOnChain ? "Sign & Post" : "Post"}
            </Button>
          </div>
          {postOnChain && (
            <p className="text-xs text-muted-foreground">
              Your post will be permanently stored on the Kaspa blockchain and can be verified by anyone.
              {isDemoMode && " (Demo mode - no actual transaction)"}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Connect your wallet to participate in discussions
          </p>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-border/50 p-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No discussions yet. Be the first to ask a question!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivateMessagesTab({ lessonId }: { lessonId: string }) {
  const { wallet } = useWallet();
  const { toast } = useToast();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [messageContent, setMessageContent] = useState("");

  const startConversation = useMutation({
    mutationFn: async (data: { recipientAddress: string; message?: string }) => {
      const response = await apiRequest("POST", "/api/conversations", {
        recipientAddress: data.recipientAddress,
        isAdminConversation: false,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conversation Started",
        description: "A handshake request has been sent. Once accepted, you can exchange encrypted messages.",
      });
      setRecipientAddress("");
      setMessageContent("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start conversation",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleStartConversation = () => {
    if (!recipientAddress.trim()) return;
    startConversation.mutate({ 
      recipientAddress: recipientAddress.trim(),
      message: messageContent.trim() || undefined,
    });
  };

  if (!wallet) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Connect your wallet to send private messages
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-card/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Send Encrypted Message</span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Messages are encrypted end-to-end using the Kasia Protocol. Only you and the recipient can read them.
        </p>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="recipient" className="text-xs text-muted-foreground">
              Recipient Kaspa Address
            </Label>
            <Input
              id="recipient"
              placeholder="kaspa:qr..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="mt-1 font-mono text-sm"
              data-testid="input-recipient-address"
            />
          </div>
          
          <div>
            <Label htmlFor="message" className="text-xs text-muted-foreground">
              Message (optional - sent after handshake)
            </Label>
            <Textarea
              id="message"
              placeholder="Your private message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="mt-1 min-h-[60px] resize-none"
              data-testid="input-private-message"
            />
          </div>
          
          <Button
            onClick={handleStartConversation}
            disabled={!recipientAddress.trim() || startConversation.isPending}
            className="w-full gap-2"
            data-testid="button-start-conversation"
          >
            <Mail className="h-4 w-4" />
            {startConversation.isPending ? "Initiating..." : "Start Encrypted Conversation"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <Mail className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          View your conversations in the Messages section
        </p>
        <a 
          href="/messages" 
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          data-testid="link-view-messages"
        >
          Go to Messages
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export function QASection({ lessonId }: QASectionProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Discussions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="public" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="public" className="gap-2" data-testid="tab-public-comments">
              <Globe className="h-4 w-4" />
              Public Comments
            </TabsTrigger>
            <TabsTrigger value="private" className="gap-2" data-testid="tab-private-messages">
              <Lock className="h-4 w-4" />
              Private Messages
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="public">
            <PublicCommentsTab lessonId={lessonId} />
          </TabsContent>
          
          <TabsContent value="private">
            <PrivateMessagesTab lessonId={lessonId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
