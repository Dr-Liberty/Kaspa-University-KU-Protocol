# KU Protocol Integration Guide

This guide covers how to integrate KU Protocol into your educational platform for recording verifiable achievements on the Kaspa blockchain.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Creating Quiz Proofs](#creating-quiz-proofs)
4. [Verifying Proofs](#verifying-proofs)
5. [Indexing Transactions](#indexing-transactions)
6. [Best Practices](#best-practices)
7. [Example Integration](#example-integration)

## Overview

KU Protocol enables educational platforms to:
- Record quiz completions on the Kaspa blockchain
- Create verifiable, tamper-proof achievement records
- Enable cross-platform credential verification
- Reward learners with cryptocurrency

### Protocol Stack

```
┌─────────────────────────────────────────────┐
│           Your Educational Platform          │
├─────────────────────────────────────────────┤
│              KU Protocol SDK                 │
│  createQuizPayload() | parseKUPayload()     │
├─────────────────────────────────────────────┤
│            Kaspa RPC Client                  │
│  submitTransaction() | getTransaction()      │
├─────────────────────────────────────────────┤
│             Kaspa BlockDAG                   │
│         Immutable Achievement Records        │
└─────────────────────────────────────────────┘
```

## Installation

### NPM Package (coming soon)

```bash
npm install ku-protocol
```

### Direct Import

Copy `src/index.ts` to your project:

```typescript
import { 
  createQuizPayload,
  parseKUPayload,
  isKUTransaction,
  verifyQuizHash
} from './ku-protocol';
```

## Creating Quiz Proofs

### Basic Quiz Payload

```typescript
import { createQuizPayload } from 'ku-protocol';

// After user completes a quiz
const payload = createQuizPayload({
  walletAddress: 'kaspa:qz7vy4v5dwmua4z8rkvqe8zl7fgh6jmqwpxxnvkpqa8gvnxn5ldxuswjmvr7',
  courseId: 'blockchain-basics',
  lessonId: 'lesson-3-consensus',
  score: 8,
  maxScore: 10,
  timestamp: Date.now(),
}, [0, 2, 1, 0, 3, 1, 2, 0, 1, 2]); // User's answer indices

// payload is a hex-encoded string ready for transaction
console.log(payload);
// "6b753a313a7175697a3a6b617370613a717a..."
```

### Sending to Blockchain

> **Note**: The functions `createTransaction` and `signTransaction` below are pseudo-helpers.
> You must implement these using your wallet integration (e.g., KasWare, rusty-kaspa WASM, or kaspa-rpc-client).

```typescript
import { RpcClient } from 'kaspa-rpc-client';

async function recordQuizOnChain(payload: string, walletAddress: string) {
  const rpc = new RpcClient({ url: 'wss://ws.kaspa.org' });
  
  // Create transaction with payload (implement with your wallet SDK)
  const tx = await createTransaction({
    outputs: [{
      address: walletAddress,
      amount: 100000n, // 0.001 KAS (dust amount)
    }],
    payload: payload,
  });
  
  // Sign and broadcast (implement with your wallet SDK)
  const signed = await signTransaction(tx, privateKey);
  const result = await rpc.submitTransaction(signed);
  
  return result.transactionId;
}
```

### Certificate Claims

```typescript
import { createCertPayload } from 'ku-protocol';

// When user completes all courses
const certPayload = createCertPayload({
  walletAddress: 'kaspa:qz...',
  certificateType: 'diploma',
  timestamp: Date.now(),
}, ['course-1', 'course-2', 'course-3']); // Completed course IDs
```

### Progress Markers

```typescript
import { createProgPayload } from 'ku-protocol';

// When user completes a lesson
const progPayload = createProgPayload({
  walletAddress: 'kaspa:qz...',
  courseId: 'blockchain-basics',
  lessonId: 'lesson-2',
  completionType: 'complete', // 'view' | 'complete' | 'quiz-pass'
  timestamp: Date.now(),
});
```

## Verifying Proofs

### Check Transaction Type

```typescript
import { isKUTransaction, parseKUPayload } from 'ku-protocol';

async function verifyTransaction(txHash: string) {
  const rpc = new RpcClient({ url: 'wss://ws.kaspa.org' });
  const tx = await rpc.getTransaction(txHash);
  
  if (!tx.payload) {
    return { valid: false, reason: 'No payload in transaction' };
  }
  
  if (!isKUTransaction(tx.payload)) {
    return { valid: false, reason: 'Not a KU Protocol transaction' };
  }
  
  const parsed = parseKUPayload(tx.payload);
  if (!parsed) {
    return { valid: false, reason: 'Invalid KU payload format' };
  }
  
  return { 
    valid: true, 
    type: parsed.type,
    data: parsed.quiz || parsed.cert || parsed.prog,
  };
}
```

### Verify Quiz Hash

```typescript
import { verifyQuizHash } from 'ku-protocol';

// Verify the content hash matches expected answers
const isValid = verifyQuizHash(
  'lesson-3-consensus',           // lessonId
  [0, 2, 1, 0, 3, 1, 2, 0, 1, 2], // answers
  8,                               // score
  'a3f2b8c9d4e5f6a7'              // expectedHash from blockchain
);

if (isValid) {
  console.log('Quiz answers verified on-chain!');
}
```

## Indexing Transactions

### Scanning for KU Transactions

```typescript
import { isKUTransaction, parseKUPayload } from 'ku-protocol';

class KUIndexer {
  private proofs: Map<string, QuizPayload> = new Map();
  
  async scanBlock(blockHash: string) {
    const rpc = new RpcClient({ url: 'wss://ws.kaspa.org' });
    const block = await rpc.getBlock(blockHash);
    
    for (const tx of block.transactions) {
      if (tx.payload && isKUTransaction(tx.payload)) {
        const parsed = parseKUPayload(tx.payload);
        
        if (parsed?.type === 'quiz' && parsed.quiz) {
          this.proofs.set(tx.hash, parsed.quiz);
          console.log(`Indexed quiz proof: ${tx.hash}`);
        }
      }
    }
  }
  
  getProofsByWallet(address: string): QuizPayload[] {
    return Array.from(this.proofs.values())
      .filter(p => p.walletAddress === address);
  }
}
```

### Real-Time Indexing

```typescript
async function startRealTimeIndexer() {
  const rpc = new RpcClient({ url: 'wss://ws.kaspa.org' });
  const indexer = new KUIndexer();
  
  // Subscribe to new blocks
  await rpc.subscribeVirtualDaaScoreChanged(async (score) => {
    const tips = await rpc.getVirtualChainFromBlock({ startHash: lastHash });
    
    for (const blockHash of tips.addedChainBlockHashes) {
      await indexer.scanBlock(blockHash);
    }
  });
}
```

## Best Practices

### 1. Always Verify On-Chain

Never trust database records alone. Verify against the blockchain:

```typescript
async function getVerifiedScore(txHash: string): Promise<number | null> {
  // Always check blockchain first
  const verification = await verifyTransaction(txHash);
  
  if (!verification.valid || !verification.data?.score) {
    return null;
  }
  
  return verification.data.score;
}
```

### 2. Handle Address Formats

Kaspa addresses contain colons. Use reverse parsing:

```typescript
// Kaspa address: kaspa:qz7vy4v5dwmua4z8rkvqe8zl7fgh6jmqwpxxnvkpqa8gvnxn5ldxuswjmvr7
// When splitting by ':', address spans multiple parts

function parseQuizFields(parts: string[]): QuizPayload {
  const n = parts.length;
  // Parse fixed fields from the end
  return {
    walletAddress: parts.slice(3, n - 6).join(':'), // Reconstruct address
    courseId: parts[n - 6],
    lessonId: parts[n - 5],
    score: parseInt(parts[n - 4], 10),
    maxScore: parseInt(parts[n - 3], 10),
    timestamp: parseInt(parts[n - 2], 10),
    contentHash: parts[n - 1],
  };
}
```

### 3. Include Timestamps

Enable staleness detection and chronological ordering:

```typescript
// Check if proof is recent (within 24 hours)
function isRecentProof(proof: QuizPayload): boolean {
  const age = Date.now() - proof.timestamp;
  return age < 24 * 60 * 60 * 1000;
}
```

### 4. Batch Transactions

For high-volume platforms, batch multiple proofs:

```typescript
// Combine multiple quiz proofs in one transaction
// by sending to multiple outputs with different payloads
async function batchRecordQuizzes(proofs: QuizProof[]) {
  const outputs = proofs.map(p => ({
    address: p.walletAddress,
    amount: 100000n,
    payload: createQuizPayload(p.data, p.answers),
  }));
  
  return submitTransaction({ outputs });
}
```

### 5. Validate Payload Size

Stay within limits for efficiency:

```typescript
import { validatePayloadSize } from 'ku-protocol';

const payload = createQuizPayload(data, answers);

if (!validatePayloadSize(payload)) {
  throw new Error('Payload exceeds maximum size');
}
```

## Example Integration

### Complete Quiz Flow

```typescript
import { 
  createQuizPayload, 
  verifyQuizHash, 
  parseKUPayload 
} from 'ku-protocol';

class QuizService {
  async submitQuiz(
    userId: string,
    lessonId: string,
    answers: number[]
  ): Promise<QuizResult> {
    // 1. Get quiz and validate answers
    const quiz = await this.getQuiz(lessonId);
    const score = this.gradeAnswers(quiz, answers);
    const passed = score >= 70;
    
    // 2. Get user's wallet address
    const wallet = await this.getUserWallet(userId);
    if (!wallet) {
      throw new Error('User wallet not connected');
    }
    
    // 3. Create on-chain proof
    const payload = createQuizPayload({
      walletAddress: wallet.address,
      courseId: quiz.courseId,
      lessonId: lessonId,
      score: score,
      maxScore: 100,
      timestamp: Date.now(),
    }, answers);
    
    // 4. Send to blockchain
    const txHash = await this.kaspaService.sendTransaction({
      to: wallet.address,
      amount: 100000n,
      payload: payload,
    });
    
    // 5. Store result with txHash
    const result = await this.db.saveQuizResult({
      userId,
      lessonId,
      score,
      passed,
      txHash,
      answers,
    });
    
    // 6. Award rewards if passed
    if (passed) {
      await this.rewardService.awardQuizReward(wallet.address);
    }
    
    return result;
  }
  
  async verifyQuizResult(txHash: string): Promise<VerificationResult> {
    // Fetch from blockchain
    const tx = await this.kaspaService.getTransaction(txHash);
    
    if (!tx.payload) {
      return { verified: false, reason: 'No payload' };
    }
    
    const parsed = parseKUPayload(tx.payload);
    
    if (!parsed?.quiz) {
      return { verified: false, reason: 'Not a quiz proof' };
    }
    
    return {
      verified: true,
      data: {
        wallet: parsed.quiz.walletAddress,
        course: parsed.quiz.courseId,
        lesson: parsed.quiz.lessonId,
        score: parsed.quiz.score,
        timestamp: new Date(parsed.quiz.timestamp),
      }
    };
  }
}
```

## Ecosystem Compatibility

KU Protocol is designed to work with:

| Protocol | Purpose | Integration |
|----------|---------|-------------|
| K Protocol | Public Q&A | Share lesson discussions on-chain |
| Kasia Protocol | Private tutoring | Encrypted 1:1 student-teacher messaging |
| KRC-721 | NFT certificates | Mint diploma NFTs for completers |

## Support

- GitHub Issues: [ku-protocol/issues](https://github.com/yourusername/ku-protocol/issues)
- Documentation: [ku-protocol/docs](./docs/)
- Discord: Kaspa community channels
