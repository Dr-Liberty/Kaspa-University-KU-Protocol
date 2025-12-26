import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Gift,
} from "lucide-react";
import { useMemo } from "react";

interface SecurityCheck {
  isFlagged: boolean;
  isVpn: boolean;
  vpnScore: number;
  flags: string[];
  rewardsBlocked: boolean;
}

export default function Dashboard() {
  const { wallet, connect, isConnecting, truncatedAddress } = useWallet();

  const { data: securityCheck } = useQuery<SecurityCheck>({
    queryKey: ["/api/security/check"],
    staleTime: 60000,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: !!wallet,
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    enabled: !!wallet,
  });

  const { data: certificates } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates"],
    enabled: !!wallet,
  });

  interface ClaimableReward extends CourseReward {
    courseTitle: string;
  }

  const { data: claimableRewards, isLoading: rewardsLoading } = useQuery<ClaimableReward[]>({
    queryKey: ["/api/rewards/claimable"],
    enabled: !!wallet,
  });

  const { toast } = useToast();
  const isDemoMode = wallet?.address?.startsWith("demo:");

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await apiRequest("POST", `/api/rewards/${rewardId}/claim`);
      return response.json();
    },
    onSuccess: (data) => {
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

  const progressMap = useMemo(() => {
    if (!progressList) return new Map<string, UserProgress>();
    return new Map(progressList.map((p) => [p.courseId, p]));
  }, [progressList]);

  const inProgressCourses = useMemo(() => {
    if (!courses || !progressList) return [];
    return courses
      .filter((c) => {
        const p = progressMap.get(c.id);
        if (!p) return false;
        const completed = p.completedLessons?.length ?? 0;
        return completed > 0 && completed < c.lessonCount;
      })
      .slice(0, 3);
  }, [courses, progressList, progressMap]);

  const completedCount = certificates?.length ?? 0;
  const totalKasEarned = user?.totalKasEarned ?? 0;

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
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="text-dashboard-title">
                Dashboard
              </h1>
              <p className="font-mono text-sm text-muted-foreground">
                {truncatedAddress}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total KAS Earned</p>
                <p className="text-2xl font-bold" data-testid="stat-kas-earned">
                  {totalKasEarned.toFixed(2)} <span className="text-lg text-primary">KAS</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-3">
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

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold" data-testid="stat-in-progress">
                  {inProgressCourses.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold" data-testid="stat-completion-rate">
                  {courses?.length
                    ? Math.round((completedCount / courses.length) * 100)
                    : 0}
                  %
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {claimableRewards && claimableRewards.length > 0 && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Pending Rewards</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {claimableRewards.length} available
                </Badge>
              </div>
              <CardDescription>
                Complete courses to unlock KAS rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {claimableRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4"
                  data-testid={`reward-item-${reward.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{reward.courseTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        Score: {reward.averageScore}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-primary">{reward.kasAmount.toFixed(2)} KAS</p>
                    </div>
                    <Button
                      onClick={() => claimMutation.mutate(reward.id)}
                      disabled={claimMutation.isPending || isDemoMode}
                      size="sm"
                      className="gap-2"
                      data-testid={`button-claim-${reward.id}`}
                    >
                      {claimMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Coins className="h-4 w-4" />
                      )}
                      Claim
                    </Button>
                  </div>
                </div>
              ))}
              {isDemoMode && (
                <p className="text-center text-sm text-muted-foreground">
                  Connect a real wallet to claim rewards
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Continue Learning</CardTitle>
              <Link href="/courses">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {inProgressCourses.length > 0 ? (
                inProgressCourses.map((course) => {
                  const p = progressMap.get(course.id);
                  const completed = p?.completedLessons?.length ?? 0;
                  const percent = Math.round((completed / course.lessonCount) * 100);
                  return (
                    <Link key={course.id} href={`/courses/${course.id}`}>
                      <div
                        className="group flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-4 transition-colors hover:border-primary/30 hover:bg-card"
                        data-testid={`progress-course-${course.id}`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium group-hover:text-primary">
                            {course.title}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                            <Progress value={percent} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground">
                              {percent}%
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No courses in progress
                  </p>
                  <Link href="/courses">
                    <Button variant="outline" size="sm" className="mt-4 gap-1">
                      Browse Courses
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Recent Certificates</CardTitle>
              <Link href="/certificates">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {certificates && certificates.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {certificates.slice(0, 2).map((cert) => (
                    <CertificateCard
                      key={cert.id}
                      certificate={cert}
                      showActions={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                  <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No certificates yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Complete a course to earn your first NFT certificate!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
