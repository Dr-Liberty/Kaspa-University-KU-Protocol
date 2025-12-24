import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { WalletConnection } from "@shared/schema";
import { setWalletAddress, queryClient } from "@/lib/queryClient";

interface WalletContextType {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  truncatedAddress: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = "kaspa-university-wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletConnection | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(WALLET_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setWalletAddress(parsed.address);
          return parsed;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (wallet) {
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
      setWalletAddress(wallet.address);
    } else {
      localStorage.removeItem(WALLET_STORAGE_KEY);
      setWalletAddress(null);
    }
  }, [wallet]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const mockAddress = `kaspa:qr${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const newWallet: WalletConnection = {
      address: mockAddress,
      connected: true,
      network: "testnet-11",
    };
    setWallet(newWallet);
    setWalletAddress(mockAddress);
    queryClient.invalidateQueries();
    setIsConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setWalletAddress(null);
    queryClient.invalidateQueries();
  }, []);

  const truncatedAddress = wallet?.address
    ? `${wallet.address.slice(0, 12)}...${wallet.address.slice(-6)}`
    : "";

  return (
    <WalletContext.Provider
      value={{ wallet, isConnecting, connect, disconnect, truncatedAddress }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
