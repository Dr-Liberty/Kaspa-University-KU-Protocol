/**
 * Pinata IPFS Service for Kaspa University
 * 
 * Uploads certificate images and metadata to IPFS via Pinata
 * for permanent, decentralized storage of NFT assets.
 */

interface PinataConfig {
  apiKey: string;
  secretKey: string;
  gateway?: string;
}

interface UploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

interface CertificateMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

class PinataService {
  private apiKey: string | null = null;
  private secretKey: string | null = null;
  private gateway: string = "https://gateway.pinata.cloud/ipfs";
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.apiKey = process.env.PINATA_API_KEY || null;
    this.secretKey = process.env.PINATA_SECRET_KEY || null;
    
    if (process.env.PINATA_GATEWAY) {
      this.gateway = process.env.PINATA_GATEWAY;
    }

    if (this.apiKey && this.secretKey) {
      console.log("[Pinata] Service initialized with API keys");
      this.initialized = true;
    } else {
      console.log("[Pinata] No API keys configured - using fallback (data URIs)");
    }
  }

  isConfigured(): boolean {
    return this.initialized && !!this.apiKey && !!this.secretKey;
  }

  /**
   * Upload an SVG image to IPFS
   */
  async uploadImage(svgContent: string, fileName: string): Promise<UploadResult> {
    if (!this.isConfigured()) {
      console.log("[Pinata] Not configured - skipping upload");
      return { success: false, error: "Pinata not configured" };
    }

    try {
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const formData = new FormData();
      formData.append("file", blob, `${fileName}.svg`);
      
      const pinataMetadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          platform: "Kaspa University",
          type: "certificate",
        }
      });
      formData.append("pinataMetadata", pinataMetadata);

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          "pinata_api_key": this.apiKey!,
          "pinata_secret_api_key": this.secretKey!,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata upload failed: ${errorText}`);
      }

      const result = await response.json();
      const ipfsHash = result.IpfsHash;
      // Return ipfs:// URL for NFT standards (KRC-721 requires this format)
      const ipfsUrl = `ipfs://${ipfsHash}`;

      console.log(`[Pinata] Image uploaded: ${ipfsUrl}`);
      return { success: true, ipfsHash, ipfsUrl };
    } catch (error: any) {
      console.error("[Pinata] Image upload failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadMetadata(metadata: CertificateMetadata, fileName: string): Promise<UploadResult> {
    if (!this.isConfigured()) {
      console.log("[Pinata] Not configured - skipping metadata upload");
      return { success: false, error: "Pinata not configured" };
    }

    try {
      const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "pinata_api_key": this.apiKey!,
          "pinata_secret_api_key": this.secretKey!,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: fileName,
            keyvalues: {
              platform: "Kaspa University",
              type: "metadata",
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata metadata upload failed: ${errorText}`);
      }

      const result = await response.json();
      const ipfsHash = result.IpfsHash;
      // Return ipfs:// URL for NFT standards (KRC-721 requires this format)
      const ipfsUrl = `ipfs://${ipfsHash}`;

      console.log(`[Pinata] Metadata uploaded: ${ipfsUrl}`);
      return { success: true, ipfsHash, ipfsUrl };
    } catch (error: any) {
      console.error("[Pinata] Metadata upload failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload certificate to IPFS (image + metadata)
   * Returns the metadata IPFS URL for use in NFT minting
   */
  async uploadCertificate(
    svgImage: string,
    certificateId: string,
    courseName: string,
    score: number,
    recipientAddress: string,
    completionDate: Date
  ): Promise<UploadResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "Pinata not configured" };
    }

    try {
      // First upload the image
      const imageResult = await this.uploadImage(svgImage, `ku-cert-${certificateId}`);
      if (!imageResult.success || !imageResult.ipfsUrl) {
        return { success: false, error: imageResult.error || "Image upload failed" };
      }

      // Then upload the metadata with the image URL
      const metadata: CertificateMetadata = {
        name: `Kaspa University Certificate: ${courseName}`,
        description: `This certificate verifies completion of "${courseName}" on Kaspa University with a score of ${score}%.`,
        image: imageResult.ipfsUrl,
        attributes: [
          { trait_type: "Course", value: courseName },
          { trait_type: "Score", value: score },
          { trait_type: "Completion Date", value: completionDate.toISOString().split("T")[0] },
          { trait_type: "Recipient", value: recipientAddress },
          { trait_type: "Platform", value: "Kaspa University" },
          { trait_type: "Network", value: "Kaspa Mainnet" },
        ],
      };

      const metadataResult = await this.uploadMetadata(metadata, `ku-cert-meta-${certificateId}`);
      if (!metadataResult.success) {
        return { success: false, error: metadataResult.error || "Metadata upload failed" };
      }

      return {
        success: true,
        ipfsHash: metadataResult.ipfsHash,
        ipfsUrl: metadataResult.ipfsUrl,
      };
    } catch (error: any) {
      console.error("[Pinata] Certificate upload failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get IPFS gateway URL for a hash
   */
  getIpfsUrl(hash: string): string {
    return `${this.gateway}/${hash}`;
  }
}

// Singleton instance
let pinataService: PinataService | null = null;

export function getPinataService(): PinataService {
  if (!pinataService) {
    pinataService = new PinataService();
  }
  return pinataService;
}

export { PinataService };
