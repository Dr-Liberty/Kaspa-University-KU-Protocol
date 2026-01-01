import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { Certificate } from "@shared/schema";
import { Download, ExternalLink, Loader2, Sparkles, Wallet, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/wallet-context";
import { useQueryClient } from "@tanstack/react-query";
import { UserSignedMint } from "./user-signed-mint";
import { useWhitelistStatus } from "@/hooks/use-whitelist";

function generateCertificateSvgString(
  recipientAddress: string,
  courseName: string,
  score: number,
  issuedAt: Date
): string {
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
    <linearGradient id="verifyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#064e3b" />
      <stop offset="50%" style="stop-color:#065f46" />
      <stop offset="100%" style="stop-color:#064e3b" />
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
  
  <!-- DAG Network Background -->
  <g opacity="0.35">
    <circle cx="50" cy="70" r="5" fill="#10b981" />
    <circle cx="100" cy="45" r="4" fill="#10b981" />
    <circle cx="85" cy="95" r="3" fill="#10b981" />
    <circle cx="140" cy="75" r="4" fill="#10b981" />
    <circle cx="55" cy="130" r="3" fill="#10b981" />
    <line x1="50" y1="70" x2="100" y2="45" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="50" y1="70" x2="85" y2="95" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="100" y1="45" x2="140" y2="75" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="85" y1="95" x2="140" y2="75" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="85" y1="95" x2="55" y2="130" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    
    <circle cx="660" cy="55" r="4" fill="#10b981" />
    <circle cx="710" cy="40" r="5" fill="#10b981" />
    <circle cx="750" cy="70" r="3" fill="#10b981" />
    <circle cx="700" cy="95" r="4" fill="#10b981" />
    <circle cx="745" cy="120" r="3" fill="#10b981" />
    <line x1="660" y1="55" x2="710" y2="40" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="710" y1="40" x2="750" y2="70" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="660" y1="55" x2="700" y2="95" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="700" y1="95" x2="750" y2="70" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="700" y1="95" x2="745" y2="120" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    
    <circle cx="55" cy="450" r="4" fill="#10b981" />
    <circle cx="95" cy="470" r="3" fill="#10b981" />
    <circle cx="60" cy="500" r="4" fill="#10b981" />
    <circle cx="120" cy="495" r="3" fill="#10b981" />
    <line x1="55" y1="450" x2="95" y2="470" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="95" y1="470" x2="60" y2="500" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="95" y1="470" x2="120" y2="495" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    
    <circle cx="680" cy="455" r="3" fill="#10b981" />
    <circle cx="720" cy="440" r="4" fill="#10b981" />
    <circle cx="750" cy="470" r="4" fill="#10b981" />
    <circle cx="700" cy="490" r="3" fill="#10b981" />
    <line x1="680" y1="455" x2="720" y2="440" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="720" y1="440" x2="750" y2="470" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="680" y1="455" x2="700" y2="490" stroke="#10b981" stroke-width="1" opacity="0.6"/>
    <line x1="750" y1="470" x2="700" y2="490" stroke="#10b981" stroke-width="1" opacity="0.6"/>
  </g>
  
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#green)" stroke-width="2" rx="12"/>
  <rect x="28" y="28" width="744" height="544" fill="none" stroke="#1f2937" stroke-width="1" rx="10"/>
  
  <g transform="translate(400, 80)">
    <polygon points="0,-42 36,-21 36,21 0,42 -36,21 -36,-21" fill="#0a0a0a" stroke="url(#hexGreen)" stroke-width="2"/>
    <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="none" stroke="#10b981" stroke-width="1" opacity="0.5"/>
    <text x="0" y="10" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="26" fill="url(#green)" font-weight="bold">KU</text>
  </g>
  
  <text x="400" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#10b981" letter-spacing="4" font-weight="bold">KASPA UNIVERSITY</text>
  <text x="400" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#ffffff" font-weight="bold" filter="url(#glow)">Certificate of Completion</text>
  <line x1="150" y1="225" x2="650" y2="225" stroke="url(#green)" stroke-width="1" opacity="0.5"/>
  
  <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af">This certificate acknowledges completion of</text>
  <text x="400" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#ffffff" font-weight="bold">${courseName}</text>
  <text x="400" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">Kaspa University Course Collection</text>
  
  <rect x="60" y="430" width="680" height="120" rx="10" fill="url(#verifyGradient)" stroke="#10b981" stroke-width="1.5"/>
  
  <circle cx="100" cy="470" r="16" fill="#10b981"/>
  <path d="M92 470l6 6l12-14" stroke="#0a0a0a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  
  <text x="130" y="462" font-family="Arial, sans-serif" font-size="14" fill="#10b981" font-weight="bold">KU PROTOCOL VERIFIED</text>
  <text x="130" y="482" font-family="Arial, sans-serif" font-size="11" fill="#d1d5db">All quiz results are verified on-chain using the KU Protocol on Kaspa L1.</text>
  
  <line x1="80" y1="500" x2="720" y2="500" stroke="#10b981" stroke-width="0.5" opacity="0.3"/>
  
  <text x="400" y="522" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">Possession of this NFT does not guarantee the owner completed the courses or passed the quizzes.</text>
  <text x="400" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#10b981" font-weight="bold">Please check the KU Explorer on KaspaUniversity.com for verification</text>
  
  <text x="400" y="575" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#4b5563">KRC-721 NFT Certificate | Kaspa University Collection</text>
</svg>`;
}

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
        <linearGradient id="verifyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#064e3b" />
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
      
      <g opacity="0.35">
        <circle cx="50" cy="70" r="5" fill="#10b981" />
        <circle cx="100" cy="45" r="4" fill="#10b981" />
        <circle cx="85" cy="95" r="3" fill="#10b981" />
        <circle cx="140" cy="75" r="4" fill="#10b981" />
        <circle cx="55" cy="130" r="3" fill="#10b981" />
        <line x1="50" y1="70" x2="100" y2="45" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="50" y1="70" x2="85" y2="95" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="100" y1="45" x2="140" y2="75" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="85" y1="95" x2="140" y2="75" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="85" y1="95" x2="55" y2="130" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        
        <circle cx="660" cy="55" r="4" fill="#10b981" />
        <circle cx="710" cy="40" r="5" fill="#10b981" />
        <circle cx="750" cy="70" r="3" fill="#10b981" />
        <circle cx="700" cy="95" r="4" fill="#10b981" />
        <circle cx="745" cy="120" r="3" fill="#10b981" />
        <line x1="660" y1="55" x2="710" y2="40" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="710" y1="40" x2="750" y2="70" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="660" y1="55" x2="700" y2="95" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="700" y1="95" x2="750" y2="70" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="700" y1="95" x2="745" y2="120" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        
        <circle cx="55" cy="450" r="4" fill="#10b981" />
        <circle cx="95" cy="470" r="3" fill="#10b981" />
        <circle cx="60" cy="500" r="4" fill="#10b981" />
        <circle cx="120" cy="495" r="3" fill="#10b981" />
        <line x1="55" y1="450" x2="95" y2="470" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="95" y1="470" x2="60" y2="500" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="95" y1="470" x2="120" y2="495" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        
        <circle cx="680" cy="455" r="3" fill="#10b981" />
        <circle cx="720" cy="440" r="4" fill="#10b981" />
        <circle cx="750" cy="470" r="4" fill="#10b981" />
        <circle cx="700" cy="490" r="3" fill="#10b981" />
        <line x1="680" y1="455" x2="720" y2="440" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="720" y1="440" x2="750" y2="470" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="680" y1="455" x2="700" y2="490" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
        <line x1="750" y1="470" x2="700" y2="490" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
      </g>
      
      <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#green)" strokeWidth="2" rx="12"/>
      <rect x="28" y="28" width="744" height="544" fill="none" stroke="#1f2937" strokeWidth="1" rx="10"/>
      
      <g transform="translate(400, 80)">
        <polygon points="0,-42 36,-21 36,21 0,42 -36,21 -36,-21" fill="#0a0a0a" stroke="url(#hexGreen)" strokeWidth="2"/>
        <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.5"/>
        <text x="0" y="10" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontSize="26" fill="url(#green)" fontWeight="bold">KU</text>
      </g>
      
      <text x="400" y="150" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fill="#10b981" letterSpacing="4" fontWeight="bold">
        KASPA UNIVERSITY
      </text>
      
      <text x="400" y="200" textAnchor="middle" fontFamily="Georgia, serif" fontSize="38" fill="#ffffff" fontWeight="bold" filter="url(#glow)">
        Certificate of Completion
      </text>
      
      <line x1="150" y1="225" x2="650" y2="225" stroke="url(#green)" strokeWidth="1" opacity="0.5"/>
      
      <text x="400" y="280" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fill="#9ca3af">
        This certificate acknowledges completion of
      </text>
      
      <text x="400" y="340" textAnchor="middle" fontFamily="Georgia, serif" fontSize="32" fill="#ffffff" fontWeight="bold">
        {courseName}
      </text>
      
      <text x="400" y="390" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fill="#6b7280">
        Kaspa University Course Collection
      </text>
      
      <rect x="60" y="430" width="680" height="120" rx="10" fill="url(#verifyGradient)" stroke="#10b981" strokeWidth="1.5"/>
      
      <circle cx="100" cy="470" r="16" fill="#10b981"/>
      <path d="M92 470l6 6l12-14" stroke="#0a0a0a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      
      <text x="130" y="462" fontFamily="Arial, sans-serif" fontSize="14" fill="#10b981" fontWeight="bold">
        KU PROTOCOL VERIFIED
      </text>
      <text x="130" y="482" fontFamily="Arial, sans-serif" fontSize="11" fill="#d1d5db">
        All quiz results are verified on-chain using the KU Protocol on Kaspa L1.
      </text>
      
      <line x1="80" y1="500" x2="720" y2="500" stroke="#10b981" strokeWidth="0.5" opacity="0.3"/>
      
      <text x="400" y="522" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fill="#9ca3af">
        Possession of this NFT does not guarantee the owner completed the courses or passed the quizzes.
      </text>
      <text x="400" y="540" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fill="#10b981" fontWeight="bold">
        Please check the KU Explorer on KaspaUniversity.com for verification
      </text>
      
      <text x="400" y="575" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fill="#4b5563">
        KRC-721 NFT Certificate | Kaspa University Collection
      </text>
    </svg>
  );
}

interface CertificateCardProps {
  certificate: Certificate;
  showActions?: boolean;
}

export function CertificateCard({ certificate, showActions = true }: CertificateCardProps) {
  const { toast } = useToast();
  const { isDemoMode } = useWallet();
  const queryClient = useQueryClient();
  const [showMintDialog, setShowMintDialog] = useState(false);
  const { data: whitelistStatus } = useWhitelistStatus();

  const nftStatus = certificate.nftStatus || (certificate.nftTxHash ? "claimed" : "pending");
  const isPending = nftStatus === "pending";
  const isMinting = nftStatus === "minting";
  const isClaimed = nftStatus === "claimed";
  
  const isWhitelisted = whitelistStatus?.isWhitelisted;
  const mintPrice = isWhitelisted ? "~10.5 KAS" : "~20,000 KAS";

  useEffect(() => {
    if (isMinting) {
      setShowMintDialog(true);
    }
  }, [isMinting]);

  const handleDownload = () => {
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

  return (
    <Card
      className="group overflow-hidden border-border/50 transition-all hover:border-primary/30"
      data-testid={`card-certificate-${certificate.id}`}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-background via-card to-background">
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
          
          {isPending && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Mint NFT
              </Badge>
            </div>
          )}
          
          {isMinting && (
            <div className="absolute right-2 top-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-amber-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Minting...
              </Badge>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex flex-col gap-2 border-t border-border/50 p-3">
            {(isPending || isMinting) && (
              <div className="space-y-2">
                <Dialog open={showMintDialog} onOpenChange={setShowMintDialog}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full gap-2"
                      disabled={isDemoMode || (!isWhitelisted && !isDemoMode)}
                      data-testid={`button-mint-${certificate.id}`}
                    >
                      {isMinting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Resume Minting
                        </>
                      ) : isWhitelisted ? (
                        <>
                          <Wallet className="h-4 w-4" />
                          Mint NFT ({mintPrice})
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Whitelist Pending ({mintPrice})
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <UserSignedMint 
                      certificate={certificate}
                      onClose={() => setShowMintDialog(false)}
                      onSuccess={() => {
                        // Don't close the parent dialog - let the success dialog in UserSignedMint stay open
                        // The user will close it manually with the "Done" button
                        queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
                      }}
                    />
                  </DialogContent>
                </Dialog>
                {isDemoMode ? (
                  <p className="text-xs text-center text-muted-foreground">
                    Connect a real Kaspa wallet to mint your NFT
                  </p>
                ) : isMinting ? (
                  <p className="text-xs text-center text-amber-500">
                    Continue your in-progress mint
                  </p>
                ) : isWhitelisted ? (
                  <div className="flex items-center justify-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Whitelisted for discounted minting</span>
                  </div>
                ) : (
                  <p className="text-xs text-center text-muted-foreground">
                    Whitelist pending - this happens automatically after course completion
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
                    href={certificate.recipientAddress.startsWith("kaspatest:") 
                      ? `https://testnet-10.krc721.stream` 
                      : `https://explorer.kaspa.org/txs/${certificate.nftTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="text-xs">{certificate.recipientAddress.startsWith("kaspatest:") ? "View NFT" : "View on Chain"}</span>
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
