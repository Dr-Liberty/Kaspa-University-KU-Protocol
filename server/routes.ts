import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { getKaspaService } from "./kaspa";
import { createQuizPayload } from "./ku-protocol.js";
import { getKRC721Service } from "./krc721";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/stats", async (_req: Request, res: Response) => {
    const stats = await storage.getStats();
    res.json(stats);
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
    const questions = await storage.getQuizQuestionsByLesson(req.params.lessonId);
    const safeQuestions = questions.map((q) => ({
      id: q.id,
      lessonId: q.lessonId,
      question: q.question,
      options: q.options,
    }));
    res.json(safeQuestions);
  });

  app.post("/api/quiz/:lessonId/submit", async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { answers } = req.body;

    const walletAddress = req.headers["x-wallet-address"] as string;
    if (!walletAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    // Skip blockchain operations for demo users
    const isDemoUser = walletAddress.startsWith("demo:");
    if (isDemoUser) {
      return res.status(400).json({ error: "Demo mode - connect wallet for real rewards" });
    }

    let user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      user = await storage.createUser({ walletAddress });
    }

    const questions = await storage.getQuizQuestionsByLesson(lessonId);
    if (questions.length === 0) {
      return res.status(404).json({ error: "No quiz found for this lesson" });
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
    const kasRewarded = passed ? kasPerLesson : 0;

    let txHash: string | undefined;
    let actualKasRewarded = 0;

    // Send KAS reward via Kaspa blockchain if quiz passed
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
          content.trim()
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
      content: content.trim(),
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
          content.trim()
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
      content: content.trim(),
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

      // Generate certificate image if not already present
      let imageUrl = certificate.imageUrl;
      if (!imageUrl) {
        imageUrl = krc721Service.generateCertificateImage(
          certificate.recipientAddress,
          certificate.courseName,
          certificate.score || 100,
          certificate.issuedAt
        );
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
