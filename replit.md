# Kaspa University

## Overview
Kaspa University is a Learn-to-Earn educational platform built on the Kaspa L1 blockchain. It enables users to connect Kaspa wallets, complete courses and quizzes, and earn KAS token rewards. The platform issues verifiable KRC-721 NFT certificates for course completions and facilitates public Q&A discussions via K Protocol. Its core vision is "blockchain-powered education that feels effortless," aiming to simplify complex blockchain interactions while showcasing innovation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Kaspa University uses a React with TypeScript frontend (Tailwind CSS, shadcn/ui) and a Node.js with Express backend. It features wallet-based authentication via KasWare/Kastle/Kasanova, direct Kaspa blockchain integration for KAS rewards, on-chain Q&A (K Protocol), block-anchored quiz proofs (KU Protocol), and KRC-721 NFT certificates. Data is managed with Drizzle ORM for PostgreSQL, with Zod for schema validation. Security includes anti-Sybil protection, rate limiting, VPN detection, and UTXO management. Asynchronous blockchain operations are handled by a job queue, and performance is optimized with TTL caches.

### UI/UX Decisions
- **Frontend**: React with TypeScript (Vite).
- **UI Components**: shadcn/ui on Radix UI primitives.
- **Styling**: Tailwind CSS with a Kaspa-themed color system, dark mode.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state and caching.
- **BlockDAG Progress Visualization**: Gamified dashboard showing a visual BlockDAG with courses as blocks, reflecting learning progress.

### Technical Implementations
- **Backend**: Node.js with Express, RESTful JSON API.
- **Data Layer**: Drizzle ORM for PostgreSQL (in-memory, with future migration path).
- **Authentication**: Wallet-based using KasWare via Sign-In with Kaspa (SIWK) standard (`@kluster/kaspa-auth`).
- **Blockchain Integration**: Kaspa WASM module (rusty-kaspa v1.0.1) for transaction signing and `kaspa-rpc-client` for network operations, utilizing PNN Resolver for RPC connections and an optional archival node fallback for historical data.
- **KRC-721 Diploma NFT**: Single collection (KUDIPLOMA, 10,000 max supply). Eligibility requires completion of all courses. Minting is user-signed via whitelisting (0 KAS royalty for graduates + ~10 KAS PoW fee). The blockchain indexer is the authoritative source for NFT status.
- **K Protocol (Public Comments)**: On-chain public comments for lesson Q&A (`k:1:post`, `k:1:reply`).
- **KU Protocol**: Kaspa University-specific format for on-chain quiz completion proofs (`ku:1:quiz`) with block-anchored time windows (start/end DAG blueScore). Verified transactions persisted to PostgreSQL via storage layer.
- **Security**: SIWK challenge-response authentication, anti-Sybil measures (quiz cooldowns, min completion times, daily reward caps, multi-wallet/IP detection), rate limiting, and VPN detection. UTXO management uses mutex-based locking.
- **Performance**: Job queue for async operations, in-memory TTL caching.
- **Cryptography**: Schnorr verification (`@kluster/kaspa-signature`), SHA-256 for quiz answer integrity.

## Recent Changes (Feb 2026)
- Removed Messages page and Kasia Protocol references from UI
- Disabled Kasia backend indexer (messaging feature removed)
- Changed hero CTA to "Learn without a wallet" with demo mode explanation section
- Added mobile-responsive lesson navigation (horizontal dots on mobile, sidebar on desktop)
- Improved analytics grid responsiveness on tablet/mobile
- Polished README for hackathon judging
- Added Silverscript course (Course 4) with peer-reviewed content (KIP-10 introspection, existing opcodes, compiler abstractions)
- Silverscript shown as "Coming Soon" in protocol stack (not live on mainnet); removed from hero protocol count
- Updated landing page future vision section to reflect experimental status
- "Learn without a wallet" now navigates directly to courses page in demo mode
- Changed diploma minting requirement from 16 courses to all courses
- Added vProgs course (4 lessons) based on official Kaspa Research yellow paper
- Updated course counts to 25 courses / 105 lessons
- Added Kasanova Wallet as third wallet partner (alongside KasWare and Kastle)
- Kasanova uses KasWare-compatible window.kasware API; detected via window.kasanova namespace
- Airbridge link (kasanova.app/dapp?url=...) for mobile browser users to open inside Kasanova app
- Implemented block-anchored quiz proofs: KU Protocol now embeds start/end BlockDAG tip (hash + blueScore) into on-chain quiz payloads for verifiable time windows (anti-cheat)
- Added `/api/kaspa/dag-tip` endpoint with `anchoringAvailable` flag; client only attempts anchoring when flag is true
- Updated `createQuizPayload` and `parseKUPayload` to handle block anchor fields (backward-compatible with "none" defaults)
- Verified transactions persisted to PostgreSQL via storage layer (survives server restarts)
- KU Indexer connected to storage on startup via `kuIndexer.setStorage(storage)`
- Added admin endpoints: `/api/admin/verified-transactions` and `/api/admin/batch-verify` (async DB queries)
- Explorer UI shows "Block-Anchored" badge and DAG blueScore range on transactions with block anchors
- Updated KU Protocol section on landing page to show block-anchored format and 5-step flow
- Silverscript course content peer-reviewed: clarified existing opcode usage, KIP-10 introspection, removed vProgs cross-references, updated code examples to use bytes() instead of OpNum2Bin

## External Dependencies
- **Database**: PostgreSQL.
- **Kaspa Blockchain**: Mainnet, `kaspa-rpc-client`, rusty-kaspa WASM module.
- **IPFS Storage**: Pinata (for NFT metadata and images).
- **VPN Detection**: GetIPIntel API, IP-API.com.
- **Redis**: Optional, for session store.
- **KRC-721 Indexer**: KSPR KRC-721 indexer at mainnet.krc721.stream for NFT operations.