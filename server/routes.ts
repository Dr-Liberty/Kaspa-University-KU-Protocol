import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { getKaspaService } from "./kaspa";

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
      
      res.json({
        isLive: kaspaService.isLive(),
        network: networkInfo.network,
        status: networkInfo.status,
        treasuryAddress: treasuryAddress ?? "Not configured - running in demo mode",
      });
    } catch (error) {
      res.json({
        isLive: false,
        network: "testnet-11",
        status: "error",
        treasuryAddress: "Not configured",
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
          // Create certificate (NFT minting will be Phase 2)
          await storage.createCertificate({
            courseId: lesson.courseId,
            userId: user.id,
            recipientAddress: user.walletAddress,
            courseName: course.title,
            kasReward: course.kasReward,
            issuedAt: new Date(),
            verificationCode: `KU-${randomUUID().slice(0, 8).toUpperCase()}`,
            nftTxHash: undefined, // NFT minting is Phase 2
          });
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
    const { content, isQuestion, authorAddress } = req.body;

    if (!authorAddress) {
      return res.status(401).json({ error: "Wallet not connected" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content is required" });
    }

    const post = await storage.createQAPost({
      lessonId,
      authorAddress,
      content: content.trim(),
      isQuestion: isQuestion ?? true,
    });

    res.json(post);
  });

  return httpServer;
}
