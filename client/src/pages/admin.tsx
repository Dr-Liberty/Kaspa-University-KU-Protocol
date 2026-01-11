import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Trash2, RotateCcw, Check, Lock, AlertTriangle, FileText, Database, Shield, Wallet, Zap, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  recipientAddress: string;
  nftStatus: string;
  imageUrl?: string;
  nftTxHash?: string;
  issuedAt: string;
}

interface Reservation {
  id: string;
  certificateId: string;
  recipientAddress: string;
  tokenId: number;
  p2shAddress: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface ErrorLog {
  id: string;
  category: string;
  action: string;
  message: string;
  details: any;
  walletAddress?: string;
  resolved: boolean;
  createdAt: string;
}

interface AdminStats {
  certificates: { total: number; pending: number; minting: number; claimed: number };
  reservations: { total: number; pending: number; finalized: number; expired: number };
  errors: { total: number; unresolved: number; byCategory: Record<string, number> };
}

interface StuckFund {
  p2shAddress: string;
  balance: number;
  balanceKas: string;
  certificateId: string;
  courseName: string;
  status: string;
  createdAt: string;
}

interface P2SHRecoveryData {
  totalStuckFunds: number;
  totalStuckKas: string;
  totalReservations: number;
  scannedCount: number;
  stuckFunds: StuckFund[];
  hasErrors: boolean;
  errors: string[];
}

interface KasiaConversation {
  id: string;
  initiatorAddress: string;
  recipientAddress: string;
  initiatorAlias?: string;
  recipientAlias?: string;
  status: "pending" | "active" | "archived";
  handshakeTxHash?: string;
  responseTxHash?: string;
  createdAt: string;
  updatedAt: string;
  isAdminConversation?: boolean;
}

interface KasiaStats {
  conversations: number;
  pendingHandshakes: number;
  activeConversations: number;
  totalMessages: number;
}

interface TreasuryStatus {
  address: string;
  isLive: boolean;
  totalUtxos: number;
  spendableUtxos: number;
  lockedP2shUtxos: number;
  totalBalance: string;
  spendableBalance: string;
  lockedBalance: string;
  needsFunding: boolean;
  message: string;
}

interface KasiaHandshakeData {
  conversations: KasiaConversation[];
  stats: KasiaStats;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [resetWalletAddress, setResetWalletAddress] = useState("");
  const { toast } = useToast();

  const headers = { "x-admin-password": password };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { headers });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    enabled: authenticated,
  });

  const { data: certificates = [], refetch: refetchCerts } = useQuery<Certificate[]>({
    queryKey: ["/api/admin/certificates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/certificates", { headers });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    enabled: authenticated,
  });

  const { data: reservations = [], refetch: refetchReservations } = useQuery<Reservation[]>({
    queryKey: ["/api/admin/reservations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reservations", { headers });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    enabled: authenticated,
  });

  const { data: errors = [], refetch: refetchErrors } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/errors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/errors?limit=100", { headers });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    enabled: authenticated,
  });

  const { data: p2shRecovery, isLoading: p2shLoading, refetch: refetchP2SH } = useQuery<P2SHRecoveryData>({
    queryKey: ["/api/admin/p2sh-recovery"],
    queryFn: async () => {
      const res = await fetch("/api/admin/p2sh-recovery", { headers });
      if (!res.ok) throw new Error("Failed to fetch P2SH data");
      return res.json();
    },
    enabled: authenticated,
    staleTime: 60000,
  });

  const { data: kasiaHandshakes, refetch: refetchKasia } = useQuery<KasiaHandshakeData>({
    queryKey: ["/api/admin/kasia/handshakes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/kasia/handshakes", { headers });
      if (!res.ok) throw new Error("Failed to fetch Kasia data");
      return res.json();
    },
    enabled: authenticated,
    staleTime: 30000,
  });

  // State for active conversation messaging
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState("");

  // Fetch active conversations
  const { data: activeConversationsData, refetch: refetchActiveConvs } = useQuery<{
    active: KasiaConversation[];
    all: KasiaConversation[];
    stats: KasiaStats;
  }>({
    queryKey: ["/api/admin/kasia/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/kasia/conversations", { headers });
      if (!res.ok) throw new Error("Failed to fetch active conversations");
      return res.json();
    },
    enabled: authenticated,
    staleTime: 15000,
  });

  // Fetch messages for selected conversation
  const { data: conversationMessages, refetch: refetchMessages } = useQuery<{
    conversation: KasiaConversation;
    messages: Array<{
      txHash: string;
      conversationId: string;
      senderAddress: string;
      encryptedContent: string;
      timestamp: string;
    }>;
  }>({
    queryKey: ["/api/admin/kasia/conversations", selectedConvId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/kasia/conversations/${selectedConvId}/messages`, { headers });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: authenticated && !!selectedConvId,
    staleTime: 10000,
    refetchInterval: selectedConvId ? 10000 : false,
  });

  const { data: treasuryStatus, isLoading: treasuryLoading, refetch: refetchTreasury } = useQuery<TreasuryStatus>({
    queryKey: ["/api/treasury/status"],
    queryFn: async () => {
      const res = await fetch("/api/treasury/status");
      if (!res.ok) throw new Error("Failed to fetch treasury status");
      return res.json();
    },
    enabled: authenticated,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const { data: collectionStatus, refetch: refetchCollection } = useQuery<{
    ticker: string;
    name: string;
    isDeployed: boolean;
    isLive: boolean;
    address: string | null;
    nextTokenId: number;
  }>({
    queryKey: ["/api/admin/collection-status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/collection-status", { headers });
      if (!res.ok) throw new Error("Failed to fetch collection status");
      return res.json();
    },
    enabled: authenticated,
    staleTime: 30000,
  });

  const { data: networkMode, refetch: refetchNetwork } = useQuery<{
    testnet: boolean;
    network: string;
    ticker: string;
    message: string;
  }>({
    queryKey: ["/api/admin/network-mode"],
    queryFn: async () => {
      const res = await fetch("/api/admin/network-mode", { headers });
      if (!res.ok) throw new Error("Failed to fetch network mode");
      return res.json();
    },
    enabled: authenticated,
    staleTime: 30000,
  });

  const switchNetworkMutation = useMutation({
    mutationFn: async (testnet: boolean) => {
      const res = await fetch("/api/admin/switch-network", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ testnet }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Switch failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Network Switched", 
        description: data.message
      });
      refetchNetwork();
      refetchCollection();
    },
    onError: (error: any) => {
      toast({ title: "Switch failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: demoCerts, refetch: refetchDemoCerts } = useQuery<{
    count: number;
    certificates: Array<{
      id: string;
      recipientAddress: string;
      courseId: string;
      courseName: string;
      nftStatus: string;
      nftTxHash: string;
      issuedAt: string;
    }>;
  }>({
    queryKey: ["/api/admin/demo-certificates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/demo-certificates", { headers });
      if (!res.ok) throw new Error("Failed to fetch demo certificates");
      return res.json();
    },
    enabled: authenticated,
    staleTime: 30000,
  });

  const deployCollectionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/deploy-collection", {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Deployment failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Collection Deployed", 
        description: `Commit: ${data.commitTxHash?.slice(0, 12)}... Reveal: ${data.revealTxHash?.slice(0, 12)}...` 
      });
      refetchCollection();
    },
    onError: (error: any) => {
      toast({ title: "Deploy failed", description: error.message, variant: "destructive" });
    },
  });

  const resetCertMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/certificates/${id}/reset`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Certificate reset", description: "Certificate status reset to pending" });
      refetchCerts();
      refetchReservations();
      refetchStats();
    },
    onError: (error: any) => {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reservation deleted" });
      refetchReservations();
      refetchStats();
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const resolveErrorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/errors/${id}/resolve`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error("Failed to resolve");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Error marked as resolved" });
      refetchErrors();
      refetchStats();
    },
  });

  const resetQuizAttemptsMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const res = await fetch("/api/admin/reset-quiz-attempts", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Quiz attempts reset", description: data.message });
      setResetWalletAddress("");
    },
    onError: (error: any) => {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    },
  });

  const remintCertMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/certificates/${id}/remint`, {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Re-mint failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Re-minted successfully", 
        description: `TX: ${data.nftTxHash?.slice(0, 16)}...` 
      });
      refetchCerts();
      refetchDemoCerts();
      refetchStats();
    },
    onError: (error: any) => {
      toast({ title: "Re-mint failed", description: error.message, variant: "destructive" });
    },
  });

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/admin/stats", { headers: { "x-admin-password": password } });
      if (res.ok) {
        setAuthenticated(true);
        toast({ title: "Authenticated", description: "Welcome to Admin Dashboard" });
      } else {
        toast({ title: "Authentication failed", description: "Invalid password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to authenticate", variant: "destructive" });
    }
  };

  const acceptKasiaHandshakeMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/admin/kasia/handshakes/${conversationId}/accept`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ recipientAlias: "Kaspa University Support" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept handshake");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Handshake accepted", description: `TX: ${data.txHash?.slice(0, 20)}...` });
      refetchKasia();
      refetchActiveConvs();
    },
    onError: (error: any) => {
      toast({ title: "Accept failed", description: error.message, variant: "destructive" });
    },
  });

  // Send admin message mutation
  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const res = await fetch(`/api/admin/kasia/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Message sent", description: `TX: ${data.txHash?.slice(0, 20)}...` });
      setAdminMessage("");
      refetchMessages();
    },
    onError: (error: any) => {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
    },
  });

  const refreshAll = () => {
    refetchStats();
    refetchCerts();
    refetchReservations();
    refetchErrors();
    refetchP2SH();
    refetchDemoCerts();
    refetchKasia();
    refetchTreasury();
    toast({ title: "Refreshed", description: "All data refreshed" });
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 16)}...${addr.slice(-8)}`;
  const formatDate = (date: string) => new Date(date).toLocaleString();

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      minting: "bg-blue-500/20 text-blue-400",
      claimed: "bg-green-500/20 text-green-400",
      finalized: "bg-green-500/20 text-green-400",
      expired: "bg-red-500/20 text-red-400",
      failed: "bg-red-500/20 text-red-400",
      paid: "bg-teal-500/20 text-teal-400",
    };
    return <Badge className={colors[status] || ""}>{status}</Badge>;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>Enter admin password to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              data-testid="input-admin-password"
            />
            <Button onClick={handleLogin} className="w-full" data-testid="button-login">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage certificates, reservations, and view errors</p>
          </div>
          <Button onClick={refreshAll} variant="outline" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Certificates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.certificates.total}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                  <span className="text-yellow-400">{stats.certificates.pending} pending</span>
                  <span className="text-blue-400">{stats.certificates.minting} minting</span>
                  <span className="text-green-400">{stats.certificates.claimed} claimed</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Reservations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reservations.total}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                  <span className="text-yellow-400">{stats.reservations.pending} pending</span>
                  <span className="text-green-400">{stats.reservations.finalized} finalized</span>
                  <span className="text-red-400">{stats.reservations.expired} expired</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.errors.total}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-red-400">{stats.errors.unresolved} unresolved</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {networkMode && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Network Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span>Current: {networkMode.testnet ? (
                  <Badge className="bg-blue-500/20 text-blue-400">Testnet-10</Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-400">Mainnet</Badge>
                )}</span>
                <span>Network: {networkMode.network}</span>
                <span>Ticker: {networkMode.ticker}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={networkMode.testnet ? "outline" : "default"}
                  size="sm"
                  onClick={() => switchNetworkMutation.mutate(false)}
                  disabled={switchNetworkMutation.isPending || !networkMode.testnet}
                  data-testid="button-switch-mainnet"
                >
                  Mainnet
                </Button>
                <Button
                  variant={networkMode.testnet ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchNetworkMutation.mutate(true)}
                  disabled={switchNetworkMutation.isPending || networkMode.testnet}
                  data-testid="button-switch-testnet"
                >
                  Testnet-10
                </Button>
                {switchNetworkMutation.isPending && (
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {networkMode.testnet 
                  ? "Safe for testing - no real KAS will be spent" 
                  : "Production mode - real KAS transactions"}
              </p>
            </CardContent>
          </Card>
        )}

        {collectionStatus && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                KRC-721 Collection: {collectionStatus.ticker}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span>Status: {collectionStatus.isDeployed ? (
                  <Badge className="bg-green-500/20 text-green-400">Deployed</Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400">Not Deployed</Badge>
                )}</span>
                <span>Live: {collectionStatus.isLive ? "Yes" : "No"}</span>
                <span>Next Token ID: {collectionStatus.nextTokenId}</span>
              </div>
              {collectionStatus.address && (
                <div className="text-sm space-y-1">
                  <div className="text-muted-foreground">Treasury Wallet:</div>
                  <div className="font-mono text-xs bg-muted/50 px-2 py-1 rounded break-all" data-testid="text-treasury-address">
                    {collectionStatus.address}
                  </div>
                </div>
              )}
              {!collectionStatus.isDeployed && collectionStatus.address && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => deployCollectionMutation.mutate()}
                    disabled={deployCollectionMutation.isPending || !collectionStatus.isLive}
                    data-testid="button-deploy-collection"
                  >
                    {deployCollectionMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wallet className="w-4 h-4 mr-2" />
                    )}
                    Deploy Collection (1,000 KAS)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/collection-status"] })}
                    data-testid="button-refresh-status"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                  {!collectionStatus.isLive && (
                    <span className="text-sm text-yellow-500">
                      RPC connecting... click Refresh in a few seconds
                    </span>
                  )}
                </div>
              )}
              {!collectionStatus.isDeployed && !collectionStatus.address && (
                <p className="text-sm text-muted-foreground">
                  Treasury wallet not configured. Add KASPA_TREASURY_MNEMONIC or KASPA_TREASURY_PRIVATEKEY secret.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="treasury" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="treasury" data-testid="tab-treasury">
              Treasury {treasuryStatus?.needsFunding && "(!)"}
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              Certificates ({certificates.length})
            </TabsTrigger>
            <TabsTrigger value="demo" data-testid="tab-demo">
              Demo {demoCerts && demoCerts.count > 0 && `(${demoCerts.count})`}
            </TabsTrigger>
            <TabsTrigger value="reservations" data-testid="tab-reservations">
              Reservations ({reservations.length})
            </TabsTrigger>
            <TabsTrigger value="errors" data-testid="tab-errors">
              Errors ({errors.length})
            </TabsTrigger>
            <TabsTrigger value="recovery" data-testid="tab-recovery">
              Recovery {p2shRecovery && p2shRecovery.totalStuckFunds > 0 && `(${p2shRecovery.totalStuckFunds})`}
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">
              Messages {kasiaHandshakes?.stats?.pendingHandshakes ? `(${kasiaHandshakes.stats.pendingHandshakes})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="treasury" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Treasury Status
                </CardTitle>
                <CardDescription>
                  Monitor treasury UTXO availability for KRC-721 whitelisting operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {treasuryLoading ? (
                  <div className="text-center text-muted-foreground py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Checking treasury status...
                  </div>
                ) : treasuryStatus ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-md ${
                      treasuryStatus.needsFunding 
                        ? "bg-red-500/10 border border-red-500/30" 
                        : "bg-green-500/10 border border-green-500/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        {treasuryStatus.needsFunding ? (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        ) : (
                          <Check className="w-5 h-5 text-green-400" />
                        )}
                        <span className={`font-semibold ${
                          treasuryStatus.needsFunding ? "text-red-400" : "text-green-400"
                        }`}>
                          {treasuryStatus.needsFunding ? "Treasury Needs Funding" : "Treasury Ready"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {treasuryStatus.message}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 border rounded-md">
                        <div className="text-xs text-muted-foreground">Spendable UTXOs</div>
                        <div className={`text-xl font-bold ${
                          treasuryStatus.spendableUtxos > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {treasuryStatus.spendableUtxos}
                        </div>
                      </div>
                      <div className="p-3 border rounded-md">
                        <div className="text-xs text-muted-foreground">Locked P2SH</div>
                        <div className="text-xl font-bold text-yellow-400">
                          {treasuryStatus.lockedP2shUtxos}
                        </div>
                      </div>
                      <div className="p-3 border rounded-md">
                        <div className="text-xs text-muted-foreground">Spendable Balance</div>
                        <div className={`text-xl font-bold ${
                          Number(treasuryStatus.spendableBalance) > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {(Number(treasuryStatus.spendableBalance) / 100000000).toFixed(2)} KAS
                        </div>
                      </div>
                      <div className="p-3 border rounded-md">
                        <div className="text-xs text-muted-foreground">Locked Balance</div>
                        <div className="text-xl font-bold text-yellow-400">
                          {(Number(treasuryStatus.lockedBalance) / 100000000).toFixed(2)} KAS
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Treasury Address</div>
                      <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                        {treasuryStatus.address}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Send KAS directly to this address to create spendable P2PK UTXOs for whitelisting operations.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchTreasury()}
                        data-testid="button-refresh-treasury"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh Status
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(treasuryStatus.address);
                          toast({ title: "Copied", description: "Treasury address copied to clipboard" });
                        }}
                        data-testid="button-copy-treasury"
                      >
                        Copy Address
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Failed to load treasury status</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => refetchTreasury()}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Certificates</CardTitle>
                <CardDescription>View and manage all NFT certificates</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-4 border rounded-md space-y-2"
                        data-testid={`cert-${cert.id}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-medium">{cert.courseName}</div>
                          {getStatusBadge(cert.nftStatus)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>ID: {cert.id}</div>
                          <div>Wallet: {formatAddress(cert.recipientAddress)}</div>
                          <div>Issued: {formatDate(cert.issuedAt)}</div>
                          {cert.imageUrl && (
                            <div className="truncate">Image: {cert.imageUrl}</div>
                          )}
                          {cert.nftTxHash && (
                            <div className="truncate">TX: {cert.nftTxHash}</div>
                          )}
                        </div>
                        {cert.nftStatus !== "claimed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetCertMutation.mutate(cert.id)}
                            disabled={resetCertMutation.isPending}
                            data-testid={`button-reset-${cert.id}`}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset to Pending
                          </Button>
                        )}
                      </div>
                    ))}
                    {certificates.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No certificates found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demo" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Demo Certificates
                </CardTitle>
                <CardDescription>
                  Certificates minted in demo mode (fake hashes). Re-mint them to the live blockchain.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!collectionStatus?.isLive && (
                  <div className="p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                    <div className="text-sm font-medium text-yellow-400">KRC-721 Service Not Live</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Re-minting requires live blockchain connection. Check RPC and treasury key configuration.
                    </p>
                  </div>
                )}
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {demoCerts?.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-4 border rounded-md space-y-2"
                        data-testid={`demo-cert-${cert.id}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-medium">{cert.courseName}</div>
                          <Badge className="bg-orange-500/20 text-orange-400">Demo Minted</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>ID: {cert.id}</div>
                          <div>Wallet: {formatAddress(cert.recipientAddress)}</div>
                          <div>Issued: {formatDate(cert.issuedAt)}</div>
                          <div className="truncate">Demo TX: {cert.nftTxHash}</div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => remintCertMutation.mutate(cert.id)}
                          disabled={remintCertMutation.isPending || !collectionStatus?.isLive}
                          data-testid={`button-remint-${cert.id}`}
                        >
                          {remintCertMutation.isPending ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3 mr-1" />
                          )}
                          Re-mint to Live Blockchain
                        </Button>
                      </div>
                    ))}
                    {(!demoCerts || demoCerts.certificates.length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No demo certificates found</p>
                        <p className="text-sm mt-1">All certificates have real blockchain transactions</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Mint Reservations</CardTitle>
                <CardDescription>Active and historical NFT mint reservations</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {reservations.map((res) => (
                      <div
                        key={res.id}
                        className="p-4 border rounded-md space-y-2"
                        data-testid={`reservation-${res.id}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-medium">Token #{res.tokenId}</div>
                          {getStatusBadge(res.status)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>ID: {res.id}</div>
                          <div>Certificate: {res.certificateId}</div>
                          <div>P2SH: {formatAddress(res.p2shAddress)}</div>
                          <div>Created: {formatDate(res.createdAt)}</div>
                          <div>Expires: {formatDate(res.expiresAt)}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteReservationMutation.mutate(res.id)}
                          disabled={deleteReservationMutation.isPending}
                          data-testid={`button-delete-${res.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    ))}
                    {reservations.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No reservations found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Logs</CardTitle>
                <CardDescription>Recent errors and issues for debugging</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {errors.map((err) => (
                      <div
                        key={err.id}
                        className={`p-4 border rounded-md space-y-2 ${
                          err.resolved ? "opacity-50" : ""
                        }`}
                        data-testid={`error-${err.id}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{err.category}</Badge>
                            <span className="font-medium">{err.action}</span>
                          </div>
                          {err.resolved ? (
                            <Badge className="bg-green-500/20 text-green-400">Resolved</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400">Unresolved</Badge>
                          )}
                        </div>
                        <div className="text-sm">{err.message}</div>
                        {err.details && Object.keys(err.details).length > 0 && (
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(err.details, null, 2)}
                          </pre>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {err.walletAddress && <div>Wallet: {formatAddress(err.walletAddress)}</div>}
                          <div>{formatDate(err.createdAt)}</div>
                        </div>
                        {!err.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveErrorMutation.mutate(err.id)}
                            disabled={resolveErrorMutation.isPending}
                            data-testid={`button-resolve-${err.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    ))}
                    {errors.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No errors found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recovery" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  P2SH Fund Recovery
                </CardTitle>
                <CardDescription>
                  Check for stuck funds in P2SH addresses from failed minting attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {p2shLoading ? (
                  <div className="text-center text-muted-foreground py-8">
                    Checking P2SH addresses for stuck funds...
                  </div>
                ) : p2shRecovery ? (
                  <div className="space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Scanned {p2shRecovery.scannedCount} of {p2shRecovery.totalReservations} reservations
                    </div>
                    
                    {p2shRecovery.hasErrors && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                        <div className="text-sm font-medium text-red-400">API Errors Encountered</div>
                        <ul className="text-xs text-muted-foreground mt-1 list-disc pl-4">
                          {p2shRecovery.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {p2shRecovery.totalStuckFunds > 0 ? (
                      <>
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                          <div className="text-lg font-semibold text-yellow-400">
                            {p2shRecovery.totalStuckKas} KAS stuck in {p2shRecovery.totalStuckFunds} P2SH addresses
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            These funds need to be recovered by completing the reveal transactions
                          </p>
                        </div>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-3">
                            {p2shRecovery.stuckFunds.map((fund) => (
                              <div
                                key={fund.p2shAddress}
                                className="p-4 border rounded-md space-y-2"
                                data-testid={`stuck-${fund.certificateId}`}
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="font-medium">{fund.courseName}</div>
                                  <Badge className="bg-yellow-500/20 text-yellow-400">
                                    {fund.balanceKas} KAS
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>Certificate: {fund.certificateId}</div>
                                  <div className="break-all">P2SH: {fund.p2shAddress}</div>
                                  <div>Status: {fund.status}</div>
                                  <div>Created: {formatDate(fund.createdAt)}</div>
                                </div>
                                <div className="text-xs text-primary">
                                  To recover: Reset certificate to pending, then retry minting
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No stuck funds found</p>
                        <p className="text-sm mt-1">All P2SH addresses have been processed correctly</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Click scan to check for stuck funds</p>
                  </div>
                )}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => refetchP2SH()}
                    disabled={p2shLoading}
                    data-testid="button-refresh-recovery"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${p2shLoading ? "animate-spin" : ""}`} />
                    Scan All P2SH Addresses
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  Reset Quiz Attempts
                </CardTitle>
                <CardDescription>
                  Remove quiz attempt limits for a wallet (useful for testing)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Enter wallet address (kaspa:...)"
                    value={resetWalletAddress}
                    onChange={(e) => setResetWalletAddress(e.target.value)}
                    className="flex-1 min-w-[300px]"
                    data-testid="input-reset-wallet"
                  />
                  <Button
                    onClick={() => {
                      if (resetWalletAddress.trim()) {
                        resetQuizAttemptsMutation.mutate(resetWalletAddress.trim());
                      }
                    }}
                    disabled={!resetWalletAddress.trim() || resetQuizAttemptsMutation.isPending}
                    data-testid="button-reset-attempts"
                  >
                    {resetQuizAttemptsMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Reset Attempts
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This will clear all quiz attempt history for the specified wallet, allowing unlimited retries.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Kasia Protocol Messages
                </CardTitle>
                <CardDescription>
                  On-chain encrypted messaging via Kasia Protocol. Accept pending handshakes to enable conversations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {kasiaHandshakes?.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 border rounded-md">
                      <div className="text-2xl font-bold">{kasiaHandshakes.stats.conversations}</div>
                      <div className="text-xs text-muted-foreground">Total Conversations</div>
                    </div>
                    <div className="p-3 border rounded-md">
                      <div className="text-2xl font-bold text-yellow-400">{kasiaHandshakes.stats.pendingHandshakes}</div>
                      <div className="text-xs text-muted-foreground">Pending Handshakes</div>
                    </div>
                    <div className="p-3 border rounded-md">
                      <div className="text-2xl font-bold text-green-400">{kasiaHandshakes.stats.activeConversations}</div>
                      <div className="text-xs text-muted-foreground">Active Conversations</div>
                    </div>
                    <div className="p-3 border rounded-md">
                      <div className="text-2xl font-bold">{kasiaHandshakes.stats.totalMessages}</div>
                      <div className="text-xs text-muted-foreground">Total Messages</div>
                    </div>
                  </div>
                )}
                
                <h3 className="font-medium mb-3">Pending Handshakes</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {kasiaHandshakes?.conversations?.map((conv) => (
                      <div
                        key={conv.id}
                        className="p-4 border rounded-md space-y-2"
                        data-testid={`handshake-${conv.id}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-medium text-sm">
                            {conv.initiatorAlias || "Anonymous User"}
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            {conv.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Conversation ID: {conv.id}</div>
                          <div>From: {formatAddress(conv.initiatorAddress)}</div>
                          <div>To: {formatAddress(conv.recipientAddress)}</div>
                          {conv.handshakeTxHash && (
                            <div className="truncate">Handshake TX: {conv.handshakeTxHash}</div>
                          )}
                          <div>Created: {formatDate(conv.createdAt)}</div>
                        </div>
                        {conv.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => acceptKasiaHandshakeMutation.mutate(conv.id)}
                            disabled={acceptKasiaHandshakeMutation.isPending}
                            data-testid={`button-accept-${conv.id}`}
                          >
                            {acceptKasiaHandshakeMutation.isPending ? (
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            Accept Handshake
                          </Button>
                        )}
                      </div>
                    ))}
                    {(!kasiaHandshakes?.conversations || kasiaHandshakes.conversations.length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No pending handshakes</p>
                        <p className="text-sm mt-1">All conversation requests have been accepted</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => { refetchKasia(); refetchActiveConvs(); }}
                    data-testid="button-refresh-kasia"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                <Separator className="my-6" />

                <h3 className="font-medium mb-3">Active Conversations ({activeConversationsData?.active?.length || 0})</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-md">
                    <ScrollArea className="h-[300px]">
                      <div className="p-2 space-y-1">
                        {activeConversationsData?.active?.map((conv) => (
                          <div
                            key={conv.id}
                            onClick={() => setSelectedConvId(conv.id)}
                            className={`p-3 rounded-md cursor-pointer hover-elevate ${selectedConvId === conv.id ? "bg-primary/10 border border-primary/30" : "border border-transparent"}`}
                            data-testid={`conv-item-${conv.id}`}
                          >
                            <div className="font-medium text-sm">
                              {conv.initiatorAlias || "Anonymous User"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {formatAddress(conv.initiatorAddress)}
                            </div>
                            <Badge variant="secondary" className="mt-1 text-xs bg-green-500/20 text-green-400">
                              Active
                            </Badge>
                          </div>
                        ))}
                        {(!activeConversationsData?.active || activeConversationsData.active.length === 0) && (
                          <div className="text-center text-muted-foreground py-8">
                            <p className="text-sm">No active conversations</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="border rounded-md flex flex-col">
                    {selectedConvId ? (
                      <>
                        <div className="p-3 border-b">
                          <div className="font-medium text-sm">
                            {conversationMessages?.conversation?.initiatorAlias || "Anonymous User"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAddress(conversationMessages?.conversation?.initiatorAddress || "")}
                          </div>
                        </div>
                        <ScrollArea className="flex-1 h-[180px] p-3">
                          <div className="space-y-2">
                            {conversationMessages?.messages?.map((msg, idx) => (
                              <div
                                key={msg.txHash || idx}
                                className={`p-2 rounded-md text-sm max-w-[85%] ${
                                  msg.senderAddress === conversationMessages?.conversation?.initiatorAddress
                                    ? "bg-muted"
                                    : "bg-primary/10 ml-auto"
                                }`}
                              >
                                <p className="break-words">{msg.encryptedContent}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {formatDate(msg.timestamp)}
                                </p>
                              </div>
                            ))}
                            {(!conversationMessages?.messages || conversationMessages.messages.length === 0) && (
                              <div className="text-center text-muted-foreground py-4">
                                <p className="text-sm">No messages yet</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                        <div className="p-3 border-t">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type a message..."
                              value={adminMessage}
                              onChange={(e) => setAdminMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && adminMessage.trim() && selectedConvId) {
                                  sendAdminMessageMutation.mutate({ conversationId: selectedConvId, content: adminMessage.trim() });
                                }
                              }}
                              data-testid="input-admin-message"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                if (adminMessage.trim() && selectedConvId) {
                                  sendAdminMessageMutation.mutate({ conversationId: selectedConvId, content: adminMessage.trim() });
                                }
                              }}
                              disabled={!adminMessage.trim() || sendAdminMessageMutation.isPending}
                              data-testid="button-send-admin-message"
                            >
                              {sendAdminMessageMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                "Send"
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p className="text-sm">Select a conversation to view messages</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
