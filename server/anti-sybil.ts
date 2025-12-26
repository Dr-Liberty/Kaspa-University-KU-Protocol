/**
 * Anti-Sybil Protection System for Kaspa University
 * 
 * Implements multiple layers of protection against farming and Sybil attacks:
 * - Quiz cooldowns (24 hours between retakes)
 * - Minimum completion time (detect bots)
 * - Daily reward caps per wallet
 * - Quiz attempt limits
 * - Wallet trust scoring
 * - Rate limiting
 * 
 * Now with persistent storage via PostgreSQL.
 */

import { getSecurityStorage } from "./security-storage.js";

interface QuizAttempt {
  lessonId: string;
  walletAddress: string;
  startedAt: number;
  completedAt: number;
  score: number;
  passed: boolean;
  flagged: boolean;
  flagReason?: string;
}

interface WalletActivity {
  address: string;
  firstSeen: Date;
  totalQuizzes: number;
  totalRewardsToday: number;
  todayDate: string;
  quizAttempts: Map<string, QuizAttempt[]>;
  flags: string[];
  trustScore: number;
}

interface AntiSybilConfig {
  quizCooldownMs: number;
  minCompletionTimeMs: number;
  maxDailyRewardKas: number;
  maxQuizAttemptsPerLesson: number;
  minTrustScoreForRewards: number;
  newWalletRewardMultiplier: number;
  walletAgeDaysForFullRewards: number;
}

const DEFAULT_CONFIG: AntiSybilConfig = {
  quizCooldownMs: 0, // No cooldown between quiz attempts
  minCompletionTimeMs: 3 * 1000, // 3 seconds minimum
  maxDailyRewardKas: 5,
  maxQuizAttemptsPerLesson: 3, // 3 attempts per lesson per day
  minTrustScoreForRewards: 0.3,
  newWalletRewardMultiplier: 0.5,
  walletAgeDaysForFullRewards: 7,
};

class AntiSybilService {
  private config: AntiSybilConfig;
  private walletActivityCache: Map<string, WalletActivity> = new Map();
  private quizStartTimes: Map<string, number> = new Map();

  constructor(config: Partial<AntiSybilConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log("[AntiSybil] Service initialized with config:", {
      cooldownHours: this.config.quizCooldownMs / (60 * 60 * 1000),
      minCompletionSeconds: this.config.minCompletionTimeMs / 1000,
      maxDailyKas: this.config.maxDailyRewardKas,
      maxAttempts: this.config.maxQuizAttemptsPerLesson,
    });
  }

  private getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  private getQuizKey(walletAddress: string, lessonId: string): string {
    return `${walletAddress.toLowerCase()}:${lessonId}`;
  }

  private async getOrCreateWalletActivity(address: string): Promise<WalletActivity> {
    const normalizedAddress = address.toLowerCase();
    
    const cached = this.walletActivityCache.get(normalizedAddress);
    if (cached) {
      if (cached.todayDate !== this.getTodayDate()) {
        cached.totalRewardsToday = 0;
        cached.todayDate = this.getTodayDate();
      }
      return cached;
    }
    
    try {
      const storage = await getSecurityStorage();
      const stored = await storage.getAntiSybilData(normalizedAddress);
      
      if (stored) {
        const attempts = await storage.getQuizAttempts(normalizedAddress, "");
        const attemptsMap = new Map<string, QuizAttempt[]>();
        
        for (const attempt of attempts) {
          const key = attempt.lessonId;
          if (!attemptsMap.has(key)) {
            attemptsMap.set(key, []);
          }
          attemptsMap.get(key)!.push({
            lessonId: attempt.lessonId,
            walletAddress: attempt.walletAddress,
            startedAt: attempt.startedAt.getTime(),
            completedAt: attempt.completedAt.getTime(),
            score: attempt.score,
            passed: attempt.passed,
            flagged: attempt.flagged,
            flagReason: attempt.flagReason,
          });
        }
        
        const activity: WalletActivity = {
          address: normalizedAddress,
          firstSeen: stored.firstSeen,
          totalQuizzes: stored.totalQuizzes,
          totalRewardsToday: stored.todayDate === this.getTodayDate() ? stored.totalRewardsToday : 0,
          todayDate: this.getTodayDate(),
          quizAttempts: attemptsMap,
          flags: stored.flags,
          trustScore: stored.trustScore,
        };
        
        this.walletActivityCache.set(normalizedAddress, activity);
        return activity;
      }
    } catch (error: any) {
      console.error("[AntiSybil] Failed to load wallet activity:", error.message);
    }
    
    const activity: WalletActivity = {
      address: normalizedAddress,
      firstSeen: new Date(),
      totalQuizzes: 0,
      totalRewardsToday: 0,
      todayDate: this.getTodayDate(),
      quizAttempts: new Map(),
      flags: [],
      trustScore: 0.5,
    };
    
    this.walletActivityCache.set(normalizedAddress, activity);
    
    try {
      const storage = await getSecurityStorage();
      await storage.upsertAntiSybilData({
        walletAddress: normalizedAddress,
        totalQuizzes: 0,
        totalRewardsToday: 0,
        trustScore: 0.5,
        flags: [],
      });
    } catch (error: any) {
      console.error("[AntiSybil] Failed to persist new wallet activity:", error.message);
    }
    
    return activity;
  }

  recordQuizStart(walletAddress: string, lessonId: string): void {
    const key = this.getQuizKey(walletAddress, lessonId);
    this.quizStartTimes.set(key, Date.now());
  }

  async validateQuizSubmission(walletAddress: string, lessonId: string): Promise<{
    allowed: boolean;
    reason?: string;
    rewardMultiplier: number;
    flags: string[];
  }> {
    const activity = await this.getOrCreateWalletActivity(walletAddress);
    const key = this.getQuizKey(walletAddress, lessonId);
    const flags: string[] = [];
    let rewardMultiplier = 1.0;

    const attempts = activity.quizAttempts.get(lessonId) || [];
    
    try {
      const storage = await getSecurityStorage();
      const dbAttempts = await storage.getQuizAttempts(walletAddress, lessonId);
      if (dbAttempts.length > attempts.length) {
        for (const dbAttempt of dbAttempts) {
          const exists = attempts.some(a => a.completedAt === dbAttempt.completedAt.getTime());
          if (!exists) {
            attempts.push({
              lessonId: dbAttempt.lessonId,
              walletAddress: dbAttempt.walletAddress,
              startedAt: dbAttempt.startedAt.getTime(),
              completedAt: dbAttempt.completedAt.getTime(),
              score: dbAttempt.score,
              passed: dbAttempt.passed,
              flagged: dbAttempt.flagged,
              flagReason: dbAttempt.flagReason,
            });
          }
        }
        activity.quizAttempts.set(lessonId, attempts);
      }
    } catch (error: any) {
      console.error("[AntiSybil] Failed to load quiz attempts:", error.message);
    }

    if (attempts.length >= this.config.maxQuizAttemptsPerLesson) {
      return {
        allowed: false,
        reason: `Maximum attempts (${this.config.maxQuizAttemptsPerLesson}) reached for this quiz`,
        rewardMultiplier: 0,
        flags: ["MAX_ATTEMPTS_EXCEEDED"],
      };
    }

    const passedAttempt = attempts.find(a => a.passed);
    if (passedAttempt) {
      const timeSincePass = Date.now() - passedAttempt.completedAt;
      if (timeSincePass < this.config.quizCooldownMs) {
        const hoursRemaining = Math.ceil((this.config.quizCooldownMs - timeSincePass) / (60 * 60 * 1000));
        return {
          allowed: false,
          reason: `Quiz on cooldown. Try again in ${hoursRemaining} hours`,
          rewardMultiplier: 0,
          flags: ["COOLDOWN_ACTIVE"],
        };
      }
    }

    if (activity.totalRewardsToday >= this.config.maxDailyRewardKas) {
      flags.push("DAILY_CAP_REACHED");
      rewardMultiplier = 0;
    }

    const startTime = this.quizStartTimes.get(key);
    if (startTime) {
      const completionTime = Date.now() - startTime;
      if (completionTime < this.config.minCompletionTimeMs) {
        flags.push("SUSPICIOUSLY_FAST");
        rewardMultiplier *= 0.25;
      }
    } else {
      flags.push("NO_START_RECORDED");
    }

    const walletAgeDays = (Date.now() - activity.firstSeen.getTime()) / (24 * 60 * 60 * 1000);
    if (walletAgeDays < this.config.walletAgeDaysForFullRewards) {
      const ageMultiplier = Math.max(
        this.config.newWalletRewardMultiplier,
        walletAgeDays / this.config.walletAgeDaysForFullRewards
      );
      rewardMultiplier *= ageMultiplier;
      if (walletAgeDays < 1) {
        flags.push("NEW_WALLET");
      }
    }

    if (activity.trustScore < this.config.minTrustScoreForRewards) {
      flags.push("LOW_TRUST_SCORE");
      rewardMultiplier *= activity.trustScore;
    }

    return {
      allowed: true,
      rewardMultiplier: Math.max(0, Math.min(1, rewardMultiplier)),
      flags,
    };
  }

  async recordQuizCompletion(
    walletAddress: string,
    lessonId: string,
    score: number,
    passed: boolean,
    kasRewarded: number
  ): Promise<QuizAttempt> {
    const activity = await this.getOrCreateWalletActivity(walletAddress);
    const key = this.getQuizKey(walletAddress, lessonId);
    
    const startTime = this.quizStartTimes.get(key) || Date.now() - 60000;
    const completionTime = Date.now() - startTime;
    
    const flags: string[] = [];
    let flagged = false;
    
    if (completionTime < this.config.minCompletionTimeMs) {
      flags.push("COMPLETED_TOO_FAST");
      flagged = true;
    }

    const attempt: QuizAttempt = {
      lessonId,
      walletAddress: walletAddress.toLowerCase(),
      startedAt: startTime,
      completedAt: Date.now(),
      score,
      passed,
      flagged,
      flagReason: flags.length > 0 ? flags.join(", ") : undefined,
    };

    if (!activity.quizAttempts.has(lessonId)) {
      activity.quizAttempts.set(lessonId, []);
    }
    activity.quizAttempts.get(lessonId)!.push(attempt);

    activity.totalQuizzes++;
    activity.totalRewardsToday += kasRewarded;
    activity.flags.push(...flags);

    if (passed && !flagged) {
      activity.trustScore = Math.min(1, activity.trustScore + 0.05);
    } else if (flagged) {
      activity.trustScore = Math.max(0, activity.trustScore - 0.1);
    }

    this.quizStartTimes.delete(key);

    try {
      const storage = await getSecurityStorage();
      
      await storage.recordQuizAttempt({
        walletAddress: walletAddress.toLowerCase(),
        lessonId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        score,
        passed,
        flagged,
        flagReason: attempt.flagReason,
      });
      
      await storage.upsertAntiSybilData({
        walletAddress: walletAddress.toLowerCase(),
        totalQuizzes: activity.totalQuizzes,
        totalRewardsToday: activity.totalRewardsToday,
        trustScore: activity.trustScore,
        flags: activity.flags,
      });
    } catch (error: any) {
      console.error("[AntiSybil] Failed to persist quiz completion:", error.message);
    }

    console.log(`[AntiSybil] Quiz completed:`, {
      wallet: walletAddress.slice(0, 20) + "...",
      lesson: lessonId,
      score,
      passed,
      kasRewarded,
      completionTimeSeconds: Math.round(completionTime / 1000),
      flagged,
      trustScore: activity.trustScore.toFixed(2),
    });

    return attempt;
  }

  async getDailyRewardsRemaining(walletAddress: string): Promise<number> {
    const activity = await this.getOrCreateWalletActivity(walletAddress);
    return Math.max(0, this.config.maxDailyRewardKas - activity.totalRewardsToday);
  }

  async getQuizAttemptsRemaining(walletAddress: string, lessonId: string): Promise<number> {
    const activity = await this.getOrCreateWalletActivity(walletAddress);
    
    let attempts = activity.quizAttempts.get(lessonId) || [];
    
    try {
      const storage = await getSecurityStorage();
      const dbAttempts = await storage.getQuizAttempts(walletAddress, lessonId);
      if (dbAttempts.length > attempts.length) {
        attempts = dbAttempts.map(a => ({
          lessonId: a.lessonId,
          walletAddress: a.walletAddress,
          startedAt: a.startedAt.getTime(),
          completedAt: a.completedAt.getTime(),
          score: a.score,
          passed: a.passed,
          flagged: a.flagged,
          flagReason: a.flagReason,
        }));
        activity.quizAttempts.set(lessonId, attempts);
      }
    } catch (error: any) {
      console.error("[AntiSybil] Failed to load quiz attempts:", error.message);
    }
    
    return Math.max(0, this.config.maxQuizAttemptsPerLesson - attempts.length);
  }

  async getWalletStats(walletAddress: string): Promise<{
    trustScore: number;
    totalQuizzes: number;
    dailyRewardsRemaining: number;
    walletAgeDays: number;
    flags: string[];
  }> {
    const activity = await this.getOrCreateWalletActivity(walletAddress);
    const walletAgeDays = (Date.now() - activity.firstSeen.getTime()) / (24 * 60 * 60 * 1000);
    
    return {
      trustScore: activity.trustScore,
      totalQuizzes: activity.totalQuizzes,
      dailyRewardsRemaining: await this.getDailyRewardsRemaining(walletAddress),
      walletAgeDays: Math.floor(walletAgeDays),
      flags: activity.flags.slice(-10),
    };
  }

  async getCooldownStatus(walletAddress: string, lessonId: string): Promise<{
    onCooldown: boolean;
    hoursRemaining?: number;
    attemptsRemaining: number;
  }> {
    const activity = await this.getOrCreateWalletActivity(walletAddress);
    
    let attempts = activity.quizAttempts.get(lessonId) || [];
    
    try {
      const storage = await getSecurityStorage();
      const dbAttempts = await storage.getQuizAttempts(walletAddress, lessonId);
      if (dbAttempts.length > attempts.length) {
        attempts = dbAttempts.map(a => ({
          lessonId: a.lessonId,
          walletAddress: a.walletAddress,
          startedAt: a.startedAt.getTime(),
          completedAt: a.completedAt.getTime(),
          score: a.score,
          passed: a.passed,
          flagged: a.flagged,
          flagReason: a.flagReason,
        }));
        activity.quizAttempts.set(lessonId, attempts);
      }
    } catch (error: any) {
      console.error("[AntiSybil] Failed to load quiz attempts:", error.message);
    }
    
    const attemptsRemaining = Math.max(0, this.config.maxQuizAttemptsPerLesson - attempts.length);
    
    const passedAttempt = attempts.find(a => a.passed);
    if (passedAttempt) {
      const timeSincePass = Date.now() - passedAttempt.completedAt;
      if (timeSincePass < this.config.quizCooldownMs) {
        const hoursRemaining = Math.ceil((this.config.quizCooldownMs - timeSincePass) / (60 * 60 * 1000));
        return {
          onCooldown: true,
          hoursRemaining,
          attemptsRemaining,
        };
      }
    }

    return {
      onCooldown: false,
      attemptsRemaining,
    };
  }
}

let antiSybilInstance: AntiSybilService | null = null;

export function getAntiSybilService(): AntiSybilService {
  if (!antiSybilInstance) {
    antiSybilInstance = new AntiSybilService();
  }
  return antiSybilInstance;
}

export { AntiSybilService, AntiSybilConfig, QuizAttempt, WalletActivity };
