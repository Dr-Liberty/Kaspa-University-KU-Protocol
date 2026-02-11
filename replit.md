# Kaspa University

## Overview
Kaspa University is a Learn-to-Earn educational platform built on the Kaspa L1 blockchain. It enables users to connect Kaspa wallets, complete courses and quizzes, and earn KAS token rewards. The platform issues verifiable KRC-721 NFT certificates for course completions and facilitates public Q&A discussions via K Protocol. Its core vision is "blockchain-powered education that feels effortless," aiming to simplify complex blockchain interactions while showcasing innovation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Kaspa University uses a React with TypeScript frontend (Tailwind CSS, shadcn/ui) and a Node.js with Express backend. It features wallet-based authentication via KasWare, direct Kaspa blockchain integration for KAS rewards, on-chain Q&A (KU Protocol), and KRC-721 NFT certificates. Data is managed with Drizzle ORM for PostgreSQL (currently in-memory), with Zod for schema validation. Security includes anti-Sybil protection, rate limiting, VPN detection, and UTXO management. Asynchronous blockchain operations are handled by a job queue, and performance is optimized with TTL caches.

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
- **KU Protocol**: Kaspa University-specific format for on-chain quiz completion proofs (`ku:1:quiz`).
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
- Added Silverscript course (Course 4) - Kaspa's first L1 smart contract language
- Updated landing page with Silverscript as 4th protocol and future vision roadmap section
- "Learn without a wallet" now navigates directly to courses page in demo mode
- Changed diploma minting requirement from 16 courses to all courses
- Generated Silverscript course thumbnail

## External Dependencies
- **Database**: PostgreSQL.
- **Kaspa Blockchain**: Mainnet, `kaspa-rpc-client`, rusty-kaspa WASM module.
- **IPFS Storage**: Pinata (for NFT metadata and images).
- **VPN Detection**: GetIPIntel API, IP-API.com.
- **Redis**: Optional, for session store.
- **KRC-721 Indexer**: KSPR KRC-721 indexer at mainnet.krc721.stream for NFT operations.