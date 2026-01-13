import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import type { Course, Certificate } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, CheckCircle2, Sparkles, Wallet, Loader2, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { useWhitelistStatus, useApplyWhitelist } from "@/hooks/use-whitelist";
import { useDiplomaStatus } from "@/hooks/use-diploma";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BlockDAGProgressProps {
  courses: Course[];
  certificates: Certificate[];
  walletConnected: boolean;
}

type NodeType = 'course' | 'blue' | 'red';

interface DAGNode {
  id: string;
  type: NodeType;
  course?: Course;
  isCompleted?: boolean;
  isMainChain: boolean;
  row: number;
  col: number;
  x: number;
  y: number;
}

interface DAGConnection {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isMainChain: boolean;
  isAnticone: boolean;
}

const CUBE_SIZE = 72;
const GAP = 10;
const ROW_HEIGHT = CUBE_SIZE + 28;
const MAX_COLS = 12;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function BlueCube({ node, delay }: { node: DAGNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="w-[72px] h-[72px] rounded-lg flex items-center justify-center bg-sky-400/80 border-2 border-sky-500/50"
    >
      <div className="w-5 h-5 rounded bg-sky-600/50" />
    </motion.div>
  );
}

function RedCube({ node, delay }: { node: DAGNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="w-[72px] h-[72px] rounded-lg flex items-center justify-center bg-rose-400/90 border-2 border-rose-500/60"
    >
      <div className="w-5 h-5 rounded bg-rose-600/50" />
    </motion.div>
  );
}

function DiplomaCube({ delay, isComplete }: { delay: number; isComplete: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`
        w-[72px] h-[72px] rounded-lg flex items-center justify-center
        ${isComplete 
          ? 'bg-gradient-to-br from-sky-400 to-blue-600 border-[3px] border-blue-500 shadow-lg shadow-blue-500/40' 
          : 'bg-slate-700/80 border-2 border-slate-600'
        }
      `}
    >
      <GraduationCap className={`w-8 h-8 ${isComplete ? 'text-white' : 'text-slate-500'}`} />
    </motion.div>
  );
}

function CourseBlock({ 
  node, 
  delay 
}: { 
  node: DAGNode;
  delay: number;
}) {
  const course = node.course!;
  const isCompleted = node.isCompleted ?? false;
  const isMainChain = node.isMainChain;
  
  return (
    <Link href={`/courses/${course.id}`} data-testid={`blockdag-course-${course.id}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.3 }}
        className="relative group cursor-pointer"
      >
        <div 
          className={`
            relative w-[72px] h-[72px] rounded-lg overflow-hidden transition-all hover:scale-105
            ${isMainChain 
              ? 'border-[3px] border-blue-600 shadow-lg shadow-blue-500/40' 
              : 'border-2 border-sky-500/60'
            }
          `}
        >
          {course.thumbnail ? (
            <img 
              src={course.thumbnail} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-sky-400 flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {course.title.charAt(0)}
              </span>
            </div>
          )}
          
          {isCompleted && (
            <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          )}
        </div>
        
        <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 -bottom-10 z-20 bg-popover border rounded-md px-2 py-1 shadow-lg whitespace-nowrap max-w-48">
          <p className="text-xs font-medium truncate">{course.title}</p>
        </div>
      </motion.div>
    </Link>
  );
}

type DiplomaMintStep = "idle" | "reserving" | "preview" | "signing" | "confirming" | "success" | "error";

interface DiplomaReservation {
  reservationId: string;
  tokenId: number;
  inscriptionJson: string;
  expiresAt: number;
  imageUrl?: string;
  royaltyTo?: string;
  royaltyFeeSompi?: string;
}

function getExplorerTxUrl(txHash: string): string {
  const isTestnet = import.meta.env.VITE_KASPA_NETWORK === "testnet-10";
  return isTestnet
    ? `https://explorer-tn10.kaspa.org/txs/${txHash}`
    : `https://explorer.kaspa.org/txs/${txHash}`;
}

export function BlockDAGProgress({ courses, certificates, walletConnected }: BlockDAGProgressProps) {
  const { toast } = useToast();
  const { wallet, isDemoMode, signKRC721Mint } = useWallet();
  const { data: whitelistStatus, refetch: refetchWhitelist } = useWhitelistStatus();
  const { data: diplomaStatus } = useDiplomaStatus();
  const applyWhitelistMutation = useApplyWhitelist();
  const queryClient = useQueryClient();
  const [showMintDialog, setShowMintDialog] = useState(false);
  
  const [mintStep, setMintStep] = useState<DiplomaMintStep>("idle");
  const [reservation, setReservation] = useState<DiplomaReservation | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [verifiedTokenId, setVerifiedTokenId] = useState<string | null>(null);
  const [expiryCountdown, setExpiryCountdown] = useState<number>(0);
  const [whitelistInProgress, setWhitelistInProgress] = useState(false);

  useEffect(() => {
    if (!reservation?.expiresAt) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((reservation.expiresAt - Date.now()) / 1000));
      setExpiryCountdown(remaining);
      if (remaining <= 0 && mintStep !== "success") {
        setMintError("Reservation expired. Please try again.");
        setMintStep("error");
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [reservation?.expiresAt, mintStep]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const { completedCourseIds, progressPercent, completedCount } = useMemo(() => {
    if (courses.length === 0) {
      return { completedCourseIds: new Set<string>(), progressPercent: 0, completedCount: 0 };
    }
    const completed = new Set(certificates.map(c => c.courseId));
    const count = completed.size;
    const percent = Math.round((count / courses.length) * 100);
    return { completedCourseIds: completed, progressPercent: percent, completedCount: count };
  }, [courses, certificates]);

  const isComplete = diplomaStatus?.isEligible ?? (courses.length > 0 && completedCount >= courses.length);
  const isWhitelisted = whitelistStatus?.isWhitelisted;
  const mintPrice = isWhitelisted ? "~20.5 KAS" : "~20,000 KAS";
  const DIPLOMA_MINT_ENABLED = true;

  const reserveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/diploma/reserve");
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to reserve diploma");
      }
      return data as DiplomaReservation & { success: true };
    },
    onSuccess: async (data) => {
      setReservation({
        reservationId: data.reservationId,
        tokenId: data.tokenId,
        inscriptionJson: data.inscriptionJson,
        expiresAt: data.expiresAt,
        imageUrl: data.imageUrl,
        royaltyTo: data.royaltyTo,
        royaltyFeeSompi: data.royaltyFeeSompi,
      });
      setMintStep("preview");
    },
    onError: (err: any) => {
      setMintError(err.message || "Failed to reserve diploma");
      setMintStep("error");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ reservationId, mintTxHash }: { reservationId: string; mintTxHash: string }) => {
      const response = await apiRequest("POST", `/api/nft/confirm/${reservationId}`, { mintTxHash });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm mint");
      }
      return data;
    },
    onSuccess: () => {
      setMintStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/diploma/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whitelist/status"] });
      toast({
        title: "Diploma Minted!",
        description: "Your KUDIPLOMA NFT has been successfully minted.",
      });
    },
    onError: (err: any) => {
      setMintError(err.message || "Failed to confirm mint");
      setMintStep("error");
    },
  });

  const handleMintDiploma = () => {
    if (!DIPLOMA_MINT_ENABLED) {
      toast({
        title: "Coming Soon",
        description: "Diploma minting will be available after testnet testing is complete.",
      });
      setShowMintDialog(false);
      return;
    }

    if (!wallet || isDemoMode) {
      toast({
        title: "Wallet Required",
        description: "Connect a real Kaspa wallet to mint your diploma NFT.",
        variant: "destructive",
      });
      return;
    }

    setMintStep("reserving");
    setMintError(null);
    setMintTxHash(null);
    reserveMutation.mutate();
  };

  const resetMintState = () => {
    setMintStep("idle");
    setReservation(null);
    setMintError(null);
    setMintTxHash(null);
    setVerifiedTokenId(null);
    setShowMintDialog(false);
  };

  const handleProceedToSign = async () => {
    if (!reservation || !wallet) return;
    
    setMintStep("signing");
    try {
      const isTestnet = import.meta.env.VITE_KASPA_NETWORK === "testnet-10";
      const network = isTestnet ? "testnet-10" : "mainnet";
      const indexerUrl = isTestnet ? "https://testnet-10.krc721.stream" : "https://mainnet.krc721.stream";
      
      await apiRequest("POST", `/api/nft/signing/${reservation.reservationId}`);
      
      console.log("[DiplomaMint] Calling signKRC721Mint...");
      console.log("[DiplomaMint] inscriptionJson:", reservation.inscriptionJson);
      console.log("[DiplomaMint] royaltyTo:", reservation.royaltyTo);
      console.log("[DiplomaMint] royaltyFeeSompi:", reservation.royaltyFeeSompi);
      const mintResult = await signKRC721Mint(reservation.inscriptionJson, {
        royaltyTo: reservation.royaltyTo,
        royaltyFeeSompi: reservation.royaltyFeeSompi,
      });
      const { revealTxId, commitTxId } = mintResult;
      
      console.log("[DiplomaMint] Mint result - revealTxId:", revealTxId, "commitTxId:", commitTxId);
      setMintTxHash(revealTxId);
      setMintStep("confirming");
      
      const txVerifyUrl = `${indexerUrl}/api/v1/krc721/${network}/ops/txid/${encodeURIComponent(revealTxId)}`;
      console.log("[DiplomaMint] Verifying via:", txVerifyUrl);
      
      let verified = false;
      let newTokenId: string | null = null;
      const maxAttempts = 12;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log(`[DiplomaMint] Verification attempt ${attempt + 1}/${maxAttempts}...`);
          
          const response = await fetch(txVerifyUrl);
          console.log(`[DiplomaMint] Response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log("[DiplomaMint] Transaction data:", JSON.stringify(data));
            
            if (data.message === "success" && data.result) {
              const opResult = data.result;
              
              if (opResult.op === "mint" && opResult.tick === "KUDIPLOMA") {
                if (opResult.opError) {
                  console.error("[DiplomaMint] Transaction has error:", opResult.opError);
                  throw new Error(`Mint rejected: ${opResult.opError}`);
                }
                
                const tokenId = opResult.opData?.tokenId || opResult.tokenId;
                if (tokenId) {
                  verified = true;
                  newTokenId = String(tokenId);
                  setVerifiedTokenId(newTokenId);
                  console.log("[DiplomaMint] Verified token ID:", newTokenId);
                  break;
                }
              }
            }
          }
        } catch (e: any) {
          if (e.message?.includes("Mint rejected")) {
            throw e;
          }
          console.log(`[DiplomaMint] Verification attempt ${attempt + 1} failed:`, e);
        }
      }
      
      if (!verified) {
        // Transaction was broadcast but indexer didn't recognize it as a valid KRC-721 mint
        // This typically means insufficient PoW fee (requires 10 KAS minimum)
        console.log("[DiplomaMint] Indexer verification failed - mint may not be valid");
        console.log("[DiplomaMint] Possible causes: insufficient PoW fee (<10 KAS), invalid inscription format, or indexer issue");
        
        try {
          await apiRequest("POST", `/api/nft/cancel/${reservation.reservationId}`);
        } catch {}
        
        setMintError(
          "The transaction was broadcast but the KRC-721 indexer did not recognize it as a valid mint. " +
          "This may indicate insufficient PoW fee (10 KAS minimum required). " +
          "Transaction ID: " + revealTxId
        );
        setMintStep("error");
        return;
      }
      
      // Only confirm if indexer verified the mint
      confirmMutation.mutate({ reservationId: reservation.reservationId, mintTxHash: revealTxId });
    } catch (err: any) {
      console.error("[DiplomaMint] Signing failed:", err);
      try {
        await apiRequest("POST", `/api/nft/cancel/${reservation.reservationId}`);
      } catch {}
      setMintError(err.message || "Failed to sign transaction");
      setMintStep("error");
    }
  };

  const handleCancelMint = async () => {
    if (!reservation) {
      resetMintState();
      return;
    }
    
    try {
      await apiRequest("POST", `/api/nft/cancel/${reservation.reservationId}`);
    } catch {}
    
    toast({
      title: "Mint Cancelled",
      description: "You can try minting again when ready.",
    });
    resetMintState();
  };

  const handleGetWhitelisted = async () => {
    if (!wallet || isDemoMode) {
      toast({
        title: "Wallet Required",
        description: "Connect a real Kaspa wallet to get whitelisted.",
        variant: "destructive",
      });
      return;
    }

    setWhitelistInProgress(true);
    try {
      const result = await applyWhitelistMutation.mutateAsync();
      if (result.success) {
        toast({
          title: "Whitelisting Started",
          description: "Your whitelist transaction has been submitted. Please wait for confirmation.",
        });
        // Poll for confirmation with proper async handling
        const pollForWhitelist = async () => {
          for (let attempts = 0; attempts < 20; attempts++) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const { data: status } = await refetchWhitelist();
            if (status?.isWhitelisted) {
              setWhitelistInProgress(false);
              toast({
                title: "Whitelisted!",
                description: "You can now mint your diploma at the discounted price.",
              });
              return;
            }
          }
          // Max attempts reached
          setWhitelistInProgress(false);
          toast({
            title: "Still Processing",
            description: "Whitelist may take a few minutes to confirm. The status will update automatically.",
          });
        };
        pollForWhitelist(); // Run in background
      } else {
        throw new Error(result.error || "Whitelist failed");
      }
    } catch (err: any) {
      setWhitelistInProgress(false);
      toast({
        title: "Whitelist Failed",
        description: err.message || "Failed to apply whitelist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { nodes, connections, rows, totalWidth, totalHeight, diplomaNode } = useMemo(() => {
    const allNodes: DAGNode[] = [];
    const allConnections: DAGConnection[] = [];
    const rowsData: DAGNode[][] = [];
    
    let courseIndex = 0;
    const totalCourses = courses.length;
    
    const rowWidths = [1, 2, 4, 5, 7, 8, 9, 10, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    
    const getCoursesForRow = (row: number): number => {
      if (row < 4) return 1;
      if (row < 6) return 2;
      return Math.min(2 + Math.floor((row - 4) / 2), 4);
    };
    
    let rowIdx = 0;
    
    while (courseIndex < totalCourses && rowIdx < rowWidths.length) {
      const rowWidth = rowWidths[rowIdx];
      const coursesInRow = Math.min(getCoursesForRow(rowIdx), totalCourses - courseIndex);
      const fillerCount = rowWidth - coursesInRow;
      
      const redCount = rowIdx >= 2 && fillerCount >= 2 
        ? Math.floor(seededRandom(rowIdx * 77 + 13) * Math.min(3, Math.ceil(fillerCount * 0.4)))
        : 0;
      const blueCount = fillerCount - redCount;
      
      const rowItems: Array<{ type: NodeType; course?: Course; isCompleted?: boolean }> = [];
      
      for (let i = 0; i < coursesInRow && courseIndex < totalCourses; i++) {
        const course = courses[courseIndex];
        rowItems.push({
          type: 'course',
          course,
          isCompleted: completedCourseIds.has(course.id)
        });
        courseIndex++;
      }
      
      for (let i = 0; i < blueCount; i++) {
        rowItems.push({ type: 'blue' });
      }
      
      for (let i = 0; i < redCount; i++) {
        rowItems.push({ type: 'red' });
      }
      
      const shuffledItems = shuffleWithSeed(rowItems, rowIdx * 31 + 7);
      
      const maxRowWidth = MAX_COLS * (CUBE_SIZE + GAP);
      const rowStartX = (maxRowWidth - rowWidth * (CUBE_SIZE + GAP) + GAP) / 2;
      
      const rowNodes: DAGNode[] = shuffledItems.map((item, colIdx) => {
        const x = rowStartX + colIdx * (CUBE_SIZE + GAP) + CUBE_SIZE / 2;
        const y = rowIdx * ROW_HEIGHT + CUBE_SIZE / 2;
        
        // Main chain only on course blocks
        const isMainChain = item.type === 'course';
        
        return {
          id: item.type === 'course' ? item.course!.id : `${item.type}-${rowIdx}-${colIdx}`,
          type: item.type,
          course: item.course,
          isCompleted: item.isCompleted,
          isMainChain,
          row: rowIdx,
          col: colIdx,
          x,
          y
        };
      });
      
      allNodes.push(...rowNodes);
      rowsData.push(rowNodes);
      rowIdx++;
    }
    
    // Build connections ensuring every course connects to at least one other course
    for (let r = 1; r < rowsData.length; r++) {
      const currentRow = rowsData[r];
      const prevRow = rowsData[r - 1];
      const prevPrevRow = r > 1 ? rowsData[r - 2] : null;
      
      // Find courses in previous rows for guaranteed connections
      const prevRowCourses = prevRow.filter(n => n.type === 'course');
      const prevPrevRowCourses = prevPrevRow?.filter(n => n.type === 'course') || [];
      
      currentRow.forEach((node, nodeIdx) => {
        const numParents = Math.min(
          Math.floor(seededRandom(r * 50 + nodeIdx) * 3) + 2,
          prevRow.length
        );
        
        const parentIndices = new Set<number>();
        
        // If this is a course, first ensure connection to a course in prev row (or prev-prev if none in prev)
        if (node.type === 'course') {
          if (prevRowCourses.length > 0) {
            // Connect to nearest course in previous row
            const courseIdx = Math.floor(seededRandom(r * 777 + nodeIdx) * prevRowCourses.length);
            const courseParent = prevRowCourses[courseIdx];
            const parentRowIdx = prevRow.findIndex(n => n.id === courseParent.id);
            if (parentRowIdx >= 0) {
              parentIndices.add(parentRowIdx);
            }
          } else if (prevPrevRowCourses.length > 0) {
            // No courses in prev row, connect to prev-prev row course
            const courseIdx = Math.floor(seededRandom(r * 888 + nodeIdx) * prevPrevRowCourses.length);
            const skipCourse = prevPrevRowCourses[courseIdx];
            
            allConnections.push({
              fromId: skipCourse.id,
              toId: node.id,
              fromX: skipCourse.x,
              fromY: skipCourse.y + CUBE_SIZE / 2,
              toX: node.x,
              toY: node.y - CUBE_SIZE / 2,
              isMainChain: true,
              isAnticone: false
            });
          }
        }
        
        // Add additional random parents
        for (let p = 0; p < numParents * 2 && parentIndices.size < numParents; p++) {
          const offset = Math.floor(seededRandom(r * 25 + nodeIdx * 5 + p) * 3) - 1;
          let targetIdx = Math.max(0, Math.min(prevRow.length - 1, nodeIdx + offset));
          
          if (parentIndices.has(targetIdx)) {
            targetIdx = Math.floor(seededRandom(r * 100 + nodeIdx * 10 + p) * prevRow.length);
          }
          
          parentIndices.add(targetIdx);
        }
        
        parentIndices.forEach(parentIdx => {
          const parent = prevRow[parentIdx];
          
          // Skip red connections to course blocks
          if (node.type === 'course' && parent.type === 'red') return;
          if (parent.type === 'course' && node.type === 'red') return;
          
          // Main chain only between courses
          const isMainChainConnection = node.type === 'course' && parent.type === 'course';
          const isAnticoneConnection = node.type === 'red' || parent.type === 'red';
          
          allConnections.push({
            fromId: parent.id,
            toId: node.id,
            fromX: parent.x,
            fromY: parent.y + CUBE_SIZE / 2,
            toX: node.x,
            toY: node.y - CUBE_SIZE / 2,
            isMainChain: isMainChainConnection,
            isAnticone: isAnticoneConnection
          });
        });
        
        // Add row-skipping connections for non-course nodes
        if (prevPrevRow && node.type !== 'course' && seededRandom(r * 200 + nodeIdx) > 0.5) {
          const skipCount = Math.floor(seededRandom(r * 150 + nodeIdx) * 2) + 1;
          
          for (let s = 0; s < skipCount && s < prevPrevRow.length; s++) {
            const skipParentIdx = Math.floor(seededRandom(r * 300 + nodeIdx + s * 50) * prevPrevRow.length);
            const skipParent = prevPrevRow[skipParentIdx];
            
            // Skip red connections to course blocks
            if (skipParent.type === 'course') continue;
            
            const isAnticoneConnection = node.type === 'red' || skipParent.type === 'red';
            
            allConnections.push({
              fromId: skipParent.id,
              toId: node.id,
              fromX: skipParent.x,
              fromY: skipParent.y + CUBE_SIZE / 2,
              toX: node.x,
              toY: node.y - CUBE_SIZE / 2,
              isMainChain: false,
              isAnticone: isAnticoneConnection
            });
          }
        }
      });
    }
    
    // Add diploma node at the bottom center
    const maxRowWidth = MAX_COLS * (CUBE_SIZE + GAP);
    const diplomaY = rowsData.length * ROW_HEIGHT + CUBE_SIZE / 2 + 32;
    const diplomaX = maxRowWidth / 2;
    
    const diploma: DAGNode = {
      id: 'diploma',
      type: 'course',
      isMainChain: true,
      row: rowsData.length,
      col: 0,
      x: diplomaX,
      y: diplomaY
    };
    
    // Connect all bottom row nodes to diploma
    const bottomRow = rowsData[rowsData.length - 1];
    if (bottomRow) {
      bottomRow.forEach(node => {
        // Skip red nodes connecting to diploma
        if (node.type === 'red') return;
        
        allConnections.push({
          fromId: node.id,
          toId: 'diploma',
          fromX: node.x,
          fromY: node.y + CUBE_SIZE / 2,
          toX: diplomaX,
          toY: diplomaY - CUBE_SIZE / 2,
          isMainChain: node.type === 'course',
          isAnticone: false
        });
      });
    }
    
    const height = (rowsData.length + 1) * ROW_HEIGHT + 80;
    
    return {
      nodes: allNodes,
      connections: allConnections,
      rows: rowsData,
      totalWidth: maxRowWidth,
      totalHeight: height,
      diplomaNode: diploma
    };
  }, [courses, completedCourseIds]);

  if (!walletConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Your Learning Journey</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Connect your wallet to track your progress through the BlockDAG and earn your diploma NFT.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Badge variant="outline" className="gap-1 text-xs bg-slate-800 border-slate-600 text-slate-200">
              <Sparkles className="w-3 h-3" />
              BlockDAG Journey
            </Badge>
            <Badge 
              variant={isComplete ? "default" : "secondary"} 
              className={`gap-1 ${isComplete ? 'bg-sky-500' : 'bg-slate-700 text-slate-200'}`}
            >
              {progressPercent}% Complete
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Progress to Diploma</span>
              <span className="font-medium text-slate-200">{completedCount} / {courses.length} courses</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="relative overflow-x-auto pb-8">
            <div 
              className="relative mx-auto"
              style={{ 
                width: totalWidth,
                height: totalHeight
              }}
            >
              <svg 
                className="absolute inset-0 pointer-events-none"
                width={totalWidth}
                height={totalHeight}
                style={{ overflow: 'visible' }}
              >
                {connections.map((conn, idx) => {
                  const midY = (conn.fromY + conn.toY) / 2;
                  
                  let strokeColor = "rgba(148, 163, 184, 0.4)";
                  let strokeWidth = 1;
                  let strokeDasharray = "4,3";
                  
                  if (conn.isAnticone) {
                    strokeColor = "rgba(244, 63, 94, 0.5)";
                    strokeWidth = 1.5;
                    strokeDasharray = "5,3";
                  } else if (conn.isMainChain) {
                    strokeColor = "rgba(37, 99, 235, 0.9)";
                    strokeWidth = 3;
                    strokeDasharray = "none";
                  }
                  
                  return (
                    <path
                      key={idx}
                      d={`M ${conn.fromX} ${conn.fromY} C ${conn.fromX} ${midY}, ${conn.toX} ${midY}, ${conn.toX} ${conn.toY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                    />
                  );
                })}
              </svg>

              {rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="absolute flex"
                  style={{
                    left: (totalWidth - row.length * (CUBE_SIZE + GAP) + GAP) / 2,
                    top: rowIdx * ROW_HEIGHT,
                    gap: GAP
                  }}
                >
                  {row.map((node, nodeIdx) => {
                    const delay = rowIdx * 0.05 + nodeIdx * 0.02;
                    
                    if (node.type === 'course' && node.course) {
                      return (
                        <CourseBlock
                          key={node.id}
                          node={node}
                          delay={delay}
                        />
                      );
                    } else if (node.type === 'red') {
                      return (
                        <RedCube 
                          key={node.id}
                          node={node}
                          delay={delay}
                        />
                      );
                    } else {
                      return (
                        <BlueCube 
                          key={node.id}
                          node={node}
                          delay={delay}
                        />
                      );
                    }
                  })}
                </div>
              ))}
              
              {/* Diploma cube at the bottom center */}
              <div
                className="absolute flex justify-center"
                style={{
                  left: totalWidth / 2 - CUBE_SIZE / 2,
                  top: rows.length * ROW_HEIGHT + 32
                }}
              >
                <DiplomaCube 
                  delay={rows.length * 0.05}
                  isComplete={isComplete}
                />
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className={`
              mt-6 p-4 rounded-lg border-2 transition-all
              ${isComplete 
                ? 'border-sky-500 bg-sky-500/10' 
                : 'border-dashed border-slate-600 bg-slate-800/50'
              }
            `}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className={`
                w-16 h-16 rounded-lg flex items-center justify-center shrink-0
                ${isComplete ? 'bg-sky-500 text-white' : 'bg-slate-700'}
              `}>
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-100">
                  {isComplete ? "Diploma Unlocked!" : "Kaspa University Diploma"}
                </h4>
                <p className="text-sm text-slate-400">
                  {isComplete 
                    ? "Congratulations! You can now mint your KRC-721 diploma NFT." 
                    : `Complete ${courses.length - completedCount} more course${courses.length - completedCount === 1 ? '' : 's'} to unlock your diploma.`
                  }
                </p>
              </div>
              {isComplete && (
                isWhitelisted ? (
                  <Button 
                    onClick={() => setShowMintDialog(true)}
                    className="shrink-0 gap-2 bg-sky-500 hover:bg-sky-600"
                    data-testid="button-mint-diploma"
                  >
                    <Wallet className="w-4 h-4" />
                    Mint Diploma (~20.5 KAS)
                  </Button>
                ) : whitelistStatus?.needsWhitelist ? (
                  <Button 
                    onClick={handleGetWhitelisted}
                    className="shrink-0 gap-2 bg-emerald-500 hover:bg-emerald-600"
                    disabled={isDemoMode || whitelistInProgress || applyWhitelistMutation.isPending}
                    data-testid="button-get-whitelisted"
                  >
                    {whitelistInProgress || applyWhitelistMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Whitelisting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Get Whitelisted (Free)
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="shrink-0 gap-2"
                    disabled
                    data-testid="button-checking-whitelist"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking Status...
                  </Button>
                )
              )}
            </div>
          </motion.div>
        </div>

      <Dialog open={showMintDialog} onOpenChange={(open) => {
        if (!open && mintStep !== "reserving" && mintStep !== "signing" && mintStep !== "confirming") {
          resetMintState();
        } else {
          setShowMintDialog(open);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sky-500" />
              {mintStep === "success" ? "Diploma Minted!" : "Mint Your Diploma NFT"}
            </DialogTitle>
            <DialogDescription>
              {mintStep === "idle" && `You've completed all ${courses.length} courses! Mint your diploma as a KRC-721 NFT on the Kaspa blockchain.`}
              {mintStep === "reserving" && "Reserving your token..."}
              {mintStep === "signing" && "Please sign the transaction in your wallet."}
              {mintStep === "confirming" && "Confirming your mint on the blockchain..."}
              {mintStep === "success" && "Your KUDIPLOMA NFT has been successfully minted!"}
              {mintStep === "error" && "Something went wrong during the minting process."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {mintStep === "idle" && (
              <>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Courses Completed</span>
                    <span className="font-medium">{completedCount} / {courses.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mint Price</span>
                    <span className="font-medium">{mintPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Whitelist Status</span>
                    <Badge variant={isWhitelisted ? "default" : "secondary"} className="gap-1">
                      {isWhitelisted ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Whitelisted
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </div>
                </div>

                {!isWhitelisted && (
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 space-y-1">
                    <p className="text-xs font-medium text-yellow-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Whitelist Required
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click "Get Whitelisted" to unlock the discounted mint price of ~20 KAS.
                      Without whitelisting, minting costs 20,000 KAS.
                    </p>
                  </div>
                )}

                {/* Step 1: Get Whitelisted button (shows when not whitelisted) */}
                {!isWhitelisted && (
                  <Button 
                    onClick={handleGetWhitelisted}
                    disabled={whitelistInProgress || isDemoMode}
                    className="w-full gap-2"
                    data-testid="button-get-whitelisted"
                  >
                    {whitelistInProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Whitelisting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Get Whitelisted (Free)
                      </>
                    )}
                  </Button>
                )}

                {/* Step 2: Mint Diploma button (shows when whitelisted) */}
                {isWhitelisted && (
                  <Button 
                    onClick={handleMintDiploma}
                    disabled={!DIPLOMA_MINT_ENABLED || isDemoMode}
                    className="w-full gap-2"
                    data-testid="button-confirm-mint-diploma"
                  >
                    {DIPLOMA_MINT_ENABLED ? (
                      <>
                        <Wallet className="w-4 h-4" />
                        Mint Diploma ({mintPrice})
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Coming Soon
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            {mintStep === "preview" && reservation && (
              <div className="space-y-4">
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                  <p className="text-sm font-medium text-yellow-500 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Review Before Signing
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You're about to sign a KRC-721 mint transaction. Your wallet will show a "Batch Transfer" 
                    prompt - this is normal for the commit-reveal inscription process.
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <div className="text-center pb-2 border-b border-border">
                    <span className="text-sm font-medium">Transaction Details</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Collection</span>
                    <Badge variant="outline">KUDIPLOMA</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Token ID</span>
                    <Badge variant="secondary">Random (assigned on-chain)</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Est. Cost</span>
                    <span className="font-medium text-primary">~20.5 KAS</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Process</span>
                    <span className="text-xs text-muted-foreground">Commit + Reveal (batched)</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Reservation expires in {formatTime(expiryCountdown)}</span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancelMint} 
                    className="flex-1"
                    data-testid="button-cancel-preview"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleProceedToSign} 
                    className="flex-1 gap-2"
                    data-testid="button-approve-wallet"
                  >
                    <Wallet className="w-4 h-4" />
                    Approve in Wallet
                  </Button>
                </div>
              </div>
            )}

            {(mintStep === "reserving" || mintStep === "signing" || mintStep === "confirming") && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">
                      {mintStep === "reserving" && "Reserving Token..."}
                      {mintStep === "signing" && "Awaiting Wallet Signature"}
                      {mintStep === "confirming" && "Confirming Transaction..."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {mintStep === "reserving" && "Preparing your diploma NFT slot."}
                      {mintStep === "signing" && "Please confirm in your KasWare wallet"}
                      {mintStep === "confirming" && "Verifying on-chain..."}
                    </p>
                  </div>
                </div>
                
                {reservation && (mintStep === "signing" || mintStep === "confirming") && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Reservation expires in {formatTime(expiryCountdown)}</span>
                  </div>
                )}
              </div>
            )}

            {mintStep === "success" && (
              <div className="space-y-4">
                {reservation?.imageUrl && (
                  <div className="flex justify-center">
                    <div className="relative overflow-hidden rounded-lg border bg-muted/30 p-2">
                      <img 
                        src={reservation.imageUrl.startsWith("ipfs://") 
                          ? `https://ipfs.io/ipfs/${reservation.imageUrl.replace("ipfs://", "")}`
                          : reservation.imageUrl
                        }
                        alt="KUDIPLOMA NFT"
                        className="max-h-48 w-auto rounded object-contain"
                        data-testid="img-diploma-nft"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const cid = reservation.imageUrl?.replace("ipfs://", "") || "";
                          if (target.src.includes("ipfs.io")) {
                            target.src = `https://gateway.pinata.cloud/ipfs/${cid}`;
                          } else if (target.src.includes("pinata.cloud")) {
                            target.src = `https://cloudflare-ipfs.com/ipfs/${cid}`;
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">
                      {verifiedTokenId && verifiedTokenId !== "pending" 
                        ? `KUDIPLOMA #${verifiedTokenId}` 
                        : "KUDIPLOMA Minted Successfully"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {verifiedTokenId === "pending" 
                        ? "Your diploma has been minted! Token ID will appear shortly on the indexer."
                        : "Your diploma has been verified on the Kaspa blockchain."}
                    </p>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Token ID</span>
                    <Badge variant="outline">
                      {verifiedTokenId === "pending" 
                        ? "Pending..." 
                        : verifiedTokenId 
                          ? `#${verifiedTokenId}` 
                          : "#Verified"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Collection</span>
                    <span className="font-medium">KUDIPLOMA</span>
                  </div>
                </div>
                
                {mintTxHash && (
                  <a
                    href={getExplorerTxUrl(mintTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-sky-500 hover:underline"
                    data-testid="link-mint-tx"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Transaction
                  </a>
                )}

                <Button onClick={resetMintState} className="w-full" data-testid="button-close-mint-success">
                  Close
                </Button>
              </div>
            )}

            {mintStep === "error" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Minting Failed</p>
                    <p className="text-sm text-muted-foreground">
                      {mintError || "An unexpected error occurred."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetMintState} className="flex-1" data-testid="button-cancel-mint">
                    Cancel
                  </Button>
                  <Button onClick={handleMintDiploma} className="flex-1" data-testid="button-retry-mint">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
