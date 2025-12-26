import { pgTable, text, timestamp, boolean, real, integer, jsonb, uuid } from "drizzle-orm/pg-core";

export const securityLogs = pgTable("security_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull(),
  ipAddress: text("ip_address").notNull(),
  action: text("action").notNull(),
  flags: text("flags").array().default([]),
  vpnScore: real("vpn_score"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usedPaymentTxs = pgTable("used_payment_txs", {
  txHash: text("tx_hash").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  purpose: text("purpose").notNull(),
  amount: real("amount"),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const antiSybilData = pgTable("anti_sybil_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull().unique(),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  totalQuizzes: integer("total_quizzes").default(0).notNull(),
  totalRewardsToday: real("total_rewards_today").default(0).notNull(),
  todayDate: text("today_date").notNull(),
  trustScore: real("trust_score").default(0.5).notNull(),
  flags: text("flags").array().default([]),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull(),
  lessonId: text("lesson_id").notNull(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  flagged: boolean("flagged").default(false).notNull(),
  flagReason: text("flag_reason"),
});

export const ipActivity = pgTable("ip_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipAddress: text("ip_address").notNull().unique(),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  wallets: text("wallets").array().default([]),
  requestCount: integer("request_count").default(0).notNull(),
  flagged: boolean("flagged").default(false).notNull(),
  flags: text("flags").array().default([]),
  isVpn: boolean("is_vpn").default(false).notNull(),
  vpnScore: real("vpn_score"),
  vpnCheckedAt: timestamp("vpn_checked_at"),
});

export const walletIpBindings = pgTable("wallet_ip_bindings", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull().unique(),
  ips: text("ips").array().default([]),
  primaryIp: text("primary_ip"),
  flagged: boolean("flagged").default(false).notNull(),
});

// Pending mint reservations for non-custodial NFT minting
export const pendingMintReservations = pgTable("pending_mint_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  certificateId: text("certificate_id").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  tokenId: integer("token_id").notNull(),
  p2shAddress: text("p2sh_address").notNull().unique(),
  scriptData: text("script_data").notNull(), // JSON-serialized script data
  mintData: text("mint_data").notNull(), // JSON-serialized mint metadata
  commitTxHash: text("commit_tx_hash"), // User's commit transaction hash
  status: text("status").default("pending").notNull(), // pending, paid, finalized, expired, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  finalizedAt: timestamp("finalized_at"),
});

// ========= USER DATA TABLES (persistent across restarts) =========

// Users - wallet-based authentication
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  displayName: text("display_name"),
  totalKasEarned: real("total_kas_earned").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Quiz results - individual lesson quiz completions
export const quizResults = pgTable("quiz_results", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull(),
  userId: text("user_id").notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  txHash: text("tx_hash"),
  txStatus: text("tx_status").default("none").notNull(),
});

// Course rewards - pending/claimed KAS rewards for completed courses
export const courseRewards = pgTable("course_rewards", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  userId: text("user_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  kasAmount: real("kas_amount").notNull(),
  averageScore: real("average_score").notNull(),
  status: text("status").default("pending").notNull(), // pending, claiming, confirming, claimed, failed
  txHash: text("tx_hash"),
  txConfirmed: boolean("tx_confirmed"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
});

// Certificates - NFT certificates for course completion
export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  userId: text("user_id").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  courseName: text("course_name").notNull(),
  kasReward: real("kas_reward").notNull(),
  score: real("score"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  verificationCode: text("verification_code").notNull(),
  ipfsHash: text("ipfs_hash"),
  nftTxHash: text("nft_tx_hash"),
  imageUrl: text("image_url"),
  nftStatus: text("nft_status").default("pending").notNull(), // pending, minting, claimed
});

// User progress - tracks completion status within courses
export const userProgress = pgTable("user_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  courseId: text("course_id").notNull(),
  completedLessons: text("completed_lessons").array().default([]),
  currentLessonId: text("current_lesson_id"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Q&A posts - on-chain discussion forum
export const qaPosts = pgTable("qa_posts", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull(),
  authorAddress: text("author_address").notNull(),
  authorDisplayName: text("author_display_name"),
  content: text("content").notNull(),
  isQuestion: boolean("is_question").notNull(),
  parentId: text("parent_id"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Error logs - persistent error tracking for debugging
export const errorLogs = pgTable("error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(), // nft, payment, ipfs, security, general
  action: text("action").notNull(), // prepare, finalize, upload, etc.
  message: text("message").notNull(),
  details: jsonb("details"), // Additional context (certificateId, p2shAddress, etc.)
  walletAddress: text("wallet_address"),
  ipAddress: text("ip_address"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
