import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Certificate } from "@shared/schema";
import { Download, ExternalLink, CheckCircle2, Loader2, Sparkles, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/wallet-context";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Convert IPFS URLs to gateway URLs for browser display
// Try multiple gateways for better reliability
function toGatewayUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("ipfs://")) {
    const cid = url.replace("ipfs://", "");
    // Use Cloudflare IPFS gateway for better reliability and CORS support
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  return url;
}

interface CertificateCardProps {
  certificate: Certificate;
  showActions?: boolean;
}

interface PrepareResponse {
  success: boolean;
  p2shAddress: string;
  amountSompi: string;
  amountKas: string;
  tokenId: number;
  expiresAt: number;
  imageUrl: string;
}

interface FinalizeResponse {
  success: boolean;
  commitTxHash?: string;
  revealTxHash: string;
  tokenId: number;
}

export function CertificateCard({ certificate, showActions = true }: CertificateCardProps) {
  const { toast } = useToast();
  const { isDemoMode } = useWallet();
  const queryClient = useQueryClient();
  const [mintStep, setMintStep] = useState<"idle" | "preparing" | "awaiting_payment" | "finalizing">("idle");
  const [pendingP2sh, setPendingP2sh] = useState<string | null>(null);
  const [pendingCommitTx, setPendingCommitTx] = useState<string | null>(null);

  // Get displayable image URL (convert IPFS to gateway)
  const displayImageUrl = toGatewayUrl(certificate.imageUrl);

  // Check for existing reservation when certificate is in "minting" status
  const { data: reservationData } = useQuery({
    queryKey: ["/api/nft/reservation", certificate.id],
    queryFn: async () => {
      const res = await fetch(`/api/nft/reservation/${certificate.id}`);
      return res.json();
    },
    enabled: certificate.nftStatus === "minting",
    staleTime: 30000,
  });

  // Restore pending state from server reservation
  useEffect(() => {
    if (reservationData?.hasReservation && !reservationData.isExpired) {
      setPendingP2sh(reservationData.p2shAddress);
      if (reservationData.commitTxHash) {
        setPendingCommitTx(reservationData.commitTxHash);
      }
      // If reservation exists and is paid, show retry state
      if (reservationData.isPaid) {
        setMintStep("finalizing");
      }
    }
  }, [reservationData]);

  // Non-custodial minting flow
  const mintMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        throw new Error("Connect a real Kaspa wallet to mint your NFT certificate");
      }
      
      // Check if KasWare is available
      if (typeof window === "undefined" || !window.kasware) {
        throw new Error("KasWare wallet not found. Please install the KasWare extension.");
      }

      // Step 1: Prepare the mint (get P2SH address)
      setMintStep("preparing");
      toast({
        title: "Preparing NFT Mint",
        description: "Generating inscription script...",
      });
      
      const prepareRes = await apiRequest("POST", `/api/nft/prepare/${certificate.id}`);
      const prepareData = await prepareRes.json();
      
      if (!prepareData.success) {
        const errorMsg = prepareData.message || prepareData.error || "Failed to prepare mint";
        console.error("[NFT] Prepare failed:", errorMsg);
        throw new Error(errorMsg);
      }

      setPendingP2sh(prepareData.p2shAddress);
      
      // Check if this is an already-paid reservation (user is retrying after page refresh)
      if (prepareData.existingReservation && prepareData.isPaid) {
        console.log("[NFT] Found already-paid reservation, skipping to finalize");
        toast({
          title: "Payment Already Confirmed",
          description: "Completing your NFT mint...",
        });
        setMintStep("finalizing");
        // Skip payment step - go directly to finalize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const finalizeRes = await apiRequest("POST", `/api/nft/finalize/${certificate.id}`, {
          p2shAddress: prepareData.p2shAddress,
        });
        
        const finalizeData = await finalizeRes.json();
        if (!finalizeData.success) {
          throw new Error(finalizeData.message || "Failed to finalize mint");
        }
        return finalizeData as FinalizeResponse;
      }
      
      // Step 2: User pays directly via KasWare
      setMintStep("awaiting_payment");
      toast({
        title: "Confirm Payment",
        description: `Send ${prepareData.amountKas} KAS to mint your NFT certificate`,
      });

      // Use KasWare's sendKaspa to send funds directly to P2SH
      // This is fully non-custodial - funds go directly from user to P2SH
      let commitTxHash: string;
      try {
        commitTxHash = await window.kasware.sendKaspa(
          prepareData.p2shAddress,
          parseInt(prepareData.amountSompi) // Amount in sompi
        );
        // Store for potential retry
        setPendingCommitTx(commitTxHash);
      } catch (walletError: any) {
        throw new Error(walletError.message || "Transaction rejected by wallet");
      }

      toast({
        title: "Payment Sent",
        description: "Waiting for confirmation...",
      });

      // Step 3: Wait a moment for transaction to propagate, then finalize
      setMintStep("finalizing");
      
      // Give the network a few seconds to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Finalize the mint (server submits reveal transaction)
      const finalizeRes = await apiRequest("POST", `/api/nft/finalize/${certificate.id}`, {
        p2shAddress: prepareData.p2shAddress,
        commitTxHash,
      });
      
      const finalizeData = await finalizeRes.json();
      console.log("[NFT] Finalize response:", finalizeData);
      
      if (!finalizeData.success) {
        // Always store P2SH for potential retry since user already paid
        setPendingP2sh(prepareData.p2shAddress);
        
        // Check if payment is still pending (202) - allow retry
        if (finalizeRes.status === 202 && finalizeData.retry) {
          throw new Error("Transaction still pending. Please wait a moment and try again.");
        }
        // Check if reservation expired
        if (finalizeRes.status === 410) {
          setPendingP2sh(null); // Clear P2SH on expiry
          throw new Error("Mint reservation expired. Please start the process again.");
        }
        // For other errors, keep P2SH for retry
        const errorMsg = finalizeData.message || finalizeData.error || "Failed to finalize mint";
        console.error("[NFT] Finalize failed:", errorMsg);
        throw new Error(errorMsg);
      }

      return finalizeData as FinalizeResponse;
    },
    onSuccess: () => {
      setMintStep("idle");
      setPendingP2sh(null);
      setPendingCommitTx(null);
      toast({
        title: "NFT Minted Successfully",
        description: "Your certificate is now on the Kaspa blockchain!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
    },
    onError: (error: Error) => {
      // Check if we have a pending P2SH - if so, allow retry
      const hasP2sh = pendingP2sh !== null;
      const isRetryable = error.message.includes("pending") || error.message.includes("wait") || hasP2sh;
      
      if (!isRetryable) {
        setMintStep("idle");
        setPendingP2sh(null);
        setPendingCommitTx(null);
      } else {
        // Keep in finalizing state for retry since user already paid
        setMintStep("finalizing");
      }
      toast({
        title: isRetryable ? "Finalization Failed - Retry Available" : "Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Retry finalize if we have a pending P2SH
  const retryFinalize = async () => {
    if (!pendingP2sh) return;
    
    setMintStep("finalizing");
    try {
      const finalizeRes = await apiRequest("POST", `/api/nft/finalize/${certificate.id}`, {
        p2shAddress: pendingP2sh,
        commitTxHash: pendingCommitTx, // Include commitTxHash for verification
      });
      
      // Defensive JSON parsing
      let finalizeData;
      try {
        finalizeData = await finalizeRes.json();
      } catch {
        finalizeData = { success: false, message: "Invalid response from server" };
      }
      
      if (finalizeData.success && finalizeData.revealTxHash) {
        setMintStep("idle");
        setPendingP2sh(null);
        setPendingCommitTx(null);
        toast({
          title: "NFT Minted Successfully",
          description: "Your certificate is now on the Kaspa blockchain!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      } else if (finalizeRes.status === 202) {
        toast({
          title: "Still Processing",
          description: "Transaction not yet confirmed. Please try again shortly.",
        });
      } else if (finalizeRes.status === 410) {
        // Reservation expired, reset state and allow user to start over
        setMintStep("idle");
        setPendingP2sh(null);
        setPendingCommitTx(null);
        toast({
          title: "Reservation Expired",
          description: "Please start the minting process again.",
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      } else {
        setMintStep("idle");
        setPendingP2sh(null);
        setPendingCommitTx(null);
        toast({
          title: "Minting Failed",
          description: finalizeData.message || "Please try minting again.",
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      }
    } catch (error: any) {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (displayImageUrl) {
      const link = document.createElement("a");
      link.href = displayImageUrl;
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
  const isMinting = nftStatus === "minting" || mintMutation.isPending;
  const isClaimed = nftStatus === "claimed";

  const getMintButtonText = () => {
    if (isDemoMode) return "Connect Wallet to Mint";
    if (mintStep === "preparing") return "Preparing...";
    if (mintStep === "awaiting_payment") return "Confirm in Wallet...";
    if (mintStep === "finalizing") return "Finalizing...";
    return "Mint NFT (10.5 KAS)";
  };

  return (
    <Card
      className="group overflow-hidden border-border/50 transition-all hover:border-primary/30"
      data-testid={`card-certificate-${certificate.id}`}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-background via-card to-background">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={`Certificate for ${certificate.courseName}`}
              className="h-full w-full object-contain"
              onError={(e) => {
                console.error("[CertImage] Failed to load:", displayImageUrl);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
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
                {certificate.score && (
                  <p className="font-medium">Score: {certificate.score}%</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <span className="text-sm font-semibold text-primary">
                  +{certificate.kasReward} KAS
                </span>
              </div>
            </div>
          )}
          
          {displayImageUrl && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3 pt-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm leading-tight truncate">{certificate.courseName}</h3>
                  <p className="text-xs text-muted-foreground">{formatDate(certificate.issuedAt)}</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0 text-xs">
                  +{certificate.kasReward} KAS
                </Badge>
              </div>
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
          
          {isPending && !isMinting && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Mint NFT
              </Badge>
            </div>
          )}
          
          {isMinting && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                {mintStep === "awaiting_payment" ? "Awaiting Payment..." : "Minting..."}
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
                  onClick={() => mintMutation.mutate()}
                  disabled={mintMutation.isPending || isDemoMode}
                  data-testid={`button-mint-${certificate.id}`}
                >
                  {mintMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {getMintButtonText()}
                </Button>
                {isDemoMode ? (
                  <p className="text-xs text-center text-muted-foreground">
                    Connect a real Kaspa wallet to mint your NFT
                  </p>
                ) : (
                  <p className="text-xs text-center text-muted-foreground">
                    You pay the mint fee directly from your wallet
                  </p>
                )}
              </div>
            )}
            
            {isMinting && (
              <div className="space-y-2">
                {mintStep === "finalizing" && pendingP2sh ? (
                  <>
                    <Button 
                      className="w-full gap-2"
                      onClick={retryFinalize}
                      disabled={mintMutation.isPending}
                      data-testid={`button-retry-${certificate.id}`}
                    >
                      {mintMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wallet className="h-4 w-4" />
                      )}
                      Retry Finalize
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Your payment was sent. Click to retry finalization.
                    </p>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setMintStep("idle");
                        setPendingP2sh(null);
                        setPendingCommitTx(null);
                        queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
                      }}
                      data-testid={`button-cancel-${certificate.id}`}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="w-full gap-2" disabled>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {getMintButtonText()}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      {mintStep === "awaiting_payment" 
                        ? "Please confirm the transaction in your KasWare wallet"
                        : "Processing your NFT mint..."}
                    </p>
                  </>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
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
              {isClaimed && certificate.nftTxHash && certificate.nftTxHash.length > 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-primary"
                  asChild
                  data-testid={`button-view-${certificate.id}`}
                >
                  <a
                    href={`https://kaspa.stream/tx/${certificate.nftTxHash}`}
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

