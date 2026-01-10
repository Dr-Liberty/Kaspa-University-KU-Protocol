import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CertificateCard } from "@/components/certificate-card";
import { BlockDAGProgress } from "@/components/blockdag-progress";
import type { Certificate, Course } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { Award, Wallet, ArrowRight, GraduationCap, ScrollText } from "lucide-react";

export default function Certificates() {
  const { wallet, connect, isConnecting } = useWallet();

  const { data: certificates, isLoading: certificatesLoading } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates"],
    enabled: !!wallet,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const isLoading = certificatesLoading || coursesLoading;

  if (!wallet) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Your Learning Journey</h1>
          <p className="mt-2 text-muted-foreground">
            Connect your wallet to track your progress and earn your diploma NFT.
          </p>
          <Button
            onClick={connect}
            disabled={isConnecting}
            className="mt-6 gap-2"
            size="lg"
            data-testid="button-connect-certificates"
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
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="text-certificates-title">
              Diploma Journey
            </h1>
            <p className="text-muted-foreground">
              Complete all courses to earn your KRC-721 diploma NFT
            </p>
          </div>
        </div>

        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="progress" className="gap-2" data-testid="tab-progress">
              <GraduationCap className="h-4 w-4" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-2" data-testid="tab-certificates">
              <ScrollText className="h-4 w-4" />
              Quiz Proofs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-[600px] w-full rounded-lg" />
              </div>
            ) : courses && courses.length > 0 ? (
              <BlockDAGProgress 
                courses={courses} 
                certificates={certificates || []} 
                walletConnected={!!wallet}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <Award className="mx-auto h-16 w-16 text-muted-foreground/30" />
                <h3 className="mt-4 text-xl font-semibold">No Courses Available</h3>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  Check back later for available courses.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-6">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-border/50">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="flex gap-2 border-t border-border/50 p-3">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : certificates && certificates.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <Award className="mx-auto h-16 w-16 text-muted-foreground/30" />
                <h3 className="mt-4 text-xl font-semibold">No Quiz Proofs Yet</h3>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  Complete course quizzes to earn quiz proofs. Each proof counts toward your diploma.
                </p>
                <Link href="/courses">
                  <Button className="mt-6 gap-2" data-testid="button-browse-courses">
                    Browse Courses
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
