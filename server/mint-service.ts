import { storage } from "./storage";
import type { MintReservation, Certificate } from "@shared/schema";

/**
 * Diploma Mint Service for Kaspa University
 * 
 * ARCHITECTURE: Single diploma collection (10,000 max supply)
 * - Users earn ONE diploma NFT after completing ALL 16 courses
 * - Token IDs are assigned randomly by the KRC-721 indexer
 * - Whitelist-based pricing: 0 KAS royalty for course completers, 20,000 KAS for others
 * 
 * SOURCE OF TRUTH: On-chain KRC-721 indexer (database is cache only)
 * - Always verify on-chain before blocking mint attempts
 * - Database reservations are cleared if not confirmed on-chain
 */

// Dynamic ticker based on network mode - MUST match krc721.ts defaults
function getCollectionTicker(): string {
  const isTestnet = process.env.KRC721_TESTNET === "true";
  if (isTestnet) {
    return process.env.KRC721_TESTNET_TICKER || "KUDIPLOMA";
  }
  return process.env.KRC721_TICKER || "KUDIPLOMA";
}

// Get the KRC-721 indexer URL
function getIndexerUrl(): string {
  const isTestnet = process.env.KRC721_TESTNET === "true";
  return isTestnet 
    ? "https://testnet-10.krc721.stream"
    : "https://mainnet.krc721.stream";
}

/**
 * Check if a wallet owns any KUDIPLOMA NFT on-chain via the indexer
 * This is the SOURCE OF TRUTH - database is just a cache
 * 
 * API endpoint: /api/v1/krc721/{network}/address/{address}/{tick}
 */
async function checkOnChainOwnership(walletAddress: string): Promise<{ ownsNft: boolean; tokenIds: number[] }> {
  try {
    const ticker = getCollectionTicker();
    const isTestnet = process.env.KRC721_TESTNET === "true";
    const network = isTestnet ? "testnet-10" : "mainnet";
    const indexerUrl = getIndexerUrl();
    
    const apiUrl = `${indexerUrl}/api/v1/krc721/${network}/address/${encodeURIComponent(walletAddress)}/${ticker}`;
    console.log(`[MintService] Checking on-chain ownership at: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.message === "success" && Array.isArray(data.result) && data.result.length > 0) {
        const tokenIds = data.result.map((nft: any) => parseInt(nft.tokenId, 10)).filter((id: number) => !isNaN(id));
        console.log(`[MintService] Wallet ${walletAddress.slice(0, 20)}... owns ${tokenIds.length} ${ticker} NFT(s) on-chain`);
        return { ownsNft: true, tokenIds };
      }
    }
    
    // No NFTs found or error - wallet doesn't own any
    console.log(`[MintService] Wallet ${walletAddress.slice(0, 20)}... does NOT own any ${ticker} NFTs on-chain`);
    return { ownsNft: false, tokenIds: [] };
  } catch (error: any) {
    console.log(`[MintService] On-chain check failed (allowing mint attempt): ${error.message}`);
    // If indexer is unreachable, allow the mint attempt (fail open for UX)
    return { ownsNft: false, tokenIds: [] };
  }
}

const RESERVATION_TTL_MINUTES = 10;
const MAX_DIPLOMA_SUPPLY = 10000; // Must match krc721.ts maxSupply
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
   * 
   * SOURCE OF TRUTH: On-chain KRC-721 indexer (database is cache only)
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

    // SOURCE OF TRUTH: Check on-chain ownership via KRC-721 indexer
    // This is authoritative - if they own one on-chain, they can't mint another
    const onChainCheck = await checkOnChainOwnership(walletAddress);
    if (onChainCheck.ownsNft) {
      return { error: "You already have a diploma NFT (verified on-chain)" };
    }

    // Since on-chain says no NFT, clear any stale database records that say "minted"
    // These are from failed mint attempts that never completed on-chain
    const diplomaCertificateId = `diploma-${walletAddress}`;
    const existingMint = await storage.getMintReservationByCertificate(diplomaCertificateId);
    if (existingMint && existingMint.status === "minted") {
      console.log(`[MintService] Clearing stale 'minted' record for ${walletAddress} - not found on-chain`);
      await storage.updateMintReservation(existingMint.id, { status: "expired" });
    }

    // Check for existing active reservation (not expired)
    const existingReservation = await storage.getActiveMintReservation(walletAddress, DIPLOMA_COURSE_ID);
    if (existingReservation) {
      return {
        reservation: existingReservation,
        inscriptionJson: existingReservation.inscriptionJson,
      };
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

  /**
   * Clear failed/stale mint reservations for a wallet
   * Useful when database is out of sync with on-chain state
   */
  async clearFailedReservations(walletAddress: string): Promise<{ cleared: number }> {
    const diplomaCertificateId = `diploma-${walletAddress}`;
    const existingMint = await storage.getMintReservationByCertificate(diplomaCertificateId);
    
    if (existingMint && existingMint.status !== "reserved") {
      console.log(`[MintService] Clearing reservation ${existingMint.id} (status: ${existingMint.status})`);
      await storage.updateMintReservation(existingMint.id, { status: "expired" });
      return { cleared: 1 };
    }
    
    return { cleared: 0 };
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
