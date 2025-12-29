import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CertificateCard } from "@/components/certificate-card";
import type { Course, UserProgress, Certificate, User, CourseReward } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  Coins,
  Award,
  BookOpen,
  TrendingUp,
  ChevronRight,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
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
              <span className="hidden sm:inline">My Courses</span>
              <span className="sm:hidden">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-2" data-testid="tab-certificates">
              <Award className="h-4 w-4" />
              <span>Certificates</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2" data-testid="tab-rewards">
              <Coins className="h-4 w-4" />
              <span>Rewards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            {inProgressCourses.length > 0 && (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5 text-primary" />
                  In Progress
                </h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {inProgressCourses.map((course) => {
                    const p = progressMap.get(course.id);
                    const completed = p?.completedLessons?.length ?? 0;
                    const percent = Math.round((completed / course.lessonCount) * 100);
                    
                    return (
                      <Link key={course.id} href={`/courses/${course.id}`}>
                        <Card
                          className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg"
                          data-testid={`progress-course-${course.id}`}
                        >
                          <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
                            <div className="flex h-full items-center justify-center">
                              <BookOpen className="h-12 w-12 text-primary/50" />
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h4 className="truncate font-semibold group-hover:text-primary">
                              {course.title}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {course.description}
                            </p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {course.lessonCount * 5}m
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                {course.lessonCount} lessons
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Progress</span>
                              <span className="text-sm font-semibold text-primary">{percent}%</span>
                            </div>
                            <Progress value={percent} className="mt-1 h-2" />
                            <div className="mt-4 flex items-center justify-between">
                              <span className="font-bold text-primary">{course.kasReward || 0.2} KAS</span>
                              <Button size="sm" variant="outline">
                                Continue
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            
            {enrolledCourses.length > 0 ? (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="h-5 w-5 text-primary" />
                  All Enrolled Courses
                </h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {enrolledCourses.map((course) => {
                    const p = progressMap.get(course.id);
                    const completed = p?.completedLessons?.length ?? 0;
                    const percent = Math.round((completed / course.lessonCount) * 100);
                    const isComplete = completed >= course.lessonCount;
                    
                    return (
                      <Link key={course.id} href={`/courses/${course.id}`}>
                        <Card
                          className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg"
                          data-testid={`enrolled-course-${course.id}`}
                        >
                          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
                            <div className="flex h-full items-center justify-center">
                              {isComplete ? (
                                <CheckCircle2 className="h-12 w-12 text-primary" />
                              ) : (
                                <BookOpen className="h-12 w-12 text-primary/50" />
                              )}
                            </div>
                            {isComplete && (
                              <Badge className="absolute right-2 top-2 bg-primary text-primary-foreground">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h4 className="truncate font-semibold group-hover:text-primary">
                              {course.title}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {course.description}
                            </p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {course.lessonCount * 5}m
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                {course.lessonCount} lessons
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Progress</span>
                              <span className="text-sm font-semibold text-primary">{percent}%</span>
                            </div>
                            <Progress value={percent} className="mt-1 h-2" />
                            <div className="mt-4 flex items-center justify-between">
                              <span className="font-bold text-primary">{course.kasReward || 0.2} KAS</span>
                              <Button size="sm" variant={isComplete ? "secondary" : "outline"}>
                                {isComplete ? "Review" : "Continue"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">No courses enrolled</p>
                  <p className="text-sm text-muted-foreground">
                    Start learning to earn KAS rewards
                  </p>
                  <Link href="/courses">
                    <Button className="mt-4 gap-2">
                      Browse Courses
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            {certificates && certificates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {certificates.map((cert) => (
                  <CertificateCard
                    key={cert.id}
                    certificate={cert}
                    showActions={true}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">No certificates yet</p>
                  <p className="text-sm text-muted-foreground">
                    Complete a course to earn your first NFT certificate
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
        </Tabs>
      </div>
    </div>
  );
}
