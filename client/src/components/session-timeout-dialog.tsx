import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SESSION_EXPIRED_EVENT } from "@/lib/queryClient";
import { useWallet } from "@/lib/wallet-context";

export function SessionTimeoutDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { disconnect, connect, wallet } = useWallet();

  useEffect(() => {
    const handleSessionExpired = () => {
      if (wallet) {
        setIsOpen(true);
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [wallet]);

  const handleReconnect = async () => {
    setIsOpen(false);
    disconnect();
    setTimeout(() => {
      connect();
    }, 500);
  };

  const handleDismiss = () => {
    setIsOpen(false);
    disconnect();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent data-testid="dialog-session-timeout">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>Session Expired</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Your wallet session has timed out for security reasons. Please sign back in to continue using Kaspa University.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            onClick={handleDismiss}
            data-testid="button-session-dismiss"
          >
            Dismiss
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReconnect}
            data-testid="button-session-reconnect"
          >
            Reconnect Wallet
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
