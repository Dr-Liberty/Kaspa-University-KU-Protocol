# Kaspa University

## Overview
Kaspa University is a Learn-to-Earn educational platform built on the Kaspa L1 blockchain. It enables users to connect Kaspa wallets, complete courses and quizzes, and earn KAS token rewards. The platform issues verifiable KRC-721 NFT certificates for course completions and facilitates decentralized P2P Q&A discussions using Kasia Protocol. Its core vision is "blockchain-powered education that feels effortless," aiming to simplify complex blockchain interactions while showcasing innovation.

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
- **Blockchain Integration**: Kaspa WASM module (rusty-kaspa v1.0.1) for transaction signing and `kaspa-rpc-client` for network operations, utilizing PNN Resolver for RPC connections.
- **KRC-721 Diploma NFT**:
    - **Architecture**: Single collection (KUDIPLOMA, 1,000 max supply).
    - **Eligibility**: Requires completion of all 16 courses for minting.
    - **Minting**: User-signed minting via whitelisting mechanism (0 KAS discount fee for eligible users + PoW fee) managed by a `discount-service`.
    - **Lifecycle**: Reservation, signing, confirmation, cancellation, and expiration of diploma mints.
    - **Source of Truth**: Blockchain indexer is authoritative, database acts as a cache.
- **Dual-Protocol Messaging System**:
    - **K Protocol (Public Comments)**: On-chain public comments for lesson Q&A (`k:1:post`, `k:1:reply`).
    - **Kasia Protocol (Private Encrypted P2P)**: Fully decentralized, end-to-end encrypted messaging.
        - **Mechanism**: User-signed transactions embed Kasia protocol data directly (`kasware.sendKaspa`).
        - **Cost**: 0.1 KAS per message, 0.2 KAS per handshake.
        - **Decentralization**: No treasury dependency; messages broadcast directly from user wallets.
        - **Source of Truth**: Public Kasia indexer is authoritative; local database is a cache synced periodically.
        - **Handshake/Message Flow**: Prepare payload, user signs and broadcasts transaction.
        - **Conversation Cache**: `getConversationsForWallet` checks both per-wallet cache AND global `conversations` map for matching participants, ensuring users see their conversations even if Kasia indexer returns empty for their wallet (common for recipients whose handshakes were initiated by others).
- **KU Protocol**: Kaspa University-specific format for on-chain quiz completion proofs (`ku:1:quiz`).
- **Security**:
    - **SIWK**: Challenge-response authentication, nonce replay prevention, challenge expiry.
    - **Anti-Sybil**: Quiz cooldowns, min completion times, daily reward caps, concurrent quiz submission locking.
    - **Rate Limiting**: Endpoint-specific rate limits.
    - **Threat Detection**: IP tracking, multi-wallet/IP detection, VPN detection.
    - **UTXO Management**: Mutex-based locking to prevent double-spending. UTXO transformer with unit tests (`server/__tests__/utxo-transformer.test.ts`) normalizes RPC response formats for WASM SDK compatibility.
- **Performance**: Job queue for async ops, in-memory TTL caching.
- **Cryptography**: Schnorr verification (`@kluster/kaspa-signature`), SHA-256 for quiz answer integrity.

## External Dependencies
- **Database**: PostgreSQL.
- **Kaspa Blockchain**: Mainnet, `kaspa-rpc-client`, rusty-kaspa WASM module.
- **IPFS Storage**: Pinata (for NFT metadata and images).
- **VPN Detection**: GetIPIntel API, IP-API.com.
- **Redis**: Optional, for session store.