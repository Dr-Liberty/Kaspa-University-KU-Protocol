import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { getKaspaService } from "./kaspa";
import { 
  createQuizPayload, 
  createTxBitmask, 
  parseTxBitmask, 
  matchesTxMask,
  bitmaskToHex,
  parseKUPayload,
  TX_TYPE,
  TX_STATUS,
  TX_FLAGS,
} from "./ku-protocol.js";
import { getKRC721Service, getAndClearExpiredCertificateIds, hasActiveReservation, isTestnetMode, setTestnetMode } from "./krc721";
import { getPinataService, type QuizProof } from "./pinata";
import { createContentHash } from "./ku-protocol.js";
import { getAntiSybilService } from "./anti-sybil";
import { 
  securityMiddleware, 
  generalRateLimiter, 
  quizRateLimiter,
  rewardRateLimiter,
  nftRateLimiter,
  certificateRateLimiter,
  statsRateLimiter,
  authRateLimiter,
  validateQuizAnswers,
  isPaymentTxUsed,
  markPaymentTxUsed,
  getSecurityFlags,
  checkVpnAsync,
  getClientIP,
  validatePayloadLength,
  sanitizePayloadContent,
  sanitizeError,
  safeErrorLog,
} from "./security";
import { getSecurityMetrics } from "./security-metrics";
import { checkVpn } from "./vpn-detection";
import { getJobQueue } from "./job-queue";
import { statsCache, analyticsCache } from "./cache";
import { mintStorage } from "./mint-storage";
import { issueCertificateProof, CERT_PROOF_AMOUNT_KAS, generateVerificationCode } from "./certificate-proof";
import { 
  generateChallenge, 
  verifySignature, 
  createSession, 
  validateSession, 
  invalidateSession,
  getSessionByToken 
} from "./wallet-auth";
import { getDiscountService } from "./discount-service";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Apply security middleware globally for API routes
  app.use("/api", securityMiddleware);
  app.use("/api", generalRateLimiter);

  // ============================================
  // WALLET AUTHENTICATION ENDPOINTS
  // ============================================

  // Get a challenge for wallet authentication
  app.post("/api/auth/challenge", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      // Validate Kaspa address format
      if (!walletAddress.startsWith("kaspa:") || walletAddress.length < 60) {
        return res.status(400).json({ error: "Invalid Kaspa address format" });
      }
      
      const challenge = generateChallenge(walletAddress);
      
      res.json({
        success: true,
        nonce: challenge.nonce,
        message: challenge.message,
        expiresAt: challenge.expiresAt,
      });
    } catch (error: any) {
      console.error("[Auth] Challenge generation failed:", error.message);
      res.status(500).json({ error: "Failed to generate challenge" });
    }
  });

  // Verify signature and create session
  app.post("/api/auth/verify", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { walletAddress, message, signature, publicKey, nonce } = req.body;
      
      if (!walletAddress || !message || !signature || !publicKey || !nonce) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const result = await verifySignature(walletAddress, message, signature, publicKey, nonce);
      
      if (!result.valid) {
        return res.status(401).json({ error: result.error || "Signature verification failed" });
      }
      
      // Create authenticated session
      const clientIP = getClientIP(req);
      const session = createSession(walletAddress, clientIP);
      
      res.json({
        success: true,
        token: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error: any) {
      console.error("[Auth] Verification failed:", error.message);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Logout / invalidate session
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const token = req.headers["x-auth-token"] as string;
    if (token) {
      invalidateSession(token);
    }
    res.json({ success: true });
  });

  // Check session validity
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    const token = req.headers["x-auth-token"] as string;
    const walletAddress = req.headers["x-wallet-address"] as string;
    
    if (!token || !walletAddress) {
      return res.json({ authenticated: false });
    }
    
    const result = validateSession(token, walletAddress);
    res.json({ 
      authenticated: result.valid,
      error: result.error 
    });
  });

  // Middleware to require verified session for protected routes
  const requireVerifiedSession = (req: Request, res: Response, next: Function) => {
    const token = req.headers["x-auth-token"] as string;
    const walletAddress = req.headers["x-wallet-address"] as string;
    
    // Demo mode bypass (for testing)
    if (walletAddress?.startsWith("demo:")) {
      return next();
    }
    
    if (!token || !walletAddress) {
      return res.status(401).json({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }
    
    // Pass client IP for IP binding enforcement
    const clientIP = getClientIP(req);
    const result = validateSession(token, walletAddress, clientIP);
    if (!result.valid) {
      return res.status(401).json({ 
        error: result.error || "Invalid session",
        code: "SESSION_INVALID"
      });
    }
    
    next();
  };

  app.get("/api/stats", statsRateLimiter, async (_req: Request, res: Response) => {
    const cached = statsCache.get("platform_stats");
    if (cached) {
      return res.json(cached);
    }
    const stats = await storage.getStats();
    statsCache.set("platform_stats", stats);
    res.json(stats);
  });

  // Get support/admin wallet address for contacting support (uses treasury wallet)
  app.get("/api/support/address", generalRateLimiter, (_req: Request, res: Response) => {
    const treasuryAddress = kaspaService.getTreasuryAddress();
    if (!treasuryAddress) {
      return res.status(503).json({ error: "Support address not configured" });
    }
    res.json({ address: treasuryAddress });
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

      // Build recent activity from real data with full verification info
      const recentActivity: Array<{ 
        type: string, 
        description: string, 
        timestamp: string,
        fullTimestamp: string, 
        txHash?: string,
        txStatus?: string,
        score?: number,
        courseTitle?: string,
        verified?: boolean
      }> = [];
      
      // Add recent quiz completions with verification data
      for (const result of recentQuizResults.slice(0, 5)) {
        const lesson = await storage.getLesson(result.lessonId);
        const course = lesson ? await storage.getCourse(lesson.courseId) : null;
        const completedDate = new Date(result.completedAt);
        const timeDiff = Date.now() - completedDate.getTime();
        const minutes = Math.floor(timeDiff / 60000);
        const timeStr = minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hours ago`;
        const fullTimeStr = completedDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        recentActivity.push({
          type: "verification",
          description: `Quiz verified: '${course?.title || "Course"}'`,
          timestamp: timeStr,
          fullTimestamp: fullTimeStr,
          txHash: result.txHash || undefined,
          txStatus: result.txStatus || "none",
          score: result.score,
          courseTitle: course?.title,
          verified: result.txStatus === "confirmed",
        });
      }
      
      // Add recent Q&A posts with verification data
      for (const post of recentQAPosts.slice(0, 3)) {
        const createdDate = new Date(post.createdAt);
        const timeDiff = Date.now() - createdDate.getTime();
        const minutes = Math.floor(timeDiff / 60000);
        const timeStr = minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hours ago`;
        const fullTimeStr = createdDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        recentActivity.push({
          type: post.parentId ? "answer" : "question",
          description: post.parentId ? "Q&A answer posted" : "Q&A question asked",
          timestamp: timeStr,
          fullTimestamp: fullTimeStr,
          txHash: post.txHash || undefined,
          verified: !!post.txHash,
        });
      }
      
      // Sort by most recent
      recentActivity.sort((a, b) => {
        // Parse timestamps for sorting - newer first
        const aTime = a.fullTimestamp ? new Date(a.fullTimestamp).getTime() : 0;
        const bTime = b.fullTimestamp ? new Date(b.fullTimestamp).getTime() : 0;
        return bTime - aTime;
      });

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
        issues: [`Service initialization error: ${sanitizeError(error)}`],
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

  app.post("/api/admin/reset-user", async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }
    
    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Reset all user data: progress, quiz results, rewards, certificates
    await storage.resetUserData(user.id);
    
    // Also reset anti-sybil quiz attempts
    const antiSybil = getAntiSybilService();
    await antiSybil.resetQuizAttempts(walletAddress);
    
    console.log(`[Admin] Full reset for wallet: ${walletAddress}`);
    res.json({ success: true, message: `All data reset for ${walletAddress}` });
  });

  // Test WASM RPC with Resolver connection
  app.get("/api/admin/wasm-rpc-test", async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const kaspaService = await getKaspaService();
    
    try {
      // This will test the WASM RPC Resolver connection used for tx submission
      const wasmTest = await kaspaService.testWasmRpcConnection();
      res.json(wasmTest);
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error), wasmRpcConnected: false });
    }
  });

  // Test RPC payload capability
  app.get("/api/admin/rpc-test", async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { txHash } = req.query;
    const kaspaService = await getKaspaService();
    
    try {
      const diagnostics = await kaspaService.getDiagnostics();
      
      // If a txHash is provided, test fetching it
      let payloadTest = null;
      if (txHash) {
        const result = await kaspaService.verifyQuizResult(txHash as string);
        payloadTest = {
          txHash,
          payloadReturned: result !== null,
          parsedData: result,
        };
      }
      
      res.json({
        rpcConnected: diagnostics.rpcConnected,
        rpcEndpoint: diagnostics.rpcEndpoint || "seeder2.kaspad.net:16110",
        blockCount: diagnostics.blockCount,
        payloadTest,
        note: "If payloadTest.payloadReturned is true, this RPC node supports getTransactionsByIds with payload data",
      });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Transaction monitoring with bitmasks
  app.get("/api/admin/tx-monitor", async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { type, status, hasFlag, limit = "50" } = req.query;
    
    try {
      const quizResults = await storage.getAllQuizResults();
      const rewards = await storage.getStats();
      
      // Build bitmask for each transaction
      const transactions = quizResults.map(r => {
        const flags: (keyof typeof TX_FLAGS)[] = ["HAS_PAYLOAD"];
        if (r.txHash && r.txStatus === "confirmed") flags.push("VERIFIED");
        if (r.txHash?.startsWith("demo_")) flags.push("DEMO_MODE");
        
        const mask = createTxBitmask({
          type: "QUIZ",
          status: r.txStatus === "confirmed" ? "CONFIRMED" : 
                  r.txStatus === "failed" ? "FAILED" : "PENDING",
          scorePercent: r.score,
          flags,
        });
        
        return {
          id: r.id,
          lessonId: r.lessonId,
          txHash: r.txHash,
          txStatus: r.txStatus,
          score: r.score,
          passed: r.passed,
          completedAt: r.completedAt,
          bitmask: mask,
          bitmaskHex: bitmaskToHex(mask),
          parsed: parseTxBitmask(mask),
        };
      });
      
      // Filter by criteria if provided
      let filtered = transactions;
      if (type || status || hasFlag) {
        filtered = transactions.filter(tx => {
          return matchesTxMask(tx.bitmask, {
            type: type as keyof typeof TX_TYPE | undefined,
            status: status as keyof typeof TX_STATUS | undefined,
            hasFlag: hasFlag as keyof typeof TX_FLAGS | undefined,
          });
        });
      }
      
      // Sort by most recent and limit
      filtered.sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      filtered = filtered.slice(0, parseInt(limit as string));
      
      res.json({
        total: transactions.length,
        filtered: filtered.length,
        transactions: filtered,
        bitmaskLegend: {
          types: TX_TYPE,
          statuses: TX_STATUS,
          flags: TX_FLAGS,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  app.get("/api/courses", async (_req: Request, res: Response) => {
    const courses = await storage.getCourses();
    res.json(courses);
  });

  app.get("/api/courses/stats", statsRateLimiter, async (_req: Request, res: Response) => {
    try {
      const completionCounts = await storage.getCourseCompletionCounts();
      const courses = await storage.getCourses();
      const stats: Record<string, { completions: number; totalKasPaid: number }> = {};
      
      for (const course of courses) {
        const completions = completionCounts.get(course.id) || 0;
        stats[course.id] = {
          completions,
          totalKasPaid: parseFloat((completions * course.kasReward).toFixed(2))
        };
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching course stats:", error);
      res.status(500).json({ error: "Failed to fetch course stats" });
    }
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
      return res.json({ canAttempt: false, reason: "Connect a real Kaspa wallet to earn rewards" });
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
    
    if (!antiSybil.acquireSubmissionLock(walletAddress, lessonId)) {
      return res.status(429).json({ 
        error: "Quiz submission in progress. Please wait.",
        code: "SUBMISSION_IN_PROGRESS",
      });
    }
    
    try {
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
    
    if (isFlagged) {
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

    // Save quiz result first (fast UX)
    const result = await storage.saveQuizResult({
      lessonId,
      userId: user.id,
      score,
      passed,
      txStatus: "pending",
    });

    await antiSybil.recordQuizCompletion(walletAddress, lessonId, score, passed, 0);
    
    // Create on-chain transaction for quiz result (async - don't block response)
    (async () => {
      try {
        const kaspaService = await getKaspaService();
        const quizPayload = createQuizPayload({
          walletAddress,
          courseId: lesson.courseId,
          lessonId,
          score,
          maxScore: 100,
          timestamp: Date.now(),
        }, answers);
        
        // Send payload to blockchain using public method
        const txResult = await kaspaService.sendQuizProof(quizPayload, walletAddress);
        
        if (txResult.success && txResult.txHash) {
          await storage.updateQuizResult(result.id, { 
            txHash: txResult.txHash, 
            txStatus: "confirmed" 
          });
          console.log(`[Quiz] On-chain TX confirmed: ${txResult.txHash} for lesson ${lessonId}`);
        } else {
          await storage.updateQuizResult(result.id, { txStatus: "failed" });
          console.log(`[Quiz] On-chain TX failed for lesson ${lessonId}: ${txResult.error}`);
        }
      } catch (error: any) {
        safeErrorLog("[Quiz] On-chain TX error:", error);
        await storage.updateQuizResult(result.id, { txStatus: "failed" });
      }
    })();

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
          // Always use full course reward (0.1 KAS for reward, proof tx sent separately)
          await storage.createCourseReward({
            courseId: lesson.courseId,
            userId: user.id,
            walletAddress: user.walletAddress,
            kasAmount: course.kasReward,
            averageScore: completion.averageScore,
            status: "pending",
          });
          console.log(`[Reward] Course reward created for ${user.walletAddress} - ${course.kasReward} KAS pending claim`);
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
            safeErrorLog("[Certificate] Image generation failed:", error);
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
          
          // Trigger discount operation to whitelist user for discounted NFT minting
          // This runs asynchronously to not block the quiz response
          (async () => {
            try {
              const isWhitelisted = await storage.isUserWhitelisted(user.id);
              if (!isWhitelisted) {
                console.log(`[Whitelist] Initiating discount operation for ${user.walletAddress}`);
                const discountService = getDiscountService();
                const discountResult = await discountService.applyDiscount(user.walletAddress);
                
                if (discountResult.success) {
                  const txHash = discountResult.revealTxHash || discountResult.commitTxHash || "demo";
                  await storage.setUserWhitelisted(user.id, txHash);
                  console.log(`[Whitelist] User ${user.walletAddress} whitelisted for discounted minting (tx: ${txHash})`);
                } else {
                  console.error(`[Whitelist] Failed to whitelist ${user.walletAddress}: ${discountResult.error}`);
                }
              } else {
                console.log(`[Whitelist] User ${user.walletAddress} already whitelisted`);
              }
            } catch (error: any) {
              console.error(`[Whitelist] Error applying discount for ${user.walletAddress}:`, error.message);
            }
          })();
        }
      }
    }

      res.json({
        ...result,
        courseCompleted: passed ? (await storage.checkCourseCompletion(user.id, lesson.courseId)).completed : false,
      });
    } catch (error: any) {
      console.error(`[Quiz] Submission error for ${walletAddress.slice(0, 20)}:`, error.message);
      res.status(500).json({ error: "Quiz submission failed" });
    } finally {
      antiSybil.releaseSubmissionLock(walletAddress, lessonId);
    }
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

    // Include whitelist status in user response
    const isWhitelisted = await storage.isUserWhitelisted(user.id);
    res.json({
      ...user,
      isWhitelisted,
    });
  });

  // Get whitelist status for NFT minting discount
  app.get("/api/whitelist/status", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    try {
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.json({ 
          isWhitelisted: false, 
          reason: "No account found - complete a course to get whitelisted" 
        });
      }

      const isWhitelisted = await storage.isUserWhitelisted(user.id);
      const discountService = getDiscountService();
      
      res.json({
        isWhitelisted,
        whitelistedAt: user.whitelistedAt,
        whitelistTxHash: user.whitelistTxHash,
        collection: discountService.getTicker(),
        discountFee: discountService.getDiscountFeeSompi().toString(),
        discountFeeKas: "10.5",
      });
    } catch (error: any) {
      console.error("[Whitelist] Status check failed:", error.message);
      res.status(500).json({ error: "Failed to check whitelist status" });
    }
  });

  // Manually trigger whitelist check/apply (for retry scenarios)
  app.post("/api/whitelist/apply", nftRateLimiter, async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    try {
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.status(400).json({ error: "No account found" });
      }

      // Check if user has at least one completed course
      const certificates = await storage.getCertificatesByUser(user.id);
      if (certificates.length === 0) {
        return res.status(400).json({ 
          error: "Must complete at least one course to be whitelisted" 
        });
      }

      // Check if already whitelisted
      const isWhitelisted = await storage.isUserWhitelisted(user.id);
      if (isWhitelisted) {
        return res.json({
          success: true,
          message: "Already whitelisted",
          whitelistedAt: user.whitelistedAt,
          whitelistTxHash: user.whitelistTxHash,
        });
      }

      // Apply discount operation
      console.log(`[Whitelist] Manual apply request for ${walletAddress}`);
      const discountService = getDiscountService();
      const result = await discountService.applyDiscount(walletAddress);

      if (result.success) {
        const txHash = result.revealTxHash || result.commitTxHash || "manual";
        await storage.setUserWhitelisted(user.id, txHash);
        
        res.json({
          success: true,
          message: "Whitelisted for discounted minting",
          commitTxHash: result.commitTxHash,
          revealTxHash: result.revealTxHash,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || "Whitelist operation failed",
        });
      }
    } catch (error: any) {
      console.error("[Whitelist] Apply failed:", error.message);
      res.status(500).json({ error: "Failed to apply whitelist" });
    }
  });

  // ============================================
  // DIPLOMA STATUS ENDPOINT
  // ============================================
  // Diploma eligibility is derived from certificate count
  // Users earn ONE diploma NFT after completing all 16 courses
  
  app.get("/api/diploma/status", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    try {
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.json({
          isEligible: false,
          coursesCompleted: 0,
          totalCoursesRequired: 16,
          progressPercent: 0,
          nftStatus: "not_eligible",
          reason: "No account found - complete courses to earn certificates",
        });
      }

      const courses = await storage.getCourses();
      // Hardcode 16 courses as the requirement (matches seed data)
      // Prevents edge case where empty course list causes NaN/immediate eligibility
      const totalCoursesRequired = Math.max(courses.length, 16);
      
      const certificates = await storage.getCertificatesByUser(user.id);
      const uniqueCourseIds = new Set(certificates.map(c => c.courseId));
      const coursesCompleted = uniqueCourseIds.size;
      const progressPercent = totalCoursesRequired > 0 
        ? Math.round((coursesCompleted / totalCoursesRequired) * 100) 
        : 0;
      
      // Require all courses AND at least 16 to prevent edge case exploits
      const isEligible = totalCoursesRequired > 0 && coursesCompleted >= totalCoursesRequired;
      
      // For MVP, diploma NFT status is tracked via certificate count
      // Future: Add dedicated diploma tracking table
      const nftStatus = isEligible ? "eligible" : "not_eligible";

      res.json({
        isEligible,
        coursesCompleted,
        totalCoursesRequired,
        progressPercent,
        nftStatus,
        completedCourseIds: Array.from(uniqueCourseIds),
        remainingCourses: totalCoursesRequired - coursesCompleted,
      });
    } catch (error: any) {
      console.error("[Diploma] Status check failed:", error.message);
      res.status(500).json({ error: "Failed to check diploma status" });
    }
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

  // Get user's quiz results with on-chain verification data
  app.get("/api/quiz-results", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.json([]);
    }

    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return res.json([]);
    }

    const quizResults = await storage.getQuizResultsByUser(user.id);
    
    // Enrich with lesson/course info
    const enrichedResults = await Promise.all(
      quizResults.map(async (result) => {
        const lesson = await storage.getLesson(result.lessonId);
        const course = lesson ? await storage.getCourse(lesson.courseId) : null;
        return {
          ...result,
          courseId: lesson?.courseId,
          courseTitle: course?.title || "Unknown Course",
          lessonTitle: lesson?.title || "Unknown Lesson",
        };
      })
    );
    
    res.json(enrichedResults);
  });

  app.get("/api/certificates", certificateRateLimiter, async (req: Request, res: Response) => {
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

  app.get("/api/certificates/:id", certificateRateLimiter, async (req: Request, res: Response) => {
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
    
    // Auto-verify confirming transactions in background
    const confirmingRewards = claimable.filter(r => r.status === "confirming" && r.txHash);
    if (confirmingRewards.length > 0) {
      (async () => {
        try {
          const kaspaService = await getKaspaService();
          for (const reward of confirmingRewards) {
            try {
              const verification = await kaspaService.verifyTransaction(reward.txHash!);
              if (verification.confirmed) {
                await storage.updateCourseReward(reward.id, {
                  status: "claimed",
                  txConfirmed: true
                });
                console.log(`[AutoVerify] Reward ${reward.id} confirmed on-chain`);
              }
            } catch (err) {
              console.log(`[AutoVerify] Could not verify ${reward.txHash}: ${err}`);
            }
          }
        } catch (err) {
          console.log(`[AutoVerify] Service error: ${err}`);
        }
      })();
    }
    
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
      const errorMsg = error.message || "Unknown error";
      console.error(`[Claim] Error: ${errorMsg}`);
      res.status(500).json({ 
        error: "Transaction failed", 
        message: errorMsg,
        details: `Claim error: ${errorMsg}`
      });
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
      return res.status(500).json({ error: "Verification failed", message: sanitizeError(error) });
    }
  });

  app.get("/api/qa/:lessonId", async (req: Request, res: Response) => {
    const posts = await storage.getQAPostsByLesson(req.params.lessonId);
    res.json(posts);
  });

  app.post("/api/qa/:lessonId", async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { content, isQuestion, authorAddress, postOnChain, signature, signedPayload, authorPubkey } = req.body;

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

    // Post on-chain if requested (with user signature if available)
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
      signature: signature || undefined,
      signedPayload: signedPayload || undefined,
      authorPubkey: authorPubkey || undefined,
    });

    res.json({
      ...post,
      onChainStatus,
      onChainError,
      signed: !!signature,
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
    });
  });

  // KRC-721 NFT Service Health Check
  app.get("/api/nft/health", nftRateLimiter, async (_req: Request, res: Response) => {
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
  app.get("/api/nft/collection", nftRateLimiter, async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const info = await krc721Service.getCollectionInfo();
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Prepare non-custodial NFT mint - returns P2SH address for user to pay directly
  app.post("/api/nft/prepare/:id", nftRateLimiter, async (req: Request, res: Response) => {
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
    // If so, RETURN THE EXISTING RESERVATION instead of creating a new one
    // This prevents the bug where a new P2SH is generated but the user has the old one cached
    const existingReservation = await mintStorage.getByCertificateId(id);
    if (existingReservation) {
      const now = new Date();
      const isExpired = existingReservation.expiresAt < now;
      const isPaid = existingReservation.status === "paid" || existingReservation.commitTxHash;
      
      if (!isExpired) {
        // Return the existing reservation's P2SH - this is critical for page refresh scenarios
        console.log(`[Prepare] Returning existing reservation for ${id}: ${existingReservation.p2shAddress.slice(0, 25)}...`);
        return res.json({
          success: true,
          p2shAddress: existingReservation.p2shAddress,
          amountSompi: "1050000000",
          amountKas: "10.5",
          tokenId: existingReservation.tokenId,
          expiresAt: existingReservation.expiresAt.getTime(),
          imageUrl: certificate.imageUrl,
          existingReservation: true, // Flag so frontend knows this is a retry
          isPaid,
        });
      } else {
        // Reservation expired - delete it and allow creating a new one
        console.log(`[Prepare] Reservation expired for ${id}, clearing...`);
        await mintStorage.deleteReservation(existingReservation.p2shAddress);
        if (certificate.nftStatus === "minting") {
          await storage.updateCertificate(id, { nftStatus: "pending" });
        }
      }
    } else if (certificate.nftStatus === "minting") {
      // Status is minting but no reservation exists - reset status
      await storage.updateCertificate(id, { nftStatus: "pending" });
    }

    try {
      console.log(`[Prepare] Starting prepare for certificate ${id} and wallet ${walletAddress.slice(0, 25)}...`);
      const krc721Service = await getKRC721Service();

      // Use pre-uploaded course asset image instead of generating on-the-fly
      let imageUrl: string = certificate.imageUrl || "";
      const needsImageUrl = !imageUrl || !imageUrl.startsWith("ipfs://");
      
      if (needsImageUrl) {
        // Look up the pre-uploaded course asset
        const courseAsset = await storage.getCourseAsset(certificate.courseId);
        if (!courseAsset) {
          console.error(`[Prepare] No pre-uploaded image for course ${certificate.courseId}`);
          return res.status(503).json({
            error: "Course image not uploaded",
            message: "Admin must upload course images to IPFS first via /api/admin/upload-course-images"
          });
        }
        
        imageUrl = courseAsset.imageIpfsUrl;
        console.log(`[Prepare] Using pre-uploaded course image: ${imageUrl}`);
        
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
        const { logError } = await import("./error-logger");
        await logError("nft", "prepare", prepareResult.error || "Failed to prepare NFT mint", {
          certificateId: id,
          recipientAddress: certificate.recipientAddress,
        }, walletAddress, getClientIP(req));
        return res.status(500).json({ 
          error: "Prepare failed",
          message: prepareResult.error || "Failed to prepare NFT mint"
        });
      }
    } catch (error: any) {
      safeErrorLog("[Prepare] Error:", error);
      const { logError } = await import("./error-logger");
      await logError("nft", "prepare", error.message, {
        certificateId: id,
        stack: error.stack,
      }, walletAddress, getClientIP(req));
      return res.status(500).json({ error: "Prepare failed", message: sanitizeError(error) });
    }
  });

  // Finalize non-custodial NFT mint - verifies user's commit tx and submits reveal
  app.post("/api/nft/finalize/:id", nftRateLimiter, async (req: Request, res: Response) => {
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
      console.log(`[Finalize] Starting finalize for certificate ${id}, P2SH: ${p2shAddress.slice(0, 30)}...`);
      const krc721Service = await getKRC721Service();

      // Finalize the mint - server submits reveal transaction
      const finalizeResult = await krc721Service.finalizeMint(p2shAddress, id, commitTxHash);
      console.log(`[Finalize] Result:`, JSON.stringify(finalizeResult));

      if (finalizeResult.success && finalizeResult.revealTxHash) {
        await storage.updateCertificate(id, {
          nftStatus: "claimed",
          nftTxHash: finalizeResult.revealTxHash,
        });

        console.log(`[Finalize] NFT minted for certificate ${id}, txHash: ${finalizeResult.revealTxHash}`);
        
        // Reload certificate to get the updated imageUrl from prepare step
        const updatedCert = await storage.getCertificate(id);
        const imageUrl = updatedCert?.imageUrl || certificate.imageUrl;
        
        // Update metadata folder with the confirmed tokenId
        if (finalizeResult.tokenId !== undefined && imageUrl?.startsWith("ipfs://")) {
          try {
            const { getMetadataManager } = await import("./nft-metadata-manager");
            const metadataManager = getMetadataManager();
            
            const metadataResult = await metadataManager.addTokenMetadata(
              finalizeResult.tokenId,
              updatedCert?.courseName || certificate.courseName,
              updatedCert?.score || certificate.score || 100,
              updatedCert?.recipientAddress || certificate.recipientAddress,
              updatedCert?.issuedAt || certificate.issuedAt,
              imageUrl
            );
            
            if (metadataResult.success) {
              console.log(`[Finalize] Metadata updated for token #${finalizeResult.tokenId}: ${metadataResult.metadataUrl}`);
            } else {
              console.warn(`[Finalize] Metadata update failed (non-fatal): ${metadataResult.error}`);
            }
          } catch (metadataError: any) {
            console.warn(`[Finalize] Metadata update error (non-fatal): ${metadataError.message}`);
          }
        }
        
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
        
        const { logError } = await import("./error-logger");
        await logError("nft", "finalize", finalizeResult.error || "NFT minting transaction failed", {
          certificateId: id,
          p2shAddress,
          commitTxHash,
        }, walletAddress, getClientIP(req));
        
        return res.status(500).json({ 
          success: false,
          error: "Finalize failed",
          message: finalizeResult.error || "NFT minting transaction failed"
        });
      }
    } catch (error: any) {
      await storage.updateCertificate(id, { nftStatus: "pending" });
      safeErrorLog("[Finalize] Error:", error);
      
      const { logError } = await import("./error-logger");
      await logError("nft", "finalize", error.message, {
        certificateId: id,
        p2shAddress,
        commitTxHash,
        stack: error.stack,
      }, walletAddress, getClientIP(req));
      
      return res.status(500).json({ success: false, error: "Finalize failed", message: sanitizeError(error) });
    }
  });

  // ============================================
  // USER-SIGNED NFT MINTING (NEW ARCHITECTURE)
  // User signs the mint transaction themselves and appears as on-chain minter
  // ============================================

  // Reserve a tokenId for user-signed minting
  app.post("/api/nft/reserve/:certificateId", nftRateLimiter, async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { certificateId } = req.params;
    
    const certificate = await storage.getCertificate(certificateId);
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
      const { mintService } = await import("./mint-service");
      
      // Reserve and build inscription per KRC-721 spec
      // Note: Token metadata comes from collection's buri, not per-token inscription
      const result = await mintService.reserveMint(
        certificateId, 
        certificate.courseId, 
        walletAddress
      );

      if ("error" in result) {
        return res.status(400).json({ error: result.error });
      }

      console.log(`[Reserve] TokenId ${result.reservation.tokenId} reserved for ${walletAddress.slice(0, 20)}...`);
      
      return res.json({
        success: true,
        reservationId: result.reservation.id,
        tokenId: result.reservation.tokenId,
        inscriptionJson: result.inscriptionJson,
        expiresAt: result.reservation.expiresAt.getTime(),
        courseId: certificate.courseId,
        courseName: certificate.courseName,
      });
    } catch (error: any) {
      console.error("[Reserve] Error:", error.message);
      return res.status(500).json({ error: "Failed to reserve token", message: sanitizeError(error) });
    }
  });

  // Update reservation status when user starts signing
  app.post("/api/nft/signing/:reservationId", nftRateLimiter, async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { reservationId } = req.params;

    try {
      const reservation = await storage.getMintReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      if (reservation.walletAddress !== walletAddress) {
        return res.status(403).json({ error: "Not your reservation" });
      }

      const { mintService } = await import("./mint-service");
      const updated = await mintService.updateReservationSigning(reservationId);

      if (!updated) {
        return res.status(500).json({ error: "Failed to update reservation" });
      }

      return res.json({ success: true, status: updated.status });
    } catch (error: any) {
      console.error("[Signing] Error:", error.message);
      return res.status(500).json({ error: "Failed to update reservation", message: sanitizeError(error) });
    }
  });

  // Confirm user-signed mint transaction
  app.post("/api/nft/confirm/:reservationId", nftRateLimiter, async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { reservationId } = req.params;
    const { mintTxHash } = req.body;

    if (!mintTxHash) {
      return res.status(400).json({ error: "Mint transaction hash is required" });
    }

    try {
      const reservation = await storage.getMintReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      if (reservation.walletAddress !== walletAddress) {
        return res.status(403).json({ error: "Not your reservation" });
      }

      const { mintService } = await import("./mint-service");
      const result = await mintService.confirmMint(reservationId, mintTxHash);

      if ("error" in result) {
        return res.status(400).json({ error: result.error });
      }

      console.log(`[Confirm] NFT minted - tokenId: ${result.reservation.tokenId}, tx: ${mintTxHash.slice(0, 16)}...`);

      return res.json({
        success: true,
        tokenId: result.reservation.tokenId,
        mintTxHash: result.reservation.mintTxHash,
        status: result.reservation.status,
      });
    } catch (error: any) {
      console.error("[Confirm] Error:", error.message);
      return res.status(500).json({ error: "Failed to confirm mint", message: sanitizeError(error) });
    }
  });

  // Cancel a mint reservation
  app.post("/api/nft/cancel/:reservationId", nftRateLimiter, async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { reservationId } = req.params;

    try {
      const reservation = await storage.getMintReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      if (reservation.walletAddress !== walletAddress) {
        return res.status(403).json({ error: "Not your reservation" });
      }

      const { mintService } = await import("./mint-service");
      const cancelled = await mintService.cancelReservation(reservationId);

      return res.json({ success: cancelled });
    } catch (error: any) {
      console.error("[Cancel] Error:", error.message);
      return res.status(500).json({ error: "Failed to cancel reservation", message: sanitizeError(error) });
    }
  });

  // Get mint stats for a course
  app.get("/api/nft/stats/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
      const { mintService } = await import("./mint-service");
      const stats = await mintService.getMintStats(courseId);
      return res.json(stats);
    } catch (error: any) {
      console.error("[MintStats] Error:", error.message);
      return res.status(500).json({ error: "Failed to get mint stats" });
    }
  });

  // Get active reservation for a certificate
  app.get("/api/nft/active-reservation/:certificateId", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    const { certificateId } = req.params;
    
    try {
      const reservation = await storage.getMintReservationByCertificate(certificateId);
      
      if (!reservation) {
        return res.json({ hasReservation: false });
      }

      if (reservation.walletAddress !== walletAddress) {
        return res.status(403).json({ error: "Not your reservation" });
      }

      const now = new Date();
      const expiresAt = new Date(reservation.expiresAt).getTime();
      const isExpired = now.getTime() > expiresAt;

      if (isExpired) {
        return res.json({ hasReservation: true, isExpired: true });
      }

      const certificate = await storage.getCertificate(certificateId);
      const courseName = certificate?.courseName || "Unknown Course";

      return res.json({
        hasReservation: true,
        isExpired: false,
        reservationId: reservation.id,
        tokenId: reservation.tokenId,
        inscriptionJson: reservation.inscriptionJson,
        expiresAt: expiresAt,
        courseId: reservation.courseId,
        courseName: courseName,
        status: reservation.status,
      });
    } catch (error: any) {
      console.error("[ActiveReservation] Error:", error.message);
      return res.status(500).json({ error: "Failed to get reservation" });
    }
  });

  // Operational metrics endpoint for monitoring supply state
  app.get("/api/nft/metrics", async (_req: Request, res: Response) => {
    try {
      const counters = await storage.getAllCourseCounters();
      const metrics = await Promise.all(
        counters.map(async (counter) => {
          const recyclePoolDepth = await storage.getRecyclePoolDepth(counter.courseId);
          const mintedCount = await storage.getMintedTokenCount(counter.courseId);
          return {
            courseId: counter.courseId,
            courseIndex: counter.courseIndex,
            counterOffset: counter.nextTokenOffset,
            recyclePoolDepth,
            mintedCount,
            maxTokens: 1000,
            isSoldOut: counter.nextTokenOffset >= 1000 && recyclePoolDepth === 0,
            availableSupply: Math.max(0, 1000 - counter.nextTokenOffset) + recyclePoolDepth,
          };
        })
      );
      return res.json({ metrics, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error("[NFTMetrics] Error:", error.message);
      return res.status(500).json({ error: "Failed to get NFT metrics" });
    }
  });

  // Legacy claim endpoint - DISABLED for mainnet (use user-signed mint flow instead)
  // This endpoint used treasury-signed minting which is deprecated.
  // Keep endpoint registered to avoid 404s but return clear deprecation message.
  app.post("/api/certificates/:id/claim", async (_req: Request, res: Response) => {
    return res.status(410).json({ 
      error: "This endpoint is deprecated",
      message: "Please use the new user-signed minting flow. Click 'Mint NFT' on your certificate card to mint directly with your wallet.",
      migrationPath: "/api/nft/reserve -> /api/nft/signing -> /api/nft/confirm"
    });
  });

  // Get reservation status for a certificate (for retry functionality)
  app.get("/api/nft/reservation/:id", nftRateLimiter, async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const reservation = await mintStorage.getByCertificateId(id);
      
      if (!reservation) {
        return res.json({ hasReservation: false });
      }
      
      const now = new Date();
      const isExpired = reservation.expiresAt < now;
      const isPaid = reservation.status === "paid" || reservation.commitTxHash;
      
      res.json({
        hasReservation: true,
        p2shAddress: reservation.p2shAddress,
        status: reservation.status,
        isPaid,
        isExpired,
        commitTxHash: reservation.commitTxHash,
        expiresAt: reservation.expiresAt.getTime(),
      });
    } catch (error: any) {
      safeErrorLog("[NFT] Failed to get reservation:", error);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Get minting fee info (non-custodial - user pays directly)
  app.get("/api/nft/fee", nftRateLimiter, async (_req: Request, res: Response) => {
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
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Generate certificate image preview
  app.get("/api/nft/preview", nftRateLimiter, async (req: Request, res: Response) => {
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
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Scan blockchain for KU protocol transactions (Kaspa Education Explorer)
  app.get("/api/explorer/scan", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const kaspaService = await getKaspaService();
      const treasuryAddress = kaspaService.getTreasuryAddress();
      
      if (!treasuryAddress) {
        return res.json({ transactions: [], error: "Treasury not configured" });
      }
      
      // Fetch transactions from Kaspa REST API (includes payload data)
      const apiUrl = `https://api.kaspa.org/addresses/${treasuryAddress}/full-transactions?limit=${limit}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const transactions = await response.json();
      const kuTransactions: any[] = [];
      
      // Get courses for title mapping
      const courses = await storage.getCourses();
      const courseMap = new Map(courses.map((c: any) => [c.id, c.title]));
      
      for (const tx of transactions) {
        if (tx.payload) {
          // Try to parse as KU protocol
          const parsed = parseKUPayload(tx.payload);
          if (parsed) {
            // Kaspa block_time is in milliseconds already (verified from API response)
            const timestamp = tx.block_time || Date.now();
            
            const kuTx: any = {
              txHash: tx.transaction_id,
              type: parsed.type === "quiz" ? "quiz" : 
                    parsed.type === "qa_q" ? "qa_question" : 
                    parsed.type === "qa_a" ? "qa_answer" : "unknown",
              timestamp,
              blockHash: tx.accepting_block_hash,
              confirmed: tx.is_accepted,
              rawPayload: tx.payload,
            };
            
            if (parsed.quiz) {
              kuTx.walletAddress = parsed.quiz.walletAddress;
              kuTx.courseId = parsed.quiz.courseId;
              kuTx.courseTitle = courseMap.get(parsed.quiz.courseId) || parsed.quiz.courseId;
              kuTx.lessonId = parsed.quiz.lessonId;
              kuTx.score = parsed.quiz.score;
              kuTx.maxScore = parsed.quiz.maxScore;
              kuTx.contentHash = parsed.quiz.contentHash;
            } else if (parsed.question) {
              kuTx.walletAddress = parsed.question.authorAddress;
              kuTx.lessonId = parsed.question.lessonId;
              kuTx.contentHash = parsed.question.contentHash;
              kuTx.content = parsed.question.content;
            } else if (parsed.answer) {
              kuTx.walletAddress = parsed.answer.authorAddress;
              kuTx.questionTxId = parsed.answer.questionTxId;
              kuTx.contentHash = parsed.answer.contentHash;
              kuTx.content = parsed.answer.content;
            }
            
            kuTransactions.push(kuTx);
          }
        }
      }
      
      res.json({
        transactions: kuTransactions,
        total: kuTransactions.length,
        scanned: transactions.length,
        treasuryAddress,
        source: "blockchain",
      });
    } catch (error: any) {
      console.error("[Explorer] Error scanning blockchain:", error);
      res.json({ transactions: [], error: error.message });
    }
  });

  // Get recent verified transactions for the explorer (combines DB + blockchain)
  app.get("/api/verify/recent", async (_req: Request, res: Response) => {
    try {
      // Get recent quiz results and Q&A posts from storage
      const quizResults = await storage.getRecentQuizResults(10);
      const qaPosts = await storage.getRecentQAPosts(10);
      
      const dbTxs = [
        ...quizResults
          .filter(r => r.txHash && r.txStatus === "confirmed")
          .map(r => ({
            txHash: r.txHash!,
            type: "quiz" as const,
            timestamp: new Date(r.completedAt).getTime(),
            walletAddress: r.userId,
            courseId: r.lessonId.split("-")[0],
            score: r.score,
            maxScore: 100,
            source: "database" as const,
          })),
        ...qaPosts.map(p => ({
          txHash: p.txHash || `demo_qa_${p.id}`,
          type: p.isQuestion ? "qa_question" as const : "qa_answer" as const,
          timestamp: new Date(p.createdAt).getTime(),
          walletAddress: p.authorAddress,
          source: "database" as const,
        })),
      ];

      // Also try to fetch from blockchain for live data
      try {
        const kaspaService = await getKaspaService();
        const treasuryAddress = kaspaService.getTreasuryAddress();
        
        if (treasuryAddress) {
          const apiUrl = `https://api.kaspa.org/addresses/${treasuryAddress}/full-transactions?limit=20`;
          const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
          
          if (response.ok) {
            const transactions = await response.json();
            
            for (const tx of transactions) {
              if (tx.payload) {
                const parsed = parseKUPayload(tx.payload);
                if (parsed && !dbTxs.some(t => t.txHash === tx.transaction_id)) {
                  const blockchainTx: any = {
                    txHash: tx.transaction_id,
                    type: parsed.type === "quiz" ? "quiz" : 
                          parsed.type === "qa_q" ? "qa_question" : 
                          parsed.type === "qa_a" ? "qa_answer" : "unknown",
                    timestamp: tx.block_time || Date.now(),
                    source: "blockchain",
                  };
                  
                  if (parsed.quiz) {
                    blockchainTx.walletAddress = parsed.quiz.walletAddress;
                    blockchainTx.courseId = parsed.quiz.courseId;
                    blockchainTx.score = parsed.quiz.score;
                    blockchainTx.maxScore = parsed.quiz.maxScore;
                  } else if (parsed.question) {
                    blockchainTx.walletAddress = parsed.question.authorAddress;
                  } else if (parsed.answer) {
                    blockchainTx.walletAddress = parsed.answer.authorAddress;
                  }
                  
                  dbTxs.push(blockchainTx);
                }
              }
            }
          }
        }
      } catch (blockchainError) {
        // Silently continue with DB results if blockchain fetch fails
        console.log("[Explorer] Blockchain fetch skipped:", (blockchainError as Error).message);
      }
      
      const recentTxs = dbTxs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      res.json(recentTxs);
    } catch (error: any) {
      console.error("[API] Error fetching recent verifications:", error);
      res.json([]);
    }
  });

  // Get blockchain statistics for KU Protocol
  app.get("/api/blockchain-stats", async (_req: Request, res: Response) => {
    try {
      // Get KU Protocol stats from our database
      const allQuizResults = await storage.getAllQuizResults();
      const allRewards = await storage.getAllCourseRewards();
      const allCertificates = await storage.getAllCertificates();
      const users = await storage.getAllUsers();
      
      // Count confirmed on-chain transactions
      const confirmedQuizProofs = allQuizResults.filter(r => r.txHash && r.txStatus === "confirmed" && !r.txHash.startsWith("demo_"));
      const confirmedRewards = allRewards.filter(r => r.txHash && r.status === "claimed" && !r.txHash.startsWith("demo_") && !r.txHash.startsWith("pending_"));
      
      // Calculate daily activity (last 7 days)
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const dailyActivity: { date: string; quizProofs: number; rewards: number }[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now - (i * oneDayMs));
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + oneDayMs);
        
        const dayQuizProofs = confirmedQuizProofs.filter(r => {
          const completedAt = new Date(r.completedAt).getTime();
          return completedAt >= dayStart.getTime() && completedAt < dayEnd.getTime();
        }).length;
        
        const dayRewards = confirmedRewards.filter(r => {
          const completedAt = new Date(r.completedAt).getTime();
          return completedAt >= dayStart.getTime() && completedAt < dayEnd.getTime();
        }).length;
        
        dailyActivity.push({
          date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          quizProofs: dayQuizProofs,
          rewards: dayRewards,
        });
      }
      
      // Calculate total KAS distributed
      const totalKasDistributed = confirmedRewards.reduce((sum, r) => sum + (r.kasAmount || 0), 0);
      
      // Get network info from Kaspa RPC
      let networkInfo: { blockCount?: number; difficulty?: number; networkName?: string } = {};
      try {
        const kaspaService = await import("./kaspa");
        const service = await kaspaService.getKaspaService();
        const diagnostics = await service.getDiagnostics();
        networkInfo = {
          blockCount: diagnostics.blockCount,
          networkName: diagnostics.networkName,
        };
      } catch (e) {
        console.log("[Stats] Could not fetch network info:", (e as Error).message);
      }
      
      res.json({
        kuProtocol: {
          totalQuizProofs: confirmedQuizProofs.length,
          totalRewards: confirmedRewards.length,
          totalCertificates: allCertificates.length,
          totalUsers: users.length,
          totalKasDistributed: Math.round(totalKasDistributed * 100) / 100,
          pendingQuizProofs: allQuizResults.filter(r => r.txStatus === "pending").length,
        },
        dailyActivity,
        network: networkInfo,
        lastUpdated: Date.now(),
      });
    } catch (error: any) {
      console.error("[API] Error fetching blockchain stats:", error);
      res.status(500).json({ error: "Failed to fetch blockchain stats" });
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
      // Try direct REST API first for full payload access (with timeout)
      const apiUrl = `https://api.kaspa.org/transactions/${txHash}`;
      const apiResponse = await fetch(apiUrl, { 
        signal: AbortSignal.timeout(8000) // 8 second timeout
      }).catch(() => null);
      
      if (apiResponse?.ok) {
        const txData = await apiResponse.json();
        
        if (txData.payload) {
          const parsed = parseKUPayload(txData.payload);
          
          if (parsed) {
            let type: "quiz" | "qa_question" | "qa_answer" = "quiz";
            let data: any = {};
            
            if (parsed.type === "quiz" && parsed.quiz) {
              type = "quiz";
              data = {
                walletAddress: parsed.quiz.walletAddress,
                courseId: parsed.quiz.courseId,
                lessonId: parsed.quiz.lessonId,
                score: parsed.quiz.score,
                maxScore: parsed.quiz.maxScore,
                timestamp: parsed.quiz.timestamp,
                contentHash: parsed.quiz.contentHash,
              };
            } else if (parsed.type === "qa_q" && parsed.question) {
              type = "qa_question";
              data = {
                lessonId: parsed.question.lessonId,
                walletAddress: parsed.question.authorAddress,
                timestamp: parsed.question.timestamp,
                contentHash: parsed.question.contentHash,
                content: parsed.question.content,
              };
            } else if (parsed.type === "qa_a" && parsed.answer) {
              type = "qa_answer";
              data = {
                questionTxId: parsed.answer.questionTxId,
                walletAddress: parsed.answer.authorAddress,
                timestamp: parsed.answer.timestamp,
                contentHash: parsed.answer.contentHash,
                content: parsed.answer.content,
              };
            }
            
            return res.json({
              verified: true,
              type,
              data,
              txExists: true,
              txConfirmed: txData.is_accepted,
              blockTime: txData.block_time,
              source: "blockchain",
            });
          }
        }
        
        // Transaction exists but no KU payload
        return res.json({
          verified: false,
          message: "Transaction exists but does not contain KU Protocol data",
          txExists: true,
          txConfirmed: txData.is_accepted,
          type: "unknown",
        });
      }

      // Fall back to kaspaService if REST API fails
      const kaspaService = await getKaspaService();
      const txVerification = await kaspaService.verifyTransaction(txHash);
      
      if (!txVerification.exists) {
        return res.json({
          verified: false,
          message: "Transaction not found on Kaspa network",
          txExists: false,
          type: "unknown",
        });
      }

      // Try to verify as quiz result
      const quizResult = await kaspaService.verifyQuizResult(txHash);
      if (quizResult) {
        return res.json({
          verified: true,
          type: "quiz",
          data: quizResult,
          txExists: true,
          txConfirmed: txVerification.confirmed
        });
      }

      // Try to verify as Q&A content
      const qaContent = await kaspaService.verifyQAContent(txHash);
      if (qaContent) {
        return res.json({
          verified: true,
          type: "questionTxId" in qaContent ? "qa_answer" : "qa_question",
          data: qaContent,
          txExists: true,
          txConfirmed: txVerification.confirmed
        });
      }

      return res.json({
        verified: false,
        message: "Transaction exists but KU protocol payload not found",
        txExists: true,
        txConfirmed: txVerification.confirmed,
        type: "unknown",
      });
    } catch (error) {
      console.error("[Verify] Error:", error);
      return res.json({
        verified: false,
        message: "Failed to verify transaction",
        type: "unknown",
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
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // ========== ADMIN API ENDPOINTS ==========
  // Simple password protection - in production use proper auth
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kaspa2025";
  
  const adminAuth = (req: Request, res: Response, next: () => void) => {
    const password = req.headers["x-admin-password"] as string;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Get all certificates (admin)
  app.get("/api/admin/certificates", adminAuth, async (_req: Request, res: Response) => {
    try {
      const allCerts = await storage.getAllCertificates();
      res.json(allCerts);
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Get all mint reservations (admin)
  app.get("/api/admin/reservations", adminAuth, async (_req: Request, res: Response) => {
    try {
      const reservations = await mintStorage.getAllReservations();
      res.json(reservations);
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Get error logs (admin)
  app.get("/api/admin/errors", adminAuth, async (req: Request, res: Response) => {
    try {
      const { getRecentErrors } = await import("./error-logger");
      const limit = parseInt(req.query.limit as string) || 50;
      const errors = await getRecentErrors(limit);
      res.json(errors);
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Mark error as resolved (admin)
  app.post("/api/admin/errors/:id/resolve", adminAuth, async (req: Request, res: Response) => {
    try {
      const { markErrorResolved } = await import("./error-logger");
      const success = await markErrorResolved(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Reset certificate status to pending (admin)
  // NOTE: This does NOT delete reservations to preserve P2SH addresses for fund recovery
  app.post("/api/admin/certificates/:id/reset", adminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { deleteReservation } = req.body; // Optional: explicitly request deletion
      
      const certificate = await storage.getCertificate(id);
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      // Get existing reservation info for logging
      const existingReservation = await mintStorage.getByCertificateId(id);
      let p2shAddress = existingReservation?.p2shAddress;

      // Reset the certificate status
      await storage.updateCertificate(id, { 
        nftStatus: "pending",
        nftTxHash: undefined,
      });

      // Only delete reservation if explicitly requested (to preserve P2SH for fund recovery)
      if (deleteReservation === true && existingReservation) {
        await mintStorage.deleteReservationByCertificateId(id);
        console.log(`[Admin] Reset certificate ${id} and deleted reservation`);
      } else if (existingReservation) {
        // Mark reservation as failed but keep the P2SH address for recovery
        await mintStorage.markFailed(existingReservation.p2shAddress);
        console.log(`[Admin] Reset certificate ${id}, marked reservation as failed (P2SH preserved: ${p2shAddress?.slice(0, 30)}...)`);
      } else {
        console.log(`[Admin] Reset certificate ${id} (no reservation found)`);
      }

      res.json({ 
        success: true, 
        message: "Certificate reset to pending",
        p2shPreserved: existingReservation ? p2shAddress : null
      });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { getRecentErrors } = await import("./error-logger");
      const allCerts = await storage.getAllCertificates();
      const reservations = await mintStorage.getAllReservations();
      const errors = await getRecentErrors(100);
      
      const stats = {
        certificates: {
          total: allCerts.length,
          pending: allCerts.filter(c => c.nftStatus === "pending").length,
          minting: allCerts.filter(c => c.nftStatus === "minting").length,
          claimed: allCerts.filter(c => c.nftStatus === "claimed").length,
        },
        reservations: {
          total: reservations.length,
          pending: reservations.filter(r => r.status === "pending").length,
          finalized: reservations.filter(r => r.status === "finalized").length,
          expired: reservations.filter(r => r.status === "expired").length,
        },
        errors: {
          total: errors.length,
          unresolved: errors.filter(e => !e.resolved).length,
          byCategory: errors.reduce((acc: Record<string, number>, e) => {
            acc[e.category] = (acc[e.category] || 0) + 1;
            return acc;
          }, {}),
        }
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Delete a specific reservation by ID (admin)
  app.delete("/api/admin/reservations/:id", adminAuth, async (req: Request, res: Response) => {
    try {
      await mintStorage.deleteReservationById(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Deploy the KRC-721 NFT collection (one-time operation)
  app.post("/api/admin/deploy-collection", adminAuth, async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const collectionInfo = await krc721Service.getCollectionInfo();
      
      if (collectionInfo.isDeployed) {
        return res.json({ 
          success: true, 
          message: "Collection already deployed",
          collection: collectionInfo 
        });
      }

      if (!krc721Service.isLive()) {
        return res.status(503).json({ 
          error: "KRC-721 service not live. Check RPC connection and treasury keys." 
        });
      }

      // Use pre-uploaded deterministic CID for collection image
      // This ensures the same CID is used for every deploy, preventing indexer mismatches
      // Pre-uploaded via: npx tsx /tmp/upload-collection-image.ts
      const MAINNET_COLLECTION_CID = "QmePybcjw8MVigsaf5cXBKfoqW5kF5EEK9enxQNwMkbX4y";
      
      // For mainnet, use the pre-uploaded deterministic CID
      // For testnet, we can still upload fresh (for testing image changes)
      const isMainnet = process.env.KRC721_TESTNET !== "true";
      let collectionImageUrl: string;
      
      if (isMainnet) {
        // MAINNET: Use hardcoded CID for deterministic deployment
        collectionImageUrl = `ipfs://${MAINNET_COLLECTION_CID}`;
        console.log(`[Admin] Using pre-uploaded mainnet collection image: ${collectionImageUrl}`);
      } else {
        // TESTNET: Upload fresh for testing flexibility
        const { getPinataService } = await import("./pinata");
        const pinataService = getPinataService();
        const fs = await import("fs/promises");
        const path = await import("path");
        
        if (!pinataService.isConfigured()) {
          return res.status(503).json({ 
            error: "Pinata IPFS not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY secrets before deploying." 
          });
        }
        
        const collectionImagePath = path.join(process.cwd(), "attached_assets", "certificate_dag.svg");
        let collectionSvg: string;
        try {
          collectionSvg = await fs.readFile(collectionImagePath, "utf-8");
          console.log(`[Admin] Loaded pregenerated collection image from ${collectionImagePath}`);
        } catch (err: any) {
          return res.status(500).json({ 
            error: `Failed to load collection image: ${err.message}. Ensure attached_assets/certificate_dag.svg exists.` 
          });
        }
        
        const uploadResult = await pinataService.uploadImage(
          collectionSvg,
          `KUDIPLOMA-collection-${Date.now()}`
        );
        
        if (!uploadResult.success || !uploadResult.ipfsUrl) {
          return res.status(500).json({ 
            error: `Failed to upload collection image to IPFS: ${uploadResult.error || 'Unknown error'}` 
          });
        }
        
        collectionImageUrl = uploadResult.ipfsUrl;
        console.log(`[Admin] Testnet collection image uploaded: ${collectionImageUrl}`);
      }
      const result = await krc721Service.deployCollection(collectionImageUrl);
      
      if (result.success) {
        console.log(`[Admin] Collection deployed! Commit: ${result.commitTxHash}, Reveal: ${result.revealTxHash}`);
        res.json({
          success: true,
          message: "Collection deployed successfully",
          commitTxHash: result.commitTxHash,
          revealTxHash: result.revealTxHash,
          collection: await krc721Service.getCollectionInfo()
        });
      } else {
        console.error(`[Admin] Collection deployment failed: ${result.error}`);
        res.status(500).json({ error: result.error || "Deployment failed" });
      }
    } catch (error: any) {
      console.error("[Admin] Deploy collection error:", error.message);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Get KRC-721 collection status
  app.get("/api/admin/collection-status", adminAuth, async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const collectionInfo = await krc721Service.getCollectionInfo();
      res.json(collectionInfo);
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Upload all course certificate images to IPFS (one-time setup)
  app.post("/api/admin/upload-course-images", adminAuth, async (_req: Request, res: Response) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const { getPinataService } = await import("./pinata");
      const { courses } = await import("./seed-data");
      
      const pinataService = getPinataService();
      if (!pinataService.isConfigured()) {
        return res.status(503).json({ 
          error: "Pinata not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY secrets." 
        });
      }

      // Map course IDs to SVG file names
      const courseImageMap: Record<string, string> = {
        "bitcoin-vs-kaspa": "01-bitcoin-vs-kaspa.svg",
        "dag-terminology": "02-dag-terminology.svg",
        "dag-and-kaspa": "03-dag-and-kaspa.svg",
        "foundational-concepts": "04-foundational-concepts.svg",
        "core-data-structures": "05-core-data-structures.svg",
        "ghostdag-mechanics": "06-ghostdag-mechanics.svg",
        "consensus-parameters": "07-consensus-parameters.svg",
        "block-processing": "08-block-processing.svg",
        "difficulty-adjustment": "09-difficulty-adjustment.svg",
        "transaction-processing": "10-transaction-processing.svg",
        "pruning-system": "11-pruning-system.svg",
        "anticone-finalization": "12-anticone-finalization.svg",
        "virtual-state": "13-virtual-state.svg",
        "timestamps-median-time": "14-timestamps-median-time.svg",
        "finality-security": "15-finality-security.svg",
        "network-scaling": "16-network-scaling.svg",
      };

      const results: Array<{ courseId: string; success: boolean; ipfsUrl?: string; error?: string }> = [];
      const assetsPath = path.join(process.cwd(), "attached_assets", "nft-certificates");

      for (const course of courses) {
        const svgFileName = courseImageMap[course.id];
        if (!svgFileName) {
          results.push({ courseId: course.id, success: false, error: "No SVG file mapped" });
          continue;
        }

        try {
          // Check if already uploaded
          const existing = await storage.getCourseAsset(course.id);
          if (existing) {
            results.push({ 
              courseId: course.id, 
              success: true, 
              ipfsUrl: existing.imageIpfsUrl,
              error: "Already uploaded" 
            });
            continue;
          }

          // Read SVG file
          const svgPath = path.join(assetsPath, svgFileName);
          const svgContent = await fs.readFile(svgPath, "utf-8");

          // Upload to Pinata
          const uploadResult = await pinataService.uploadImage(svgContent, `kuproof-${course.id}`);
          
          if (uploadResult.success && uploadResult.ipfsUrl && uploadResult.ipfsHash) {
            // Save to database
            await storage.saveCourseAsset(course.id, uploadResult.ipfsUrl, uploadResult.ipfsHash);
            results.push({ courseId: course.id, success: true, ipfsUrl: uploadResult.ipfsUrl });
            console.log(`[Admin] Uploaded ${course.id} -> ${uploadResult.ipfsUrl}`);
          } else {
            results.push({ courseId: course.id, success: false, error: uploadResult.error });
          }
        } catch (error: any) {
          results.push({ courseId: course.id, success: false, error: error.message });
        }
      }

      const successful = results.filter(r => r.success && !r.error?.includes("Already")).length;
      const alreadyUploaded = results.filter(r => r.error?.includes("Already")).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: failed === 0,
        message: `Uploaded ${successful} new images, ${alreadyUploaded} already existed, ${failed} failed`,
        results,
      });
    } catch (error: any) {
      console.error("[Admin] Upload course images error:", error.message);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Get course asset status (check which images are uploaded)
  app.get("/api/admin/course-assets", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { courses } = await import("./seed-data");
      const assets = await Promise.all(
        courses.map(async (course) => {
          const asset = await storage.getCourseAsset(course.id);
          return {
            courseId: course.id,
            title: course.title,
            uploaded: !!asset,
            imageIpfsUrl: asset?.imageIpfsUrl || null,
          };
        })
      );
      
      const uploadedCount = assets.filter(a => a.uploaded).length;
      res.json({
        total: assets.length,
        uploaded: uploadedCount,
        missing: assets.length - uploadedCount,
        assets,
      });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Get current network mode (testnet/mainnet)
  app.get("/api/admin/network-mode", adminAuth, async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const networkInfo = krc721Service.getNetworkInfo();
      res.json({
        ...networkInfo,
        message: networkInfo.testnet 
          ? "Running on TESTNET-10 - safe for testing NFT deployments"
          : "Running on MAINNET - real KAS will be used"
      });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Switch network between testnet and mainnet
  app.post("/api/admin/switch-network", adminAuth, async (req: Request, res: Response) => {
    try {
      const { testnet } = req.body;
      
      if (typeof testnet !== "boolean") {
        return res.status(400).json({ 
          error: "Invalid request. Provide { testnet: true } for testnet or { testnet: false } for mainnet" 
        });
      }

      const krc721Service = await getKRC721Service();
      
      // Add timeout to prevent infinite spinning (30 second limit)
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error("Network switch timed out after 30 seconds")), 30000)
      );
      
      const success = await Promise.race([
        krc721Service.switchNetwork(testnet),
        timeoutPromise
      ]);
      
      if (success) {
        const networkInfo = krc721Service.getNetworkInfo();
        res.json({
          success: true,
          message: testnet 
            ? "Switched to TESTNET-10 - You can now safely test NFT deployments without spending real KAS"
            : "Switched to MAINNET - Real KAS will be used for all transactions",
          ...networkInfo
        });
      } else {
        // Even if RPC failed, the network mode was switched - return partial success
        const networkInfo = krc721Service.getNetworkInfo();
        res.json({
          success: true,
          message: testnet 
            ? "Switched to TESTNET-10 (RPC connection pending - will retry automatically)"
            : "Switched to MAINNET (RPC connection pending - will retry automatically)",
          ...networkInfo,
          warning: "RPC connection not yet established. Blockchain operations may be limited until connection succeeds."
        });
      }
    } catch (error: any) {
      console.error("[Admin] Switch network error:", error.message);
      // If it timed out, still report the network mode change
      if (error.message?.includes("timed out")) {
        try {
          const krc721Service = await getKRC721Service();
          const networkInfo = krc721Service.getNetworkInfo();
          res.json({
            success: true,
            message: `Network mode changed to ${networkInfo.network} (RPC connection still in progress)`,
            ...networkInfo,
            warning: "RPC connection is taking longer than expected. It will continue in the background."
          });
        } catch {
          res.status(500).json({ error: "Network switch timed out. Please try again." });
        }
      } else {
        res.status(500).json({ error: sanitizeError(error) });
      }
    }
  });

  // Admin: Verify deployment status against KRC-721 indexer
  // This checks if the local "deployed" status matches what the indexer knows
  app.get("/api/admin/verify-deployment", adminAuth, async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const verification = await krc721Service.verifyDeploymentWithIndexer();
      const networkInfo = krc721Service.getNetworkInfo();
      
      res.json({
        ...verification,
        ticker: networkInfo.ticker,
        network: networkInfo.network,
        indexerUrl: networkInfo.indexerUrl,
        recommendation: verification.mismatch 
          ? (verification.localStatus && !verification.indexerStatus
            ? "Local status says deployed but indexer shows NOT indexed. Use POST /api/admin/reset-deployment to reset."
            : "Indexer shows deployed but local status is false. Collection may have been deployed externally.")
          : (verification.indexerStatus 
            ? "Status verified: Collection is deployed and indexed."
            : "Status verified: Collection is not deployed.")
      });
    } catch (error: any) {
      console.error("[Admin] Verify deployment error:", error.message);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Reset deployment status to undeployed
  // Use this when the database incorrectly shows "deployed" but indexer doesn't have the collection
  app.post("/api/admin/reset-deployment", adminAuth, async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      
      // First verify current status
      const verification = await krc721Service.verifyDeploymentWithIndexer();
      
      if (verification.indexerStatus) {
        // Collection IS in the indexer - don't reset!
        return res.status(400).json({
          error: "Cannot reset - collection IS indexed. The deployment is valid.",
          verification
        });
      }
      
      // Reset the deployment status
      await krc721Service.resetDeploymentStatus();
      const networkInfo = krc721Service.getNetworkInfo();
      
      res.json({
        success: true,
        message: "Deployment status reset to FALSE. Collection needs to be redeployed.",
        ticker: networkInfo.ticker,
        network: networkInfo.network,
        previousStatus: verification.localStatus,
        newStatus: false
      });
    } catch (error: any) {
      console.error("[Admin] Reset deployment error:", error.message);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Attempt to recover and finalize a stuck mint reservation
  app.post("/api/admin/recover-mint/:p2shAddress", adminAuth, async (req: Request, res: Response) => {
    try {
      const { p2shAddress } = req.params;
      
      if (!p2shAddress) {
        return res.status(400).json({ error: "P2SH address required" });
      }
      
      // Get the reservation
      const reservation = await mintStorage.getByP2shAddress(p2shAddress);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      
      console.log(`[Admin Recovery] Attempting to finalize stuck mint: ${p2shAddress.slice(0, 30)}...`);
      
      const krc721Service = await getKRC721Service();
      
      // Attempt to finalize the mint
      const result = await krc721Service.finalizeMint(
        p2shAddress,
        reservation.certificateId,
        reservation.commitTxHash || undefined
      );
      
      if (result.success) {
        // Update the certificate status
        await storage.updateCertificate(reservation.certificateId, {
          nftStatus: "claimed",
          nftTxHash: result.revealTxHash,
        });
        
        console.log(`[Admin Recovery] Successfully recovered mint: ${result.revealTxHash}`);
        return res.json({
          success: true,
          message: "Mint recovered successfully",
          revealTxHash: result.revealTxHash,
          tokenId: result.tokenId,
        });
      } else {
        console.log(`[Admin Recovery] Failed to recover mint: ${result.error}`);
        return res.json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error(`[Admin Recovery] Error:`, error);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Recover orphaned P2SH (no reservation in database)
  // This tries to reconstruct the script by matching the P2SH address
  app.post("/api/admin/recover-orphan-p2sh", adminAuth, async (req: Request, res: Response) => {
    try {
      const { p2shAddress, recipientAddress, ipfsUrl } = req.body;
      
      if (!p2shAddress || !recipientAddress) {
        return res.status(400).json({ 
          error: "Required: p2shAddress, recipientAddress. Optional: ipfsUrl" 
        });
      }

      console.log(`[Admin Recovery] Attempting orphan P2SH recovery: ${p2shAddress.slice(0, 30)}...`);
      console.log(`[Admin Recovery] Recipient: ${recipientAddress.slice(0, 30)}...`);
      
      const krc721Service = await getKRC721Service();
      
      // Access the kaspa module from the service
      // @ts-ignore - accessing private property for admin recovery
      const kaspaModule = krc721Service.kaspaModule;
      // @ts-ignore
      const publicKey = krc721Service.publicKey;
      // @ts-ignore
      const privateKey = krc721Service.privateKey;
      // @ts-ignore
      const config = krc721Service.config;
      
      if (!kaspaModule || !publicKey || !privateKey) {
        return res.status(500).json({ error: "KRC721 service not properly initialized" });
      }
      
      const { ScriptBuilder, Opcodes, addressFromScriptPublicKey } = kaspaModule;
      const xOnlyPubKey = publicKey.toXOnlyPublicKey().toString();
      
      // Try different mint data variations to find matching P2SH
      const mintDataVariations: any[] = [];
      
      // Variation 1: With IPFS URL
      if (ipfsUrl) {
        mintDataVariations.push({
          p: "krc-721",
          op: "mint",
          tick: config.ticker,
          to: recipientAddress,
          meta: ipfsUrl,
        });
      }
      
      // Variation 2: Without IPFS URL
      mintDataVariations.push({
        p: "krc-721",
        op: "mint",
        tick: config.ticker,
        to: recipientAddress,
      });
      
      let matchedScript: any = null;
      let matchedMintDataStr: string = "";
      
      for (const mintData of mintDataVariations) {
        const mintDataStr = JSON.stringify(mintData, null, 0);
        
        const script = new ScriptBuilder()
          .addData(xOnlyPubKey)
          .addOp(Opcodes.OpCheckSig)
          .addOp(Opcodes.OpFalse)
          .addOp(Opcodes.OpIf)
          .addData(Buffer.from("kspr"))
          .addI64(BigInt(0))
          .addData(Buffer.from(mintDataStr))
          .addOp(Opcodes.OpEndIf);
        
        const reconstructedP2sh = addressFromScriptPublicKey(
          script.createPayToScriptHashScript(),
          config.network
        );
        
        if (reconstructedP2sh && reconstructedP2sh.toString() === p2shAddress) {
          console.log(`[Admin Recovery] Found matching script with mintData: ${mintDataStr}`);
          matchedScript = script;
          matchedMintDataStr = mintDataStr;
          break;
        }
      }
      
      if (!matchedScript) {
        return res.status(404).json({ 
          error: "Could not reconstruct matching P2SH script. The public key may have changed or parameters are incorrect.",
          tried: mintDataVariations.length,
          xOnlyPubKey: xOnlyPubKey.slice(0, 20) + "...",
        });
      }
      
      // Check P2SH balance
      const balanceRes = await fetch(`https://api.kaspa.org/addresses/${p2shAddress}/balance`);
      if (!balanceRes.ok) {
        return res.status(500).json({ error: "Failed to check P2SH balance" });
      }
      const balanceData = await balanceRes.json() as { balance: number };
      const balanceSompi = balanceData.balance;
      
      if (balanceSompi <= 0) {
        return res.json({ 
          success: false, 
          error: "P2SH address has no balance - funds may have already been recovered",
          matchedMintData: matchedMintDataStr,
        });
      }
      
      console.log(`[Admin Recovery] P2SH balance: ${balanceSompi / 100000000} KAS`);
      
      // Get UTXOs from P2SH
      const utxoRes = await fetch(`https://api.kaspa.org/addresses/${p2shAddress}/utxos`);
      if (!utxoRes.ok) {
        return res.status(500).json({ error: "Failed to fetch P2SH UTXOs" });
      }
      const utxos = await utxoRes.json() as any[];
      
      if (!utxos || utxos.length === 0) {
        return res.json({ 
          success: false, 
          error: "No UTXOs found at P2SH address",
          matchedMintData: matchedMintDataStr,
        });
      }
      
      // Build and submit reveal transaction
      // @ts-ignore
      const rpcClient = krc721Service.rpcClient;
      // @ts-ignore
      const wasmRpcClient = krc721Service.wasmRpcClient;
      
      // Get treasury address for the output
      // @ts-ignore
      const treasuryAddress = krc721Service.address;
      
      console.log(`[Admin Recovery] Building reveal tx with ${utxos.length} UTXOs, sending to ${treasuryAddress}`);
      
      // Calculate total input and output (minus network fee)
      const totalInput = utxos.reduce((sum: bigint, utxo: any) => sum + BigInt(utxo.utxoEntry?.amount || 0), BigInt(0));
      const networkFee = BigInt(50000000); // 0.5 KAS network fee
      const outputAmount = totalInput - networkFee;
      
      if (outputAmount <= BigInt(0)) {
        return res.json({ 
          success: false, 
          error: "Insufficient balance after network fees",
          balance: totalInput.toString(),
          fee: networkFee.toString(),
        });
      }
      
      // Build the reveal transaction
      const { createTransactions, kaspaToSompi, UtxoEntryReference, PrivateKey } = kaspaModule;
      
      // Convert UTXOs to proper format
      const utxoEntries = utxos.map((utxo: any) => {
        return new UtxoEntryReference({
          outpoint: {
            transactionId: utxo.outpoint?.transactionId,
            index: utxo.outpoint?.index,
          },
          utxoEntry: {
            amount: BigInt(utxo.utxoEntry?.amount || 0),
            scriptPublicKey: utxo.utxoEntry?.scriptPublicKey,
            blockDaaScore: BigInt(utxo.utxoEntry?.blockDaaScore || 0),
            isCoinbase: utxo.utxoEntry?.isCoinbase || false,
          },
        });
      });
      
      // Create reveal transaction using createTransactions
      const { transactions } = await createTransactions({
        entries: utxoEntries,
        outputs: [{
          address: treasuryAddress,
          amount: outputAmount,
        }],
        priorityFee: BigInt(0),
        changeAddress: treasuryAddress,
        networkId: config.network,
      });
      
      if (!transactions || transactions.length === 0) {
        return res.json({ 
          success: false, 
          error: "Failed to create reveal transaction",
        });
      }
      
      // Sign and submit the transaction
      const revealTx = transactions[0];
      revealTx.sign([privateKey], false);
      revealTx.setSignatures(matchedScript.encodePayToScriptHashSignatureScript(revealTx.transaction.inputs[0].signatureScript));
      
      // Submit via WASM RPC
      const revealTxHash = await revealTx.submit(wasmRpcClient);
      
      console.log(`[Admin Recovery] Successfully recovered orphan P2SH! Reveal TX: ${revealTxHash}`);
      
      return res.json({
        success: true,
        message: "Orphan P2SH recovered successfully",
        revealTxHash,
        recoveredAmount: (Number(outputAmount) / 100000000).toFixed(8) + " KAS",
        sentTo: treasuryAddress,
      });
      
    } catch (error: any) {
      console.error(`[Admin Recovery] Orphan recovery error:`, error);
      res.status(500).json({ error: sanitizeError(error), details: error.message });
    }
  });

  // Check all P2SH addresses for stuck funds (admin recovery tool)
  app.get("/api/admin/p2sh-recovery", adminAuth, async (_req: Request, res: Response) => {
    try {
      const reservations = await mintStorage.getAllReservations();
      const stuckFunds: Array<{
        p2shAddress: string;
        balance: number;
        balanceKas: string;
        certificateId: string;
        courseName: string;
        status: string;
        createdAt: Date;
      }> = [];
      
      let totalStuckKas = 0;
      let apiErrors: string[] = [];
      let scannedCount = 0;
      
      for (const reservation of reservations) {
        if (!reservation.p2shAddress) continue;
        
        try {
          const balanceRes = await fetch(`https://api.kaspa.org/addresses/${reservation.p2shAddress}/balance`, {
            headers: { "Accept": "application/json" },
          });
          
          if (!balanceRes.ok) {
            apiErrors.push(`API error for ${reservation.p2shAddress.slice(0, 20)}...: HTTP ${balanceRes.status}`);
            continue;
          }
          
          const balanceData = await balanceRes.json() as { address: string; balance: number | string };
          scannedCount++;
          
          // Handle both number and string balance (Kaspa API can return either)
          const balanceSompi = typeof balanceData.balance === "string" 
            ? parseInt(balanceData.balance, 10) 
            : balanceData.balance;
          
          if (balanceSompi > 0 && !isNaN(balanceSompi)) {
            const balanceKas = balanceSompi / 100000000;
            totalStuckKas += balanceKas;
            
            // Look up certificate to get course name
            const cert = await storage.getCertificate(reservation.certificateId);
            
            stuckFunds.push({
              p2shAddress: reservation.p2shAddress,
              balance: balanceSompi,
              balanceKas: balanceKas.toFixed(8),
              certificateId: reservation.certificateId,
              courseName: cert?.courseName || "Unknown",
              status: reservation.status,
              createdAt: reservation.createdAt,
            });
          }
          
          // Rate limit: wait 100ms between API calls
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err: any) {
          apiErrors.push(`Network error for ${reservation.p2shAddress.slice(0, 20)}...: ${err.message}`);
        }
      }
      
      res.json({
        totalStuckFunds: stuckFunds.length,
        totalStuckKas: totalStuckKas.toFixed(8),
        totalReservations: reservations.length,
        scannedCount,
        stuckFunds,
        hasErrors: apiErrors.length > 0,
        errors: apiErrors.slice(0, 10), // Limit error output
      });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Admin: Recover P2SH using a specific X-only public key and private key
  // Use this when the treasury key has changed since the P2SH was created
  app.post("/api/admin/recover-p2sh-with-key", adminAuth, async (req: Request, res: Response) => {
    try {
      const { 
        p2shAddress, 
        xOnlyPubKey, 
        privateKeyHex, 
        recipientAddress,
        dryRun = true  // Default to dry run for safety
      } = req.body;
      
      if (!p2shAddress || !xOnlyPubKey) {
        return res.status(400).json({ 
          error: "Required: p2shAddress, xOnlyPubKey. Optional: privateKeyHex (for actual recovery), recipientAddress, dryRun" 
        });
      }

      console.log(`[Admin Recovery] Attempting P2SH recovery with provided key: ${p2shAddress.slice(0, 30)}...`);
      
      const krc721Service = await getKRC721Service();
      
      // @ts-ignore - accessing private property for admin recovery
      const kaspaModule = krc721Service.kaspaModule;
      // @ts-ignore
      const config = krc721Service.config;
      
      if (!kaspaModule) {
        return res.status(500).json({ error: "KRC721 service not properly initialized" });
      }
      
      const { ScriptBuilder, Opcodes, addressFromScriptPublicKey, createTransactions, kaspaToSompi, PrivateKey } = kaspaModule;
      
      // Try different mint data variations to find matching P2SH
      // First try the new minimal format, then the old format with "to" field
      const mintDataVariations: any[] = [
        // New minimal format (current implementation)
        { p: "krc-721", op: "mint", tick: config.ticker },
      ];
      
      // If recipientAddress provided, also try old format with "to" field
      if (recipientAddress) {
        mintDataVariations.push(
          { p: "krc-721", op: "mint", tick: config.ticker, to: recipientAddress },
          { p: "krc-721", op: "mint", tick: config.ticker, to: recipientAddress, meta: undefined }
        );
      }
      
      // Also try with different token IDs since that could be stored differently
      const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      for (const tid of tokenIds) {
        mintDataVariations.push(
          { p: "krc-721", op: "mint", tick: config.ticker, id: tid },
          { p: "krc-721", op: "mint", tick: config.ticker, id: tid.toString() }
        );
        if (recipientAddress) {
          mintDataVariations.push(
            { p: "krc-721", op: "mint", tick: config.ticker, to: recipientAddress, id: tid }
          );
        }
      }
      
      let matchedScript: any = null;
      let matchedMintDataStr: string = "";
      
      for (const mintData of mintDataVariations) {
        const mintDataStr = JSON.stringify(mintData, null, 0);
        
        try {
          const script = new ScriptBuilder()
            .addData(xOnlyPubKey)
            .addOp(Opcodes.OpCheckSig)
            .addOp(Opcodes.OpFalse)
            .addOp(Opcodes.OpIf)
            .addData(Buffer.from("kspr"))
            .addI64(BigInt(0))
            .addData(Buffer.from(mintDataStr))
            .addOp(Opcodes.OpEndIf);
          
          const reconstructedP2sh = addressFromScriptPublicKey(
            script.createPayToScriptHashScript(),
            config.network
          );
          
          if (reconstructedP2sh && reconstructedP2sh.toString() === p2shAddress) {
            console.log(`[Admin Recovery] Found matching script with mintData: ${mintDataStr}`);
            matchedScript = script;
            matchedMintDataStr = mintDataStr;
            break;
          }
        } catch (scriptError: any) {
          console.log(`[Admin Recovery] Script build failed for variation: ${scriptError.message}`);
        }
      }
      
      if (!matchedScript) {
        return res.status(404).json({ 
          error: "Could not reconstruct matching P2SH script. Try providing recipientAddress parameter.",
          tried: mintDataVariations.length,
          xOnlyPubKeyUsed: xOnlyPubKey.slice(0, 20) + "...",
          ticker: config.ticker,
        });
      }
      
      // Check P2SH balance
      const balanceRes = await fetch(`https://api.kaspa.org/addresses/${p2shAddress}/balance`);
      if (!balanceRes.ok) {
        return res.status(500).json({ error: "Failed to check P2SH balance" });
      }
      const balanceData = await balanceRes.json() as { balance: number };
      const balanceSompi = balanceData.balance;
      const balanceKas = balanceSompi / 100000000;
      
      if (balanceSompi <= 0) {
        return res.json({ 
          success: false, 
          error: "P2SH address has no balance - funds may have already been recovered",
          matchedMintData: matchedMintDataStr,
        });
      }
      
      console.log(`[Admin Recovery] P2SH balance: ${balanceKas} KAS`);
      
      // If dry run or no private key, return info only
      if (dryRun || !privateKeyHex) {
        return res.json({
          success: true,
          dryRun: true,
          message: "P2SH script matched! Provide privateKeyHex and set dryRun=false to recover.",
          p2shAddress,
          balanceKas: balanceKas.toFixed(8) + " KAS",
          balanceSompi,
          matchedMintData: matchedMintDataStr,
          xOnlyPubKeyUsed: xOnlyPubKey,
        });
      }
      
      // Actual recovery - need private key
      console.log(`[Admin Recovery] Proceeding with actual recovery...`);
      
      // Get UTXOs from P2SH
      const utxoRes = await fetch(`https://api.kaspa.org/addresses/${p2shAddress}/utxos`);
      if (!utxoRes.ok) {
        return res.status(500).json({ error: "Failed to fetch P2SH UTXOs" });
      }
      const utxos = await utxoRes.json() as any[];
      
      if (!utxos || utxos.length === 0) {
        return res.json({ 
          success: false, 
          error: "No UTXOs found at P2SH address",
        });
      }
      
      // Create private key from hex
      let recoveryPrivateKey: any;
      try {
        recoveryPrivateKey = new PrivateKey(privateKeyHex);
      } catch (pkError: any) {
        return res.status(400).json({ error: "Invalid privateKeyHex: " + pkError.message });
      }
      
      // Get current treasury address for output
      // @ts-ignore
      const treasuryAddress = krc721Service.address;
      // @ts-ignore
      const rpcClient = krc721Service.rpcClient;
      // @ts-ignore
      const wasmRpcClient = krc721Service.wasmRpcClient;
      
      // Get treasury UTXOs for fees
      const { entries: treasuryEntries } = await rpcClient.getUtxosByAddresses({
        addresses: [treasuryAddress],
      });
      
      // Format P2SH UTXOs for transaction
      const p2shEntries = utxos.map((utxo: any) => ({
        outpoint: {
          transactionId: utxo.outpoint?.transactionId || utxo.transactionId,
          index: utxo.outpoint?.index ?? utxo.index ?? 0,
        },
        utxoEntry: {
          amount: utxo.utxoEntry?.amount || utxo.amount,
          scriptPublicKey: utxo.utxoEntry?.scriptPublicKey || utxo.scriptPublicKey,
          blockDaaScore: utxo.utxoEntry?.blockDaaScore || utxo.blockDaaScore || "0",
          isCoinbase: utxo.utxoEntry?.isCoinbase || false,
        },
      }));
      
      console.log(`[Admin Recovery] Building reveal tx with ${p2shEntries.length} P2SH UTXOs`);
      
      // Create reveal transaction
      const { transactions } = await createTransactions({
        priorityEntries: p2shEntries,
        entries: treasuryEntries,
        outputs: [],
        changeAddress: treasuryAddress,
        priorityFee: kaspaToSompi("1")!,
        networkId: config.network,
      });
      
      if (!transactions || transactions.length === 0) {
        return res.json({ 
          success: false, 
          error: "Failed to create reveal transaction",
        });
      }
      
      // Sign and submit
      let revealTxHash: string | undefined;
      
      for (const tx of transactions) {
        tx.sign([recoveryPrivateKey], false);
        
        // Find and fill P2SH inputs
        for (let i = 0; i < tx.transaction.inputs.length; i++) {
          if (tx.transaction.inputs[i].signatureScript === "") {
            const signature = await tx.createInputSignature(i, recoveryPrivateKey);
            tx.fillInput(i, matchedScript.encodePayToScriptHashSignatureScript(signature));
          }
        }
        
        const rpcForSubmit = wasmRpcClient || rpcClient;
        revealTxHash = await tx.submit(rpcForSubmit);
        console.log(`[Admin Recovery] Reveal tx submitted: ${revealTxHash}`);
      }
      
      return res.json({
        success: true,
        message: "P2SH funds recovered successfully!",
        revealTxHash,
        recoveredAmount: balanceKas.toFixed(8) + " KAS",
        sentTo: treasuryAddress,
      });
      
    } catch (error: any) {
      console.error(`[Admin Recovery] Recovery with key error:`, error);
      res.status(500).json({ error: sanitizeError(error), details: error.message });
    }
  });

  // Admin: Batch check multiple P2SH addresses with a specific X-only public key
  app.post("/api/admin/verify-p2sh-batch", adminAuth, async (req: Request, res: Response) => {
    try {
      const { p2shAddresses, xOnlyPubKey, recipientAddresses } = req.body;
      
      if (!p2shAddresses || !Array.isArray(p2shAddresses) || !xOnlyPubKey) {
        return res.status(400).json({ 
          error: "Required: p2shAddresses (array), xOnlyPubKey. Optional: recipientAddresses (array)" 
        });
      }

      const krc721Service = await getKRC721Service();
      // @ts-ignore
      const kaspaModule = krc721Service.kaspaModule;
      // @ts-ignore
      const config = krc721Service.config;
      
      const { ScriptBuilder, Opcodes, addressFromScriptPublicKey } = kaspaModule;
      
      const results: Array<{
        p2shAddress: string;
        matched: boolean;
        matchedMintData?: string;
        balanceKas?: string;
        error?: string;
      }> = [];
      
      for (let i = 0; i < p2shAddresses.length; i++) {
        const p2shAddress = p2shAddresses[i];
        const recipientAddress = recipientAddresses?.[i];
        
        // Build mint data variations
        const mintDataVariations: any[] = [
          { p: "krc-721", op: "mint", tick: config.ticker },
        ];
        
        if (recipientAddress) {
          mintDataVariations.push(
            { p: "krc-721", op: "mint", tick: config.ticker, to: recipientAddress }
          );
        }
        
        let matched = false;
        let matchedMintData = "";
        
        for (const mintData of mintDataVariations) {
          const mintDataStr = JSON.stringify(mintData, null, 0);
          
          try {
            const script = new ScriptBuilder()
              .addData(xOnlyPubKey)
              .addOp(Opcodes.OpCheckSig)
              .addOp(Opcodes.OpFalse)
              .addOp(Opcodes.OpIf)
              .addData(Buffer.from("kspr"))
              .addI64(BigInt(0))
              .addData(Buffer.from(mintDataStr))
              .addOp(Opcodes.OpEndIf);
            
            const reconstructedP2sh = addressFromScriptPublicKey(
              script.createPayToScriptHashScript(),
              config.network
            );
            
            if (reconstructedP2sh && reconstructedP2sh.toString() === p2shAddress) {
              matched = true;
              matchedMintData = mintDataStr;
              break;
            }
          } catch {}
        }
        
        // Check balance
        let balanceKas = "0";
        try {
          const balanceRes = await fetch(`https://api.kaspa.org/addresses/${p2shAddress}/balance`);
          if (balanceRes.ok) {
            const balanceData = await balanceRes.json() as { balance: number };
            balanceKas = (balanceData.balance / 100000000).toFixed(8);
          }
          await new Promise(r => setTimeout(r, 100)); // Rate limit
        } catch {}
        
        results.push({
          p2shAddress,
          matched,
          matchedMintData: matched ? matchedMintData : undefined,
          balanceKas,
        });
      }
      
      res.json({
        xOnlyPubKey,
        ticker: config.ticker,
        results,
        totalMatched: results.filter(r => r.matched).length,
        totalWithBalance: results.filter(r => parseFloat(r.balanceKas || "0") > 0).length,
      });
      
    } catch (error: any) {
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // ============================================
  // K PROTOCOL PUBLIC COMMENTS ENDPOINTS
  // ============================================

  // Post a public comment on a lesson (K Protocol)
  app.post("/api/lessons/:lessonId/comments", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const { lessonId } = req.params;
      const { content, authorAddress, authorPubkey, signature, parentTxHash } = req.body;
      
      if (!content || !authorAddress || !authorPubkey || !signature) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (content.length > 1000) {
        return res.status(400).json({ error: "Comment too long (max 1000 characters)" });
      }
      
      // Store the comment (blockchain submission handled client-side)
      const comment = await storage.createKPublicComment({
        lessonId,
        authorAddress,
        authorPubkey,
        content,
        signature,
        parentTxHash,
        isReply: !!parentTxHash,
        txStatus: "pending",
      });
      
      res.json({ success: true, comment });
    } catch (error: any) {
      console.error("[K Protocol] Failed to create comment:", error);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Get public comments for a lesson
  app.get("/api/lessons/:lessonId/comments", async (req: Request, res: Response) => {
    try {
      const { lessonId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const comments = await storage.getKPublicComments(lessonId, limit, offset);
      
      res.json({ comments, total: comments.length });
    } catch (error: any) {
      console.error("[K Protocol] Failed to fetch comments:", error);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // Update comment with transaction hash after blockchain submission
  app.patch("/api/comments/:commentId/tx", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { txHash, txStatus } = req.body;
      
      if (!txHash) {
        return res.status(400).json({ error: "Transaction hash required" });
      }
      
      await storage.updateKPublicCommentTx(commentId, txHash, txStatus || "confirmed");
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[K Protocol] Failed to update comment tx:", error);
      res.status(500).json({ error: sanitizeError(error) });
    }
  });

  // ============================================
  // KASIA ENCRYPTED MESSAGING ENDPOINTS
  // ============================================

  // Helper to get authenticated wallet from bearer token
  const getAuthenticatedWallet = (req: Request): string | null => {
    const token = req.headers["x-auth-token"] as string;
    const walletAddress = req.headers["x-wallet-address"] as string;
    
    if (!token || !walletAddress) return null;
    
    const result = validateSession(token, walletAddress);
    if (!result.valid) return null;
    
    return walletAddress;
  };

  // Prepare a message for wallet signing (user signs their own messages)
  app.post("/api/messages/prepare", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { content, conversationId, messageType } = req.body;
      
      if (!content || content.length === 0) {
        return res.status(400).json({ error: "Message content required" });
      }

      if (content.length > 1000) {
        return res.status(400).json({ error: "Message too long (max 1000 characters)" });
      }

      // Create the message payload that the user will sign
      const timestamp = Date.now();
      const nonce = randomUUID().slice(0, 8);
      
      // Message format: {type}:{timestamp}:{nonce}:{conversationId}:{content}
      const messageToSign = `ku:msg:${messageType || "private"}:${timestamp}:${nonce}:${conversationId || "public"}:${content}`;
      
      res.json({
        success: true,
        messageToSign,
        metadata: {
          timestamp,
          nonce,
          conversationId: conversationId || null,
          messageType: messageType || "private",
          senderAddress: authenticatedWallet,
        }
      });
    } catch (error: any) {
      console.error("[Messaging] Failed to prepare message:", error);
      res.status(500).json({ error: "Failed to prepare message" });
    }
  });

  // Prepare a K Protocol public comment for wallet signing
  app.post("/api/k-protocol/prepare", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { content, lessonId, parentCommentId } = req.body;
      
      if (!content || content.length === 0) {
        return res.status(400).json({ error: "Comment content required" });
      }

      if (content.length > 1000) {
        return res.status(400).json({ error: "Comment too long (max 1000 characters)" });
      }

      if (!lessonId) {
        return res.status(400).json({ error: "Lesson ID required" });
      }

      const timestamp = Date.now();
      const nonce = randomUUID().slice(0, 8);
      const action = parentCommentId ? "reply" : "post";
      
      // K Protocol message format for signing
      // k:1:{action}:{timestamp}:{nonce}:{lessonId}:{parentId}:{content}
      const messageToSign = `k:1:${action}:${timestamp}:${nonce}:${lessonId}:${parentCommentId || ""}:${content}`;
      
      res.json({
        success: true,
        messageToSign,
        metadata: {
          timestamp,
          nonce,
          lessonId,
          action,
          parentCommentId: parentCommentId || null,
          senderAddress: authenticatedWallet,
        }
      });
    } catch (error: any) {
      console.error("[K Protocol] Failed to prepare comment:", error);
      res.status(500).json({ error: "Failed to prepare comment" });
    }
  });

  // Start a new private conversation (initiate handshake)
  app.post("/api/conversations", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { recipientAddress, initiatorAlias, handshakeTxHash } = req.body;
      
      if (!recipientAddress) {
        return res.status(400).json({ error: "Recipient address required" });
      }

      // Validate recipient address format
      if (!recipientAddress.startsWith("kaspa:") || recipientAddress.length < 60) {
        return res.status(400).json({ error: "Invalid Kaspa address format" });
      }

      if (recipientAddress === authenticatedWallet) {
        return res.status(400).json({ error: "Cannot start conversation with yourself" });
      }
      
      // Generate deterministic conversation ID
      const conversationId = generateConversationId(authenticatedWallet, recipientAddress);
      
      // Check if conversation already exists
      const existing = await storage.getConversation(conversationId);
      if (existing) {
        return res.json({ success: true, conversation: existing, existing: true });
      }
      
      // Check if this is admin support conversation (treasury wallet is admin)
      const adminAddress = kaspaService.getTreasuryAddress() || "";
      const isAdminConversation = authenticatedWallet === adminAddress || recipientAddress === adminAddress;
      
      const conversation = await storage.createConversation({
        id: conversationId,
        initiatorAddress: authenticatedWallet,
        recipientAddress,
        status: "pending",
        handshakeTxHash,
        initiatorAlias,
        isAdminConversation,
      });
      
      res.json({ success: true, conversation, existing: false });
    } catch (error: any) {
      console.error("[Kasia] Failed to create conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Get conversations for authenticated user
  app.get("/api/conversations", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const conversations = await storage.getConversationsForWallet(authenticatedWallet);
      
      res.json({ conversations });
    } catch (error: any) {
      console.error("[Kasia] Failed to fetch conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get a specific conversation (only if participant)
  app.get("/api/conversations/:conversationId", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { conversationId } = req.params;
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user is a participant
      if (conversation.initiatorAddress !== authenticatedWallet && conversation.recipientAddress !== authenticatedWallet) {
        return res.status(403).json({ error: "Not authorized to view this conversation" });
      }
      
      res.json({ conversation });
    } catch (error: any) {
      console.error("[Kasia] Failed to fetch conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Accept handshake (respond to conversation request)
  app.post("/api/conversations/:conversationId/accept", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { conversationId } = req.params;
      const { responseTxHash, recipientAlias } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Only the recipient can accept the handshake
      if (conversation.recipientAddress !== authenticatedWallet) {
        return res.status(403).json({ error: "Only the recipient can accept the handshake" });
      }
      
      if (conversation.status !== "pending") {
        return res.status(400).json({ error: "Conversation is not pending" });
      }
      
      await storage.updateConversationStatus(conversationId, "active", responseTxHash, recipientAlias);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Kasia] Failed to accept handshake:", error);
      res.status(500).json({ error: "Failed to accept handshake" });
    }
  });

  // Send a private message in a conversation (with wallet signature)
  app.post("/api/conversations/:conversationId/messages", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { conversationId } = req.params;
      const { encryptedContent, txHash, signature, signedPayload, senderPubkey } = req.body;
      
      if (!encryptedContent) {
        return res.status(400).json({ error: "Encrypted content required" });
      }

      // Validate message length
      if (encryptedContent.length > 10000) {
        return res.status(400).json({ error: "Message too long" });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Verify sender is part of conversation
      if (authenticatedWallet !== conversation.initiatorAddress && authenticatedWallet !== conversation.recipientAddress) {
        return res.status(403).json({ error: "Not authorized to send messages in this conversation" });
      }

      // Only allow messages in active conversations
      if (conversation.status !== "active") {
        return res.status(400).json({ error: "Conversation is not active. Handshake must be accepted first." });
      }
      
      const message = await storage.createPrivateMessage({
        conversationId,
        senderAddress: authenticatedWallet,
        senderPubkey: senderPubkey || undefined,
        encryptedContent,
        signature: signature || undefined,
        signedPayload: signedPayload || undefined,
        txHash,
        txStatus: txHash ? "confirmed" : "pending",
      });
      
      res.json({ success: true, message });
    } catch (error: any) {
      console.error("[Kasia] Failed to send message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get messages in a conversation (only if participant)
  app.get("/api/conversations/:conversationId/messages", generalRateLimiter, async (req: Request, res: Response) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(req);
      if (!authenticatedWallet) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { conversationId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user is a participant
      if (conversation.initiatorAddress !== authenticatedWallet && conversation.recipientAddress !== authenticatedWallet) {
        return res.status(403).json({ error: "Not authorized to view messages in this conversation" });
      }
      
      const messages = await storage.getPrivateMessages(conversationId, limit, offset);
      
      res.json({ messages, conversation });
    } catch (error: any) {
      console.error("[Kasia] Failed to fetch messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  return httpServer;
}

// Helper function to generate conversation ID
function generateConversationId(address1: string, address2: string): string {
  const sorted = [address1, address2].sort();
  const combined = sorted.join(":");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}
