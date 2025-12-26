# Kaspa University

## Overview
Kaspa University is a Learn-to-Earn educational platform built on the Kaspa L1 blockchain. It allows users to connect their Kaspa wallets, complete courses and quizzes, and earn KAS token rewards (0.2 KAS per course). The platform issues verifiable NFT certificates for course completions and facilitates decentralized P2P Q&A discussions. The core vision is "blockchain-powered education that feels effortless," aiming to hide complexity while showcasing innovation.

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
- **Blockchain Integration**: Utilizes Kaspa WASM module (rusty-kaspa v1.0.1) for transaction signing and `kaspa-rpc-client` for network operations.
- **KRC-721 NFT Certificates**: Implements non-custodial minting flow, adhering to KRC-721 standard, using IPFS for metadata.
- **KU Protocol**: Custom on-chain data format for quiz proofs and Q&A content.
- **Security**:
    - **Anti-Sybil**: Quiz cooldowns, minimum completion times, daily reward caps, attempt limits, wallet trust scoring.
    - **Threat Detection**: Rate limiting, IP tracking, multi-wallet/IP detection, VPN detection (GetIPIntel, IP-API.com).
    - **UTXO Management**: Mutex-based locking and transaction tracking to prevent double-spending.
    - **Address Validation**: Mainnet-only Kaspa address validation.
- **Performance**: Job queue system for async blockchain operations, in-memory TTL caching (VPN, stats, security flags, UTXO).
- **Session Management**: Abstracted session store (in-memory/Redis) for horizontal scaling.
- **Cryptography**: ECDSA signature verification for wallet auth, signed tokens for quiz integrity, SHA-256 for answer hashing.

## External Dependencies
- **Database**: PostgreSQL (configured via `DATABASE_URL`).
- **Kaspa Blockchain**: Mainnet integration, `kaspa-rpc-client`, rusty-kaspa WASM module (v1.0.1).
- **IPFS Storage**: Pinata (requires `PINATA_API_KEY`, `PINATA_SECRET_KEY`) for NFT metadata and images.
- **VPN Detection**: GetIPIntel API (requires `GETIPINTEL_CONTACT` for free tier), IP-API.com.
- **Redis**: Optional, for session store (`REDIS_URL`).