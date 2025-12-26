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
  completedAt: z.date(),
  txHash: z.string().optional(),
  txStatus: z.enum(["none", "pending", "confirmed", "failed"]).default("none"),
});

export type QuizResult = z.infer<typeof quizResultSchema>;

export const courseRewardSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  userId: z.string(),
  walletAddress: z.string(),
  kasAmount: z.number(),
  averageScore: z.number(),
  status: z.enum(["pending", "claiming", "confirming", "claimed", "failed"]).default("pending"),
  txHash: z.string().optional(),
  txConfirmed: z.boolean().optional(),
  completedAt: z.date(),
  claimedAt: z.date().optional(),
});

export type CourseReward = z.infer<typeof courseRewardSchema>;

export const certificateSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  userId: z.string(),
  recipientAddress: z.string(),
  courseName: z.string(),
  kasReward: z.number(),
  score: z.number().optional(),
  issuedAt: z.date(),
  verificationCode: z.string(),
  ipfsHash: z.string().optional(),
  nftTxHash: z.string().optional(),
  imageUrl: z.string().optional(),
  nftStatus: z.enum(["pending", "minting", "claimed"]).default("pending"),
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

export const securityLogSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  ipAddress: z.string(),
  action: z.string(),
  flags: z.array(z.string()).default([]),
  vpnScore: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
});

export type SecurityLog = z.infer<typeof securityLogSchema>;
export const insertSecurityLogSchema = securityLogSchema.omit({ id: true, createdAt: true });
export type InsertSecurityLog = z.infer<typeof insertSecurityLogSchema>;

export const usedPaymentTxSchema = z.object({
  txHash: z.string(),
  walletAddress: z.string(),
  purpose: z.string(),
  amount: z.number().optional(),
  usedAt: z.date(),
});

export type UsedPaymentTx = z.infer<typeof usedPaymentTxSchema>;

export const antiSybilDataSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  firstSeen: z.date(),
  totalQuizzes: z.number().default(0),
  totalRewardsToday: z.number().default(0),
  todayDate: z.string(),
  trustScore: z.number().default(0.5),
  flags: z.array(z.string()).default([]),
  updatedAt: z.date(),
});

export type AntiSybilData = z.infer<typeof antiSybilDataSchema>;

export const quizAttemptSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  lessonId: z.string(),
  startedAt: z.date(),
  completedAt: z.date(),
  score: z.number(),
  passed: z.boolean(),
  flagged: z.boolean().default(false),
  flagReason: z.string().optional(),
});

export type QuizAttemptRecord = z.infer<typeof quizAttemptSchema>;

export const ipActivitySchema = z.object({
  id: z.string(),
  ipAddress: z.string(),
  firstSeen: z.date(),
  lastSeen: z.date(),
  wallets: z.array(z.string()).default([]),
  requestCount: z.number().default(0),
  flagged: z.boolean().default(false),
  flags: z.array(z.string()).default([]),
  isVpn: z.boolean().default(false),
  vpnScore: z.number().optional(),
  vpnCheckedAt: z.date().optional(),
});

export type IpActivity = z.infer<typeof ipActivitySchema>;

export const walletIpBindingSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  ips: z.array(z.string()).default([]),
  primaryIp: z.string().optional(),
  flagged: z.boolean().default(false),
});

export type WalletIpBinding = z.infer<typeof walletIpBindingSchema>;

// Pending mint reservations for non-custodial NFT minting
export const pendingMintReservationSchema = z.object({
  id: z.string(),
  certificateId: z.string(),
  recipientAddress: z.string(),
  tokenId: z.number(),
  p2shAddress: z.string(),
  scriptData: z.string(), // JSON-serialized script data
  mintData: z.string(), // JSON-serialized mint data
  commitTxHash: z.string().optional(), // User's commit transaction hash
  status: z.enum(["pending", "paid", "finalized", "expired", "failed"]).default("pending"),
  createdAt: z.date(),
  expiresAt: z.date(),
  finalizedAt: z.date().optional(),
});

export type PendingMintReservation = z.infer<typeof pendingMintReservationSchema>;
export const insertPendingMintReservationSchema = pendingMintReservationSchema.omit({ id: true, createdAt: true });
export type InsertPendingMintReservation = z.infer<typeof insertPendingMintReservationSchema>;

// Re-export Drizzle table definitions for database migrations
export * from "../server/db/schema";
