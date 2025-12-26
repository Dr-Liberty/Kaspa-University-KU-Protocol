import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseReward, User } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Coins,
  Award,
  Wallet,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Gift,
  ArrowRight,
} from "lucide-react";

interface ClaimableReward extends CourseReward {
  courseTitle: string;
}

export default function Rewards() {
  const { wallet, connect, isConnecting, truncatedAddress, isDemoMode } = useWallet();
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: !!wallet,
  });

  const { data: claimableRewards, isLoading } = useQuery<ClaimableReward[]>({
    queryKey: ["/api/rewards/claimable"],
    enabled: !!wallet,
    refetchInterval: 5000,
  });

  const claimMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const response = await fetch(`/api/rewards/${resultId}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": wallet?.address || "",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Claim failed");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/claimable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Reward Claimed!",
        description: `${data.amount} KAS sent to your wallet`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    },
  });

  const totalClaimable = claimableRewards?.reduce((sum, r) => sum + r.kasAmount, 0) ?? 0;

  if (!wallet) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Claim Your Rewards</h1>
          <p className="mt-2 text-muted-foreground">
            Connect your wallet to view and claim your earned KAS rewards.
          </p>
          <Button
            onClick={connect}
            disabled={isConnecting}
            className="mt-6 gap-2"
            size="lg"
            data-testid="button-connect-rewards"
          >
            <Wallet className="h-5 w-5" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-rewards-title">Claim Rewards</h1>
        <p className="mt-2 text-muted-foreground">
          Claim your earned KAS rewards from completed quizzes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Claimable</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="text-total-claimable">
              {totalClaimable.toFixed(4)} KAS
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to claim
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-earned">
              {(user?.totalKasEarned ?? 0).toFixed(4)} KAS
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {isDemoMode && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <Wallet className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">Demo Mode</p>
              <p className="text-sm text-muted-foreground">
                Connect a real Kaspa wallet to claim your rewards
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending Rewards</CardTitle>
          <CardDescription>
            Click claim to receive your KAS rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : claimableRewards && claimableRewards.length > 0 ? (
            <div className="space-y-4">
              {claimableRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                  data-testid={`reward-item-${reward.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{reward.courseTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        Average Score: {reward.averageScore}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-primary">{reward.kasAmount.toFixed(4)} KAS</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reward.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => claimMutation.mutate(reward.id)}
                      disabled={claimMutation.isPending || isDemoMode}
                      className="gap-2"
                      data-testid={`button-claim-${reward.id}`}
                    >
                      {claimMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Coins className="h-4 w-4" />
                          Claim
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">All Caught Up!</h3>
              <p className="mt-2 text-muted-foreground">
                No pending rewards to claim. Complete more quizzes to earn KAS.
              </p>
              <Link href="/courses">
                <Button className="mt-4 gap-2" variant="outline">
                  Browse Courses
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
