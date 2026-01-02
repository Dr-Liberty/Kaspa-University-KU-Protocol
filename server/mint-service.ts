import { storage } from "./storage";
import type { MintReservation, Certificate } from "@shared/schema";

/**
 * Diploma Mint Service for Kaspa University
 * 
 * ARCHITECTURE: Single diploma collection (1,000 max supply)
 * - Users earn ONE diploma NFT after completing ALL 16 courses
 * - Token IDs are assigned randomly by the KRC-721 indexer
 * - Whitelist-based pricing: 0 KAS royalty for course completers, 20,000 KAS for others
 * 
 * NOTE: Uses existing storage methods with "diploma" as a special courseId
 */

// Dynamic ticker based on network mode - MUST match krc721.ts defaults
// All ticker defaults must be kept in sync across:
// - krc721.ts (getDefaultConfig)
// - mint-service.ts (this function)
// - discount-service.ts (getCollectionTicker)
function getCollectionTicker(): string {
  const isTestnet = process.env.KRC721_TESTNET === "true";
  if (isTestnet) {
    return process.env.KRC721_TESTNET_TICKER || "KUDIPLOMA";
  }
  return process.env.KRC721_TICKER || "KUDIPLOMA";
}

const RESERVATION_TTL_MINUTES = 10;
const MAX_DIPLOMA_SUPPLY = 1000;
const DIPLOMA_COURSE_ID = "diploma"; // Special courseId for diploma NFTs
const REQUIRED_COURSES = 16;

// KRC-721 Mint inscription format per official spec
// Token IDs are assigned randomly by the indexer ("Full randomization of tokens during minting")
export interface MintInscriptionData {
  p: "krc-721";
  op: "mint";
  tick: string;
  to?: string;
}

export class MintService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Initialize diploma token counter
    await storage.initializeCourseTokenCounter(DIPLOMA_COURSE_ID, 0);
    
    this.initialized = true;
    console.log(`[MintService] Initialized for diploma collection`);
  }

  /**
   * Check if user is eligible for diploma (completed all 16 courses)
   */
  async checkDiplomaEligibility(walletAddress: string): Promise<{ 
    eligible: boolean; 
    completedCourses: number; 
    requiredCourses: number;
    certificates: Certificate[];
  }> {
    // Get user by wallet, then get their certificates
    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return {
        eligible: false,
        completedCourses: 0,
        requiredCourses: REQUIRED_COURSES,
        certificates: []
      };
    }

    const certificates = await storage.getCertificatesByUser(user.id);
    const uniqueCourses = new Set(certificates.map((c: Certificate) => c.courseId));
    const completedCount = uniqueCourses.size;
    
    return {
      eligible: completedCount >= REQUIRED_COURSES,
      completedCourses: completedCount,
      requiredCourses: REQUIRED_COURSES,
      certificates
    };
  }

  /**
   * Build mint inscription JSON per KRC-721 spec
   */
  buildInscriptionJson(walletAddress: string): MintInscriptionData {
    const ticker = getCollectionTicker();
    console.log(`[MintService] Building diploma inscription with ticker: ${ticker}, to: ${walletAddress}`);
    
    return {
      p: "krc-721",
      op: "mint",
      tick: ticker,
      to: walletAddress,
    };
  }

  /**
   * Reserve a diploma mint slot
   * Only users who completed all 16 courses can mint
   */
  async reserveDiplomaMint(
    walletAddress: string
  ): Promise<{ reservation: MintReservation; inscriptionJson: string } | { error: string }> {
    await this.initialize();

    // Check eligibility
    const eligibility = await this.checkDiplomaEligibility(walletAddress);
    if (!eligibility.eligible) {
      return { 
        error: `Complete all ${eligibility.requiredCourses} courses first. You have ${eligibility.completedCourses} completed.` 
      };
    }

    // Check for existing active reservation
    const existingReservation = await storage.getActiveMintReservation(walletAddress, DIPLOMA_COURSE_ID);
    if (existingReservation) {
      return {
        reservation: existingReservation,
        inscriptionJson: existingReservation.inscriptionJson,
      };
    }

    // Check if this wallet already has a minted diploma using deterministic certificateId
    const diplomaCertificateId = `diploma-${walletAddress}`;
    const existingMint = await storage.getMintReservationByCertificate(diplomaCertificateId);
    if (existingMint && existingMint.status === "minted") {
      return { error: "You already have a diploma NFT" };
    }

    await storage.expireOldReservations();

    // Reserve a token slot (internal tracking only)
    const tokenId = await storage.reserveTokenId(DIPLOMA_COURSE_ID);
    if (tokenId === null || tokenId >= MAX_DIPLOMA_SUPPLY) {
      return { error: "Diploma collection is sold out" };
    }

    // Build inscription per KRC-721 spec
    const inscriptionData = this.buildInscriptionJson(walletAddress);
    const inscriptionJson = JSON.stringify(inscriptionData);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_TTL_MINUTES);

    const reservation = await storage.createMintReservation({
      certificateId: diplomaCertificateId,
      courseId: DIPLOMA_COURSE_ID,
      walletAddress,
      tokenId,
      inscriptionJson,
      status: "reserved",
      expiresAt,
    });

    console.log(`[MintService] Diploma reserved for ${walletAddress} (internal tokenId: ${tokenId})`);

    return { reservation, inscriptionJson };
  }

  async confirmMint(
    reservationId: string,
    mintTxHash: string
  ): Promise<{ reservation: MintReservation } | { error: string }> {
    const result = await storage.confirmMintReservation(reservationId, mintTxHash);
    
    if (!result.success) {
      return { error: result.error || "Failed to confirm mint" };
    }
    
    if (result.reservation) {
      console.log(`[MintService] Confirmed diploma mint, txHash: ${mintTxHash}`);
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
    const result = await storage.cancelMintReservation(reservationId);
    
    if (result.success && result.reservation) {
      console.log(`[MintService] Cancelled reservation ${reservationId}`);
    }
    
    return result.success;
  }

  async getDiplomaStats(): Promise<{
    totalMinted: number;
    totalSupply: number;
    remainingSupply: number;
  }> {
    await this.initialize();
    const minted = await storage.getMintedTokenCount(DIPLOMA_COURSE_ID);
    return {
      totalMinted: minted,
      totalSupply: MAX_DIPLOMA_SUPPLY,
      remainingSupply: MAX_DIPLOMA_SUPPLY - minted,
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

  getCollectionTicker(): string {
    return getCollectionTicker();
  }

  getDiplomaCourseId(): string {
    return DIPLOMA_COURSE_ID;
  }
}

export const mintService = new MintService();
