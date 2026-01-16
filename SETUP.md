# Kaspa University Setup Guide

This guide covers everything you need to deploy and run Kaspa University locally or in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Blockchain Configuration](#blockchain-configuration)
6. [NFT Configuration](#nft-configuration)
7. [Running the Application](#running-the-application)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- **Node.js** v20+ (LTS recommended)
- **PostgreSQL** 14+ (or use Replit's built-in database)
- **KasWare Wallet** (for testing - browser extension)
- **Kaspa Node Access** (public RPC or self-hosted)

## Installation

### Clone the Repository

```bash
git clone https://github.com/anthropics/kaspa-university.git
cd kaspa-university
```

### Install Dependencies

```bash
npm install
```

This installs all frontend and backend dependencies including:
- React, Vite, Tailwind CSS
- Express, Drizzle ORM
- Kaspa WASM module (rusty-kaspa v1.0.1)
- Various Kaspa protocol libraries

## Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kaspa_university

# Session Security
SESSION_SECRET=your-secure-random-string-at-least-32-chars

# Treasury Wallet (for sending rewards)
# Option 1: 12-word mnemonic phrase
KASPA_TREASURY_MNEMONIC=word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12

# Option 2: Raw 64-character hex private key
# KASPA_TREASURY_MNEMONIC=64hexcharshere...
```

### Optional Variables

```env
# IPFS Storage (for NFT metadata)
FILEBASE_ACCESS_KEY=your-filebase-access-key
FILEBASE_SECRET_KEY=your-filebase-secret-key

# Admin Access
ADMIN_PASSWORD=secure-admin-password

# KRC-721 Network (default: mainnet)
KRC721_TESTNET=false

# Support Wallet (for P2P messaging)
SUPPORT_ADDRESS=kaspa:qz...
```

## Database Setup

### Using PostgreSQL

1. Create a new database:
```sql
CREATE DATABASE kaspa_university;
```

2. Push the schema:
```bash
npm run db:push
```

3. (Optional) Seed with demo data:
```bash
npm run db:seed
```

### Schema Overview

The database includes tables for:
- `users` - Wallet addresses and profiles
- `courses` - Course metadata
- `lessons` - Lesson content
- `quiz_questions` - Quiz questions and answers
- `quiz_results` - User quiz submissions with on-chain txHashes
- `progress` - Course progress tracking
- `certificates` - Course completion certificates
- `diploma_reservations` - NFT minting reservations

## Blockchain Configuration

### Treasury Wallet

The treasury wallet is used to:
1. Send KAS rewards to users who complete courses
2. Send quiz proof transactions on-chain
3. Manage UTXO pool for transaction efficiency

**Security Notes:**
- Never commit your mnemonic or private key to git
- Use environment variables or secrets management
- Fund the treasury with enough KAS for rewards (recommend 100+ KAS)

### RPC Connection

The application automatically connects to public Kaspa RPC nodes:
- Primary: `seeder2.kaspad.net:16110`
- Fallback: Multiple public seeders

For production, consider running your own kaspad node.

### Network Configuration

By default, the application runs on **mainnet**. To use testnet:

```env
KRC721_TESTNET=true
```

## NFT Configuration

### KUDIPLOMA Collection

The diploma NFT collection must be deployed before users can mint. The deployment includes:

1. **Collection Deployment** (done once by admin)
   - Ticker: KUDIPLOMA
   - Max Supply: 10,000
   - Metadata stored on IPFS

2. **Whitelist Management**
   - Users who complete all courses are whitelisted
   - Whitelist grants discounted minting (0 KAS royalty)
   - PoW fee (10 KAS) is always required

### IPFS Setup (Filebase)

1. Create account at [filebase.com](https://filebase.com)
2. Create an S3-compatible bucket
3. Add credentials to `.env`:

```env
FILEBASE_ACCESS_KEY=your-access-key
FILEBASE_SECRET_KEY=your-secret-key
```

### KRC-721 Indexer

The application uses the KSPR KRC-721 indexer:
- Mainnet: `https://mainnet.krc721.stream`
- Testnet: `https://testnet.krc721.stream`

This indexer is the source of truth for:
- Minted NFT counts
- Wallet NFT ownership
- Whitelist status verification

## Running the Application

### Development Mode

```bash
npm run dev
```

This starts:
- Express backend on port 5000
- Vite dev server with HMR
- Auto-reloads on file changes

Access the app at `http://localhost:5000`

### Production Build

```bash
npm run build
```

This creates:
- `dist/public/` - Optimized frontend assets
- `dist/index.cjs` - Bundled backend
- `dist/wasm/` - Kaspa WASM module

### Production Start

```bash
npm start
```

Or with environment specification:

```bash
NODE_ENV=production node dist/index.cjs
```

## Production Deployment

### Replit Deployment

1. Fork or import the repository to Replit
2. Add secrets in the Secrets pane:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `KASPA_TREASURY_MNEMONIC`
   - `FILEBASE_ACCESS_KEY`
   - `FILEBASE_SECRET_KEY`
   - `ADMIN_PASSWORD`
3. Click "Run" to start
4. Use "Publish" for production deployment

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY server/wasm ./dist/wasm

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.cjs"]
```

### Environment Checklist

Before going live, ensure:
- [ ] Treasury wallet is funded (100+ KAS recommended)
- [ ] Database is properly backed up
- [ ] Session secret is cryptographically random
- [ ] IPFS credentials are valid
- [ ] KRC-721 collection is deployed
- [ ] Admin password is secure
- [ ] Rate limiting is configured

## Troubleshooting

### WASM Module Not Found

If you see "Kaspa WASM module not found":

1. Check WASM files exist in `server/wasm/`:
   - `kaspa.js`
   - `kaspa_bg.wasm`

2. For production, ensure `npm run build` copies WASM to `dist/wasm/`

### RPC Connection Failures

If blockchain transactions fail:

1. Check internet connectivity
2. Verify RPC endpoint is reachable
3. Try alternative public nodes
4. Check treasury wallet has sufficient balance

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Reset and rebuild
npm run db:push --force
```

### Quiz Proofs Not Recording

1. Check treasury wallet balance (need ~0.1 KAS per proof)
2. Verify UTXO pool is not exhausted
3. Check server logs for transaction errors

### NFT Minting Failures

Common issues:
- **Insufficient PoW fee**: Requires 10 KAS minimum
- **Not whitelisted**: User must complete all courses
- **Indexer timeout**: Retry after 30 seconds
- **Collection supply exhausted**: Check max supply

### Support

For additional help:
- Check [GitHub Issues](https://github.com/anthropics/kaspa-university/issues)
- Join the Kaspa Discord community
- Review server logs for detailed error messages
