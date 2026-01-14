# KU Protocol: Decentralized Educational Achievement Protocol

[![Kaspa](https://img.shields.io/badge/Built%20on-Kaspa-teal)](https://kaspa.org)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

KU Protocol is a decentralized on-chain protocol for recording verifiable educational achievements on the Kaspa BlockDAG. It enables transparent, immutable proof of quiz completions, course progress, and learning milestones.

## Features

- **Verifiable Achievements**: Quiz completions are recorded on-chain with cryptographic proofs
- **Tamper-Proof Records**: All achievements stored on Kaspa's secure BlockDAG
- **Ecosystem Compatible**: Standard format enables cross-platform educational verification
- **Low Cost**: Leverages Kaspa's low transaction fees for affordable proof storage
- **Indexable**: Designed for efficient indexing and query by educational platforms

## Protocol Format

```
ku:{version}:{type}:{data}
```

### Message Types

| Type | Description | Use Case |
|------|-------------|----------|
| `quiz` | Quiz completion proof | Verifiable test results |
| `cert` | Certificate claim | Course completion certificates |
| `prog` | Progress marker | Lesson/module completion |

### Version

Current protocol version: `1`

## Quick Start

```typescript
import { createQuizPayload, parseKUPayload, isKUTransaction } from 'ku-protocol';

// Create a quiz completion proof
const payload = createQuizPayload({
  walletAddress: 'kaspa:qz...',
  courseId: 'btc-vs-kas',
  lessonId: 'lesson-1',
  score: 8,
  maxScore: 10,
  timestamp: Date.now(),
}, [0, 1, 2, 1, 0, 1, 2, 0, 1, 2]); // answer indices

// Verify a transaction contains KU protocol data
if (isKUTransaction(txPayloadHex)) {
  const parsed = parseKUPayload(txPayloadHex);
  console.log('Quiz score:', parsed.quiz?.score);
}
```

## Documentation

- **[Protocol Specifications](./PROTOCOL_SPECIFICATIONS.md)** - Detailed protocol format and field descriptions
- **[Integration Guide](./docs/INTEGRATION.md)** - Step-by-step integration instructions
- **[Examples](./examples/)** - Working code examples
- **[Indexer](./indexer/README.md)** - Blockchain indexer documentation

## Indexer

The KU Indexer scans the Kaspa blockchain for KU protocol transactions and provides a queryable API for educational platforms.

## Integration

KU Protocol is designed to work alongside:
- **K Protocol**: Public microblogging for Q&A discussions
- **Kasia Protocol**: Encrypted P2P messaging for private tutoring
- **KRC-721**: NFT certificates for course completions

## Community

- Built by [Kaspa University](https://kaspauniversity.com)
- Part of the Kaspa educational ecosystem
- Open source and community-driven

## License

ISC License - see [LICENSE](./LICENSE) for details.
