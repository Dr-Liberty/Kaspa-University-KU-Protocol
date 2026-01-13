import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { WalletConnection } from "@shared/schema";
import { setWalletAddress, setAuthToken, queryClient } from "@/lib/queryClient";

interface KaswareUtxo {
  entry: {
    address: { version: string; prefix: string; payload: string };
    outpoint: { transactionId: string; index: number };
    amount: number;
    scriptPublicKey: { version: number; script: string };
    blockDaaScore: number;
    isCoinbase: boolean;
  };
  outpoint: { transactionId: string; index: number };
  address: { version: string; prefix: string; payload: string };
  amount: number;
  isCoinbase: boolean;
  blockDaaScore: number;
  scriptPublicKey: { version: number; script: string };
}

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
      // Get user's UTXO entries for transaction building
      getUtxoEntries: () => Promise<KaswareUtxo[]>;
      // KRC-721 buildScript API for proper commit-reveal flow
      buildScript: (params: { type: string; data: string }) => Promise<{ script: string; p2shAddress: string; amountSompi?: number }>;
      // KRC-721 inscribeKRC721 API - completes inscription after buildScript
      inscribeKRC721: (script: string, p2shAddress: string) => Promise<{ commitTxId: string; revealTxId: string } | string>;
      // PSKT signing for individual transaction prompts
      signPskt: (params: { txJsonString: string; options?: { signInputs?: Array<{ index: number; sighashType: number }> } }) => Promise<string>;
      // Broadcast a signed transaction
      broadcastTransaction?: (signedTx: string) => Promise<string>;
      // KRC-721 submitCommitReveal API - handles full commit-reveal cycle for inscriptions
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
  signKRC721Mint: (inscriptionJson: string, options?: { royaltyTo?: string; royaltyFeeSompi?: string; priorityFee?: number }) => Promise<{ revealTxId: string; commitTxId?: string }>;
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

  const signKRC721Mint = useCallback(async (
    inscriptionJson: string, 
    options?: { 
      royaltyTo?: string; 
      royaltyFeeSompi?: string;
      priorityFee?: number;
    }
  ): Promise<{ revealTxId: string; commitTxId?: string }> => {
    if (isDemoMode) {
      throw new Error("NFT minting not available in demo mode. Please connect a real wallet.");
    }
    
    if (!window.kasware) {
      throw new Error("KasWare wallet not installed");
    }
    
    console.log("[Wallet] Starting KRC-721 mint");
    console.log("[Wallet] Inscription JSON (raw):", inscriptionJson);
    console.log("[Wallet] Inscription JSON (parsed):", JSON.parse(inscriptionJson));
    console.log("[Wallet] Royalty options:", JSON.stringify(options));
    
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
    
    const hasSubmitCommitReveal = typeof window.kasware.submitCommitReveal === "function";
    const hasBuildScript = typeof window.kasware.buildScript === "function";
    
    // Detect all KRC-721 related methods
    const hasInscribeKRC721 = typeof window.kasware.inscribeKRC721 === "function";
    const hasSubmitCommit = typeof window.kasware.submitCommit === "function";
    const hasSubmitReveal = typeof window.kasware.submitReveal === "function";
    const hasSendKaspa = typeof window.kasware.sendKaspa === "function";
    
    console.log("[Wallet] Capability detection: submitCommitReveal=" + hasSubmitCommitReveal + 
      ", buildScript=" + hasBuildScript + ", inscribeKRC721=" + hasInscribeKRC721 +
      ", submitCommit=" + hasSubmitCommit + ", submitReveal=" + hasSubmitReveal +
      ", sendKaspa=" + hasSendKaspa);
    
    // PRIMARY METHOD: Two-step buildScript + (submitCommit/submitReveal OR inscribeKRC721)
    // This is the proven approach used by kaspa.com/nft/marketplace
    // The shortcut submitCommitReveal("KSPR_KRC721", ...) hangs in current KasWare versions
    try {
      // Method 1: buildScript + inscribeKRC721
      if (hasBuildScript && hasInscribeKRC721) {
        console.log("[Wallet] Using two-step flow: buildScript + inscribeKRC721");
        
        // Step 1: Build the commit script
        console.log("[Wallet] Step 1: Calling buildScript...");
        const buildResult = await window.kasware.buildScript({
          type: "KSPR_KRC721",
          data: inscriptionJson
        });
        
        console.log("[Wallet] buildScript result:", JSON.stringify(buildResult, null, 2));
        
        if (!buildResult || !buildResult.script || !buildResult.p2shAddress) {
          throw new Error("buildScript failed to return script/p2shAddress");
        }
        
        const { script, p2shAddress, amountSompi } = buildResult;
        console.log("[Wallet] Got script:", script.slice(0, 50) + "...");
        console.log("[Wallet] Got p2shAddress:", p2shAddress);
        console.log("[Wallet] Got amountSompi:", amountSompi);
        
        // Step 2: Complete the inscription (commit + reveal)
        console.log("[Wallet] Step 2: Calling inscribeKRC721...");
        const inscribeResult = await window.kasware.inscribeKRC721(script, p2shAddress);
        
        console.log("[Wallet] inscribeKRC721 result:", inscribeResult);
        console.log("[Wallet] Result type:", typeof inscribeResult);
        
        // Handle different return formats
        if (typeof inscribeResult === "string" && inscribeResult.length > 0) {
          console.log("[Wallet] Mint successful (string txId):", inscribeResult);
          return { revealTxId: inscribeResult };
        }
        
        if (inscribeResult && typeof inscribeResult === "object") {
          const resultObj = inscribeResult as Record<string, any>;
          console.log("[Wallet] Result keys:", Object.keys(resultObj));
          
          const commitTxId = resultObj.commitTxId || resultObj.sendCommitTxId || resultObj.commit;
          const revealTxId = resultObj.revealTxId || resultObj.sendRevealTxId || resultObj.reveal || 
                            resultObj.txId || resultObj.hash;
          
          if (revealTxId) {
            console.log("[Wallet] Mint successful - revealTxId:", revealTxId, "commitTxId:", commitTxId);
            return { revealTxId, commitTxId };
          }
          
          // If only commit returned, use it as reference
          if (commitTxId) {
            console.log("[Wallet] Got commitTxId, reveal should follow:", commitTxId);
            return { revealTxId: commitTxId, commitTxId };
          }
        }
        
        throw new Error("inscribeKRC721 returned no transaction ID");
      }
      
      // Method 2: buildScript + submitCommit + submitReveal
      // buildScript populates internal wallet cache, submitCommit/submitReveal use it
      if (hasBuildScript && hasSubmitCommit && hasSubmitReveal) {
        console.log("[Wallet] Using buildScript + submitCommit + submitReveal flow");
        
        // Step 1: Build the commit script (populates wallet's internal cache)
        console.log("[Wallet] Step 1: Calling buildScript...");
        const buildResult = await window.kasware.buildScript({
          type: "KSPR_KRC721",
          data: inscriptionJson
        });
        
        console.log("[Wallet] buildScript result:", JSON.stringify(buildResult, null, 2));
        
        if (!buildResult || !buildResult.script) {
          throw new Error("buildScript failed to return script data");
        }
        
        const { script, p2shAddress } = buildResult;
        console.log("[Wallet] Got script length:", script?.length || 0);
        console.log("[Wallet] Got p2shAddress:", p2shAddress);
        
        // Step 2: Call submitCommit - wallet handles the commit transaction using cached state
        console.log("[Wallet] Step 2: Calling submitCommit...");
        let commitResult;
        try {
          commitResult = await window.kasware.submitCommit();
          console.log("[Wallet] submitCommit result:", commitResult);
        } catch (commitErr) {
          console.log("[Wallet] submitCommit failed:", commitErr);
          throw new Error("submitCommit failed: " + (commitErr as Error).message);
        }
        
        // Extract commit txId
        let commitTxId: string;
        if (typeof commitResult === "string") {
          commitTxId = commitResult;
        } else if (commitResult && typeof commitResult === "object") {
          commitTxId = (commitResult as any).txId || (commitResult as any).id || (commitResult as any).hash || 
                       (commitResult as any).sendCommitTxId || (commitResult as any).commitTxId;
        } else {
          throw new Error("submitCommit returned no transaction ID");
        }
        
        console.log("[Wallet] Commit txId:", commitTxId);
        
        // Wait for commit to propagate
        console.log("[Wallet] Waiting 3s for commit to propagate...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Call submitReveal - wallet handles the reveal using cached state
        console.log("[Wallet] Step 3: Calling submitReveal...");
        let revealResult;
        try {
          revealResult = await window.kasware.submitReveal();
          console.log("[Wallet] submitReveal result:", revealResult);
        } catch (revealErr) {
          console.log("[Wallet] submitReveal failed:", revealErr);
          // Commit succeeded, reveal failed
          return { revealTxId: commitTxId, commitTxId, revealPending: true };
        }
        
        // Extract reveal txId
        const revealTxId = typeof revealResult === "string" ? revealResult :
          (revealResult?.txId || revealResult?.hash || revealResult?.sendRevealTxId || revealResult?.revealTxId);
        
        if (revealTxId) {
          console.log("[Wallet] Mint complete! revealTxId:", revealTxId, "commitTxId:", commitTxId);
          return { revealTxId, commitTxId };
        }
        
        return { revealTxId: commitTxId, commitTxId };
      }
      
      // FALLBACK: Try submitCommitReveal (known to hang on some KasWare versions)
      if (hasSubmitCommitReveal) {
        console.log("[Wallet] Fallback: Using submitCommitReveal (may hang on some KasWare versions)");
        
        const MINT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minute timeout
        
        const mintPromise = window.kasware.submitCommitReveal(
          "KSPR_KRC721",
          inscriptionJson
        );
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Mint timed out. Please try again or update KasWare.")), MINT_TIMEOUT_MS);
        });
        
        const result = await Promise.race([mintPromise, timeoutPromise]);
        
        console.log("[Wallet] submitCommitReveal result:", result);
        
        if (typeof result === "string" && result.length > 0) {
          return { revealTxId: result };
        }
        
        if (result && typeof result === "object") {
          const resultObj = result as Record<string, any>;
          const revealTxId = resultObj.revealTxId || resultObj.txId || resultObj.hash;
          const commitTxId = resultObj.commitTxId || resultObj.sendCommitTxId;
          if (revealTxId) {
            return { revealTxId, commitTxId };
          }
          if (commitTxId) {
            return { revealTxId: commitTxId, commitTxId };
          }
        }
        
        throw new Error("submitCommitReveal returned no transaction ID");
      }
      
      throw new Error(
        "Your KasWare wallet does not support KRC-721 minting. " +
        "Please update to the latest version."
      );
    } catch (err: any) {
      console.error("[Wallet] KRC-721 mint failed:", err);
      
      if (err.message?.includes("User rejected") || err.message?.includes("cancelled")) {
        throw new Error("Transaction cancelled by user");
      }
      
      throw new Error(
        err.message || 
        "KRC-721 minting failed. Please try again or contact support."
      );
    }
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
