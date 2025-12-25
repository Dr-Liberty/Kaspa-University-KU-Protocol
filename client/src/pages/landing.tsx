import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/stats-bar";
import { BlockDAGBackground } from "@/components/blockdag-background";
import { useWallet } from "@/lib/wallet-context";
import {
  Coins,
  Award,
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import kuLogo from "@assets/generated_images/ku_hexagon_logo_zoomed.png";

export default function Landing() {
  const { wallet, isDemoMode, enterDemoMode } = useWallet();

  const features = [
    {
      icon: Coins,
      title: "Instant KAS Rewards",
      description:
        "Earn KAS tokens instantly when you complete quizzes. Rewards are sent directly to your wallet with sub-second confirmation.",
    },
    {
      icon: Award,
      title: "On-Chain Certificates",
      description:
        "Receive verifiable KRC-721 NFT certificates for each completed course. Your achievements are permanently recorded on Kaspa.",
    },
    {
      icon: MessageSquare,
      title: "P2P Discussions",
      description:
        "Participate in decentralized Q&A. Every question and answer is recorded on-chain, creating an immutable knowledge base.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Connect Wallet",
      description: "Link your Kaspa wallet to get started. No registration or email required.",
    },
    {
      number: "02",
      title: "Choose a Course",
      description: "Browse our curated courses on blockchain, Kaspa, and Web3 technology.",
    },
    {
      number: "03",
      title: "Learn & Earn",
      description: "Complete lessons and quizzes to earn KAS rewards sent directly to you.",
    },
    {
      number: "04",
      title: "Get Certified",
      description: "Receive an NFT certificate as proof of your achievement, verifiable on-chain.",
    },
  ];

  const benefits = [
    "No registration fees",
    "Instant KAS rewards",
    "Verifiable NFT certificates",
    "Decentralized discussions",
    "Sub-second transactions",
    "True ownership of credentials",
  ];

  return (
    <div className="flex flex-col">
      <BlockDAGBackground />
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
            Learn Blockchain.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Earn KAS.
            </span>
          </h1>

          <p
            className="max-w-2xl text-lg text-muted-foreground md:text-xl"
            data-testid="text-hero-subtitle"
          >
            Master blockchain technology while earning real cryptocurrency rewards.
            Complete courses, earn instant KAS, and receive verifiable NFT certificates
            on the world's fastest proof-of-work blockchain.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
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
            <Link href="/courses">
              <Button size="lg" className="gap-2 text-base" data-testid="button-start-learning">
                Start Learning
                <ArrowRight className="h-5 w-5" />
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
            {benefits.slice(0, 3).map((benefit) => (
              <div key={benefit} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
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

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card"
                data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
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

      <section className="px-4 py-20">
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
                to blockchain mastery starts here.
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
            Powered by the world's fastest proof-of-work blockchain.
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
