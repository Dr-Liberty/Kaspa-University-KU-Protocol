# Kaspa University

## Overview

Kaspa University is a Learn-to-Earn educational platform built on the Kaspa L1 blockchain. Users connect their Kaspa wallets, complete courses and quizzes, and earn KAS token rewards. The platform issues verifiable NFT certificates for course completions and features decentralized P2P Q&A discussions. The core vision is "blockchain-powered education that feels effortless" - hiding complexity while showcasing innovation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Kaspa-themed color system (teal primary colors, dark mode support)

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: RESTful JSON API with `/api` prefix
- **Storage**: In-memory storage implementation with interface designed for database migration
- **Build System**: esbuild for server bundling, Vite for client

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Zod-based validation with shared types between client and server
- **Current State**: Using in-memory storage; PostgreSQL integration ready via Drizzle configuration

### Authentication Pattern
- **Wallet-based auth**: Users authenticate by connecting Kaspa wallets via KasWare browser extension
- **KasWare Integration**: Uses `window.kasware` API for real wallet connection
- **Session tracking**: Wallet address passed via `x-wallet-address` header
- **Demo mode**: Available for users without wallet extension installed
- **No traditional auth**: No username/password, purely wallet-connected

### Key Data Models
- Users (wallet-linked), Courses, Lessons, Quiz Questions/Results, Certificates, User Progress, Q&A Posts

## External Dependencies

### Database
- PostgreSQL (configured via `DATABASE_URL` environment variable)
- Drizzle Kit for migrations (`npm run db:push`)

### Kaspa Blockchain Integration
- **Network**: Mainnet (production)
- **RPC**: Uses `kaspa-rpc-client` for network operations (pure TypeScript, reliable in Node.js)
- **Signing**: Uses Kaspa WASM module for transaction signing
- **Treasury Secret**: `KASPA_TREASURY_PRIVATEKEY` - 64-character hex private key for the treasury wallet
  - Legacy names `KASPA_TREASURY_PRIVATE_KEY` and `KASPA_TREASURY_MNEMONIC` still work as fallback

### Features Implemented
- KAS token reward distribution on quiz completion
- Wallet-based authentication (wallet address tracking)
- On-chain Q&A storage with KU Protocol (inspired by Kasia)
- Verifiable quiz results embedded in transaction payloads
- Verification page for on-chain content (/verify/:txHash)

### KU Protocol (On-Chain Data)
- **Format**: `ku:{version}:{type}:{data}`
- **Types**:
  - `quiz`: Quiz completion proof with score, answers hash
  - `qa_q`: Q&A question with content hash
  - `qa_a`: Q&A answer referencing parent question tx
- **Files**: `server/ku-protocol.ts` for encoding/decoding, `server/kaspa.ts` for blockchain integration
- **Verification**: `/api/verify/:txHash` endpoint decodes and validates on-chain payloads

### KRC-721 NFT Certificates
- **Standard**: KRC-721 (based on coinchimp/kaspa-krc721-apps)
- **Collection**: KPROOF (Kaspa Proof of Learning)
- **Pattern**: Commit-and-Reveal transaction for NFT inscriptions
- **Implementation**: `server/krc721.ts` for minting, `server/routes.ts` for API
- **Endpoints**:
  - `GET /api/nft/collection` - Collection info and status
  - `GET /api/nft/fee` - Get minting fee info (3.5 KAS)
  - `POST /api/certificates/:id/claim` - User-initiated NFT claiming with payment
  - `GET /api/nft/preview` - Generate certificate image preview
- **User-pays model**: Users claim NFTs by paying ~3.5 KAS minting fee
- **Certificate states**: `pending` -> `minting` -> `claimed`
- **Payment verification**: Server verifies payment to treasury before minting
- **Demo mode**: NFT claiming disabled in demo mode (requires real wallet)
- **Certificate Image**: SVG generated server-side with course details, score, and recipient

### Pinata IPFS Integration
- **Service**: `server/pinata.ts` - Uploads certificate images and metadata to IPFS
- **Environment Variables**: `PINATA_API_KEY`, `PINATA_SECRET_KEY`, `PINATA_GATEWAY` (optional)
- **Fallback**: If Pinata not configured, uses base64 data URIs for certificate images
- **Upload Flow**: SVG image uploaded first, then metadata JSON with image reference

### Anti-Sybil Protection
- **Service**: `server/anti-sybil.ts` - Prevents farming and Sybil attacks
- **Storage**: Database persistence via `server/security-storage.ts` with in-memory fallback
- **Quiz Cooldowns**: 24-hour wait between retaking passed quizzes
- **Minimum Completion Time**: 30 seconds minimum (flags bots completing too fast)
- **Daily Reward Caps**: Maximum 5 KAS per wallet per day
- **Quiz Attempt Limits**: Maximum 3 attempts per quiz
- **Wallet Trust Scoring**: New wallets start at 0.5, increases with legitimate activity
- **New Wallet Penalty**: First 7 days get reduced reward multiplier (50% minimum)
- **API Endpoints**:
  - `GET /api/quiz/:lessonId/status` - Check cooldown and attempt status
  - Quiz start time recorded when fetching questions
  - Validation applied before quiz submission

### Security Middleware
- **Service**: `server/security.ts` - Comprehensive security layer
- **Rate Limiting**: Global (100/min), Quiz (10/min), Rewards (5/min) per IP+wallet
- **IP Tracking**: Tracks wallet-IP bindings, flags multi-wallet IPs (3+ wallets)
- **Multi-IP Detection**: Flags wallets using 5+ different IPs
- **VPN Detection**: GetIPIntel API integration with 6-hour cache, 90% threshold
  - Free tier: 1000 queries/day, 15/minute
  - Contact email: configurable via `GETIPINTEL_CONTACT` env var
  - Fallback: Basic datacenter IP range detection
- **Quiz Answer Validation**: Server-side validation of answer arrays
- **Payment TX Deduplication**: Persistent storage prevents reusing same tx hash for NFT claims
- **Security Flags**: Complete reward blocking for flagged wallets (VPN_DETECTED, MULTI_WALLET_IP, MULTI_IP_WALLET)
- **Input Sanitization**: Q&A content validated and sanitized before storage/on-chain posting

### Security Database Tables
- **security_logs**: Audit log of security events
- **used_payment_txs**: Prevents payment transaction reuse
- **anti_sybil_data**: Per-wallet trust scores and daily limits
- **quiz_attempts**: Full history of quiz attempts for cooldown enforcement
- **ip_activity**: IP address tracking with VPN scores
- **wallet_ip_bindings**: Maps wallets to IPs for multi-account detection

### UTXO Management
- **Service**: `server/utxo-manager.ts` - Prevents UTXO race conditions
- **UTXO Locking**: Mutex-based locking prevents double-spending
- **Transaction Tracking**: Monitors transaction status (pending/confirmed/failed)
- **Confirmation Verification**: Verifies transaction confirmations before release
- **Entry Filtering**: Transactions only use reserved UTXOs, preventing race conditions during concurrent operations
- **Integration**: Fully integrated into kaspa.ts rewards and krc721.ts NFT minting

### Address Validation
- **Service**: `kaspa.ts.validateAddress()` and `krc721.ts.validateAddress()`
- **Mainnet-only**: Rejects kaspatest: and kaspasim: prefixes
- **Format checks**: Validates prefix, length, bech32 characters, address type (q/p)
- **Integration**: Applied before all reward and NFT transactions

### Session Store Abstraction
- **Service**: `server/session-store.ts` - Enables horizontal scaling
- **In-memory**: Default storage for single-instance deployments
- **Redis**: Activated when `REDIS_URL` environment variable is set
- **Stores**: Wallet sessions, auth challenges, quiz sessions with TTL support

### Security Metrics & Monitoring
- **Service**: `server/security-metrics.ts` - Comprehensive security event tracking
- **Hourly Stats**: VPN detections, rewards blocked/distributed, unique wallets
- **Alerting**: Automatic alerts for high VPN detection rate (>10%), reward blocking (>5%), suspicious activity spikes
- **API Endpoints**:
  - `GET /api/security/metrics` - Full metrics with 24-hour hourly breakdown
  - `GET /api/security/metrics/summary` - Quick summary of current security status
  - `GET /api/security/metrics/alerts` - Active security alerts
- **Admin Protection**: Endpoints require `ADMIN_API_KEY` in production

### VPN Detection (Multi-Source)
- **Service**: `server/vpn-detection.ts` - Robust VPN/proxy detection
- **Primary**: GetIPIntel API with 6-hour cache (free tier: 1000/day)
- **Backup**: IP-API.com for VPN field detection
- **Fallback**: Basic datacenter IP range detection (10.x, 172.16-31.x, 192.168.x)
- **Caching**: 6-hour TTL reduces API calls and improves response time

### Test Suite
- **Framework**: Vitest with TypeScript support
- **Test File**: `server/__tests__/security.test.ts`
- **Coverage**: 27 tests covering input validation, IP detection, VPN detection, UTXO manager, security metrics, session store, anti-sybil service
- **Run**: `npx vitest run`

### Performance Optimizations

#### Job Queue System
- **Service**: `server/job-queue.ts` - Async blockchain operations
- **Types**: REWARD, NFT_MINT, QA_POST
- **Benefits**: Non-blocking API responses, automatic retries
- **Endpoints**:
  - `GET /api/jobs/:jobId` - Check job status
  - `GET /api/jobs` - List jobs for wallet
- **Pattern**: HTTP returns immediately with jobId, blockchain work processes in background

#### TTL Caching
- **Service**: `server/cache.ts` - In-memory TTL caches
- **VPN Cache**: 6-hour TTL (matches GetIPIntel recommendations)
- **Stats Cache**: 5-minute TTL
- **Analytics Cache**: 5-minute TTL
- **Security Flags Cache**: 1-minute TTL
- **Benefits**: Reduced database/API calls, faster responses

#### UTXO Cache
- **Service**: `server/utxo-cache.ts` - Treasury UTXO caching
- **Refresh**: Every 30 seconds
- **Benefits**: Reduced RPC calls, faster transaction building

### Cryptographic Utilities
- **Service**: `server/crypto.ts` - Wallet authentication and quiz integrity
- **Challenge-Response Auth**: ECDSA signature verification for wallet authentication
- **Quiz Session Tokens**: Signed tokens ensure quiz integrity
- **Answer Hashing**: SHA-256 hashes of answers for verification

### Planned Features
- Collection deployment on mainnet (one-time setup)

### UI Dependencies
- Radix UI primitives for accessible components
- Lucide React for icons
- Embla Carousel, React Day Picker, Recharts for specialized UI
- Class Variance Authority for component variants