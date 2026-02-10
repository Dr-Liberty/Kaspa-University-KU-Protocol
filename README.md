# Kaspa University

[![Kaspa](https://img.shields.io/badge/Built%20on-Kaspa-49EACB)](https://kaspa.org)
[![KRC-721](https://img.shields.io/badge/NFT-KRC--721-purple)](https://github.com/aspectron/krc721)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue)](LICENSE)

**Learn-to-Earn on the Kaspa BlockDAG**

Kaspa University is a decentralized educational platform where learners earn real KAS tokens for completing courses and quizzes. Every achievement is recorded on Kaspa L1 with cryptographic proofs, graduates can mint KRC-721 diploma NFTs, and lesson discussions happen on-chain via K Protocol.

> Built for the Kaspathon 2026 hackathon. Try it now: connect a KasWare or Kastle wallet, or browse without one.

---

## What Makes It Different

| Feature | How It Works |
|---------|-------------|
| **Real token rewards** | 0.1 KAS per course, sent directly to your wallet |
| **On-chain quiz proofs** | KU Protocol records every passing score on Kaspa L1 |
| **NFT diplomas** | KRC-721 KUDIPLOMA collection, whitelisted minting for graduates |
| **Public Q&A** | K Protocol posts indexed by ecosystem K-indexers |
| **No signup required** | Wallet-based auth via SIWK standard, or browse without a wallet |

---

## Features

### Curriculum
- 23 courses and 97 lessons covering Kaspa fundamentals, BlockDAG technology, smart contracts, and crypto concepts
- Gamified BlockDAG progress visualization showing courses as blocks in a DAG
- Pass quizzes at 70%+ to complete lessons and unlock rewards

### Three Protocols

**KU Protocol** (custom) - Educational achievement proofs stored on-chain:
```
ku:1:quiz:{wallet}:{courseId}:{lessonId}:{score}:{maxScore}:{timestamp}:{hash}
```

**K Protocol** - Public microblogging for lesson Q&A:
```
k:1:post:{content}
k:1:reply:{parentId}:{content}
```

**KRC-721** - Diploma NFT collection:
- Ticker: KUDIPLOMA, max supply 10,000
- Graduates pay only ~10 KAS (PoW + operational costs)
- Non-graduates pay 20,000 KAS deterrent fee
- Blockchain indexer is the authoritative source for NFT status

### Security
- Sign-In with Kaspa (SIWK) wallet-based authentication
- Anti-Sybil: multi-wallet detection (2+ per IP = blocked), VPN detection
- Daily reward cap of 5 KAS, 3 quiz attempts per lesson per day
- Rate limiting per endpoint, minimum completion time enforcement

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, Drizzle ORM |
| Blockchain | Kaspa WASM (rusty-kaspa v1.0.1), kaspa-rpc-client |
| Database | PostgreSQL (in-memory for dev) |
| Wallets | KasWare, Kastle |
| NFT Indexer | KSPR KRC-721 indexer |
| Storage | IPFS via Pinata |

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/Dr-Liberty/Kaspa-university-KU-Protocol.git
cd Kaspa-university-KU-Protocol
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Start development server
npm run dev
```

See [SETUP.md](./SETUP.md) for detailed configuration including wallet setup, RPC endpoints, and treasury configuration.

### Requirements
- Node.js v20+
- PostgreSQL 14+ (optional, in-memory storage available)
- KasWare or Kastle wallet extension (for testing with rewards)

---

## Project Structure

```
kaspa-university/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (BlockDAG viz, Q&A, wallet dialog)
│   │   ├── pages/          # Landing, Courses, Dashboard, Analytics
│   │   ├── lib/            # Wallet context, API client
│   │   └── hooks/          # Diploma, whitelist, toast hooks
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints (~6000 lines)
│   ├── storage.ts          # Data access layer (IStorage interface)
│   ├── kaspa.ts            # Kaspa blockchain integration
│   ├── krc721.ts           # NFT minting service
│   ├── ku-protocol.ts      # On-chain quiz proof encoding
│   └── wasm/               # Kaspa WASM module (rusty-kaspa)
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle ORM schemas + Zod validation
├── ku-protocol/            # KU Protocol specification
│   ├── README.md           # Protocol overview
│   ├── PROTOCOL_SPECIFICATIONS.md
│   └── src/                # Reference implementation
└── scripts/                # Deployment utilities
```

---

## API Reference

### Authentication
```
POST /api/auth/challenge    # Request SIWK challenge
POST /api/auth/verify       # Verify signed challenge
GET  /api/user/profile      # Get user profile
```

### Courses & Quizzes
```
GET  /api/courses           # List all courses
GET  /api/courses/:id       # Course details
GET  /api/courses/:id/lessons  # Course lessons
GET  /api/quiz/:lessonId    # Get quiz questions
POST /api/quiz/:lessonId/submit  # Submit quiz answers
```

### Rewards & NFTs
```
GET  /api/rewards           # User reward history
POST /api/rewards/:id/claim # Claim pending reward
GET  /api/diploma/eligibility  # Check NFT eligibility
POST /api/diploma/reserve   # Reserve diploma slot
POST /api/diploma/confirm   # Confirm minting
```

### Analytics & Explorer
```
GET  /api/analytics         # Platform analytics
GET  /api/stats             # Public stats bar data
GET  /api/explorer/scan     # On-chain transaction scan
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | For persistence |
| `SESSION_SECRET` | Express session secret | Yes |
| `KASPA_TREASURY_MNEMONIC` | Treasury wallet mnemonic | For rewards |
| `FILEBASE_ACCESS_KEY` | IPFS storage access key | For NFTs |
| `FILEBASE_SECRET_KEY` | IPFS storage secret key | For NFTs |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:push` | Push schema to database |

---

## Related Projects

- [KU Protocol](./ku-protocol/) - On-chain educational achievement protocol
- [K Protocol](https://github.com/thesheepcat/K) - Decentralized microblogging protocol
- [KRC-721](https://github.com/aspectron/krc721) - Kaspa NFT standard
- [rusty-kaspa](https://github.com/kaspanet/rusty-kaspa) - Kaspa node implementation

## License

**AGPL-3.0** - Open source with copyleft. Any modifications or services built on this code must also share their source. See [LICENSE](./LICENSE).

## Community

- **Website**: [kaspauniversity.com](https://kaspauniversity.com)
- **Discord**: Join the Kaspa community
- **Twitter**: [@KaspaUniversity](https://twitter.com/KaspaUniversity)

---

Built with love for the Kaspa ecosystem
