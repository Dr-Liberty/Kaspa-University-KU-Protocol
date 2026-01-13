import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useWallet } from "@/lib/wallet-context";
import { useWhitelistStatus } from "@/hooks/use-whitelist";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Clock, Wallet, XCircle, ExternalLink, Award, FileCheck } from "lucide-react";
import type { Certificate } from "@shared/schema";

interface UserSignedMintProps {
  certificate: Certificate;
  onClose?: () => void;
  onSuccess?: (tokenId: number, txHash: string) => void;
}

type MintStep = "idle" | "reserving" | "preview" | "signing" | "confirming" | "success" | "error";

interface ReservationData {
  reservationId: string;
  tokenId: number;
  inscriptionJson: string;
  expiresAt: number;
  courseId: string;
  courseName: string;
  royaltyTo?: string;
  royaltyFeeSompi?: string;
}

function getExplorerTxUrl(txHash: string): string {
  const isTestnet = import.meta.env.VITE_KASPA_NETWORK === "testnet-10";
  return isTestnet
    ? `https://explorer-tn10.kaspa.org/txs/${txHash}`
    : `https://explorer.kaspa.org/txs/${txHash}`;
}

function getKUExplorerUrl(courseId: string): string {
  return `/explorer?course=${courseId}`;
}

export function UserSignedMint({ certificate, onClose, onSuccess }: UserSignedMintProps) {
  const { wallet, isDemoMode, signKRC721Mint } = useWallet();
  const { data: whitelistStatus } = useWhitelistStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<MintStep>("idle");
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [expiryCountdown, setExpiryCountdown] = useState<number>(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const { data: existingReservation, isLoading: loadingExisting } = useQuery({
    queryKey: ["/api/nft/active-reservation", certificate.id],
    queryFn: async () => {
      if (!wallet?.address) return null;
      const res = await fetch(`/api/nft/active-reservation/${certificate.id}`, {
        headers: {
          "x-wallet-address": wallet.address,
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.hasReservation && !data.isExpired) {
        return data as ReservationData & { hasReservation: true; isExpired: false };
      }
      return null;
    },
    enabled: certificate.nftStatus === "minting" && !!wallet?.address,
    staleTime: 5000,
  });

  useEffect(() => {
    if (existingReservation && step === "idle" && !loadingExisting) {
      setReservation({
        reservationId: existingReservation.reservationId,
        tokenId: existingReservation.tokenId,
        inscriptionJson: existingReservation.inscriptionJson,
        expiresAt: existingReservation.expiresAt,
        courseId: existingReservation.courseId,
        courseName: existingReservation.courseName,
      });
    }
  }, [existingReservation, step, loadingExisting]);

  useEffect(() => {
    if (!reservation?.expiresAt) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((reservation.expiresAt - Date.now()) / 1000));
      setExpiryCountdown(remaining);
      
      if (remaining <= 0 && step !== "success") {
        setError("Reservation expired. Please try again.");
        setStep("error");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [reservation?.expiresAt, step]);

  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        throw new Error("NFT minting requires a real Kaspa wallet");
      }

      setStep("reserving");
      setError(null);

      const response = await apiRequest("POST", `/api/nft/reserve/${certificate.id}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to reserve token");
      }

      return data as ReservationData;
    },
    onSuccess: async (data) => {
      setReservation(data);
      // Show preview step so user can see what they're approving
      setStep("preview");
    },
    onError: (err: any) => {
      console.error("[UserSignedMint] Reserve failed:", err);
      setError(err.message || "Failed to reserve token");
      setStep("error");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ reservationId, mintTxHash }: { reservationId: string; mintTxHash: string }) => {
      const response = await apiRequest("POST", `/api/nft/confirm/${reservationId}`, {
        mintTxHash,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm mint");
      }

      return data;
    },
    onSuccess: (data) => {
      setStep("success");
      setShowSuccessDialog(true);

      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      if (onSuccess) {
        onSuccess(data.tokenId, data.mintTxHash);
      }
    },
    onError: (err: any) => {
      console.error("[UserSignedMint] Confirm failed:", err);
      setError(err.message || "Failed to confirm mint");
      setStep("error");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await apiRequest("POST", `/api/nft/cancel/${reservationId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel reservation");
      }

      return data;
    },
    onSuccess: () => {
      setStep("idle");
      setReservation(null);
      setError(null);
      
      toast({
        title: "Reservation Cancelled",
        description: "You can try minting again when ready.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nft/active-reservation", certificate.id] });
    },
    onError: (err: any) => {
      console.error("[UserSignedMint] Cancel failed:", err);
      toast({
        title: "Cancel Failed",
        description: err.message || "Failed to cancel reservation",
        variant: "destructive",
      });
    },
  });

  const handleStartMint = () => {
    reserveMutation.mutate();
  };

  const handleCancel = () => {
    if (reservation?.reservationId) {
      cancelMutation.mutate(reservation.reservationId);
    }
  };

  const handleProceedToSign = async () => {
    if (!reservation) return;
    
    setStep("signing");
    
    try {
      await apiRequest("POST", `/api/nft/signing/${reservation.reservationId}`);
      
      const mintFeeKas = whitelistStatus?.totalMintCostKas 
        ? parseFloat(whitelistStatus.totalMintCostKas) 
        : 20;
      console.log("[UserSignedMint] Minting with fee:", mintFeeKas, "KAS");
      console.log("[UserSignedMint] Royalty:", reservation.royaltyTo, reservation.royaltyFeeSompi, "sompi");
      
      const mintResult = await signKRC721Mint(reservation.inscriptionJson, {
        royaltyTo: reservation.royaltyTo,
        royaltyFeeSompi: reservation.royaltyFeeSompi,
      });
      const txHash = mintResult.revealTxId;
      setMintTxHash(txHash);
      
      setStep("confirming");
      confirmMutation.mutate({ reservationId: reservation.reservationId, mintTxHash: txHash });
    } catch (err: any) {
      console.error("[UserSignedMint] Signing failed:", err);
      
      try {
        await apiRequest("POST", `/api/nft/cancel/${reservation.reservationId}`);
        setReservation(null);
        queryClient.invalidateQueries({ queryKey: ["/api/nft/active-reservation", certificate.id], exact: true });
        queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      } catch (cancelErr) {
        console.error("[UserSignedMint] Cancel on failure also failed:", cancelErr);
      }
      
      setError(err.message || "Failed to sign mint transaction");
      setStep("error");
    }
  };

  const handleResumeSigning = async () => {
    // For existing reservations, go to preview first
    if (reservation) {
      setStep("preview");
    }
  };

  const handleRetry = () => {
    setStep("idle");
    setError(null);
    setReservation(null);
    setMintTxHash(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isDemoMode) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Demo Mode</p>
              <p className="text-sm text-muted-foreground">
                Connect a real Kaspa wallet to mint your NFT certificate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (certificate.nftStatus === "claimed") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <div>
              <p className="font-medium">NFT Already Minted</p>
              <p className="text-sm text-muted-foreground">
                Your certificate NFT has been claimed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Mint NFT Certificate
        </CardTitle>
        <CardDescription>
          Sign the mint transaction with your wallet to claim your certificate as an NFT
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "idle" && !loadingExisting && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Course</span>
                <span className="text-sm font-medium">{certificate.courseName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <Badge variant="secondary">{certificate.score || 100}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mint Fee</span>
                <span className="text-sm font-medium text-primary">~20.5 KAS</span>
              </div>
              {reservation && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reserved Token</span>
                  <Badge variant="outline">Random ID (assigned on-chain)</Badge>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              {reservation 
                ? "You have an active reservation. Click below to continue signing the mint transaction."
                : "You will sign the mint transaction directly with your wallet. The NFT will be minted to your address and you will appear as the minter on-chain."}
            </p>

            {reservation ? (
              <div className="space-y-2">
                <Button 
                  onClick={handleResumeSigning}
                  className="w-full"
                  data-testid="button-resume-user-signed-mint"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Continue Signing
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="w-full"
                  data-testid="button-cancel-reservation"
                >
                  {cancelMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Reservation"
                  )}
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleStartMint}
                disabled={reserveMutation.isPending}
                className="w-full"
                data-testid="button-start-user-signed-mint"
              >
                {reserveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Mint Certificate NFT
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        
        {step === "idle" && loadingExisting && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking for existing reservation...</p>
          </div>
        )}

        {step === "reserving" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reserving your token...</p>
          </div>
        )}

        {step === "preview" && reservation && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <FileCheck className="h-5 w-5" />
              <span className="font-medium">Transaction Preview</span>
            </div>
            
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm text-muted-foreground mb-3">
                Review the transaction details before approving in your wallet:
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operation</span>
                  <Badge variant="secondary">KRC-721 Mint</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collection</span>
                  <span className="font-mono">KUDIPLOMA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token ID</span>
                  <span className="text-muted-foreground italic">Random (assigned on-chain)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-mono text-xs truncate max-w-[180px]" title={wallet?.address}>
                    {wallet?.address?.slice(0, 12)}...{wallet?.address?.slice(-6)}
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                <div className="text-muted-foreground font-medium">This will submit 2 transactions:</div>
                <div className="pl-2 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs font-medium">1</span>
                    <div>
                      <span className="font-medium">Commit</span>
                      <span className="text-muted-foreground"> - Locks inscription data</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs font-medium">2</span>
                    <div>
                      <span className="font-medium">Reveal</span>
                      <span className="text-muted-foreground"> - Mints the NFT to your wallet</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    <strong>Note:</strong> KasWare will show "Batch Transfer KRC20 Token" - 
                    this is the NFT mint (both transactions bundled for safety). 
                    Separate prompts are not available in the current wallet version.
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Estimated Total Cost</span>
                  <span className="text-lg font-bold text-primary">
                    ~{whitelistStatus?.totalMintCostKas || "20"} KAS
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Includes royalty fee + network fees
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Reservation expires in {formatTime(expiryCountdown)}</span>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleProceedToSign}
                className="w-full"
                data-testid="button-proceed-to-sign"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Approve in Wallet
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="w-full"
                data-testid="button-cancel-preview"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "signing" && reservation && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Confirm in your wallet</p>
                <p className="text-sm text-muted-foreground">
                  Sign the mint transaction (token ID assigned randomly)
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Reservation expires in {formatTime(expiryCountdown)}</span>
            </div>

            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="w-full"
              data-testid="button-cancel-mint"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Minting
                </>
              )}
            </Button>
          </div>
        )}

        {step === "confirming" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Confirming your mint...</p>
              <p className="text-sm text-muted-foreground">
                Transaction submitted, waiting for confirmation
              </p>
            </div>
          </div>
        )}

        {step === "success" && reservation && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <div className="text-center">
              <p className="font-medium">NFT Minted Successfully!</p>
              <p className="text-sm text-muted-foreground">
                Your KUDIPLOMA is now in your wallet
              </p>
            </div>
            <Button onClick={() => setShowSuccessDialog(true)} data-testid="button-view-nft-details">
              View NFT Details
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium">Mint Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={handleRetry} data-testid="button-retry-mint">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              NFT Minted Successfully
            </DialogTitle>
            <DialogDescription className="text-center">
              Your certificate is now on the Kaspa blockchain
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {certificate.imageUrl && (
              <div className="flex justify-center">
                <div className="relative overflow-hidden rounded-lg border bg-muted/30 p-2">
                  <img 
                    src={certificate.imageUrl.startsWith("ipfs://") 
                      ? `https://gateway.pinata.cloud/ipfs/${certificate.imageUrl.replace("ipfs://", "")}`
                      : certificate.imageUrl
                    }
                    alt={`${certificate.courseName} Certificate`}
                    className="max-h-48 w-auto rounded object-contain"
                    data-testid="img-nft-certificate"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Course</span>
                <span className="text-sm font-medium text-right">{certificate.courseName}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Score</span>
                <Badge variant="secondary">{certificate.score || 100}%</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Token ID</span>
                <Badge variant="outline">KUDIPLOMA</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-sm font-medium">
                  {new Date(certificate.issuedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Recipient</span>
                <span className="text-xs font-mono truncate max-w-[180px]" title={certificate.recipientAddress}>
                  {certificate.recipientAddress.slice(0, 16)}...{certificate.recipientAddress.slice(-8)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {mintTxHash && (
                <a
                  href={getExplorerTxUrl(mintTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors hover-elevate"
                  data-testid="link-mint-tx"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Mint Transaction
                </a>
              )}
              <a
                href={getKUExplorerUrl(certificate.courseId)}
                className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors hover-elevate"
                data-testid="link-quiz-proof"
              >
                <FileCheck className="h-4 w-4" />
                Verify Quiz Proof on KU Explorer
              </a>
            </div>

            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                if (onClose) onClose();
              }} 
              className="w-full"
              data-testid="button-close-success-dialog"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
