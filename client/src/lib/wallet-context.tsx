import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { WalletConnection } from "@shared/schema";
import { setWalletAddress, queryClient } from "@/lib/queryClient";

declare global {
  interface Window {
    kasware?: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getNetwork: () => Promise<number>;
      switchNetwork: (network: string) => Promise<void>;
      disconnect: (origin: string) => Promise<void>;
      getVersion: () => Promise<string>;
      sendKaspa: (toAddress: string, satoshis: number, options?: { priorityFee?: number }) => Promise<string>;
      getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

interface WalletContextType {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  isDemoMode: boolean;
  walletType: "kasware" | "mock" | null;
  isWalletInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  truncatedAddress: string;
  connectionError: string | null;
  sendKaspa: (toAddress: string, amountKas: number) => Promise<string>;
  getBalance: () => Promise<number>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = "kaspa-university-wallet";
const DEMO_MODE_KEY = "kaspa-university-demo";

type KaspaNetwork = "mainnet" | "testnet-10" | "testnet-11";

function getNetworkName(networkId: number): KaspaNetwork {
  switch (networkId) {
    case 0: return "mainnet";
    case 1: return "testnet-10";
    case 2: return "testnet-11";
    default: return "mainnet";
  }
}

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
  const [walletType, setWalletType] = useState<"kasware" | "mock" | null>(null);
  const [isWalletInstalled, setIsWalletInstalled] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const checkWalletInstalled = () => {
      const installed = typeof window !== "undefined" && typeof window.kasware !== "undefined";
      setIsWalletInstalled(installed);
    };
    
    checkWalletInstalled();
    
    const timer = setTimeout(checkWalletInstalled, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isWalletInstalled || !window.kasware) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setWallet(null);
        setWalletAddress(null);
        setWalletType(null);
      } else {
        const networkId = await window.kasware!.getNetwork();
        const newWallet: WalletConnection = {
          address: accounts[0],
          connected: true,
          network: getNetworkName(networkId),
        };
        setWallet(newWallet);
        setWalletAddress(accounts[0]);
        setWalletType("kasware");
      }
      queryClient.invalidateQueries();
    };

    window.kasware.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.kasware?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [isWalletInstalled]);

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
    setConnectionError(null);

    try {
      if (typeof window.kasware !== "undefined") {
        const accounts = await window.kasware.requestAccounts();
        
        if (accounts && accounts.length > 0) {
          const networkId = await window.kasware.getNetwork();
          const networkName = getNetworkName(networkId);
          
          const newWallet: WalletConnection = {
            address: accounts[0],
            connected: true,
            network: networkName,
          };
          
          setWallet(newWallet);
          setWalletAddress(accounts[0]);
          setWalletType("kasware");
          queryClient.invalidateQueries();
          
          console.log(`[Wallet] Connected via KasWare: ${accounts[0]} (${networkName})`);
        } else {
          throw new Error("No accounts returned from wallet");
        }
      } else {
        setConnectionError("KasWare wallet not installed. Please install it from the Chrome Web Store.");
        console.log("[Wallet] KasWare not detected, prompting user to install");
      }
    } catch (error: any) {
      console.error("[Wallet] Connection failed:", error);
      
      if (error.message?.includes("User rejected")) {
        setConnectionError("Connection rejected. Please approve the connection request in your wallet.");
      } else if (error.message?.includes("No accounts")) {
        setConnectionError("No accounts found. Please unlock your wallet and try again.");
      } else {
        setConnectionError(error.message || "Failed to connect wallet. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (walletType === "kasware" && window.kasware) {
        await window.kasware.disconnect(window.location.origin);
      }
    } catch (error) {
      console.error("[Wallet] Disconnect error:", error);
    }
    
    setWallet(null);
    setWalletAddress(null);
    setWalletType(null);
    setIsDemoMode(false);
    setConnectionError(null);
    queryClient.invalidateQueries();
  }, [walletType]);

  const enterDemoMode = useCallback(() => {
    setWallet(null);
    setWalletType(null);
    setIsDemoMode(true);
    setWalletAddress("demo:guest");
    setConnectionError(null);
    queryClient.invalidateQueries();
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setWalletAddress(null);
    setConnectionError(null);
    queryClient.invalidateQueries();
  }, []);

  const sendKaspa = useCallback(async (toAddress: string, amountKas: number): Promise<string> => {
    if (isDemoMode) {
      throw new Error("Payment not available in demo mode. Please connect a real wallet.");
    }
    
    if (!window.kasware) {
      throw new Error("KasWare wallet not installed");
    }
    
    if (typeof window.kasware.sendKaspa !== "function") {
      throw new Error("Your KasWare wallet version does not support sending KAS. Please update your wallet.");
    }
    
    const sompi = Math.floor(amountKas * 100000000);
    const txHash = await window.kasware.sendKaspa(toAddress, sompi);
    console.log(`[Wallet] Sent ${amountKas} KAS to ${toAddress}, txHash: ${txHash}`);
    return txHash;
  }, [isDemoMode]);

  const getBalance = useCallback(async (): Promise<number> => {
    if (isDemoMode) {
      return 0;
    }
    
    if (!window.kasware) {
      throw new Error("KasWare wallet not installed");
    }
    
    if (typeof window.kasware.getBalance !== "function") {
      console.warn("[Wallet] getBalance not supported by this KasWare version");
      return 0;
    }
    
    const balance = await window.kasware.getBalance();
    return balance.total / 100000000;
  }, [isDemoMode]);

  const truncatedAddress = wallet?.address
    ? `${wallet.address.slice(0, 12)}...${wallet.address.slice(-6)}`
    : "";

  return (
    <WalletContext.Provider
      value={{ 
        wallet, 
        isConnecting, 
        isDemoMode, 
        walletType,
        isWalletInstalled,
        connect, 
        disconnect, 
        enterDemoMode, 
        exitDemoMode, 
        truncatedAddress,
        connectionError,
        sendKaspa,
        getBalance,
      }}
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
