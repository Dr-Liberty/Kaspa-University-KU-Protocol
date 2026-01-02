import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Course, Certificate } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, CheckCircle2, Sparkles, Wallet, Loader2 } from "lucide-react";
import { useWhitelistStatus } from "@/hooks/use-whitelist";
import { useDiplomaStatus } from "@/hooks/use-diploma";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";

interface BlockDAGProgressProps {
  courses: Course[];
  certificates: Certificate[];
  walletConnected: boolean;
}

type NodeType = 'course' | 'decorative' | 'anticone';

interface DAGNode {
  id: string;
  type: NodeType;
  course?: Course;
  isCompleted?: boolean;
  isMainChain?: boolean;
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
const GAP = 16;
const ROW_HEIGHT = CUBE_SIZE + 50;
const MAX_COLS = 10;

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

function KaspaCoinAvatar({ className = "" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 64 64" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="coinGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#coinGradient)" filter="url(#coinGlow)" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
      <text 
        x="32" 
        y="40" 
        textAnchor="middle" 
        fontSize="22" 
        fontWeight="bold" 
        fill="#ffffff"
        fontFamily="Arial Black, sans-serif"
      >
        K
      </text>
    </svg>
  );
}

function DecorativeCube({ node, delay }: { node: DAGNode; delay: number }) {
  const isAnticone = node.type === 'anticone';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`
        w-[72px] h-[72px] rounded-lg flex items-center justify-center
        ${isAnticone 
          ? 'bg-gradient-to-br from-red-500/50 to-red-600/30 border-2 border-red-500/60 shadow-lg shadow-red-500/20' 
          : 'bg-gradient-to-br from-primary/50 to-primary/30 border-2 border-primary/50 shadow-lg shadow-primary/20'
        }
      `}
    >
      <div className={`w-5 h-5 rounded-md ${isAnticone ? 'bg-red-500/70' : 'bg-primary/70'}`} />
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
  const isMainChain = node.isMainChain ?? false;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="relative group"
    >
      <div 
        className={`
          relative w-[72px] h-[72px] rounded-lg overflow-hidden transition-all
          ${isMainChain 
            ? 'border-[3px] border-primary shadow-xl shadow-primary/40' 
            : 'border-2 border-primary/60 shadow-lg shadow-primary/20'
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
          <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary/30 flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">
              {course.title.charAt(0)}
            </span>
          </div>
        )}
        
        {isCompleted && (
          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        )}
      </div>
      
      <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 -bottom-12 z-20 bg-popover border rounded-md px-3 py-1.5 shadow-lg whitespace-nowrap max-w-52">
        <p className="text-xs font-medium truncate">{course.title}</p>
      </div>
    </motion.div>
  );
}

export function BlockDAGProgress({ courses, certificates, walletConnected }: BlockDAGProgressProps) {
  const { toast } = useToast();
  const { wallet, isDemoMode } = useWallet();
  const { data: whitelistStatus } = useWhitelistStatus();
  const { data: diplomaStatus } = useDiplomaStatus();
  const [showMintDialog, setShowMintDialog] = useState(false);

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
  const mintPrice = isWhitelisted ? "~10 KAS" : "~20,000 KAS";
  const DIPLOMA_MINT_ENABLED = false;

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

    toast({
      title: "Minting Not Available",
      description: "Diploma NFT minting is not yet implemented.",
    });
    setShowMintDialog(false);
  };

  const { nodes, connections, rows, totalWidth, totalHeight } = useMemo(() => {
    const allNodes: DAGNode[] = [];
    const allConnections: DAGConnection[] = [];
    const rowsData: DAGNode[][] = [];
    
    let courseIndex = 0;
    const totalCourses = courses.length;
    let rowIdx = 0;
    
    const getCoursesForRow = (row: number): number => {
      if (row < 4) return 1;
      if (row < 6) return 2;
      return Math.min(2 + Math.floor((row - 4) / 2), 5);
    };
    
    const getRowWidth = (row: number): number => {
      if (row === 0) return 1;
      if (row === 1) return 2;
      if (row === 2) return 3;
      if (row === 3) return 4;
      if (row === 4) return 5;
      if (row === 5) return 6;
      if (row === 6) return 7;
      if (row === 7) return 8;
      if (row === 8) return 9;
      return MAX_COLS;
    };
    
    while (courseIndex < totalCourses) {
      const rowWidth = getRowWidth(rowIdx);
      const coursesInRow = Math.min(getCoursesForRow(rowIdx), totalCourses - courseIndex);
      const decorativeCount = rowWidth - coursesInRow;
      
      const anticoneCount = rowIdx >= 3 && decorativeCount >= 2 
        ? Math.floor(seededRandom(rowIdx * 77) * Math.min(2, Math.floor(decorativeCount / 3))) 
        : 0;
      const normalDecorativeCount = decorativeCount - anticoneCount;
      
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
      
      for (let i = 0; i < normalDecorativeCount; i++) {
        rowItems.push({ type: 'decorative' });
      }
      
      for (let i = 0; i < anticoneCount; i++) {
        rowItems.push({ type: 'anticone' });
      }
      
      const shuffledItems = shuffleWithSeed(rowItems, rowIdx * 31 + 7);
      
      const rowStartX = ((MAX_COLS - rowWidth) / 2) * (CUBE_SIZE + GAP);
      
      const rowNodes: DAGNode[] = shuffledItems.map((item, colIdx) => {
        const x = rowStartX + colIdx * (CUBE_SIZE + GAP) + CUBE_SIZE / 2;
        const y = rowIdx * ROW_HEIGHT + CUBE_SIZE / 2;
        
        const isMainChain = item.type === 'course' && 
          (seededRandom(rowIdx * 100 + colIdx) > 0.5 || rowIdx === 0);
        
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
    
    for (let r = 1; r < rowsData.length; r++) {
      const currentRow = rowsData[r];
      const prevRow = rowsData[r - 1];
      const prevPrevRow = r > 1 ? rowsData[r - 2] : null;
      
      currentRow.forEach((node, nodeIdx) => {
        const numParents = Math.floor(seededRandom(r * 50 + nodeIdx) * 2) + 1;
        
        for (let p = 0; p < numParents && p < prevRow.length; p++) {
          const parentIdx = Math.floor(seededRandom(r * 25 + nodeIdx * 5 + p) * prevRow.length);
          const parent = prevRow[parentIdx];
          
          const isMainChainConnection = (node.isMainChain ?? false) && (parent.isMainChain ?? false);
          const isAnticoneConnection = node.type === 'anticone' || parent.type === 'anticone';
          
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
        }
        
        if (prevPrevRow && seededRandom(r * 200 + nodeIdx) > 0.65) {
          const skipParentIdx = Math.floor(seededRandom(r * 300 + nodeIdx) * prevPrevRow.length);
          const skipParent = prevPrevRow[skipParentIdx];
          
          const isAnticoneConnection = node.type === 'anticone' || skipParent.type === 'anticone';
          
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
      });
    }
    
    const maxRowWidth = MAX_COLS * (CUBE_SIZE + GAP);
    const height = rowsData.length * ROW_HEIGHT + 40;
    
    return {
      nodes: allNodes,
      connections: allConnections,
      rows: rowsData,
      totalWidth: maxRowWidth,
      totalHeight: height
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
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-gradient-to-b from-background via-card to-background p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Badge variant="outline" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" />
              BlockDAG Journey
            </Badge>
            <Badge 
              variant={isComplete ? "default" : "secondary"} 
              className={`gap-1 ${isComplete ? 'bg-primary' : ''}`}
            >
              {progressPercent}% Complete
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to Diploma</span>
              <span className="font-medium">{completedCount} / {courses.length} courses</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="relative overflow-x-auto pb-8">
            <div 
              className="relative mx-auto"
              style={{ 
                width: totalWidth,
                height: totalHeight,
                minWidth: '100%'
              }}
            >
              <svg 
                className="absolute inset-0 pointer-events-none"
                width={totalWidth}
                height={totalHeight}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="6"
                    markerHeight="6"
                    refX="3"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 6 3, 0 6" fill="hsl(var(--primary))" />
                  </marker>
                </defs>
                
                {connections.map((conn, idx) => {
                  const midY = (conn.fromY + conn.toY) / 2;
                  
                  let strokeColor = "hsl(var(--border))";
                  let strokeWidth = 1;
                  let strokeDasharray = "4,4";
                  let opacity = 0.4;
                  
                  if (conn.isAnticone) {
                    strokeColor = "hsl(0, 70%, 50%)";
                    strokeWidth = 1.5;
                    strokeDasharray = "6,3";
                    opacity = 0.5;
                  } else if (conn.isMainChain) {
                    strokeColor = "hsl(var(--primary))";
                    strokeWidth = 2.5;
                    strokeDasharray = "none";
                    opacity = 0.8;
                  }
                  
                  return (
                    <path
                      key={idx}
                      d={`M ${conn.fromX} ${conn.fromY} C ${conn.fromX} ${midY}, ${conn.toX} ${midY}, ${conn.toX} ${conn.toY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      opacity={opacity}
                    />
                  );
                })}
              </svg>

              {rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="absolute flex"
                  style={{
                    left: ((MAX_COLS - row.length) / 2) * (CUBE_SIZE + GAP),
                    top: rowIdx * ROW_HEIGHT,
                    gap: GAP
                  }}
                >
                  {row.map((node, nodeIdx) => {
                    const delay = rowIdx * 0.08 + nodeIdx * 0.03;
                    
                    if (node.type === 'course' && node.course) {
                      return (
                        <CourseBlock
                          key={node.id}
                          node={node}
                          delay={delay}
                        />
                      );
                    } else {
                      return (
                        <DecorativeCube 
                          key={node.id}
                          node={node}
                          delay={delay}
                        />
                      );
                    }
                  })}
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className={`
              mt-6 p-4 rounded-lg border-2 transition-all
              ${isComplete 
                ? 'border-primary bg-primary/10' 
                : 'border-dashed border-border bg-muted/30'
              }
            `}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className={`
                w-16 h-16 rounded-lg flex items-center justify-center shrink-0
                ${isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted'}
              `}>
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold">
                  {isComplete ? "Diploma Unlocked!" : "Kaspa University Diploma"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isComplete 
                    ? "Congratulations! You can now mint your KRC-721 diploma NFT." 
                    : `Complete ${courses.length - completedCount} more course${courses.length - completedCount === 1 ? '' : 's'} to unlock your diploma.`
                  }
                </p>
              </div>
              {isComplete && (
                <Button 
                  onClick={() => setShowMintDialog(true)}
                  className="shrink-0 gap-2"
                  disabled={isDemoMode || !isWhitelisted}
                  data-testid="button-mint-diploma"
                >
                  <Wallet className="w-4 h-4" />
                  Mint Diploma
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </CardContent>

      <Dialog open={showMintDialog} onOpenChange={setShowMintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Mint Your Diploma NFT
            </DialogTitle>
            <DialogDescription>
              You've completed all {courses.length} courses! Mint your diploma as a KRC-721 NFT on the Kaspa blockchain.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              <p className="text-xs text-center text-muted-foreground">
                You'll be whitelisted automatically after course completion. This may take a few minutes.
              </p>
            )}

            <Button 
              onClick={handleMintDiploma}
              disabled={!DIPLOMA_MINT_ENABLED || !isWhitelisted || isDemoMode}
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
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
