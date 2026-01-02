import { storage } from "./storage";
import { courses as seedCourses } from "./seed-data";
import type { MintReservation, Certificate } from "@shared/schema";

// Dynamic ticker based on network mode - MUST match krc721.ts defaults
// All ticker defaults must be kept in sync across:
// - krc721.ts (getDefaultConfig)
// - mint-service.ts (this function)
// - discount-service.ts (getCollectionTicker)
function getCollectionTicker(): string {
  const isTestnet = process.env.KRC721_TESTNET === "true";
  if (isTestnet) {
    return process.env.KRC721_TESTNET_TICKER || "KUTEST6";
  }
  return process.env.KRC721_TICKER || "KUPROOF";
}

const RESERVATION_TTL_MINUTES = 10;
const MAX_TOKENS_PER_COURSE = 1000;

// KRC-721 Mint inscription format per official spec
// Token IDs are assigned randomly by the indexer ("Full randomization of tokens during minting")
export interface MintInscriptionData {
  p: "krc-721";
  op: "mint";
  tick: string;
  to?: string; // optional recipient address
}

export class MintService {
  private initialized = false;
  private courseIndexMap: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const courses = seedCourses;
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      this.courseIndexMap.set(course.id, i);
      await storage.initializeCourseTokenCounter(course.id, i);
    }

    this.initialized = true;
    console.log(`[MintService] Initialized with ${courses.length} courses`);
  }

  getCourseIndex(courseId: string): number | undefined {
    return this.courseIndexMap.get(courseId);
  }

  calculateTokenIdRange(courseIndex: number): { start: number; end: number } {
    const start = courseIndex * MAX_TOKENS_PER_COURSE + 1;
    const end = (courseIndex + 1) * MAX_TOKENS_PER_COURSE;
    return { start, end };
  }

  /**
   * Build mint inscription JSON per KRC-721 spec
   * Token IDs are assigned randomly by the indexer (not specified in inscription)
   * Reference: https://kaspa-krc721d.kaspa.com/docs#krc-721-specifications
   */
  buildInscriptionJson(walletAddress: string): MintInscriptionData {
    const ticker = getCollectionTicker();
    console.log(`[MintService] Building inscription with ticker: ${ticker}, to: ${walletAddress}`);
    
    return {
      p: "krc-721",
      op: "mint",
      tick: ticker,
      to: walletAddress,
    };
  }

  async reserveMint(
    certificateId: string,
    courseId: string,
    walletAddress: string
  ): Promise<{ reservation: MintReservation; inscriptionJson: string } | { error: string }> {
    await this.initialize();

    const existingReservation = await storage.getActiveMintReservation(walletAddress, courseId);
    if (existingReservation) {
      return {
        reservation: existingReservation,
        inscriptionJson: existingReservation.inscriptionJson,
      };
    }

    const existingMint = await storage.getMintReservationByCertificate(certificateId);
    if (existingMint && existingMint.status === "minted") {
      return { error: "Certificate already minted as NFT" };
    }

    await storage.expireOldReservations();

    // Note: We still reserve a tokenId for internal tracking, but the indexer
    // assigns tokenIds randomly. Our tokenId is for supply tracking only.
    const tokenId = await storage.reserveTokenId(courseId);
    if (tokenId === null) {
      return { error: "Course NFT collection is sold out" };
    }

    // Build inscription per KRC-721 spec (no tokenId or meta fields)
    const inscriptionData = this.buildInscriptionJson(walletAddress);
    const inscriptionJson = JSON.stringify(inscriptionData);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_TTL_MINUTES);

    const reservation = await storage.createMintReservation({
      certificateId,
      courseId,
      walletAddress,
      tokenId,
      inscriptionJson,
      status: "reserved",
      expiresAt,
    });

    console.log(`[MintService] Reserved for ${walletAddress} (course: ${courseId}, internal tokenId: ${tokenId})`);

    return { reservation, inscriptionJson };
  }

  async confirmMint(
    reservationId: string,
    mintTxHash: string
  ): Promise<{ reservation: MintReservation } | { error: string }> {
    // Use atomic confirm that updates both reservation and certificate in a transaction
    const result = await storage.confirmMintReservation(reservationId, mintTxHash);
    
    if (!result.success) {
      return { error: result.error || "Failed to confirm mint" };
    }
    
    if (result.reservation) {
      console.log(`[MintService] Confirmed mint for tokenId ${result.reservation.tokenId}, txHash: ${mintTxHash}`);
      return { reservation: result.reservation };
    }
    
    return { error: "Unknown error during mint confirmation" };
  }

  async updateReservationSigning(reservationId: string): Promise<MintReservation | null> {
    const updated = await storage.updateMintReservation(reservationId, {
      status: "signing",
    });
    return updated || null;
  }

  async cancelReservation(reservationId: string): Promise<boolean> {
    // Use atomic cancel that also recycles tokenId within a transaction
    const result = await storage.cancelMintReservation(reservationId);
    
    if (result.success && result.reservation) {
      console.log(`[MintService] Cancelled reservation ${reservationId}, recycled tokenId ${result.reservation.tokenId}`);
    }
    
    return result.success;
  }

  async getMintStats(courseId: string): Promise<{
    totalMinted: number;
    totalAvailable: number;
    remainingSupply: number;
  }> {
    const minted = await storage.getMintedTokenCount(courseId);
    return {
      totalMinted: minted,
      totalAvailable: MAX_TOKENS_PER_COURSE,
      remainingSupply: MAX_TOKENS_PER_COURSE - minted,
    };
  }

  async cleanupExpiredReservations(): Promise<number> {
    const expiredCount = await storage.expireOldReservations();
    if (expiredCount > 0) {
      console.log(`[MintService] Cleaned up ${expiredCount} expired reservations`);
    }
    return expiredCount;
  }

  startCleanupJob(intervalMinutes: number = 1): NodeJS.Timeout {
    console.log(`[MintService] Starting reservation cleanup job (every ${intervalMinutes} min)`);
    
    const cleanup = async () => {
      try {
        await this.cleanupExpiredReservations();
      } catch (err: any) {
        console.error(`[MintService] Cleanup job error: ${err.message}`);
      }
    };

    cleanup();

    return setInterval(cleanup, intervalMinutes * 60 * 1000);
  }
}

export const mintService = new MintService();
