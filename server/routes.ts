import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { getKaspaService } from "./kaspa";
import { createQuizPayload } from "./ku-protocol.js";
import { getKRC721Service } from "./krc721";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Apply security middleware globally for API routes
  app.use("/api", securityMiddleware);
  app.use("/api", generalRateLimiter);

  app.get("/api/stats", async (_req: Request, res: Response) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/analytics", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      const courses = await storage.getCourses();
      
      const activityData = [
        { date: "Mon", users: 12, completions: 8, rewards: 4.5 },
        { date: "Tue", users: 19, completions: 14, rewards: 7.2 },
        { date: "Wed", users: 15, completions: 11, rewards: 5.8 },
        { date: "Thu", users: 22, completions: 18, rewards: 9.1 },
        { date: "Fri", users: 28, completions: 21, rewards: 11.3 },
        { date: "Sat", users: 35, completions: 26, rewards: 14.0 },
        { date: "Sun", users: 31, completions: 23, rewards: 12.2 },
      ];

      const coursePopularity = courses.slice(0, 5).map((course, i) => ({
        name: course.title.length > 20 ? course.title.slice(0, 18) + "..." : course.title,
        completions: Math.floor(Math.random() * 50) + 10 + (5 - i) * 8,
        category: course.category,
      }));

      const difficultyDistribution = [
        { name: "Beginner", value: courses.filter(c => c.difficulty === "beginner").length },
        { name: "Intermediate", value: courses.filter(c => c.difficulty === "intermediate").length },
        { name: "Advanced", value: courses.filter(c => c.difficulty === "advanced").length },
      ];

      const topLearners = [
        { address: "kaspa:qr8example1234567890abcdefghij", totalKas: 12.5, certificates: 8 },
        { address: "kaspa:qz9example2345678901bcdefghijk", totalKas: 9.75, certificates: 6 },
        { address: "kaspa:qx7example3456789012cdefghijkl", totalKas: 7.25, certificates: 5 },
        { address: "kaspa:qw6example4567890123defghijklm", totalKas: 5.50, certificates: 4 },
        { address: "kaspa:qv5example5678901234efghijklmn", totalKas: 4.00, certificates: 3 },
      ];

      const recentActivity = [
        { type: "completion", description: "User completed 'Introduction to Kaspa'", timestamp: "2 min ago" },
        { type: "reward", description: "0.5 KAS distributed for quiz completion", timestamp: "5 min ago" },
        { type: "certificate", description: "NFT certificate minted for course completion", timestamp: "12 min ago" },
        { type: "completion", description: "User completed 'BlockDAG Technology'", timestamp: "18 min ago" },
        { type: "reward", description: "1.0 KAS distributed for quiz completion", timestamp: "25 min ago" },
      ];

      res.json({
        overview: {
          totalUsers: stats.activeLearners || 0,
          totalCourses: stats.coursesAvailable || 0,
          totalCertificates: stats.certificatesMinted || 0,
          totalKasDistributed: stats.totalKasDistributed || 0,
          totalQuizzes: Math.floor((stats.certificatesMinted || 0) * 2.5),
          avgScore: 78,
        },
        activityData,
        coursePopularity,
        difficultyDistribution,
        topLearners,
        recentActivity,
      });
    } catch (error) {
      console.error("[Analytics] Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/kaspa/status", async (_req: Request, res: Response) => {
    try {
      const kaspaService = await getKaspaService();
      const networkInfo = await kaspaService.getNetworkInfo();
      const treasuryAddress = kaspaService.getTreasuryAddress();
      const balanceInfo = await kaspaService.getTreasuryBalance();
      
      res.json({
        isLive: kaspaService.isLive(),
        network: networkInfo.network,
        status: networkInfo.status,
        treasuryAddress: treasuryAddress ?? "Not configured - running in demo mode",
        treasuryBalance: balanceInfo.balance,
        utxoCount: balanceInfo.utxoCount,
      });
    } catch (error) {
      res.json({
        isLive: false,
        network: "testnet-11",
        status: "error",
        treasuryAddress: "Not configured",
        treasuryBalance: 0,
        utxoCount: 0,
      });
    }
  });

  app.get("/api/security/check", async (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const vpnCheck = await checkVpnAsync(clientIP);
    const securityFlags = getSecurityFlags(req);
    
    const isFlagged = securityFlags.length > 0 || vpnCheck.isVpn;
    
    res.json({
      isFlagged,
      isVpn: vpnCheck.isVpn,
      vpnScore: vpnCheck.score,
      flags: vpnCheck.isVpn && !securityFlags.includes("VPN_DETECTED") 
        ? [...securityFlags, "VPN_DETECTED"] 
        : securityFlags,
      rewardsBlocked: isFlagged,
    });
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

    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
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

    const kasPerLesson = course.kasReward / course.lessonCount;
    const baseKasReward = passed ? kasPerLesson : 0;
    const kasRewarded = baseKasReward * rewardMultiplier;

    let txHash: string | undefined;
    let actualKasRewarded = 0;

    if (passed && kasRewarded > 0) {
      const kaspaService = await getKaspaService();
      const txResult = await kaspaService.sendReward(
        walletAddress,
        kasRewarded,
        lessonId,
        score
      );

      if (txResult.success && txResult.txHash) {
        txHash = txResult.txHash;
        actualKasRewarded = kasRewarded;
        console.log(`[Quiz] Reward sent: ${kasRewarded} KAS, txHash: ${txHash}`);
      } else {
        // Transaction failed - don't grant rewards, but still record the quiz attempt
        console.error(`[Quiz] Reward failed: ${txResult.error}`);
        // In demo mode, still grant rewards (demo txHash starts with "demo_")
        if (txResult.txHash?.startsWith("demo_")) {
          txHash = txResult.txHash;
          actualKasRewarded = kasRewarded;
        }
      }
    }

    const result = await storage.saveQuizResult({
      lessonId,
      userId: user.id,
      score,
      passed,
      kasRewarded: actualKasRewarded,
      txHash,
    });

    await antiSybil.recordQuizCompletion(walletAddress, lessonId, score, passed, actualKasRewarded);

    // Only update user KAS and progress if transaction succeeded (or demo mode)
    if (passed && actualKasRewarded > 0) {
      await storage.updateUserKas(user.id, actualKasRewarded);

      const progress = await storage.getOrCreateProgress(user.id, lesson.courseId);
      await storage.updateProgress(progress.id, lessonId);

      const lessons = await storage.getLessonsByCourse(lesson.courseId);
      const updatedProgress = await storage.getOrCreateProgress(user.id, lesson.courseId);

      if (updatedProgress.completedLessons.length === lessons.length) {
        const existingCerts = await storage.getCertificatesByUser(user.id);
        const hasCertForCourse = existingCerts.some((c) => c.courseId === lesson.courseId);

        if (!hasCertForCourse) {
          // Create certificate (NFT minting is user-initiated via claim page)
          const verificationCode = `KU-${randomUUID().slice(0, 8).toUpperCase()}`;
          const completionDate = new Date();
          
          // Generate certificate image preview
          let imageUrl: string | undefined;
          try {
            const krc721Service = await getKRC721Service();
            imageUrl = krc721Service.generateCertificateImage(
              user.walletAddress,
              course.title,
              score,
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
            score,
            issuedAt: completionDate,
            verificationCode,
            imageUrl,
            nftStatus: "pending",
          });
          
          console.log(`[Certificate] Created for ${user.walletAddress} - NFT pending claim`);
        }
      }
    }

    res.json(result);
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

  // Claim NFT certificate - user pays minting fee
  app.post("/api/certificates/:id/claim", async (req: Request, res: Response) => {
    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    // Reject demo mode - NFT claiming requires real payment
    if (walletAddress.startsWith("demo:")) {
      return res.status(403).json({ 
        error: "Demo mode not supported for NFT claiming",
        message: "Connect a real Kaspa wallet to claim your NFT certificate"
      });
    }

    const { id } = req.params;
    const { paymentTxHash } = req.body;

    // Payment transaction hash is required
    if (!paymentTxHash) {
      return res.status(400).json({ error: "Payment transaction hash is required" });
    }

    // Reject demo payment hashes
    if (paymentTxHash.startsWith("demo_")) {
      return res.status(400).json({ error: "Invalid payment transaction" });
    }

    // Check if payment tx has already been used (prevent double-claiming)
    const txAlreadyUsed = await isPaymentTxUsed(paymentTxHash);
    if (txAlreadyUsed) {
      return res.status(400).json({ 
        error: "Payment transaction already used",
        message: "This transaction has already been used to claim an NFT"
      });
    }

    // Get certificate
    const certificate = await storage.getCertificate(id);
    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    // Verify ownership
    if (certificate.recipientAddress !== walletAddress) {
      return res.status(403).json({ error: "You don't own this certificate" });
    }

    // Check if already claimed or minting in progress
    if (certificate.nftStatus === "claimed") {
      return res.status(400).json({ error: "NFT already claimed", nftTxHash: certificate.nftTxHash });
    }
    
    if (certificate.nftStatus === "minting") {
      return res.status(400).json({ error: "NFT minting already in progress" });
    }

    // Mark as minting
    await storage.updateCertificate(id, { nftStatus: "minting" });

    try {
      const krc721Service = await getKRC721Service();
      const kaspaService = await getKaspaService();
      const collectionInfo = await krc721Service.getCollectionInfo();
      const MINTING_FEE = 3.5; // KAS

      if (!collectionInfo.address) {
        await storage.updateCertificate(id, { nftStatus: "pending" });
        return res.status(500).json({ error: "Treasury address not configured" });
      }

      // Verify payment transaction
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

  // Get minting fee info
  app.get("/api/nft/fee", async (_req: Request, res: Response) => {
    try {
      const krc721Service = await getKRC721Service();
      const info = await krc721Service.getCollectionInfo();
      
      res.json({
        mintingFee: 3.5, // KAS required for minting (commit + reveal + buffer)
        treasuryAddress: info.address,
        network: info.network,
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

  return httpServer;
}
