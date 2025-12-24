import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Certificate } from "@shared/schema";
import { Download, ExternalLink, Copy, Share2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CertificateCardProps {
  certificate: Certificate;
  showActions?: boolean;
}

export function CertificateCard({ certificate, showActions = true }: CertificateCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/certificates/${certificate.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied!", description: "Certificate link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card
      className="group overflow-hidden border-border/50 transition-all hover:border-primary/30"
      data-testid={`card-certificate-${certificate.id}`}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-background via-card to-background">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Certificate of Completion
              </Badge>
              <h3 className="mt-2 font-semibold leading-tight">{certificate.courseName}</h3>
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>Issued on {formatDate(certificate.issuedAt)}</p>
              <p className="font-mono text-[10px]">
                {certificate.verificationCode}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <span className="text-sm font-semibold text-primary">
                +{certificate.kasReward} KAS
              </span>
            </div>
          </div>

          {certificate.nftTxHash && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                NFT Minted
              </Badge>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex items-center justify-between gap-2 border-t border-border/50 p-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={handleCopyLink}
                data-testid={`button-copy-${certificate.id}`}
              >
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="text-xs">Copy Link</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                data-testid={`button-download-${certificate.id}`}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="text-xs">Download</span>
              </Button>
            </div>
            {certificate.nftTxHash && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-primary"
                asChild
                data-testid={`button-view-${certificate.id}`}
              >
                <a
                  href={`https://explorer.kaspa.org/txs/${certificate.nftTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="text-xs">View on Chain</span>
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
