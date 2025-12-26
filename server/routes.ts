import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { getKaspaService } from "./kaspa";
import { createQuizPayload } from "./ku-protocol.js";
import { getKRC721Service, getAndClearExpiredCertificateIds, hasActiveReservation } from "./krc721";
import { getPinataService } from "./pinata";
import { getAntiSybilService } from "./anti-sybil";
import { 
  securityMiddleware, 
  generalRateLimiter, 
  quizRateLimiter,
  rewardRateLimiter,
  validateQuizAnswers,
  isPaymentTxUsed,
  markPaymentTxUsed,
  getSecurityFlags,
  checkVpnAsync,
  getClientIP,
  validatePayloadLength,
  sanitizePayloadContent,
} from "./security";
import { getSecurityMetrics } from "./security-metrics";
import { checkVpn } from "./vpn-detection";
import { getJobQueue } from "./job-queue";
import { statsCache, analyticsCache } from "./cache";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Apply security middleware globally for API routes
  app.use("/api", securityMiddleware);
  app.use("/api", generalRateLimiter);

  app.get("/api/stats", async (_req: Request, res: Response) => {
    const cached = statsCache.get("platform_stats");
    if (cached) {
      return res.json(cached);
    }
    const stats = await storage.getStats();
    statsCache.set("platform_stats", stats);
    res.json(stats);
  });

  app.get("/api/jobs/:jobId", async (req: Request, res: Response) => {
    const jobQueue = getJobQueue();
    const job = jobQueue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json({
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  });

  app.get("/api/jobs", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    const jobQueue = getJobQueue();
    
    if (walletAddress) {
      const jobs = jobQueue.getJobsByWallet(walletAddress);
      return res.json(jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })));
    }
    
    res.json({ stats: jobQueue.getStats() });
  });

  app.get("/api/analytics", async (_req: Request, res: Response) => {
    try {
      const cached = analyticsCache.get("platform_analytics");
      if (cached) {
        return res.json(cached);
      }

      const stats = await storage.getStats();
      const courses = await storage.getCourses();
      const topLearnersData = await storage.getTopLearners(5);
      const totalQuizzes = await storage.getTotalQuizResults();
      const avgScore = await storage.getAverageScore();
      const completionCounts = await storage.getCourseCompletionCounts();
      const allQuizResults = await storage.getAllQuizResults();
      const recentQuizResults = await storage.getRecentQuizResults(5);
      const recentQAPosts = await storage.getRecentQAPosts(5);
      
      // Build activity data from ALL quiz results (real data)
      const activityData = (() => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayStats = new Map<string, { users: Set<string>, completions: number }>();
        
        days.forEach(d => dayStats.set(d, { users: new Set(), completions: 0 }));
        
        allQuizResults.forEach(result => {
          const dayName = days[new Date(result.completedAt).getDay()];
          const dayStat = dayStats.get(dayName)!;
          dayStat.users.add(result.userId);
          dayStat.completions += 1;
        });
        
        return days.slice(1).concat(days[0]).map(d => ({
          date: d,
          users: dayStats.get(d)!.users.size,
          completions: dayStats.get(d)!.completions,
          rewards: 0,
        }));
      })();

      // Build course popularity from real completion data
      const coursePopularity = courses.slice(0, 5).map((course) => ({
        name: course.title.length > 20 ? course.title.slice(0, 18) + "..." : course.title,
        completions: completionCounts.get(course.id) || 0,
        category: course.category,
      }));

      const difficultyDistribution = [
        { name: "Beginner", value: courses.filter(c => c.difficulty === "beginner").length },
        { name: "Intermediate", value: courses.filter(c => c.difficulty === "intermediate").length },
        { name: "Advanced", value: courses.filter(c => c.difficulty === "advanced").length },
      ];

      // Build top learners from real user data
      const topLearners = await Promise.all(topLearnersData.map(async (user) => {
        const certs = await storage.getCertificatesByUser(user.id);
        return {
          address: user.walletAddress,
          totalKas: Math.round(user.totalKasEarned * 100) / 100,
          certificates: certs.length,
        };
      }));

      // Build recent activity from real data
      const recentActivity: Array<{ type: string, description: string, timestamp: string, txHash?: string }> = [];
      
      // Add recent quiz completions
      for (const result of recentQuizResults.slice(0, 3)) {
        const lesson = await storage.getLesson(result.lessonId);
        const course = lesson ? await storage.getCourse(lesson.courseId) : null;
        const timeDiff = Date.now() - new Date(result.completedAt).getTime();
        const minutes = Math.floor(timeDiff / 60000);
        const timeStr = minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hours ago`;
        
        recentActivity.push({
          type: "completion",
          description: `User completed '${course?.title || "Quiz"}'`,
          timestamp: timeStr,
        });
      }
      
      // Add recent Q&A posts
      for (const post of recentQAPosts.slice(0, 2)) {
        const timeDiff = Date.now() - new Date(post.createdAt).getTime();
        const minutes = Math.floor(timeDiff / 60000);
        const timeStr = minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hours ago`;
        
        recentActivity.push({
          type: post.parentId ? "answer" : "question",
          description: post.parentId ? "New answer posted in Q&A" : "New question asked in Q&A",
          timestamp: timeStr,
          txHash: post.txHash || undefined,
        });
      }

      const analyticsData = {
        overview: {
          totalUsers: stats.activeLearners,
          totalCourses: stats.coursesAvailable,
          totalCertificates: stats.certificatesMinted,
          totalKasDistributed: stats.totalKasDistributed,
          totalQuizzes,
          avgScore,
        },
        activityData,
        coursePopularity,
        difficultyDistribution,
        topLearners,
        recentActivity: recentActivity.slice(0, 5),
      };
      
      analyticsCache.set("platform_analytics", analyticsData);
      res.json(analyticsData);
    } catch (error) {
      console.error("[Analytics] Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/kaspa/status", async (_req: Request, res: Response) => {
    try {
      const kaspaService = await getKaspaService();
      const diagnostics = await kaspaService.getDiagnostics();
      const treasuryAddress = kaspaService.getTreasuryAddress();
      const balanceInfo = await kaspaService.getTreasuryBalance();
      
      // Compute specific issues for frontend display
      const issues: string[] = [];
      if (!diagnostics.rpcConnected) issues.push("RPC not connected to Kaspa network");
      if (!treasuryAddress) issues.push("Treasury wallet not configured");
      if (!diagnostics.isLive) issues.push("Service running in demo mode");
      if (balanceInfo.balance === 0 && diagnostics.isLive) issues.push("Treasury balance is zero");
      
      res.json({
        isLive: diagnostics.isLive,
        rpcConnected: diagnostics.rpcConnected,
        network: diagnostics.networkName || "mainnet",
        status: diagnostics.isLive ? "live" : "demo",
        treasuryAddress: treasuryAddress ?? "Not configured - running in demo mode",
        treasuryBalance: balanceInfo.balance,
        utxoCount: balanceInfo.utxoCount,
        blockCount: diagnostics.blockCount,
        issues: issues.length > 0 ? issues : undefined,
      });
    } catch (error: any) {
      res.json({
        isLive: false,
        rpcConnected: false,
        network: "mainnet",
        status: "error",
        treasuryAddress: "Not configured",
        treasuryBalance: 0,
        utxoCount: 0,
        issues: [`Service initialization error: ${error.message}`],
      });
    }
  });

  app.get("/api/security/check", async (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const metrics = getSecurityMetrics();
    
    // Use new multi-source VPN detection
    const vpnCheck = await checkVpn(clientIP);
    const securityFlags = getSecurityFlags(req);
    
    const isFlagged = securityFlags.length > 0 || vpnCheck.isVpn;
    
    // Record metrics
    metrics.recordRequest(clientIP, req.headers["x-wallet-address"] as string);
    if (vpnCheck.isVpn) {
      metrics.recordVpnDetection(clientIP, vpnCheck.score);
    }
    
    res.json({
      isFlagged,
      isVpn: vpnCheck.isVpn,
      vpnScore: vpnCheck.score,
      vpnSource: vpnCheck.source,
      flags: vpnCheck.isVpn && !securityFlags.includes("VPN_DETECTED") 
        ? [...securityFlags, "VPN_DETECTED"] 
        : securityFlags,
      rewardsBlocked: isFlagged,
    });
  });

  app.get("/api/security/metrics", async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const metrics = getSecurityMetrics();
    res.json(metrics.getSnapshot());
  });

  app.get("/api/security/metrics/summary", async (req: Request, res: Response) => {
    const metrics = getSecurityMetrics();
    res.json(metrics.getSummary());
  });

  app.get("/api/security/metrics/alerts", async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const metrics = getSecurityMetrics();
    res.json(metrics.getAlerts());
  });

  app.post("/api/admin/reset-quiz-attempts", async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }
    
    const antiSybil = getAntiSybilService();
    await antiSybil.resetQuizAttempts(walletAddress);
    
    console.log(`[Admin] Reset quiz attempts for wallet: ${walletAddress}`);
    res.json({ success: true, message: `Quiz attempts reset for ${walletAddress}` });
  });

  app.get("/api/courses", async (_req: Request, res: Response) => {
    const courses = await storage.getCourses();
    res.json(courses);
  });

  app.get("/api/courses/:id", async (req: Request, res: Response) => {
    const course = await storage.getCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  });

  app.get("/api/courses/:id/lessons", async (req: Request, res: Response) => {
    const lessons = await storage.getLessonsByCourse(req.params.id);
    res.json(lessons);
  });

  app.get("/api/quiz/:lessonId", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    const questions = await storage.getQuizQuestionsByLesson(req.params.lessonId);
    const safeQuestions = questions.map((q) => ({
      id: q.id,
      lessonId: q.lessonId,
      question: q.question,
      options: q.options,
    }));
    
    if (walletAddress && !walletAddress.startsWith("demo:")) {
      const antiSybil = getAntiSybilService();
      antiSybil.recordQuizStart(walletAddress, req.params.lessonId);
    }
    
    res.json(safeQuestions);
  });

  app.get("/api/quiz/:lessonId/status", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.json({ canAttempt: false, reason: "Wallet not connected" });
    }
    
    if (walletAddress.startsWith("demo:")) {
      return res.json({ canAttempt: true, isDemo: true });
    }
    
    const antiSybil = getAntiSybilService();
    const cooldown = await antiSybil.getCooldownStatus(walletAddress, req.params.lessonId);
    const stats = await antiSybil.getWalletStats(walletAddress);
    
    res.json({
      canAttempt: !cooldown.onCooldown && cooldown.attemptsRemaining > 0,
      onCooldown: cooldown.onCooldown,
      hoursRemaining: cooldown.hoursRemaining,
      attemptsRemaining: cooldown.attemptsRemaining,
      dailyRewardsRemaining: stats.dailyRewardsRemaining,
      trustScore: stats.trustScore,
    });
  });

  app.post("/api/quiz/:lessonId/submit", quizRateLimiter, async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { answers } = req.body;

    console.log(`[Quiz] Submit request for lesson ${lessonId}`, {
      answers,
      hasWalletHeader: !!req.headers["x-wallet-address"],
      walletPreview: (req.headers["x-wallet-address"] as string)?.slice(0, 20),
    });

    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      console.log("[Quiz] Rejected: No wallet address header");
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const isDemoUser = walletAddress.startsWith("demo:");
    if (isDemoUser) {
      return res.status(400).json({ error: "Demo mode - connect wallet for real rewards" });
    }

    const questions = await storage.getQuizQuestionsByLesson(lessonId);
    if (questions.length === 0) {
      return res.status(404).json({ error: "No quiz found for this lesson" });
    }

    const answerValidation = validateQuizAnswers(answers, questions.length);
    if (!answerValidation.valid) {
      return res.status(400).json({ error: answerValidation.error });
    }

    const antiSybil = getAntiSybilService();
    const validation = await antiSybil.validateQuizSubmission(walletAddress, lessonId);
    
    if (!validation.allowed) {
      return res.status(429).json({ 
        error: validation.reason,
        flags: validation.flags,
      });
    }

    const clientIP = getClientIP(req);
    const vpnCheck = await checkVpnAsync(clientIP);
    if (vpnCheck.isVpn) {
      const activity = (req as any).ipActivity;
      if (activity && !activity.flags.includes("VPN_DETECTED")) {
        activity.isVpn = true;
        activity.flags.push("VPN_DETECTED");
      }
    }

    const securityFlags = getSecurityFlags(req);
    const isFlagged = securityFlags.includes("MULTI_WALLET_IP") || 
                      securityFlags.includes("VPN_DETECTED") || 
                      securityFlags.includes("VPN_SUSPECTED") ||
                      securityFlags.includes("MULTI_IP_WALLET");
    
    let rewardMultiplier = validation.rewardMultiplier;
    if (isFlagged) {
      rewardMultiplier = 0;
      console.log(`[Security] Blocked rewards for ${walletAddress.slice(0, 20)}... flags: ${securityFlags.join(", ")}, VPN score: ${vpnCheck.score.toFixed(2)}`);
    }

    let user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      user = await storage.createUser({ walletAddress });
    }

    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 70;

    const lesson = await storage.getLesson(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const course = await storage.getCourse(lesson.courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Save quiz result (no individual rewards - rewards are at course level)
    const result = await storage.saveQuizResult({
      lessonId,
      userId: user.id,
      score,
      passed,
    });

    await antiSybil.recordQuizCompletion(walletAddress, lessonId, score, passed, 0);

    // Update progress when quiz is passed
    if (passed) {
      const progress = await storage.getOrCreateProgress(user.id, lesson.courseId);
      await storage.updateProgress(progress.id, lessonId);

      // Check if course is now complete
      const completion = await storage.checkCourseCompletion(user.id, lesson.courseId);
      
      if (completion.completed) {
        // Check if reward already exists for this course
        const existingReward = await storage.getCourseRewardForCourse(user.id, lesson.courseId);
        
        if (!existingReward && !isFlagged) {
          // Create course reward with full course kasReward amount
          const effectiveReward = course.kasReward * rewardMultiplier;
          await storage.createCourseReward({
            courseId: lesson.courseId,
            userId: user.id,
            walletAddress: user.walletAddress,
            kasAmount: effectiveReward,
            averageScore: completion.averageScore,
            status: "pending",
          });
          console.log(`[Reward] Course reward created for ${user.walletAddress} - ${effectiveReward} KAS pending claim`);
        }

        // Check if certificate already exists
        const existingCerts = await storage.getCertificatesByUser(user.id);
        const hasCertForCourse = existingCerts.some((c) => c.courseId === lesson.courseId);

        if (!hasCertForCourse) {
          const verificationCode = `KU-${randomUUID().slice(0, 8).toUpperCase()}`;
          const completionDate = new Date();
          
          let imageUrl: string | undefined;
          try {
            const krc721Service = await getKRC721Service();
            imageUrl = krc721Service.generateCertificateImage(
              user.walletAddress,
              course.title,
              completion.averageScore,
              completionDate
            );
          } catch (error: any) {
            console.error("[Certificate] Image generation failed:", error.message);
          }
          
          await storage.createCertificate({
            courseId: lesson.courseId,
            userId: user.id,
            recipientAddress: user.walletAddress,
            courseName: course.title,
            kasReward: course.kasReward,
            score: completion.averageScore,
            issuedAt: completionDate,
            verificationCode,
            imageUrl,
            nftStatus: "pending",
          });
          
          console.log(`[Certificate] Created for ${user.walletAddress} - NFT pending claim`);
        }
      }
    }

    res.json({
      ...result,
      courseCompleted: passed ? (await storage.checkCourseCompletion(user.id, lesson.courseId)).completed : false,
    });
  });

  app.get("/api/user", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    let user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      user = await storage.createUser({ walletAddress });
    }

    res.json(user);
  });

  app.get("/api/progress", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.json([]);
    }

    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return res.json([]);
    }

    const progress = await storage.getUserProgress(user.id);
    res.json(progress);
  });

  app.get("/api/certificates", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.json([]);
    }

    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return res.json([]);
    }

    const certificates = await storage.getCertificatesByUser(user.id);
    res.json(certificates);
  });

  app.get("/api/certificates/:id", async (req: Request, res: Response) => {
    const certificate = await storage.getCertificate(req.params.id);
    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }
    res.json(certificate);
  });

  // Get all rewards for user (both pending and claimed)
  app.get("/api/rewards", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.json([]);
    }

    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return res.json([]);
    }

    const allRewards = await storage.getCourseRewardsByUser(user.id);
    
    const enriched = await Promise.all(allRewards.map(async (r) => {
      const course = await storage.getCourse(r.courseId);
      return {
        ...r,
        courseTitle: course?.title || "Unknown Course",
      };
    }));

    res.json(enriched);
  });

  // Get claimable rewards for user
  app.get("/api/rewards/claimable", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.json([]);
    }

    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return res.json([]);
    }

    const claimable = await storage.getClaimableCourseRewards(user.id);
    
    const enriched = await Promise.all(claimable.map(async (r) => {
      const course = await storage.getCourse(r.courseId);
      return {
        ...r,
        courseTitle: course?.title || "Unknown Course",
      };
    }));

    res.json(enriched);
  });

  // Claim a course reward
  app.post("/api/rewards/:rewardId/claim", rewardRateLimiter, async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    if (walletAddress.startsWith("demo:")) {
      return res.status(400).json({ error: "Connect a real wallet to claim rewards" });
    }

    const { rewardId } = req.params;
    const reward = await storage.getCourseReward(rewardId);
    
    if (!reward) {
      return res.status(404).json({ error: "Reward not found" });
    }

    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user || reward.userId !== user.id) {
      return res.status(403).json({ error: "Not authorized to claim this reward" });
    }

    if (!["pending", "failed", "confirming"].includes(reward.status)) {
      return res.status(400).json({ error: "Reward already claimed" });
    }

    if (reward.kasAmount <= 0) {
      return res.status(400).json({ error: "No reward available" });
    }

    await storage.updateCourseReward(rewardId, { status: "claiming" });

    try {
      const kaspaService = await getKaspaService();
      const course = await storage.getCourse(reward.courseId);

      const txResult = await kaspaService.sendReward(
        walletAddress,
        reward.kasAmount,
        reward.courseId,
        reward.averageScore,
        reward.courseId,
        reward.averageScore,
        []
      );

      if (txResult.success && txResult.txHash) {
        // Check if this is a real transaction (not a pending/demo placeholder)
        const isRealTx = txResult.txHash && 
          !txResult.txHash.startsWith("pending_") && 
          !txResult.txHash.startsWith("demo_");
        
        if (isRealTx) {
          // Set to confirming first, then try to verify
          await storage.updateCourseReward(rewardId, { 
            status: "confirming", 
            txHash: txResult.txHash,
            txConfirmed: false,
            claimedAt: new Date(),
          });
          
          // Try to verify the transaction on L1 (with a short delay for propagation)
          setTimeout(async () => {
            try {
              const verification = await kaspaService.verifyTransaction(txResult.txHash!);
              if (verification.exists) {
                await storage.updateCourseReward(rewardId, { 
                  status: "claimed",
                  txConfirmed: verification.confirmed,
                });
                console.log(`[Claim] TX verified on L1: ${txResult.txHash}, confirmed: ${verification.confirmed}`);
              }
            } catch (e) {
              console.log(`[Claim] TX verification pending: ${txResult.txHash}`);
            }
          }, 3000); // Wait 3 seconds before verification attempt
          
          await storage.updateUserKas(user.id, reward.kasAmount);
          
          console.log(`[Claim] Course reward submitted: ${reward.kasAmount} KAS for ${course?.title}, txHash: ${txResult.txHash}`);
          
          res.json({ 
            success: true, 
            txHash: txResult.txHash, 
            amount: reward.kasAmount,
            status: "confirming"
          });
        } else {
          // Transaction was queued but not actually sent - keep as pending
          await storage.updateCourseReward(rewardId, { status: "pending" });
          console.error(`[Claim] Transaction not submitted - treasury may not be properly configured. Hash: ${txResult.txHash}`);
          res.status(500).json({ 
            error: "Transaction not submitted", 
            message: "Treasury wallet not properly configured. Please contact admin." 
          });
        }
      } else {
        await storage.updateCourseReward(rewardId, { status: "pending" });
        console.error(`[Claim] Failed: ${txResult.error}`);
        res.status(500).json({ error: "Transaction failed", message: txResult.error });
      }
    } catch (error: any) {
      await storage.updateCourseReward(rewardId, { status: "pending" });
      console.error(`[Claim] Error: ${error.message}`);
      res.status(500).json({ error: "Failed to process claim" });
    }
  });

  // Verify a reward's transaction status on L1
  app.post("/api/rewards/:rewardId/verify", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { rewardId } = req.params;
    const reward = await storage.getCourseReward(rewardId);
    
    if (!reward) {
      return res.status(404).json({ error: "Reward not found" });
    }

    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user || reward.userId !== user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (!reward.txHash) {
      return res.json({ verified: false, error: "No transaction hash" });
    }

    try {
      const kaspaService = await getKaspaService();
      const verification = await kaspaService.verifyTransaction(reward.txHash);
      
      if (verification.exists) {
        await storage.updateCourseReward(rewardId, { 
          status: "claimed",
          txConfirmed: verification.confirmed,
        });
        
        return res.json({ 
          verified: true, 
          confirmed: verification.confirmed,
          txHash: reward.txHash,
          status: "claimed"
        });
      } else {
        return res.json({ 
          verified: false, 
          error: verification.error || "Transaction not found on L1",
          txHash: reward.txHash
        });
      }
    } catch (error: any) {
      return res.status(500).json({ error: "Verification failed", message: error.message });
    }
  });

  app.get("/api/qa/:lessonId", async (req: Request, res: Response) => {
    const posts = await storage.getQAPostsByLesson(req.params.lessonId);
    res.json(posts);
  });

  app.post("/api/qa/:lessonId", async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { content, isQuestion, authorAddress, postOnChain } = req.body;

    if (!authorAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content is required" });
    }

    const contentValidation = validatePayloadLength(content, 500);
    if (!contentValidation.valid) {
      return res.status(400).json({ error: contentValidation.error });
    }

    const sanitizedContent = sanitizePayloadContent(content);

    let txHash: string | undefined;
    let onChainStatus: "success" | "failed" | "not_requested" = "not_requested";
    let onChainError: string | undefined;

    // Post on-chain if requested
    if (postOnChain) {
      try {
        const kaspaService = await getKaspaService();
        const result = await kaspaService.postQAQuestion(
          lessonId,
          authorAddress,
          sanitizedContent
        );
        if (result.success) {
          txHash = result.txHash;
          onChainStatus = "success";
        } else {
          onChainStatus = "failed";
          onChainError = "Transaction failed";
        }
      } catch (error: any) {
        console.error("[Q&A] On-chain posting failed:", error);
        onChainStatus = "failed";
        onChainError = error?.message || "Unknown error";
      }
    }

    const post = await storage.createQAPost({
      lessonId,
      authorAddress,
      content: sanitizedContent,
      isQuestion: isQuestion ?? true,
      txHash,
    });

    res.json({
      ...post,
      onChainStatus,
      onChainError,
      isDemo: txHash?.startsWith("demo_") ?? false,
    });
  });

  // Reply to a Q&A post (answer)
  app.post("/api/qa/:lessonId/:postId/reply", async (req: Request, res: Response) => {
    const { lessonId, postId } = req.params;
    const { content, authorAddress, postOnChain } = req.body;

    if (!authorAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content is required" });
    }

    const contentValidation = validatePayloadLength(content, 500);
    if (!contentValidation.valid) {
      return res.status(400).json({ error: contentValidation.error });
    }

    const sanitizedContent = sanitizePayloadContent(content);

    // Get the parent post to get its txHash for on-chain reference
    const parentPost = await storage.getQAPost(postId);
    if (!parentPost) {
      return res.status(404).json({ error: "Parent post not found" });
    }

    let txHash: string | undefined;
    let onChainStatus: "success" | "failed" | "not_requested" = "not_requested";
    let onChainError: string | undefined;

    // Post on-chain if requested
    if (postOnChain && parentPost.txHash) {
      try {
        const kaspaService = await getKaspaService();
        const result = await kaspaService.postQAAnswer(
          parentPost.txHash,
          authorAddress,
          sanitizedContent
        );
        if (result.success) {
          txHash = result.txHash;
          onChainStatus = "success";
        } else {
          onChainStatus = "failed";
          onChainError = "Transaction failed";
        }
      } catch (error: any) {
        console.error("[Q&A] On-chain answer posting failed:", error);
        onChainStatus = "failed";
        onChainError = error?.message || "Unknown error";
      }
    } else if (postOnChain && !parentPost.txHash) {
      onChainStatus = "failed";
      onChainError = "Parent question not on-chain";
    }

    const reply = await storage.createQAPost({
      lessonId,
      authorAddress,
      content: sanitizedContent,
      isQuestion: false,
      parentId: postId,
      txHash,
    });

    res.json({
      ...reply,
      onChainStatus,
      onChainError,
      isDemo: txHash?.startsWith("demo_") ?? false,
    });
  });

  // KRC-721 NFT Service Health Check
  app.get("/api/nft/health", async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const pinataService = getPinataService();
      
      const health = {
        isLive: krc721Service.isLive(),
        pinataConfigured: pinataService.isConfigured(),
        timestamp: new Date().toISOString(),
      };
      
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ 
        isLive: false, 
        pinataConfigured: false,
        error: error.message 
      });
    }
  });

  // KRC-721 NFT Collection Info
  app.get("/api/nft/collection", async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const info = await krc721Service.getCollectionInfo();
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Prepare non-custodial NFT mint - returns P2SH address for user to pay directly
  app.post("/api/nft/prepare/:id", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { id } = req.params;
    
    // First, handle any expired reservations by resetting certificate status
    const expiredIds = await getAndClearExpiredCertificateIds();
    for (const expiredId of expiredIds) {
      const cert = await storage.getCertificate(expiredId);
      if (cert && cert.nftStatus === "minting") {
        await storage.updateCertificate(expiredId, { nftStatus: "pending" });
        console.log(`[Prepare] Reset expired certificate ${expiredId} status to pending`);
      }
    }
    
    const certificate = await storage.getCertificate(id);
    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    if (certificate.recipientAddress !== walletAddress) {
      return res.status(403).json({ error: "You don't own this certificate" });
    }

    if (certificate.nftStatus === "claimed") {
      return res.status(400).json({ error: "NFT already minted", nftTxHash: certificate.nftTxHash });
    }
    
    // Check if there's an active (non-expired) reservation already
    if (certificate.nftStatus === "minting") {
      const hasActive = await hasActiveReservation(id);
      if (hasActive) {
        return res.status(409).json({ 
          error: "Minting in progress", 
          message: "A mint is already in progress for this certificate. Please wait or use the retry button."
        });
      } else {
        // Reservation expired but status wasn't reset - reset it now
        await storage.updateCertificate(id, { nftStatus: "pending" });
      }
    }

    try {
      console.log(`[Prepare] Starting prepare for certificate ${id} and wallet ${walletAddress.slice(0, 25)}...`);
      const krc721Service = await getKRC721Service();

      // Generate certificate image and upload to IPFS
      // Must have IPFS URL for NFT minting - re-upload if only have data URI
      let imageUrl: string = certificate.imageUrl || "";
      const needsIpfsUpload = !imageUrl || !imageUrl.startsWith("ipfs://");
      
      if (needsIpfsUpload) {
        const svgImage = krc721Service.generateCertificateImageSvg(
          certificate.recipientAddress,
          certificate.courseName,
          certificate.score || 100,
          certificate.issuedAt
        );
        
        const pinataService = getPinataService();
        if (pinataService.isConfigured()) {
          console.log(`[Prepare] Uploading certificate to IPFS...`);
          const uploadResult = await pinataService.uploadCertificate(
            svgImage,
            id,
            certificate.courseName,
            certificate.score || 100,
            certificate.recipientAddress,
            certificate.issuedAt
          );
          
          if (uploadResult.success && uploadResult.ipfsUrl) {
            imageUrl = uploadResult.ipfsUrl;
            console.log(`[Prepare] IPFS upload successful: ${imageUrl}`);
          } else {
            console.error(`[Prepare] IPFS upload failed: ${uploadResult.error}`);
            return res.status(500).json({
              error: "IPFS upload failed",
              message: uploadResult.error || "Failed to upload certificate to IPFS"
            });
          }
        } else {
          console.error("[Prepare] Pinata not configured");
          return res.status(500).json({
            error: "IPFS not configured",
            message: "Pinata credentials required for NFT minting"
          });
        }
        
        // Save the IPFS URL for later
        await storage.updateCertificate(id, { imageUrl });
      }

      // Prepare non-custodial mint - returns P2SH address for user to pay
      const prepareResult = await krc721Service.prepareMint(
        id,
        certificate.recipientAddress,
        certificate.courseName,
        certificate.score || 100,
        certificate.issuedAt,
        imageUrl
      );

      if (prepareResult.success) {
        await storage.updateCertificate(id, { nftStatus: "minting" });
        
        console.log(`[Prepare] Non-custodial mint prepared for certificate ${id}`);
        return res.json({
          success: true,
          p2shAddress: prepareResult.p2shAddress,
          amountSompi: prepareResult.amountSompi,
          amountKas: "10.5",
          tokenId: prepareResult.tokenId,
          expiresAt: prepareResult.expiresAt,
          imageUrl,
        });
      } else {
        return res.status(500).json({ 
          error: "Prepare failed",
          message: prepareResult.error || "Failed to prepare NFT mint"
        });
      }
    } catch (error: any) {
      console.error(`[Prepare] Error: ${error.message}`);
      return res.status(500).json({ error: "Prepare failed", message: error.message });
    }
  });

  // Finalize non-custodial NFT mint - verifies user's commit tx and submits reveal
  app.post("/api/nft/finalize/:id", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { id } = req.params;
    const { p2shAddress, commitTxHash } = req.body;

    if (!p2shAddress) {
      return res.status(400).json({ error: "P2SH address is required" });
    }

    const certificate = await storage.getCertificate(id);
    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    if (certificate.recipientAddress !== walletAddress) {
      return res.status(403).json({ error: "You don't own this certificate" });
    }

    if (certificate.nftStatus === "claimed") {
      return res.status(400).json({ error: "NFT already minted", nftTxHash: certificate.nftTxHash });
    }

    try {
      const krc721Service = await getKRC721Service();

      // Finalize the mint - server submits reveal transaction
      const finalizeResult = await krc721Service.finalizeMint(p2shAddress, id, commitTxHash);

      if (finalizeResult.success && finalizeResult.revealTxHash) {
        await storage.updateCertificate(id, {
          nftStatus: "claimed",
          nftTxHash: finalizeResult.revealTxHash,
        });

        console.log(`[Finalize] NFT minted for certificate ${id}, txHash: ${finalizeResult.revealTxHash}`);
        return res.json({
          success: true,
          commitTxHash: finalizeResult.commitTxHash,
          revealTxHash: finalizeResult.revealTxHash,
          tokenId: finalizeResult.tokenId,
        });
      } else {
        // Check for specific error cases
        const isPaymentPending = finalizeResult.error?.includes("not yet received");
        const isExpired = (finalizeResult as any).expired === true;
        const isNotFound = finalizeResult.error?.includes("not found");
        
        if (isPaymentPending) {
          // Don't reset - funds may still be pending, allow retry
          return res.status(202).json({ 
            success: false,
            error: "Payment pending",
            message: finalizeResult.error,
            retry: true,
            p2shAddress
          });
        }
        
        // Reset status immediately on expiry or not found
        if (isExpired || isNotFound) {
          await storage.updateCertificate(id, { nftStatus: "pending" });
          console.log(`[Finalize] Reset certificate ${id} status to pending (${isExpired ? "expired" : "not found"})`);
          return res.status(410).json({ 
            success: false,
            error: isExpired ? "Reservation expired" : "Reservation not found",
            message: "Your mint reservation expired or was not found. Please start again.",
            retry: false,
            statusReset: true // Inform frontend that status was reset
          });
        }
        
        // Reset status on other failures so user can retry
        await storage.updateCertificate(id, { nftStatus: "pending" });
        
        return res.status(500).json({ 
          success: false,
          error: "Finalize failed",
          message: finalizeResult.error || "NFT minting transaction failed"
        });
      }
    } catch (error: any) {
      await storage.updateCertificate(id, { nftStatus: "pending" });
      console.error(`[Finalize] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: "Finalize failed", message: error.message });
    }
  });

  // Legacy claim endpoint (deprecated - use /mint instead)
  app.post("/api/certificates/:id/claim", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    if (walletAddress.startsWith("demo:")) {
      return res.status(403).json({ 
        error: "Demo mode not supported for NFT claiming",
        message: "Connect a real Kaspa wallet to claim your NFT certificate"
      });
    }

    const { id } = req.params;
    const { paymentTxHash } = req.body;

    if (!paymentTxHash) {
      return res.status(400).json({ error: "Payment transaction hash is required" });
    }

    if (paymentTxHash.startsWith("demo_")) {
      return res.status(400).json({ error: "Invalid payment transaction" });
    }

    const txAlreadyUsed = await isPaymentTxUsed(paymentTxHash);
    if (txAlreadyUsed) {
      return res.status(400).json({ 
        error: "Payment transaction already used",
        message: "This transaction has already been used to claim an NFT"
      });
    }

    const certificate = await storage.getCertificate(id);
    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    if (certificate.recipientAddress !== walletAddress) {
      return res.status(403).json({ error: "You don't own this certificate" });
    }

    if (certificate.nftStatus === "claimed") {
      return res.status(400).json({ error: "NFT already claimed", nftTxHash: certificate.nftTxHash });
    }
    
    if (certificate.nftStatus === "minting") {
      return res.status(400).json({ error: "NFT minting already in progress" });
    }

    await storage.updateCertificate(id, { nftStatus: "minting" });

    try {
      const krc721Service = await getKRC721Service();
      const kaspaService = await getKaspaService();
      const collectionInfo = await krc721Service.getCollectionInfo();
      const MINTING_FEE = 3.5;

      if (!collectionInfo.address) {
        await storage.updateCertificate(id, { nftStatus: "pending" });
        return res.status(500).json({ error: "Treasury address not configured" });
      }

      console.log(`[Claim] Verifying payment txHash: ${paymentTxHash}`);
      const paymentVerified = await kaspaService.verifyPayment(
        paymentTxHash,
        walletAddress,
        collectionInfo.address,
        MINTING_FEE
      );

      if (!paymentVerified) {
        await storage.updateCertificate(id, { nftStatus: "pending" });
        return res.status(400).json({ 
          error: "Payment verification failed",
          message: "Could not verify payment to treasury. Please ensure you sent at least 3.5 KAS."
        });
      }

      console.log(`[Claim] Payment verified for certificate ${id}`);

      // Generate certificate image and upload to IPFS if configured
      let imageUrl = certificate.imageUrl;
      if (!imageUrl) {
        const svgImage = krc721Service.generateCertificateImageSvg(
          certificate.recipientAddress,
          certificate.courseName,
          certificate.score || 100,
          certificate.issuedAt
        );
        
        // Try to upload to Pinata IPFS
        const pinataService = getPinataService();
        if (pinataService.isConfigured()) {
          console.log(`[Claim] Uploading certificate to IPFS...`);
          const uploadResult = await pinataService.uploadCertificate(
            svgImage,
            id,
            certificate.courseName,
            certificate.score || 100,
            certificate.recipientAddress,
            certificate.issuedAt
          );
          
          if (uploadResult.success && uploadResult.ipfsUrl) {
            imageUrl = uploadResult.ipfsUrl;
            console.log(`[Claim] Certificate uploaded to IPFS: ${imageUrl}`);
          } else {
            console.log(`[Claim] IPFS upload failed, using data URI fallback`);
            imageUrl = `data:image/svg+xml;base64,${Buffer.from(svgImage).toString("base64")}`;
          }
        } else {
          // Fallback to data URI
          imageUrl = `data:image/svg+xml;base64,${Buffer.from(svgImage).toString("base64")}`;
        }
      }

      // Mint the NFT
      const mintResult = await krc721Service.mintCertificate(
        certificate.recipientAddress,
        certificate.courseName,
        certificate.score || 100,
        certificate.issuedAt,
        imageUrl
      );

      if (mintResult.success && mintResult.revealTxHash) {
        // Mark payment tx as used to prevent double-claiming
        await markPaymentTxUsed(paymentTxHash, walletAddress, "nft_claim", 3.5);
        
        // Update certificate with NFT info
        await storage.updateCertificate(id, {
          nftStatus: "claimed",
          nftTxHash: mintResult.revealTxHash,
          imageUrl,
        });

        console.log(`[Claim] NFT minted successfully: ${mintResult.revealTxHash}`);

        return res.json({
          success: true,
          nftTxHash: mintResult.revealTxHash,
          tokenId: mintResult.tokenId,
          imageUrl,
        });
      } else {
        // Minting failed - revert to pending
        await storage.updateCertificate(id, { nftStatus: "pending" });
        return res.status(500).json({ 
          error: "NFT minting failed", 
          details: mintResult.error 
        });
      }
    } catch (error: any) {
      // Revert to pending on error
      await storage.updateCertificate(id, { nftStatus: "pending" });
      console.error("[Claim] Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get minting fee info (non-custodial - user pays directly)
  app.get("/api/nft/fee", async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const feeInfo = krc721Service.getMintFeeInfo();
      const collectionInfo = await krc721Service.getCollectionInfo();
      
      res.json({
        mintingFeeKas: feeInfo.kasAmount,
        mintingFeeSompi: feeInfo.sompiAmount,
        description: feeInfo.description,
        model: "non-custodial", // User pays directly to P2SH, not to treasury
        network: collectionInfo.network,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate certificate image preview
  app.get("/api/nft/preview", async (req: Request, res: Response) => {
    const { address, course, score } = req.query;
    
    if (!address || !course) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
      const krc721Service = await getKRC721Service();
      const imageUrl = krc721Service.generateCertificateImage(
        address as string,
        course as string,
        parseInt(score as string) || 100,
        new Date()
      );
      
      res.json({ imageUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get recent verified transactions for the explorer
  app.get("/api/verify/recent", async (_req: Request, res: Response) => {
    try {
      // Get recent quiz results and Q&A posts from storage
      const quizResults = await storage.getRecentQuizResults(10);
      const qaPosts = await storage.getRecentQAPosts(10);
      
      const recentTxs = [
        ...quizResults.map(r => ({
          txHash: `quiz_${r.id}`,
          type: "quiz" as const,
          timestamp: new Date(r.completedAt).getTime(),
          walletAddress: r.userId,
          courseId: r.lessonId.split("-")[0],
          score: r.score,
          maxScore: 100,
        })),
        ...qaPosts.map(p => ({
          txHash: p.txHash || `demo_qa_${p.id}`,
          type: p.isQuestion ? "qa_question" as const : "qa_answer" as const,
          timestamp: new Date(p.createdAt).getTime(),
          walletAddress: p.authorAddress,
        })),
      ]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      res.json(recentTxs);
    } catch (error: any) {
      console.error("[API] Error fetching recent verifications:", error);
      res.json([]);
    }
  });

  // Verify on-chain Q&A or quiz result
  app.get("/api/verify/:txHash", async (req: Request, res: Response) => {
    const { txHash } = req.params;

    // Check if it's a demo transaction
    if (txHash.startsWith("demo_")) {
      return res.json({
        verified: true,
        type: txHash.startsWith("demo_qa_q") ? "qa_question" : 
              txHash.startsWith("demo_qa_a") ? "qa_answer" : "quiz",
        demo: true,
        message: "Demo transaction - would be verified on mainnet"
      });
    }

    try {
      const kaspaService = await getKaspaService();

      // Try to verify as quiz result first
      const quizResult = await kaspaService.verifyQuizResult(txHash);
      if (quizResult) {
        return res.json({
          verified: true,
          type: "quiz",
          data: quizResult
        });
      }

      // Try to verify as Q&A content
      const qaContent = await kaspaService.verifyQAContent(txHash);
      if (qaContent) {
        return res.json({
          verified: true,
          type: "questionTxId" in qaContent ? "qa_answer" : "qa_question",
          data: qaContent
        });
      }

      return res.json({
        verified: false,
        message: "Transaction not found or not a KU protocol transaction"
      });
    } catch (error) {
      return res.json({
        verified: false,
        message: "Failed to verify transaction"
      });
    }
  });

  // Verify a transaction exists on Kaspa L1 mainnet
  app.get("/api/kaspa/verify-tx/:txHash", async (req: Request, res: Response) => {
    const { txHash } = req.params;
    
    try {
      const kaspaService = await getKaspaService();
      const result = await kaspaService.verifyTransaction(txHash);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        exists: false, 
        confirmed: false, 
        error: error.message 
      });
    }
  });

  // Get Kaspa RPC/API diagnostics
  app.get("/api/kaspa/diagnostics", async (req: Request, res: Response) => {
    try {
      const kaspaService = await getKaspaService();
      const diagnostics = await kaspaService.getDiagnostics();
      res.json(diagnostics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
