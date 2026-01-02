# Kaspa University - Mainnet Deployment Runbook

This document provides the complete checklist for deploying the KUPROOF collection on Kaspa mainnet.

## Prerequisites

- **Budget**: Exactly 1,000 KAS in treasury wallet (deploy fee requirement)
- **Secrets configured**: `KASPA_TREASURY_PRIVATEKEY`, `PINATA_API_KEY`, `PINATA_SECRET_KEY`
- **Testnet verification complete**: KUTEST5 collection successfully deployed on testnet-10

## Collection Configuration

| Parameter | Value |
|-----------|-------|
| Ticker | KUPROOF |
| Max Supply | 16,000 (1,000 per course × 16 courses) |
| Royalty Fee | 20,000 KAS (deterrent for non-whitelisted) |
| Discount Fee | 0 KAS (for whitelisted course completers) |
| PoW Fee | 10 KAS minimum (user pays via KasWare) |
| Collection Image CID | `QmePybcjw8MVigsaf5cXBKfoqW5kF5EEK9enxQNwMkbX4y` |

## Environment Variables

### Current (Testnet) Settings
```
KRC721_TESTNET=true
KRC721_TESTNET_TICKER=KUTEST5
VITE_KASPA_NETWORK=testnet-10
```

### Mainnet Settings (TO CHANGE)
```
KRC721_TESTNET=false
KRC721_TICKER=KUPROOF
VITE_KASPA_NETWORK=mainnet
```

## Deployment Steps

### Step 1: Verify Treasury Balance
Ensure the treasury wallet has at least 1,000 KAS. The deploy operation costs exactly 1,000 KAS (PoW fee) plus minimal dust for the commit transaction (~0.1 KAS). The code pre-flight check requires exactly 1,000 KAS.

### Step 2: Update Environment Variables
In Replit Secrets tab or via set_env_vars tool:

1. Change `KRC721_TESTNET` from `true` to `false`
2. Change `VITE_KASPA_NETWORK` from `testnet-10` to `mainnet`
3. Set `KRC721_TICKER=KUPROOF` (optional, defaults to KUPROOF)

### Step 3: Restart Application
The service must restart to pick up the new environment variables.

```bash
# Restart the workflow
# This ensures all services reconnect to mainnet RPC
```

### Step 4: Verify Network Switch
Check the logs to confirm:
- `[Kaspa] KRC721_TESTNET env: 'false' -> isTestnet: false`
- `[Kaspa] RPC connected to mainnet`
- `[KRC721] Network: mainnet`

### Step 5: Deploy Collection
Call the admin deploy endpoint:

```bash
curl -X POST https://your-app.replit.app/api/admin/deploy-collection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

### Step 6: Verify Deployment
Check the collection on the KaspacomDAGs indexer:
- **Indexer URL**: https://kaspa-krc721d.kaspa.com/
- **API**: `https://kaspa-krc721d.kaspa.com/api/v1/krc721/mainnet/nfts/KUPROOF`

Expected response:
```json
{
  "result": {
    "ticker": "KUPROOF",
    "max": "16000",
    "royaltyFee": "2000000000000",
    "state": "deployed",
    "minted": "0"
  }
}
```

Alternative verification via browser: Visit `https://kaspa-krc721d.kaspa.com/mainnet/nfts/KUPROOF`

### Step 7: Upload Course Images
After collection is deployed, upload all 16 course certificate images:

```bash
curl -X POST https://your-app.replit.app/api/admin/upload-course-images \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

## Fee Structure Verification

| User Type | Royalty | PoW Fee | Total Cost |
|-----------|---------|---------|------------|
| Non-whitelisted | 20,000 KAS | 10 KAS | 20,010 KAS |
| Whitelisted (course completer) | 0 KAS | 10 KAS | 10 KAS |

## Minting Architecture

Users sign mint inscriptions directly with KasWare wallet:
1. `POST /api/nft/reserve/:certificateId` - Reserve tokenId, get P2SH address
2. User sends 10 KAS PoW fee to P2SH via KasWare
3. `POST /api/nft/signing/:reservationId` - Mark as signing
4. User signs inscription via KasWare
5. `POST /api/nft/confirm/:reservationId` - Confirm mint after reveal

The legacy `/api/certificates/:id/claim` endpoint is **DISABLED** (returns 410 Gone).

## Rollback Plan

If deployment fails:
1. Change `KRC721_TESTNET` back to `true`
2. Change `VITE_KASPA_NETWORK` back to `testnet-10`
3. Restart application
4. Investigate and fix issues before retry

## Indexer Preference

- **Mainnet**: Use KaspacomDAGs (`kaspa-krc721d.kaspa.com`) as authoritative source
- **Testnet-10**: Use KSPR (`krc721.stream`) for testing

## Important Notes

1. **One-time operation**: Collection deploy can only happen once per ticker
2. **Deterministic image**: Mainnet uses hardcoded CID `QmePybcjw8MVigsaf5cXBKfoqW5kF5EEK9enxQNwMkbX4y`
3. **No mock data**: All certificates and rewards are real on mainnet
4. **Treasury security**: Never expose the treasury private key
