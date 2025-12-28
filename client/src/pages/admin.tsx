import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Trash2, RotateCcw, Check, Lock, AlertTriangle, FileText, Database, Shield, Wallet } from "lucide-react";
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

  const refreshAll = () => {
    refetchStats();
    refetchCerts();
    refetchReservations();
    refetchErrors();
    refetchP2SH();
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
              {!collectionStatus.isDeployed && collectionStatus.isLive && (
                <Button
                  onClick={() => deployCollectionMutation.mutate()}
                  disabled={deployCollectionMutation.isPending}
                  data-testid="button-deploy-collection"
                >
                  {deployCollectionMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wallet className="w-4 h-4 mr-2" />
                  )}
                  Deploy Collection (10 KAS)
                </Button>
              )}
              {!collectionStatus.isDeployed && !collectionStatus.isLive && (
                <p className="text-sm text-muted-foreground">
                  KRC-721 service is not live. Check RPC connection and treasury keys.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="certificates" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              Certificates ({certificates.length})
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
          </TabsList>

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
        </Tabs>
      </div>
    </div>
  );
}
