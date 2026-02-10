import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWallet } from "@/lib/wallet-context";
import { Wallet, ExternalLink, AlertCircle } from "lucide-react";
import kaswareLogo from "@/assets/images/kasware-logo.png";
import kastleLogo from "@/assets/images/kastle-logo.png";

interface WalletSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletSelectDialog({ open, onOpenChange }: WalletSelectDialogProps) {
  const { connect, isConnecting, connectionError } = useWallet();
  const [connectingType, setConnectingType] = useState<"kasware" | "kastle" | null>(null);

  const handleConnect = async (type: "kasware" | "kastle") => {
    setConnectingType(type);
    try {
      await connect(type);
      onOpenChange(false);
    } catch {
      // error is handled by wallet context
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
        </div>

        {connectionError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
            <div className="text-sm text-destructive">
              <p>{connectionError}</p>
              <a
                href="https://chromewebstore.google.com/detail/kasware-wallet/hklhheigdmpoolooomdihmhlpjjdbklf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs underline"
                data-testid="link-install-kasware"
              >
                Install KasWare <ExternalLink className="h-3 w-3" />
              </a>
              <span className="mx-2 text-xs text-muted-foreground">|</span>
              <a
                href="https://chromewebstore.google.com/detail/kastle/oambclflhjfppdmkghokjmpppmaebego"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs underline"
                data-testid="link-install-kastle"
              >
                Install Kastle <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
