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
  OnChainQuizProof,
  InsertOnChainQuizProof,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { courses as seedCourses, lessons as seedLessons, quizQuestions as seedQuizQuestions } from "./seed-data";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserKas(userId: string, amount: number): Promise<void>;
  updateUserProfile(userId: string, updates: { displayName?: string; avatarUrl?: string }): Promise<User | undefined>;

  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;

  getLessonsByCourse(courseId: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;

  getQuizQuestionsByLesson(lessonId: string): Promise<QuizQuestion[]>;
  saveQuizResult(result: Omit<QuizResult, "id" | "completedAt">): Promise<QuizResult>;
  updateQuizResult(id: string, updates: Partial<QuizResult>): Promise<QuizResult | undefined>;
  getQuizResultsByUser(userId: string): Promise<QuizResult[]>;
  getQuizResultsForCourse(userId: string, courseId: string): Promise<QuizResult[]>;
  getQuizResult(id: string): Promise<QuizResult | undefined>;

  getCourseRewardsByUser(userId: string): Promise<CourseReward[]>;
  getCourseReward(id: string): Promise<CourseReward | undefined>;
  getCourseRewardForCourse(userId: string, courseId: string): Promise<CourseReward | undefined>;
  createCourseReward(reward: Omit<CourseReward, "id" | "completedAt">): Promise<CourseReward>;
  updateCourseReward(id: string, updates: Partial<CourseReward>): Promise<CourseReward | undefined>;
  getClaimableCourseRewards(userId: string): Promise<CourseReward[]>;
  getAllCourseRewards(): Promise<CourseReward[]>;
  checkCourseCompletion(userId: string, courseId: string): Promise<{completed: boolean; averageScore: number; lessonsCompleted: number; totalLessons: number}>;

  getCertificatesByUser(userId: string): Promise<Certificate[]>;
  getCertificate(id: string): Promise<Certificate | undefined>;
  createCertificate(cert: Omit<Certificate, "id">): Promise<Certificate>;
  updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined>;
  getCertificateCount(): Promise<number>;
  getAllCertificates(): Promise<Certificate[]>;

  getUserProgress(userId: string): Promise<UserProgress[]>;
  getOrCreateProgress(userId: string, courseId: string): Promise<UserProgress>;
  updateProgress(progressId: string, lessonId: string): Promise<UserProgress>;

  getQAPostsByLesson(lessonId: string): Promise<QAPost[]>;
  getQAPost(id: string): Promise<QAPost | undefined>;
  createQAPost(post: InsertQAPost): Promise<QAPost>;

  getStats(): Promise<Stats>;

  getRecentQuizResults(limit: number): Promise<QuizResult[]>;
  getRecentQAPosts(limit: number): Promise<QAPost[]>;
  
  getAllUsers(): Promise<User[]>;
  getTopLearners(limit: number): Promise<User[]>;
  getTotalQuizResults(): Promise<number>;
  getAverageScore(): Promise<number>;
  getCourseCompletionCounts(): Promise<Map<string, number>>;
  getAllQuizResults(): Promise<QuizResult[]>;
  resetUserData(userId: string): Promise<void>;

  // NFT Mint Reservation methods
  getCourseTokenCounter(courseId: string): Promise<CourseTokenCounter | undefined>;
  initializeCourseTokenCounter(courseId: string, courseIndex: number): Promise<CourseTokenCounter>;
  reserveTokenId(courseId: string): Promise<number | null>; // Returns tokenId or null if sold out
  
  createMintReservation(reservation: InsertMintReservation): Promise<MintReservation>;
  getMintReservation(id: string): Promise<MintReservation | undefined>;
  getMintReservationByTokenId(tokenId: number): Promise<MintReservation | undefined>;
  getMintReservationByCertificate(certificateId: string): Promise<MintReservation | undefined>;
  getActiveMintReservation(walletAddress: string, courseId: string): Promise<MintReservation | undefined>;
  updateMintReservation(id: string, updates: Partial<MintReservation>): Promise<MintReservation | undefined>;
  expireOldReservations(): Promise<number>; // Returns count of expired reservations
  getMintedTokenCount(courseId: string): Promise<number>;
  recycleTokenId(courseId: string, tokenId: number): Promise<void>; // Return tokenId to available pool
  cancelMintReservation(reservationId: string): Promise<{ success: boolean; reservation?: MintReservation }>; // Atomically cancel and recycle tokenId
  confirmMintReservation(reservationId: string, mintTxHash: string): Promise<{ success: boolean; reservation?: MintReservation; error?: string }>; // Atomically confirm mint and update certificate
  
  // Operational metrics
  getRecyclePoolDepth(courseId: string): Promise<number>;
  getAllCourseCounters(): Promise<CourseTokenCounter[]>;
  
  // On-chain quiz proof storage (fallback for pruned blockchain data)
  saveOnChainQuizProof(proof: InsertOnChainQuizProof): Promise<OnChainQuizProof>;
  getOnChainQuizProofs(limit?: number): Promise<OnChainQuizProof[]>;
  getOnChainQuizProofByTxHash(txHash: string): Promise<OnChainQuizProof | undefined>;
  
  // Whitelist methods for discounted minting
  setUserWhitelisted(userId: string, txHash: string): Promise<User | undefined>;
  isUserWhitelisted(userId: string): Promise<boolean>;
  
  // Course asset methods (pre-uploaded IPFS images)
  getCourseAsset(courseId: string): Promise<{ courseId: string; imageIpfsUrl: string; imageIpfsHash: string } | undefined>;
  saveCourseAsset(courseId: string, imageIpfsUrl: string, imageIpfsHash: string): Promise<void>;
  
  // K Protocol public comments
  createKPublicComment(comment: {
    lessonId: string;
    authorAddress: string;
    authorPubkey: string;
    content: string;
    signature: string;
    parentTxHash?: string;
    isReply?: boolean;
    txStatus?: string;
  }): Promise<{ id: string; lessonId: string; authorAddress: string; content: string; createdAt: Date }>;
  getKPublicComments(lessonId: string, limit?: number, offset?: number): Promise<any[]>;
  updateKPublicCommentTx(commentId: string, txHash: string, txStatus: string): Promise<void>;
  
  // Kasia encrypted conversations
  createConversation(conversation: {
    id: string;
    initiatorAddress: string;
    recipientAddress: string;
    status: string;
    handshakeTxHash?: string;
    initiatorAlias?: string;
    isAdminConversation?: boolean;
  }): Promise<any>;
  getConversation(id: string): Promise<any | undefined>;
  getConversationsForWallet(walletAddress: string): Promise<any[]>;
  updateConversationStatus(id: string, status: string, responseTxHash?: string, recipientAlias?: string): Promise<void>;
  
  // Private messages
  createPrivateMessage(message: {
    conversationId: string;
    senderAddress: string;
    senderPubkey?: string;
    encryptedContent: string;
    signature?: string;
    signedPayload?: string;
    txHash?: string;
    txStatus?: string;
  }): Promise<any>;
  getPrivateMessages(conversationId: string, limit?: number, offset?: number): Promise<any[]>;
  getPendingConversations(): Promise<any[]>;
  getAllConversations(): Promise<any[]>;
  updateConversation(id: string, updates: Record<string, any>): Promise<void>;
  updateConversationE2eKey(id: string, field: "e2eInitiatorSig" | "e2eRecipientSig", signature: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private courses: Map<string, Course> = new Map();
  private lessons: Map<string, Lesson> = new Map();
  private quizQuestions: Map<string, QuizQuestion> = new Map();
  private quizResults: Map<string, QuizResult> = new Map();
  private courseRewards: Map<string, CourseReward> = new Map();
  private certificates: Map<string, Certificate> = new Map();
  private userProgress: Map<string, UserProgress> = new Map();
  private qaPosts: Map<string, QAPost> = new Map();
  private courseTokenCounters: Map<string, CourseTokenCounter> = new Map();
  private mintReservations: Map<string, MintReservation> = new Map();
  private onChainQuizProofs: Map<string, OnChainQuizProof> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Load BMT University peer-reviewed courses (16 courses, 69 lessons)
    seedCourses.forEach((c) => this.courses.set(c.id, c));
    seedLessons.forEach((l) => this.lessons.set(l.id, l));
    seedQuizQuestions.forEach((q) => this.quizQuestions.set(q.id, q));
  }


  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(address: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.walletAddress === address);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      walletAddress: insertUser.walletAddress,
      displayName: insertUser.displayName,
      totalKasEarned: 0,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserKas(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.totalKasEarned += amount;
    }
  }

  async updateUserProfile(userId: string, updates: { displayName?: string; avatarUrl?: string }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (user) {
      if (updates.displayName !== undefined) {
        user.displayName = updates.displayName;
      }
      if (updates.avatarUrl !== undefined) {
        user.avatarUrl = updates.avatarUrl;
      }
      return user;
    }
    return undefined;
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
    return Array.from(this.quizQuestions.values())
      .filter((q) => q.lessonId === lessonId)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async saveQuizResult(result: Omit<QuizResult, "id" | "completedAt">): Promise<QuizResult> {
    const id = randomUUID();
    const quizResult: QuizResult = { 
      ...result, 
      id, 
      completedAt: new Date(),
      txStatus: result.txStatus || "none",
    };
    this.quizResults.set(id, quizResult);
    return quizResult;
  }
  
  async updateQuizResult(id: string, updates: Partial<QuizResult>): Promise<QuizResult | undefined> {
    const existing = this.quizResults.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.quizResults.set(id, updated);
    return updated;
  }

  async getQuizResultsByUser(userId: string): Promise<QuizResult[]> {
    return Array.from(this.quizResults.values()).filter((r) => r.userId === userId);
  }

  async getQuizResult(id: string): Promise<QuizResult | undefined> {
    return this.quizResults.get(id);
  }

  async getQuizResultsForCourse(userId: string, courseId: string): Promise<QuizResult[]> {
    const lessons = await this.getLessonsByCourse(courseId);
    const lessonIds = new Set(lessons.map(l => l.id));
    return Array.from(this.quizResults.values())
      .filter((r) => r.userId === userId && lessonIds.has(r.lessonId))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getCourseRewardsByUser(userId: string): Promise<CourseReward[]> {
    return Array.from(this.courseRewards.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getCourseReward(id: string): Promise<CourseReward | undefined> {
    return this.courseRewards.get(id);
  }

  async getCourseRewardForCourse(userId: string, courseId: string): Promise<CourseReward | undefined> {
    return Array.from(this.courseRewards.values())
      .find((r) => r.userId === userId && r.courseId === courseId);
  }

  async createCourseReward(reward: Omit<CourseReward, "id" | "completedAt">): Promise<CourseReward> {
    const id = randomUUID();
    const courseReward: CourseReward = { ...reward, id, completedAt: new Date() };
    this.courseRewards.set(id, courseReward);
    return courseReward;
  }

  async updateCourseReward(id: string, updates: Partial<CourseReward>): Promise<CourseReward | undefined> {
    const reward = this.courseRewards.get(id);
    if (!reward) return undefined;
    const updated = { ...reward, ...updates };
    this.courseRewards.set(id, updated);
    return updated;
  }

  async getClaimableCourseRewards(userId: string): Promise<CourseReward[]> {
    return Array.from(this.courseRewards.values())
      .filter((r) => r.userId === userId && ["pending", "failed", "confirming"].includes(r.status))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getAllCourseRewards(): Promise<CourseReward[]> {
    return Array.from(this.courseRewards.values())
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
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
    return Array.from(this.certificates.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    return this.certificates.get(id);
  }

  async createCertificate(cert: Omit<Certificate, "id">): Promise<Certificate> {
    const id = randomUUID();
    const certificate: Certificate = { ...cert, id };
    this.certificates.set(id, certificate);
    return certificate;
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined> {
    const certificate = this.certificates.get(id);
    if (!certificate) return undefined;
    const updated = { ...certificate, ...updates };
    this.certificates.set(id, updated);
    return updated;
  }

  async getCertificateCount(): Promise<number> {
    return this.certificates.size;
  }

  async getAllCertificates(): Promise<Certificate[]> {
    return Array.from(this.certificates.values());
  }

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter((p) => p.userId === userId);
  }

  async getOrCreateProgress(userId: string, courseId: string): Promise<UserProgress> {
    const existing = Array.from(this.userProgress.values()).find(
      (p) => p.userId === userId && p.courseId === courseId
    );
    if (existing) return existing;

    const id = randomUUID();
    const progress: UserProgress = {
      id,
      userId,
      courseId,
      completedLessons: [],
      startedAt: new Date(),
    };
    this.userProgress.set(id, progress);
    return progress;
  }

  async updateProgress(progressId: string, lessonId: string): Promise<UserProgress> {
    const progress = this.userProgress.get(progressId);
    if (!progress) throw new Error("Progress not found");

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }
    progress.currentLessonId = lessonId;
    return progress;
  }

  async getQAPostsByLesson(lessonId: string): Promise<QAPost[]> {
    return Array.from(this.qaPosts.values())
      .filter((p) => p.lessonId === lessonId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getQAPost(id: string): Promise<QAPost | undefined> {
    return this.qaPosts.get(id);
  }

  async createQAPost(post: InsertQAPost): Promise<QAPost> {
    const id = randomUUID();
    const qaPost: QAPost = {
      ...post,
      id,
      createdAt: new Date(),
      txHash: post.txHash, // Use provided txHash (may be undefined if not posted on-chain)
    };
    this.qaPosts.set(id, qaPost);
    return qaPost;
  }

  async getStats(): Promise<Stats> {
    const totalKas = Array.from(this.users.values()).reduce((sum, u) => sum + u.totalKasEarned, 0);
    return {
      totalKasDistributed: totalKas,
      certificatesMinted: this.certificates.size,
      activeLearners: this.users.size,
      coursesAvailable: this.courses.size,
    };
  }

  async getRecentQuizResults(limit: number): Promise<QuizResult[]> {
    const results = Array.from(this.quizResults.values());
    return results
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, limit);
  }

  async getRecentQAPosts(limit: number): Promise<QAPost[]> {
    const posts = Array.from(this.qaPosts.values());
    return posts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getTopLearners(limit: number): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.totalKasEarned - a.totalKasEarned)
      .slice(0, limit);
  }

  async getTotalQuizResults(): Promise<number> {
    return this.quizResults.size;
  }

  async getAverageScore(): Promise<number> {
    const results = Array.from(this.quizResults.values());
    if (results.length === 0) return 0;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    return Math.round(totalScore / results.length);
  }

  async getCourseCompletionCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const certificates = Array.from(this.certificates.values());
    for (const cert of certificates) {
      const current = counts.get(cert.courseId) || 0;
      counts.set(cert.courseId, current + 1);
    }
    return counts;
  }

  async getAllQuizResults(): Promise<QuizResult[]> {
    return Array.from(this.quizResults.values());
  }

  async resetUserData(userId: string): Promise<void> {
    // Delete quiz results for this user
    for (const [id, result] of Array.from(this.quizResults.entries())) {
      if (result.userId === userId) {
        this.quizResults.delete(id);
      }
    }
    // Delete course rewards for this user
    for (const [id, reward] of Array.from(this.courseRewards.entries())) {
      if (reward.userId === userId) {
        this.courseRewards.delete(id);
      }
    }
    // Delete certificates for this user
    for (const [id, cert] of Array.from(this.certificates.entries())) {
      if (cert.userId === userId) {
        this.certificates.delete(id);
      }
    }
    // Delete progress for this user
    for (const [id, progress] of Array.from(this.userProgress.entries())) {
      if (progress.userId === userId) {
        this.userProgress.delete(id);
      }
    }
    console.log(`[Storage] Reset all data for user ${userId}`);
  }

  // NFT Mint Reservation methods with tokenId recycling
  private availableTokenPool: Map<string, number[]> = new Map(); // courseId -> recycled tokenIds
  private readonly MAX_TOKENS_PER_COURSE = 1000;

  async getCourseTokenCounter(courseId: string): Promise<CourseTokenCounter | undefined> {
    return this.courseTokenCounters.get(courseId);
  }

  async initializeCourseTokenCounter(courseId: string, courseIndex: number): Promise<CourseTokenCounter> {
    const existing = this.courseTokenCounters.get(courseId);
    if (existing) return existing;
    
    const counter: CourseTokenCounter = {
      courseId,
      courseIndex,
      nextTokenOffset: 0,
      totalMinted: 0,
    };
    this.courseTokenCounters.set(courseId, counter);
    return counter;
  }

  async reserveTokenId(courseId: string): Promise<number | null> {
    const counter = this.courseTokenCounters.get(courseId);
    if (!counter) return null;
    
    // First check if there are recycled tokenIds available
    const recycledPool = this.availableTokenPool.get(courseId) || [];
    if (recycledPool.length > 0) {
      const recycledTokenId = recycledPool.shift()!;
      this.availableTokenPool.set(courseId, recycledPool);
      return recycledTokenId;
    }
    
    // Check if counter has reached max for this course (0-999 offsets = 1000 tokens)
    // If at max and no recycled tokens available, we're sold out
    if (counter.nextTokenOffset >= this.MAX_TOKENS_PER_COURSE) {
      return null; // Counter exhausted and no recycled tokens
    }
    
    // Calculate next tokenId: courseIndex * 1000 + offset + 1
    // Course 0: 1-1000, Course 1: 1001-2000, etc.
    const tokenId = (counter.courseIndex * this.MAX_TOKENS_PER_COURSE) + counter.nextTokenOffset + 1;
    
    // Increment counter
    counter.nextTokenOffset++;
    this.courseTokenCounters.set(courseId, counter);
    
    return tokenId;
  }

  async createMintReservation(reservation: InsertMintReservation): Promise<MintReservation> {
    const id = randomUUID();
    const mintReservation: MintReservation = {
      ...reservation,
      id,
      createdAt: new Date(),
    };
    this.mintReservations.set(id, mintReservation);
    return mintReservation;
  }

  async getMintReservation(id: string): Promise<MintReservation | undefined> {
    return this.mintReservations.get(id);
  }

  async getMintReservationByTokenId(tokenId: number): Promise<MintReservation | undefined> {
    return Array.from(this.mintReservations.values())
      .find(r => r.tokenId === tokenId);
  }

  async getMintReservationByCertificate(certificateId: string): Promise<MintReservation | undefined> {
    return Array.from(this.mintReservations.values())
      .find(r => r.certificateId === certificateId);
  }

  async getActiveMintReservation(walletAddress: string, courseId: string): Promise<MintReservation | undefined> {
    return Array.from(this.mintReservations.values())
      .find(r => r.walletAddress === walletAddress && 
                 r.courseId === courseId &&
                 (r.status === "reserved" || r.status === "signing") &&
                 r.expiresAt > new Date());
  }

  async updateMintReservation(id: string, updates: Partial<MintReservation>): Promise<MintReservation | undefined> {
    const reservation = this.mintReservations.get(id);
    if (!reservation) return undefined;
    const updated = { ...reservation, ...updates };
    this.mintReservations.set(id, updated);
    return updated;
  }

  async expireOldReservations(): Promise<number> {
    const now = new Date();
    let expiredCount = 0;
    
    for (const [id, reservation] of Array.from(this.mintReservations.entries())) {
      if ((reservation.status === "reserved" || reservation.status === "signing") &&
          reservation.expiresAt <= now) {
        // Recycle the tokenId back to the available pool
        const pool = this.availableTokenPool.get(reservation.courseId) || [];
        pool.push(reservation.tokenId);
        this.availableTokenPool.set(reservation.courseId, pool);
        
        reservation.status = "expired";
        this.mintReservations.set(id, reservation);
        expiredCount++;
      }
    }
    
    return expiredCount;
  }

  async getMintedTokenCount(courseId: string): Promise<number> {
    return Array.from(this.mintReservations.values())
      .filter(r => r.courseId === courseId && r.status === "minted").length;
  }

  async recycleTokenId(courseId: string, tokenId: number): Promise<void> {
    const pool = this.availableTokenPool.get(courseId) || [];
    // Only add if not already in pool
    if (!pool.includes(tokenId)) {
      pool.push(tokenId);
      this.availableTokenPool.set(courseId, pool);
    }
  }

  async cancelMintReservation(reservationId: string): Promise<{ success: boolean; reservation?: MintReservation }> {
    const reservation = this.mintReservations.get(reservationId);
    if (!reservation) return { success: false };
    
    // Don't cancel already minted reservations
    if (reservation.status === "minted") return { success: false };
    
    // Update status and recycle tokenId atomically (in-memory is inherently atomic)
    const updated: MintReservation = { ...reservation, status: "cancelled" };
    this.mintReservations.set(reservationId, updated);
    
    // Recycle the tokenId
    const pool = this.availableTokenPool.get(reservation.courseId) || [];
    if (!pool.includes(reservation.tokenId)) {
      pool.push(reservation.tokenId);
      this.availableTokenPool.set(reservation.courseId, pool);
    }
    
    return { success: true, reservation: updated };
  }

  async confirmMintReservation(reservationId: string, mintTxHash: string): Promise<{ success: boolean; reservation?: MintReservation; error?: string }> {
    const reservation = this.mintReservations.get(reservationId);
    if (!reservation) return { success: false, error: "Reservation not found" };
    
    if (reservation.status === "minted") {
      return { success: true, reservation };
    }
    
    if (reservation.status === "expired" || reservation.status === "cancelled") {
      return { success: false, error: `Reservation is ${reservation.status}` };
    }
    
    if (reservation.expiresAt <= new Date() && reservation.status !== "signing") {
      const expired: MintReservation = { ...reservation, status: "expired" };
      this.mintReservations.set(reservationId, expired);
      return { success: false, error: "Reservation has expired" };
    }
    
    // Atomically update reservation and certificate (in-memory is inherently atomic)
    const updatedReservation: MintReservation = {
      ...reservation,
      status: "minted",
      mintTxHash,
      mintedAt: new Date(),
    };
    this.mintReservations.set(reservationId, updatedReservation);
    
    // Update certificate
    const certificate = this.certificates.get(reservation.certificateId);
    if (certificate) {
      this.certificates.set(reservation.certificateId, {
        ...certificate,
        nftTxHash: mintTxHash,
        nftStatus: "claimed",
      });
    }
    
    return { success: true, reservation: updatedReservation };
  }

  async getRecyclePoolDepth(courseId: string): Promise<number> {
    const pool = this.availableTokenPool.get(courseId) || [];
    return pool.length;
  }

  async getAllCourseCounters(): Promise<CourseTokenCounter[]> {
    return Array.from(this.courseTokenCounters.values());
  }

  // On-chain quiz proof storage (fallback for pruned blockchain data)
  async saveOnChainQuizProof(proof: InsertOnChainQuizProof): Promise<OnChainQuizProof> {
    // Check if already exists by txHash
    const existing = Array.from(this.onChainQuizProofs.values())
      .find(p => p.txHash === proof.txHash);
    if (existing) return existing;
    
    const newProof: OnChainQuizProof = {
      id: randomUUID(),
      ...proof,
      syncedAt: new Date(),
    };
    this.onChainQuizProofs.set(newProof.id, newProof);
    return newProof;
  }

  async getOnChainQuizProofs(limit: number = 500): Promise<OnChainQuizProof[]> {
    return Array.from(this.onChainQuizProofs.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getOnChainQuizProofByTxHash(txHash: string): Promise<OnChainQuizProof | undefined> {
    return Array.from(this.onChainQuizProofs.values())
      .find(p => p.txHash === txHash);
  }

  async setUserWhitelisted(userId: string, txHash: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      whitelistedAt: new Date(),
      whitelistTxHash: txHash,
    };
    this.users.set(userId, updated);
    return updated;
  }

  async isUserWhitelisted(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    return user?.whitelistedAt !== undefined;
  }

  // Course assets (in-memory implementation)
  private courseAssets: Map<string, { courseId: string; imageIpfsUrl: string; imageIpfsHash: string }> = new Map();

  async getCourseAsset(courseId: string): Promise<{ courseId: string; imageIpfsUrl: string; imageIpfsHash: string } | undefined> {
    return this.courseAssets.get(courseId);
  }

  async saveCourseAsset(courseId: string, imageIpfsUrl: string, imageIpfsHash: string): Promise<void> {
    this.courseAssets.set(courseId, { courseId, imageIpfsUrl, imageIpfsHash });
  }

  // K Protocol public comments (in-memory)
  private kPublicComments: Map<string, any> = new Map();

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
    const id = randomUUID();
    const newComment = {
      id,
      ...comment,
      votes: 0,
      createdAt: new Date(),
    };
    this.kPublicComments.set(id, newComment);
    return newComment;
  }

  async getKPublicComments(lessonId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    return Array.from(this.kPublicComments.values())
      .filter(c => c.lessonId === lessonId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async updateKPublicCommentTx(commentId: string, txHash: string, txStatus: string): Promise<void> {
    const comment = this.kPublicComments.get(commentId);
    if (comment) {
      this.kPublicComments.set(commentId, { ...comment, txHash, txStatus });
    }
  }

  // Kasia encrypted conversations (in-memory)
  private conversations: Map<string, any> = new Map();

  async createConversation(conversation: {
    id: string;
    initiatorAddress: string;
    recipientAddress: string;
    status: string;
    handshakeTxHash?: string;
    initiatorAlias?: string;
    isAdminConversation?: boolean;
  }): Promise<any> {
    const now = new Date();
    const newConversation = {
      ...conversation,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conversation.id, newConversation);
    return newConversation;
  }

  async getConversation(id: string): Promise<any | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsForWallet(walletAddress: string): Promise<any[]> {
    return Array.from(this.conversations.values())
      .filter(c => c.initiatorAddress === walletAddress || c.recipientAddress === walletAddress)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateConversationStatus(id: string, status: string, responseTxHash?: string, recipientAlias?: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      this.conversations.set(id, {
        ...conversation,
        status,
        responseTxHash: responseTxHash || conversation.responseTxHash,
        recipientAlias: recipientAlias || conversation.recipientAlias,
        updatedAt: new Date(),
      });
    }
  }

  // Private messages (in-memory)
  private privateMessages: Map<string, any> = new Map();

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
    const id = randomUUID();
    const newMessage = {
      id,
      ...message,
      createdAt: new Date(),
    };
    this.privateMessages.set(id, newMessage);
    
    // Update conversation's updatedAt
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      this.conversations.set(message.conversationId, {
        ...conversation,
        updatedAt: new Date(),
      });
    }
    
    return newMessage;
  }

  async getPrivateMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    return Array.from(this.privateMessages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async getPendingConversations(): Promise<any[]> {
    return Array.from(this.conversations.values())
      .filter(c => c.status === "pending");
  }

  async getAllConversations(): Promise<any[]> {
    return Array.from(this.conversations.values());
  }

  async updateConversation(id: string, updates: Record<string, any>): Promise<void> {
    const conv = this.conversations.get(id);
    if (conv) {
      Object.assign(conv, updates, { updatedAt: new Date() });
      this.conversations.set(id, conv);
    }
  }

  async updateConversationE2eKey(id: string, field: "e2eInitiatorSig" | "e2eRecipientSig", signature: string): Promise<void> {
    const conv = this.conversations.get(id);
    if (conv) {
      (conv as any)[field] = signature;
      conv.updatedAt = new Date();
      this.conversations.set(id, conv);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
  }
}

import { DbStorage } from "./db-storage";

// Log which storage is being used at startup
const useDatabase = !!process.env.DATABASE_URL;
console.log(`[Storage] DATABASE_URL ${useDatabase ? 'is set' : 'NOT SET'} - using ${useDatabase ? 'DbStorage (PostgreSQL)' : 'MemStorage (in-memory)'}`);

export const storage: IStorage = useDatabase 
  ? new DbStorage() 
  : new MemStorage();
