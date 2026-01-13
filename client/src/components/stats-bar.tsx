import { useQuery } from "@tanstack/react-query";
import type { Stats } from "@shared/schema";
import { Coins, GraduationCap, Users, Shield } from "lucide-react";

interface ExplorerTransaction {
  type: string;
}

interface ExplorerScanResult {
  transactions?: ExplorerTransaction[];
}

export function StatsBar() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: explorerData } = useQuery<ExplorerScanResult>({
    queryKey: ["/api/explorer/scan"],
    refetchInterval: 30000,
  });

  // Use on-chain data when available (more accurate than database)
  const onChainQuizProofs = explorerData?.transactions?.filter(t => t.type === "quiz").length || 0;
  const onChainKasDistributed = onChainQuizProofs * 0.101;

  const items = [
    {
      label: "Total KAS Distributed",
      value: (onChainKasDistributed > 0 ? onChainKasDistributed : (stats?.totalKasDistributed ?? 0)).toFixed(2),
      icon: Coins,
      suffix: " KAS",
    },
    {
      label: "Diplomas Minted",
      value: stats?.certificatesMinted?.toLocaleString() ?? "0",
      icon: GraduationCap,
      suffix: "",
    },
    {
      label: "Active Learners",
      value: stats?.activeLearners?.toLocaleString() ?? "0",
      icon: Users,
      suffix: "",
    },
    {
      label: "Quiz Proofs On-Chain",
      value: stats?.quizProofsOnChain?.toLocaleString() ?? "0",
      icon: Shield,
      suffix: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="group flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/50 p-4 text-center transition-colors hover:border-primary/30 hover:bg-card"
          data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="rounded-full bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
            <item.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {item.value}
            <span className="text-lg text-primary">{item.suffix}</span>
          </div>
          <div className="text-xs text-muted-foreground">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
