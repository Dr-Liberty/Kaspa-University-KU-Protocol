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
      // Commit/Reveal individual methods (for capability detection)
      submitCommit?: (params: any) => Promise<any>;
      submitReveal?: (params: any) => Promise<any>;
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
    
    // PRIMARY METHOD: submitCommitReveal with KCOM's 4-parameter signature
    // KCOM uses: submitCommitReveal(commit, reveal, scriptData, networkId)
    try {
      // Method 1: KCOM-style submitCommitReveal (4 parameters)
      if (hasSubmitCommitReveal && hasBuildScript) {
        console.log("[Wallet] Using KCOM-style submitCommitReveal (4 params)");
        
        // Step 1: Get wallet address and UTXOs
        const accounts = await window.kasware.getAccounts();
        const walletAddress = accounts[0];
        const entries = await window.kasware.getUtxoEntries();
        const networkId = await window.kasware.getNetwork();
        
        console.log("[Wallet] Wallet address:", walletAddress);
        console.log("[Wallet] UTXOs count:", entries.length);
        console.log("[Wallet] Network ID:", networkId);
        
        // Step 2: Build the script to get P2SH address and script data
        console.log("[Wallet] Step 2: Calling buildScript...");
        const buildResult = await window.kasware.buildScript({
          type: "KSPR_KRC721",
          data: inscriptionJson
        });
        
        console.log("[Wallet] buildScript result:", JSON.stringify(buildResult, null, 2));
        
        if (!buildResult || !buildResult.p2shAddress || !buildResult.script) {
          throw new Error("buildScript failed to return p2shAddress/script");
        }
        
        const { p2shAddress, script: scriptData, amountSompi: buildAmountSompi } = buildResult;
        
        // Calculate amounts in KAS (KCOM uses KAS, not sompi for outputs)
        // PoW fee: 10 KAS minimum for mint
        // Royalty: From options (in sompi, convert to KAS)
        const royaltyFeeSompi = options?.royaltyFeeSompi ? parseInt(options.royaltyFeeSompi) : 1000000000;
        const royaltyFeeKas = royaltyFeeSompi / 100000000;
        const priorityFeeKas = (options?.priorityFee || 50000000) / 100000000;
        
        // KCOM: totalFees = sum of additionalOutputs amounts + revealPriorityFee
        // KCOM: commit output amount = getSubmitRevealKaspaToSend() + totalFees
        // getSubmitRevealKaspaToSend() returns the base PoW fee (10 KAS = 10)
        const basePoWFee = 10; // 10 KAS
        const totalFees = royaltyFeeKas + priorityFeeKas;
        const commitOutputAmount = basePoWFee + totalFees;
        
        console.log("[Wallet] P2SH address:", p2shAddress);
        console.log("[Wallet] Script data length:", scriptData.length);
        console.log("[Wallet] Base PoW fee:", basePoWFee, "KAS");
        console.log("[Wallet] Royalty fee:", royaltyFeeKas, "KAS");
        console.log("[Wallet] Priority fee:", priorityFeeKas, "KAS");
        console.log("[Wallet] Total commit output:", commitOutputAmount, "KAS");
        
        // Build commit outputs (P2SH address with total amount)
        const commitOutputs = [
          {
            address: p2shAddress,
            amount: commitOutputAmount
          }
        ];
        
        // Build reveal outputs (additional outputs like royalty)
        const revealOutputs: Array<{ address: string; amount: number }> = [];
        if (options?.royaltyTo && royaltyFeeKas > 0) {
          revealOutputs.push({
            address: options.royaltyTo,
            amount: royaltyFeeKas
          });
        }
        
        // KCOM commit object structure
        const commit = {
          priorityEntries: [],
          entries: entries,
          outputs: commitOutputs,
          changeAddress: walletAddress,
          priorityFee: priorityFeeKas
        };
        
        // KCOM reveal object structure
        const reveal = {
          outputs: revealOutputs,
          changeAddress: walletAddress,
          priorityFee: Math.max(priorityFeeKas, 0.00001712)
        };
        
        console.log("[Wallet] Step 3: Calling submitCommitReveal (KCOM 4-param style)...");
        console.log("[Wallet] commit:", JSON.stringify(commit, null, 2));
        console.log("[Wallet] reveal:", JSON.stringify(reveal, null, 2));
        console.log("[Wallet] scriptData:", scriptData.slice(0, 50) + "...");
        console.log("[Wallet] networkId:", networkId);
        
        // KCOM signature: submitCommitReveal(commit, reveal, scriptData, networkId)
        const commitRevealResult = await (window.kasware.submitCommitReveal as any)(
          commit,
          reveal,
          scriptData,
          networkId
        );
        
        console.log("[Wallet] submitCommitReveal result:", commitRevealResult);
        
        // Extract transaction IDs
        let commitTxId: string | undefined;
        let revealTxId: string | undefined;
        
        if (Array.isArray(commitRevealResult)) {
          // KCOM returns array: [commitTxId, revealTxId] or just revealTxId
          if (commitRevealResult.length >= 2) {
            commitTxId = commitRevealResult[0];
            revealTxId = commitRevealResult[1];
          } else if (commitRevealResult.length === 1) {
            revealTxId = commitRevealResult[0];
          }
        } else if (typeof commitRevealResult === "string") {
          revealTxId = commitRevealResult;
        } else if (commitRevealResult && typeof commitRevealResult === "object") {
          const resultObj = commitRevealResult as Record<string, any>;
          console.log("[Wallet] Result keys:", Object.keys(resultObj));
          commitTxId = resultObj.commitTxId || resultObj.sendCommitTxId || resultObj.commit || resultObj.commitTx;
          revealTxId = resultObj.revealTxId || resultObj.sendRevealTxId || resultObj.reveal || 
                      resultObj.txId || resultObj.hash || resultObj.revealTx;
        }
        
        if (revealTxId) {
          console.log("[Wallet] Mint successful - revealTxId:", revealTxId, "commitTxId:", commitTxId);
          return { revealTxId, commitTxId };
        }
        
        if (commitTxId) {
          console.log("[Wallet] Got commitTxId, using as reference:", commitTxId);
          return { revealTxId: commitTxId, commitTxId };
        }
        
        throw new Error("submitCommitReveal returned no transaction ID");
      }
      
      // Method 2: buildScript + inscribeKRC721 (fallback)
      if (hasBuildScript && hasInscribeKRC721) {
        console.log("[Wallet] Fallback: Using buildScript + inscribeKRC721");
        
        const buildResult = await window.kasware.buildScript({
          type: "KSPR_KRC721",
          data: inscriptionJson
        });
        
        if (!buildResult || !buildResult.script || !buildResult.p2shAddress) {
          throw new Error("buildScript failed");
        }
        
        const { script, p2shAddress } = buildResult;
        const inscribeResult = await window.kasware.inscribeKRC721(script, p2shAddress);
        
        if (typeof inscribeResult === "string" && inscribeResult.length > 0) {
          return { revealTxId: inscribeResult };
        }
        
        if (inscribeResult && typeof inscribeResult === "object") {
          const resultObj = inscribeResult as Record<string, any>;
          const commitTxId = resultObj.commitTxId || resultObj.sendCommitTxId;
          const revealTxId = resultObj.revealTxId || resultObj.sendRevealTxId || resultObj.txId;
          if (revealTxId) return { revealTxId, commitTxId };
          if (commitTxId) return { revealTxId: commitTxId, commitTxId };
        }
        
        throw new Error("inscribeKRC721 returned no transaction ID");
      }
      
      // Method 3: signKRC20Transaction (FALLBACK - doesn't show amount in popup)
      const hasSignKRC20Transaction = typeof window.kasware.signKRC20Transaction === "function";
      if (hasSignKRC20Transaction) {
        console.log("[Wallet] FALLBACK: Using signKRC20Transaction with type=5 (KRC-721)");
        
        const result = await window.kasware.signKRC20Transaction(
          inscriptionJson,
          5, // type 5 = KRC-721
          options?.royaltyTo,
          0
        );
        
        console.log("[Wallet] signKRC20Transaction result:", result);
        
        let parsedResult: any = result;
        if (typeof result === "string") {
          try {
            parsedResult = JSON.parse(result);
          } catch {
            return { revealTxId: result };
          }
        }
        
        if (parsedResult && typeof parsedResult === "object") {
          const revealTxId = parsedResult.revealId || parsedResult.revealTxId || 
                            parsedResult.txId || parsedResult.hash;
          const commitTxId = parsedResult.commitId || parsedResult.commitTxId;
          
          console.log("[Wallet] Extracted - revealTxId:", revealTxId, "commitTxId:", commitTxId);
          
          if (revealTxId) {
            return { revealTxId, commitTxId };
          }
        }
        
        throw new Error("signKRC20Transaction returned no transaction ID");
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
