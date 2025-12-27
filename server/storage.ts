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
import { courses as seedCourses, lessons as seedLessons, quizQuestions as seedQuizQuestions } from "./seed-data";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserKas(userId: string, amount: number): Promise<void>;

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
}

import { DbStorage } from "./db-storage";

export const storage: IStorage = process.env.DATABASE_URL 
  ? new DbStorage() 
  : new MemStorage();
