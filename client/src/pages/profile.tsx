import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { User, Wallet, Save, ArrowLeft, Loader2, ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface UserProfile {
  id: string;
  walletAddress: string;
  displayName?: string;
  avatarUrl?: string;
  totalKasEarned: number;
  createdAt: string;
}

export default function Profile() {
  const { wallet, truncatedAddress, isDemoMode } = useWallet();
  const { toast } = useToast();
  const isAuthenticated = !!wallet || isDemoMode;
  
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setAvatarUrl(profile.avatarUrl || "");
      setAvatarError(false);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: { displayName?: string; avatarUrl?: string }) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      displayName: displayName.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
    });
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.slice(0, 2).toUpperCase();
    }
    if (truncatedAddress) {
      return truncatedAddress.slice(0, 2).toUpperCase();
    }
    return "KU";
  };

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-center mb-4">
              Connect your Kaspa wallet to manage your profile
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Customize how you appear across Kaspa University
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 pb-6 border-b">
            <Avatar className="h-24 w-24">
              {avatarUrl && !avatarError ? (
                <AvatarImage 
                  src={avatarUrl} 
                  alt={displayName || "Profile"} 
                  onError={() => setAvatarError(true)}
                />
              ) : null}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-medium">{displayName || truncatedAddress}</p>
              <p className="text-sm text-muted-foreground">{truncatedAddress}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                data-testid="input-display-name"
              />
              <p className="text-xs text-muted-foreground">
                This name will appear in messages and on leaderboards
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Avatar URL
              </Label>
              <Input
                id="avatarUrl"
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setAvatarError(false);
                }}
                maxLength={500}
                data-testid="input-avatar-url"
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to an image (HTTPS preferred)
              </p>
              {avatarError && avatarUrl && (
                <p className="text-xs text-destructive">
                  Failed to load image. Please check the URL.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Connected Wallet</span>
              <code className="text-sm bg-muted px-2 py-1 rounded" data-testid="text-wallet-address">
                {truncatedAddress}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total KAS Earned</span>
              <span className="font-medium" data-testid="text-kas-earned">
                {profile?.totalKasEarned?.toFixed(2) || "0.00"} KAS
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Member Since</span>
              <span className="text-sm" data-testid="text-member-since">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
