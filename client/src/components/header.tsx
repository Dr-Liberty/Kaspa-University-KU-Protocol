import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet-context";
import { Wallet, LogOut, Menu, X, BookOpen, Award, LayoutDashboard, Play, ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import kuLogo from "@assets/generated_images/kaspa_university_ku_logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  const { 
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
    connectionError
  } = useWallet();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/certificates", label: "Certificates", icon: Award },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={kuLogo}
            alt="Kaspa University"
            className="h-10 w-10 rounded-full"
            data-testid="img-logo"
          />
          <span className="hidden text-lg font-semibold tracking-tight sm:block" data-testid="text-brand">
            Kaspa University
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid={`link-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {wallet ? (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 sm:flex">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    <span className="font-mono text-xs text-primary" data-testid="text-wallet-address">
                      {truncatedAddress}
                    </span>
                    {walletType === "kasware" && (
                      <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px]">
                        KasWare
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{wallet.address}</p>
                  <p className="text-xs text-muted-foreground">Network: {wallet.network}</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnect}
                data-testid="button-disconnect"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : isDemoMode ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Play className="h-3 w-3" />
                Demo Mode
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={connect}
                disabled={isConnecting}
                className="hidden gap-2 sm:flex"
                data-testid="button-connect-wallet-demo"
              >
                <Wallet className="h-4 w-4" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exitDemoMode}
                data-testid="button-exit-demo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {connectionError && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden items-center gap-1 text-destructive sm:flex">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{connectionError}</p>
                    {!isWalletInstalled && (
                      <a 
                        href="https://chromewebstore.google.com/detail/kasware-wallet/hklhheigdmpoolooomdihmhlpjjdbklf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Install KasWare Wallet <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={enterDemoMode}
                className="gap-2"
                data-testid="button-try-demo"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Try Demo</span>
              </Button>
              {isWalletInstalled ? (
                <Button
                  onClick={connect}
                  disabled={isConnecting}
                  className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  data-testid="button-connect-wallet"
                >
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={connect}
                      disabled={isConnecting}
                      className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                      data-testid="button-connect-wallet"
                    >
                      <Wallet className="h-4 w-4" />
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">KasWare wallet not detected</p>
                    <a 
                      href="https://chromewebstore.google.com/detail/kasware-wallet/hklhheigdmpoolooomdihmhlpjjdbklf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Install from Chrome Web Store <ExternalLink className="h-3 w-3" />
                    </a>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-16 border-b border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`link-mobile-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
