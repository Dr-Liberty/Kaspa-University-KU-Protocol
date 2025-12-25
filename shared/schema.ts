import { z } from "zod";

// User schema for learners on the platform
export const userSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  displayName: z.string().optional(),
  totalKasEarned: z.number().default(0),
  createdAt: z.date(),
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true }).partial({ totalKasEarned: true, displayName: true });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const courseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnail: z.string().optional(),
  lessonCount: z.number(),
  kasReward: z.number(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  category: z.string(),
});

export type Course = z.infer<typeof courseSchema>;

export const lessonSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  content: z.string(),
  order: z.number(),
  duration: z.string(),
});

export type Lesson = z.infer<typeof lessonSchema>;

export const quizQuestionSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number(),
  explanation: z.string().optional(),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizSubmissionSchema = z.object({
  lessonId: z.string(),
  answers: z.array(z.number()),
});

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

export const quizResultSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  userId: z.string(),
  score: z.number(),
  passed: z.boolean(),
  kasRewarded: z.number(),
  txHash: z.string().optional(),
  completedAt: z.date(),
});

export type QuizResult = z.infer<typeof quizResultSchema>;

export const certificateSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  userId: z.string(),
  recipientAddress: z.string(),
  courseName: z.string(),
  kasReward: z.number(),
  issuedAt: z.date(),
  verificationCode: z.string(),
  ipfsHash: z.string().optional(),
  nftTxHash: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type Certificate = z.infer<typeof certificateSchema>;

export const userProgressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  courseId: z.string(),
  completedLessons: z.array(z.string()),
  currentLessonId: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
});

export type UserProgress = z.infer<typeof userProgressSchema>;

export const qaPostSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  authorAddress: z.string(),
  authorDisplayName: z.string().optional(),
  content: z.string(),
  isQuestion: z.boolean(),
  parentId: z.string().optional(),
  txHash: z.string().optional(),
  createdAt: z.date(),
});

export type QAPost = z.infer<typeof qaPostSchema>;

export const insertQAPostSchema = qaPostSchema.omit({ id: true, createdAt: true }).partial({ txHash: true });
export type InsertQAPost = z.infer<typeof insertQAPostSchema>;

export const walletConnectionSchema = z.object({
  address: z.string(),
  connected: z.boolean(),
  network: z.enum(["mainnet", "testnet-10", "testnet-11"]),
});

export type WalletConnection = z.infer<typeof walletConnectionSchema>;

export const statsSchema = z.object({
  totalKasDistributed: z.number(),
  certificatesMinted: z.number(),
  activeLearners: z.number(),
  coursesAvailable: z.number(),
});

export type Stats = z.infer<typeof statsSchema>;
