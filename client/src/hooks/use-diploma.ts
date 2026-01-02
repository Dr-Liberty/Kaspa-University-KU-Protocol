import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-context";

export interface DiplomaStatus {
  isEligible: boolean;
  coursesCompleted: number;
  totalCoursesRequired: number;
  progressPercent: number;
  nftStatus: "not_eligible" | "eligible" | "minting" | "minted";
  completedCourseIds?: string[];
  remainingCourses?: number;
  reason?: string;
}

export function useDiplomaStatus() {
  const { wallet } = useWallet();
  
  return useQuery<DiplomaStatus>({
    queryKey: ["/api/diploma/status"],
    enabled: !!wallet,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  });
}
