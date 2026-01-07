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
  CourseTokenCounter,
  MintReservation,
  InsertMintReservation,
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

  async updateUserProfile(userId: string, updates: { displayName?: string; avatarUrl?: string }): Promise<User | undefined> {
    const updateData: any = {};
    if (updates.displayName !== undefined) {
      updateData.displayName = updates.displayName;
    }
    if (updates.avatarUrl !== undefined) {
      updateData.avatarUrl = updates.avatarUrl;
    }
    if (Object.keys(updateData).length === 0) {
      return this.getUser(userId);
    }
    const result = await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, userId))
      .returning();
    return result[0] as User | undefined;
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
      txHash: result.txHash || null,
      txStatus: result.txStatus || "pending",
      payloadHex: result.payloadHex || null,
      walletAddress: result.walletAddress || null,
    };
    const inserted = await db.insert(schema.quizResults).values(quizResult).returning();
    return inserted[0] as QuizResult;
  }
  
  async updateQuizResult(id: string, updates: Partial<QuizResult>): Promise<QuizResult | undefined> {
    const updateData: Record<string, any> = {};
    if (updates.txHash !== undefined) updateData.txHash = updates.txHash;
    if (updates.txStatus !== undefined) updateData.txStatus = updates.txStatus;
    if (updates.score !== undefined) updateData.score = updates.score;
    if (updates.passed !== undefined) updateData.passed = updates.passed;
    
    if (Object.keys(updateData).length === 0) {
      return this.getQuizResult(id);
    }
    
    const result = await db.update(schema.quizResults)
      .set(updateData)
      .where(eq(schema.quizResults.id, id))
      .returning();
    return result[0] as QuizResult | undefined;
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

  async getAllCourseRewards(): Promise<CourseReward[]> {
    const results = await db.select().from(schema.courseRewards)
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

  async resetUserData(userId: string): Promise<void> {
    await db.delete(schema.quizResults).where(eq(schema.quizResults.userId, userId));
    await db.delete(schema.courseRewards).where(eq(schema.courseRewards.userId, userId));
    await db.delete(schema.certificates).where(eq(schema.certificates.userId, userId));
    await db.delete(schema.userProgress).where(eq(schema.userProgress.userId, userId));
    console.log(`[DbStorage] Reset all data for user ${userId}`);
  }

  // NFT Mint Reservation methods - using Postgres for persistence
  private readonly MAX_TOKENS_PER_COURSE = 1000;

  async getCourseTokenCounter(courseId: string): Promise<CourseTokenCounter | undefined> {
    const result = await db.select()
      .from(schema.courseTokenCounters)
      .where(eq(schema.courseTokenCounters.courseId, courseId))
      .limit(1);
    return result[0] as CourseTokenCounter | undefined;
  }

  async initializeCourseTokenCounter(courseId: string, courseIndex: number): Promise<CourseTokenCounter> {
    const existing = await this.getCourseTokenCounter(courseId);
    if (existing) return existing;
    
    const counter = {
      courseId,
      courseIndex,
      nextTokenOffset: 0,
      totalMinted: 0,
    };
    
    const result = await db.insert(schema.courseTokenCounters)
      .values(counter)
      .onConflictDoNothing()
      .returning();
    
    if (result[0]) {
      return result[0] as CourseTokenCounter;
    }
    
    const afterInsert = await this.getCourseTokenCounter(courseId);
    return afterInsert || counter;
  }

  async reserveTokenId(courseId: string): Promise<number | null> {
    // Use a transaction with row-level locking for atomic tokenId assignment
    return await db.transaction(async (tx) => {
      // First try to get a recycled tokenId with FOR UPDATE SKIP LOCKED
      const recycled = await tx.execute(sql`
        DELETE FROM available_token_pool 
        WHERE id = (
          SELECT id FROM available_token_pool 
          WHERE course_id = ${courseId}
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING token_id
      `);
      
      if (recycled.rows && recycled.rows.length > 0) {
        return recycled.rows[0].token_id as number;
      }
      
      // No recycled tokenIds, get new one from counter with row-level lock
      const counterResult = await tx.execute(sql`
        SELECT * FROM course_token_counters 
        WHERE course_id = ${courseId}
        FOR UPDATE
      `);
      
      if (!counterResult.rows || counterResult.rows.length === 0) {
        return null;
      }
      
      const counter = counterResult.rows[0] as any;
      
      // Check if counter has reached max for this course (0-999 offsets = 1000 tokens)
      // If at max and no recycled tokens available, we're sold out
      if (counter.next_token_offset >= this.MAX_TOKENS_PER_COURSE) {
        return null; // Counter exhausted and no recycled tokens
      }
      
      const tokenId = (counter.course_index * this.MAX_TOKENS_PER_COURSE) + counter.next_token_offset + 1;
      
      // Atomically increment the counter
      await tx.execute(sql`
        UPDATE course_token_counters 
        SET next_token_offset = next_token_offset + 1, updated_at = NOW()
        WHERE course_id = ${courseId}
      `);
      
      return tokenId;
    });
  }

  async createMintReservation(reservation: InsertMintReservation): Promise<MintReservation> {
    const result = await db.insert(schema.userSignedMintReservations)
      .values({
        certificateId: reservation.certificateId,
        courseId: reservation.courseId,
        walletAddress: reservation.walletAddress,
        tokenId: reservation.tokenId,
        inscriptionJson: reservation.inscriptionJson,
        status: reservation.status || "reserved",
        expiresAt: reservation.expiresAt,
      })
      .returning();
    
    return result[0] as MintReservation;
  }

  async getMintReservation(id: string): Promise<MintReservation | undefined> {
    const result = await db.select()
      .from(schema.userSignedMintReservations)
      .where(eq(schema.userSignedMintReservations.id, id))
      .limit(1);
    return result[0] as MintReservation | undefined;
  }

  async getMintReservationByTokenId(tokenId: number): Promise<MintReservation | undefined> {
    const result = await db.select()
      .from(schema.userSignedMintReservations)
      .where(eq(schema.userSignedMintReservations.tokenId, tokenId))
      .limit(1);
    return result[0] as MintReservation | undefined;
  }

  async getMintReservationByCertificate(certificateId: string): Promise<MintReservation | undefined> {
    const result = await db.select()
      .from(schema.userSignedMintReservations)
      .where(eq(schema.userSignedMintReservations.certificateId, certificateId))
      .limit(1);
    return result[0] as MintReservation | undefined;
  }

  async getActiveMintReservation(walletAddress: string, courseId: string): Promise<MintReservation | undefined> {
    const result = await db.select()
      .from(schema.userSignedMintReservations)
      .where(and(
        eq(schema.userSignedMintReservations.walletAddress, walletAddress),
        eq(schema.userSignedMintReservations.courseId, courseId),
        inArray(schema.userSignedMintReservations.status, ["reserved", "signing"]),
        sql`${schema.userSignedMintReservations.expiresAt} > NOW()`
      ))
      .limit(1);
    return result[0] as MintReservation | undefined;
  }

  async updateMintReservation(id: string, updates: Partial<MintReservation>): Promise<MintReservation | undefined> {
    const updateData: Record<string, any> = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.mintTxHash !== undefined) updateData.mintTxHash = updates.mintTxHash;
    if (updates.mintedAt !== undefined) updateData.mintedAt = updates.mintedAt;
    
    if (Object.keys(updateData).length === 0) {
      return this.getMintReservation(id);
    }
    
    const result = await db.update(schema.userSignedMintReservations)
      .set(updateData)
      .where(eq(schema.userSignedMintReservations.id, id))
      .returning();
    
    return result[0] as MintReservation | undefined;
  }

  async expireOldReservations(): Promise<number> {
    // Use a transaction to atomically expire reservations and recycle their tokenIds
    return await db.transaction(async (tx) => {
      // Lock expired reservations for update to prevent races
      const expiredResult = await tx.execute(sql`
        SELECT * FROM user_signed_mint_reservations
        WHERE status IN ('reserved', 'signing')
        AND expires_at <= NOW()
        FOR UPDATE
      `);
      
      if (!expiredResult.rows || expiredResult.rows.length === 0) {
        return 0;
      }
      
      const expiredReservations = expiredResult.rows as any[];
      
      // Recycle tokenIds atomically within the transaction
      for (const reservation of expiredReservations) {
        await tx.execute(sql`
          INSERT INTO available_token_pool (course_id, token_id)
          VALUES (${reservation.course_id}, ${reservation.token_id})
          ON CONFLICT DO NOTHING
        `);
      }
      
      // Update all expired reservations
      const expiredIds = expiredReservations.map(r => r.id);
      await tx.execute(sql`
        UPDATE user_signed_mint_reservations
        SET status = 'expired'
        WHERE id = ANY(${expiredIds})
      `);
      
      return expiredReservations.length;
    });
  }

  async getMintedTokenCount(courseId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.userSignedMintReservations)
      .where(and(
        eq(schema.userSignedMintReservations.courseId, courseId),
        eq(schema.userSignedMintReservations.status, "minted")
      ));
    return Number(result[0]?.count || 0);
  }

  async recycleTokenId(courseId: string, tokenId: number): Promise<void> {
    // Atomic insert with ON CONFLICT to prevent duplicate recycling
    await db.insert(schema.availableTokenPool)
      .values({
        courseId,
        tokenId,
      })
      .onConflictDoNothing();
  }

  async cancelMintReservation(reservationId: string): Promise<{ success: boolean; reservation?: MintReservation }> {
    // Use a transaction to atomically cancel reservation and recycle tokenId
    return await db.transaction(async (tx) => {
      // Lock the reservation for update
      const reservationResult = await tx.execute(sql`
        SELECT * FROM user_signed_mint_reservations
        WHERE id = ${reservationId}
        FOR UPDATE
      `);
      
      if (!reservationResult.rows || reservationResult.rows.length === 0) {
        return { success: false };
      }
      
      const reservation = reservationResult.rows[0] as any;
      
      // Don't cancel already minted reservations
      if (reservation.status === "minted") {
        return { success: false };
      }
      
      // Update status to cancelled
      await tx.execute(sql`
        UPDATE user_signed_mint_reservations
        SET status = 'cancelled'
        WHERE id = ${reservationId}
      `);
      
      // Recycle the tokenId atomically
      await tx.execute(sql`
        INSERT INTO available_token_pool (course_id, token_id)
        VALUES (${reservation.course_id}, ${reservation.token_id})
        ON CONFLICT DO NOTHING
      `);
      
      // Map snake_case to camelCase for the return value
      const updatedReservation: MintReservation = {
        id: reservation.id,
        certificateId: reservation.certificate_id,
        courseId: reservation.course_id,
        walletAddress: reservation.wallet_address,
        tokenId: reservation.token_id,
        inscriptionJson: reservation.inscription_json,
        status: "cancelled",
        mintTxHash: reservation.mint_tx_hash,
        createdAt: reservation.created_at,
        expiresAt: reservation.expires_at,
        mintedAt: reservation.minted_at,
      };
      
      return { success: true, reservation: updatedReservation };
    });
  }

  async confirmMintReservation(reservationId: string, mintTxHash: string): Promise<{ success: boolean; reservation?: MintReservation; error?: string }> {
    // Use a transaction to atomically confirm reservation and update certificate
    return await db.transaction(async (tx) => {
      // Lock the reservation for update
      const reservationResult = await tx.execute(sql`
        SELECT * FROM user_signed_mint_reservations
        WHERE id = ${reservationId}
        FOR UPDATE
      `);
      
      if (!reservationResult.rows || reservationResult.rows.length === 0) {
        return { success: false, error: "Reservation not found" };
      }
      
      const reservation = reservationResult.rows[0] as any;
      
      // Already minted - idempotent success
      if (reservation.status === "minted") {
        const existingReservation: MintReservation = {
          id: reservation.id,
          certificateId: reservation.certificate_id,
          courseId: reservation.course_id,
          walletAddress: reservation.wallet_address,
          tokenId: reservation.token_id,
          inscriptionJson: reservation.inscription_json,
          status: reservation.status,
          mintTxHash: reservation.mint_tx_hash,
          createdAt: reservation.created_at,
          expiresAt: reservation.expires_at,
          mintedAt: reservation.minted_at,
        };
        return { success: true, reservation: existingReservation };
      }
      
      if (reservation.status === "expired" || reservation.status === "cancelled") {
        return { success: false, error: `Reservation is ${reservation.status}` };
      }
      
      // Check expiration (unless already in signing status)
      if (reservation.expires_at <= new Date() && reservation.status !== "signing") {
        await tx.execute(sql`
          UPDATE user_signed_mint_reservations
          SET status = 'expired'
          WHERE id = ${reservationId}
        `);
        return { success: false, error: "Reservation has expired" };
      }
      
      // Update reservation to minted status and get the actual timestamp from DB
      const updateResult = await tx.execute(sql`
        UPDATE user_signed_mint_reservations
        SET status = 'minted', mint_tx_hash = ${mintTxHash}, minted_at = NOW()
        WHERE id = ${reservationId}
        RETURNING minted_at
      `);
      
      const mintedAt = updateResult.rows && updateResult.rows.length > 0 
        ? (updateResult.rows[0] as any).minted_at 
        : new Date();
      
      // Update certificate atomically in the same transaction
      await tx.execute(sql`
        UPDATE certificates
        SET nft_tx_hash = ${mintTxHash}, nft_status = 'claimed'
        WHERE id = ${reservation.certificate_id}
      `);
      
      // Return the updated reservation with actual DB timestamp
      const updatedReservation: MintReservation = {
        id: reservation.id,
        certificateId: reservation.certificate_id,
        courseId: reservation.course_id,
        walletAddress: reservation.wallet_address,
        tokenId: reservation.token_id,
        inscriptionJson: reservation.inscription_json,
        status: "minted",
        mintTxHash,
        createdAt: reservation.created_at,
        expiresAt: reservation.expires_at,
        mintedAt,
      };
      
      return { success: true, reservation: updatedReservation };
    });
  }

  async getRecyclePoolDepth(courseId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.availableTokenPool)
      .where(eq(schema.availableTokenPool.courseId, courseId));
    return Number(result[0]?.count || 0);
  }

  async getAllCourseCounters(): Promise<CourseTokenCounter[]> {
    const result = await db.select()
      .from(schema.courseTokenCounters)
      .orderBy(schema.courseTokenCounters.courseIndex);
    
    return result.map(row => ({
      courseId: row.courseId,
      courseIndex: row.courseIndex,
      nextTokenOffset: row.nextTokenOffset,
      totalMinted: row.totalMinted,
      updatedAt: row.updatedAt,
    }));
  }

  async setUserWhitelisted(userId: string, txHash: string): Promise<User | undefined> {
    const result = await db.update(schema.users)
      .set({ 
        whitelistedAt: new Date(),
        whitelistTxHash: txHash,
      })
      .where(eq(schema.users.id, userId))
      .returning();
    return result[0] as User | undefined;
  }

  async isUserWhitelisted(userId: string): Promise<boolean> {
    const result = await db.select({ whitelistedAt: schema.users.whitelistedAt })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return result[0]?.whitelistedAt !== null && result[0]?.whitelistedAt !== undefined;
  }

  async getCourseAsset(courseId: string): Promise<{ courseId: string; imageIpfsUrl: string; imageIpfsHash: string } | undefined> {
    const result = await db.select()
      .from(schema.courseAssets)
      .where(eq(schema.courseAssets.courseId, courseId))
      .limit(1);
    return result[0] || undefined;
  }

  async saveCourseAsset(courseId: string, imageIpfsUrl: string, imageIpfsHash: string): Promise<void> {
    await db.insert(schema.courseAssets)
      .values({ courseId, imageIpfsUrl, imageIpfsHash })
      .onConflictDoUpdate({
        target: schema.courseAssets.courseId,
        set: { imageIpfsUrl, imageIpfsHash, uploadedAt: new Date() },
      });
  }

  // K Protocol public comments
  async createKPublicComment(comment: {
    lessonId: string;
    authorAddress: string;
    authorPubkey: string;
    content: string;
    signature: string;
    parentTxHash?: string;
    isReply?: boolean;
    txStatus?: string;
  }): Promise<{ id: string; lessonId: string; authorAddress: string; content: string; createdAt: Date }> {
    const result = await db.insert(schema.kPublicComments)
      .values({
        lessonId: comment.lessonId,
        authorAddress: comment.authorAddress,
        authorPubkey: comment.authorPubkey,
        content: comment.content,
        signature: comment.signature,
        parentTxHash: comment.parentTxHash || null,
        isReply: comment.isReply || false,
        txStatus: comment.txStatus || "pending",
      })
      .returning();
    
    const row = result[0];
    return {
      id: row.id,
      lessonId: row.lessonId,
      authorAddress: row.authorAddress,
      content: row.content,
      createdAt: row.createdAt,
    };
  }

  async getKPublicComments(lessonId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await db.select()
      .from(schema.kPublicComments)
      .where(eq(schema.kPublicComments.lessonId, lessonId))
      .orderBy(desc(schema.kPublicComments.createdAt))
      .limit(limit)
      .offset(offset);
    return result;
  }

  async updateKPublicCommentTx(commentId: string, txHash: string, txStatus: string): Promise<void> {
    await db.update(schema.kPublicComments)
      .set({ txHash, txStatus })
      .where(eq(schema.kPublicComments.id, commentId));
  }

  // Kasia encrypted conversations
  async createConversation(conversation: {
    id: string;
    initiatorAddress: string;
    recipientAddress: string;
    status: string;
    handshakeTxHash?: string;
    initiatorAlias?: string;
    isAdminConversation?: boolean;
  }): Promise<any> {
    const result = await db.insert(schema.conversations)
      .values({
        id: conversation.id,
        initiatorAddress: conversation.initiatorAddress,
        recipientAddress: conversation.recipientAddress,
        status: conversation.status,
        handshakeTxHash: conversation.handshakeTxHash || null,
        initiatorAlias: conversation.initiatorAlias || null,
        isAdminConversation: conversation.isAdminConversation || false,
      })
      .returning();
    return result[0];
  }

  async getConversation(id: string): Promise<any | undefined> {
    const result = await db.select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .limit(1);
    return result[0];
  }

  async getConversationsForWallet(walletAddress: string): Promise<any[]> {
    const result = await db.select()
      .from(schema.conversations)
      .where(
        sql`${schema.conversations.initiatorAddress} = ${walletAddress} OR ${schema.conversations.recipientAddress} = ${walletAddress}`
      )
      .orderBy(desc(schema.conversations.updatedAt));
    return result;
  }

  async updateConversationStatus(id: string, status: string, responseTxHash?: string, recipientAlias?: string): Promise<void> {
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };
    if (responseTxHash) updates.responseTxHash = responseTxHash;
    if (recipientAlias) updates.recipientAlias = recipientAlias;
    
    await db.update(schema.conversations)
      .set(updates)
      .where(eq(schema.conversations.id, id));
  }

  // Private messages
  async createPrivateMessage(message: {
    conversationId: string;
    senderAddress: string;
    senderPubkey?: string;
    encryptedContent: string;
    signature?: string;
    signedPayload?: string;
    txHash?: string;
    txStatus?: string;
  }): Promise<any> {
    const result = await db.insert(schema.privateMessages)
      .values({
        conversationId: message.conversationId,
        senderAddress: message.senderAddress,
        senderPubkey: message.senderPubkey || null,
        encryptedContent: message.encryptedContent,
        signature: message.signature || null,
        signedPayload: message.signedPayload || null,
        txHash: message.txHash || null,
        txStatus: message.txStatus || "pending",
      })
      .returning();
    
    // Update conversation's updatedAt
    await db.update(schema.conversations)
      .set({ updatedAt: new Date() })
      .where(eq(schema.conversations.id, message.conversationId));
    
    return result[0];
  }

  async getPrivateMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await db.select()
      .from(schema.privateMessages)
      .where(eq(schema.privateMessages.conversationId, conversationId))
      .orderBy(schema.privateMessages.createdAt)
      .limit(limit)
      .offset(offset);
    return result;
  }

  async getPendingConversations(): Promise<any[]> {
    const result = await db.select()
      .from(schema.conversations)
      .where(eq(schema.conversations.status, "pending"));
    return result;
  }

  async getAllConversations(): Promise<any[]> {
    const result = await db.select()
      .from(schema.conversations);
    return result;
  }

  async updateConversation(id: string, updates: Record<string, any>): Promise<void> {
    await db.update(schema.conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.conversations.id, id));
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(schema.conversations)
      .where(eq(schema.conversations.id, id));
  }
}
