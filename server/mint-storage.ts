/**
 * Mint Reservation Storage Service
 * 
 * Persists pending NFT mint reservations to the database for non-custodial minting.
 * This ensures user funds are not lost on server restarts.
 */

import { db } from "./db";
import { pendingMintReservations } from "./db/schema";
import { eq, lt, and, or, sql, desc } from "drizzle-orm";

export interface PendingMintReservation {
  id: string;
  certificateId: string;
  recipientAddress: string;
  tokenId: number;
  p2shAddress: string;
  xOnlyPubKey?: string | null; // Store pubkey for script reconstruction on restart
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
  private _lastError: string | null = null;
  
  getLastError(): string | null {
    return this._lastError;
  }

  async createReservation(data: {
    certificateId: string;
    recipientAddress: string;
    tokenId: number;
    p2shAddress: string;
    xOnlyPubKey?: string; // CRITICAL: Store pubkey for script reconstruction
    scriptData: any;
    mintData: any;
    expiresAt: Date;
  }): Promise<PendingMintReservation | null> {
    this._lastError = null;
    try {
      console.log(`[MintStorage] Creating reservation for cert ${data.certificateId}, P2SH: ${data.p2shAddress.slice(0, 25)}...`);
      console.log(`[MintStorage] Data: tokenId=${data.tokenId}, recipient=${data.recipientAddress.slice(0, 20)}...`);
      
      // CRITICAL: Delete ALL existing reservations for this certificate first
      // This prevents race conditions where multiple reservations exist
      const existingByCert = await this.getByCertificateId(data.certificateId);
      if (existingByCert) {
        console.log(`[MintStorage] Found existing reservation for cert ${data.certificateId}, deleting...`);
        await this.deleteReservation(existingByCert.p2shAddress);
      }
      
      // scriptData is already a string (the exact mintDataStr used in the script)
      // mintData is an object that needs to be stringified
      const scriptDataStr = typeof data.scriptData === 'string' 
        ? data.scriptData 
        : JSON.stringify(data.scriptData);
      const mintDataStr = typeof data.mintData === 'string' 
        ? data.mintData 
        : JSON.stringify(data.mintData);
      
      console.log(`[MintStorage] Inserting into database...`);
      const [reservation] = await db.insert(pendingMintReservations).values({
        certificateId: data.certificateId,
        recipientAddress: data.recipientAddress,
        tokenId: data.tokenId,
        p2shAddress: data.p2shAddress,
        xOnlyPubKey: data.xOnlyPubKey,
        scriptData: scriptDataStr,
        mintData: mintDataStr,
        status: "pending",
        expiresAt: data.expiresAt,
      }).returning();
      
      console.log(`[MintStorage] Reservation created successfully, ID: ${reservation?.id}`);
      return reservation as PendingMintReservation;
    } catch (error: any) {
      // Handle duplicate key constraint - return existing reservation if available
      if (error.code === "23505" && error.constraint?.includes("p2sh_address")) {
        console.log(`[MintStorage] P2SH address collision, checking for existing reservation...`);
        const existing = await this.getByCertificateId(data.certificateId);
        if (existing) {
          console.log(`[MintStorage] Returning existing reservation for cert ${data.certificateId}`);
          return existing;
        }
      }
      
      this._lastError = error.message || "Unknown database error";
      console.error("[MintStorage] Failed to create reservation:", error.message);
      console.error("[MintStorage] Error code:", error.code);
      console.error("[MintStorage] Error detail:", error.detail);
      console.error("[MintStorage] Full error:", error);
      return null;
    }
  }

  /**
   * Get a reservation by P2SH address
   */
  async getByP2shAddress(p2shAddress: string): Promise<PendingMintReservation | null> {
    try {
      console.log(`[MintStorage] Looking up reservation for P2SH: ${p2shAddress.slice(0, 25)}...`);
      const [reservation] = await db
        .select()
        .from(pendingMintReservations)
        .where(eq(pendingMintReservations.p2shAddress, p2shAddress))
        .limit(1);
      
      if (reservation) {
        console.log(`[MintStorage] Found reservation: ID=${reservation.id}, status=${reservation.status}`);
      } else {
        console.log(`[MintStorage] No reservation found for P2SH address`);
      }
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
   * Get the highest token ID from all reservations (for generating next token ID)
   */
  async getHighestTokenId(): Promise<number> {
    try {
      const result = await db
        .select({ maxTokenId: sql<number>`COALESCE(MAX(${pendingMintReservations.tokenId}), 0)` })
        .from(pendingMintReservations);
      
      const highestId = result[0]?.maxTokenId || 0;
      console.log(`[MintStorage] Highest token ID in reservations: ${highestId}`);
      return highestId;
    } catch (error: any) {
      console.error("[MintStorage] Failed to get highest token ID:", error.message);
      return 0;
    }
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
   * Delete a reservation by P2SH address (for cleanup)
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
   * Delete a reservation by ID
   */
  async deleteReservationById(id: string): Promise<boolean> {
    try {
      await db
        .delete(pendingMintReservations)
        .where(eq(pendingMintReservations.id, id));
      
      return true;
    } catch (error: any) {
      console.error("[MintStorage] Failed to delete reservation by id:", error.message);
      return false;
    }
  }

  /**
   * Delete reservations by certificate ID
   */
  async deleteReservationByCertificateId(certificateId: string): Promise<boolean> {
    try {
      await db
        .delete(pendingMintReservations)
        .where(eq(pendingMintReservations.certificateId, certificateId));
      
      return true;
    } catch (error: any) {
      console.error("[MintStorage] Failed to delete reservation by certificate:", error.message);
      return false;
    }
  }

  /**
   * Get all reservations (for admin)
   */
  async getAllReservations(): Promise<PendingMintReservation[]> {
    try {
      const reservations = await db
        .select()
        .from(pendingMintReservations);
      
      return reservations as PendingMintReservation[];
    } catch (error: any) {
      console.error("[MintStorage] Failed to get all reservations:", error.message);
      return [];
    }
  }

  /**
   * Get all finalized (successfully minted) reservations
   * Used for rebuilding metadata folder on restart
   */
  async getFinalizedReservations(): Promise<PendingMintReservation[]> {
    try {
      const reservations = await db
        .select()
        .from(pendingMintReservations)
        .where(eq(pendingMintReservations.status, "finalized"))
        .orderBy(pendingMintReservations.tokenId);
      
      return reservations as PendingMintReservation[];
    } catch (error: any) {
      console.error("[MintStorage] Failed to get finalized reservations:", error.message);
      return [];
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
