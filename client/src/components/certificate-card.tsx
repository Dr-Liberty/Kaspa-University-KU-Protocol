import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Certificate } from "@shared/schema";
import { Download, ExternalLink, CheckCircle2, Loader2, Sparkles, Wallet, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/wallet-context";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";


// Generate certificate SVG string for download
function generateCertificateSvgString(
  recipientAddress: string,
  courseName: string,
  score: number,
  issuedAt: Date
): string {
  const dateStr = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shortAddress = `${recipientAddress.slice(0, 12)}...${recipientAddress.slice(-8)}`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0a" />
      <stop offset="50%" style="stop-color:#0f0f0f" />
      <stop offset="100%" style="stop-color:#0a0a0a" />
    </linearGradient>
    <linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#10b981" />
      <stop offset="100%" style="stop-color:#059669" />
    </linearGradient>
    <linearGradient id="hexGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981" />
      <stop offset="100%" style="stop-color:#047857" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <g opacity="0.4">
    <circle cx="60" cy="80" r="4" fill="#10b981" />
    <circle cx="120" cy="50" r="3" fill="#10b981" />
    <circle cx="680" cy="60" r="4" fill="#10b981" />
    <circle cx="740" cy="90" r="3" fill="#10b981" />
    <circle cx="70" cy="480" r="4" fill="#10b981" />
    <circle cx="690" cy="470" r="4" fill="#10b981" />
    <line x1="60" y1="80" x2="120" y2="50" stroke="#10b981" stroke-width="1" opacity="0.5"/>
    <line x1="680" y1="60" x2="740" y2="90" stroke="#10b981" stroke-width="1" opacity="0.5"/>
  </g>
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#green)" stroke-width="2" rx="12"/>
  <rect x="28" y="28" width="744" height="544" fill="none" stroke="#1f2937" stroke-width="1" rx="10"/>
  <g transform="translate(400, 70)">
    <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="#0a0a0a" stroke="url(#hexGreen)" stroke-width="2"/>
    <polygon points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14" fill="none" stroke="#10b981" stroke-width="1" opacity="0.5"/>
    <text x="0" y="8" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" fill="url(#green)" font-weight="bold">KU</text>
  </g>
  <text x="400" y="135" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#10b981" letter-spacing="4" font-weight="bold">KASPA UNIVERSITY</text>
  <text x="400" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#ffffff" font-weight="bold" filter="url(#glow)">Certificate of Completion</text>
  <line x1="150" y1="205" x2="650" y2="205" stroke="url(#green)" stroke-width="1" opacity="0.5"/>
  <text x="400" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">This is to certify that</text>
  <text x="400" y="290" text-anchor="middle" font-family="monospace" font-size="18" fill="#10b981" font-weight="bold">${shortAddress}</text>
  <text x="400" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">has successfully completed the course</text>
  <text x="400" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#ffffff" font-weight="bold">${courseName}</text>
  <rect x="340" y="405" width="120" height="40" rx="20" fill="#0a0a0a" stroke="url(#green)" stroke-width="1"/>
  <text x="400" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#10b981" font-weight="bold">${score}% Score</text>
  <text x="400" y="485" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">Awarded on ${dateStr}</text>
  <rect x="100" y="500" width="600" height="50" rx="8" fill="#0d1f17" stroke="#10b981" stroke-width="1" opacity="0.8"/>
  <circle cx="130" cy="525" r="10" fill="#10b981"/>
  <path d="M126 525l3 3l5-6" stroke="#0a0a0a" stroke-width="2" fill="none"/>
  <text x="150" y="520" font-family="Arial, sans-serif" font-size="11" fill="#10b981" font-weight="bold">VERIFIED ON-CHAIN</text>
  <text x="150" y="535" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">Quiz completion proof embedded via KU Protocol on Kaspa L1</text>
  <text x="560" y="527" font-family="monospace" font-size="9" fill="#6b7280">Verify: kaspa.university</text>
  <text x="400" y="570" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#4b5563">KRC-721 NFT Certificate | Kaspa University Collection</text>
</svg>`;
}

// Inline SVG Certificate Component matching the KU design
function CertificateSVG({ 
  recipientAddress, 
  courseName, 
  score, 
  issuedAt 
}: { 
  recipientAddress: string; 
  courseName: string; 
  score: number; 
  issuedAt: Date;
}) {
  const dateStr = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shortAddress = `${recipientAddress.slice(0, 12)}...${recipientAddress.slice(-8)}`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" className="w-full h-full">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a0a0a" />
          <stop offset="50%" stopColor="#0f0f0f" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="hexGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background */}
      <rect width="800" height="600" fill="url(#bg)"/>
      
      {/* DAG Nodes - simplified */}
      <g opacity="0.4">
        <circle cx="60" cy="80" r="4" fill="#10b981" />
        <circle cx="120" cy="50" r="3" fill="#10b981" />
        <circle cx="680" cy="60" r="4" fill="#10b981" />
        <circle cx="740" cy="90" r="3" fill="#10b981" />
        <circle cx="70" cy="480" r="4" fill="#10b981" />
        <circle cx="690" cy="470" r="4" fill="#10b981" />
        <line x1="60" y1="80" x2="120" y2="50" stroke="#10b981" strokeWidth="1" opacity="0.5"/>
        <line x1="680" y1="60" x2="740" y2="90" stroke="#10b981" strokeWidth="1" opacity="0.5"/>
      </g>
      
      {/* Border */}
      <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#green)" strokeWidth="2" rx="12"/>
      <rect x="28" y="28" width="744" height="544" fill="none" stroke="#1f2937" strokeWidth="1" rx="10"/>
      
      {/* KU Hexagon Logo */}
      <g transform="translate(400, 70)">
        <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="#0a0a0a" stroke="url(#hexGreen)" strokeWidth="2"/>
        <polygon points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.5"/>
        <text x="0" y="8" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontSize="22" fill="url(#green)" fontWeight="bold">KU</text>
      </g>
      
      {/* Header */}
      <text x="400" y="135" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fill="#10b981" letterSpacing="4" fontWeight="bold">
        KASPA UNIVERSITY
      </text>
      
      {/* Certificate Title */}
      <text x="400" y="180" textAnchor="middle" fontFamily="Georgia, serif" fontSize="36" fill="#ffffff" fontWeight="bold" filter="url(#glow)">
        Certificate of Completion
      </text>
      
      {/* Divider */}
      <line x1="150" y1="205" x2="650" y2="205" stroke="url(#green)" strokeWidth="1" opacity="0.5"/>
      
      {/* This certifies */}
      <text x="400" y="250" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fill="#9ca3af">
        This is to certify that
      </text>
      
      {/* Recipient Address */}
      <text x="400" y="290" textAnchor="middle" fontFamily="monospace" fontSize="18" fill="#10b981" fontWeight="bold">
        {shortAddress}
      </text>
      
      {/* Has completed */}
      <text x="400" y="330" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fill="#9ca3af">
        has successfully completed the course
      </text>
      
      {/* Course Name */}
      <text x="400" y="380" textAnchor="middle" fontFamily="Georgia, serif" fontSize="28" fill="#ffffff" fontWeight="bold">
        {courseName}
      </text>
      
      {/* Score Badge */}
      <rect x="340" y="405" width="120" height="40" rx="20" fill="#0a0a0a" stroke="url(#green)" strokeWidth="1"/>
      <text x="400" y="432" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fill="#10b981" fontWeight="bold">
        {score}% Score
      </text>
      
      {/* Date */}
      <text x="400" y="485" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fill="#6b7280">
        Awarded on {dateStr}
      </text>
      
      {/* Verification Badge */}
      <rect x="100" y="500" width="600" height="50" rx="8" fill="#0d1f17" stroke="#10b981" strokeWidth="1" opacity="0.8"/>
      <circle cx="130" cy="525" r="10" fill="#10b981"/>
      <path d="M126 525l3 3l5-6" stroke="#0a0a0a" strokeWidth="2" fill="none"/>
      <text x="150" y="520" fontFamily="Arial, sans-serif" fontSize="11" fill="#10b981" fontWeight="bold">
        VERIFIED ON-CHAIN
      </text>
      <text x="150" y="535" fontFamily="Arial, sans-serif" fontSize="10" fill="#9ca3af">
        Quiz completion proof embedded via KU Protocol on Kaspa L1
      </text>
      <text x="560" y="527" fontFamily="monospace" fontSize="9" fill="#6b7280">
        Verify: kaspa.university
      </text>
      
      {/* Footer */}
      <text x="400" y="570" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fill="#4b5563">
        KRC-721 NFT Certificate | Kaspa University Collection
      </text>
    </svg>
  );
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
    // Generate SVG on demand for download
    const svgString = generateCertificateSvgString(
      certificate.recipientAddress,
      certificate.courseName,
      certificate.score || 100,
      certificate.issuedAt
    );
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kaspa-university-certificate-${certificate.verificationCode}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Download started!", description: "Your certificate is being downloaded" });
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
  // Only show as actively minting if this specific card's mutation is pending OR we have local state
  const isActivelyMinting = mintMutation.isPending || mintStep !== "idle";
  // Database shows minting but no active local state = needs retry
  const needsRetry = nftStatus === "minting" && !isActivelyMinting;
  const isMinting = isActivelyMinting;
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
          {/* Always render inline SVG certificate for reliable display */}
          <CertificateSVG
            recipientAddress={certificate.recipientAddress}
            courseName={certificate.courseName}
            score={certificate.score || 100}
            issuedAt={certificate.issuedAt}
          />

          {isClaimed && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                KRC-721 NFT
              </Badge>
            </div>
          )}
          
          {isPending && !isMinting && !needsRetry && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Mint NFT
              </Badge>
            </div>
          )}
          
          {needsRetry && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-amber-500">
                <AlertCircle className="h-3 w-3" />
                Retry Mint
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
            {isPending && !isMinting && !needsRetry && (
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
            
            {needsRetry && (
              <div className="space-y-2">
                <Button 
                  className="w-full gap-2"
                  onClick={() => mintMutation.mutate()}
                  disabled={mintMutation.isPending || isDemoMode}
                  data-testid={`button-retry-mint-${certificate.id}`}
                >
                  {mintMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Retry Mint
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Previous mint attempt incomplete. Click to try again.
                </p>
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

