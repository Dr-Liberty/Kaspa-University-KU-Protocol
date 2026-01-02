import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Course, Certificate } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, CheckCircle2, Lock, Sparkles, Wallet, Loader2 } from "lucide-react";
import { useWhitelistStatus } from "@/hooks/use-whitelist";
import { useDiplomaStatus } from "@/hooks/use-diploma";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";

interface BlockDAGProgressProps {
  courses: Course[];
  certificates: Certificate[];
  walletConnected: boolean;
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

function DecorativeCube({ delay, isActive = false }: { delay: number; isActive?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: isActive ? 0.9 : 0.5, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`
        w-20 h-20 rounded-lg flex items-center justify-center
        ${isActive 
          ? 'bg-gradient-to-br from-primary/60 to-primary/30 border-2 border-primary/50 shadow-lg shadow-primary/20' 
          : 'bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20'
        }
      `}
    >
      <div className={`w-5 h-5 rounded-md ${isActive ? 'bg-primary/80' : 'bg-primary/40'}`} />
    </motion.div>
  );
}

function CourseBlock({ 
  course, 
  isCompleted, 
  delay 
}: { 
  course: Course; 
  isCompleted: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="relative group"
    >
      <div 
        className={`
          relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all
          ${isCompleted 
            ? 'border-primary shadow-lg shadow-primary/30' 
            : 'border-border/50 opacity-70 grayscale'
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
          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
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
        
        {!isCompleted && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 -bottom-10 z-20 bg-popover border rounded-md px-3 py-1.5 shadow-lg whitespace-nowrap max-w-48">
        <p className="text-xs font-medium truncate">{course.title}</p>
      </div>
    </motion.div>
  );
}

function seededRandom(seed: number) {
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

  const dagRows = useMemo(() => {
    const rows: Array<{
      items: Array<{ type: 'course' | 'decorative'; course?: Course; isCompleted?: boolean; id: string }>;
      rowIndex: number;
    }> = [];
    
    let courseIndex = 0;
    const totalCourses = courses.length;
    
    const rowSizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let rowIdx = 0;
    
    while (courseIndex < totalCourses && rowIdx < rowSizes.length) {
      const rowSize = rowSizes[rowIdx];
      const row: typeof rows[0] = { items: [], rowIndex: rowIdx };
      
      const coursesInThisRow = Math.min(
        Math.ceil(rowSize / 2),
        totalCourses - courseIndex
      );
      
      const decorativeCount = rowSize - coursesInThisRow;
      
      const items: typeof row.items = [];
      
      for (let i = 0; i < coursesInThisRow && courseIndex < totalCourses; i++) {
        const course = courses[courseIndex];
        items.push({
          type: 'course',
          course,
          isCompleted: completedCourseIds.has(course.id),
          id: course.id
        });
        courseIndex++;
      }
      
      for (let i = 0; i < decorativeCount; i++) {
        items.push({
          type: 'decorative',
          id: `dec-${rowIdx}-${i}`
        });
      }
      
      row.items = shuffleWithSeed(items, rowIdx * 17 + 42);
      rows.push(row);
      rowIdx++;
    }
    
    while (courseIndex < totalCourses) {
      const rowSize = Math.min(10, totalCourses - courseIndex + 4);
      const row: typeof rows[0] = { items: [], rowIndex: rowIdx };
      
      const coursesInThisRow = Math.min(rowSize - 2, totalCourses - courseIndex);
      const decorativeCount = rowSize - coursesInThisRow;
      
      const items: typeof row.items = [];
      
      for (let i = 0; i < coursesInThisRow && courseIndex < totalCourses; i++) {
        const course = courses[courseIndex];
        items.push({
          type: 'course',
          course,
          isCompleted: completedCourseIds.has(course.id),
          id: course.id
        });
        courseIndex++;
      }
      
      for (let i = 0; i < decorativeCount; i++) {
        items.push({
          type: 'decorative',
          id: `dec-${rowIdx}-${i}`
        });
      }
      
      row.items = shuffleWithSeed(items, rowIdx * 17 + 42);
      rows.push(row);
      rowIdx++;
    }
    
    return rows;
  }, [courses, completedCourseIds]);

  const connectionLines = useMemo(() => {
    const lines: Array<{
      fromRow: number;
      fromIdx: number;
      toRow: number;
      toIdx: number;
      isActive: boolean;
    }> = [];
    
    for (let rowIdx = 1; rowIdx < dagRows.length; rowIdx++) {
      const currentRow = dagRows[rowIdx];
      const prevRow = dagRows[rowIdx - 1];
      const prevPrevRow = rowIdx > 1 ? dagRows[rowIdx - 2] : null;
      
      currentRow.items.forEach((item, itemIdx) => {
        const numConnections = Math.floor(seededRandom(rowIdx * 100 + itemIdx) * 2) + 1;
        
        for (let c = 0; c < numConnections && c < prevRow.items.length; c++) {
          const prevIdx = Math.floor(seededRandom(rowIdx * 50 + itemIdx * 10 + c) * prevRow.items.length);
          const prevItem = prevRow.items[prevIdx];
          const isActive = prevItem.type === 'course' && (prevItem.isCompleted ?? false);
          
          lines.push({
            fromRow: rowIdx - 1,
            fromIdx: prevIdx,
            toRow: rowIdx,
            toIdx: itemIdx,
            isActive
          });
        }
        
        if (prevPrevRow && seededRandom(rowIdx * 200 + itemIdx) > 0.6) {
          const skipIdx = Math.floor(seededRandom(rowIdx * 300 + itemIdx) * prevPrevRow.items.length);
          const skipItem = prevPrevRow.items[skipIdx];
          const isActive = skipItem.type === 'course' && (skipItem.isCompleted ?? false);
          
          lines.push({
            fromRow: rowIdx - 2,
            fromIdx: skipIdx,
            toRow: rowIdx,
            toIdx: itemIdx,
            isActive
          });
        }
      });
    }
    
    return lines;
  }, [dagRows]);

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

  const CUBE_SIZE = 80;
  const GAP = 12;
  const ROW_HEIGHT = CUBE_SIZE + 40;

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

          <div className="relative overflow-x-auto pb-4">
            <div 
              className="relative mx-auto"
              style={{ 
                minHeight: dagRows.length * ROW_HEIGHT + 60,
                width: 'fit-content',
                minWidth: '100%'
              }}
            >
              <svg 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  overflow: 'visible'
                }}
              >
                {connectionLines.map((line, idx) => {
                  const fromRow = dagRows[line.fromRow];
                  const toRow = dagRows[line.toRow];
                  
                  const fromRowWidth = fromRow.items.length * (CUBE_SIZE + GAP) - GAP;
                  const toRowWidth = toRow.items.length * (CUBE_SIZE + GAP) - GAP;
                  
                  const fromX = (line.fromIdx * (CUBE_SIZE + GAP)) + CUBE_SIZE / 2 + (500 - fromRowWidth) / 2;
                  const fromY = line.fromRow * ROW_HEIGHT + CUBE_SIZE + 20;
                  
                  const toX = (line.toIdx * (CUBE_SIZE + GAP)) + CUBE_SIZE / 2 + (500 - toRowWidth) / 2;
                  const toY = line.toRow * ROW_HEIGHT + 20;
                  
                  const midY = (fromY + toY) / 2;
                  
                  return (
                    <path
                      key={idx}
                      d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                      fill="none"
                      stroke={line.isActive ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={line.isActive ? 2 : 1}
                      opacity={line.isActive ? 0.7 : 0.3}
                    />
                  );
                })}
              </svg>

              {dagRows.map((row, rowIdx) => {
                const rowWidth = row.items.length * (CUBE_SIZE + GAP) - GAP;
                
                return (
                  <div
                    key={rowIdx}
                    className="absolute left-1/2 -translate-x-1/2 flex gap-3"
                    style={{
                      top: rowIdx * ROW_HEIGHT + 20,
                    }}
                  >
                    {row.items.map((item, itemIdx) => {
                      const delay = rowIdx * 0.1 + itemIdx * 0.05;
                      
                      if (item.type === 'course' && item.course) {
                        return (
                          <CourseBlock
                            key={item.id}
                            course={item.course}
                            isCompleted={item.isCompleted ?? false}
                            delay={delay}
                          />
                        );
                      } else {
                        const isActive = rowIdx > 0 && 
                          dagRows[rowIdx - 1].items.some(i => i.type === 'course' && i.isCompleted);
                        return (
                          <DecorativeCube 
                            key={item.id}
                            delay={delay}
                            isActive={isActive}
                          />
                        );
                      }
                    })}
                  </div>
                );
              })}
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
