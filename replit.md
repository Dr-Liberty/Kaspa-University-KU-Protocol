# Kaspa University

## Overview
Kaspa University is a Learn-to-Earn educational platform built on the Kaspa L1 blockchain. It allows users to connect their Kaspa wallets, complete courses and quizzes, and earn KAS token rewards (0.1 KAS per course). The platform issues verifiable NFT certificates for course completions and facilitates decentralized P2P Q&A discussions using Kasia Protocol for ecosystem compatibility. The core vision is "blockchain-powered education that feels effortless," aiming to hide complexity while showcasing innovation.

## Course Content
- **Source**: 16 peer-reviewed courses imported from BMT University (bmtuniversity.com)
- **Total Lessons**: 69 lessons covering Kaspa fundamentals, BlockDAG technology, GHOSTDAG consensus, and technical topics
- **Categories**: Fundamentals, Development, Consensus, Technical
- **Reward**: 0.1 KAS per course completion (storage mass optimized for KIP-0009 compliance)
- **Data File**: `server/seed-data.ts` contains all course content, lessons, and quiz questions

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Kaspa University utilizes a React with TypeScript frontend, styled with Tailwind CSS and shadcn/ui, and a Node.js with Express backend. The system is designed for wallet-based authentication via KasWare, integrating directly with the Kaspa blockchain for KAS token rewards, on-chain Q&A (KU Protocol), and KRC-721 NFT certificates. Data is managed with Drizzle ORM for PostgreSQL (currently in-memory with future migration path), and schema validation is Zod-based. A robust security layer includes anti-Sybil protection, rate limiting, VPN detection, and UTXO management to prevent race conditions. Asynchronous blockchain operations are handled via a job queue, and performance is optimized with various TTL caches.

### UI/UX Decisions
- **Frontend Framework**: React with TypeScript, using Vite.
- **UI Components**: shadcn/ui built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom Kaspa-themed color system (teal primary, dark mode support).
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state and caching.

### Technical Implementations
- **Backend Runtime**: Node.js with Express, serving a RESTful JSON API.
- **Data Layer**: Drizzle ORM configured for PostgreSQL (in-memory currently).
- **Authentication**: Purely wallet-based using KasWare browser extension, no traditional login.
- **Blockchain Integration**: Utilizes Kaspa WASM module (rusty-kaspa v1.0.1) for transaction signing and `kaspa-rpc-client` for network operations. RPC connections use **PNN Resolver** for load balancing, automatic failover, and DDoS protection across contributor-run nodes.
- **KRC-721 NFT Certificates**: Implements user-signed minting flow where users sign the mint inscription themselves and appear as the on-chain minter (not treasury wallet). Adheres to KRC-721 standard. Uses IPNS (mutable IPFS pointers via W3Name) for dynamic per-user certificate metadata. Collection buri points to `ipns://KEY/` which resolves to IPFS folder containing token metadata files. Mainnet indexer: https://kaspa-krc721d.kaspa.com/ (KaspacomDAGs).
    - **Whitelist-Based Pricing Model**: Collection deployed with 20,000 KAS royaltyFee to deter external minting. Users who complete courses are automatically whitelisted via the "discount" operation at 10.5 KAS mint fee.
    - **Discount Service Architecture** (`server/discount-service.ts`):
        1. **Automatic Whitelisting**: After first course completion, the discount service sends a commit-reveal transaction to whitelist the user's wallet.
        2. **Database Tracking**: `users.whitelistedAt` and `users.whitelistTxHash` fields track whitelist status to avoid redundant on-chain operations.
        3. **API Endpoints**: `GET /api/whitelist/status` checks status, `POST /api/whitelist/apply` manually triggers whitelist for retry scenarios.
        4. **Frontend Integration**: Certificate cards show whitelist status and enable mint button only for whitelisted users.
        5. **Commit-Reveal Flow**: Treasury wallet signs discount inscription (`{p:"krc-721",op:"discount",tick:"KASPAUNIV",to:walletAddress,discountFee:"1050000000"}`).
    - **User-Signed Minting Architecture**: Users sign the mint inscription directly with their wallet. The reservation system holds tokenIds temporarily while users sign. Key files: `server/mint-service.ts` (reservation logic), `client/src/components/user-signed-mint.tsx` (frontend flow).
    - **IPNS Architecture**: Each mint uploads token metadata to IPFS, rebuilds the metadata folder with all tokens, uploads to IPFS, then updates the IPNS pointer. On restart, metadata is recovered from mintStorage (source of truth for tokenIds) and republished to IPNS.
    - **Key Files**: `server/ipns.ts` (W3Name IPNS service), `server/nft-metadata-manager.ts` (coordinates IPFS/IPNS updates), `server/pinata.ts` (directory upload support).
    - **Reservation Lifecycle**:
        1. **Reserve** (`POST /api/nft/reserve/:certificateId`): Claims a tokenId from counter or recycled pool, creates reservation with 10-minute TTL, returns inscription JSON for user to sign.
        2. **Signing** (`POST /api/nft/signing/:reservationId`): Updates reservation status to "signing" when user begins wallet interaction.
        3. **Confirm** (`POST /api/nft/confirm/:reservationId`): Atomically updates reservation to "minted" and certificate nftStatus to "claimed" within a transaction.
        4. **Cancel** (`POST /api/nft/cancel/:reservationId`): Atomically cancels reservation and recycles tokenId back to available pool.
        5. **Expire** (automatic cleanup job): Runs every minute, expires old reservations and recycles their tokenIds.
    - **Supply Tracking**: Each course has 1,000 NFTs (tokenIds 1-1000, 1001-2000, etc.). Counter tracks offsets 0-999 per course. Recycled tokenIds are stored in `available_token_pool` with unique constraint. Course is sold out only when counter >= 1000 AND recycled pool is empty.
    - **Transaction Safety**: All multi-table operations use Postgres transactions with row-level locking (`FOR UPDATE`, `FOR UPDATE SKIP LOCKED`) to prevent race conditions during concurrent reservations.
- **On-Chain Protocols**:
    - **Kasia Protocol**: Used for Q&A discussions and comments. Format: `1:bcast:{plain text content}`. This enables ecosystem compatibility with Kasia indexers (https://github.com/K-Kluster/Kasia) and cross-platform discovery. Metadata (lesson ID, author) is stored server-side. Implementation: `server/kasia-protocol.ts`.
    - **KU Protocol**: Kaspa University-specific format for quiz completion proofs. Format: `ku:1:quiz:{data}`. Used for reward verification and certificate records. Implementation: `server/ku-protocol.ts`.
- **Security**:
    - **Wallet Authentication**: Challenge-response with cryptographic signature verification using Kaspa WASM. Uses PublicKey.toAddress() to verify public key ownership and verifyMessage() for ECDSA signature validation. KasWare returns base64-encoded ECDSA signatures which are decoded to raw hex (128 chars, no 0x prefix) for WASM verification.
    - **IP Session Binding**: Sessions track original login IP with optional strict enforcement via `STRICT_IP_BINDING=true` env var (default: permissive for mobile compatibility).
    - **Anti-Sybil**: Quiz cooldowns, minimum completion times, daily reward caps, attempt limits, wallet trust scoring, concurrent quiz submission locking.
    - **Rate Limiting**: All endpoints protected with dedicated rate limiters (auth: 10/min, NFT: 10/min, certificates: 20/min, stats: 30/min, quiz: 20/min).
    - **Threat Detection**: IP tracking, multi-wallet/IP detection, VPN detection (GetIPIntel, IP-API.com).
    - **UTXO Management**: Mutex-based locking and transaction tracking to prevent double-spending.
    - **Address Validation**: Mainnet-only Kaspa address validation.
    - **Security Documentation**: See `SECURITY_REMEDIATION.md` for audit findings and remediation plan.
- **Performance**: Job queue system for async blockchain operations, in-memory TTL caching (VPN, stats, security flags, UTXO).
- **Session Management**: Abstracted session store (in-memory/Redis) for horizontal scaling.
- **Cryptography**: ECDSA signature verification for wallet auth, signed tokens for quiz integrity, SHA-256 for answer hashing.

## External Dependencies
- **Database**: PostgreSQL (configured via `DATABASE_URL`).
- **Kaspa Blockchain**: Mainnet integration, `kaspa-rpc-client`, rusty-kaspa WASM module (v1.0.1).
- **IPFS Storage**: Pinata (requires `PINATA_API_KEY`, `PINATA_SECRET_KEY`) for NFT metadata and images.
- **VPN Detection**: GetIPIntel API (requires `GETIPINTEL_CONTACT` for free tier), IP-API.com.
- **Redis**: Optional, for session store (`REDIS_URL`).