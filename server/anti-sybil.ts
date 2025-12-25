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
 */

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
  quizCooldownMs: 24 * 60 * 60 * 1000,
  minCompletionTimeMs: 30 * 1000,
  maxDailyRewardKas: 5,
  maxQuizAttemptsPerLesson: 3,
  minTrustScoreForRewards: 0.3,
  newWalletRewardMultiplier: 0.5,
  walletAgeDaysForFullRewards: 7,
};

class AntiSybilService {
  private config: AntiSybilConfig;
  private walletActivity: Map<string, WalletActivity> = new Map();
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

  private getOrCreateWalletActivity(address: string): WalletActivity {
    const normalizedAddress = address.toLowerCase();
    
    if (!this.walletActivity.has(normalizedAddress)) {
      this.walletActivity.set(normalizedAddress, {
        address: normalizedAddress,
        firstSeen: new Date(),
        totalQuizzes: 0,
        totalRewardsToday: 0,
        todayDate: this.getTodayDate(),
        quizAttempts: new Map(),
        flags: [],
        trustScore: 0.5,
      });
    }

    const activity = this.walletActivity.get(normalizedAddress)!;
    
    if (activity.todayDate !== this.getTodayDate()) {
      activity.totalRewardsToday = 0;
      activity.todayDate = this.getTodayDate();
    }

    return activity;
  }

  private getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  private getQuizKey(walletAddress: string, lessonId: string): string {
    return `${walletAddress.toLowerCase()}:${lessonId}`;
  }

  recordQuizStart(walletAddress: string, lessonId: string): void {
    const key = this.getQuizKey(walletAddress, lessonId);
    this.quizStartTimes.set(key, Date.now());
  }

  validateQuizSubmission(walletAddress: string, lessonId: string): {
    allowed: boolean;
    reason?: string;
    rewardMultiplier: number;
    flags: string[];
  } {
    const activity = this.getOrCreateWalletActivity(walletAddress);
    const key = this.getQuizKey(walletAddress, lessonId);
    const flags: string[] = [];
    let rewardMultiplier = 1.0;

    const attempts = activity.quizAttempts.get(lessonId) || [];
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

  recordQuizCompletion(
    walletAddress: string,
    lessonId: string,
    score: number,
    passed: boolean,
    kasRewarded: number
  ): QuizAttempt {
    const activity = this.getOrCreateWalletActivity(walletAddress);
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

  getDailyRewardsRemaining(walletAddress: string): number {
    const activity = this.getOrCreateWalletActivity(walletAddress);
    return Math.max(0, this.config.maxDailyRewardKas - activity.totalRewardsToday);
  }

  getQuizAttemptsRemaining(walletAddress: string, lessonId: string): number {
    const activity = this.getOrCreateWalletActivity(walletAddress);
    const attempts = activity.quizAttempts.get(lessonId) || [];
    return Math.max(0, this.config.maxQuizAttemptsPerLesson - attempts.length);
  }

  getWalletStats(walletAddress: string): {
    trustScore: number;
    totalQuizzes: number;
    dailyRewardsRemaining: number;
    walletAgeDays: number;
    flags: string[];
  } {
    const activity = this.getOrCreateWalletActivity(walletAddress);
    const walletAgeDays = (Date.now() - activity.firstSeen.getTime()) / (24 * 60 * 60 * 1000);
    
    return {
      trustScore: activity.trustScore,
      totalQuizzes: activity.totalQuizzes,
      dailyRewardsRemaining: this.getDailyRewardsRemaining(walletAddress),
      walletAgeDays: Math.floor(walletAgeDays),
      flags: activity.flags.slice(-10),
    };
  }

  getCooldownStatus(walletAddress: string, lessonId: string): {
    onCooldown: boolean;
    hoursRemaining?: number;
    attemptsRemaining: number;
  } {
    const activity = this.getOrCreateWalletActivity(walletAddress);
    const attempts = activity.quizAttempts.get(lessonId) || [];
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
