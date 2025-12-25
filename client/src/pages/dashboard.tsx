import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CertificateCard } from "@/components/certificate-card";
import type { Course, UserProgress, Certificate, User } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
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
