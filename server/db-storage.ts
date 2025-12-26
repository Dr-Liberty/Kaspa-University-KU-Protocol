import type {
  User,
  InsertUser,
  Course,
  Lesson,
  QuizQuestion,
  QuizResult,
  CourseReward,
  Certificate,
  UserProgress,
  QAPost,
  InsertQAPost,
  Stats,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import type { IStorage } from "./storage";

export class DbStorage implements IStorage {
  private courses: Map<string, Course> = new Map();
  private lessons: Map<string, Lesson> = new Map();
  private quizQuestions: Map<string, QuizQuestion> = new Map();

  constructor() {
    this.seedStaticData();
  }

  private seedStaticData() {
    const courses: Course[] = [
      {
        id: "course-1",
        title: "Introduction to Kaspa",
        description: "Learn the fundamentals of Kaspa blockchain, including its unique BlockDAG architecture and GHOSTDAG consensus.",
        lessonCount: 3,
        kasReward: 0.5,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "course-2",
        title: "Bitcoin vs Kaspa: The Next Evolution",
        description: "Compare Bitcoin and Kaspa architectures, understanding how Kaspa solves the blockchain trilemma.",
        lessonCount: 3,
        kasReward: 0.75,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "course-3",
        title: "Understanding BlockDAG Technology",
        description: "Deep dive into Directed Acyclic Graph structures and how they enable parallel block creation.",
        lessonCount: 4,
        kasReward: 1.0,
        difficulty: "intermediate",
        category: "Technical",
      },
      {
        id: "course-4",
        title: "Kaspa Mining Essentials",
        description: "Everything you need to know about mining Kaspa, from hardware requirements to pool selection.",
        lessonCount: 3,
        kasReward: 0.5,
        difficulty: "beginner",
        category: "Mining",
      },
      {
        id: "course-5",
        title: "Building on Kaspa with Kasplex",
        description: "Learn to create tokens and NFTs on Kaspa using the Kasplex Layer 2 protocol.",
        lessonCount: 4,
        kasReward: 1.5,
        difficulty: "advanced",
        category: "Development",
      },
    ];

    courses.forEach((c) => this.courses.set(c.id, c));

    const allLessons: Lesson[] = [
      {
        id: "lesson-1-1",
        courseId: "course-1",
        title: "What is Kaspa?",
        order: 1,
        duration: "10 min",
        content: `<h2>Welcome to Kaspa</h2><p>Kaspa is a proof-of-work cryptocurrency that implements the GHOSTDAG protocol...</p>`,
      },
      {
        id: "lesson-1-2",
        courseId: "course-1",
        title: "The GHOSTDAG Protocol",
        order: 2,
        duration: "12 min",
        content: `<h2>Understanding GHOSTDAG</h2><p>GHOSTDAG is the consensus protocol that makes Kaspa possible...</p>`,
      },
      {
        id: "lesson-1-3",
        courseId: "course-1",
        title: "Kaspa's Native Token: KAS",
        order: 3,
        duration: "8 min",
        content: `<h2>KAS Token Economics</h2><p>KAS is the native cryptocurrency of the Kaspa network...</p>`,
      },
      {
        id: "lesson-2-1",
        courseId: "course-2",
        title: "Bitcoin's Limitations",
        order: 1,
        duration: "10 min",
        content: `<h2>Understanding Bitcoin's Constraints</h2><p>Bitcoin is the original cryptocurrency...</p>`,
      },
      {
        id: "lesson-2-2",
        courseId: "course-2",
        title: "How Kaspa Solves the Trilemma",
        order: 2,
        duration: "12 min",
        content: `<h2>Breaking the Trilemma</h2><p>Kaspa's BlockDAG architecture fundamentally changes the scaling equation...</p>`,
      },
      {
        id: "lesson-2-3",
        courseId: "course-2",
        title: "Side-by-Side Comparison",
        order: 3,
        duration: "8 min",
        content: `<h2>Bitcoin vs Kaspa: The Numbers</h2>...`,
      },
      {
        id: "lesson-3-1",
        courseId: "course-3",
        title: "DAG Fundamentals",
        order: 1,
        duration: "15 min",
        content: `<h2>Directed Acyclic Graphs Explained</h2>...`,
      },
      {
        id: "lesson-3-2",
        courseId: "course-3",
        title: "Parallel Block Creation",
        order: 2,
        duration: "12 min",
        content: `<h2>Mining in a DAG World</h2>...`,
      },
      {
        id: "lesson-3-3",
        courseId: "course-3",
        title: "Block Ordering in GHOSTDAG",
        order: 3,
        duration: "15 min",
        content: `<h2>Creating Order from Chaos</h2>...`,
      },
      {
        id: "lesson-3-4",
        courseId: "course-3",
        title: "Finality and Confirmation",
        order: 4,
        duration: "10 min",
        content: `<h2>When is a Transaction Final?</h2>...`,
      },
      {
        id: "lesson-4-1",
        courseId: "course-4",
        title: "Getting Started with Mining",
        order: 1,
        duration: "12 min",
        content: `<h2>Mining Kaspa: An Introduction</h2>...`,
      },
      {
        id: "lesson-4-2",
        courseId: "course-4",
        title: "Choosing Mining Hardware",
        order: 2,
        duration: "10 min",
        content: `<h2>ASIC Mining Hardware</h2>...`,
      },
      {
        id: "lesson-4-3",
        courseId: "course-4",
        title: "Pool Selection and Setup",
        order: 3,
        duration: "8 min",
        content: `<h2>Joining a Mining Pool</h2>...`,
      },
      {
        id: "lesson-5-1",
        courseId: "course-5",
        title: "Introduction to Kasplex",
        order: 1,
        duration: "12 min",
        content: `<h2>What is Kasplex?</h2>...`,
      },
      {
        id: "lesson-5-2",
        courseId: "course-5",
        title: "Creating KRC-20 Tokens",
        order: 2,
        duration: "15 min",
        content: `<h2>Deploying Your First Token</h2>...`,
      },
      {
        id: "lesson-5-3",
        courseId: "course-5",
        title: "NFTs with KRC-721",
        order: 3,
        duration: "15 min",
        content: `<h2>Creating NFTs on Kaspa</h2>...`,
      },
      {
        id: "lesson-5-4",
        courseId: "course-5",
        title: "Building dApps on Kasplex",
        order: 4,
        duration: "18 min",
        content: `<h2>Developing for Kasplex</h2>...`,
      },
    ];

    allLessons.forEach((l) => this.lessons.set(l.id, l));

    const allQuestions: QuizQuestion[] = [
      { id: "q-1-1-1", lessonId: "lesson-1-1", question: "What consensus protocol does Kaspa use?", options: ["Proof of Stake", "GHOSTDAG", "Nakamoto Consensus", "Tendermint"], correctIndex: 1, explanation: "Kaspa uses the GHOSTDAG protocol for consensus." },
      { id: "q-1-1-2", lessonId: "lesson-1-1", question: "How many blocks per second does Kaspa currently produce?", options: ["1", "5", "10", "100"], correctIndex: 2, explanation: "Kaspa currently produces 10 blocks per second." },
      { id: "q-1-2-1", lessonId: "lesson-1-2", question: "What determines if a block is 'blue' in GHOSTDAG?", options: ["Its size", "Its timestamp", "Its connectivity to other blocks", "Its transaction count"], correctIndex: 2, explanation: "Blocks are colored based on their connectivity." },
      { id: "q-1-3-1", lessonId: "lesson-1-3", question: "What is the maximum supply of KAS?", options: ["21 million", "28.7 billion", "100 billion", "Unlimited"], correctIndex: 1, explanation: "The maximum supply of KAS is 28.7 billion tokens." },
      { id: "q-2-1-1", lessonId: "lesson-2-1", question: "What is an 'orphan' block in Bitcoin?", options: ["A block with no transactions", "A block that was found but discarded", "A block with invalid signatures", "The first block in a chain"], correctIndex: 1, explanation: "An orphan block is one that was validly mined but not included in the main chain." },
      { id: "q-2-2-1", lessonId: "lesson-2-2", question: "How does Kaspa handle blocks created simultaneously?", options: ["Discards all but one", "Includes all of them", "Uses random selection", "Requires manual resolution"], correctIndex: 1, explanation: "Kaspa includes all valid blocks in the DAG and orders them with GHOSTDAG." },
      { id: "q-2-3-1", lessonId: "lesson-2-3", question: "What is Kaspa's block rate compared to Bitcoin?", options: ["Same", "10 blocks per second vs 1 per 10 minutes", "1 block per minute vs 10 per hour", "10 blocks per minute vs 1 per hour"], correctIndex: 1, explanation: "Kaspa produces 10 blocks per second compared to Bitcoin's 1 block per 10 minutes." },
      { id: "q-3-1-1", lessonId: "lesson-3-1", question: "In a BlockDAG, how many parent blocks can a new block reference?", options: ["Exactly one", "Multiple", "None", "Exactly two"], correctIndex: 1, explanation: "In a BlockDAG, blocks can reference multiple parent blocks." },
      { id: "q-3-2-1", lessonId: "lesson-3-2", question: "What happens to simultaneously mined blocks in Kaspa?", options: ["One is discarded", "All are included", "They are merged", "They cancel each other"], correctIndex: 1, explanation: "All valid blocks are included in the DAG structure." },
      { id: "q-3-3-1", lessonId: "lesson-3-3", question: "What is the purpose of GHOSTDAG coloring?", options: ["Visual display", "Determine block order and validity", "Mining optimization", "Network routing"], correctIndex: 1, explanation: "GHOSTDAG coloring helps determine block ordering." },
      { id: "q-3-4-1", lessonId: "lesson-3-4", question: "How long does Kaspa take for practical transaction finality?", options: ["10 minutes", "1 hour", "About 10 seconds", "24 hours"], correctIndex: 2, explanation: "Kaspa achieves practical finality in about 10 seconds." },
      { id: "q-4-1-1", lessonId: "lesson-4-1", question: "What mining algorithm does Kaspa use?", options: ["SHA-256", "Ethash", "kHeavyHash", "Scrypt"], correctIndex: 2, explanation: "Kaspa uses the kHeavyHash mining algorithm." },
      { id: "q-4-2-1", lessonId: "lesson-4-2", question: "What is the best efficiency metric for comparing miners?", options: ["Price", "Hashrate only", "Joules per Terahash (J/TH)", "Weight"], correctIndex: 2, explanation: "J/TH measures power efficiency." },
      { id: "q-4-3-1", lessonId: "lesson-4-3", question: "Why do most miners join pools?", options: ["It's required", "More consistent payouts", "Lower electricity costs", "Better hardware"], correctIndex: 1, explanation: "Pools provide smaller but more frequent and consistent payouts." },
      { id: "q-5-1-1", lessonId: "lesson-5-1", question: "What is the token standard for NFTs on Kasplex?", options: ["KRC-20", "KRC-721", "ERC-1155", "BRC-20"], correctIndex: 1, explanation: "KRC-721 is the NFT standard on Kasplex." },
      { id: "q-5-2-1", lessonId: "lesson-5-2", question: "What does the 'lim' parameter control in KRC-20?", options: ["Total supply", "Max mint per transaction", "Decimal places", "Transfer fee"], correctIndex: 1, explanation: "The 'lim' parameter sets the maximum amount that can be minted per transaction." },
      { id: "q-5-3-1", lessonId: "lesson-5-3", question: "Why does KRC-721 use a commit-reveal pattern?", options: ["To save gas", "To prevent front-running", "For privacy", "For larger files"], correctIndex: 1, explanation: "The commit-reveal pattern prevents front-running." },
      { id: "q-5-4-1", lessonId: "lesson-5-4", question: "Where are NFT images typically stored?", options: ["On the blockchain", "On IPFS", "In the indexer", "In the wallet"], correctIndex: 1, explanation: "NFT images are stored on IPFS." },
    ];

    allQuestions.forEach((q) => this.quizQuestions.set(q.id, q));
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0] as User | undefined;
  }

  async getUserByWalletAddress(address: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.walletAddress, address)).limit(1);
    return result[0] as User | undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user = {
      id,
      walletAddress: insertUser.walletAddress,
      displayName: insertUser.displayName || null,
      totalKasEarned: 0,
    };
    await db.insert(schema.users).values(user);
    return { ...user, createdAt: new Date() } as User;
  }

  async updateUserKas(userId: string, amount: number): Promise<void> {
    await db.update(schema.users)
      .set({ totalKasEarned: sql`${schema.users.totalKasEarned} + ${amount}` })
      .where(eq(schema.users.id, userId));
  }

  async getCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter((l) => l.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async getQuizQuestionsByLesson(lessonId: string): Promise<QuizQuestion[]> {
    return Array.from(this.quizQuestions.values()).filter((q) => q.lessonId === lessonId);
  }

  async saveQuizResult(result: Omit<QuizResult, "id" | "completedAt">): Promise<QuizResult> {
    const id = randomUUID();
    const quizResult = {
      id,
      lessonId: result.lessonId,
      userId: result.userId,
      score: result.score,
      passed: result.passed,
    };
    await db.insert(schema.quizResults).values(quizResult);
    return { ...quizResult, completedAt: new Date() } as QuizResult;
  }

  async getQuizResultsByUser(userId: string): Promise<QuizResult[]> {
    const results = await db.select().from(schema.quizResults)
      .where(eq(schema.quizResults.userId, userId));
    return results as QuizResult[];
  }

  async getQuizResult(id: string): Promise<QuizResult | undefined> {
    const result = await db.select().from(schema.quizResults)
      .where(eq(schema.quizResults.id, id)).limit(1);
    return result[0] as QuizResult | undefined;
  }

  async getQuizResultsForCourse(userId: string, courseId: string): Promise<QuizResult[]> {
    const lessons = await this.getLessonsByCourse(courseId);
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length === 0) return [];
    
    const results = await db.select().from(schema.quizResults)
      .where(and(
        eq(schema.quizResults.userId, userId),
        inArray(schema.quizResults.lessonId, lessonIds)
      ))
      .orderBy(desc(schema.quizResults.completedAt));
    return results as QuizResult[];
  }

  async getCourseRewardsByUser(userId: string): Promise<CourseReward[]> {
    const results = await db.select().from(schema.courseRewards)
      .where(eq(schema.courseRewards.userId, userId))
      .orderBy(desc(schema.courseRewards.completedAt));
    return results as CourseReward[];
  }

  async getCourseReward(id: string): Promise<CourseReward | undefined> {
    const result = await db.select().from(schema.courseRewards)
      .where(eq(schema.courseRewards.id, id)).limit(1);
    return result[0] as CourseReward | undefined;
  }

  async getCourseRewardForCourse(userId: string, courseId: string): Promise<CourseReward | undefined> {
    const result = await db.select().from(schema.courseRewards)
      .where(and(
        eq(schema.courseRewards.userId, userId),
        eq(schema.courseRewards.courseId, courseId)
      )).limit(1);
    return result[0] as CourseReward | undefined;
  }

  async createCourseReward(reward: Omit<CourseReward, "id" | "completedAt">): Promise<CourseReward> {
    const id = randomUUID();
    const courseReward = {
      id,
      courseId: reward.courseId,
      userId: reward.userId,
      walletAddress: reward.walletAddress,
      kasAmount: reward.kasAmount,
      averageScore: reward.averageScore,
      status: reward.status || "pending",
      txHash: reward.txHash || null,
      txConfirmed: reward.txConfirmed || null,
      claimedAt: reward.claimedAt || null,
    };
    await db.insert(schema.courseRewards).values(courseReward);
    return { ...courseReward, completedAt: new Date() } as CourseReward;
  }

  async updateCourseReward(id: string, updates: Partial<CourseReward>): Promise<CourseReward | undefined> {
    const updateData: Record<string, unknown> = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.txHash !== undefined) updateData.txHash = updates.txHash;
    if (updates.txConfirmed !== undefined) updateData.txConfirmed = updates.txConfirmed;
    if (updates.claimedAt !== undefined) updateData.claimedAt = updates.claimedAt;
    
    if (Object.keys(updateData).length > 0) {
      await db.update(schema.courseRewards).set(updateData).where(eq(schema.courseRewards.id, id));
    }
    return this.getCourseReward(id);
  }

  async getClaimableCourseRewards(userId: string): Promise<CourseReward[]> {
    const results = await db.select().from(schema.courseRewards)
      .where(and(
        eq(schema.courseRewards.userId, userId),
        eq(schema.courseRewards.status, "pending")
      ))
      .orderBy(desc(schema.courseRewards.completedAt));
    return results as CourseReward[];
  }

  async checkCourseCompletion(userId: string, courseId: string): Promise<{completed: boolean; averageScore: number; lessonsCompleted: number; totalLessons: number}> {
    const lessons = await this.getLessonsByCourse(courseId);
    const quizResults = await this.getQuizResultsForCourse(userId, courseId);
    
    const passedLessons = new Set<string>();
    const scores: number[] = [];
    
    for (const result of quizResults) {
      if (result.passed) {
        passedLessons.add(result.lessonId);
        scores.push(result.score);
      }
    }
    
    const lessonsCompleted = passedLessons.size;
    const totalLessons = lessons.length;
    const completed = lessonsCompleted >= totalLessons;
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    return { completed, averageScore, lessonsCompleted, totalLessons };
  }

  async getCertificatesByUser(userId: string): Promise<Certificate[]> {
    const results = await db.select().from(schema.certificates)
      .where(eq(schema.certificates.userId, userId))
      .orderBy(desc(schema.certificates.issuedAt));
    return results as Certificate[];
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    const result = await db.select().from(schema.certificates)
      .where(eq(schema.certificates.id, id)).limit(1);
    return result[0] as Certificate | undefined;
  }

  async createCertificate(cert: Omit<Certificate, "id">): Promise<Certificate> {
    const id = randomUUID();
    const certificate = {
      id,
      courseId: cert.courseId,
      userId: cert.userId,
      recipientAddress: cert.recipientAddress,
      courseName: cert.courseName,
      kasReward: cert.kasReward,
      score: cert.score || null,
      verificationCode: cert.verificationCode,
      ipfsHash: cert.ipfsHash || null,
      nftTxHash: cert.nftTxHash || null,
      imageUrl: cert.imageUrl || null,
      nftStatus: cert.nftStatus || "pending",
    };
    await db.insert(schema.certificates).values(certificate);
    return { ...certificate, issuedAt: new Date() } as Certificate;
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined> {
    const updateData: Record<string, unknown> = {};
    if (updates.ipfsHash !== undefined) updateData.ipfsHash = updates.ipfsHash;
    if (updates.nftTxHash !== undefined) updateData.nftTxHash = updates.nftTxHash;
    if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl;
    if (updates.nftStatus !== undefined) updateData.nftStatus = updates.nftStatus;
    
    if (Object.keys(updateData).length > 0) {
      await db.update(schema.certificates).set(updateData).where(eq(schema.certificates.id, id));
    }
    return this.getCertificate(id);
  }

  async getCertificateCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(schema.certificates);
    return Number(result[0]?.count || 0);
  }

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    const results = await db.select().from(schema.userProgress)
      .where(eq(schema.userProgress.userId, userId));
    return results as UserProgress[];
  }

  async getOrCreateProgress(userId: string, courseId: string): Promise<UserProgress> {
    const existing = await db.select().from(schema.userProgress)
      .where(and(
        eq(schema.userProgress.userId, userId),
        eq(schema.userProgress.courseId, courseId)
      )).limit(1);
    
    if (existing[0]) return existing[0] as UserProgress;

    const id = randomUUID();
    const progress = {
      id,
      userId,
      courseId,
      completedLessons: [] as string[],
      currentLessonId: null,
    };
    await db.insert(schema.userProgress).values(progress);
    return { ...progress, startedAt: new Date(), currentLessonId: undefined } as UserProgress;
  }

  async updateProgress(progressId: string, lessonId: string): Promise<UserProgress> {
    const existing = await db.select().from(schema.userProgress)
      .where(eq(schema.userProgress.id, progressId)).limit(1);
    
    if (!existing[0]) throw new Error("Progress not found");
    
    const progress = existing[0] as UserProgress;
    const completedLessons = progress.completedLessons || [];
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    }
    
    await db.update(schema.userProgress)
      .set({ completedLessons, currentLessonId: lessonId })
      .where(eq(schema.userProgress.id, progressId));
    
    return { ...progress, completedLessons, currentLessonId: lessonId };
  }

  async getQAPostsByLesson(lessonId: string): Promise<QAPost[]> {
    const results = await db.select().from(schema.qaPosts)
      .where(eq(schema.qaPosts.lessonId, lessonId))
      .orderBy(desc(schema.qaPosts.createdAt));
    return results as QAPost[];
  }

  async getQAPost(id: string): Promise<QAPost | undefined> {
    const result = await db.select().from(schema.qaPosts)
      .where(eq(schema.qaPosts.id, id)).limit(1);
    return result[0] as QAPost | undefined;
  }

  async createQAPost(post: InsertQAPost): Promise<QAPost> {
    const id = randomUUID();
    const qaPost = {
      id,
      lessonId: post.lessonId,
      authorAddress: post.authorAddress,
      authorDisplayName: post.authorDisplayName || null,
      content: post.content,
      isQuestion: post.isQuestion,
      parentId: post.parentId || null,
      txHash: post.txHash || null,
    };
    await db.insert(schema.qaPosts).values(qaPost);
    return { ...qaPost, createdAt: new Date() } as QAPost;
  }

  async getStats(): Promise<Stats> {
    const [userStats] = await db.select({ 
      totalKas: sql<number>`COALESCE(SUM(${schema.users.totalKasEarned}), 0)`,
      activeLearners: sql<number>`count(*)`
    }).from(schema.users);
    
    const certCount = await this.getCertificateCount();
    
    return {
      totalKasDistributed: Number(userStats?.totalKas || 0),
      certificatesMinted: certCount,
      activeLearners: Number(userStats?.activeLearners || 0),
      coursesAvailable: this.courses.size,
    };
  }

  async getRecentQuizResults(limit: number): Promise<QuizResult[]> {
    const results = await db.select().from(schema.quizResults)
      .orderBy(desc(schema.quizResults.completedAt))
      .limit(limit);
    return results as QuizResult[];
  }

  async getRecentQAPosts(limit: number): Promise<QAPost[]> {
    const results = await db.select().from(schema.qaPosts)
      .orderBy(desc(schema.qaPosts.createdAt))
      .limit(limit);
    return results as QAPost[];
  }

  async getAllUsers(): Promise<User[]> {
    const results = await db.select().from(schema.users);
    return results as User[];
  }

  async getTopLearners(limit: number): Promise<User[]> {
    const results = await db.select().from(schema.users)
      .orderBy(desc(schema.users.totalKasEarned))
      .limit(limit);
    return results as User[];
  }

  async getTotalQuizResults(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(schema.quizResults);
    return Number(result[0]?.count || 0);
  }

  async getAverageScore(): Promise<number> {
    const result = await db.select({ 
      avg: sql<number>`COALESCE(AVG(${schema.quizResults.score}), 0)` 
    }).from(schema.quizResults);
    return Math.round(Number(result[0]?.avg || 0));
  }

  async getCourseCompletionCounts(): Promise<Map<string, number>> {
    const results = await db.select({
      courseId: schema.certificates.courseId,
      count: sql<number>`count(*)`
    }).from(schema.certificates).groupBy(schema.certificates.courseId);
    
    const counts = new Map<string, number>();
    for (const row of results) {
      counts.set(row.courseId, Number(row.count));
    }
    return counts;
  }

  async getAllQuizResults(): Promise<QuizResult[]> {
    const results = await db.select().from(schema.quizResults);
    return results as QuizResult[];
  }
}
