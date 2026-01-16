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
    "KU Protocol achievements",
    "K Protocol public Q&A",
    "Kasia encrypted messaging",
    "KRC-721 diploma NFTs",
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
      features: ["Verifiable credentials", "Whitelist pricing", "10,000 max supply"],
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
            className="mt-6 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/50 px-4 py-3"
            data-testid="banner-notices"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Important:</span> Please disable your VPN before connecting your wallet. VPN usage may flag your account.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                This is a Beta platform and open source utility for the kaspa ecosystem
              </p>
            </div>
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
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="rounded-lg bg-primary p-2 text-primary-foreground">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Learn & Earn</p>
                    <p className="text-sm text-muted-foreground">Complete quizzes to record achievements via KU Protocol and earn 0.1 KAS per course</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
                  <div className="rounded-lg bg-accent p-2 text-accent-foreground">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Public Discussion</p>
                    <p className="text-sm text-muted-foreground">Ask questions in lesson Q&A using K Protocol. Your posts are indexed by ecosystem K-indexers for cross-platform discovery</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="rounded-lg bg-violet-500 p-2 text-white">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Private Encrypted Messaging</p>
                    <p className="text-sm text-muted-foreground">Use Kasia Protocol for end-to-end encrypted P2P chats: contact admin support, message instructors, or DM other learners privately</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="rounded-lg bg-amber-500 p-2 text-white">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Graduate & Mint</p>
                    <p className="text-sm text-muted-foreground">Complete all 16 courses to unlock your KRC-721 diploma NFT with whitelist pricing (graduates pay only network fees)</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Key className="h-4 w-4 text-primary" />
              <span>All messages and achievements are wallet-signed for cryptographic attribution</span>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">What is KU Protocol?</h3>
              <p className="text-muted-foreground mb-4">
                KU Protocol is our custom on-chain data format for recording educational achievements on Kaspa L1. 
                Every quiz completion generates a unique payload that is embedded in a real blockchain transaction.
              </p>
              <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs break-all">
                <span className="text-primary">ku:1:quiz:</span>
                <span className="text-muted-foreground">wallet:courseId:lessonId:score:maxScore:timestamp:contentHash</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">How KU Protocol Works</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">1</span>
                  <span>Quiz answers are hashed and signed by your wallet</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">2</span>
                  <span>A proof transaction with embedded KU payload is sent to Kaspa L1</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">3</span>
                  <span>Your reward (0.1 KAS) becomes claimable on-chain</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">4</span>
                  <span>Anyone can verify your achievement using the blockchain explorer</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-6 text-center">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">True Decentralization:</span>{" "}
              Unlike traditional platforms, your achievements exist independently on Kaspa L1. 
              Even if Kaspa University goes offline, your credentials remain verifiable forever on the blockchain.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <Link href="/verify">
                <Button variant="outline" className="gap-2" data-testid="button-verify-cta">
                  <Shield className="h-4 w-4" />
                  KU Protocol Explorer
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
