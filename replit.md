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

## Recent Changes
- **2026-01-11**: Made on-chain KRC-721 indexer the source of truth for diploma mints:
    - Check `https://mainnet.krc721.stream/api/v1/krc721/mainnet/address/{wallet}/KUDIPLOMA` before blocking mints
    - Stale "minted" database records are automatically cleared if not found on-chain
    - Database is now a cache only; on-chain state is authoritative
    - Added `clearFailedReservations()` method for manual cleanup if needed
- **2026-01-11**: Fixed KRC-721 user-signed minting with proper KasWare API:
    - **Primary method**: `submitCommitReveal("KSPR_KRC721", inscriptionJson)` - handles full commit-reveal cycle
    - **Fallback method**: `signKRC20Transaction(inscriptionJson, 5)` - type=5 for KRC-721 (type=3 is KRC-20 only)
    - Added TypeScript type declarations for `submitCommitReveal` method
    - Inscription JSON format: `{p: "krc-721", op: "mint", tick: "KUDIPLOMA", to: walletAddress}`
- **2026-01-11**: Fixed P2PK script detection for treasury UTXO classification:
    - Kaspa uses 32-byte x-only Schnorr pubkeys (not 33-byte compressed like Bitcoin)
    - P2PK scripts are 68 hex chars: `20` (length 32) + 32-byte pubkey + `ac` (OP_CHECKSIG)
    - Previously incorrectly checking for 70 hex chars with `21` prefix
    - Added Treasury Status admin panel tab for monitoring UTXO availability
- **2026-01-10**: Full KRC-721 spec verification against official `aspectron/krc721/doc/KRC-721.md`:
    - **Deploy**: ✅ Verified (p, op, tick, max, metadata, royaltyFee, royaltyTo, buri)
    - **Mint**: ✅ Verified (p, op, tick, to) - active mint-service.ts is spec-compliant
    - **Discount**: ✅ FIXED - corrected field from `discount` to `discountFee` per spec
    - **REST API**: ✅ Verified all indexer endpoints match official REST.md spec
- **2026-01-10**: Fixed critical KRC-721 discount inscription field name from `discount` to `discountFee` per official spec (aspectron/krc721). This was causing the indexer to reject whitelist transactions, showing full 2000 KAS royalty instead of 10 KAS discount fee.
- **Spec Authority**: KRC-721.md is authoritative; TS.md interface examples are incomplete (missing discountFee in Discount interface).
- **KIP-0009 Compliance**: Reward transactions bump 0.1 KAS outputs to 0.101 KAS (storage mass < 100,000 grams requirement).

## External Dependencies
- **Database**: PostgreSQL.
- **Kaspa Blockchain**: Mainnet, `kaspa-rpc-client`, rusty-kaspa WASM module.
- **IPFS Storage**: Pinata (for NFT metadata and images).
- **VPN Detection**: GetIPIntel API, IP-API.com.
- **Redis**: Optional, for session store.
- **KRC-721 Indexer**: KSPR KRC-721 indexer at mainnet.krc721.stream for NFT operations (discount/whitelist, minting).