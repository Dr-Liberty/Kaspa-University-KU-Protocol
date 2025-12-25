/**
 * Security Middleware for Kaspa University
 * 
 * Provides:
 * - Rate limiting per IP and wallet
 * - IP tracking and multi-accounting detection
 * - VPN/Proxy detection (basic and optional API-based)
 * - Request fingerprinting
 */

import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

interface IPActivity {
  firstSeen: Date;
  lastSeen: Date;
  wallets: Set<string>;
  requestCount: number;
  flagged: boolean;
  flags: string[];
  isVpn: boolean;
  vpnCheckTime?: number;
}

interface WalletIPBinding {
  walletAddress: string;
  ips: Set<string>;
  primaryIp?: string;
  flagged: boolean;
}

const ipActivity: Map<string, IPActivity> = new Map();
const walletIpBindings: Map<string, WalletIPBinding> = new Map();
const usedPaymentTxHashes: Set<string> = new Set();

const MULTI_WALLET_THRESHOLD = 3;
const MULTI_IP_THRESHOLD = 5;

const KNOWN_VPN_ASN_PREFIXES = [
  "AS9009",   // M247
  "AS16509", // Amazon
  "AS14061", // DigitalOcean
  "AS20473", // Vultr
  "AS14618", // Amazon AWS
  "AS396982", // Google Cloud
  "AS45102", // Alibaba
  "AS8075",  // Microsoft Azure
];

const DATACENTER_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.64\./,
];

export function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",");
    return ips[0].trim();
  }
  return req.socket.remoteAddress || req.ip || "unknown";
}

export function isDatacenterIP(ip: string): boolean {
  return DATACENTER_IP_RANGES.some(regex => regex.test(ip));
}

export function trackIPActivity(req: Request): IPActivity {
  const ip = getClientIP(req);
  const walletAddress = req.headers["x-wallet-address"] as string;
  
  let activity = ipActivity.get(ip);
  if (!activity) {
    activity = {
      firstSeen: new Date(),
      lastSeen: new Date(),
      wallets: new Set(),
      requestCount: 0,
      flagged: false,
      flags: [],
      isVpn: false,
    };
    ipActivity.set(ip, activity);
  }
  
  activity.lastSeen = new Date();
  activity.requestCount++;
  
  if (walletAddress && !walletAddress.startsWith("demo:")) {
    activity.wallets.add(walletAddress.toLowerCase());
    
    if (activity.wallets.size >= MULTI_WALLET_THRESHOLD && !activity.flags.includes("MULTI_WALLET_IP")) {
      activity.flagged = true;
      activity.flags.push("MULTI_WALLET_IP");
      console.log(`[Security] IP ${ip} flagged: ${activity.wallets.size} wallets detected`);
    }
    
    let binding = walletIpBindings.get(walletAddress.toLowerCase());
    if (!binding) {
      binding = {
        walletAddress: walletAddress.toLowerCase(),
        ips: new Set(),
        flagged: false,
      };
      walletIpBindings.set(walletAddress.toLowerCase(), binding);
    }
    
    binding.ips.add(ip);
    if (!binding.primaryIp) {
      binding.primaryIp = ip;
    }
    
    if (binding.ips.size >= MULTI_IP_THRESHOLD && !binding.flagged) {
      binding.flagged = true;
      console.log(`[Security] Wallet ${walletAddress.slice(0, 20)}... flagged: ${binding.ips.size} IPs detected`);
    }
  }
  
  return activity;
}

export function checkVpnBasic(ip: string): { isVpn: boolean; reason?: string } {
  if (isDatacenterIP(ip)) {
    return { isVpn: true, reason: "Private/datacenter IP range" };
  }
  
  return { isVpn: false };
}

const vpnCheckCache: Map<string, { isVpn: boolean; score: number; checkedAt: number }> = new Map();
const VPN_CACHE_TTL = 6 * 60 * 60 * 1000;
const VPN_THRESHOLD = 0.90;
const GETIPINTEL_CONTACT = process.env.GETIPINTEL_CONTACT || "kaspauniversity@proton.me";

export async function checkVpnGetIPIntel(ip: string): Promise<{ isVpn: boolean; score: number; cached: boolean }> {
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1" || isDatacenterIP(ip)) {
    return { isVpn: isDatacenterIP(ip), score: isDatacenterIP(ip) ? 1.0 : 0, cached: false };
  }
  
  const cached = vpnCheckCache.get(ip);
  if (cached && Date.now() - cached.checkedAt < VPN_CACHE_TTL) {
    return { isVpn: cached.isVpn, score: cached.score, cached: true };
  }
  
  try {
    const url = `https://check.getipintel.net/check.php?ip=${encodeURIComponent(ip)}&contact=${encodeURIComponent(GETIPINTEL_CONTACT)}&flags=f&format=json`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { "User-Agent": "KaspaUniversity/1.0" }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`[VPN Check] GetIPIntel returned ${response.status} for ${ip}`);
      return { isVpn: false, score: 0, cached: false };
    }
    
    const data = await response.json() as { result: string; status: string };
    const score = parseFloat(data.result);
    
    if (isNaN(score) || score < 0) {
      console.log(`[VPN Check] Invalid score for ${ip}: ${data.result}`);
      return { isVpn: false, score: 0, cached: false };
    }
    
    const isVpn = score >= VPN_THRESHOLD;
    
    vpnCheckCache.set(ip, { isVpn, score, checkedAt: Date.now() });
    
    if (isVpn) {
      console.log(`[VPN Check] VPN/Proxy detected for ${ip} (score: ${score.toFixed(2)})`);
    }
    
    return { isVpn, score, cached: false };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log(`[VPN Check] Timeout checking ${ip}`);
    } else {
      console.log(`[VPN Check] Error checking ${ip}: ${error.message}`);
    }
    return { isVpn: false, score: 0, cached: false };
  }
}

export async function checkVpnAsync(ip: string): Promise<{ isVpn: boolean; score: number; source: string }> {
  const basicCheck = checkVpnBasic(ip);
  if (basicCheck.isVpn) {
    return { isVpn: true, score: 1.0, source: "basic" };
  }
  
  const apiCheck = await checkVpnGetIPIntel(ip);
  return { 
    isVpn: apiCheck.isVpn, 
    score: apiCheck.score, 
    source: apiCheck.cached ? "cache" : "getipintel" 
  };
}

export function getWalletIPStats(walletAddress: string): {
  ipCount: number;
  primaryIp?: string;
  flagged: boolean;
} {
  const binding = walletIpBindings.get(walletAddress.toLowerCase());
  if (!binding) {
    return { ipCount: 0, flagged: false };
  }
  
  return {
    ipCount: binding.ips.size,
    primaryIp: binding.primaryIp,
    flagged: binding.flagged,
  };
}

export function getIPStats(ip: string): {
  walletCount: number;
  requestCount: number;
  flagged: boolean;
  flags: string[];
} {
  const activity = ipActivity.get(ip);
  if (!activity) {
    return { walletCount: 0, requestCount: 0, flagged: false, flags: [] };
  }
  
  return {
    walletCount: activity.wallets.size,
    requestCount: activity.requestCount,
    flagged: activity.flagged,
    flags: activity.flags,
  };
}

export function isPaymentTxUsed(txHash: string): boolean {
  return usedPaymentTxHashes.has(txHash.toLowerCase());
}

export function markPaymentTxUsed(txHash: string): void {
  usedPaymentTxHashes.add(txHash.toLowerCase());
}

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const wallet = req.headers["x-wallet-address"] as string;
    return wallet ? `${ip}:${wallet}` : ip;
  },
});

export const quizRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many quiz attempts, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const wallet = req.headers["x-wallet-address"] as string;
    return wallet ? `quiz:${ip}:${wallet}` : `quiz:${ip}`;
  },
});

export const rewardRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many reward requests, please wait" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const wallet = req.headers["x-wallet-address"] as string;
    return wallet ? `reward:${ip}:${wallet}` : `reward:${ip}`;
  },
});

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  const activity = trackIPActivity(req);
  const ip = getClientIP(req);
  
  (req as any).clientIP = ip;
  (req as any).ipActivity = activity;
  
  const vpnCheck = checkVpnBasic(ip);
  if (vpnCheck.isVpn) {
    activity.isVpn = true;
    if (!activity.flags.includes("VPN_DETECTED")) {
      activity.flags.push("VPN_DETECTED");
    }
  }
  
  next();
}

export function validateQuizAnswers(answers: any, questionCount: number): { valid: boolean; error?: string } {
  if (!Array.isArray(answers)) {
    return { valid: false, error: "Answers must be an array" };
  }
  
  if (answers.length !== questionCount) {
    return { valid: false, error: `Expected ${questionCount} answers, got ${answers.length}` };
  }
  
  for (let i = 0; i < answers.length; i++) {
    if (typeof answers[i] !== "number" || answers[i] < 0 || answers[i] > 3) {
      return { valid: false, error: `Invalid answer at index ${i}` };
    }
  }
  
  return { valid: true };
}

export function getSecurityFlags(req: Request): string[] {
  const flags: string[] = [];
  const activity = (req as any).ipActivity as IPActivity;
  
  if (activity) {
    if (activity.flagged) {
      activity.flags.forEach(f => flags.push(f));
    }
    if (activity.isVpn) flags.push("VPN_SUSPECTED");
  }
  
  const walletAddress = req.headers["x-wallet-address"] as string;
  if (walletAddress) {
    const walletStats = getWalletIPStats(walletAddress);
    if (walletStats.flagged) flags.push("MULTI_IP_WALLET");
  }
  
  return Array.from(new Set(flags));
}
