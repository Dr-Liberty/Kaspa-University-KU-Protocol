import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Award,
  FileQuestion,
  MessageSquare,
  AlertTriangle,
  Clock,
  Hash,
  User
} from "lucide-react";

interface RecentTransaction {
  txHash: string;
  type: "quiz" | "qa_question" | "qa_answer";
  timestamp: number;
  walletAddress?: string;
  courseId?: string;
  score?: number;
  maxScore?: number;
}

interface VerificationResult {
  verified: boolean;
  type: "quiz" | "qa_question" | "qa_answer" | "unknown";
  demo?: boolean;
  message?: string;
  payload?: string;
  decoded?: {
    version: number;
    type: string;
    data: string;
    courseId?: string;
    score?: number;
    maxScore?: number;
    hash?: string;
    lessonId?: string;
    contentHash?: string;
    questionTxId?: string;
    walletAddress?: string;
    content?: string;
    timestamp?: number;
  };
}

function getTypeIcon(type: string) {
  switch (type) {
    case "quiz":
      return <Award className="h-4 w-4" />;
    case "qa_question":
      return <FileQuestion className="h-4 w-4" />;
    case "qa_answer":
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

function getTypeName(type: string) {
  switch (type) {
    case "quiz":
      return "Quiz Proof";
    case "qa_question":
      return "Q&A Question";
    case "qa_answer":
      return "Q&A Answer";
    default:
      return "Unknown";
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "quiz":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "qa_question":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "qa_answer":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateHash(hash: string) {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function VerifyExplorerPage() {
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [searchHash, setSearchHash] = useState("");

  const { data: recentTxs, isLoading: loadingRecent } = useQuery<RecentTransaction[]>({
    queryKey: ["/api/verify/recent"],
  });

  const { data: searchResult, isLoading: loadingSearch, error: searchError } = useQuery<VerificationResult>({
    queryKey: ["/api/verify", searchHash],
    enabled: !!searchHash,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      setSearchHash(trimmed);
    }
  };

  const handleViewDetails = (txHash: string) => {
    setLocation(`/verify/${txHash}`);
  };

  const isDemo = searchHash.startsWith("demo_");
  const explorerUrl = searchHash && !isDemo ? `https://explorer.kaspa.org/txs/${searchHash}` : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold" data-testid="text-explorer-title">Certificate Explorer</h1>
        <p className="mt-2 text-muted-foreground">
          Verify on-chain quiz proofs, Q&A posts, and certificates
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Verify Transaction
          </CardTitle>
          <CardDescription>
            Enter a transaction hash to verify its authenticity on the Kaspa blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter transaction hash..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 font-mono"
              data-testid="input-tx-hash"
            />
            <Button type="submit" disabled={!searchInput.trim()} data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchHash && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Verification Result</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSearch ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : searchError ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
                <XCircle className="h-10 w-10 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Verification Failed</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Could not verify this transaction. It may not exist or may not contain KU Protocol data.
                  </p>
                </div>
              </div>
            ) : searchResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction Hash</p>
                      <p className="font-mono text-sm break-all" data-testid="text-result-hash">{searchHash}</p>
                    </div>
                  </div>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      data-testid="link-explorer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <div 
                  className={`flex items-center gap-4 rounded-lg border p-4 ${
                    searchResult.verified 
                      ? "border-green-500/20 bg-green-500/10" 
                      : "border-destructive/20 bg-destructive/10"
                  }`}
                >
                  {searchResult.verified ? (
                    <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="h-8 w-8 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className={`font-medium ${searchResult.verified ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {searchResult.verified ? "Verified" : "Not Verified"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchResult.message || (searchResult.verified ? "This content is authentic and recorded on the Kaspa blockchain." : "Could not verify this content.")}
                    </p>
                  </div>
                </div>

                {searchResult.demo && (
                  <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm text-muted-foreground">
                      This is a demo transaction and not actually recorded on the blockchain.
                    </p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="secondary" className={`gap-1.5 ${getTypeColor(searchResult.type)}`}>
                      {getTypeIcon(searchResult.type)}
                      {getTypeName(searchResult.type)}
                    </Badge>
                  </div>

                  {searchResult.decoded?.courseId && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Course</span>
                      <span className="font-medium text-sm">{searchResult.decoded.courseId}</span>
                    </div>
                  )}

                  {searchResult.decoded?.score !== undefined && searchResult.decoded?.maxScore !== undefined && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Score</span>
                      <span className="font-medium">
                        {searchResult.decoded.score}/{searchResult.decoded.maxScore}
                        {" "}
                        <span className="text-muted-foreground">
                          ({Math.round((searchResult.decoded.score / searchResult.decoded.maxScore) * 100)}%)
                        </span>
                      </span>
                    </div>
                  )}

                  {searchResult.decoded?.walletAddress && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Wallet</span>
                      <span className="font-mono text-xs">{truncateHash(searchResult.decoded.walletAddress)}</span>
                    </div>
                  )}

                  {searchResult.decoded?.contentHash && (
                    <div className="col-span-2 rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Content Hash</span>
                      <p className="mt-1 font-mono text-xs break-all">{searchResult.decoded.contentHash}</p>
                    </div>
                  )}
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleViewDetails(searchHash)}
                  data-testid="button-view-details"
                >
                  View Full Details
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Recent Verifications
          </CardTitle>
          <CardDescription>
            Latest on-chain proofs and certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentTxs && recentTxs.length > 0 ? (
            <div className="space-y-3">
              {recentTxs.map((tx) => (
                <div
                  key={tx.txHash}
                  className="flex items-center justify-between rounded-lg border p-4 hover-elevate cursor-pointer"
                  onClick={() => handleViewDetails(tx.txHash)}
                  data-testid={`card-tx-${tx.txHash.slice(0, 8)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getTypeColor(tx.type)}`}>
                      {getTypeIcon(tx.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">{truncateHash(tx.txHash)}</p>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeName(tx.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {tx.walletAddress && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {truncateHash(tx.walletAddress)}
                          </span>
                        )}
                        {tx.score !== undefined && tx.maxScore !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Score: {tx.score}/{tx.maxScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(tx.timestamp)}
                    </p>
                    <ExternalLink className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent verifications</p>
              <p className="text-sm mt-1">Complete a quiz or post in Q&A to create on-chain records</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
