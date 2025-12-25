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
