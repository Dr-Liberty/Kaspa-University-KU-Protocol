# KU Protocol Indexer — Implementation Plan

**Status:** Planning (awaiting community feedback on indexer access)
**Date:** February 2026
**Reference:** [simply-kaspa-indexer](https://github.com/supertypo/simply-kaspa-indexer) by supertypo

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Option A: Hybrid Approach (Recommended)](#option-a-hybrid-approach-recommended)
4. [Option B: Full Pipeline Indexer](#option-b-full-pipeline-indexer)
5. [Database Schema (Shared)](#database-schema-shared)
6. [Cost & Tradeoff Comparison](#cost--tradeoff-comparison)
7. [Decision Matrix](#decision-matrix)
8. [Prerequisites & Next Steps](#prerequisites--next-steps)

---

## Executive Summary

Kaspa University needs a reliable way to index protocol transactions from the Kaspa BlockDAG. Three separate protocols are in scope:

1. **KU Protocol** (`ku:1:quiz:{data}`) — Quiz completion proofs, defined in `server/ku-protocol.ts`
2. **K Protocol** (`k:1:post:{data}`, `k:1:reply:{data}`) — Public lesson Q&A comments, separate from KU Protocol
3. **KRC-721** (JSON inscriptions with `"p":"krc-721"`) — Diploma NFT operations

These are distinct protocols with separate parsers. The indexer needs to identify all three from raw transaction payloads.

This document describes two implementation paths:

- **Option A (Hybrid):** Query an existing simply-kaspa-indexer instance via its REST API or database, filter for protocol transactions, and store parsed results locally. Lightweight, low-cost, production-ready.

- **Option B (Full Pipeline):** Build a dedicated real-time indexer that connects directly to a kaspad node via WebSocket RPC, processes every block, and extracts protocol transactions. High-performance, self-contained, but resource-intensive.

Both options share the same database schema for storing parsed protocol data.

---

## Current State

### Existing KU Indexer (`server/ku-indexer.ts`)

The current indexer is **on-demand only**:

- Verifies individual transaction hashes via RPC when a user submits a quiz
- Stores quiz proofs in an in-memory `Map` (lost on restart)
- Persists verified transactions to PostgreSQL via `saveVerifiedTransaction()`
- No continuous scanning, no checkpoint/resume, no reorg handling
- No historical backfill capability

### Existing Protocol Definitions (`server/ku-protocol.ts`)

Protocol parsing is already well-implemented:

- **KU Protocol:** `ku:1:quiz:{wallet}:{courseId}:{lessonId}:{score}:{maxScore}:{timestamp}:{contentHash}[:{blockAnchors}]`
- **K Protocol:** `k:1:post:{data}` and `k:1:reply:{data}`
- **KRC-721:** JSON inscriptions with `"p":"krc-721"`
- Bitmask system for efficient transaction classification
- Block anchor parsing for verifiable time windows

### Existing RPC Infrastructure (`server/kaspa.ts`)

- `kaspa-rpc-client` (pure TypeScript) for mainnet connections
- WASM `RpcClient` with PNN Resolver as fallback
- Optional archival node connection for historical data
- Transaction verification via `verifyTransactionOnChain()`

---

## Option A: Hybrid Approach (Recommended)

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              External Infrastructure                 │
│                                                      │
│   ┌──────────┐    ┌─────────────────────────────┐   │
│   │  kaspad   │───>│  simply-kaspa-indexer        │   │
│   │  node     │    │  (processes all blocks/txs)  │   │
│   └──────────┘    │  PostgreSQL: blocks, txs,     │   │
│                   │  inputs, outputs, addresses   │   │
│                   └──────────┬──────────────────┘   │
│                              │                       │
│                   ┌──────────▼──────────────────┐   │
│                   │  kaspa-rest-server            │   │
│                   │  (HTTP API over indexer DB)   │   │
│                   └──────────┬──────────────────┘   │
└──────────────────────────────┼───────────────────────┘
                               │ HTTP (poll every 30-60s)
┌──────────────────────────────▼───────────────────────┐
│              Kaspa University Backend                 │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │  KU Protocol Poller Service                   │  │
│   │                                               │  │
│   │  1. Query external API for txs since last     │  │
│   │     checkpoint (by blueScore or timestamp)    │  │
│   │  2. Filter: payload starts with "ku:" / "k:"  │  │
│   │     or contains "krc-721"                     │  │
│   │  3. Parse payloads using existing ku-protocol │  │
│   │  4. Validate & deduplicate                    │  │
│   │  5. Batch insert to local PostgreSQL          │  │
│   │  6. Update checkpoint                         │  │
│   └──────────────┬───────────────────────────────┘  │
│                  │                                    │
│   ┌──────────────▼───────────────────────────────┐  │
│   │  Local PostgreSQL                             │  │
│   │                                               │  │
│   │  ku_indexed_transactions (parsed protocol tx) │  │
│   │  ku_indexer_checkpoint   (last blueScore)     │  │
│   │  verified_transactions   (existing table)     │  │
│   └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### How It Works

1. **External simply-kaspa-indexer** runs independently (hosted by community member, public instance, or self-hosted). It indexes the entire Kaspa blockchain into PostgreSQL — blocks, transactions, inputs, outputs.

2. **kaspa-rest-server** exposes HTTP endpoints over that database. Key endpoints:
   - `GET /transactions/{txId}` — Get transaction details including payload
   - `GET /addresses/{address}/transactions` — Get transactions for an address
   - Transaction search/filtering capabilities

3. **KU Protocol Poller** runs as a background service in the Kaspa University Express backend:
   - Starts on server boot, runs on a configurable interval (default: 30 seconds)
   - Queries the external API for new transactions since the last checkpoint
   - Filters for transactions containing KU/K/KRC-721 protocol payloads
   - Parses payloads using existing `parseKUPayload()`, `isKUTransaction()`, etc.
   - Batch-inserts parsed data into local PostgreSQL
   - Saves the latest processed blueScore as a checkpoint

### Implementation Details

#### File: `server/indexer/hybrid-poller.ts`

```typescript
/**
 * KU Protocol Hybrid Poller
 *
 * Polls an external simply-kaspa-indexer REST API for new transactions,
 * filters for KU/K/KRC-721 protocol payloads, parses them, and stores
 * locally in PostgreSQL.
 *
 * Inspired by simply-kaspa-indexer's checkpoint system but much lighter.
 */

import { parseKUPayload, isKUTransaction, hexToString } from "../ku-protocol";
import type { IStorage } from "../storage";

interface PollerConfig {
  /** Base URL of the kaspa-rest-server instance */
  apiBaseUrl: string;
  /** Polling interval in milliseconds (default: 30000 = 30s) */
  pollIntervalMs: number;
  /** Maximum transactions to fetch per poll cycle */
  batchSize: number;
  /** Number of retry attempts on API failure */
  maxRetries: number;
  /** Base delay for exponential backoff (ms) */
  retryBaseDelayMs: number;
}

interface PollerMetrics {
  status: "idle" | "polling" | "error" | "stopped";
  lastPollAt: Date | null;
  lastCheckpointBlueScore: number;
  totalTxProcessed: number;
  totalKuTxFound: number;
  totalKTxFound: number;
  totalKrc721TxFound: number;
  pollCount: number;
  errorCount: number;
  consecutiveErrors: number;
  avgPollDurationMs: number;
  lastError: string | null;
}

const DEFAULT_CONFIG: PollerConfig = {
  apiBaseUrl: process.env.KASPA_INDEXER_API_URL || "http://localhost:8080",
  pollIntervalMs: parseInt(process.env.KU_POLL_INTERVAL_MS || "30000"),
  batchSize: parseInt(process.env.KU_POLL_BATCH_SIZE || "500"),
  maxRetries: 3,
  retryBaseDelayMs: 1000,
};

class KUHybridPoller {
  private config: PollerConfig;
  private storage: IStorage | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private metrics: PollerMetrics = {
    status: "idle",
    lastPollAt: null,
    lastCheckpointBlueScore: 0,
    totalTxProcessed: 0,
    totalKuTxFound: 0,
    totalKTxFound: 0,
    totalKrc721TxFound: 0,
    pollCount: 0,
    errorCount: 0,
    consecutiveErrors: 0,
    avgPollDurationMs: 0,
    lastError: null,
  };

  constructor(config?: Partial<PollerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Connect storage layer for persistence */
  setStorage(storage: IStorage): void {
    this.storage = storage;
  }

  /** Start the polling loop */
  async start(): Promise<void> {
    if (this.timer) return;

    // Load checkpoint from DB
    await this.loadCheckpoint();

    console.log(`[KU Poller] Starting hybrid poller`);
    console.log(`[KU Poller] API: ${this.config.apiBaseUrl}`);
    console.log(`[KU Poller] Interval: ${this.config.pollIntervalMs}ms`);
    console.log(`[KU Poller] Checkpoint: blueScore ${this.metrics.lastCheckpointBlueScore}`);

    // Initial poll
    await this.poll();

    // Start interval
    this.timer = setInterval(() => this.poll(), this.config.pollIntervalMs);
  }

  /** Stop the polling loop */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.metrics.status = "stopped";
    console.log("[KU Poller] Stopped");
  }

  /** Single poll cycle */
  private async poll(): Promise<void> {
    if (this.isPolling) return; // Skip if previous cycle still running
    this.isPolling = true;
    this.metrics.status = "polling";
    const startTime = Date.now();

    try {
      // 1. Fetch transactions from external indexer since last checkpoint
      const transactions = await this.fetchTransactionsSince(
        this.metrics.lastCheckpointBlueScore,
        this.config.batchSize
      );

      if (transactions.length === 0) {
        this.metrics.consecutiveErrors = 0;
        return;
      }

      // 2. Filter and parse protocol transactions
      let maxBlueScore = this.metrics.lastCheckpointBlueScore;

      for (const tx of transactions) {
        this.metrics.totalTxProcessed++;

        if (tx.blueScore > maxBlueScore) {
          maxBlueScore = tx.blueScore;
        }

        // Skip transactions without payloads
        if (!tx.payloadHex) continue;

        // Identify and parse protocol
        const parsed = this.identifyAndParse(tx);
        if (!parsed) continue;

        // 3. Store parsed transaction
        await this.storeParsedTransaction(tx, parsed);
      }

      // 4. Update checkpoint
      if (maxBlueScore > this.metrics.lastCheckpointBlueScore) {
        this.metrics.lastCheckpointBlueScore = maxBlueScore;
        await this.saveCheckpoint(maxBlueScore);
      }

      this.metrics.consecutiveErrors = 0;
      this.metrics.pollCount++;

    } catch (error: any) {
      this.metrics.errorCount++;
      this.metrics.consecutiveErrors++;
      this.metrics.lastError = error.message;
      this.metrics.status = "error";
      console.error(`[KU Poller] Poll error: ${error.message}`);

      // Exponential backoff on consecutive errors
      if (this.metrics.consecutiveErrors >= 3) {
        const backoffMs = this.config.retryBaseDelayMs *
          Math.pow(2, Math.min(this.metrics.consecutiveErrors - 3, 5));
        console.warn(`[KU Poller] Backing off ${backoffMs}ms after ${this.metrics.consecutiveErrors} consecutive errors`);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    } finally {
      this.isPolling = false;
      this.metrics.lastPollAt = new Date();
      const elapsed = Date.now() - startTime;
      this.metrics.avgPollDurationMs =
        (this.metrics.avgPollDurationMs * (this.metrics.pollCount - 1) + elapsed) /
        Math.max(this.metrics.pollCount, 1);
      if (this.metrics.status !== "error") {
        this.metrics.status = "idle";
      }
    }
  }

  /**
   * Fetch transactions from external simply-kaspa-indexer REST API.
   *
   * The exact endpoint depends on which kaspa-rest-server API is available.
   * Common patterns:
   *   - GET /transactions?blueScore_gt={checkpoint}&limit={batchSize}
   *   - GET /addresses/{address}/full-transactions
   *
   * This method should be adapted based on the specific API available.
   */
  private async fetchTransactionsSince(
    sinceBlueScore: number,
    limit: number
  ): Promise<Array<{
    txHash: string;
    blueScore: number;
    blockTime: number;
    payloadHex: string | null;
    senderAddress?: string;
  }>> {
    // IMPLEMENTATION NOTE:
    // The exact API call depends on which REST server / DB access you have.
    //
    // Option 1: kaspa-rest-server HTTP API
    //   const url = `${this.config.apiBaseUrl}/transactions?...`;
    //   const response = await fetch(url);
    //
    // Option 2: Direct PostgreSQL query against simply-kaspa-indexer DB
    //   SELECT t.transaction_id, t.block_time, encode(t.payload, 'hex') as payload_hex
    //   FROM transactions t
    //   WHERE t.block_time > $1
    //     AND t.payload IS NOT NULL
    //     AND length(t.payload) > 0
    //   ORDER BY t.block_time ASC
    //   LIMIT $2
    //
    // Option 3: Targeted address query (only watch platform treasury address)
    //   GET /addresses/{treasuryAddress}/full-transactions?after={checkpoint}

    throw new Error("Not implemented — adapt to your available API endpoint");
  }

  /** Identify protocol and parse payload */
  private identifyAndParse(tx: { txHash: string; payloadHex: string | null }) {
    if (!tx.payloadHex) return null;

    try {
      const payloadStr = hexToString(tx.payloadHex);

      // KU Protocol
      if (payloadStr.startsWith("ku:")) {
        const parsed = parseKUPayload(tx.payloadHex);
        if (parsed) {
          this.metrics.totalKuTxFound++;
          return { protocol: "ku", type: parsed.type, parsed };
        }
      }

      // K Protocol (public comments)
      if (payloadStr.startsWith("k:")) {
        const parts = payloadStr.split(":");
        this.metrics.totalKTxFound++;
        return {
          protocol: "k",
          type: parts[2] || "unknown",
          parsed: { rawData: payloadStr },
        };
      }

      // KRC-721 inscriptions
      if (payloadStr.includes('"p":"krc-721"')) {
        const match = payloadStr.match(/"op":"(\w+)"/);
        this.metrics.totalKrc721TxFound++;
        return {
          protocol: "krc721",
          type: match?.[1] || "unknown",
          parsed: { rawData: payloadStr },
        };
      }
    } catch {
      // Not a protocol transaction, skip silently
    }

    return null;
  }

  /** Store a parsed protocol transaction to local DB */
  private async storeParsedTransaction(
    tx: { txHash: string; blueScore: number; blockTime: number },
    parsed: { protocol: string; type: string; parsed: any }
  ): Promise<void> {
    // Implementation: insert into ku_indexed_transactions table
    // Deduplicate by txHash (upsert / ON CONFLICT DO NOTHING)
    //
    // if (this.storage) {
    //   await this.storage.saveIndexedTransaction({
    //     txHash: tx.txHash,
    //     blueScore: tx.blueScore,
    //     blockTime: tx.blockTime,
    //     protocol: parsed.protocol,
    //     type: parsed.type,
    //     payloadData: JSON.stringify(parsed.parsed),
    //   });
    // }
  }

  /** Load checkpoint from database */
  private async loadCheckpoint(): Promise<void> {
    // if (this.storage) {
    //   const checkpoint = await this.storage.getIndexerCheckpoint("hybrid-poller");
    //   if (checkpoint) {
    //     this.metrics.lastCheckpointBlueScore = checkpoint.lastBlueScore;
    //   }
    // }
  }

  /** Save checkpoint to database */
  private async saveCheckpoint(blueScore: number): Promise<void> {
    // if (this.storage) {
    //   await this.storage.saveIndexerCheckpoint("hybrid-poller", blueScore);
    // }
  }

  /** Get current metrics */
  getMetrics(): PollerMetrics {
    return { ...this.metrics };
  }
}

export const kuHybridPoller = new KUHybridPoller();
```

#### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `KASPA_INDEXER_API_URL` | `http://localhost:8080` | Base URL of the kaspa-rest-server or indexer API |
| `KU_POLL_INTERVAL_MS` | `30000` | Poll interval in milliseconds |
| `KU_POLL_BATCH_SIZE` | `500` | Max transactions per poll cycle |
| `KASPA_INDEXER_DB_URL` | *(none)* | Direct PostgreSQL connection to indexer DB (Option 2) |
| `KU_CONFIRMATION_LAG` | `100` | BlueScore confirmation lag for reorg safety |

#### Integration Points

```typescript
// In server startup (e.g., server/routes.ts or server/index.ts)
import { kuHybridPoller } from "./indexer/hybrid-poller";

// After storage is initialized:
kuHybridPoller.setStorage(storage);
await kuHybridPoller.start();

// On shutdown:
kuHybridPoller.stop();

// API endpoint for metrics:
app.get("/api/indexer/health", (req, res) => {
  res.json(kuHybridPoller.getMetrics());
});
```

### Data Access Patterns

There are three ways to connect to the external indexer:

#### Pattern 1: kaspa-rest-server HTTP API

The simplest approach. The [kaspa-rest-server](https://github.com/kaspa-ng/kaspa-rest-server) runs alongside simply-kaspa-indexer and exposes a REST API.

**Pros:** No direct DB access needed, cleanest separation
**Cons:** Depends on API capabilities for payload filtering

```
GET /transactions?limit=500&offset=0&fields=transaction_id,block_time,payload
```

#### Pattern 2: Direct Database Query

If you have read-only access to the simply-kaspa-indexer PostgreSQL database, you can query it directly for transactions with non-empty payloads.

**Pros:** Most flexible, can filter by payload content at the SQL level
**Cons:** Requires DB credentials, cross-database coupling

```sql
-- Find KU/K protocol transactions efficiently
-- NOTE: t.payload is bytea in simply-kaspa-indexer's schema.
-- substring(bytea, start, length) operates on raw bytes.
-- "ku:" = bytes 0x6b 0x75 0x3a (3 bytes)
-- "k:"  = bytes 0x6b 0x3a (2 bytes)
--
-- IMPORTANT: The KRC-721 LIKE filter is best-effort and assumes
-- unescaped JSON. If payloads use CBOR or escaped quotes, this
-- filter may miss some inscriptions. Consider post-filtering in
-- application code for KRC-721 if precision is critical.
--
-- IMPORTANT: The exact column names depend on the simply-kaspa-indexer
-- schema version. Verify against the actual database before use.

SELECT
  t.transaction_id AS tx_hash,
  t.block_time,
  encode(t.payload, 'hex') AS payload_hex
FROM transactions t
WHERE t.block_time > $1    -- since last checkpoint (Unix timestamp ms)
  AND t.payload IS NOT NULL
  AND length(t.payload) > 2  -- bytea length in bytes, skip trivial payloads
  AND (
    -- KU Protocol prefix: "ku:" = 3 bytes (0x6b, 0x75, 0x3a)
    encode(substring(t.payload from 1 for 3), 'hex') = '6b753a'
    OR
    -- K Protocol prefix: "k:" = 2 bytes (0x6b, 0x3a)
    encode(substring(t.payload from 1 for 2), 'hex') = '6b3a'
    OR
    -- KRC-721: best-effort match for "krc-721" in JSON payload
    encode(t.payload, 'hex') LIKE '%226b72632d37323122%'
  )
ORDER BY t.block_time ASC
LIMIT $2;
```

#### Pattern 3: Address-Targeted Monitoring

Only monitor transactions involving the platform's known treasury/reward address. This is the most efficient approach if you only care about KU Platform transactions.

**Pros:** Minimal data transfer, very focused
**Cons:** Misses third-party KU protocol transactions (if any exist)

```
GET /addresses/{treasuryAddress}/full-transactions?limit=100&offset=0
```

### Checkpoint & Resume

The checkpoint is simply the highest `blueScore` (or `block_time`) successfully processed:

```
ku_indexer_checkpoint table:
┌──────────────┬──────────────────┬─────────────────────┐
│ poller_id    │ last_blue_score  │ updated_at          │
├──────────────┼──────────────────┼─────────────────────┤
│ hybrid-poller│ 98234567         │ 2026-02-18 14:30:00 │
└──────────────┴──────────────────┴─────────────────────┘
```

On restart:
1. Load `last_blue_score` from checkpoint table
2. Query external API: `WHERE blueScore > 98234567`
3. Process and store new transactions
4. Update checkpoint to new highest blueScore

### Confirmation Lag (Reorg Safety)

Even with the hybrid approach, Kaspa's BlockDAG can have temporary forks. To avoid indexing transactions that later get orphaned:

- **Introduce a confirmation lag:** Only process transactions with `blueScore <= (chainTip - 100)`. This gives ~10 seconds of confirmation buffer (at 10 BPS).
- **Why this matters:** The external indexer handles reorgs internally, but if you poll during a reorg window, you might see a transaction that the indexer later removes. The confirmation lag avoids this race condition.
- **Configurable via `KU_CONFIRMATION_LAG`** environment variable (default: 100 blueScore units).

```typescript
// In fetchTransactionsSince():
const safeBlueScore = currentTip - confirmationLag;
// Only query: WHERE blueScore > checkpoint AND blueScore <= safeBlueScore
```

### Error Handling & Resilience

- **API unavailable:** Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s max)
- **Partial batch failure:** Process what succeeds, retry failed items next cycle
- **Duplicate transactions:** Upsert with `ON CONFLICT (tx_hash) DO NOTHING`
- **Checkpoint only advances on success:** Never lose data on failure
- **Metrics track consecutive errors:** Alert threshold at 10+ consecutive failures

---

## Option B: Full Pipeline Indexer

### Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                    Kaspa University Backend                        │
│                                                                   │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │  kaspad node     │     │  Bounded Queue   │                    │
│  │  (WebSocket RPC) │────>│  (block data)    │                    │
│  │                  │     │  capacity: 1000  │                    │
│  └─────────────────┘     └────────┬─────────┘                    │
│                                   │                               │
│                          ┌────────▼─────────┐                    │
│                          │  Block Processor  │                    │
│                          │                   │                    │
│                          │  For each block:  │                    │
│                          │  - Extract txs    │                    │
│                          │  - Scan payloads  │                    │
│                          │  - Identify proto │                    │
│                          └────────┬─────────┘                    │
│                                   │                               │
│                   ┌───────────────┼───────────────┐              │
│                   │               │               │              │
│          ┌────────▼───┐  ┌───────▼──────┐  ┌────▼────────┐     │
│          │ KU Parser  │  │ K Parser     │  │ KRC-721     │     │
│          │ quiz/cert  │  │ post/reply   │  │ Parser      │     │
│          └────────┬───┘  └───────┬──────┘  └────┬────────┘     │
│                   │              │               │              │
│                   └──────────────┼───────────────┘              │
│                                  │                               │
│                         ┌────────▼─────────┐                    │
│                         │  Batch DB Writer  │                    │
│                         │                   │                    │
│                         │  - Batch upsert   │                    │
│                         │  - Save checkpoint│                    │
│                         │  - Update metrics │                    │
│                         └────────┬─────────┘                    │
│                                  │                               │
│                         ┌────────▼─────────┐                    │
│                         │  PostgreSQL       │                    │
│                         │                   │                    │
│                         │  ku_indexed_*     │                    │
│                         │  ku_checkpoint    │                    │
│                         │  ku_reorg_log     │                    │
│                         └──────────────────┘                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Virtual Chain Handler (reorg detection)                    │  │
│  │                                                             │  │
│  │  - Subscribes to virtualChainChanged notifications          │  │
│  │  - On removed blocks: mark affected txs as orphaned         │  │
│  │  - On added blocks: reprocess and verify                    │  │
│  │  - Log all reorgs for audit trail                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Health & Metrics API                                       │  │
│  │                                                             │  │
│  │  GET /api/indexer/health                                    │  │
│  │  GET /api/indexer/metrics                                   │  │
│  │  GET /api/indexer/status                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### How It Works

This approach mirrors simply-kaspa-indexer's architecture but in TypeScript/Node.js, focused exclusively on protocol transactions.

#### Stage 1: RPC Block Fetcher

Connects to a kaspad node via WebSocket RPC and subscribes to new blocks:

```typescript
// Pseudo-code for the block fetcher
class BlockFetcher {
  private rpcClient: KaspaRpcClient;
  private blockQueue: BoundedQueue<BlockData>;

  async start(): Promise<void> {
    // Subscribe to block added notifications
    await this.rpcClient.subscribeToBlockAdded();
    
    // Subscribe to virtual chain changes (for reorg detection)
    await this.rpcClient.subscribeToVirtualChainChanged();

    this.rpcClient.on("blockAdded", async (notification) => {
      const block = notification.block;
      
      // Only queue blocks with transactions that have payloads
      const relevantTxs = block.transactions.filter(tx =>
        tx.payload && tx.payload.length > 0
      );

      if (relevantTxs.length > 0) {
        await this.blockQueue.push({
          blockHash: block.header.hash,
          blueScore: block.header.blueScore,
          timestamp: block.header.timestamp,
          daaScore: block.header.daaScore,
          transactions: relevantTxs,
        });
      }
    });
  }
}
```

#### Stage 2: Protocol Extractor

Reads blocks from the queue, scans each transaction's payload, and identifies protocol messages:

```typescript
class ProtocolExtractor {
  private blockQueue: BoundedQueue<BlockData>;
  private parsedQueue: BoundedQueue<ParsedProtocolTx>;

  async processLoop(): Promise<void> {
    while (this.running) {
      const block = await this.blockQueue.pop();
      
      for (const tx of block.transactions) {
        const payloadHex = tx.payload;
        
        // Try KU Protocol
        if (isKUTransaction(payloadHex)) {
          const parsed = parseKUPayload(payloadHex);
          if (parsed) {
            await this.parsedQueue.push({
              txHash: tx.id,
              blockHash: block.blockHash,
              blueScore: block.blueScore,
              blockTime: block.timestamp,
              protocol: "ku",
              type: parsed.type,
              parsedData: parsed,
            });
          }
        }

        // Try K Protocol, KRC-721, etc.
        // ...similar for other protocols...
      }
    }
  }
}
```

#### Stage 3: Batch DB Writer

Collects parsed transactions and batch-inserts them into PostgreSQL:

```typescript
class BatchDBWriter {
  private parsedQueue: BoundedQueue<ParsedProtocolTx>;
  private storage: IStorage;
  private batchSize: number;
  private flushIntervalMs: number;

  async processLoop(): Promise<void> {
    let batch: ParsedProtocolTx[] = [];
    let lastFlush = Date.now();

    while (this.running) {
      const item = await this.parsedQueue.tryPop(1000); // 1s timeout

      if (item) {
        batch.push(item);
      }

      // Flush when batch is full or interval elapsed
      const shouldFlush =
        batch.length >= this.batchSize ||
        (batch.length > 0 && Date.now() - lastFlush > this.flushIntervalMs);

      if (shouldFlush) {
        await this.flushBatch(batch);
        batch = [];
        lastFlush = Date.now();
      }
    }
  }

  private async flushBatch(batch: ParsedProtocolTx[]): Promise<void> {
    // Batch upsert to ku_indexed_transactions
    // ON CONFLICT (tx_hash) DO NOTHING for idempotency
    await this.storage.batchInsertIndexedTransactions(batch);

    // Update checkpoint to highest blueScore in batch
    const maxBlueScore = Math.max(...batch.map(tx => tx.blueScore));
    await this.storage.saveIndexerCheckpoint("pipeline", maxBlueScore);
  }
}
```

#### Virtual Chain Handler (Reorg Detection)

Kaspa's BlockDAG can have reorganizations where blocks move in/out of the selected chain. This handler tracks those changes:

```typescript
class VirtualChainHandler {
  private rpcClient: KaspaRpcClient;
  private storage: IStorage;

  async handleVirtualChainChanged(notification: VirtualChainNotification): Promise<void> {
    const { removedChainBlockHashes, addedChainBlockHashes } = notification;

    // Handle removed blocks (orphaned)
    if (removedChainBlockHashes.length > 0) {
      console.log(`[Reorg] ${removedChainBlockHashes.length} blocks removed from chain`);
      
      // Mark affected transactions as orphaned (soft delete)
      await this.storage.markTransactionsOrphaned(removedChainBlockHashes);
      
      // Log the reorg event
      await this.storage.logReorg({
        removedBlocks: removedChainBlockHashes,
        addedBlocks: addedChainBlockHashes,
        timestamp: new Date(),
      });
    }

    // Handle added blocks (reprocess if needed)
    if (addedChainBlockHashes.length > 0) {
      console.log(`[Reorg] ${addedChainBlockHashes.length} blocks added to chain`);
      // These blocks will be processed by the normal block fetcher
      // The batch writer's upsert handles re-insertion idempotently
    }
  }
}
```

### RPC Connection Management

```typescript
class RpcConnectionManager {
  private maxReconnectAttempts = 20;
  private baseDelayMs = 1000;

  async connectWithRetry(): Promise<void> {
    let attempt = 0;

    while (attempt < this.maxReconnectAttempts) {
      try {
        await this.connect();
        console.log("[RPC] Connected successfully");
        attempt = 0; // Reset on success
        return;
      } catch (error) {
        attempt++;
        const delay = Math.min(
          this.baseDelayMs * Math.pow(2, attempt),
          60000 // Max 60s delay
        );
        console.warn(`[RPC] Connection failed (attempt ${attempt}), retrying in ${delay}ms`);
        await sleep(delay);
      }
    }

    throw new Error("[RPC] Max reconnection attempts exceeded");
  }
}
```

### Bounded Queue Implementation

Modeled after simply-kaspa-indexer's `ArrayQueue`:

```typescript
class BoundedQueue<T> {
  private items: T[] = [];
  private capacity: number;
  private waiters: Array<(value: T) => void> = [];

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  async push(item: T): Promise<void> {
    // If queue is full, wait for space (backpressure)
    while (this.items.length >= this.capacity) {
      await sleep(10);
    }
    
    // If someone is waiting for an item, give it directly
    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!;
      waiter(item);
      return;
    }
    
    this.items.push(item);
  }

  async pop(): Promise<T> {
    if (this.items.length > 0) {
      return this.items.shift()!;
    }

    // Wait for an item
    return new Promise<T>(resolve => {
      this.waiters.push(resolve);
    });
  }

  get size(): number { return this.items.length; }
  get remaining(): number { return this.capacity - this.items.length; }
}
```

### Configuration via Environment Variables

| Variable | Default | Description |
|---|---|---|
| `KASPA_RPC_URL` | `ws://localhost:17110` | kaspad WebSocket RPC endpoint |
| `KU_INDEXER_MODE` | `hybrid` | `hybrid` or `pipeline` |
| `KU_QUEUE_CAPACITY` | `1000` | Bounded queue capacity |
| `KU_BATCH_SIZE` | `50` | DB batch insert size |
| `KU_FLUSH_INTERVAL_MS` | `5000` | Max time between DB flushes |
| `KU_ENABLE_REORG_HANDLING` | `true` | Track virtual chain changes |
| `KU_ENABLE_PRUNING` | `false` | Enable old data cleanup |
| `KU_RETENTION_DAYS` | `90` | Days to retain raw indexed data |

---

## Database Schema (Shared)

Both options use the same local PostgreSQL tables. These extend the existing Drizzle schema in `shared/schema.ts`.

### New Tables

```sql
-- Indexed protocol transactions (parsed and stored locally)
CREATE TABLE ku_indexed_transactions (
  id SERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  block_hash TEXT,
  blue_score BIGINT,
  block_time BIGINT,                  -- Unix timestamp (ms)
  protocol TEXT NOT NULL,              -- "ku", "k", "krc721"
  type TEXT NOT NULL,                  -- "quiz", "post", "reply", "mint", etc.
  wallet_address TEXT,
  payload_data JSONB,                  -- Parsed payload as JSON
  orphaned BOOLEAN DEFAULT FALSE,      -- Soft-delete for reorgs
  indexed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ku_tx_hash ON ku_indexed_transactions(tx_hash);
CREATE INDEX idx_ku_protocol_type ON ku_indexed_transactions(protocol, type);
CREATE INDEX idx_ku_wallet ON ku_indexed_transactions(wallet_address);
CREATE INDEX idx_ku_blue_score ON ku_indexed_transactions(blue_score);
CREATE INDEX idx_ku_block_time ON ku_indexed_transactions(block_time);
CREATE INDEX idx_ku_orphaned ON ku_indexed_transactions(orphaned) WHERE orphaned = false;

-- Indexer checkpoint (resume after restart)
CREATE TABLE ku_indexer_checkpoint (
  poller_id TEXT PRIMARY KEY,          -- "hybrid-poller" or "pipeline"
  last_blue_score BIGINT NOT NULL,
  last_block_hash TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reorg log (audit trail for chain reorganizations) — Option B only
CREATE TABLE ku_reorg_log (
  id SERIAL PRIMARY KEY,
  removed_block_hashes TEXT[],
  added_block_hashes TEXT[],
  affected_tx_count INTEGER DEFAULT 0,
  logged_at TIMESTAMP DEFAULT NOW()
);
```

### Drizzle ORM Definitions

```typescript
// To be added in shared/schema.ts or server/db/schema.ts

import { pgTable, serial, text, bigint, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const kuIndexedTransactions = pgTable("ku_indexed_transactions", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  blockHash: text("block_hash"),
  blueScore: bigint("blue_score", { mode: "number" }),
  blockTime: bigint("block_time", { mode: "number" }),
  protocol: text("protocol").notNull(),      // "ku", "k", "krc721"
  type: text("type").notNull(),              // "quiz", "post", "reply", etc.
  walletAddress: text("wallet_address"),
  payloadData: jsonb("payload_data"),
  orphaned: boolean("orphaned").default(false),
  indexedAt: timestamp("indexed_at").defaultNow(),
});

export const kuIndexerCheckpoint = pgTable("ku_indexer_checkpoint", {
  pollerId: text("poller_id").primaryKey(),
  lastBlueScore: bigint("last_blue_score", { mode: "number" }).notNull(),
  lastBlockHash: text("last_block_hash"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const kuReorgLog = pgTable("ku_reorg_log", {
  id: serial("id").primaryKey(),
  removedBlockHashes: text("removed_block_hashes").array(),
  addedBlockHashes: text("added_block_hashes").array(),
  affectedTxCount: integer("affected_tx_count").default(0),
  loggedAt: timestamp("logged_at").defaultNow(),
});
```

### Storage Interface Additions

```typescript
// To be added to IStorage in server/storage.ts

interface IStorage {
  // ... existing methods ...

  // Indexed transactions
  saveIndexedTransaction(tx: InsertKuIndexedTransaction): Promise<KuIndexedTransaction>;
  batchInsertIndexedTransactions(txs: InsertKuIndexedTransaction[]): Promise<number>;
  getIndexedTransactionByHash(txHash: string): Promise<KuIndexedTransaction | undefined>;
  getIndexedTransactions(options: {
    protocol?: string;
    type?: string;
    walletAddress?: string;
    limit?: number;
    offset?: number;
    includeOrphaned?: boolean;
  }): Promise<KuIndexedTransaction[]>;
  markTransactionsOrphaned(blockHashes: string[]): Promise<number>;

  // Checkpoint
  getIndexerCheckpoint(pollerId: string): Promise<KuIndexerCheckpoint | null>;
  saveIndexerCheckpoint(pollerId: string, blueScore: number, blockHash?: string): Promise<void>;

  // Reorg log
  logReorg(entry: InsertKuReorgLog): Promise<void>;
  getReorgLog(limit?: number): Promise<KuReorgLog[]>;
}
```

---

## Cost & Tradeoff Comparison

| Factor | Option A (Hybrid) | Option B (Full Pipeline) |
|---|---|---|
| **Setup complexity** | Low — just HTTP polling | High — WebSocket RPC, queue system, reorg handling |
| **Infrastructure dependency** | Requires external indexer instance | Requires kaspad node access |
| **Compute cost** | Minimal — one HTTP request per 30s | High — continuous block processing at 10 BPS |
| **Database writes** | Low — only protocol txs (~0.01% of all txs) | Medium — protocol txs + checkpoints + reorg logs |
| **Database storage** | ~1-10 MB/month (protocol txs only) | ~50-500 MB/month (depends on retention) |
| **Latency** | 30-60s behind chain tip | ~1-5s behind chain tip |
| **Reorg handling** | Delegated to external indexer | Built-in virtual chain handling |
| **Historical backfill** | Yes, via checkpoint adjustment | Yes, but resource-intensive |
| **Reliability** | Depends on external API uptime | Self-contained, but needs kaspad uptime |
| **Replit compatibility** | Excellent — lightweight HTTP polling | Challenging — sustained WebSocket + CPU load |
| **Maintenance** | Low — simple polling loop | High — queue management, connection handling, reorg logic |
| **Lines of code** | ~300-400 | ~1500-2000 |
| **Time to implement** | 1-2 days | 1-2 weeks |

### Resource Requirements on Replit

**Option A:**
- CPU: Negligible (one HTTP request every 30s)
- Memory: ~10-20 MB additional
- Network: ~1-5 KB per poll cycle
- Suitable for Replit's standard compute

**Option B:**
- CPU: Moderate-high (processing 10 blocks/second, each with 200+ transactions)
- Memory: ~100-500 MB (bounded queues, in-flight data)
- Network: Sustained WebSocket connection + block data streaming
- May require Replit's larger compute tiers
- Risk of hitting connection/timeout limits

---

## Decision Matrix

| Scenario | Recommended Option |
|---|---|
| Hackathon demo / judging | **Option A** — fast to implement, impressive when explained |
| Production with community-hosted indexer available | **Option A** — reliable, low-cost |
| Production with no external indexer available | **Option B** — self-contained |
| Need real-time (<5s) protocol transaction detection | **Option B** — direct RPC subscription |
| Running on Replit standard compute | **Option A** — lightweight |
| Running on dedicated server / VPS | **Either** — depends on preference |
| Want to contribute to Kaspa ecosystem tooling | **Option B** — publish as open source |

---

## Prerequisites & Next Steps

### For Option A (Hybrid)

1. **Find an indexer instance** — Ask community for:
   - Public kaspa-rest-server URL, OR
   - Read-only database credentials for a simply-kaspa-indexer PostgreSQL instance
   - Alternatively, a kas.fyi API endpoint that exposes transaction payload data

2. **Determine API capabilities** — Once you have access:
   - Can it filter by payload content?
   - Can it query by blueScore range?
   - What's the rate limit?
   - What fields are available (payload, block_time, etc.)?

3. **Implement the poller** — Adapt `fetchTransactionsSince()` to the specific API

4. **Add DB schema** — Run Drizzle migration for new tables

5. **Wire into server startup** — Start poller on boot, expose health endpoint

### For Option B (Full Pipeline)

1. **Secure kaspad node access** — Need a WebSocket RPC endpoint:
   - Self-hosted kaspad node, OR
   - Public/community kaspad node with wRPC enabled
   - Ensure it allows subscription to `blockAdded` and `virtualChainChanged`

2. **Test RPC connection** — Verify connectivity, subscription support, and payload data availability

3. **Implement the pipeline** — Build all three stages + virtual chain handler

4. **Load test** — Verify the Node.js implementation can keep up with 10 BPS (this is the main risk)

5. **Add monitoring** — Health endpoint, lag alerts, error tracking

### Immediate Action Items

- [ ] Ask Kaspa community about simply-kaspa-indexer or kaspa-rest-server access
- [ ] Determine which data access pattern is available (REST API vs direct DB vs address-targeted)
- [ ] Choose Option A or B based on available infrastructure
- [ ] Implement chosen option
- [ ] Update replit.md with new indexer architecture

---

*Document prepared for Kaspa University — Kaspathon 2026*
*Reference: [simply-kaspa-indexer](https://github.com/supertypo/simply-kaspa-indexer) (MIT License)*
