/**
 * Security Storage Service for Kaspa University
 * 
 * Provides persistent storage for security data using PostgreSQL.
 * Falls back to in-memory storage if database is unavailable.
 */

import { randomUUID } from "crypto";
import type {
  SecurityLog,
  InsertSecurityLog,
  UsedPaymentTx,
  AntiSybilData,
  QuizAttemptRecord,
  IpActivity,
  WalletIpBinding,
} from "@shared/schema";

interface SecurityStorageInterface {
  logSecurityEvent(log: InsertSecurityLog): Promise<SecurityLog>;
  
  isPaymentTxUsed(txHash: string): Promise<boolean>;
  markPaymentTxUsed(txHash: string, walletAddress: string, purpose: string, amount?: number): Promise<void>;
  
  getAntiSybilData(walletAddress: string): Promise<AntiSybilData | undefined>;
  upsertAntiSybilData(data: Partial<AntiSybilData> & { walletAddress: string }): Promise<AntiSybilData>;
  
  getQuizAttempts(walletAddress: string, lessonId: string): Promise<QuizAttemptRecord[]>;
  recordQuizAttempt(attempt: Omit<QuizAttemptRecord, "id">): Promise<QuizAttemptRecord>;
  
  getIpActivity(ipAddress: string): Promise<IpActivity | undefined>;
  upsertIpActivity(data: Partial<IpActivity> & { ipAddress: string }): Promise<IpActivity>;
  
  getWalletIpBinding(walletAddress: string): Promise<WalletIpBinding | undefined>;
  upsertWalletIpBinding(data: Partial<WalletIpBinding> & { walletAddress: string }): Promise<WalletIpBinding>;
}

class MemorySecurityStorage implements SecurityStorageInterface {
  private securityLogs: Map<string, SecurityLog> = new Map();
  private usedPaymentTxs: Map<string, UsedPaymentTx> = new Map();
  private antiSybilData: Map<string, AntiSybilData> = new Map();
  private quizAttempts: Map<string, QuizAttemptRecord[]> = new Map();
  private ipActivity: Map<string, IpActivity> = new Map();
  private walletIpBindings: Map<string, WalletIpBinding> = new Map();

  async logSecurityEvent(log: InsertSecurityLog): Promise<SecurityLog> {
    const id = randomUUID();
    const securityLog: SecurityLog = {
      id,
      ...log,
      createdAt: new Date(),
    };
    this.securityLogs.set(id, securityLog);
    return securityLog;
  }

  async isPaymentTxUsed(txHash: string): Promise<boolean> {
    return this.usedPaymentTxs.has(txHash.toLowerCase());
  }

  async markPaymentTxUsed(txHash: string, walletAddress: string, purpose: string, amount?: number): Promise<void> {
    const tx: UsedPaymentTx = {
      txHash: txHash.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
      purpose,
      amount,
      usedAt: new Date(),
    };
    this.usedPaymentTxs.set(txHash.toLowerCase(), tx);
  }

  async getAntiSybilData(walletAddress: string): Promise<AntiSybilData | undefined> {
    return this.antiSybilData.get(walletAddress.toLowerCase());
  }

  async upsertAntiSybilData(data: Partial<AntiSybilData> & { walletAddress: string }): Promise<AntiSybilData> {
    const normalized = data.walletAddress.toLowerCase();
    const existing = this.antiSybilData.get(normalized);
    
    const todayDate = new Date().toISOString().split("T")[0];
    
    const updated: AntiSybilData = {
      id: existing?.id || randomUUID(),
      walletAddress: normalized,
      firstSeen: existing?.firstSeen || new Date(),
      totalQuizzes: data.totalQuizzes ?? existing?.totalQuizzes ?? 0,
      totalRewardsToday: existing?.todayDate === todayDate 
        ? (data.totalRewardsToday ?? existing?.totalRewardsToday ?? 0)
        : (data.totalRewardsToday ?? 0),
      todayDate: todayDate,
      trustScore: data.trustScore ?? existing?.trustScore ?? 0.5,
      flags: data.flags ?? existing?.flags ?? [],
      updatedAt: new Date(),
    };
    
    this.antiSybilData.set(normalized, updated);
    return updated;
  }

  async getQuizAttempts(walletAddress: string, lessonId: string): Promise<QuizAttemptRecord[]> {
    const normalizedWallet = walletAddress.toLowerCase();
    
    if (!lessonId || lessonId === "") {
      const allAttempts: QuizAttemptRecord[] = [];
      for (const [key, attempts] of Array.from(this.quizAttempts.entries())) {
        if (key.startsWith(`${normalizedWallet}:`)) {
          allAttempts.push(...attempts);
        }
      }
      return allAttempts;
    }
    
    const key = `${normalizedWallet}:${lessonId}`;
    return this.quizAttempts.get(key) || [];
  }

  async recordQuizAttempt(attempt: Omit<QuizAttemptRecord, "id">): Promise<QuizAttemptRecord> {
    const key = `${attempt.walletAddress.toLowerCase()}:${attempt.lessonId}`;
    const record: QuizAttemptRecord = {
      id: randomUUID(),
      ...attempt,
      walletAddress: attempt.walletAddress.toLowerCase(),
    };
    
    const existing = this.quizAttempts.get(key) || [];
    existing.push(record);
    this.quizAttempts.set(key, existing);
    
    return record;
  }

  async getIpActivity(ipAddress: string): Promise<IpActivity | undefined> {
    return this.ipActivity.get(ipAddress);
  }

  async upsertIpActivity(data: Partial<IpActivity> & { ipAddress: string }): Promise<IpActivity> {
    const existing = this.ipActivity.get(data.ipAddress);
    
    const updated: IpActivity = {
      id: existing?.id || randomUUID(),
      ipAddress: data.ipAddress,
      firstSeen: existing?.firstSeen || new Date(),
      lastSeen: new Date(),
      wallets: data.wallets ?? existing?.wallets ?? [],
      requestCount: data.requestCount ?? (existing?.requestCount ?? 0) + 1,
      flagged: data.flagged ?? existing?.flagged ?? false,
      flags: data.flags ?? existing?.flags ?? [],
      isVpn: data.isVpn ?? existing?.isVpn ?? false,
      vpnScore: data.vpnScore ?? existing?.vpnScore,
      vpnCheckedAt: data.vpnCheckedAt ?? existing?.vpnCheckedAt,
    };
    
    this.ipActivity.set(data.ipAddress, updated);
    return updated;
  }

  async getWalletIpBinding(walletAddress: string): Promise<WalletIpBinding | undefined> {
    return this.walletIpBindings.get(walletAddress.toLowerCase());
  }

  async upsertWalletIpBinding(data: Partial<WalletIpBinding> & { walletAddress: string }): Promise<WalletIpBinding> {
    const normalized = data.walletAddress.toLowerCase();
    const existing = this.walletIpBindings.get(normalized);
    
    const updated: WalletIpBinding = {
      id: existing?.id || randomUUID(),
      walletAddress: normalized,
      ips: data.ips ?? existing?.ips ?? [],
      primaryIp: data.primaryIp ?? existing?.primaryIp,
      flagged: data.flagged ?? existing?.flagged ?? false,
    };
    
    this.walletIpBindings.set(normalized, updated);
    return updated;
  }
}

class DatabaseSecurityStorage implements SecurityStorageInterface {
  private db: any;
  private schema: any;
  private initialized: boolean = false;
  private fallback: MemorySecurityStorage;

  constructor() {
    this.fallback = new MemorySecurityStorage();
  }

  async initialize(): Promise<boolean> {
    try {
      const dbModule = await import("./db/index.js");
      this.db = dbModule.db;
      this.schema = dbModule.schema;
      
      console.log("[SecurityStorage] Database connection established");
      this.initialized = true;
      return true;
    } catch (error: any) {
      console.error("[SecurityStorage] Database init failed, using in-memory fallback:", error.message);
      return false;
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.initialized;
  }

  async logSecurityEvent(log: InsertSecurityLog): Promise<SecurityLog> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.logSecurityEvent(log);
    }

    try {
      const { eq } = await import("drizzle-orm");
      const [result] = await this.db.insert(this.schema.securityLogs).values({
        walletAddress: log.walletAddress.toLowerCase(),
        ipAddress: log.ipAddress,
        action: log.action,
        flags: log.flags || [],
        vpnScore: log.vpnScore,
        metadata: log.metadata,
      }).returning();

      return {
        id: result.id,
        walletAddress: result.walletAddress,
        ipAddress: result.ipAddress,
        action: result.action,
        flags: result.flags || [],
        vpnScore: result.vpnScore,
        metadata: result.metadata,
        createdAt: result.createdAt,
      };
    } catch (error: any) {
      console.error("[SecurityStorage] Log event failed:", error.message);
      return this.fallback.logSecurityEvent(log);
    }
  }

  async isPaymentTxUsed(txHash: string): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.isPaymentTxUsed(txHash);
    }

    try {
      const { eq } = await import("drizzle-orm");
      const result = await this.db.select()
        .from(this.schema.usedPaymentTxs)
        .where(eq(this.schema.usedPaymentTxs.txHash, txHash.toLowerCase()))
        .limit(1);
      
      return result.length > 0;
    } catch (error: any) {
      console.error("[SecurityStorage] Check payment tx failed:", error.message);
      return this.fallback.isPaymentTxUsed(txHash);
    }
  }

  async markPaymentTxUsed(txHash: string, walletAddress: string, purpose: string, amount?: number): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.markPaymentTxUsed(txHash, walletAddress, purpose, amount);
    }

    try {
      await this.db.insert(this.schema.usedPaymentTxs).values({
        txHash: txHash.toLowerCase(),
        walletAddress: walletAddress.toLowerCase(),
        purpose,
        amount,
      }).onConflictDoNothing();
    } catch (error: any) {
      console.error("[SecurityStorage] Mark payment tx failed:", error.message);
      await this.fallback.markPaymentTxUsed(txHash, walletAddress, purpose, amount);
    }
  }

  async getAntiSybilData(walletAddress: string): Promise<AntiSybilData | undefined> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.getAntiSybilData(walletAddress);
    }

    try {
      const { eq } = await import("drizzle-orm");
      const result = await this.db.select()
        .from(this.schema.antiSybilData)
        .where(eq(this.schema.antiSybilData.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      
      if (result.length === 0) return undefined;
      
      const row = result[0];
      return {
        id: row.id,
        walletAddress: row.walletAddress,
        firstSeen: row.firstSeen,
        totalQuizzes: row.totalQuizzes,
        totalRewardsToday: row.totalRewardsToday,
        todayDate: row.todayDate,
        trustScore: row.trustScore,
        flags: row.flags || [],
        updatedAt: row.updatedAt,
      };
    } catch (error: any) {
      console.error("[SecurityStorage] Get anti-sybil data failed:", error.message);
      return this.fallback.getAntiSybilData(walletAddress);
    }
  }

  async upsertAntiSybilData(data: Partial<AntiSybilData> & { walletAddress: string }): Promise<AntiSybilData> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.upsertAntiSybilData(data);
    }

    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const normalized = data.walletAddress.toLowerCase();
      
      const existing = await this.getAntiSybilData(normalized);
      
      const values = {
        walletAddress: normalized,
        firstSeen: existing?.firstSeen || new Date(),
        totalQuizzes: data.totalQuizzes ?? existing?.totalQuizzes ?? 0,
        totalRewardsToday: existing?.todayDate === todayDate 
          ? (data.totalRewardsToday ?? existing?.totalRewardsToday ?? 0)
          : (data.totalRewardsToday ?? 0),
        todayDate: todayDate,
        trustScore: data.trustScore ?? existing?.trustScore ?? 0.5,
        flags: data.flags ?? existing?.flags ?? [],
        updatedAt: new Date(),
      };

      if (existing) {
        const { eq } = await import("drizzle-orm");
        await this.db.update(this.schema.antiSybilData)
          .set(values)
          .where(eq(this.schema.antiSybilData.walletAddress, normalized));
        
        return { id: existing.id, ...values };
      } else {
        const [result] = await this.db.insert(this.schema.antiSybilData)
          .values(values)
          .returning();
        
        return {
          id: result.id,
          walletAddress: result.walletAddress,
          firstSeen: result.firstSeen,
          totalQuizzes: result.totalQuizzes,
          totalRewardsToday: result.totalRewardsToday,
          todayDate: result.todayDate,
          trustScore: result.trustScore,
          flags: result.flags || [],
          updatedAt: result.updatedAt,
        };
      }
    } catch (error: any) {
      console.error("[SecurityStorage] Upsert anti-sybil data failed:", error.message);
      return this.fallback.upsertAntiSybilData(data);
    }
  }

  async getQuizAttempts(walletAddress: string, lessonId: string): Promise<QuizAttemptRecord[]> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.getQuizAttempts(walletAddress, lessonId);
    }

    try {
      const { eq, and } = await import("drizzle-orm");
      const normalizedWallet = walletAddress.toLowerCase();
      
      let results;
      if (!lessonId || lessonId === "") {
        results = await this.db.select()
          .from(this.schema.quizAttempts)
          .where(eq(this.schema.quizAttempts.walletAddress, normalizedWallet));
      } else {
        results = await this.db.select()
          .from(this.schema.quizAttempts)
          .where(and(
            eq(this.schema.quizAttempts.walletAddress, normalizedWallet),
            eq(this.schema.quizAttempts.lessonId, lessonId)
          ));
      }
      
      return results.map((row: any) => ({
        id: row.id,
        walletAddress: row.walletAddress,
        lessonId: row.lessonId,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        score: row.score,
        passed: row.passed,
        flagged: row.flagged,
        flagReason: row.flagReason,
      }));
    } catch (error: any) {
      console.error("[SecurityStorage] Get quiz attempts failed:", error.message);
      return this.fallback.getQuizAttempts(walletAddress, lessonId);
    }
  }

  async recordQuizAttempt(attempt: Omit<QuizAttemptRecord, "id">): Promise<QuizAttemptRecord> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.recordQuizAttempt(attempt);
    }

    try {
      const [result] = await this.db.insert(this.schema.quizAttempts).values({
        walletAddress: attempt.walletAddress.toLowerCase(),
        lessonId: attempt.lessonId,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        score: attempt.score,
        passed: attempt.passed,
        flagged: attempt.flagged,
        flagReason: attempt.flagReason,
      }).returning();

      return {
        id: result.id,
        walletAddress: result.walletAddress,
        lessonId: result.lessonId,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        score: result.score,
        passed: result.passed,
        flagged: result.flagged,
        flagReason: result.flagReason,
      };
    } catch (error: any) {
      console.error("[SecurityStorage] Record quiz attempt failed:", error.message);
      return this.fallback.recordQuizAttempt(attempt);
    }
  }

  async getIpActivity(ipAddress: string): Promise<IpActivity | undefined> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.getIpActivity(ipAddress);
    }

    try {
      const { eq } = await import("drizzle-orm");
      const result = await this.db.select()
        .from(this.schema.ipActivity)
        .where(eq(this.schema.ipActivity.ipAddress, ipAddress))
        .limit(1);
      
      if (result.length === 0) return undefined;
      
      const row = result[0];
      return {
        id: row.id,
        ipAddress: row.ipAddress,
        firstSeen: row.firstSeen,
        lastSeen: row.lastSeen,
        wallets: row.wallets || [],
        requestCount: row.requestCount,
        flagged: row.flagged,
        flags: row.flags || [],
        isVpn: row.isVpn,
        vpnScore: row.vpnScore,
        vpnCheckedAt: row.vpnCheckedAt,
      };
    } catch (error: any) {
      console.error("[SecurityStorage] Get IP activity failed:", error.message);
      return this.fallback.getIpActivity(ipAddress);
    }
  }

  async upsertIpActivity(data: Partial<IpActivity> & { ipAddress: string }): Promise<IpActivity> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.upsertIpActivity(data);
    }

    try {
      const existing = await this.getIpActivity(data.ipAddress);
      
      const values = {
        ipAddress: data.ipAddress,
        firstSeen: existing?.firstSeen || new Date(),
        lastSeen: new Date(),
        wallets: data.wallets ?? existing?.wallets ?? [],
        requestCount: data.requestCount ?? (existing?.requestCount ?? 0) + 1,
        flagged: data.flagged ?? existing?.flagged ?? false,
        flags: data.flags ?? existing?.flags ?? [],
        isVpn: data.isVpn ?? existing?.isVpn ?? false,
        vpnScore: data.vpnScore ?? existing?.vpnScore,
        vpnCheckedAt: data.vpnCheckedAt ?? existing?.vpnCheckedAt,
      };

      if (existing) {
        const { eq } = await import("drizzle-orm");
        await this.db.update(this.schema.ipActivity)
          .set(values)
          .where(eq(this.schema.ipActivity.ipAddress, data.ipAddress));
        
        return { id: existing.id, ...values };
      } else {
        const [result] = await this.db.insert(this.schema.ipActivity)
          .values(values)
          .returning();
        
        return {
          id: result.id,
          ipAddress: result.ipAddress,
          firstSeen: result.firstSeen,
          lastSeen: result.lastSeen,
          wallets: result.wallets || [],
          requestCount: result.requestCount,
          flagged: result.flagged,
          flags: result.flags || [],
          isVpn: result.isVpn,
          vpnScore: result.vpnScore,
          vpnCheckedAt: result.vpnCheckedAt,
        };
      }
    } catch (error: any) {
      console.error("[SecurityStorage] Upsert IP activity failed:", error.message);
      return this.fallback.upsertIpActivity(data);
    }
  }

  async getWalletIpBinding(walletAddress: string): Promise<WalletIpBinding | undefined> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.getWalletIpBinding(walletAddress);
    }

    try {
      const { eq } = await import("drizzle-orm");
      const result = await this.db.select()
        .from(this.schema.walletIpBindings)
        .where(eq(this.schema.walletIpBindings.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      
      if (result.length === 0) return undefined;
      
      const row = result[0];
      return {
        id: row.id,
        walletAddress: row.walletAddress,
        ips: row.ips || [],
        primaryIp: row.primaryIp,
        flagged: row.flagged,
      };
    } catch (error: any) {
      console.error("[SecurityStorage] Get wallet IP binding failed:", error.message);
      return this.fallback.getWalletIpBinding(walletAddress);
    }
  }

  async upsertWalletIpBinding(data: Partial<WalletIpBinding> & { walletAddress: string }): Promise<WalletIpBinding> {
    if (!(await this.ensureInitialized())) {
      return this.fallback.upsertWalletIpBinding(data);
    }

    try {
      const normalized = data.walletAddress.toLowerCase();
      const existing = await this.getWalletIpBinding(normalized);
      
      const values = {
        walletAddress: normalized,
        ips: data.ips ?? existing?.ips ?? [],
        primaryIp: data.primaryIp ?? existing?.primaryIp,
        flagged: data.flagged ?? existing?.flagged ?? false,
      };

      if (existing) {
        const { eq } = await import("drizzle-orm");
        await this.db.update(this.schema.walletIpBindings)
          .set(values)
          .where(eq(this.schema.walletIpBindings.walletAddress, normalized));
        
        return { id: existing.id, ...values };
      } else {
        const [result] = await this.db.insert(this.schema.walletIpBindings)
          .values(values)
          .returning();
        
        return {
          id: result.id,
          walletAddress: result.walletAddress,
          ips: result.ips || [],
          primaryIp: result.primaryIp,
          flagged: result.flagged,
        };
      }
    } catch (error: any) {
      console.error("[SecurityStorage] Upsert wallet IP binding failed:", error.message);
      return this.fallback.upsertWalletIpBinding(data);
    }
  }
}

let securityStorageInstance: SecurityStorageInterface | null = null;

export async function getSecurityStorage(): Promise<SecurityStorageInterface> {
  if (!securityStorageInstance) {
    if (process.env.DATABASE_URL) {
      const dbStorage = new DatabaseSecurityStorage();
      await dbStorage.initialize();
      securityStorageInstance = dbStorage;
    } else {
      console.log("[SecurityStorage] No DATABASE_URL, using in-memory storage");
      securityStorageInstance = new MemorySecurityStorage();
    }
  }
  return securityStorageInstance;
}

export { SecurityStorageInterface, MemorySecurityStorage, DatabaseSecurityStorage };
