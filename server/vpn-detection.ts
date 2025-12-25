/**
 * VPN/Proxy Detection Service for Kaspa University
 * 
 * Provides multiple VPN detection sources:
 * - Primary: GetIPIntel API (90% confidence threshold)
 * - Backup: IP-API (when primary is unavailable or rate limited)
 * - Fallback: Basic datacenter IP range detection
 * 
 * Features:
 * - 6-hour cache to reduce API calls
 * - Automatic failover between services
 * - Combined confidence scoring
 */

interface VpnCheckResult {
  isVpn: boolean;
  score: number;
  source: "getipintel" | "ipapi" | "basic" | "cache";
  cached: boolean;
  details?: {
    isp?: string;
    org?: string;
    proxy?: boolean;
    hosting?: boolean;
  };
}

interface CacheEntry {
  result: VpnCheckResult;
  checkedAt: number;
}

const VPN_CACHE_TTL = 6 * 60 * 60 * 1000;
const VPN_THRESHOLD = 0.90;
const GETIPINTEL_CONTACT = process.env.GETIPINTEL_CONTACT || "kaspauniversity@proton.me";

const vpnCache: Map<string, CacheEntry> = new Map();

const DATACENTER_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.64\./,
  /^127\./,
];

const KNOWN_VPN_ISPS = [
  "mullvad",
  "nordvpn",
  "expressvpn",
  "cyberghost",
  "surfshark",
  "protonvpn",
  "privateinternetaccess",
  "pia",
  "ipvanish",
  "tunnelbear",
  "windscribe",
  "hide.me",
  "purevpn",
  "hotspot shield",
];

function isDatacenterIP(ip: string): boolean {
  return DATACENTER_IP_RANGES.some(regex => regex.test(ip));
}

function isLocalOrInvalidIP(ip: string): boolean {
  return ip === "unknown" || ip === "::1" || ip === "127.0.0.1" || ip === "localhost";
}

async function checkVpnGetIPIntel(ip: string): Promise<VpnCheckResult | null> {
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
      console.log(`[VPN] GetIPIntel returned ${response.status} for ${ip}`);
      return null;
    }
    
    const data = await response.json() as { result: string; status: string };
    const score = parseFloat(data.result);
    
    if (isNaN(score) || score < 0) {
      console.log(`[VPN] Invalid GetIPIntel score for ${ip}: ${data.result}`);
      return null;
    }
    
    return {
      isVpn: score >= VPN_THRESHOLD,
      score,
      source: "getipintel",
      cached: false,
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log(`[VPN] GetIPIntel timeout for ${ip}`);
    } else {
      console.log(`[VPN] GetIPIntel error for ${ip}: ${error.message}`);
    }
    return null;
  }
}

async function checkVpnIPAPI(ip: string): Promise<VpnCheckResult | null> {
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,isp,org,proxy,hosting`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`[VPN] IP-API returned ${response.status} for ${ip}`);
      return null;
    }
    
    const data = await response.json() as {
      status: string;
      message?: string;
      isp?: string;
      org?: string;
      proxy?: boolean;
      hosting?: boolean;
    };
    
    if (data.status !== "success") {
      console.log(`[VPN] IP-API error for ${ip}: ${data.message}`);
      return null;
    }
    
    const ispLower = (data.isp || "").toLowerCase();
    const orgLower = (data.org || "").toLowerCase();
    
    const isKnownVpnProvider = KNOWN_VPN_ISPS.some(
      vpn => ispLower.includes(vpn) || orgLower.includes(vpn)
    );
    
    let score = 0;
    if (data.proxy) score += 0.5;
    if (data.hosting) score += 0.3;
    if (isKnownVpnProvider) score += 0.5;
    
    score = Math.min(score, 1.0);
    
    return {
      isVpn: data.proxy === true || data.hosting === true || isKnownVpnProvider,
      score,
      source: "ipapi",
      cached: false,
      details: {
        isp: data.isp,
        org: data.org,
        proxy: data.proxy,
        hosting: data.hosting,
      },
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log(`[VPN] IP-API timeout for ${ip}`);
    } else {
      console.log(`[VPN] IP-API error for ${ip}: ${error.message}`);
    }
    return null;
  }
}

function checkVpnBasic(ip: string): VpnCheckResult {
  const isDatacenter = isDatacenterIP(ip);
  
  return {
    isVpn: isDatacenter,
    score: isDatacenter ? 1.0 : 0,
    source: "basic",
    cached: false,
  };
}

export async function checkVpn(ip: string): Promise<VpnCheckResult> {
  if (isLocalOrInvalidIP(ip)) {
    return {
      isVpn: false,
      score: 0,
      source: "basic",
      cached: false,
    };
  }
  
  const cached = vpnCache.get(ip);
  if (cached && Date.now() - cached.checkedAt < VPN_CACHE_TTL) {
    return { ...cached.result, cached: true, source: "cache" };
  }
  
  const basicCheck = checkVpnBasic(ip);
  if (basicCheck.isVpn) {
    const result = { ...basicCheck, cached: false };
    vpnCache.set(ip, { result, checkedAt: Date.now() });
    return result;
  }
  
  const getIPIntelResult = await checkVpnGetIPIntel(ip);
  if (getIPIntelResult) {
    vpnCache.set(ip, { result: getIPIntelResult, checkedAt: Date.now() });
    if (getIPIntelResult.isVpn) {
      console.log(`[VPN] Detected via GetIPIntel: ${ip} (score: ${getIPIntelResult.score.toFixed(2)})`);
    }
    return getIPIntelResult;
  }
  
  const ipApiResult = await checkVpnIPAPI(ip);
  if (ipApiResult) {
    vpnCache.set(ip, { result: ipApiResult, checkedAt: Date.now() });
    if (ipApiResult.isVpn) {
      console.log(`[VPN] Detected via IP-API: ${ip} (proxy: ${ipApiResult.details?.proxy}, hosting: ${ipApiResult.details?.hosting})`);
    }
    return ipApiResult;
  }
  
  console.log(`[VPN] All API checks failed for ${ip}, using basic detection`);
  vpnCache.set(ip, { result: basicCheck, checkedAt: Date.now() });
  return basicCheck;
}

export async function checkVpnWithDetails(ip: string): Promise<{
  isVpn: boolean;
  score: number;
  sources: Array<{ source: string; result: VpnCheckResult | null }>;
  finalSource: string;
}> {
  if (isLocalOrInvalidIP(ip)) {
    return {
      isVpn: false,
      score: 0,
      sources: [{ source: "basic", result: { isVpn: false, score: 0, source: "basic", cached: false } }],
      finalSource: "basic",
    };
  }

  const sources: Array<{ source: string; result: VpnCheckResult | null }> = [];
  
  const basicCheck = checkVpnBasic(ip);
  sources.push({ source: "basic", result: basicCheck });
  
  const getIPIntelResult = await checkVpnGetIPIntel(ip);
  sources.push({ source: "getipintel", result: getIPIntelResult });
  
  const ipApiResult = await checkVpnIPAPI(ip);
  sources.push({ source: "ipapi", result: ipApiResult });
  
  let finalResult: VpnCheckResult = basicCheck;
  let finalSource = "basic";
  
  if (getIPIntelResult && getIPIntelResult.score > finalResult.score) {
    finalResult = getIPIntelResult;
    finalSource = "getipintel";
  }
  
  if (ipApiResult && ipApiResult.score > finalResult.score) {
    finalResult = ipApiResult;
    finalSource = "ipapi";
  }
  
  vpnCache.set(ip, { result: finalResult, checkedAt: Date.now() });
  
  return {
    isVpn: finalResult.isVpn,
    score: finalResult.score,
    sources,
    finalSource,
  };
}

export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: vpnCache.size,
    hitRate: 0,
  };
}

export function clearCache(): void {
  vpnCache.clear();
}

setInterval(() => {
  const now = Date.now();
  let expired = 0;
  
  for (const [ip, entry] of Array.from(vpnCache.entries())) {
    if (now - entry.checkedAt > VPN_CACHE_TTL) {
      vpnCache.delete(ip);
      expired++;
    }
  }
  
  if (expired > 0) {
    console.log(`[VPN] Cleaned up ${expired} expired cache entries`);
  }
}, 60 * 60 * 1000);
