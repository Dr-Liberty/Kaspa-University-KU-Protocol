/**
 * Deploy KUDIPLOMA Collection to Testnet
 * 
 * This script:
 * 1. Uploads the diploma image to IPFS via Pinata
 * 2. Outputs the deployment values for KaspacomDAGs
 * 
 * Run with: npx tsx scripts/deploy-diploma-testnet.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

const DIPLOMA_IMAGE_PATH = 'attached_assets/generated_images/kudiploma_final.png';

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

async function uploadToPinata(imagePath: string): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('PINATA_API_KEY and PINATA_SECRET_KEY must be set');
  }

  console.log(`[Deploy] Reading image from: ${imagePath}`);
  const imageBuffer = fs.readFileSync(imagePath);
  console.log(`[Deploy] Image size: ${imageBuffer.length} bytes`);

  const blob = new Blob([imageBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'kudiploma.png');
  
  const pinataMetadata = JSON.stringify({
    name: 'KUDIPLOMA Collection Image',
    keyvalues: {
      platform: 'Kaspa University',
      type: 'diploma-collection',
      network: 'testnet',
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  console.log('[Deploy] Uploading to Pinata...');
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key': PINATA_API_KEY,
      'pinata_secret_api_key': PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${errorText}`);
  }

  const result: PinataResponse = await response.json();
  console.log(`[Deploy] Upload successful!`);
  console.log(`[Deploy] IPFS Hash: ${result.IpfsHash}`);
  console.log(`[Deploy] Gateway URL: https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
  
  return result.IpfsHash;
}

async function main() {
  console.log('='.repeat(60));
  console.log('KUDIPLOMA TESTNET DEPLOYMENT');
  console.log('='.repeat(60));
  console.log('');

  // Check if image exists
  if (!fs.existsSync(DIPLOMA_IMAGE_PATH)) {
    console.error(`ERROR: Diploma image not found at ${DIPLOMA_IMAGE_PATH}`);
    process.exit(1);
  }

  // Upload to IPFS
  const ipfsHash = await uploadToPinata(DIPLOMA_IMAGE_PATH);

  console.log('');
  console.log('='.repeat(60));
  console.log('DEPLOYMENT VALUES FOR KaspacomDAGs');
  console.log('='.repeat(60));
  console.log('');
  console.log('Go to: https://testnet-10.krc721.stream/');
  console.log('');
  console.log('Fill in the following values:');
  console.log('');
  console.log(`  Collection Name:        KUTEST7`);
  console.log(`  Total Supply:           10000`);
  console.log(`  Metadata URL (IPFS):    ipfs://${ipfsHash}`);
  console.log(`  Mint Price:             20000`);
  console.log(`  Mint Funds Recipient:   (leave blank)`);
  console.log(`  Premint NFT Allocation: 0`);
  console.log(`  Mint DAA Score:         (leave blank)`);
  console.log(`  Premint Tokens Recipient: (leave blank)`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('IMPORTANT NOTES:');
  console.log('- The 20000 royalty fee (in KAS) deters external mints');
  console.log('- Whitelisted users (course completers) pay 0 via discount op');
  console.log('- Total supply: 10,000 diplomas');
  console.log('- Indexer may take 12-24 hours to show new collection');
  console.log('');
}

main().catch(console.error);
