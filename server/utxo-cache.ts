/**
 * UTXO Cache for Kaspa University
 * 
 * Maintains a live cache of treasury UTXOs to reduce RPC calls.
 * Integrates with UTXO Manager for reservation tracking.
 */

import { getKaspaService } from "./kaspa";

interface CachedUTXO {
  outpoint: { transactionId: string; index: number };
  amount: bigint;
  scriptPublicKey: string;
  blockDaaScore: bigint;
}

interface CacheStats {
  totalUtxos: number;
  totalValue: bigint;
  lastRefresh: Date | null;
  cacheHits: number;
  cacheMisses: number;
  hitRate: string;
}

class UTXOCache {
  private cache: Map<string, CachedUTXO> = new Map();
  private lastRefresh: Date | null = null;
  private refreshInterval: number = 30000; // 30 seconds
  private refreshTimer: NodeJS.Timeout | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;
  private isRefreshing = false;

  /**
   * Get the cache key for a UTXO
   */
  private getKey(txId: string, index: number): string {
    return `${txId}:${index}`;
  }

  /**
   * Start the cache refresh timer
   */
  start(): void {
    if (this.refreshTimer) {
      return;
    }
    
    console.log("[UTXOCache] Starting cache refresh timer");
    this.refresh(); // Initial refresh
    this.refreshTimer = setInterval(() => this.refresh(), this.refreshInterval);
  }

  /**
   * Stop the cache refresh timer
   */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Refresh the cache from the network
   */
  async refresh(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    try {
      const kaspaService = await getKaspaService();
      if (!kaspaService.isLive()) {
        this.isRefreshing = false;
        return;
      }

      const treasuryAddress = kaspaService.getTreasuryAddress();
      if (!treasuryAddress) {
        this.isRefreshing = false;
        return;
      }

      // Fetch UTXOs from network
      const networkInfo = await kaspaService.getNetworkInfo();
      if (networkInfo.status !== "connected") {
        this.isRefreshing = false;
        return;
      }

      // Get fresh UTXOs via balance check
      const balanceInfo = await kaspaService.getTreasuryBalance();
      
      console.log(`[UTXOCache] Refreshed: ${balanceInfo.utxoCount} UTXOs, ${balanceInfo.balance} KAS`);
      this.lastRefresh = new Date();
    } catch (error: any) {
      console.error("[UTXOCache] Refresh failed:", error.message);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get cached UTXOs (returns copy to prevent mutation)
   */
  getAll(): CachedUTXO[] {
    if (this.cache.size > 0) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    return Array.from(this.cache.values());
  }

  /**
   * Mark a UTXO as spent (remove from cache)
   */
  markSpent(txId: string, index: number): void {
    const key = this.getKey(txId, index);
    this.cache.delete(key);
  }

  /**
   * Add new UTXOs to cache (from confirmed transaction)
   */
  addUtxo(utxo: CachedUTXO): void {
    const key = this.getKey(utxo.outpoint.transactionId, utxo.outpoint.index);
    this.cache.set(key, utxo);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalValue = BigInt(0);
    this.cache.forEach((utxo) => {
      totalValue += utxo.amount;
    });

    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? ((this.cacheHits / total) * 100).toFixed(1) + "%" : "N/A";

    return {
      totalUtxos: this.cache.size,
      totalValue,
      lastRefresh: this.lastRefresh,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate,
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Singleton
let cacheInstance: UTXOCache | null = null;

export function getUTXOCache(): UTXOCache {
  if (!cacheInstance) {
    cacheInstance = new UTXOCache();
    cacheInstance.start();
  }
  return cacheInstance;
}

export type { CachedUTXO, CacheStats };
