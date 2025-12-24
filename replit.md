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
- **Treasury Secret**: `KASPA_TREASURY_PRIVATE_KEY` - 64-character hex private key for the treasury wallet
  - Also supports BIP39 mnemonic phrases (12/24 words)
  - Legacy name `KASPA_TREASURY_MNEMONIC` still works as fallback

### Features Implemented
- KAS token reward distribution on quiz completion
- Wallet-based authentication (wallet address tracking)

### Planned Features
- KRC-721 NFT certificate minting
- On-chain Q&A storage

### UI Dependencies
- Radix UI primitives for accessible components
- Lucide React for icons
- Embla Carousel, React Day Picker, Recharts for specialized UI
- Class Variance Authority for component variants