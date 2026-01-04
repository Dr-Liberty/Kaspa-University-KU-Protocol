# Kaspa University

## Overview
Kaspa University is a Learn-to-Earn educational platform built on the Kaspa L1 blockchain. It allows users to connect their Kaspa wallets, complete courses and quizzes, and earn KAS token rewards (0.1 KAS per course). The platform issues verifiable NFT certificates for course completions and facilitates decentralized P2P Q&A discussions using Kasia Protocol for ecosystem compatibility. The core vision is "blockchain-powered education that feels effortless," aiming to hide complexity while showcasing innovation.

## Course Content
- **Source**: 16 peer-reviewed courses from BMT University (bmtuniversity.com) + 2 fundamentals + 5 protocol/ecosystem courses
- **Total Courses**: 18 courses covering:
  - Bitcoin vs Kaspa, Sound Money, Self-Custody (Fundamentals)
  - K Protocol, Kasia Protocol, KU Protocol, KRC-721, L2 on Kaspa (Protocols)
  - DAG Terminology, DAG and Kaspa, GHOSTDAG consensus, technical topics (16 BMT courses)
- **Course Order**: Bitcoin vs Kaspa (#1), Sound Money (#2), Self-Custody (#3), KU Protocol (#4), K Protocol (#5), Kasia (#6), KRC-721 (#7), L2 on Kaspa (#8), DAG Terminology (#9), then BMT courses
- **Total Lessons**: 97 lessons
- **Categories**: Fundamentals, Development, Consensus, Technical, Protocols
- **Integration Showcase**: Each protocol course explains how it's used in Kaspa University
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
- **KRC-721 Diploma NFT (SINGLE COLLECTION ARCHITECTURE)**: 
    - **Collection Ticker**: KUDIPLOMA (testnet & mainnet)
    - **Max Supply**: 1,000 diplomas (one per student who completes all 16 courses)
    - **Deploy Cost**: 1,000 KAS budget
    - **Diploma Eligibility**: Must complete ALL 16 courses before minting
    - **Diploma Model**: Single diploma NFT rewarded after 100% course completion. Creates a gamified learning journey with clear progression toward a single achievement.
    - **BlockDAG Progress Visualization**: Gamified progress tracker on the Dashboard showing a visual BlockDAG with 72px cubes. Each course is represented as a block with its thumbnail. Blue blocks are DAG set, red blocks are anticone. Bold blue main chain connects courses. Diploma cube at bottom.
    - **On-Chain First Philosophy**: The blockchain indexer is ALWAYS the source of truth. Database is only used as a cache.
    - **Whitelist-Based Pricing Model**: Collection deployed with 20,000 KAS royaltyFee to deter external minting. Users who complete all courses are automatically whitelisted via the "discount" operation. Fee structure:
        - Non-whitelisted: royaltyFee (20,000 KAS) + PoW fee (~10 KAS) = ~20,010 KAS total
        - Whitelisted (diploma eligible): discountFee (0 KAS) + PoW fee (~10 KAS) = ~10 KAS total
    - **Discount Service** (`server/discount-service.ts`): Automatic whitelisting after course completion. Treasury signs discount inscription: `{p:"krc-721",op:"discount",tick:"KUDIPLOMA",to:walletAddress}`.
    - **User-Signed Minting**: Users sign the mint inscription: `{p:"krc-721",op:"mint",tick:"KUDIPLOMA",to:walletAddress}`. Token IDs assigned randomly by indexer.
    - **Key Files**: `server/mint-service.ts` (diploma reservation logic), `server/nft-metadata-manager.ts` (IPFS uploads), `server/pinata.ts` (Pinata API).
    - **Diploma Designs**: 3 pre-generated cypherpunk-styled designs in `attached_assets/generated_images/`.
    - **Deployment Guide**: See `MAINNET_DEPLOYMENT_RUNBOOK.md` for complete testnet/mainnet deployment instructions.
    - **Legacy Endpoint**: `/api/certificates/:id/claim` is **DISABLED** (returns 410 Gone).
    - **Reservation Lifecycle**:
        1. **Reserve** (`POST /api/diploma/reserve`): Checks eligibility (all 16 courses), creates reservation with 10-minute TTL.
        2. **Signing** (`POST /api/nft/signing/:reservationId`): Updates reservation status to "signing".
        3. **Confirm** (`POST /api/nft/confirm/:reservationId`): Atomically updates reservation to "minted".
        4. **Cancel** (`POST /api/nft/cancel/:reservationId`): Cancels reservation and recycles slot.
        5. **Expire** (automatic cleanup job): Runs every minute, expires old reservations.
    - **Supply Tracking**: Single collection with 1,000 max supply. Counter tracks minted count.
    - **Indexer Info**: KaspacomDAGs has 12-24 hour delay for new collections (spam prevention).
- **Dual-Protocol Messaging System (ON-CHAIN ARCHITECTURE)**:
    - **K Protocol (Public Comments)**: On-chain public comments for lesson Q&A. Format: `k:1:post:{content}` and `k:1:reply:{parentTxId}:{content}`. Indexed by ecosystem K-indexers for cross-platform discovery. Implementation: `server/k-protocol.ts`.
    - **Kasia Protocol (Private Encrypted P2P)**: End-to-end encrypted messaging with handshake-based key exchange. Indexed by Kasia indexers (https://github.com/K-Kluster/Kasia).
        - **FULLY DECENTRALIZED ARCHITECTURE (V3)**: Users broadcast their own on-chain transactions - no treasury/single-point-of-failure dependency.
            - **User-Signed Transactions**: Frontend uses `kasware.sendKaspa(address, amount, { payload: kasiaPayload })` to embed Kasia protocol data directly in user transactions.
            - **Message Cost**: ~0.00002 KAS per message (dust + network fee, paid by sender).
            - **No Treasury Dependency**: Messages broadcast directly from user's wallet - fully censorship resistant.
        - **Protocol Format Alignment (V2)**: Payloads match official Kasia indexer format:
            - Handshake: `ciph_msg:1:handshake:{sealed_hex}` (embedded in tx payload)
            - Message: `ciph_msg:1:comm:{alias}:{sealed_hex}` (embedded in tx payload)
            - sealed_hex contains message data as hex-encoded JSON (simplified format; official Kasia uses ECDH-encrypted ciphertext)
            - Reference: https://github.com/K-Kluster/kasia-indexer/blob/main/protocol/src/operation.rs
        - **On-Chain First Architecture**: The public Kasia indexer (https://indexer.kasia.fyi/) is the SOURCE OF TRUTH. PostgreSQL database is ONLY a performance cache. On startup and every 60 seconds, the system syncs from the public indexer to populate/refresh the local cache. This maintains full decentralization - blockchain is always authoritative.
        - **Kasia Client** (`server/kasia-client.ts`): Queries public Kasia indexer API endpoints (`/handshakes/by-sender`, `/handshakes/by-receiver`, `/messages/by-conversation-alias`).
        - **Message Flow (Decentralized)**:
            1. Frontend calls `/api/messages/prepare` to get Kasia protocol payload
            2. User broadcasts their own tx: `kasware.sendKaspa(recipient, 1000, { payload: kasiaPayload })`
            3. User's wallet signs and broadcasts transaction directly
            4. Frontend reports txHash to backend for local caching/display
            5. Public Kasia indexer indexes the message for cross-app discovery
        - **Legacy Treasury Broadcast**: Still available as fallback if user wallet broadcast fails.
        - **On-Chain Indexer** (`server/kasia-indexer.ts`): Syncs from public Kasia indexer on startup. Tracks conversations and messages with txHash references as proof of on-chain existence.
        - **Payload Encryption** (`server/kasia-encrypted.ts`): Creates Kasia protocol payloads (handshakes and comm messages).
        - **Security Model**: Users sign their own transactions - full ownership and control. No funds can be spent without user signing in KasWare.
        - **Future Enhancement**: Full ECDH encryption requires cipher-wasm module from Kasia repo (ChaCha20-Poly1305 with k256 ECDH). Current simplified format is indexable but not cross-compatible with official Kasia app decryption.
    - **Conversation Status Flow**: `pending` → `active` (after handshake accepted) → messaging enabled.
    - **Admin Handshake Management**: Admin dashboard "Messages" tab allows manual handshake acceptance if auto-accept fails. Treasury broadcasts response handshakes.
    - **UI Components**: QASection tabs for public/private messaging (`client/src/components/qa-section.tsx`), Messages inbox page (`client/src/pages/messages.tsx`).
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