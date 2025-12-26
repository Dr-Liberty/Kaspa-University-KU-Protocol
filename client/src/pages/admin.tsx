import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Trash2, RotateCcw, Check, Lock, AlertTriangle, FileText, Database, Shield } from "lucide-react";
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

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
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

        <Tabs defaultValue="certificates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              Certificates ({certificates.length})
            </TabsTrigger>
            <TabsTrigger value="reservations" data-testid="tab-reservations">
              Reservations ({reservations.length})
            </TabsTrigger>
            <TabsTrigger value="errors" data-testid="tab-errors">
              Errors ({errors.length})
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
        </Tabs>
      </div>
    </div>
  );
}
