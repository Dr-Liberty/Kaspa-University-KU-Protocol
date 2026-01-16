# Kaspa University

[![Kaspa](https://img.shields.io/badge/Built%20on-Kaspa-49EACB)](https://kaspa.org)
[![KRC-721](https://img.shields.io/badge/NFT-KRC--721-purple)](https://github.com/aspectron/krc721)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

**Learn-to-Earn on the Kaspa BlockDAG**

Kaspa University is a decentralized educational platform that rewards learners with KAS tokens for completing courses and quizzes. Built on the Kaspa L1 blockchain, it features verifiable on-chain quiz proofs, KRC-721 diploma NFTs, and end-to-end encrypted P2P messaging.

## Features

### Learn & Earn
- **23 Courses, 97 Lessons** covering Kaspa fundamentals, BlockDAG technology, and cryptocurrency concepts
- **KAS Token Rewards** for completing quizzes with passing scores (70%+)
- **Gamified Progress** with visual BlockDAG representation of your learning journey

### On-Chain Verification
- **KU Protocol** - Quiz completions recorded on-chain with cryptographic proofs
- **K Protocol** - Public Q&A discussions stored on the blockchain
- **Kasia Protocol** - End-to-end encrypted private messaging

### KRC-721 Diploma NFTs
- **KUDIPLOMA Collection** - Limited supply of 10,000 NFTs
- **Eligibility** - Complete all courses to qualify for minting
- **User-Signed Minting** - Decentralized minting via KasWare wallet
- **On-Chain Source of Truth** - Indexer verification ensures authenticity

### Security
- **Wallet-Based Auth** - Sign-In with Kaspa (SIWK) standard
- **Anti-Sybil Protection** - Multi-wallet detection (2+ per IP = blocked), multi-IP detection (3+ = warned), VPN blocking
- **Daily Caps** - 5 KAS maximum daily rewards, 3 quiz attempts per lesson per day
- **Rate Limiting** - Endpoint-specific protection against abuse

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, Drizzle ORM |
| Blockchain | Kaspa WASM (rusty-kaspa v1.0.1), kaspa-rpc-client |
| Database | PostgreSQL |
| NFT | KRC-721, KSPR Indexer |
| Storage | IPFS (Pinata) |

## Requirements

- **Node.js** v20+ (LTS recommended)
- **PostgreSQL** 14+
- **KasWare Wallet** (browser extension for testing)
- **Kaspa RPC** access (public nodes available)

## Quick Start

See [SETUP.md](./SETUP.md) for detailed installation and configuration instructions.

```bash
# Clone the repository
git clone https://github.com/Dr-Liberty/Kaspa-university-KU-Protocol.git
cd Kaspa-university-KU-Protocol

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

## Project Structure

```
kaspa-university/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── lib/            # Utilities and wallet context
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Data access layer
│   ├── kaspa.ts            # Kaspa blockchain integration
│   ├── krc721.ts           # NFT minting service
│   ├── ku-protocol.ts      # On-chain quiz proofs
│   ├── kasia-*.ts          # Encrypted messaging
│   └── wasm/               # Kaspa WASM module
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle ORM schemas
├── ku-protocol/            # KU Protocol specification
│   ├── README.md           # Protocol overview
│   ├── PROTOCOL_SPECIFICATIONS.md
│   └── src/                # Reference implementation
└── scripts/                # Deployment utilities
```

## Protocols

### KU Protocol
On-chain educational achievement proofs. See [ku-protocol/README.md](./ku-protocol/README.md).

```
ku:1:quiz:{wallet}:{courseId}:{lessonId}:{score}:{maxScore}:{timestamp}:{hash}
```

### K Protocol
Public microblogging for Q&A discussions.

```
k:1:post:{content}
k:1:reply:{parentId}:{content}
```

### Kasia Protocol
End-to-end encrypted P2P messaging via on-chain handshakes.

## KRC-721 Diploma

The KUDIPLOMA collection is deployed on Kaspa mainnet:
- **Ticker**: KUDIPLOMA
- **Max Supply**: 10,000
- **Royalty Fee**: 0 KAS (whitelisted graduates)
- **PoW Fee**: ~10 KAS (covers platform + network costs)

Eligibility requires completion of all courses in the curriculum.

## API Reference

### Stats
```
GET /api/stats
```
Returns platform statistics including active learners, KAS distributed, and diplomas minted.

### Courses
```
GET /api/courses
GET /api/courses/:id
GET /api/courses/:courseId/lessons
```

### Quiz
```
GET /api/quiz/:lessonId
POST /api/quiz/:lessonId/submit
```

### Wallet
```
POST /api/auth/challenge
POST /api/auth/verify
GET /api/user/profile
```

### NFT
```
GET /api/diploma/eligibility
POST /api/diploma/reserve
POST /api/diploma/confirm
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Express session secret | Yes |
| `KASPA_TREASURY_MNEMONIC` | Treasury wallet mnemonic (or raw key) | Yes |
| `FILEBASE_ACCESS_KEY` | IPFS storage access key | For NFTs |
| `FILEBASE_SECRET_KEY` | IPFS storage secret key | For NFTs |

See [SETUP.md](./SETUP.md) for complete configuration guide.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm test` | Run tests |
| `npm run db:push` | Push schema to database |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Related Projects

- [KU Protocol](./ku-protocol/) - On-chain educational achievement protocol
- [Kasia Protocol](https://github.com/aspect-trading/kasia-protocol) - Encrypted P2P messaging
- [KRC-721](https://github.com/aspectron/krc721) - Kaspa NFT standard
- [rusty-kaspa](https://github.com/kaspanet/rusty-kaspa) - Kaspa node implementation

## License

ISC License - see [LICENSE](./LICENSE) for details.

## Community

- **Website**: [kaspauniversity.com](https://kaspauniversity.com)
- **Discord**: Join the Kaspa community
- **Twitter**: [@KaspaUniversity](https://twitter.com/KaspaUniversity)

---

Built with love for the Kaspa ecosystem
