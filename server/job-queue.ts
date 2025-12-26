/**
 * In-Memory Job Queue for Async Blockchain Operations
 * 
 * Provides non-blocking API responses by deferring blockchain operations
 * to a background worker. Jobs are processed sequentially with retry logic.
 */

import { randomUUID } from "crypto";
import { getKaspaService } from "./kaspa";
import { getKRC721Service } from "./krc721";
import { getPinataService } from "./pinata";

export type JobType = "REWARD" | "NFT_MINT" | "QA_POST";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  data: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface RewardJobData {
  recipientAddress: string;
  amountKas: number;
  lessonId: string;
  score: number;
  userId: string;
}

interface NFTMintJobData {
  certificateId: string;
  recipientAddress: string;
  courseName: string;
  score: number;
  completionDate: string;
  paymentTxHash: string;
}

interface QAPostJobData {
  lessonId: string;
  authorAddress: string;
  content: string;
  postId: string;
}

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private queue: string[] = [];
  private isProcessing = false;
  private batchWindow = 100; // ms to wait for batching rewards
  private pendingRewards: RewardJobData[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Add a reward job to the queue
   */
  enqueueReward(data: RewardJobData): string {
    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      type: "REWARD",
      status: "pending",
      data,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    console.log(`[JobQueue] Enqueued REWARD job ${jobId} for ${data.recipientAddress}`);
    this.processQueue();
    return jobId;
  }

  /**
   * Add an NFT mint job to the queue
   */
  enqueueNFTMint(data: NFTMintJobData): string {
    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      type: "NFT_MINT",
      status: "pending",
      data,
      attempts: 0,
      maxAttempts: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    console.log(`[JobQueue] Enqueued NFT_MINT job ${jobId} for certificate ${data.certificateId}`);
    this.processQueue();
    return jobId;
  }

  /**
   * Add a Q&A post job to the queue
   */
  enqueueQAPost(data: QAPostJobData): string {
    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      type: "QA_POST",
      status: "pending",
      data,
      attempts: 0,
      maxAttempts: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    console.log(`[JobQueue] Enqueued QA_POST job ${jobId}`);
    this.processQueue();
    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a specific wallet (for status display)
   */
  getJobsByWallet(walletAddress: string): Job[] {
    return Array.from(this.jobs.values()).filter(
      (job) => 
        job.data.recipientAddress === walletAddress ||
        job.data.authorAddress === walletAddress
    );
  }

  /**
   * Get queue statistics
   */
  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    this.jobs.forEach((job) => {
      if (job.status === "pending") stats.pending++;
      else if (job.status === "processing") stats.processing++;
      else if (job.status === "completed") stats.completed++;
      else if (job.status === "failed") stats.failed++;
    });
    return stats;
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const jobId = this.queue.shift()!;
      const job = this.jobs.get(jobId);

      if (!job || job.status !== "pending") {
        continue;
      }

      job.status = "processing";
      job.attempts++;
      job.updatedAt = new Date();

      try {
        const result = await this.executeJob(job);
        job.status = "completed";
        job.result = result;
        job.completedAt = new Date();
        console.log(`[JobQueue] Job ${jobId} completed successfully`);
      } catch (error: any) {
        console.error(`[JobQueue] Job ${jobId} failed (attempt ${job.attempts}):`, error.message);
        
        if (job.attempts < job.maxAttempts) {
          job.status = "pending";
          job.error = error.message;
          this.queue.push(jobId); // Re-queue for retry
          await this.delay(1000 * job.attempts); // Exponential backoff
        } else {
          job.status = "failed";
          job.error = error.message;
        }
      }

      job.updatedAt = new Date();
    }

    this.isProcessing = false;
  }

  /**
   * Execute a job based on its type
   */
  private async executeJob(job: Job): Promise<Record<string, any>> {
    switch (job.type) {
      case "REWARD":
        return await this.executeRewardJob(job.data as RewardJobData);
      case "NFT_MINT":
        return await this.executeNFTMintJob(job.data as NFTMintJobData);
      case "QA_POST":
        return await this.executeQAPostJob(job.data as QAPostJobData);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Execute a reward job
   */
  private async executeRewardJob(data: RewardJobData): Promise<Record<string, any>> {
    const kaspaService = await getKaspaService();
    const result = await kaspaService.sendReward(
      data.recipientAddress,
      data.amountKas,
      data.lessonId,
      data.score
    );

    if (!result.success) {
      throw new Error(result.error || "Reward transaction failed");
    }

    return {
      txHash: result.txHash,
      amount: data.amountKas,
      recipient: data.recipientAddress,
    };
  }

  /**
   * Execute an NFT mint job
   */
  private async executeNFTMintJob(data: NFTMintJobData): Promise<Record<string, any>> {
    const krc721Service = await getKRC721Service();
    const pinataService = getPinataService();

    // Generate certificate image
    const imageDataUri = krc721Service.generateCertificateImage(
      data.recipientAddress,
      data.courseName,
      data.score,
      new Date(data.completionDate)
    );

    // Upload to IPFS if Pinata configured
    let imageUrl = imageDataUri;
    if (pinataService.isConfigured()) {
      const uploaded = await pinataService.uploadCertificate(
        imageDataUri,
        data.certificateId,
        data.courseName,
        data.score,
        data.recipientAddress,
        new Date(data.completionDate)
      );
      if (uploaded.success && uploaded.ipfsUrl) {
        imageUrl = uploaded.ipfsUrl;
      }
    }

    // Mint the NFT
    const mintResult = await krc721Service.mintCertificate(
      data.recipientAddress,
      data.courseName,
      data.score,
      new Date(data.completionDate),
      imageUrl
    );

    if (!mintResult.success) {
      throw new Error(mintResult.error || "NFT minting failed");
    }

    return {
      tokenId: mintResult.tokenId,
      commitTxHash: mintResult.commitTxHash,
      revealTxHash: mintResult.revealTxHash,
      imageUrl,
    };
  }

  /**
   * Execute a Q&A post job
   */
  private async executeQAPostJob(data: QAPostJobData): Promise<Record<string, any>> {
    const kaspaService = await getKaspaService();
    const result = await kaspaService.postQAQuestion(
      data.lessonId,
      data.authorAddress,
      data.content
    );

    if (!result.success) {
      throw new Error(result.error || "Q&A posting failed");
    }

    return {
      txHash: result.txHash,
      postId: data.postId,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up old completed/failed jobs (call periodically)
   */
  cleanup(maxAgeMs: number = 3600000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    const toDelete: string[] = [];
    
    this.jobs.forEach((job, id) => {
      if (
        (job.status === "completed" || job.status === "failed") &&
        job.updatedAt.getTime() < cutoff
      ) {
        toDelete.push(id);
      }
    });

    for (const id of toDelete) {
      this.jobs.delete(id);
      removed++;
    }

    if (removed > 0) {
      console.log(`[JobQueue] Cleaned up ${removed} old jobs`);
    }
    return removed;
  }
}

// Singleton instance
let jobQueueInstance: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!jobQueueInstance) {
    jobQueueInstance = new JobQueue();
    // Clean up old jobs every hour
    setInterval(() => jobQueueInstance?.cleanup(), 3600000);
  }
  return jobQueueInstance;
}

export type { RewardJobData, NFTMintJobData, QAPostJobData };
