/**
 * In-Memory TTL Cache for Kaspa University
 * 
 * Provides simple TTL-based caching for expensive operations
 * like VPN checks, stats queries, and analytics data.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private hits = 0;
  private misses = 0;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultTTLMs: number = 60000) {
    this.defaultTTL = defaultTTLMs;
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];
      
      this.cache.forEach((entry, key) => {
        if (entry.expiresAt < now) {
          toDelete.push(key);
        }
      });

      toDelete.forEach(key => this.cache.delete(key));
    }, 60000); // Cleanup every minute
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + "%" : "N/A";
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// VPN check cache (6 hours TTL, as per GetIPIntel recommendations)
const vpnCache = new TTLCache<{ isVpn: boolean; score: number; source: string }>(6 * 60 * 60 * 1000);

// Stats cache (5 minutes TTL)
const statsCache = new TTLCache<Record<string, any>>(5 * 60 * 1000);

// Analytics cache (5 minutes TTL)
const analyticsCache = new TTLCache<Record<string, any>>(5 * 60 * 1000);

// Security flags cache (1 minute TTL - needs to be more responsive)
const securityFlagsCache = new TTLCache<Record<string, any>>(60 * 1000);

export { vpnCache, statsCache, analyticsCache, securityFlagsCache, TTLCache };
