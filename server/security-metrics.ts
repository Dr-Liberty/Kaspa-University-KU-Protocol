/**
 * Security Metrics for Kaspa University
 * 
 * Tracks and exposes security-related metrics for monitoring:
 * - Rate limiting events
 * - VPN/proxy detections
 * - Multi-account detections
 * - Quiz attempt patterns
 * - Reward distribution
 */

interface SecurityMetric {
  count: number;
  lastOccurred: number;
  recentEvents: Array<{ timestamp: number; details?: any }>;
}

interface MetricsSnapshot {
  timestamp: number;
  uptime: number;
  vpnDetections: SecurityMetric;
  multiWalletDetections: SecurityMetric;
  multiIpDetections: SecurityMetric;
  rateLimitHits: SecurityMetric;
  rewardsBlocked: SecurityMetric;
  rewardsDistributed: SecurityMetric;
  quizAttempts: SecurityMetric;
  nftClaimAttempts: SecurityMetric;
  suspiciousActivity: SecurityMetric;
  activeSessions: number;
  uniqueWalletsToday: number;
  uniqueIpsToday: number;
}

interface HourlyStats {
  hour: number;
  requests: number;
  vpnDetections: number;
  rewardsDistributed: number;
  rewardsBlocked: number;
}

const MAX_RECENT_EVENTS = 100;
const HOURLY_STATS_RETENTION = 24;

class SecurityMetrics {
  private startTime: number = Date.now();
  
  private vpnDetections: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private multiWalletDetections: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private multiIpDetections: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private rateLimitHits: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private rewardsBlocked: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private rewardsDistributed: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private quizAttempts: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private nftClaimAttempts: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  private suspiciousActivity: SecurityMetric = { count: 0, lastOccurred: 0, recentEvents: [] };
  
  private uniqueWalletsToday: Set<string> = new Set();
  private uniqueIpsToday: Set<string> = new Set();
  private lastDayReset: number = Date.now();
  
  private hourlyStats: HourlyStats[] = [];
  private currentHourStats: HourlyStats = { hour: new Date().getHours(), requests: 0, vpnDetections: 0, rewardsDistributed: 0, rewardsBlocked: 0 };
  
  private activeSessions: number = 0;

  private recordEvent(metric: SecurityMetric, details?: any): void {
    metric.count++;
    metric.lastOccurred = Date.now();
    metric.recentEvents.push({ timestamp: Date.now(), details });
    
    if (metric.recentEvents.length > MAX_RECENT_EVENTS) {
      metric.recentEvents = metric.recentEvents.slice(-MAX_RECENT_EVENTS);
    }
  }

  private checkDayReset(): void {
    const now = Date.now();
    if (now - this.lastDayReset > 24 * 60 * 60 * 1000) {
      this.uniqueWalletsToday.clear();
      this.uniqueIpsToday.clear();
      this.lastDayReset = now;
    }

    const currentHour = new Date().getHours();
    if (this.currentHourStats.hour !== currentHour) {
      this.hourlyStats.push({ ...this.currentHourStats });
      if (this.hourlyStats.length > HOURLY_STATS_RETENTION) {
        this.hourlyStats.shift();
      }
      this.currentHourStats = { hour: currentHour, requests: 0, vpnDetections: 0, rewardsDistributed: 0, rewardsBlocked: 0 };
    }
  }

  recordVpnDetection(ip: string, score: number): void {
    this.recordEvent(this.vpnDetections, { ip: ip.slice(0, 8) + "...", score });
    this.currentHourStats.vpnDetections++;
  }

  recordMultiWalletDetection(ip: string, walletCount: number): void {
    this.recordEvent(this.multiWalletDetections, { ip: ip.slice(0, 8) + "...", walletCount });
  }

  recordMultiIpDetection(wallet: string, ipCount: number): void {
    this.recordEvent(this.multiIpDetections, { wallet: wallet.slice(-12), ipCount });
  }

  recordRateLimitHit(ip: string, endpoint: string): void {
    this.recordEvent(this.rateLimitHits, { ip: ip.slice(0, 8) + "...", endpoint });
  }

  recordRewardBlocked(wallet: string, reason: string, amount?: number): void {
    this.recordEvent(this.rewardsBlocked, { wallet: wallet.slice(-12), reason, amount });
    this.currentHourStats.rewardsBlocked++;
  }

  recordRewardDistributed(wallet: string, amount: number, lessonId: string): void {
    this.recordEvent(this.rewardsDistributed, { wallet: wallet.slice(-12), amount, lessonId });
    this.currentHourStats.rewardsDistributed++;
  }

  recordQuizAttempt(wallet: string, lessonId: string, passed: boolean): void {
    this.recordEvent(this.quizAttempts, { wallet: wallet.slice(-12), lessonId, passed });
  }

  recordNftClaimAttempt(wallet: string, success: boolean, reason?: string): void {
    this.recordEvent(this.nftClaimAttempts, { wallet: wallet.slice(-12), success, reason });
  }

  recordSuspiciousActivity(wallet: string, activity: string, details?: any): void {
    this.recordEvent(this.suspiciousActivity, { wallet: wallet.slice(-12), activity, ...details });
  }

  recordRequest(ip: string, wallet?: string): void {
    this.checkDayReset();
    this.currentHourStats.requests++;
    
    if (ip) this.uniqueIpsToday.add(ip);
    if (wallet && !wallet.startsWith("demo:")) {
      this.uniqueWalletsToday.add(wallet.toLowerCase());
    }
  }

  setActiveSessions(count: number): void {
    this.activeSessions = count;
  }

  getSnapshot(): MetricsSnapshot {
    this.checkDayReset();
    
    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      vpnDetections: { ...this.vpnDetections, recentEvents: this.vpnDetections.recentEvents.slice(-10) },
      multiWalletDetections: { ...this.multiWalletDetections, recentEvents: this.multiWalletDetections.recentEvents.slice(-10) },
      multiIpDetections: { ...this.multiIpDetections, recentEvents: this.multiIpDetections.recentEvents.slice(-10) },
      rateLimitHits: { ...this.rateLimitHits, recentEvents: this.rateLimitHits.recentEvents.slice(-10) },
      rewardsBlocked: { ...this.rewardsBlocked, recentEvents: this.rewardsBlocked.recentEvents.slice(-10) },
      rewardsDistributed: { ...this.rewardsDistributed, recentEvents: this.rewardsDistributed.recentEvents.slice(-10) },
      quizAttempts: { ...this.quizAttempts, recentEvents: this.quizAttempts.recentEvents.slice(-10) },
      nftClaimAttempts: { ...this.nftClaimAttempts, recentEvents: this.nftClaimAttempts.recentEvents.slice(-10) },
      suspiciousActivity: { ...this.suspiciousActivity, recentEvents: this.suspiciousActivity.recentEvents.slice(-10) },
      activeSessions: this.activeSessions,
      uniqueWalletsToday: this.uniqueWalletsToday.size,
      uniqueIpsToday: this.uniqueIpsToday.size,
    };
  }

  getSummary(): {
    totalVpnDetections: number;
    totalRewardsBlocked: number;
    totalRewardsDistributed: number;
    uniqueWalletsToday: number;
    suspiciousActivityCount: number;
    hourlyStats: HourlyStats[];
  } {
    this.checkDayReset();
    
    return {
      totalVpnDetections: this.vpnDetections.count,
      totalRewardsBlocked: this.rewardsBlocked.count,
      totalRewardsDistributed: this.rewardsDistributed.count,
      uniqueWalletsToday: this.uniqueWalletsToday.size,
      suspiciousActivityCount: this.suspiciousActivity.count,
      hourlyStats: [...this.hourlyStats, this.currentHourStats],
    };
  }

  getAlerts(): Array<{ type: string; message: string; severity: "low" | "medium" | "high"; timestamp: number }> {
    const alerts: Array<{ type: string; message: string; severity: "low" | "medium" | "high"; timestamp: number }> = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const recentVpn = this.vpnDetections.recentEvents.filter(e => now - e.timestamp < oneHour).length;
    if (recentVpn > 10) {
      alerts.push({
        type: "VPN_SPIKE",
        message: `High VPN detection rate: ${recentVpn} in the last hour`,
        severity: "medium",
        timestamp: now,
      });
    }

    const recentSuspicious = this.suspiciousActivity.recentEvents.filter(e => now - e.timestamp < oneHour).length;
    if (recentSuspicious > 5) {
      alerts.push({
        type: "SUSPICIOUS_SPIKE",
        message: `High suspicious activity: ${recentSuspicious} events in the last hour`,
        severity: "high",
        timestamp: now,
      });
    }

    const recentRateLimit = this.rateLimitHits.recentEvents.filter(e => now - e.timestamp < oneHour).length;
    if (recentRateLimit > 50) {
      alerts.push({
        type: "RATE_LIMIT_SPIKE",
        message: `High rate limit hits: ${recentRateLimit} in the last hour`,
        severity: "medium",
        timestamp: now,
      });
    }

    return alerts;
  }
}

let metricsInstance: SecurityMetrics | null = null;

export function getSecurityMetrics(): SecurityMetrics {
  if (!metricsInstance) {
    metricsInstance = new SecurityMetrics();
  }
  return metricsInstance;
}

export { SecurityMetrics, MetricsSnapshot, HourlyStats };
