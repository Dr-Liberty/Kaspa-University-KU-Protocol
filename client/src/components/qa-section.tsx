import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { QAPost } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { MessageSquare, Send, ExternalLink, User } from "lucide-react";
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
        </div>
        <p className="text-sm leading-relaxed">{post.content}</p>
        {post.txHash && (
          <a
            href={`https://explorer.kaspa.org/txs/${post.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity hover:underline group-hover:opacity-100"
          >
            <ExternalLink className="h-3 w-3" />
            View on chain
          </a>
        )}
      </div>
    </div>
  );
}

export function QASection({ lessonId }: QASectionProps) {
  const { wallet } = useWallet();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isQuestion, setIsQuestion] = useState(true);

  const { data: posts, isLoading } = useQuery<QAPost[]>({
    queryKey: ["/api/qa", lessonId],
  });

  const createPost = useMutation({
    mutationFn: async (data: { content: string; isQuestion: boolean }) => {
      return apiRequest("POST", `/api/qa/${lessonId}`, {
        ...data,
        authorAddress: wallet?.address,
        lessonId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa", lessonId] });
      setContent("");
      toast({
        title: "Posted to blockchain!",
        description: "Your message has been recorded on Kaspa.",
      });
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
    createPost.mutate({ content: content.trim(), isQuestion });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          On-Chain Discussions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {wallet ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Ask a question or share your insights..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-border/50 bg-background focus:border-primary"
              data-testid="input-qa-content"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
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
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || createPost.isPending}
                className="gap-2"
                data-testid="button-post-qa"
              >
                <Send className="h-4 w-4" />
                {createPost.isPending ? "Posting..." : "Post to Blockchain"}
              </Button>
            </div>
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
      </CardContent>
    </Card>
  );
}
