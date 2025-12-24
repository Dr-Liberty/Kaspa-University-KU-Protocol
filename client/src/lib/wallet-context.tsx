import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { WalletConnection } from "@shared/schema";
import { setWalletAddress, queryClient } from "@/lib/queryClient";

interface WalletContextType {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  isDemoMode: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  truncatedAddress: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = "kaspa-university-wallet";
const DEMO_MODE_KEY = "kaspa-university-demo";

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
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DEMO_MODE_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    if (wallet) {
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
      setWalletAddress(wallet.address);
      localStorage.removeItem(DEMO_MODE_KEY);
      setIsDemoMode(false);
    } else {
      localStorage.removeItem(WALLET_STORAGE_KEY);
      setWalletAddress(null);
    }
  }, [wallet]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(DEMO_MODE_KEY, "true");
      setWalletAddress("demo:guest");
    } else {
      localStorage.removeItem(DEMO_MODE_KEY);
      if (!wallet) {
        setWalletAddress(null);
      }
    }
  }, [isDemoMode, wallet]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setIsDemoMode(false);
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
    setIsDemoMode(false);
    queryClient.invalidateQueries();
  }, []);

  const enterDemoMode = useCallback(() => {
    setWallet(null);
    setIsDemoMode(true);
    setWalletAddress("demo:guest");
    queryClient.invalidateQueries();
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setWalletAddress(null);
    queryClient.invalidateQueries();
  }, []);

  const truncatedAddress = wallet?.address
    ? `${wallet.address.slice(0, 12)}...${wallet.address.slice(-6)}`
    : "";

  return (
    <WalletContext.Provider
      value={{ wallet, isConnecting, isDemoMode, connect, disconnect, enterDemoMode, exitDemoMode, truncatedAddress }}
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
