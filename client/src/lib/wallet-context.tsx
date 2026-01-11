import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { WalletConnection } from "@shared/schema";
import { setWalletAddress, setAuthToken, queryClient } from "@/lib/queryClient";

declare global {
  interface Window {
    kasware?: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getPublicKey: () => Promise<string>;
      getNetwork: () => Promise<number>;
      switchNetwork: (network: string) => Promise<void>;
      disconnect: (origin: string) => Promise<void>;
      getVersion: () => Promise<string>;
      sendKaspa: (toAddress: string, satoshis: number, options?: { priorityFee?: number; payload?: string }) => Promise<string>;
      getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>;
      signMessage: (message: string, type?: string | { type: string }) => Promise<string>;
      signKRC20Transaction: (inscribeJsonString: string, type: number, destAddr?: string, priorityFee?: number) => Promise<string>;
      // KRC-721 buildScript API for proper commit-reveal flow
      buildScript: (params: { type: string; data: string }) => Promise<{ script: string; p2shAddress: string }>;
      // KRC-721 inscribeKRC721 API - completes inscription after buildScript
      inscribeKRC721: (script: string, p2shAddress: string) => Promise<{ commitTxId: string; revealTxId: string } | string>;
      // PSBT signing for advanced inscription flows
      signPsbt: (psbt: string) => Promise<{ txId: string } | string>;
      // KRC-721 submitCommitReveal API - handles full commit-reveal cycle for inscriptions
      // KasWare 1.9+ uses options object signature
      submitCommitReveal: (
        options: {
          type: string;
          data: string;
          extraOutputs?: Array<{ address: string; amount: number }>;
          priorityFee?: number;
        } | string,
        data?: string,
        extraOutput?: Array<{ address: string; amount: number }>,
        priorityFee?: number
      ) => Promise<{ commitTxId: string; revealTxId: string; txId?: string } | string>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

interface WalletContextType {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  isDemoMode: boolean;
  isAuthenticated: boolean;
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
  signKRC721Mint: (inscriptionJson: string, feeKas?: number) => Promise<string>;
  signKasiaHandshake: (recipientAddress: string, amountKas?: number) => Promise<string>;
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
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("kaspa-university-auth-token");
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
    if (!isWalletInstalled || !window.kasware) return;
    
    const storedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
    const storedToken = localStorage.getItem("kaspa-university-auth-token");
    
    if (!storedWallet || !storedToken) return;
    
    const tryAutoReconnect = async () => {
      try {
        const parsedWallet = JSON.parse(storedWallet) as WalletConnection;
        
        const accounts = await window.kasware!.getAccounts();
        
        if (accounts && accounts.length > 0 && accounts[0] === parsedWallet.address) {
          const networkId = await window.kasware!.getNetwork();
          const networkName = getNetworkName(networkId);
          
          const restoredWallet: WalletConnection = {
            address: accounts[0],
            connected: true,
            network: networkName,
          };
          
          setWallet(restoredWallet);
          setWalletAddress(accounts[0]);
          setWalletType("kasware");
          setIsAuthenticated(true);
          
          console.log(`[Wallet] Auto-restored connection: ${accounts[0].slice(0, 15)}...`);
          queryClient.invalidateQueries();
        } else {
          console.log("[Wallet] Stored wallet address doesn't match current accounts, clearing session");
          localStorage.removeItem(WALLET_STORAGE_KEY);
          localStorage.removeItem("kaspa-university-auth-token");
          localStorage.removeItem("kaspa-university-wallet-address");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("[Wallet] Auto-reconnect failed:", error);
      }
    };
    
    tryAutoReconnect();
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
          const walletAddr = accounts[0];
          const networkId = await window.kasware.getNetwork();
          const networkName = getNetworkName(networkId);
          
          // SIWK (Sign-In with Kaspa) Authentication Flow
          // Using standardized @kluster/kaspa-auth protocol
          
          // Step 1: Request SIWK challenge from server
          console.log(`[SIWK] Requesting challenge for ${walletAddr.slice(0, 15)}...`);
          const challengeRes = await fetch("/api/auth/siwk/challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: walletAddr }),
          });
          
          if (!challengeRes.ok) {
            const err = await challengeRes.json().catch(() => ({}));
            throw new Error(err.error || "Failed to get SIWK challenge");
          }
          
          const { fields, message } = await challengeRes.json();
          
          // Step 2: Sign the SIWK message with the wallet using Schnorr
          // @kluster/kaspa-auth expects Schnorr signatures (64-byte)
          console.log("[SIWK] Signing challenge message with Schnorr...");
          const signature = await window.kasware.signMessage(message, { type: "schnorr" });
          
          // Step 3: Verify signature with server
          console.log("[SIWK] Verifying signature...");
          const verifyRes = await fetch("/api/auth/siwk/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields, signature }),
          });
          
          if (!verifyRes.ok) {
            const err = await verifyRes.json().catch(() => ({}));
            throw new Error(err.error || "SIWK verification failed");
          }
          
          const { token } = await verifyRes.json();
          
          // Step 4: Store auth token and complete connection
          setAuthToken(token);
          setIsAuthenticated(true);
          
          const newWallet: WalletConnection = {
            address: walletAddr,
            connected: true,
            network: networkName,
          };
          
          setWallet(newWallet);
          setWalletAddress(walletAddr);
          setWalletType("kasware");
          queryClient.invalidateQueries();
          
          console.log(`[SIWK] Authenticated via Sign-In with Kaspa: ${walletAddr.slice(0, 15)}... (${networkName})`);
        } else {
          throw new Error("No accounts returned from wallet");
        }
      } else {
        setConnectionError("KasWare wallet not installed. Please install it from the Chrome Web Store.");
        console.log("[Wallet] KasWare not detected, prompting user to install");
      }
    } catch (error: any) {
      console.error("[SIWK] Connection failed:", error);
      
      if (error.message?.includes("User rejected")) {
        setConnectionError("Connection rejected. Please approve the request in your wallet.");
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
      // Notify server to invalidate session
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-auth-token": localStorage.getItem("kaspa-university-auth-token") || "" },
      }).catch(() => {});
      
      if (walletType === "kasware" && window.kasware) {
        await window.kasware.disconnect(window.location.origin);
      }
    } catch (error) {
      console.error("[Wallet] Disconnect error:", error);
    }
    
    setWallet(null);
    setWalletAddress(null);
    setAuthToken(null);
    setIsAuthenticated(false);
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

  const signKRC721Mint = useCallback(async (inscriptionJson: string, feeKas?: number): Promise<string> => {
    if (isDemoMode) {
      throw new Error("NFT minting not available in demo mode. Please connect a real wallet.");
    }
    
    if (!window.kasware) {
      throw new Error("KasWare wallet not installed");
    }
    
    const totalFeeKas = feeKas || 20;
    const feeSompi = Math.floor(totalFeeKas * 100000000);
    
    console.log("[Wallet] Starting KRC-721 mint with inscription:", inscriptionJson);
    console.log("[Wallet] Total fee: " + totalFeeKas + " KAS (" + feeSompi + " sompi)");
    
    const availableMethods = Object.keys(window.kasware).filter(
      key => typeof (window.kasware as any)[key] === "function"
    );
    console.log("[Wallet] Available KasWare methods:", availableMethods.join(", "));
    
    let parsedData: { p: string; op: string; tick: string; to?: string } | null = null;
    try {
      parsedData = JSON.parse(inscriptionJson);
      console.log("[Wallet] KRC-721 mint: ticker=" + parsedData?.tick + ", op=" + parsedData?.op + ", to=" + (parsedData?.to?.slice(0, 20) || "none"));
    } catch {
      console.log("[Wallet] Could not parse inscription JSON");
    }
    
    // Treasury address for royalty payments
    const TREASURY_ADDRESS = "kaspa:qrewk7s6gnzuzxvces8t7v669k2w4p9djhmuy62294mmgtj3d0yluueqwv2er";
    
    let lastError: Error | null = null;
    
    // Approach 1: Use signKRC20Transaction with type=5 for KRC-721
    // This is the primary method that handles the full commit-reveal and fee payment
    if (typeof window.kasware.signKRC20Transaction === "function") {
      console.log("[Wallet] Trying signKRC20Transaction with type=5 for KRC-721...");
      console.log("[Wallet] Inscription:", inscriptionJson);
      
      try {
        // type=5 is KRC-721 (type=3 is KRC-20)
        // priorityFee is in KAS
        const txHash = await window.kasware.signKRC20Transaction(
          inscriptionJson,
          5,  // Type 5 = KRC-721
          TREASURY_ADDRESS,  // Destination for royalty
          totalFeeKas  // Priority fee in KAS
        );
        console.log("[Wallet] signKRC20Transaction type=5 SUCCESS:", txHash);
        return txHash;
      } catch (err: any) {
        console.warn("[Wallet] signKRC20Transaction type=5 failed:", err?.message || err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    
    // Approach 2: Use buildScript to get script and P2SH, then manually complete
    if (typeof window.kasware.buildScript === "function") {
      console.log("[Wallet] Trying buildScript for KRC-721...");
      try {
        const { script, p2shAddress } = await window.kasware.buildScript({
          type: "KSPR_KRC721",
          data: inscriptionJson,
        });
        console.log("[Wallet] buildScript result: script length=", script.length, "p2sh=", p2shAddress);
        
        // If inscribeKRC721 is available, use it to complete the inscription
        if (typeof window.kasware.inscribeKRC721 === "function") {
          console.log("[Wallet] Completing with inscribeKRC721...");
          const mintResult = await window.kasware.inscribeKRC721(script, p2shAddress);
          console.log("[Wallet] inscribeKRC721 SUCCESS:", mintResult);
          if (typeof mintResult === "string") return mintResult;
          return mintResult.revealTxId || mintResult.commitTxId;
        }
        
        // Otherwise, send the commit fee to P2SH address
        console.log("[Wallet] Sending", totalFeeKas, "KAS to P2SH:", p2shAddress);
        const commitTx = await window.kasware.sendKaspa(p2shAddress, feeSompi);
        console.log("[Wallet] Commit transaction sent:", commitTx);
        return commitTx;
      } catch (err: any) {
        console.warn("[Wallet] buildScript approach failed:", err?.message || err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    
    if (lastError) {
      throw new Error(
        "NFT minting failed: " + lastError.message + ". " +
        "Please ensure you have the latest KasWare wallet version."
      );
    }
    
    throw new Error(
      "Your KasWare wallet does not support KRC-721 NFT minting. " +
      "Available methods: " + availableMethods.join(", ") + ". " +
      "Please update to the latest version."
    );
  }, [isDemoMode]);

  const signKasiaHandshake = useCallback(async (recipientAddress: string, amountKas: number = 0.2): Promise<string> => {
    if (isDemoMode) {
      throw new Error("Kasia messaging not available in demo mode. Please connect a real wallet.");
    }
    
    if (!window.kasware) {
      throw new Error("KasWare wallet not installed");
    }
    
    if (typeof window.kasware.sendKaspa !== "function") {
      throw new Error("Your KasWare wallet does not support Kasia Protocol. Please update to the latest version.");
    }
    
    console.log(`[Wallet] Sending Kasia handshake (${amountKas} KAS) to ${recipientAddress}...`);
    const sompi = Math.floor(amountKas * 100000000);
    const txHash = await window.kasware.sendKaspa(recipientAddress, sompi);
    console.log(`[Wallet] Kasia handshake sent, txHash: ${txHash}`);
    return txHash;
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
        isAuthenticated,
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
        signKRC721Mint,
        signKasiaHandshake,
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
