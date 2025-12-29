import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  ArrowLeft,
  FileQuestion,
  MessageSquare,
  Award,
  AlertTriangle,
  Search,
  Coins,
  Users,
  Activity,
  Blocks,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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
  };
}

interface BlockchainStats {
  kuProtocol: {
    totalQuizProofs: number;
    totalRewards: number;
    totalCertificates: number;
    totalUsers: number;
    totalKasDistributed: number;
    pendingQuizProofs: number;
  };
  dailyActivity: Array<{
    date: string;
    quizProofs: number;
    rewards: number;
  }>;
  network: {
    blockCount?: number;
    networkName?: string;
  };
  lastUpdated: number;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "quiz":
      return <Award className="h-5 w-5" />;
    case "qa_question":
      return <FileQuestion className="h-5 w-5" />;
    case "qa_answer":
      return <MessageSquare className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
}

function getTypeName(type: string) {
  switch (type) {
    case "quiz":
      return "Quiz Result";
    case "qa_question":
      return "Q&A Question";
    case "qa_answer":
      return "Q&A Answer";
    default:
      return "Unknown";
  }
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = "primary"
}: { 
  icon: typeof Shield; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-500",
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
    yellow: "bg-yellow-500/10 text-yellow-500",
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  const params = useParams<{ txHash: string }>();
  const txHash = params.txHash || "";
  const [searchTxHash, setSearchTxHash] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<BlockchainStats>({
    queryKey: ["/api/blockchain-stats"],
    refetchInterval: 30000,
  });

  const { data: result, isLoading, error } = useQuery<VerificationResult>({
    queryKey: ["/api/verify", txHash],
    enabled: !!txHash,
  });

  const isDemo = txHash.startsWith("demo_");
  const explorerUrl = isDemo ? null : `https://explorer.kaspa.org/txs/${txHash}`;

  const handleSearch = () => {
    if (searchTxHash.trim()) {
      window.location.href = `/verify/${searchTxHash.trim()}`;
    }
  };

  const chartData = stats?.dailyActivity || [];
  const totalDailyTx = chartData.reduce((sum, d) => sum + d.quizProofs + d.rewards, 0);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Link href="/">
        <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-home">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      {/* Live KU Protocol Stats Section */}
      <div className="mb-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold">KU Protocol Explorer</h1>
          <p className="text-muted-foreground">
            Real-time blockchain data from Kaspa University
          </p>
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Shield}
              label="On-Chain Quiz Proofs"
              value={stats.kuProtocol.totalQuizProofs}
              subValue={stats.kuProtocol.pendingQuizProofs > 0 ? `${stats.kuProtocol.pendingQuizProofs} pending` : undefined}
              color="primary"
            />
            <StatCard
              icon={Coins}
              label="KAS Distributed"
              value={`${stats.kuProtocol.totalKasDistributed.toFixed(2)} KAS`}
              subValue={`${stats.kuProtocol.totalRewards} reward transactions`}
              color="green"
            />
            <StatCard
              icon={Award}
              label="NFT Certificates"
              value={stats.kuProtocol.totalCertificates}
              color="purple"
            />
            <StatCard
              icon={Users}
              label="Active Learners"
              value={stats.kuProtocol.totalUsers}
              color="blue"
            />
          </div>
        ) : null}

        {/* Network Info & Daily Activity Chart */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Daily Activity Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                7-Day KU Protocol Activity
              </CardTitle>
              <CardDescription>
                Quiz proofs and reward transactions per day
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : chartData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={2}>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="quizProofs" name="Quiz Proofs" stackId="a" radius={[0, 0, 0, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`quiz-${index}`} fill="hsl(var(--primary))" />
                        ))}
                      </Bar>
                      <Bar dataKey="rewards" name="Rewards" stackId="a" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`reward-${index}`} fill="hsl(142 76% 36%)" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  <p>No activity data yet</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-primary" />
                  <span>Quiz Proofs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-green-500" />
                  <span>Reward Payments</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {totalDailyTx} total this week
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Network Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Blocks className="h-4 w-4 text-primary" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : stats?.network ? (
                <>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Network</p>
                    <p className="font-medium">{stats.network.networkName || "kaspa-mainnet"}</p>
                  </div>
                  {stats.network.blockCount && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Block Height</p>
                      <p className="font-mono font-medium">{stats.network.blockCount.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Connected</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Network info unavailable</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verify Transaction Section */}
      <Card className="border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Transaction Lookup</CardTitle>
          <CardDescription>
            Enter a transaction hash to decode KU Protocol data on-chain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Input */}
          {!txHash && (
            <div className="flex gap-2">
              <Input
                placeholder="Enter transaction hash..."
                value={searchTxHash}
                onChange={(e) => setSearchTxHash(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="font-mono text-sm"
                data-testid="input-tx-search"
              />
              <Button onClick={handleSearch} className="gap-2" data-testid="button-search-tx">
                <Search className="h-4 w-4" />
                Verify
              </Button>
            </div>
          )}

          {/* Transaction Hash Display */}
          {txHash && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Transaction Hash</p>
              <p className="break-all font-mono text-sm" data-testid="text-tx-hash">{txHash}</p>
            </div>
          )}

          {/* Loading State */}
          {txHash && isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {/* Error State */}
          {txHash && error && (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Verification Failed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Could not verify this transaction. It may not exist or may not contain KU Protocol data.
                </p>
              </div>
            </div>
          )}

          {/* Result Display */}
          {txHash && result && (
            <div className="space-y-4">
              <div 
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  result.verified 
                    ? "border-green-500/20 bg-green-500/10" 
                    : "border-destructive/20 bg-destructive/10"
                }`}
              >
                {result.verified ? (
                  <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 shrink-0 text-destructive" />
                )}
                <div>
                  <p className={`font-medium ${result.verified ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {result.verified ? "Verified" : "Not Verified"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.message || (result.verified ? "This content is authentic and recorded on the Kaspa blockchain." : "Could not verify this content.")}
                  </p>
                </div>
              </div>

              {result.demo && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">
                    This is a demo transaction and not actually recorded on the blockchain.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="gap-1.5">
                    {getTypeIcon(result.type)}
                    {getTypeName(result.type)}
                  </Badge>
                </div>

                {result.decoded && (
                  <>
                    {result.decoded.courseId && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Course ID</span>
                        <span className="font-mono text-sm">{result.decoded.courseId}</span>
                      </div>
                    )}
                    {result.decoded.score !== undefined && result.decoded.maxScore !== undefined && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Score</span>
                        <span className="font-medium">
                          {result.decoded.score} / {result.decoded.maxScore}
                          {" "}
                          ({Math.round((result.decoded.score / result.decoded.maxScore) * 100)}%)
                        </span>
                      </div>
                    )}
                    {result.decoded.lessonId && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Lesson ID</span>
                        <span className="font-mono text-sm">{result.decoded.lessonId}</span>
                      </div>
                    )}
                    {result.decoded.contentHash && (
                      <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">Content Hash</span>
                        <span className="break-all font-mono text-xs">{result.decoded.contentHash}</span>
                      </div>
                    )}
                    {result.decoded.questionTxId && (
                      <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">References Question</span>
                        <a 
                          href={`/verify/${result.decoded.questionTxId}`}
                          className="break-all font-mono text-xs text-primary hover:underline"
                        >
                          {result.decoded.questionTxId}
                        </a>
                      </div>
                    )}
                  </>
                )}

                {result.payload && (
                  <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
                    <span className="text-sm text-muted-foreground">Raw Payload</span>
                    <span className="break-all font-mono text-xs">{result.payload}</span>
                  </div>
                )}
              </div>

              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary transition-colors hover:bg-primary/10"
                  data-testid="link-explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Kaspa Explorer
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
