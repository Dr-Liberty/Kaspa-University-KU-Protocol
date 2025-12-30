/**
 * NFT Metadata Manager for Kaspa University
 * 
 * Coordinates IPFS uploads and IPNS updates for dynamic NFT metadata.
 * Enables per-user certificate data with mutable IPNS pointers.
 */

import { getPinataService } from "./pinata";
import { getIPNSService } from "./ipns";
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
  ipnsUrl?: string;
  error?: string;
}

interface InitResult {
  success: boolean;
  ipnsUrl?: string;
  isNewKey?: boolean;
  keyBase64?: string;
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
   * Sets up IPNS and loads existing token metadata from storage
   */
  async initialize(): Promise<InitResult> {
    if (this.initialized) {
      const ipnsService = getIPNSService();
      return { 
        success: true, 
        ipnsUrl: ipnsService.getIPNSUrl() || undefined 
      };
    }

    try {
      // Initialize IPNS service
      const ipnsService = getIPNSService();
      const ipnsResult = await ipnsService.initialize();
      
      if (!ipnsResult.success) {
        return { success: false, error: ipnsResult.error };
      }

      // Load existing certificates to rebuild metadata map
      await this.loadExistingMetadata();

      this.initialized = true;
      console.log(`[MetadataManager] Initialized with ${this.tokenMetadata.size} existing tokens`);

      return {
        success: true,
        ipnsUrl: ipnsService.getIPNSUrl() || undefined,
        isNewKey: ipnsResult.isNew,
        keyBase64: ipnsResult.keyBase64,
      };
    } catch (error: any) {
      console.error(`[MetadataManager] Initialization failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load existing certificate metadata from mintStorage (source of truth for tokenIds)
   * Uses finalized mint reservations which have the actual on-chain tokenId
   * After loading, republishes to IPNS to ensure it points to the correct folder
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

        // Extract imageUrl from mint data if certificate doesn't have it
        let imageUrl = cert.imageUrl || "";
        if (!imageUrl && mint.mintData) {
          try {
            const mintData = typeof mint.mintData === "string" ? JSON.parse(mint.mintData) : mint.mintData;
            imageUrl = mintData.imageUrl || "";
          } catch {
            // Ignore parse errors
          }
        }

        const metadata: TokenMetadata = {
          name: `Kaspa University Certificate: ${cert.courseName}`,
          description: `This certificate verifies completion of "${cert.courseName}" on Kaspa University.`,
          image: imageUrl,
          tokenId: mint.tokenId, // Use the actual tokenId from mintStorage
          attributes: [
            { trait_type: "Course", value: cert.courseName },
            { trait_type: "Score", value: cert.score || 0 },
            { trait_type: "Completion Date", value: cert.issuedAt ? new Date(cert.issuedAt).toISOString().split("T")[0] : "" },
            { trait_type: "Recipient", value: cert.recipientAddress },
            { trait_type: "Platform", value: "Kaspa University" },
            { trait_type: "Network", value: "Kaspa Mainnet" },
          ],
        };
        this.tokenMetadata.set(mint.tokenId, metadata);
      }
      
      console.log(`[MetadataManager] Loaded ${this.tokenMetadata.size} tokens from mintStorage`);
      
      // Republish to IPNS immediately if we have tokens
      // This ensures IPNS points to the correct folder after restart
      if (this.tokenMetadata.size > 0) {
        console.log(`[MetadataManager] Republishing ${this.tokenMetadata.size} tokens to IPNS...`);
        const republishResult = await this.doRepublish();
        
        if (!republishResult.success) {
          // Log error but don't block - IPNS will be stale until next successful mint
          console.error(`[MetadataManager] IPNS republish failed on startup: ${republishResult.error}`);
          console.warn(`[MetadataManager] IPNS may point to stale CID until next successful mint`);
          // Keep metadata in memory - it will be republished on next addTokenMetadata call
        } else {
          console.log(`[MetadataManager] IPNS republish successful on startup`);
        }
      }
    } catch (error: any) {
      console.error(`[MetadataManager] Failed to load existing metadata:`, error.message);
    }
  }

  /**
   * Internal republish helper (doesn't require initialization)
   */
  private async doRepublish(): Promise<AddTokenResult> {
    if (this.tokenMetadata.size === 0) {
      return { success: true }; // Nothing to publish
    }

    try {
      // Rebuild and upload folder
      const folderFiles = new Map<string, string>();
      const entries = Array.from(this.tokenMetadata.entries());
      for (const entry of entries) {
        const [id, meta] = entry;
        folderFiles.set(id.toString(), JSON.stringify(meta, null, 2));
      }

      const pinataService = getPinataService();
      if (!pinataService.isConfigured()) {
        console.warn(`[MetadataManager] Pinata not configured, skipping republish`);
        return { success: false, error: "Pinata not configured" };
      }

      const uploadResult = await pinataService.uploadDirectory(folderFiles, "kuproof-metadata");
      if (!uploadResult.success || !uploadResult.ipfsHash) {
        return { success: false, error: uploadResult.error || "Directory upload failed" };
      }

      // Update IPNS
      const ipnsService = getIPNSService();
      const publishResult = await ipnsService.publish(uploadResult.ipfsHash);
      
      if (!publishResult.success) {
        return { success: false, error: publishResult.error || "IPNS publish failed" };
      }

      this.currentFolderCid = uploadResult.ipfsHash;
      console.log(`[MetadataManager] Republished ${this.tokenMetadata.size} tokens to IPNS: ${publishResult.ipnsUrl}`);

      return {
        success: true,
        folderCid: uploadResult.ipfsHash,
        ipnsUrl: publishResult.ipnsUrl,
      };
    } catch (error: any) {
      console.error(`[MetadataManager] Republish failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if the manager is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get the IPNS URL for use as collection buri
   */
  getIPNSUrl(): string | null {
    const ipnsService = getIPNSService();
    return ipnsService.getIPNSUrl();
  }

  /**
   * Add a new token's metadata and update IPNS
   * 
   * This is the main function called during NFT minting:
   * 1. Upload the certificate image to IPFS
   * 2. Create metadata JSON with image URL
   * 3. Rebuild folder with all token metadata
   * 4. Upload folder to IPFS
   * 5. Update IPNS pointer
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
        ipnsUrl: this.getIPNSUrl() || undefined,
      };
    }

    try {
      // Create metadata for this token
      const metadata: TokenMetadata = {
        name: `Kaspa University Certificate: ${courseName}`,
        description: `This certificate verifies completion of "${courseName}" on Kaspa University with a score of ${score}%.`,
        image: imageIpfsUrl,
        tokenId,
        attributes: [
          { trait_type: "Course", value: courseName },
          { trait_type: "Score", value: score },
          { trait_type: "Completion Date", value: completionDate.toISOString().split("T")[0] },
          { trait_type: "Recipient", value: recipientAddress },
          { trait_type: "Platform", value: "Kaspa University" },
          { trait_type: "Network", value: "Kaspa Mainnet" },
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

      console.log(`[MetadataManager] Folder uploaded: ${uploadResult.ipfsUrl}`);

      // Update IPNS to point to new folder
      const ipnsService = getIPNSService();
      const publishResult = await ipnsService.publish(uploadResult.ipfsHash);
      
      if (!publishResult.success) {
        // Rollback on IPNS publish failure
        this.tokenMetadata.delete(tokenId);
        console.warn(`[MetadataManager] IPNS publish failed, rolled back token #${tokenId}`);
        return { success: false, error: publishResult.error || "IPNS publish failed" };
      }

      this.currentFolderCid = uploadResult.ipfsHash;
      console.log(`[MetadataManager] IPNS updated: ${publishResult.ipnsUrl}`);

      return {
        success: true,
        tokenId,
        folderCid: uploadResult.ipfsHash,
        ipnsUrl: publishResult.ipnsUrl,
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
   * Force republish current metadata to IPNS
   * Useful after server restart to ensure IPNS is up to date
   */
  async republish(): Promise<AddTokenResult> {
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return { success: false, error: `Initialization failed: ${initResult.error}` };
      }
    }

    return this.doRepublish();
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
