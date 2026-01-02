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
      animate={{ opacity: isActive ? 0.9 : 0.4, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`
        w-12 h-12 rounded-md flex items-center justify-center
        ${isActive 
          ? 'bg-gradient-to-br from-primary/60 to-primary/30 border-2 border-primary/50 shadow-lg shadow-primary/20' 
          : 'bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20'
        }
      `}
    >
      <div className={`w-3 h-3 rounded-sm ${isActive ? 'bg-primary/80' : 'bg-primary/40'}`} />
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
          relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all
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
            <span className="text-xs font-bold text-primary-foreground">
              {course.title.charAt(0)}
            </span>
          </div>
        )}
        
        {isCompleted && (
          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white drop-shadow-lg" />
          </div>
        )}
        
        {!isCompleted && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 -bottom-8 z-10 bg-popover border rounded-md px-2 py-1 shadow-lg whitespace-nowrap">
        <p className="text-xs font-medium">{course.title}</p>
      </div>
    </motion.div>
  );
}

function ConnectionLine({ from, to, isActive }: { from: string; to: string; isActive: boolean }) {
  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ zIndex: 0 }}
    >
      <defs>
        <linearGradient id={`lineGrad-${from}-${to}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isActive ? "hsl(var(--primary))" : "hsl(var(--border))"} />
          <stop offset="100%" stopColor={isActive ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border) / 0.5)"} />
        </linearGradient>
      </defs>
    </svg>
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

  const dagRows = useMemo(() => {
    const rows: Array<{
      items: Array<{ type: 'course' | 'decorative'; course?: Course; isCompleted?: boolean }>;
    }> = [];
    
    let courseIndex = 0;
    let rowIndex = 0;
    
    while (courseIndex < courses.length) {
      const row: typeof rows[0] = { items: [] };
      
      if (rowIndex === 0) {
        const course = courses[courseIndex];
        row.items.push({ 
          type: 'course', 
          course, 
          isCompleted: completedCourseIds.has(course.id) 
        });
        courseIndex++;
      } else if (rowIndex === 1) {
        if (courseIndex < courses.length) {
          const course = courses[courseIndex];
          row.items.push({ 
            type: 'course', 
            course, 
            isCompleted: completedCourseIds.has(course.id) 
          });
          courseIndex++;
        }
        row.items.push({ type: 'decorative' });
      } else {
        const numDecorative = Math.min(rowIndex - 1, 3);
        
        if (courseIndex < courses.length) {
          const course = courses[courseIndex];
          row.items.push({ 
            type: 'course', 
            course, 
            isCompleted: completedCourseIds.has(course.id) 
          });
          courseIndex++;
        }
        
        for (let i = 0; i < numDecorative; i++) {
          row.items.push({ type: 'decorative' });
        }
      }
      
      rows.push(row);
      rowIndex++;
    }
    
    return rows;
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

          <div className="relative py-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-4 top-0 z-20"
            >
              <KaspaCoinAvatar className="w-10 h-10" />
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-1 rounded-full border-2 border-primary/30"
              />
            </motion.div>

            <div className="ml-16 space-y-4">
              {dagRows.map((row, rowIdx) => {
                const totalWidth = row.items.length;
                const justifyClass = totalWidth === 1 ? 'justify-start' : 'justify-start';
                
                return (
                  <div key={rowIdx} className="relative">
                    {rowIdx > 0 && (
                      <svg 
                        className="absolute -top-4 left-0 w-full h-4 overflow-visible"
                        style={{ zIndex: 0 }}
                      >
                        {row.items.map((item, itemIdx) => {
                          const prevRow = dagRows[rowIdx - 1];
                          const prevItemCount = prevRow.items.length;
                          
                          const xEnd = 24 + itemIdx * 64;
                          
                          for (let prevIdx = 0; prevIdx < prevItemCount; prevIdx++) {
                            const xStart = 24 + prevIdx * 64;
                            const prevItem = prevRow.items[prevIdx];
                            const isActive = prevItem.type === 'course' && prevItem.isCompleted;
                            
                            return (
                              <line
                                key={`${rowIdx}-${itemIdx}-${prevIdx}`}
                                x1={xStart}
                                y1={0}
                                x2={xEnd}
                                y2={16}
                                stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--border))"}
                                strokeWidth={isActive ? 2 : 1}
                                opacity={isActive ? 0.8 : 0.4}
                              />
                            );
                          }
                          return null;
                        })}
                      </svg>
                    )}
                    
                    <div className={`flex gap-4 ${justifyClass}`}>
                      {row.items.map((item, itemIdx) => {
                        const delay = rowIdx * 0.15 + itemIdx * 0.08;
                        
                        if (item.type === 'course' && item.course) {
                          return (
                            <CourseBlock
                              key={item.course.id}
                              course={item.course}
                              isCompleted={item.isCompleted ?? false}
                              delay={delay}
                            />
                          );
                        } else {
                          const prevRowHasCompletedCourse = rowIdx > 0 && 
                            dagRows[rowIdx - 1].items.some(i => i.type === 'course' && i.isCompleted);
                          return (
                            <DecorativeCube 
                              key={`dec-${rowIdx}-${itemIdx}`} 
                              delay={delay}
                              isActive={prevRowHasCompletedCourse}
                            />
                          );
                        }
                      })}
                    </div>
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
