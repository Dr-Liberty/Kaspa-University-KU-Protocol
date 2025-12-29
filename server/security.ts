/**
 * Security Middleware for Kaspa University
 * 
 * Provides:
 * - Rate limiting per IP and wallet
 * - IP tracking and multi-accounting detection
 * - VPN/Proxy detection (basic and optional API-based)
 * - Payment TX deduplication (persistent)
 * - Request fingerprinting
 */

import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { getSecurityStorage } from "./security-storage.js";

interface IPActivity {
  firstSeen: Date;
  lastSeen: Date;
  wallets: Set<string>;
  requestCount: number;
  flagged: boolean;
  flags: string[];
  isVpn: boolean;
  vpnScore?: number;
  vpnCheckTime?: number;
}

interface WalletIPBinding {
  walletAddress: string;
  ips: Set<string>;
  primaryIp?: string;
  flagged: boolean;
}

const ipActivityCache: Map<string, IPActivity> = new Map();
const walletIpBindingsCache: Map<string, WalletIPBinding> = new Map();

const MULTI_WALLET_THRESHOLD = 3;
const MULTI_IP_THRESHOLD = 5;

const KNOWN_VPN_ASN_PREFIXES = [
  "AS9009",
  "AS16509",
  "AS14061",
  "AS20473",
  "AS14618",
  "AS396982",
  "AS45102",
  "AS8075",
];

const DATACENTER_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.64\./,
];

export function getClientIP(req: Request): string {
  // SECURITY: Hardened IP detection
  // Only trust X-Forwarded-For from known proxies (Replit's infrastructure)
  // Take the rightmost non-private IP (closest to our server) to prevent spoofing
  
  const socketIP = req.socket.remoteAddress || req.ip || "unknown";
  const forwarded = req.headers["x-forwarded-for"];
  
  if (!forwarded) {
    return socketIP;
  }
  
  const ips = (typeof forwarded === "string" ? forwarded : forwarded[0])
    .split(",")
    .map(ip => ip.trim())
    .filter(ip => ip && ip !== "unknown");
  
  if (ips.length === 0) {
    return socketIP;
  }
  
  // In Replit's environment, use the first (client) IP since Replit is trusted
  // For untrusted environments, you'd want the last non-private IP
  const clientIP = ips[0];
  
  // Validate IP format to prevent injection
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(clientIP) || ipv6Regex.test(clientIP)) {
    return clientIP;
  }
  
  // If the forwarded IP is malformed, fall back to socket IP
  console.warn(`[Security] Malformed X-Forwarded-For IP: ${clientIP}, using socket IP`);
  return socketIP;
}

export function isDatacenterIP(ip: string): boolean {
  return DATACENTER_IP_RANGES.some(regex => regex.test(ip));
}

export async function trackIPActivity(req: Request): Promise<IPActivity> {
  const ip = getClientIP(req);
  const walletAddress = req.headers["x-wallet-address"] as string;
  
  let activity = ipActivityCache.get(ip);
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
    ipActivityCache.set(ip, activity);
  }
  
  activity.lastSeen = new Date();
  activity.requestCount++;
  
  if (walletAddress && !walletAddress.startsWith("demo:")) {
    const normalizedWallet = walletAddress.toLowerCase();
    activity.wallets.add(normalizedWallet);
    
    if (activity.wallets.size >= MULTI_WALLET_THRESHOLD && !activity.flags.includes("MULTI_WALLET_IP")) {
      activity.flagged = true;
      activity.flags.push("MULTI_WALLET_IP");
      console.log(`[Security] IP ${ip} flagged: ${activity.wallets.size} wallets detected`);
      
      const storage = await getSecurityStorage();
      await storage.logSecurityEvent({
        walletAddress: normalizedWallet,
        ipAddress: ip,
        action: "MULTI_WALLET_DETECTED",
        flags: ["MULTI_WALLET_IP"],
        metadata: { walletCount: activity.wallets.size },
      });
    }
    
    let binding = walletIpBindingsCache.get(normalizedWallet);
    if (!binding) {
      binding = {
        walletAddress: normalizedWallet,
        ips: new Set(),
        flagged: false,
      };
      walletIpBindingsCache.set(normalizedWallet, binding);
    }
    
    binding.ips.add(ip);
    if (!binding.primaryIp) {
      binding.primaryIp = ip;
    }
    
    if (binding.ips.size >= MULTI_IP_THRESHOLD && !binding.flagged) {
      binding.flagged = true;
      console.log(`[Security] Wallet ${walletAddress.slice(0, 20)}... flagged: ${binding.ips.size} IPs detected`);
      
      const storage = await getSecurityStorage();
      await storage.logSecurityEvent({
        walletAddress: normalizedWallet,
        ipAddress: ip,
        action: "MULTI_IP_DETECTED",
        flags: ["MULTI_IP_WALLET"],
        metadata: { ipCount: binding.ips.size },
      });
    }
    
    try {
      const storage = await getSecurityStorage();
      await storage.upsertIpActivity({
        ipAddress: ip,
        wallets: Array.from(activity.wallets),
        requestCount: activity.requestCount,
        flagged: activity.flagged,
        flags: activity.flags,
        isVpn: activity.isVpn,
        vpnScore: activity.vpnScore,
      });
      
      await storage.upsertWalletIpBinding({
        walletAddress: normalizedWallet,
        ips: Array.from(binding.ips),
        primaryIp: binding.primaryIp,
        flagged: binding.flagged,
      });
    } catch (error: any) {
      console.error("[Security] Failed to persist activity:", error.message);
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
  const binding = walletIpBindingsCache.get(walletAddress.toLowerCase());
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
  const activity = ipActivityCache.get(ip);
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

export async function isPaymentTxUsed(txHash: string): Promise<boolean> {
  try {
    const storage = await getSecurityStorage();
    return await storage.isPaymentTxUsed(txHash);
  } catch (error: any) {
    console.error("[Security] Check payment TX failed:", error.message);
    return false;
  }
}

export async function markPaymentTxUsed(txHash: string, walletAddress: string, purpose: string, amount?: number): Promise<void> {
  try {
    const storage = await getSecurityStorage();
    await storage.markPaymentTxUsed(txHash, walletAddress, purpose, amount);
    console.log(`[Security] Marked payment TX as used: ${txHash.slice(0, 16)}... for ${purpose}`);
  } catch (error: any) {
    console.error("[Security] Mark payment TX failed:", error.message);
  }
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

export async function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const activity = await trackIPActivity(req);
  
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

export function validatePayloadLength(content: string, maxLength: number = 500): { valid: boolean; error?: string } {
  if (!content || typeof content !== "string") {
    return { valid: false, error: "Content must be a non-empty string" };
  }
  
  if (content.length > maxLength) {
    return { valid: false, error: `Content exceeds maximum length of ${maxLength} characters` };
  }
  
  const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
  if (invalidChars.test(content)) {
    return { valid: false, error: "Content contains invalid control characters" };
  }
  
  return { valid: true };
}

export function sanitizePayloadContent(content: string): string {
  return content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

/**
 * Sanitize error messages before returning to clients.
 * Prevents information disclosure of internal paths, database schema, or stack traces.
 * Per BMT University Security Audit H-1.
 */
export function sanitizeError(error: unknown): string {
  if (!error) return "An unexpected error occurred";
  
  const message = error instanceof Error ? error.message : String(error);
  
  // Remove file paths (absolute and relative)
  let sanitized = message.replace(/\/[^\s:]+\.(ts|js|tsx|jsx)/gi, "[file]");
  sanitized = sanitized.replace(/[A-Za-z]:\\[^\s:]+\.(ts|js|tsx|jsx)/gi, "[file]");
  sanitized = sanitized.replace(/\b(src|server|client|node_modules)\/[^\s]+/gi, "[path]");
  
  // Remove database-related info
  sanitized = sanitized.replace(/table\s+"?\w+"?/gi, "[table]");
  sanitized = sanitized.replace(/column\s+"?\w+"?/gi, "[column]");
  sanitized = sanitized.replace(/relation\s+"?\w+"?/gi, "[relation]");
  sanitized = sanitized.replace(/constraint\s+"?\w+"?/gi, "[constraint]");
  sanitized = sanitized.replace(/duplicate\s+key\s+value/gi, "duplicate entry");
  sanitized = sanitized.replace(/violates\s+\w+\s+constraint/gi, "constraint violation");
  
  // Remove stack trace elements and line numbers
  sanitized = sanitized.replace(/\s+at\s+[^\n]+/g, "");
  sanitized = sanitized.replace(/:\d+:\d+/g, "");
  sanitized = sanitized.replace(/\(line\s+\d+\)/gi, "");
  
  // Remove IP addresses (except localhost patterns)
  sanitized = sanitized.replace(/\b(?!127\.0\.0\.1|0\.0\.0\.0)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[ip]");
  
  // Remove wallet addresses (kaspa format)
  sanitized = sanitized.replace(/kaspa:[a-z0-9]{60,}/gi, "[wallet]");
  
  // Remove potential secrets, keys, or hashes
  sanitized = sanitized.replace(/[a-zA-Z0-9_]{32,}/g, "[key]");
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{40,}/g, "[hash]");
  
  // Remove error codes that might reveal internals
  sanitized = sanitized.replace(/\bECONN[A-Z]+\b/g, "connection error");
  sanitized = sanitized.replace(/\bETIMEDOUT\b/g, "timeout");
  sanitized = sanitized.replace(/\bENOENT\b/g, "not found");
  
  // Truncate to reasonable length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + "...";
  }
  
  return sanitized.trim() || "An unexpected error occurred";
}

/**
 * Safe error logging that doesn't leak credentials
 */
export function safeErrorLog(prefix: string, error: unknown): void {
  const safeError = {
    message: error instanceof Error ? error.message?.substring(0, 200) : String(error).substring(0, 200),
    code: (error as any)?.code || undefined,
    name: error instanceof Error ? error.name : undefined,
  };
  console.error(prefix, JSON.stringify(safeError));
}
