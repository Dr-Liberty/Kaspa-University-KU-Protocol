import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  User,
  Blocks,
  RefreshCw,
  Database,
  Globe
} from "lucide-react";

interface BlockchainTransaction {
  txHash: string;
  type: "quiz" | "qa_question" | "qa_answer" | "unknown";
  timestamp: number;
  walletAddress?: string;
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  score?: number;
  maxScore?: number;
  contentHash?: string;
  blockHash?: string;
  confirmed?: boolean;
  source?: "blockchain" | "database";
}

interface ExplorerScanResult {
  transactions: BlockchainTransaction[];
  total: number;
  scanned: number;
  treasuryAddress: string;
  source: string;
  error?: string;
}

interface VerificationResult {
  verified: boolean;
  type: "quiz" | "qa_question" | "qa_answer" | "unknown";
  demo?: boolean;
  message?: string;
  data?: {
    walletAddress?: string;
    courseId?: string;
    lessonId?: string;
    score?: number;
    maxScore?: number;
    contentHash?: string;
    timestamp?: number;
  };
  txExists?: boolean;
  txConfirmed?: boolean;
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

function TransactionCard({ tx }: { tx: BlockchainTransaction }) {
  const explorerUrl = `https://explorer.kaspa.org/txs/${tx.txHash}`;
  
  return (
    <div
      className="flex items-center justify-between rounded-lg border p-4 hover-elevate"
      data-testid={`card-tx-${tx.txHash.slice(0, 8)}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getTypeColor(tx.type)}`}>
          {getTypeIcon(tx.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a 
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm hover:text-primary hover:underline"
              data-testid={`link-tx-${tx.txHash.slice(0, 8)}`}
            >
              {truncateHash(tx.txHash)}
            </a>
            <Badge variant="secondary" className="text-xs">
              {getTypeName(tx.type)}
            </Badge>
            {tx.confirmed && (
              <Badge variant="outline" className="text-xs gap-1 text-green-600 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Confirmed
              </Badge>
            )}
            {tx.source === "blockchain" && (
              <Badge variant="outline" className="text-xs gap-1">
                <Blocks className="h-3 w-3" />
                On-chain
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {tx.walletAddress && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {truncateHash(tx.walletAddress)}
              </span>
            )}
            {(tx.courseTitle || tx.courseId) && (
              <span className="text-xs text-muted-foreground">
                Course: {tx.courseTitle || tx.courseId}
              </span>
            )}
            {tx.score !== undefined && tx.maxScore !== undefined && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Score: {tx.score}/{tx.maxScore} ({Math.round((tx.score / tx.maxScore) * 100)}%)
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(tx.timestamp)}
        </p>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export default function VerifyExplorerPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchHash, setSearchHash] = useState("");

  const { data: explorerData, isLoading: loadingExplorer, refetch: refetchExplorer, isFetching: fetchingExplorer } = useQuery<ExplorerScanResult>({
    queryKey: ["/api/explorer/scan"],
    refetchInterval: 30000,
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

  const isDemo = searchHash.startsWith("demo_");
  const explorerUrl = searchHash && !isDemo ? `https://explorer.kaspa.org/txs/${searchHash}` : null;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Globe className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold" data-testid="text-explorer-title">Kaspa Education Explorer</h1>
        <p className="mt-2 text-muted-foreground">
          Discover and verify on-chain educational achievements on the Kaspa blockchain
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
              placeholder="Enter transaction hash (64 hex characters)..."
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
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Transaction Hash</p>
                      <p className="font-mono text-sm break-all" data-testid="text-result-hash">{searchHash}</p>
                    </div>
                  </div>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline shrink-0"
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
                      {searchResult.verified ? "Verified KU Protocol Transaction" : "Not Verified"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchResult.message || (searchResult.verified ? "This educational achievement is authentic and recorded on the Kaspa blockchain." : "Could not verify this content.")}
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

                {searchResult.verified && searchResult.data && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="secondary" className={`gap-1.5 ${getTypeColor(searchResult.type)}`}>
                        {getTypeIcon(searchResult.type)}
                        {getTypeName(searchResult.type)}
                      </Badge>
                    </div>

                    {searchResult.data.courseId && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Course</span>
                        <span className="font-medium text-sm">{searchResult.data.courseId}</span>
                      </div>
                    )}

                    {searchResult.data.score !== undefined && searchResult.data.maxScore !== undefined && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Score</span>
                        <span className="font-medium">
                          {searchResult.data.score}/{searchResult.data.maxScore}
                          {" "}
                          <span className="text-muted-foreground">
                            ({Math.round((searchResult.data.score / searchResult.data.maxScore) * 100)}%)
                          </span>
                        </span>
                      </div>
                    )}

                    {searchResult.data.walletAddress && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Wallet</span>
                        <span className="font-mono text-xs">{truncateHash(searchResult.data.walletAddress)}</span>
                      </div>
                    )}

                    {searchResult.data.contentHash && (
                      <div className="col-span-2 rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Content Hash</span>
                        <p className="mt-1 font-mono text-xs break-all">{searchResult.data.contentHash}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Blocks className="h-5 w-5" />
                On-Chain KU Protocol Transactions
              </CardTitle>
              <CardDescription>
                Live blockchain data from the Kaspa network
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchExplorer()}
              disabled={fetchingExplorer}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${fetchingExplorer ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {explorerData?.treasuryAddress && (
            <div className="mb-4 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Scanning treasury:</span>
                <a 
                  href={`https://explorer.kaspa.org/addresses/${explorerData.treasuryAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs hover:text-primary hover:underline"
                >
                  {truncateHash(explorerData.treasuryAddress)}
                </a>
                <span className="text-xs">
                  ({explorerData.total} KU transactions found / {explorerData.scanned} scanned)
                </span>
              </div>
            </div>
          )}

          {loadingExplorer ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : explorerData?.error ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Error scanning blockchain</p>
              <p className="text-sm mt-1">{explorerData.error}</p>
            </div>
          ) : explorerData?.transactions && explorerData.transactions.length > 0 ? (
            <div className="space-y-3">
              {explorerData.transactions.map((tx) => (
                <TransactionCard key={tx.txHash} tx={tx} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No KU Protocol transactions found</p>
              <p className="text-sm mt-1">Complete a quiz or post in Q&A to create on-chain records</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4" />
          All data verified directly from the Kaspa mainnet blockchain
        </p>
        <p className="mt-1">
          KU Protocol format: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">ku:1:type:data</code>
        </p>
      </div>
    </div>
  );
}
