import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Certificate } from "@shared/schema";
import { Download, ExternalLink, Copy, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/wallet-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CertificateCardProps {
  certificate: Certificate;
  showActions?: boolean;
}

interface NftFeeInfo {
  mintingFee: number;
  treasuryAddress: string;
  network: string;
}

export function CertificateCard({ certificate, showActions = true }: CertificateCardProps) {
  const { toast } = useToast();
  const { sendKaspa, isDemoMode } = useWallet();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const { data: feeInfo } = useQuery<NftFeeInfo>({
    queryKey: ["/api/nft/fee"],
    staleTime: 60000,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!feeInfo) throw new Error("Fee info not loaded");
      
      if (isDemoMode) {
        throw new Error("Connect a real Kaspa wallet to claim your NFT certificate");
      }
      
      toast({
        title: "Minting NFT Certificate",
        description: `Sending ${feeInfo.mintingFee} KAS to cover minting fees...`,
      });
      
      const paymentTxHash = await sendKaspa(feeInfo.treasuryAddress, feeInfo.mintingFee);
      
      toast({
        title: "Payment Sent",
        description: "Waiting for NFT to be minted...",
      });
      
      const response = await apiRequest("POST", `/api/certificates/${certificate.id}/claim`, {
        paymentTxHash,
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "NFT Claimed Successfully",
        description: "Your NFT certificate has been minted on the Kaspa blockchain!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Claim Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/certificates/${certificate.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied!", description: "Certificate link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (certificate.imageUrl) {
      const link = document.createElement("a");
      link.href = certificate.imageUrl;
      link.download = `kaspa-university-certificate-${certificate.verificationCode}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download started!", description: "Your certificate is being downloaded" });
    } else {
      toast({ title: "No image available", description: "Certificate image not yet generated", variant: "destructive" });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const nftStatus = certificate.nftStatus || (certificate.nftTxHash ? "claimed" : "pending");
  const isPending = nftStatus === "pending";
  const isMinting = nftStatus === "minting" || claimMutation.isPending;
  const isClaimed = nftStatus === "claimed";

  return (
    <Card
      className="group overflow-hidden border-border/50 transition-all hover:border-primary/30"
      data-testid={`card-certificate-${certificate.id}`}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-background via-card to-background">
          {certificate.imageUrl && showImage ? (
            <img
              src={certificate.imageUrl}
              alt={`Certificate for ${certificate.courseName}`}
              className="h-full w-full object-cover"
              onClick={() => setShowImage(false)}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center cursor-pointer"
              onClick={() => certificate.imageUrl && setShowImage(true)}
            >
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
                {certificate.score && (
                  <p className="font-medium">Score: {certificate.score}%</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <span className="text-sm font-semibold text-primary">
                  +{certificate.kasReward} KAS
                </span>
              </div>
              {certificate.imageUrl && (
                <p className="text-xs text-muted-foreground/60 mt-1">Click to view certificate</p>
              )}
            </div>
          )}

          {isClaimed && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                KRC-721 NFT
              </Badge>
            </div>
          )}
          
          {isPending && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Claim NFT
              </Badge>
            </div>
          )}
          
          {isMinting && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Minting...
              </Badge>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex flex-col gap-2 border-t border-border/50 p-3">
            {isPending && !isMinting && (
              <div className="space-y-2">
                <Button
                  className="w-full gap-2"
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending || !feeInfo || isDemoMode}
                  data-testid={`button-claim-${certificate.id}`}
                >
                  <Sparkles className="h-4 w-4" />
                  {isDemoMode 
                    ? "Connect Wallet to Claim" 
                    : `Claim NFT (${feeInfo?.mintingFee || "..."} KAS)`}
                </Button>
                {isDemoMode && (
                  <p className="text-xs text-center text-muted-foreground">
                    Connect a real Kaspa wallet to claim your NFT
                  </p>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2">
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
                  onClick={handleDownload}
                  data-testid={`button-download-${certificate.id}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-xs">Download</span>
                </Button>
              </div>
              {isClaimed && certificate.nftTxHash && (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
