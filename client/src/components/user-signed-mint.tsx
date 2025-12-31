import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Clock, Wallet, XCircle } from "lucide-react";
import type { Certificate } from "@shared/schema";

interface UserSignedMintProps {
  certificate: Certificate;
  onClose?: () => void;
  onSuccess?: (tokenId: number, txHash: string) => void;
}

type MintStep = "idle" | "reserving" | "signing" | "confirming" | "success" | "error";

interface ReservationData {
  reservationId: string;
  tokenId: number;
  inscriptionJson: string;
  expiresAt: number;
  courseId: string;
  courseName: string;
}

export function UserSignedMint({ certificate, onClose, onSuccess }: UserSignedMintProps) {
  const { wallet, isDemoMode, signKRC721Mint } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<MintStep>("idle");
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [expiryCountdown, setExpiryCountdown] = useState<number>(0);

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
      setStep("signing");
      
      try {
        await apiRequest("POST", `/api/nft/signing/${data.reservationId}`);
        
        const txHash = await signKRC721Mint(data.inscriptionJson);
        setMintTxHash(txHash);
        
        setStep("confirming");
        confirmMutation.mutate({ reservationId: data.reservationId, mintTxHash: txHash });
      } catch (err: any) {
        console.error("[UserSignedMint] Signing failed:", err);
        setError(err.message || "Failed to sign mint transaction");
        setStep("error");
        
        await apiRequest("POST", `/api/nft/cancel/${data.reservationId}`).catch(() => {});
      }
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
      
      toast({
        title: "NFT Minted Successfully",
        description: `Token #${data.tokenId} has been minted to your wallet!`,
      });

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

  const handleResumeSigning = async () => {
    if (!reservation) return;
    
    setStep("signing");
    
    try {
      await apiRequest("POST", `/api/nft/signing/${reservation.reservationId}`);
      
      const txHash = await signKRC721Mint(reservation.inscriptionJson);
      setMintTxHash(txHash);
      
      setStep("confirming");
      confirmMutation.mutate({ reservationId: reservation.reservationId, mintTxHash: txHash });
    } catch (err: any) {
      console.error("[UserSignedMint] Resume signing failed:", err);
      
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
                <span className="text-sm font-medium text-primary">~10 KAS</span>
              </div>
              {reservation && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reserved Token</span>
                  <Badge variant="outline">#{reservation.tokenId}</Badge>
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

        {step === "signing" && reservation && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Confirm in your wallet</p>
                <p className="text-sm text-muted-foreground">
                  Sign the mint transaction for Token #{reservation.tokenId}
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
                Token #{reservation.tokenId} is now in your wallet
              </p>
            </div>
            {mintTxHash && (
              <a
                href={`https://explorer.kaspa.org/txs/${mintTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
                data-testid="link-mint-tx"
              >
                View transaction on explorer
              </a>
            )}
            {onClose && (
              <Button variant="outline" onClick={onClose} className="mt-2">
                Close
              </Button>
            )}
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
    </Card>
  );
}
