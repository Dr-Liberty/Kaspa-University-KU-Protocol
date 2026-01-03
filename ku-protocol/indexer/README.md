# KU Protocol Indexer

The KU Protocol Indexer scans the Kaspa blockchain for educational achievement transactions and provides a queryable API for verification.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Kaspa Node    │────>│   KU Indexer    │────>│   API Server    │
│   (BlockDAG)    │     │   (Scanner)     │     │   (REST/WS)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   PostgreSQL    │<─────────────┘
         │              │   (Cache Only)  │
         │              └─────────────────┘
         │
         └── Source of Truth (On-Chain Data)
```

## Key Principles

1. **On-Chain First**: The blockchain is always the source of truth
2. **Database as Cache**: Local storage is regenerable from chain data
3. **Real-Time Indexing**: Subscribe to new blocks for immediate updates
4. **Verification**: All data can be independently verified

## API Endpoints

### Quiz Proofs

```
GET /api/ku/proofs?address={walletAddress}
```

Returns all quiz completion proofs for an address.

```
GET /api/ku/proofs/{txHash}
```

Returns a specific quiz proof by transaction hash.

### Statistics

```
GET /api/ku/stats
```

Returns platform-wide statistics (all from on-chain data):
- Total quiz completions
- Total rewards distributed
- Active students
- Course completion rates

### Verification

```
GET /api/ku/verify/{txHash}
```

Verifies a quiz proof exists on-chain and returns parsed data.

## Configuration

```env
# Kaspa RPC endpoint
KASPA_RPC_URL=wss://ws.kaspa.org

# Database (cache only)
DATABASE_URL=postgresql://...

# Indexer settings
KU_INDEXER_START_BLOCK=0
KU_INDEXER_BATCH_SIZE=100
```

## Running

```bash
npm install
npm run build
npm run start
```

## Development

```bash
npm run dev     # Start with hot reload
npm run test    # Run tests
npm run lint    # Lint code
```
