import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest } from "@/lib/queryClient";

interface WhitelistStatus {
  isWhitelisted: boolean;
  isDiplomaEligible?: boolean;
  needsWhitelist?: boolean;
  whitelistedAt?: string;
  whitelistTxHash?: string;
  collection?: string;
  discountFee?: string;
  discountFeeKas?: string;
  totalMintCostKas?: string;
  source?: string;
  reason?: string;
}

interface WhitelistApplyResult {
  success: boolean;
  message?: string;
  commitTxHash?: string;
  revealTxHash?: string;
  error?: string;
}

export function useWhitelistStatus() {
  const { wallet } = useWallet();

  return useQuery<WhitelistStatus>({
    queryKey: ["/api/whitelist/status", wallet?.address ?? null],
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
    staleTime: 5000,
    refetchInterval: 5000,
  });
}

export function useApplyWhitelist() {
  const { wallet } = useWallet();
  const queryClient = useQueryClient();

  return useMutation<WhitelistApplyResult, Error>({
    mutationFn: async () => {
      if (!wallet?.address) {
        throw new Error("Wallet not connected");
      }
      
      const response = await apiRequest("POST", "/api/whitelist/apply");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whitelist/status"] });
    },
  });
}
