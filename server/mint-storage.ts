/**
 * Mint Reservation Storage Service
 * 
 * Persists pending NFT mint reservations to the database for non-custodial minting.
 * This ensures user funds are not lost on server restarts.
 */

import { db } from "./db";
import { pendingMintReservations } from "./db/schema";
import { eq, lt, and, or } from "drizzle-orm";

export interface PendingMintReservation {
  id: string;
  certificateId: string;
  recipientAddress: string;
  tokenId: number;
  p2shAddress: string;
  scriptData: string;
  mintData: string;
  commitTxHash?: string | null;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  finalizedAt?: Date | null;
}

class MintStorageService {
  /**
   * Create a new pending mint reservation
   */
  async createReservation(data: {
    certificateId: string;
    recipientAddress: string;
    tokenId: number;
    p2shAddress: string;
    scriptData: any;
    mintData: any;
    expiresAt: Date;
  }): Promise<PendingMintReservation | null> {
    try {
      const [reservation] = await db.insert(pendingMintReservations).values({
        certificateId: data.certificateId,
        recipientAddress: data.recipientAddress,
        tokenId: data.tokenId,
        p2shAddress: data.p2shAddress,
        scriptData: JSON.stringify(data.scriptData),
        mintData: JSON.stringify(data.mintData),
        status: "pending",
        expiresAt: data.expiresAt,
      }).returning();
      
      return reservation as PendingMintReservation;
    } catch (error: any) {
      console.error("[MintStorage] Failed to create reservation:", error.message);
      return null;
    }
  }

  /**
   * Get a reservation by P2SH address
   */
  async getByP2shAddress(p2shAddress: string): Promise<PendingMintReservation | null> {
    try {
      const [reservation] = await db
        .select()
        .from(pendingMintReservations)
        .where(eq(pendingMintReservations.p2shAddress, p2shAddress))
        .limit(1);
      
      return reservation as PendingMintReservation | null;
    } catch (error: any) {
      console.error("[MintStorage] Failed to get reservation:", error.message);
      return null;
    }
  }

  /**
   * Get a reservation by certificate ID
   */
  async getByCertificateId(certificateId: string): Promise<PendingMintReservation | null> {
    try {
      const [reservation] = await db
        .select()
        .from(pendingMintReservations)
        .where(eq(pendingMintReservations.certificateId, certificateId))
        .limit(1);
      
      return reservation as PendingMintReservation | null;
    } catch (error: any) {
      console.error("[MintStorage] Failed to get reservation by certificate:", error.message);
      return null;
    }
  }

  /**
   * Check if a certificate has an active (non-expired) reservation
   */
  async hasActiveReservation(certificateId: string): Promise<boolean> {
    const reservation = await this.getByCertificateId(certificateId);
    if (!reservation) return false;
    
    const now = new Date();
    return reservation.expiresAt > now && reservation.status === "pending";
  }

  /**
   * Update reservation with commit transaction hash
   */
  async updateCommitTx(p2shAddress: string, commitTxHash: string): Promise<boolean> {
    try {
      await db
        .update(pendingMintReservations)
        .set({ 
          commitTxHash,
          status: "paid"
        })
        .where(eq(pendingMintReservations.p2shAddress, p2shAddress));
      
      return true;
    } catch (error: any) {
      console.error("[MintStorage] Failed to update commit tx:", error.message);
      return false;
    }
  }

  /**
   * Mark reservation as finalized
   */
  async markFinalized(p2shAddress: string): Promise<boolean> {
    try {
      await db
        .update(pendingMintReservations)
        .set({ 
          status: "finalized",
          finalizedAt: new Date()
        })
        .where(eq(pendingMintReservations.p2shAddress, p2shAddress));
      
      return true;
    } catch (error: any) {
      console.error("[MintStorage] Failed to mark finalized:", error.message);
      return false;
    }
  }

  /**
   * Mark reservation as failed
   */
  async markFailed(p2shAddress: string): Promise<boolean> {
    try {
      await db
        .update(pendingMintReservations)
        .set({ status: "failed" })
        .where(eq(pendingMintReservations.p2shAddress, p2shAddress));
      
      return true;
    } catch (error: any) {
      console.error("[MintStorage] Failed to mark failed:", error.message);
      return false;
    }
  }

  /**
   * Mark expired reservations
   */
  async markExpiredReservations(): Promise<string[]> {
    try {
      const now = new Date();
      const expired = await db
        .select()
        .from(pendingMintReservations)
        .where(
          and(
            lt(pendingMintReservations.expiresAt, now),
            eq(pendingMintReservations.status, "pending")
          )
        );
      
      if (expired.length > 0) {
        await db
          .update(pendingMintReservations)
          .set({ status: "expired" })
          .where(
            and(
              lt(pendingMintReservations.expiresAt, now),
              eq(pendingMintReservations.status, "pending")
            )
          );
      }
      
      return expired.map(r => r.certificateId);
    } catch (error: any) {
      console.error("[MintStorage] Failed to mark expired:", error.message);
      return [];
    }
  }

  /**
   * Delete a reservation (for cleanup)
   */
  async deleteReservation(p2shAddress: string): Promise<boolean> {
    try {
      await db
        .delete(pendingMintReservations)
        .where(eq(pendingMintReservations.p2shAddress, p2shAddress));
      
      return true;
    } catch (error: any) {
      console.error("[MintStorage] Failed to delete reservation:", error.message);
      return false;
    }
  }

  /**
   * Clean up old finalized/failed reservations (keep for 7 days)
   */
  async cleanupOldReservations(): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await db
        .delete(pendingMintReservations)
        .where(
          and(
            lt(pendingMintReservations.createdAt, cutoff),
            or(
              eq(pendingMintReservations.status, "finalized"),
              eq(pendingMintReservations.status, "failed")
            )
          )
        );
      
      return 0; // Drizzle doesn't return count easily
    } catch (error: any) {
      console.error("[MintStorage] Failed to cleanup old reservations:", error.message);
      return 0;
    }
  }
}

export const mintStorage = new MintStorageService();
