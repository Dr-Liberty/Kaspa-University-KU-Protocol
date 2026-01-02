# Kaspa University - Mainnet Deployment Runbook

This document provides the complete checklist for deploying the KUDIPLOMA collection on Kaspa mainnet.

## Architecture Overview

**Single Diploma Collection**: Users earn ONE diploma NFT after completing ALL 16 courses.
- Max Supply: 10,000 diplomas (one per student)
- Whitelist-based pricing: Course completers pay 0 KAS royalty (only ~10 KAS PoW fee)
- Non-whitelisted: 20,000 KAS royalty deterrent

## Prerequisites

- **Budget**: Exactly 1,000 KAS in treasury wallet (deploy fee requirement)
- **Secrets configured**: `KASPA_TREASURY_PRIVATEKEY`, `PINATA_API_KEY`, `PINATA_SECRET_KEY`
- **Testnet verification complete**: Diploma collection successfully deployed on testnet

## Collection Configuration

| Parameter | Value |
|-----------|-------|
| Ticker | KUDIPLOMA |
| Max Supply | 10,000 (one diploma per student) |
| Royalty Fee | 20,000 KAS (deterrent for non-whitelisted) |
| Discount Fee | 0 KAS (for whitelisted course completers) |
| PoW Fee | ~10 KAS (user pays via KasWare) |
| Collection Image CID | Upload diploma design to IPFS first |

## IPFS Assets

| Asset | CID | URL |
|-------|-----|-----|
| Diploma Image | `QmaJGqYfWHBAWAPnenz4yKZ3n8M3fD3YUt73EszaoizCj4` | [View](https://gateway.pinata.cloud/ipfs/QmaJGqYfWHBAWAPnenz4yKZ3n8M3fD3YUt73EszaoizCj4) |
| Metadata Folder (10k) | `QmR6KcvppV2zrWeUqfio2aDfGGQmeHhZyse9oK6ttpx2GF` | [Token 1](https://gateway.pinata.cloud/ipfs/QmR6KcvppV2zrWeUqfio2aDfGGQmeHhZyse9oK6ttpx2GF/kudiploma-metadata/1) |

**buri value**: `ipfs://QmR6KcvppV2zrWeUqfio2aDfGGQmeHhZyse9oK6ttpx2GF/kudiploma-metadata`

## Testnet Deployment Values

For testing on the KaspacomDAGs devnet/testnet:

| Field | Value |
|-------|-------|
| Collection Name | `KUTEST7` (or increment) |
| Total Supply | `10000` |
| Metadata URL (buri) | `ipfs://QmR6KcvppV2zrWeUqfio2aDfGGQmeHhZyse9oK6ttpx2GF/kudiploma-metadata` |
| Mint Price | `20000` (royalty deterrent) |
| Mint Funds Recipient | (leave blank - default deployer) |
| Premint NFT Allocation | `0` |
| Mint DAA Score | (leave blank) |
| Premint Tokens Recipient | (leave blank) |

## Environment Variables

### Current (Testnet) Settings
```
KRC721_TESTNET=true
KRC721_TESTNET_TICKER=KUTEST7
VITE_KASPA_NETWORK=testnet-10
```

### Mainnet Settings (TO CHANGE)
```
KRC721_TESTNET=false
KRC721_TICKER=KUDIPLOMA
VITE_KASPA_NETWORK=mainnet
```

## Deployment Steps

### Step 1: Upload Diploma Image to IPFS
Upload the chosen diploma design to Pinata and note the CID.

### Step 2: Verify Treasury Balance
Ensure the treasury wallet has at least 1,000 KAS.

### Step 3: Update Environment Variables
1. Change `KRC721_TESTNET` from `true` to `false`
2. Change `VITE_KASPA_NETWORK` from `testnet-10` to `mainnet`
3. Set `KRC721_TICKER=KUDIPLOMA`

### Step 4: Restart Application
The service must restart to pick up the new environment variables.

### Step 5: Verify Network Switch
Check the logs to confirm:
- `[Kaspa] KRC721_TESTNET env: 'false' -> isTestnet: false`
- `[Kaspa] RPC connected to mainnet`
- `[KRC721] Network: mainnet`

### Step 6: Deploy Collection
Deploy via the KaspacomDAGs interface or admin endpoint.

### Step 7: Verify Deployment
Check the collection on the KaspacomDAGs indexer:
- **Indexer URL**: https://kaspa-krc721d.kaspa.com/
- **API**: `https://kaspa-krc721d.kaspa.com/api/v1/krc721/mainnet/nfts/KUDIPLOMA`

## Fee Structure

| User Type | Royalty | PoW Fee | Total Cost |
|-----------|---------|---------|------------|
| Non-whitelisted | 20,000 KAS | ~10 KAS | ~20,010 KAS |
| Whitelisted (all courses complete) | 0 KAS | ~10 KAS | ~10 KAS |

## Diploma Minting Flow

1. User completes all 16 courses
2. User is automatically whitelisted via discount operation
3. User initiates diploma mint from Dashboard
4. `POST /api/diploma/reserve` - Reserve mint slot, get inscription
5. User sends ~10 KAS PoW fee via KasWare
6. User signs inscription via KasWare
7. `POST /api/diploma/confirm` - Confirm mint after reveal

## KU Protocol Disclaimer

All diploma NFTs include the following on-chain verified disclaimer:

```
KASPA UNIVERSITY DIPLOMA CERTIFICATE

This NFT certifies completion of all 16 courses in the Kaspa University 
Learn-to-Earn program. Verified on-chain via KU Protocol (ku:1:quiz).

DISCLAIMER: This educational certificate is issued on the Kaspa L1 
blockchain. It represents verified course completion and is not 
transferable as proof of academic credentials outside the Kaspa 
ecosystem. All quiz completions are cryptographically signed and 
permanently recorded on-chain.

Powered by BlockDAG Technology | GHOSTDAG Consensus
Kaspa University - Decentralized Education
```

## Rollback Plan

If deployment fails:
1. Change `KRC721_TESTNET` back to `true`
2. Change `VITE_KASPA_NETWORK` back to `testnet-10`
3. Restart application
4. Investigate and fix issues before retry

## Indexer Information

- **Mainnet**: Use KaspacomDAGs (`kaspa-krc721d.kaspa.com`) as authoritative source
- **Testnet-10**: Use KSPR (`krc721.stream`) or KaspacomDAGs devnet
- **Note**: 12-24 hour delay on KaspacomDAGs for new collections (spam prevention)

## Important Notes

1. **One-time operation**: Collection deploy can only happen once per ticker
2. **Single diploma per student**: 1,000 max supply for entire platform
3. **Eligibility**: Must complete ALL 16 courses before minting
4. **No mock data**: All certificates and rewards are real on mainnet
5. **Treasury security**: Never expose the treasury private key

## Diploma NFT Designs

Pre-generated diploma designs available at:
- `attached_assets/generated_images/cypherpunk_diploma_nft_design_1.png`
- `attached_assets/generated_images/cypherpunk_diploma_nft_design_2.png`
- `attached_assets/generated_images/cypherpunk_diploma_nft_design_3.png`

Upload chosen design to Pinata before deployment.
