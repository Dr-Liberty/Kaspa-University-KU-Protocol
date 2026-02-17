import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWallet } from "@/lib/wallet-context";
import { Wallet, ExternalLink, AlertCircle, Smartphone } from "lucide-react";
import kaswareLogo from "@/assets/images/kasware-logo.png";
import kastleLogo from "@/assets/images/kastle-logo.png";
import kasanovaLogo from "@/assets/images/kasanova-logo.jpg";

interface WalletSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletSelectDialog({ open, onOpenChange }: WalletSelectDialogProps) {
  const { connect, isConnecting, connectionError, isKasanovaDetected } = useWallet();
  const [connectingType, setConnectingType] = useState<"kasware" | "kastle" | "kasanova" | null>(null);

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }, []);

  const kasanovaAirbridgeUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `https://kasanova.app/dapp?url=${encodeURIComponent(window.location.href)}`;
  }, []);

  const handleConnect = async (type: "kasware" | "kastle" | "kasanova") => {
    setConnectingType(type);
    try {
      if (type === "kasanova") {
        await connect("kasware");
      } else {
        await connect(type);
      }
      onOpenChange(false);
    } catch {
    } finally {
      setConnectingType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-wallet-select">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose your preferred Kaspa wallet to connect
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          {isKasanovaDetected ? (
            <button
              onClick={() => handleConnect("kasanova")}
              disabled={isConnecting}
              className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover-elevate disabled:opacity-50 disabled:pointer-events-none"
              data-testid="button-select-kasanova"
            >
              <img
                src={kasanovaLogo}
                alt="Kasanova"
                className="h-12 w-12 rounded-full"
              />
              <div className="flex-1">
                <p className="font-semibold">Kasanova</p>
                <p className="text-sm text-muted-foreground">
                  Connected via Kasanova
                </p>
              </div>
              {connectingType === "kasanova" && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </button>
          ) : (
            <>
              <button
                onClick={() => handleConnect("kasware")}
                disabled={isConnecting}
                className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover-elevate disabled:opacity-50 disabled:pointer-events-none"
                data-testid="button-select-kasware"
              >
                <img
                  src={kaswareLogo}
                  alt="KasWare"
                  className="h-12 w-12 rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-semibold">KasWare</p>
                  <p className="text-sm text-muted-foreground">
                    Browser extension wallet
                  </p>
                </div>
                {connectingType === "kasware" && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </button>

              <button
                onClick={() => handleConnect("kastle")}
                disabled={isConnecting}
                className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover-elevate disabled:opacity-50 disabled:pointer-events-none"
                data-testid="button-select-kastle"
              >
                <img
                  src={kastleLogo}
                  alt="Kastle"
                  className="h-12 w-12 rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-semibold">Kastle</p>
                  <p className="text-sm text-muted-foreground">
                    Browser extension wallet
                  </p>
                </div>
                {connectingType === "kastle" && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </button>

              <a
                href={kasanovaAirbridgeUrl}
                className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover-elevate"
                data-testid="button-select-kasanova-mobile"
              >
                <img
                  src={kasanovaLogo}
                  alt="Kasanova"
                  className="h-12 w-12 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-semibold">Kasanova</p>
                  <p className="text-sm text-muted-foreground">
                    {isMobile ? "Open in Kasanova app" : "Mobile wallet"}
                  </p>
                </div>
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </a>
            </>
          )}
        </div>

        {connectionError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
            <div className="text-sm text-destructive">
              <p>{connectionError}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <a
                  href="https://chromewebstore.google.com/detail/kasware-wallet/hklhheigdmpoolooomdihmhlpjjdbklf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline"
                  data-testid="link-install-kasware"
                >
                  Install KasWare <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-muted-foreground">|</span>
                <a
                  href="https://chromewebstore.google.com/detail/kastle/oambclflhjfppdmkghokjmpppmaebego"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline"
                  data-testid="link-install-kastle"
                >
                  Install Kastle <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-muted-foreground">|</span>
                <a
                  href={kasanovaAirbridgeUrl}
                  className="inline-flex items-center gap-1 text-xs underline"
                  data-testid="link-open-kasanova"
                >
                  Open in Kasanova <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
