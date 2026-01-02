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

function CourseBlock({ 
  course, 
  isCompleted, 
  index,
  totalCourses 
}: { 
  course: Course; 
  isCompleted: boolean;
  index: number;
  totalCourses: number;
}) {
  const xOffset = (index % 3 - 1) * 25;
  const animationDelay = index * 0.1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.5 }}
      className="relative"
      style={{ marginLeft: `${xOffset}px` }}
    >
      <div className="flex items-center gap-3">
        <div 
          className={`
            relative w-14 h-14 rounded-md overflow-hidden border-2 transition-all
            ${isCompleted 
              ? 'border-primary shadow-lg shadow-primary/20' 
              : 'border-border/50 opacity-60 grayscale'
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
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {course.title.charAt(0)}
              </span>
            </div>
          )}
          
          {isCompleted && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary drop-shadow-lg" />
            </div>
          )}
          
          {!isCompleted && (
            <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
            {course.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {course.lessonCount} lessons
          </p>
        </div>
        
        {isCompleted && (
          <Badge variant="outline" className="shrink-0 gap-1 text-xs bg-primary/10 text-primary border-primary/30">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </Badge>
        )}
      </div>
      
      {index < totalCourses - 1 && (
        <div className="ml-7 h-6 w-0.5 bg-gradient-to-b from-border to-transparent my-1" />
      )}
    </motion.div>
  );
}

function AmbientBlock({ delay, left, size = "sm" }: { delay: number; left: string; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "w-3 h-3" : "w-2 h-2";
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.3, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={`absolute ${sizeClass} rounded-sm bg-primary/40`}
      style={{ left }}
    />
  );
}

export function BlockDAGProgress({ courses, certificates, walletConnected }: BlockDAGProgressProps) {
  const { toast } = useToast();
  const { wallet, isDemoMode } = useWallet();
  const { data: whitelistStatus } = useWhitelistStatus();
  const { data: diplomaStatus } = useDiplomaStatus();
  const [showMintDialog, setShowMintDialog] = useState(false);

  // Derive progress from certificates (local computation for UI responsiveness)
  // Diploma status API provides the authoritative server-side check
  const { completedCourseIds, progressPercent, completedCount } = useMemo(() => {
    if (courses.length === 0) {
      return { completedCourseIds: new Set<string>(), progressPercent: 0, completedCount: 0 };
    }
    const completed = new Set(certificates.map(c => c.courseId));
    const count = completed.size;
    const percent = Math.round((count / courses.length) * 100);
    return { completedCourseIds: completed, progressPercent: percent, completedCount: count };
  }, [courses, certificates]);

  const currentCourseIndex = completedCount;
  
  // Use diploma status for eligibility (server-side authority)
  // Fall back to local computation if API not loaded yet
  const isComplete = diplomaStatus?.isEligible ?? (courses.length > 0 && completedCount >= courses.length);
  const isWhitelisted = whitelistStatus?.isWhitelisted;
  const mintPrice = isWhitelisted ? "~10 KAS" : "~20,000 KAS";
  
  // Diploma minting is not yet implemented - feature flag for future
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

    // Future: Implement actual diploma mint flow
    toast({
      title: "Minting Not Available",
      description: "Diploma NFT minting is not yet implemented.",
    });
    setShowMintDialog(false);
  };

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
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
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

          <div className="mt-8 mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to Diploma</span>
              <span className="font-medium">{completedCount} / {courses.length} courses</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center pointer-events-none">
              <motion.div
                animate={{ 
                  y: isComplete 
                    ? courses.length * 86 
                    : currentCourseIndex * 86
                }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative"
              >
                <KaspaCoinAvatar className="w-10 h-10" />
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-2 rounded-full border-2 border-primary/30"
                />
              </motion.div>
            </div>

            <div className="ml-12 space-y-0">
              {courses.map((course, index) => (
                <CourseBlock
                  key={course.id}
                  course={course}
                  isCompleted={completedCourseIds.has(course.id)}
                  index={index}
                  totalCourses={courses.length}
                />
              ))}
            </div>

            <div className="absolute right-0 top-0 h-full w-6 pointer-events-none overflow-hidden opacity-50">
              <AmbientBlock delay={0.2} left="0" size="sm" />
              <AmbientBlock delay={0.4} left="10px" size="md" />
              <AmbientBlock delay={0.6} left="5px" size="sm" />
              <AmbientBlock delay={0.8} left="15px" size="sm" />
              <AmbientBlock delay={1.0} left="8px" size="md" />
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
            <div className="flex items-center gap-4">
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
