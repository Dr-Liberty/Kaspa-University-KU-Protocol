import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  ArrowLeft,
  FileQuestion,
  MessageSquare,
  Award,
  AlertTriangle
} from "lucide-react";

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

export default function VerifyPage() {
  const params = useParams<{ txHash: string }>();
  const txHash = params.txHash || "";

  const { data: result, isLoading, error } = useQuery<VerificationResult>({
    queryKey: ["/api/verify", txHash],
    enabled: !!txHash,
  });

  const isDemo = txHash.startsWith("demo_");
  const explorerUrl = isDemo ? null : `https://explorer.kaspa.org/txs/${txHash}`;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link href="/">
        <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-home">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      <Card className="border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">On-Chain Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-1 text-xs text-muted-foreground">Transaction Hash</p>
            <p className="break-all font-mono text-sm" data-testid="text-tx-hash">{txHash}</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Verification Failed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Could not verify this transaction. It may not exist or may not contain KU Protocol data.
                </p>
              </div>
            </div>
          ) : result ? (
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
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
