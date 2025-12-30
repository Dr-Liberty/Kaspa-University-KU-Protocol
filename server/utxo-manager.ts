/**
 * UTXO Manager for Kaspa University
 * 
 * Handles:
 * - UTXO selection and locking
 * - Prevents race conditions on concurrent transactions
 * - Transaction confirmation verification
 */

import { createHash } from "crypto";

interface UTXO {
  txId: string;
  index: number;
  amount: bigint;
  scriptPublicKey: string;
}

interface ReservedUTXO {
  utxo: UTXO;
  reservedAt: number;
  expiresAt: number;
  purpose: string;
  txHash?: string;
}

interface TransactionStatus {
  txHash: string;
  status: "pending" | "confirmed" | "failed" | "unknown";
  confirmations: number;
  checkedAt: number;
}

const RESERVATION_TIMEOUT_MS = 60 * 1000;
const CONFIRMATION_CACHE_TTL_MS = 30 * 1000;
const MAX_CONFIRMATION_WAIT_MS = 60 * 1000;

class UTXOManager {
  private reservedUtxos: Map<string, ReservedUTXO> = new Map();
  private transactionStatuses: Map<string, TransactionStatus> = new Map();
  private mutex: Promise<void> = Promise.resolve();

  private getUtxoKey(utxo: UTXO): string {
    return `${utxo.txId}:${utxo.index}`;
  }

  async selectAndReserve(
    availableUtxos: UTXO[],
    requiredAmount: bigint,
    purpose: string
  ): Promise<{ selected: UTXO[]; total: bigint } | null> {
    return this.withMutex(async () => {
      this.cleanupExpiredReservations();
      
      const unreservedUtxos = availableUtxos.filter(
        utxo => !this.reservedUtxos.has(this.getUtxoKey(utxo))
      );
      
      unreservedUtxos.sort((a, b) => Number(b.amount - a.amount));
      
      const selected: UTXO[] = [];
      let total = BigInt(0);
      
      for (const utxo of unreservedUtxos) {
        if (total >= requiredAmount) break;
        selected.push(utxo);
        total += utxo.amount;
      }
      
      if (total < requiredAmount) {
        console.log(`[UTXO] Insufficient funds: need ${requiredAmount}, available ${total}`);
        return null;
      }
      
      const now = Date.now();
      for (const utxo of selected) {
        const key = this.getUtxoKey(utxo);
        this.reservedUtxos.set(key, {
          utxo,
          reservedAt: now,
          expiresAt: now + RESERVATION_TIMEOUT_MS,
          purpose,
        });
      }
      
      console.log(`[UTXO] Reserved ${selected.length} UTXOs (${total} sompi) for ${purpose}`);
      return { selected, total };
    });
  }

  async markAsSpent(utxos: UTXO[], txHash: string): Promise<void> {
    return this.withMutex(async () => {
      for (const utxo of utxos) {
        const key = this.getUtxoKey(utxo);
        const reserved = this.reservedUtxos.get(key);
        if (reserved) {
          reserved.txHash = txHash;
          reserved.expiresAt = Date.now() + 5 * 60 * 1000;
        }
      }
      
      this.transactionStatuses.set(txHash, {
        txHash,
        status: "pending",
        confirmations: 0,
        checkedAt: Date.now(),
      });
      
      console.log(`[UTXO] Marked ${utxos.length} UTXOs as spent in tx ${txHash.slice(0, 16)}...`);
    });
  }

  async releaseReservation(utxos: UTXO[]): Promise<void> {
    return this.withMutex(async () => {
      for (const utxo of utxos) {
        const key = this.getUtxoKey(utxo);
        this.reservedUtxos.delete(key);
      }
      console.log(`[UTXO] Released ${utxos.length} UTXO reservations`);
    });
  }

  async waitForConfirmation(
    txHash: string,
    checkFn: (hash: string) => Promise<{ confirmed: boolean; confirmations: number }>,
    maxWaitMs: number = MAX_CONFIRMATION_WAIT_MS
  ): Promise<{ confirmed: boolean; confirmations: number }> {
    const cached = this.transactionStatuses.get(txHash);
    if (cached && cached.status === "confirmed") {
      return { confirmed: true, confirmations: cached.confirmations };
    }
    
    const startTime = Date.now();
    let lastCheck = 0;
    
    while (Date.now() - startTime < maxWaitMs) {
      if (Date.now() - lastCheck < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - (Date.now() - lastCheck)));
      }
      
      lastCheck = Date.now();
      
      try {
        const result = await checkFn(txHash);
        
        if (result.confirmed) {
          this.transactionStatuses.set(txHash, {
            txHash,
            status: "confirmed",
            confirmations: result.confirmations,
            checkedAt: Date.now(),
          });
          
          this.cleanupConfirmedUtxos(txHash);
          
          return result;
        }
      } catch (error: any) {
        console.log(`[UTXO] Confirmation check error for ${txHash.slice(0, 16)}...: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`[UTXO] Confirmation timeout for ${txHash.slice(0, 16)}...`);
    return { confirmed: false, confirmations: 0 };
  }

  isUtxoReserved(utxo: UTXO): boolean {
    const key = this.getUtxoKey(utxo);
    const reserved = this.reservedUtxos.get(key);
    
    if (!reserved) return false;
    
    if (Date.now() > reserved.expiresAt) {
      this.reservedUtxos.delete(key);
      return false;
    }
    
    return true;
  }

  getTransactionStatus(txHash: string): TransactionStatus | undefined {
    return this.transactionStatuses.get(txHash);
  }

  getReservationCount(): number {
    this.cleanupExpiredReservations();
    return this.reservedUtxos.size;
  }

  private cleanupExpiredReservations(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, reserved] of Array.from(this.reservedUtxos.entries())) {
      if (now > reserved.expiresAt && !reserved.txHash) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.reservedUtxos.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`[UTXO] Cleaned up ${expiredKeys.length} expired reservations`);
    }
  }

  private cleanupConfirmedUtxos(txHash: string): void {
    const keysToRemove: string[] = [];
    
    for (const [key, reserved] of Array.from(this.reservedUtxos.entries())) {
      if (reserved.txHash === txHash) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.reservedUtxos.delete(key);
    }
  }

  private async withMutex<T>(fn: () => Promise<T>): Promise<T> {
    const release = this.mutex;
    let resolver: () => void;
    this.mutex = new Promise(resolve => { resolver = resolve; });
    
    await release;
    
    try {
      return await fn();
    } finally {
      resolver!();
    }
  }
}

let utxoManagerInstance: UTXOManager | null = null;

export function getUTXOManager(): UTXOManager {
  if (!utxoManagerInstance) {
    utxoManagerInstance = new UTXOManager();
  }
  return utxoManagerInstance;
}

export function resetUTXOManager(): void {
  if (utxoManagerInstance) {
    console.log("[UTXOManager] Resetting singleton instance for network switch");
    utxoManagerInstance = null;
  }
}

export { UTXOManager, UTXO, ReservedUTXO, TransactionStatus };
