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

### Planned Features
- Collection deployment on mainnet (one-time setup)
- IPFS integration for certificate metadata storage

### UI Dependencies
- Radix UI primitives for accessible components
- Lucide React for icons
- Embla Carousel, React Day Picker, Recharts for specialized UI
- Class Variance Authority for component variants