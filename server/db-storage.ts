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
import { courses as seedCourses, lessons as seedLessons, quizQuestions as seedQuizQuestions } from "./seed-data";

export class DbStorage implements IStorage {
  private courses: Map<string, Course> = new Map();
  private lessons: Map<string, Lesson> = new Map();
  private quizQuestions: Map<string, QuizQuestion> = new Map();

  constructor() {
    this.seedStaticData();
  }

  private seedStaticData() {
    seedCourses.forEach((c) => this.courses.set(c.id, c));
    seedLessons.forEach((l) => this.lessons.set(l.id, l));
    seedQuizQuestions.forEach((q) => this.quizQuestions.set(q.id, q));
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
    const result = await db.insert(schema.users).values(user).returning();
    return result[0] as User;
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
    const inserted = await db.insert(schema.quizResults).values(quizResult).returning();
    return inserted[0] as QuizResult;
  }

  async getQuizResultsByUser(userId: string): Promise<QuizResult[]> {
    const results = await db.select().from(schema.quizResults)
      .where(eq(schema.quizResults.userId, userId))
      .orderBy(desc(schema.quizResults.completedAt));
    return results as QuizResult[];
  }

  async getQuizResult(id: string): Promise<QuizResult | undefined> {
    const result = await db.select().from(schema.quizResults)
      .where(eq(schema.quizResults.id, id)).limit(1);
    return result[0] as QuizResult | undefined;
  }

  async getQuizResultsForCourse(userId: string, courseId: string): Promise<QuizResult[]> {
    const courseLessons = await this.getLessonsByCourse(courseId);
    const lessonIds = courseLessons.map(l => l.id);
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
    const result = await db.insert(schema.courseRewards).values(courseReward).returning();
    return result[0] as CourseReward;
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
        inArray(schema.courseRewards.status, ["pending", "failed", "confirming"])
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
    const result = await db.insert(schema.certificates).values(certificate).returning();
    return result[0] as Certificate;
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

  async getAllCertificates(): Promise<Certificate[]> {
    const results = await db.select().from(schema.certificates);
    return results as Certificate[];
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
    const result = await db.insert(schema.userProgress).values(progress).returning();
    const inserted = result[0];
    return {
      ...inserted,
      completedLessons: inserted.completedLessons || [],
      currentLessonId: inserted.currentLessonId || undefined,
    } as UserProgress;
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
    const result = await db.insert(schema.qaPosts).values(qaPost).returning();
    return result[0] as QAPost;
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
