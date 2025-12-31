/**
 * NFT Metadata Manager for Kaspa University
 * 
 * Coordinates IPFS uploads for NFT metadata.
 * Uses Pinata for direct IPFS uploads - each certificate gets its own immutable IPFS CID.
 */

import { getPinataService } from "./pinata";
import { storage } from "./storage";

interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  tokenId: number;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface AddTokenResult {
  success: boolean;
  tokenId?: number;
  folderCid?: string;
  metadataUrl?: string;
  error?: string;
}

interface InitResult {
  success: boolean;
  error?: string;
}

class NFTMetadataManager {
  private tokenMetadata: Map<number, TokenMetadata> = new Map();
  private currentFolderCid: string | null = null;
  private initialized: boolean = false;

  constructor() {
    // Lazy initialization
  }

  /**
   * Initialize the metadata manager
   * Loads existing token metadata from storage
   */
  async initialize(): Promise<InitResult> {
    if (this.initialized) {
      return { success: true };
    }

    try {
      // Load existing certificates to rebuild metadata map
      await this.loadExistingMetadata();

      this.initialized = true;
      console.log(`[MetadataManager] Initialized with ${this.tokenMetadata.size} existing tokens`);

      return { success: true };
    } catch (error: any) {
      console.error(`[MetadataManager] Initialization failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load existing certificate metadata from mintStorage (source of truth for tokenIds)
   * Uses finalized mint reservations which have the actual on-chain tokenId
   */
  private async loadExistingMetadata(): Promise<void> {
    try {
      const { mintStorage } = await import("./mint-storage");
      
      // Get all finalized mint reservations (these have the actual tokenIds)
      const finalizedMints = await mintStorage.getFinalizedReservations();
      
      for (const mint of finalizedMints) {
        // Get the corresponding certificate for additional metadata
        const cert = await storage.getCertificate(mint.certificateId);
        if (!cert) {
          console.warn(`[MetadataManager] Certificate ${mint.certificateId} not found for token #${mint.tokenId}`);
          continue;
        }

        // Use only the certificate's imageUrl - this is the actual course certificate
        // Do not fall back to mintData to ensure NFT always shows the correct certificate
        const imageUrl = cert.imageUrl || "";
        if (!imageUrl) {
          console.warn(`[MetadataManager] Certificate ${mint.certificateId} missing imageUrl for token #${mint.tokenId}, skipping`);
          continue;
        }

        const metadata: TokenMetadata = {
          name: `Kaspa University Certificate: ${cert.courseName}`,
          description: `This certificate verifies completion of "${cert.courseName}" on Kaspa University with a score of ${cert.score || 0}%. Quiz completion was recorded on-chain via KU Protocol. Verify at: kaspa.university/verify/${cert.verificationCode}`,
          image: imageUrl,
          tokenId: mint.tokenId,
          attributes: [
            { trait_type: "Course", value: cert.courseName },
            { trait_type: "Score", value: cert.score || 0 },
            { trait_type: "Completion Date", value: cert.issuedAt ? new Date(cert.issuedAt).toISOString().split("T")[0] : "" },
            { trait_type: "Recipient", value: cert.recipientAddress },
            { trait_type: "Verification", value: `KU Protocol (kaspa.university)` },
            { trait_type: "Platform", value: "Kaspa University" },
            { trait_type: "Network", value: process.env.KRC721_TESTNET === "true" ? "Kaspa Testnet-10" : "Kaspa Mainnet" },
          ],
        };
        this.tokenMetadata.set(mint.tokenId, metadata);
      }
      
      console.log(`[MetadataManager] Loaded ${this.tokenMetadata.size} tokens from mintStorage`);
    } catch (error: any) {
      console.error(`[MetadataManager] Failed to load existing metadata:`, error.message);
    }
  }

  /**
   * Check if the manager is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Add a new token's metadata and upload to IPFS
   * 
   * This is the main function called during NFT minting:
   * 1. Create metadata JSON with image URL
   * 2. Upload metadata folder to IPFS
   * 3. Return the IPFS CID for use in minting
   */
  async addTokenMetadata(
    tokenId: number,
    courseName: string,
    score: number,
    recipientAddress: string,
    completionDate: Date,
    imageIpfsUrl: string
  ): Promise<AddTokenResult> {
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return { success: false, error: `Initialization failed: ${initResult.error}` };
      }
    }

    // Check if we already have this tokenId to avoid duplicates
    const existingMetadata = this.tokenMetadata.get(tokenId);
    if (existingMetadata) {
      console.log(`[MetadataManager] Token #${tokenId} already exists, skipping`);
      return { 
        success: true, 
        tokenId,
        folderCid: this.currentFolderCid || undefined,
      };
    }

    try {
      // Create metadata for this token with KU Protocol verification reference
      const metadata: TokenMetadata = {
        name: `Kaspa University Certificate: ${courseName}`,
        description: `This certificate verifies completion of "${courseName}" on Kaspa University with a score of ${score}%. Quiz completion was recorded on-chain via KU Protocol. Verify quiz data at: kaspa.university`,
        image: imageIpfsUrl,
        tokenId,
        attributes: [
          { trait_type: "Course", value: courseName },
          { trait_type: "Score", value: score },
          { trait_type: "Completion Date", value: completionDate.toISOString().split("T")[0] },
          { trait_type: "Recipient", value: recipientAddress },
          { trait_type: "Verification", value: `KU Protocol (kaspa.university)` },
          { trait_type: "Platform", value: "Kaspa University" },
          { trait_type: "Network", value: process.env.KRC721_TESTNET === "true" ? "Kaspa Testnet-10" : "Kaspa Mainnet" },
        ],
      };

      // Add to local cache (will rollback on failure)
      this.tokenMetadata.set(tokenId, metadata);

      // Build folder structure with all tokens
      const folderFiles = new Map<string, string>();
      const entries = Array.from(this.tokenMetadata.entries());
      for (const entry of entries) {
        const [id, meta] = entry;
        // KRC-721 expects files named by tokenId (e.g., "0", "1", "2")
        folderFiles.set(id.toString(), JSON.stringify(meta, null, 2));
      }

      // Upload folder to IPFS
      const pinataService = getPinataService();
      if (!pinataService.isConfigured()) {
        // Rollback on failure
        this.tokenMetadata.delete(tokenId);
        return { success: false, error: "Pinata not configured" };
      }

      const uploadResult = await pinataService.uploadDirectory(folderFiles, "kuproof-metadata");
      if (!uploadResult.success || !uploadResult.ipfsHash) {
        // Rollback on failure
        this.tokenMetadata.delete(tokenId);
        return { success: false, error: uploadResult.error || "Directory upload failed" };
      }

      this.currentFolderCid = uploadResult.ipfsHash;
      console.log(`[MetadataManager] Metadata folder uploaded: ${uploadResult.ipfsUrl}`);

      return {
        success: true,
        tokenId,
        folderCid: uploadResult.ipfsHash,
        metadataUrl: uploadResult.ipfsUrl,
      };
    } catch (error: any) {
      // Rollback on any exception
      this.tokenMetadata.delete(tokenId);
      console.error(`[MetadataManager] Failed to add token metadata (rolled back):`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get metadata for a specific token
   */
  getTokenMetadata(tokenId: number): TokenMetadata | undefined {
    return this.tokenMetadata.get(tokenId);
  }

  /**
   * Get all token metadata
   */
  getAllMetadata(): Map<number, TokenMetadata> {
    return new Map(this.tokenMetadata);
  }

  /**
   * Get current folder CID
   */
  getCurrentFolderCid(): string | null {
    return this.currentFolderCid;
  }

  /**
   * Generate static metadata folder for collection deployment
   * Pre-generates placeholder metadata for all possible tokens
   * The actual quiz verification happens via KU Protocol on-chain
   * 
   * @param courseName - The course name for all certificates
   * @param imageIpfsUrl - IPFS URL for the certificate image
   * @param maxTokens - Number of placeholder tokens to generate (default 100)
   * @returns The IPFS CID of the metadata folder for use as buri
   */
  async generateStaticMetadata(
    courseName: string,
    imageIpfsUrl: string,
    maxTokens: number = 100
  ): Promise<{ success: boolean; folderCid?: string; ipfsUrl?: string; error?: string }> {
    try {
      const pinataService = getPinataService();
      if (!pinataService.isConfigured()) {
        return { success: false, error: "Pinata not configured" };
      }

      console.log(`[MetadataManager] Generating ${maxTokens} static metadata files for "${courseName}"...`);
      
      const folderFiles = new Map<string, string>();
      const network = process.env.KRC721_TESTNET === "true" ? "Kaspa Testnet-10" : "Kaspa Mainnet";
      
      for (let tokenId = 0; tokenId < maxTokens; tokenId++) {
        const metadata: TokenMetadata = {
          name: `Kaspa University Certificate #${tokenId}: ${courseName}`,
          description: `This certificate represents completion of "${courseName}" on Kaspa University. Quiz completion verified via KU Protocol on Kaspa L1. Visit kaspa.university to verify the on-chain proof.`,
          image: imageIpfsUrl,
          tokenId,
          attributes: [
            { trait_type: "Course", value: courseName },
            { trait_type: "Token ID", value: tokenId },
            { trait_type: "Verification", value: "KU Protocol (kaspa.university)" },
            { trait_type: "Platform", value: "Kaspa University" },
            { trait_type: "Network", value: network },
          ],
        };
        folderFiles.set(tokenId.toString(), JSON.stringify(metadata, null, 2));
      }

      // Upload folder to IPFS (direct static CID)
      const uploadResult = await pinataService.uploadDirectory(folderFiles, `ku-metadata-${courseName.replace(/\s+/g, "-").toLowerCase()}`);
      
      if (!uploadResult.success || !uploadResult.ipfsHash) {
        return { success: false, error: uploadResult.error || "Directory upload failed" };
      }

      console.log(`[MetadataManager] Static metadata uploaded: ${uploadResult.ipfsUrl}`);
      console.log(`[MetadataManager] Use this as buri when deploying: ${uploadResult.ipfsUrl}/`);

      return {
        success: true,
        folderCid: uploadResult.ipfsHash,
        ipfsUrl: `${uploadResult.ipfsUrl}/`,
      };
    } catch (error: any) {
      console.error(`[MetadataManager] Static metadata generation failed:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
let metadataManager: NFTMetadataManager | null = null;

export function getMetadataManager(): NFTMetadataManager {
  if (!metadataManager) {
    metadataManager = new NFTMetadataManager();
  }
  return metadataManager;
}

export { NFTMetadataManager };
export type { TokenMetadata, AddTokenResult, InitResult };
