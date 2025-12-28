Nfimport { db } from "./db";
import { errorLogs } from "./db/schema";
import { desc, eq } from "drizzle-orm";

export type ErrorCategory = "nft" | "payment" | "ipfs" | "security" | "general";

export interface ErrorLogDetails {
  certificateId?: string;
  p2shAddress?: string;
  txHash?: string;
  tokenId?: number;
  stack?: string;
  [key: string]: any;
}

export async function logError(
  category: ErrorCategory,
  action: string,
  message: string,
  details?: ErrorLogDetails,
  walletAddress?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await db.insert(errorLogs).values({
      category,
      action,
      message,
      details: details || {},
      walletAddress,
      ipAddress,
    });
    console.error(`[ErrorLog] ${category}/${action}: ${message}`);
  } catch (err: any) {
    console.error(`[ErrorLog] Failed to save error log: ${err.message}`);
  }
}

export async function getRecentErrors(limit: number = 50): Promise<any[]> {
  try {
    const errors = await db
      .select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);
    return errors;
  } catch (err: any) {
    console.error(`[ErrorLog] Failed to fetch errors: ${err.message}`);
    return [];
  }
}

export async function markErrorResolved(id: string): Promise<boolean> {
  try {
    await db.update(errorLogs).set({ resolved: true }).where(eq(errorLogs.id, id));
    return true;
  } catch (err: any) {
    console.error(`[ErrorLog] Failed to mark resolved: ${err.message}`);
    return false;
  }
}
