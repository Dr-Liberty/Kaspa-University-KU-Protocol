import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-context";

interface WhitelistStatus {
  isWhitelisted: boolean;
  whitelistedAt?: string;
  whitelistTxHash?: string;
  collection?: string;
  discountFee?: string;
  discountFeeKas?: string;
  reason?: string;
}

export function useWhitelistStatus() {
  const { wallet } = useWallet();

  return useQuery<WhitelistStatus>({
    queryKey: ["/api/whitelist/status"],
    queryFn: async () => {
      if (!wallet?.address) {
        return { isWhitelisted: false, reason: "No wallet connected" };
      }
      
      const response = await fetch("/api/whitelist/status", {
        headers: {
          "x-wallet-address": wallet.address,
        },
      });
      
      if (!response.ok) {
        return { isWhitelisted: false, reason: "Failed to check status" };
      }
      
      return response.json();
    },
    enabled: !!wallet?.address,
    staleTime: 30000,
  });
}
