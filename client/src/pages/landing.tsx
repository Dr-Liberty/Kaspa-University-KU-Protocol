import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/stats-bar";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import {
  Coins,
  Award,
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Shield,
  AlertTriangle,
  ShieldAlert,
  BarChart3,
  Link2,
  FileText,
  Layers,
  Lock,
  Globe,
  GraduationCap,
  MessagesSquare,
  Key,
  Signature,
} from "lucide-react";
import kuLogo from "@assets/generated_images/ku_hexagon_logo_zoomed.png";

interface SecurityCheck {
  isFlagged: boolean;
  isVpn: boolean;
  vpnScore: number;
  flags: string[];
  rewardsBlocked: boolean;
}

export default function Landing() {
  const { wallet, isDemoMode, enterDemoMode } = useWallet();

  const { data: securityCheck } = useQuery<SecurityCheck>({
    queryKey: ["/api/security/check"],
    staleTime: 60000,
  });

  const features = [
    {
      icon: Coins,
      title: "Earn 0.1 KAS Per Course",
      description:
        "Complete quizzes and earn real KAS tokens. Each course rewards 0.1 KAS, sent directly to your wallet via on-chain transactions.",
    },
    {
      icon: Award,
      title: "KRC-721 NFT Diploma",
      description:
        "Complete all 16 courses to earn your diploma NFT. Whitelist-based minting means graduates pay only network fees while others pay 20,000 KAS.",
    },
    {
      icon: MessagesSquare,
      title: "Dual-Protocol Messaging",
      description:
        "Public Q&A via K Protocol for ecosystem discovery, plus end-to-end encrypted P2P messaging via Kasia Protocol for private discussions.",
    },
    {
      icon: Signature,
      title: "Wallet-Signed Messages",
      description:
        "Every message is signed by your wallet for cryptographic attribution. Your contributions are verifiable and permanently tied to your identity.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Connect Your Wallet",
      description: "Connect via KasWare browser extension or try demo mode. No email or registration required.",
    },
    {
      number: "02",
      title: "Complete Course Lessons",
      description: "Study the lesson content and pass the quiz with 70% or higher to earn rewards.",
    },
    {
      number: "03",
      title: "Earn KAS On-Chain",
      description: "Quiz results are recorded on Kaspa L1 via KU Protocol. 0.1 KAS becomes claimable.",
    },
    {
      number: "04",
      title: "Claim Your NFT Certificate",
      description: "Complete all lessons to unlock your KRC-721 certificate with non-custodial minting.",
    },
  ];

  const benefits = [
    "No registration required",
    "4 on-chain protocols",
    "Encrypted P2P messaging",
    "Wallet-signed attribution",
    "Anti-Sybil protection",
    "Non-custodial minting",
  ];

  const protocols = [
    {
      id: "ku",
      name: "KU Protocol",
      tagline: "Achievement Proofs",
      icon: GraduationCap,
      color: "from-primary to-primary/70",
      format: "ku:1:quiz:{data}",
      description: "Records quiz completions on-chain. Each passing score generates a verifiable proof transaction.",
      features: ["Quiz result verification", "Score attestation", "Reward eligibility"],
    },
    {
      id: "k",
      name: "K Protocol",
      tagline: "Public Comments",
      icon: Globe,
      color: "from-accent to-accent/70",
      format: "k:1:post:{content}",
      description: "Public Q&A indexed by ecosystem K-indexers. Your comments are discoverable across the Kaspa ecosystem.",
      features: ["Ecosystem indexing", "Cross-platform discovery", "Public attribution"],
    },
    {
      id: "kasia",
      name: "Kasia Protocol",
      tagline: "Encrypted Messaging",
      icon: Lock,
      color: "from-violet-500 to-violet-500/70",
      format: "ciph_msg:1:comm:{encrypted}",
      description: "End-to-end encrypted P2P messaging with handshake-based key exchange. Private conversations on-chain.",
      features: ["E2E encryption", "Handshake key exchange", "Private P2P chat"],
    },
    {
      id: "krc721",
      name: "KRC-721",
      tagline: "NFT Diplomas",
      icon: Award,
      color: "from-amber-500 to-amber-500/70",
      format: "{p:\"krc-721\",op:\"mint\",...}",
      description: "Diploma NFTs for graduates. Whitelist-based pricing: 0 KAS for graduates, 20,000 KAS deterrent for others.",
      features: ["Verifiable credentials", "Whitelist pricing", "1,000 max supply"],
    },
  ];

  return (
    <div className="flex flex-col">
      
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute right-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-accent/10 blur-[80px]" />
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <img
              src={kuLogo}
              alt="Kaspa University"
              className="h-24 w-24 rounded-full shadow-lg shadow-primary/20 md:h-32 md:w-32"
              data-testid="img-hero-logo"
            />
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Zap className="h-4 w-4" />
              First Kaspa L1 Learn-to-Earn Platform
            </div>
          </div>

          <h1
            className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
            data-testid="text-hero-title"
          >
            Learn BlockDAG.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Earn KAS.
            </span>
          </h1>

          <p
            className="max-w-2xl text-lg text-muted-foreground md:text-xl"
            data-testid="text-hero-subtitle"
          >
            Master BlockDAG technology while earning real cryptocurrency rewards.
            Powered by 4 on-chain protocols: KU for achievements, K for public Q&A, 
            Kasia for encrypted messaging, and KRC-721 for diploma NFTs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/courses">
              <Button size="lg" className="gap-2 text-base" data-testid="button-start-learning">
                Start Learning
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/analytics">
              <Button size="lg" className="gap-2 text-base" data-testid="button-analytics-hero">
                <BarChart3 className="h-5 w-5" />
                Analytics
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary to-accent text-base text-primary-foreground"
                data-testid="button-dashboard-hero"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Button>
            </Link>
            {!wallet && !isDemoMode && (
              <Button
                variant="outline"
                size="lg"
                onClick={enterDemoMode}
                className="gap-2 text-base"
                data-testid="button-try-demo-hero"
              >
                <Zap className="h-5 w-5" />
                Try Demo
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div 
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/50 px-4 py-2"
            data-testid="banner-vpn-warning"
          >
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Important:</span> Please disable your VPN before connecting your wallet. VPN usage may flag your account.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/50 bg-card/30 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <StatsBar />
        </div>
      </section>

      <section className="px-4 py-20" id="features">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Why Learn with Kaspa University?
            </h2>
            <p className="mt-4 text-muted-foreground">
              The first truly decentralized education platform powered by Kaspa L1
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card"
                data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/50 bg-card/30 px-4 py-20" id="how-it-works">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How It Works</h2>
            <p className="mt-4 text-muted-foreground">
              Start earning in four simple steps
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-border/50 bg-background p-6"
                data-testid={`step-${step.number}`}
              >
                <div className="mb-4 text-4xl font-bold text-primary/20">{step.number}</div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-primary/30 lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20" id="protocol-stack">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              The Protocol Stack
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Four interconnected protocols power Kaspa University. Each handles a specific aspect of decentralized education, 
              from achievements to messaging to credentials.
            </p>
          </div>

          <div className="relative mb-12">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-[300px] w-[300px] rounded-full border-2 border-dashed border-primary/20" />
              <div className="absolute h-[200px] w-[200px] rounded-full border-2 border-dashed border-accent/20" />
            </div>
            
            <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {protocols.map((protocol, index) => (
                <div
                  key={protocol.id}
                  className="group relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 transition-all hover:border-primary/40 hover:bg-card"
                  data-testid={`protocol-${protocol.id}`}
                >
                  <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${protocol.color} p-2.5 text-white`}>
                    <protocol.icon className="h-5 w-5" />
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold">{protocol.name}</h3>
                    <span className="text-xs text-muted-foreground">{protocol.tagline}</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {protocol.description}
                  </p>
                  
                  <div className="rounded-md bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground break-all mb-3">
                    {protocol.format}
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {protocol.features.map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-6 text-center">How They Work Together</h3>
            
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent via-violet-500 to-amber-500 -translate-y-1/2 opacity-30" />
              
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Step 1
                  </div>
                  <GraduationCap className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">Complete Quiz</p>
                  <p className="text-xs text-muted-foreground mt-1">KU Protocol records your achievement on-chain</p>
                </div>
                
                <div className="relative rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                    Step 2
                  </div>
                  <Globe className="mx-auto mb-2 h-8 w-8 text-accent" />
                  <p className="text-sm font-medium">Ask Questions</p>
                  <p className="text-xs text-muted-foreground mt-1">K Protocol posts public Q&A, indexed ecosystem-wide</p>
                </div>
                
                <div className="relative rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-xs font-semibold text-white">
                    Step 3
                  </div>
                  <Lock className="mx-auto mb-2 h-8 w-8 text-violet-500" />
                  <p className="text-sm font-medium">Private Chat</p>
                  <p className="text-xs text-muted-foreground mt-1">Kasia Protocol enables encrypted P2P messaging</p>
                </div>
                
                <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-semibold text-white">
                    Step 4
                  </div>
                  <Award className="mx-auto mb-2 h-8 w-8 text-amber-500" />
                  <p className="text-sm font-medium">Claim Diploma</p>
                  <p className="text-xs text-muted-foreground mt-1">KRC-721 mints your NFT diploma after all courses</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-violet-500/5 p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Key className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Wallet-Signed Attribution</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Every message and achievement is cryptographically signed by your wallet. Your contributions are permanently 
              attributable to your identity, creating an immutable record of your educational journey on Kaspa L1.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <Link href="/verify">
                <Button variant="outline" className="gap-2" data-testid="button-verify-cta">
                  <Shield className="h-4 w-4" />
                  Protocol Explorer
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline" className="gap-2" data-testid="button-messages-cta">
                  <MessageSquare className="h-4 w-4" />
                  Encrypted Messages
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/50 bg-card/30 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 text-center md:p-12">
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-[60px]" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-accent/20 blur-[60px]" />

            <div className="relative">
              <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Ready to Start Earning?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Join the first decentralized Learn-to-Earn platform on Kaspa. Your journey
                to BlockDAG mastery starts here.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                    data-testid="button-cta-dashboard"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" className="gap-2" data-testid="button-cta-courses">
                    Explore Courses
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 bg-card/30 px-4 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3">
            <img src={kuLogo} alt="Kaspa University" className="h-8 w-8 rounded-full" />
            <span className="font-semibold">Kaspa University</span>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            The first decentralized Learn-to-Earn platform built on Kaspa L1.
            Powered by the world's fastest proof-of-work BlockDAG.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Built for Kaspathon 2026</span>
            <span className="text-primary/50">|</span>
            <a
              href="https://kaspa.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Learn about Kaspa
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
