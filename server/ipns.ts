/**
 * IPNS Service for Kaspa University
 * 
 * Manages mutable IPNS pointers for dynamic NFT metadata.
 * Uses w3name for IPNS key management and publishing.
 * Combined with Pinata for IPFS content storage.
 */

import * as Name from 'w3name';

interface IPNSConfig {
  keyBase64?: string;
  publicName?: string;
}

interface PublishResult {
  success: boolean;
  ipnsName?: string;
  ipnsUrl?: string;
  error?: string;
}

class IPNSService {
  private name: Awaited<ReturnType<typeof Name.create>> | null = null;
  private initialized: boolean = false;
  private currentRevision: Awaited<ReturnType<typeof Name.v0>> | null = null;

  constructor() {
    // Lazy initialization - call initialize() before use
  }

  /**
   * Initialize the IPNS service
   * Either restores from env var or creates a new key
   */
  async initialize(): Promise<{ success: boolean; isNew: boolean; publicName?: string; keyBase64?: string; error?: string }> {
    if (this.initialized && this.name) {
      return { 
        success: true, 
        isNew: false, 
        publicName: this.name.toString() 
      };
    }

    try {
      const keyBase64 = process.env.W3NAME_KEY;
      
      if (keyBase64) {
        // Restore from existing key
        const keyBytes = Buffer.from(keyBase64, 'base64');
        this.name = await Name.from(keyBytes);
        this.initialized = true;
        
        console.log(`[IPNS] Restored key: ${this.name.toString()}`);
        
        // Try to resolve current revision
        try {
          this.currentRevision = await Name.resolve(this.name);
          console.log(`[IPNS] Current value: ${this.currentRevision.value}`);
        } catch (e) {
          console.log(`[IPNS] No existing revision found (first publish)`);
        }
        
        return { 
          success: true, 
          isNew: false, 
          publicName: this.name.toString() 
        };
      } else {
        // Create new key
        this.name = await Name.create();
        this.initialized = true;
        
        const keyBytes = (this.name.key as any).raw || (this.name.key as any).bytes;
        const newKeyBase64 = Buffer.from(keyBytes).toString('base64');
        
        console.log(`[IPNS] Created new key: ${this.name.toString()}`);
        console.log(`[IPNS] IMPORTANT: Save this key as W3NAME_KEY secret!`);
        
        return { 
          success: true, 
          isNew: true, 
          publicName: this.name.toString(),
          keyBase64: newKeyBase64
        };
      }
    } catch (error: any) {
      console.error(`[IPNS] Initialization failed:`, error.message);
      return { success: false, isNew: false, error: error.message };
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return this.initialized && this.name !== null;
  }

  /**
   * Get the IPNS public name (k51...)
   */
  getPublicName(): string | null {
    return this.name?.toString() || null;
  }

  /**
   * Get the IPNS URL for use as collection buri
   */
  getIPNSUrl(): string | null {
    if (!this.name) return null;
    return `ipns://${this.name.toString()}/`;
  }

  /**
   * Publish a new IPFS CID to this IPNS name
   * @param ipfsCid The IPFS CID to point to (folder containing token metadata)
   */
  async publish(ipfsCid: string): Promise<PublishResult> {
    if (!this.isConfigured() || !this.name) {
      return { success: false, error: 'IPNS not initialized' };
    }

    try {
      const value = `/ipfs/${ipfsCid}`;
      
      let revision;
      if (this.currentRevision) {
        // Increment from existing revision
        revision = await Name.increment(this.currentRevision, value);
      } else {
        // First publish
        revision = await Name.v0(this.name, value);
      }
      
      // Publish to w3name service
      await Name.publish(revision, this.name.key);
      
      // Update current revision
      this.currentRevision = revision;
      
      const ipnsName = this.name.toString();
      console.log(`[IPNS] Published ${value} to ${ipnsName}`);
      
      return {
        success: true,
        ipnsName,
        ipnsUrl: `ipns://${ipnsName}/`
      };
    } catch (error: any) {
      console.error(`[IPNS] Publish failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve current IPNS value
   */
  async resolve(): Promise<{ success: boolean; value?: string; error?: string }> {
    if (!this.isConfigured() || !this.name) {
      return { success: false, error: 'IPNS not initialized' };
    }

    try {
      const revision = await Name.resolve(this.name);
      return { success: true, value: revision.value };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export the current key as base64 (for backup/storage)
   */
  exportKey(): string | null {
    if (!this.name) return null;
    const keyBytes = (this.name.key as any).raw || (this.name.key as any).bytes;
    return Buffer.from(keyBytes).toString('base64');
  }
}

// Singleton instance
let ipnsService: IPNSService | null = null;

export function getIPNSService(): IPNSService {
  if (!ipnsService) {
    ipnsService = new IPNSService();
  }
  return ipnsService;
}

export { IPNSService };
export type { PublishResult };
