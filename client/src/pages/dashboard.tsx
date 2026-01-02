import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockDAGProgress } from "@/components/blockdag-progress";
import type { Course, UserProgress, Certificate, User, CourseReward } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  Coins,
  Award,
  BookOpen,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Shield,
  FileCheck,
  Link2,
} from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";

interface SecurityCheck {
  isFlagged: boolean;
  isVpn: boolean;
  vpnScore: number;
  flags: string[];
  rewardsBlocked: boolean;
}

interface EnrichedReward extends CourseReward {
  courseTitle: string;
}

interface EnrichedQuizResult {
  id: string;
  lessonId: string;
  userId: string;
  score: number;
  passed: boolean;
  completedAt: Date;
  txHash?: string;
  txStatus: "none" | "pending" | "confirmed" | "failed";
  courseId?: string;
  courseTitle: string;
  lessonTitle: string;
}

export default function Dashboard() {
  const { wallet, connect, isConnecting, truncatedAddress, isDemoMode } = useWallet();
  const [activeTab, setActiveTab] = useState("courses");
  const isAuthenticated = !!wallet || isDemoMode;

  const { data: securityCheck } = useQuery<SecurityCheck>({
    queryKey: ["/api/security/check"],
    staleTime: 60000,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: isAuthenticated,
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    enabled: isAuthenticated,
  });

  const { data: certificates } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates"],
    enabled: isAuthenticated,
  });

  const { data: allRewards } = useQuery<EnrichedReward[]>({
    queryKey: ["/api/rewards"],
    enabled: isAuthenticated,
  });

  const { data: quizResults } = useQuery<EnrichedQuizResult[]>({
    queryKey: ["/api/quiz-results"],
    enabled: isAuthenticated,
  });

  const { toast } = useToast();

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await apiRequest("POST", `/api/rewards/${rewardId}/claim`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/claimable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Reward Claimed!",
        description: `${data.amount} KAS has been sent to your wallet.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await apiRequest("POST", `/api/rewards/${rewardId}/verify`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      if (data.verified) {
        toast({
          title: "Transaction Confirmed",
          description: data.confirmed ? "Your transaction is confirmed on L1." : "Transaction found, awaiting confirmation.",
        });
      } else {
        toast({
          title: "Verification Pending",
          description: data.error || "Transaction not yet visible on L1.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Verification Failed",
        description: "Could not verify transaction status",
        variant: "destructive",
      });
    },
  });

  // Auto-verify rewards in "confirming" status every 3 seconds
  const confirmingRewards = useMemo(() => {
    return allRewards?.filter((r) => r.status === "confirming") || [];
  }, [allRewards]);
  
  const autoVerifyRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing interval
    if (autoVerifyRef.current) {
      clearInterval(autoVerifyRef.current);
      autoVerifyRef.current = null;
    }
    
    // If there are confirming rewards, start polling
    if (confirmingRewards.length > 0 && !isDemoMode) {
      console.log(`[Dashboard] Starting auto-verify for ${confirmingRewards.length} confirming rewards`);
      
      autoVerifyRef.current = setInterval(async () => {
        // Verify all confirming rewards in parallel
        for (const reward of confirmingRewards) {
          try {
            // Use apiRequest to include auth token
            const response = await apiRequest("POST", `/api/rewards/${reward.id}/verify`);
            const data = await response.json();
            if (data.verified || data.confirmed) {
              // Refresh rewards list when verification succeeds
              queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
              queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            }
          } catch (err) {
            // Silent fail for auto-verify - user can manually verify if needed
          }
        }
      }, 3000);
    }
    
    return () => {
      if (autoVerifyRef.current) {
        clearInterval(autoVerifyRef.current);
        autoVerifyRef.current = null;
      }
    };
  }, [confirmingRewards.length, isDemoMode, wallet?.address]);

  const progressMap = useMemo(() => {
    if (!progressList) return new Map<string, UserProgress>();
    return new Map(progressList.map((p) => [p.courseId, p]));
  }, [progressList]);

  const enrolledCourses = useMemo(() => {
    if (!courses || !progressList) return [];
    return courses.filter((c) => progressMap.has(c.id));
  }, [courses, progressList, progressMap]);

  const inProgressCourses = useMemo(() => {
    if (!courses || !progressList) return [];
    return courses.filter((c) => {
      const p = progressMap.get(c.id);
      if (!p) return false;
      const completed = p.completedLessons?.length ?? 0;
      return completed > 0 && completed < c.lessonCount;
    });
  }, [courses, progressList, progressMap]);

  const completedCount = certificates?.length ?? 0;
  const totalKasEarned = user?.totalKasEarned ?? 0;

  const pendingRewards = useMemo(() => {
    return allRewards?.filter((r) => r.status === "pending") || [];
  }, [allRewards]);

  const claimedRewards = useMemo(() => {
    return allRewards?.filter((r) => r.status === "claimed") || [];
  }, [allRewards]);

  const totalPending = pendingRewards.reduce((sum, r) => sum + r.kasAmount, 0);
  const totalClaimed = claimedRewards.reduce((sum, r) => sum + r.kasAmount, 0);

  if (!wallet) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <LayoutDashboard className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Your Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Connect your wallet to view your learning progress, earned rewards,
            and NFT certificates.
          </p>
          <Button
            onClick={connect}
            disabled={isConnecting}
            className="mt-6 gap-2"
            size="lg"
            data-testid="button-connect-dashboard"
          >
            <Wallet className="h-5 w-5" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      {securityCheck?.isFlagged && (
        <div 
          className="sticky top-16 z-50 flex items-center justify-center gap-3 bg-destructive px-4 py-3 text-destructive-foreground"
          data-testid="banner-vpn-warning"
        >
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
            <span className="font-semibold">VPN/Proxy Detected</span>
            <span className="hidden sm:inline">-</span>
            <span>
              Rewards are disabled while using VPN or proxy services. Please disable your VPN to earn KAS rewards.
            </span>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="text-dashboard-title">
            Student Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your learning progress and KAS rewards
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Courses Enrolled</p>
                <p className="text-2xl font-bold" data-testid="stat-enrolled">
                  {enrolledCourses.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inProgressCourses.length} in progress
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold" data-testid="stat-completed">
                  {completedCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Certificates</p>
                <p className="text-2xl font-bold" data-testid="stat-certificates">
                  {completedCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KAS Earned</p>
                <p className="text-2xl font-bold text-primary" data-testid="stat-kas-earned">
                  {totalKasEarned.toFixed(2)}
                </p>
                {totalPending > 0 && (
                  <p className="text-xs text-primary">
                    +{totalPending.toFixed(2)} pending
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="courses" className="gap-2" data-testid="tab-courses">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Diploma Progress</span>
              <span className="sm:hidden">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2" data-testid="tab-rewards">
              <Coins className="h-4 w-4" />
              <span>Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="verify" className="gap-2" data-testid="tab-verify">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">KU Explorer</span>
              <span className="sm:hidden">Explorer</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            {courses && courses.length > 0 ? (
              <BlockDAGProgress 
                courses={courses} 
                certificates={certificates || []} 
                walletConnected={!!wallet}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">Loading courses...</p>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we load the curriculum
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Coins className="h-5 w-5 text-primary" />
                Reward History
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {totalPending.toFixed(2)} pending
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {totalClaimed.toFixed(2)} claimed
                </span>
              </div>
            </div>

            {allRewards && allRewards.length > 0 ? (
              <div className="space-y-3">
                {allRewards
                  .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                  .map((reward) => (
                    <Card key={reward.id} data-testid={`reward-item-${reward.id}`}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">Course Completion</p>
                            <Badge
                              variant={reward.status === "claimed" ? "default" : "secondary"}
                              className={
                                reward.status === "claimed" 
                                  ? "bg-primary/20 text-primary" 
                                  : reward.status === "confirming" 
                                    ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                    : ""
                              }
                            >
                              {reward.status === "claimed" 
                                ? "confirmed" 
                                : reward.status === "confirming" 
                                  ? "confirming" 
                                  : reward.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {reward.courseTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reward.completedAt).toLocaleDateString()}
                            {reward.txHash && !reward.txHash.startsWith("demo_") && !reward.txHash.startsWith("pending_") && (
                              <a
                                href={`https://explorer.kaspa.org/txs/${reward.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {reward.txHash.slice(0, 12)}...
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              +{reward.kasAmount.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">KAS</p>
                          </div>
                          {reward.status === "pending" && (
                            <Button
                              onClick={() => claimMutation.mutate(reward.id)}
                              disabled={claimMutation.isPending || isDemoMode}
                              size="sm"
                              className="gap-1"
                              data-testid={`button-claim-${reward.id}`}
                            >
                              {claimMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Coins className="h-4 w-4" />
                              )}
                              Claim
                            </Button>
                          )}
                          {reward.status === "confirming" && (
                            <Button
                              onClick={() => verifyMutation.mutate(reward.id)}
                              disabled={verifyMutation.isPending}
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              data-testid={`button-verify-${reward.id}`}
                            >
                              {verifyMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Verify
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Coins className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">No rewards yet</p>
                  <p className="text-sm text-muted-foreground">
                    Complete courses to earn KAS rewards
                  </p>
                  <Link href="/courses">
                    <Button className="mt-4 gap-2">
                      Start Learning
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {isDemoMode && allRewards && allRewards.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Connect a real wallet to claim rewards
              </p>
            )}
          </TabsContent>

          <TabsContent value="verify" className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Shield className="h-5 w-5 text-primary" />
                  On-Chain Verification
                </h2>
                <p className="text-sm text-muted-foreground">
                  All your learning achievements are recorded on Kaspa L1
                </p>
              </div>

              {/* Quiz Completions with KU Protocol data */}
              {quizResults && quizResults.filter(r => r.txHash && !r.txHash.startsWith("demo_")).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileCheck className="h-4 w-4 text-primary" />
                      Quiz Proofs (KU Protocol)
                    </CardTitle>
                    <CardDescription>
                      Your quiz completions stored on-chain with KU Protocol data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quizResults
                      .filter(r => r.txHash && !r.txHash.startsWith("demo_"))
                      .map((result) => (
                        <div
                          key={result.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                          data-testid={`verify-quiz-${result.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {result.courseTitle}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {result.lessonTitle}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>Score: {result.score}%</span>
                              <Badge 
                                variant="outline" 
                                className={result.txStatus === "confirmed" ? "border-green-500/50 text-green-600 dark:text-green-400" : ""}
                              >
                                {result.txStatus === "confirmed" ? "Verified" : result.txStatus}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://explorer.kaspa.org/txs/${result.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                              data-testid={`link-tx-${result.id}`}
                            >
                              <span className="font-mono">{result.txHash?.slice(0, 16)}...</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <Link href={`/verify/${result.txHash}`}>
                              <Button size="sm" variant="ghost" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Decode
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Reward Payment Transactions */}
              {allRewards && allRewards.filter(r => r.txHash && !r.txHash.startsWith("demo_") && !r.txHash.startsWith("pending_")).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Coins className="h-4 w-4 text-primary" />
                      Reward Payments
                    </CardTitle>
                    <CardDescription>
                      Your KAS reward transactions on Kaspa L1
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allRewards
                      .filter(r => r.txHash && !r.txHash.startsWith("demo_") && !r.txHash.startsWith("pending_"))
                      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                      .map((reward) => (
                        <div
                          key={reward.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                          data-testid={`verify-reward-${reward.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {reward.courseTitle}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-primary">+{reward.kasAmount.toFixed(2)} KAS</span>
                              <Badge 
                                variant="outline" 
                                className={reward.status === "claimed" ? "border-green-500/50 text-green-600 dark:text-green-400" : ""}
                              >
                                {reward.status === "claimed" ? "Confirmed" : reward.status}
                              </Badge>
                            </div>
                          </div>
                          <a
                            href={`https://explorer.kaspa.org/txs/${reward.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                            data-testid={`link-reward-tx-${reward.id}`}
                          >
                            <span className="font-mono">{reward.txHash?.slice(0, 16)}...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Empty state */}
              {(!quizResults || quizResults.filter(r => r.txHash && !r.txHash.startsWith("demo_")).length === 0) &&
               (!allRewards || allRewards.filter(r => r.txHash && !r.txHash.startsWith("demo_") && !r.txHash.startsWith("pending_")).length === 0) && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Shield className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg font-medium">No on-chain records yet</p>
                    <p className="text-sm text-muted-foreground">
                      Complete quizzes and claim rewards to create verifiable on-chain records
                    </p>
                    <Link href="/courses">
                      <Button className="mt-4 gap-2">
                        Start Learning
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Link to KU Protocol Explorer */}
              <div className="flex justify-center pt-4">
                <Link href="/verify">
                  <Button variant="outline" className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Open KU Protocol Explorer
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
