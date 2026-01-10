/**
 * Upload KRC-721 Metadata Folder to IPFS
 * 
 * Creates proper metadata structure:
 * - Base folder contains JSON files named 1, 2, 3... for each tokenId
 * - Each JSON references the diploma image
 * 
 * Run with: npx tsx scripts/deploy-diploma-metadata.ts
 */

import * as fs from 'fs';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

// The generic diploma image CID (must be updated after uploading new image)
// TODO: Update this after uploading the new generic diploma image
const DIPLOMA_IMAGE_CID = 'REPLACE_WITH_NEW_CID';
const MAX_SUPPLY = 10000;

interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ traitType: string; value: string | number }>;
}

async function uploadMetadataFolder(): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('PINATA_API_KEY and PINATA_SECRET_KEY must be set');
  }

  console.log('[Deploy] Creating metadata folder for 10,000 tokens...');
  
  // Create FormData with all metadata files
  const formData = new FormData();
  
  // Generate metadata for each token (they're all identical diplomas)
  for (let tokenId = 1; tokenId <= MAX_SUPPLY; tokenId++) {
    const metadata: TokenMetadata = {
      name: `Kaspa University Diploma #${tokenId}`,
      description: "This NFT is minted for free on the Kaspa.university platform after completing all courses. Ownership does not guarantee that the holder has completed the courses. Please verify on chain KU Protocol Quiz Proofs via the Kaspa.University Education Explorer for authenticity.",
      image: `ipfs://${DIPLOMA_IMAGE_CID}`,
      attributes: [
        { traitType: "Platform", value: "Kaspa University" },
        { traitType: "Type", value: "Completion Diploma" },
        { traitType: "Network", value: "Kaspa" }
      ]
    };
    
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    // Files named by tokenId: "kudiploma/1", "kudiploma/2", etc.
    formData.append('file', blob, `kudiploma/${tokenId}`);
    
    if (tokenId % 1000 === 0) {
      console.log(`[Deploy] Created metadata for ${tokenId}/${MAX_SUPPLY} tokens...`);
    }
  }
  
  // Add Pinata metadata
  const pinataMetadata = JSON.stringify({
    name: 'KUDIPLOMA Metadata',
    keyvalues: {
      platform: 'Kaspa University',
      type: 'nft-metadata-folder',
      network: 'testnet',
      maxSupply: MAX_SUPPLY.toString(),
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  console.log('[Deploy] Uploading to Pinata (this may take a while for 10,000 files)...');
  
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

  const result = await response.json();
  console.log(`[Deploy] Upload successful!`);
  console.log(`[Deploy] IPFS Hash: ${result.IpfsHash}`);
  
  return result.IpfsHash;
}

async function main() {
  console.log('='.repeat(60));
  console.log('KUDIPLOMA METADATA FOLDER UPLOAD');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Image CID: ${DIPLOMA_IMAGE_CID}`);
  console.log(`Max Supply: ${MAX_SUPPLY}`);
  console.log('');

  const metadataCid = await uploadMetadataFolder();

  console.log('');
  console.log('='.repeat(60));
  console.log('DEPLOYMENT VALUES FOR KaspacomDAGs');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Collection Name:        KUTEST7`);
  console.log(`  Total Supply:           ${MAX_SUPPLY}`);
  console.log(`  Metadata URL (buri):    ipfs://${metadataCid}`);
  console.log(`  Mint Price:             20000`);
  console.log('');
  console.log('Token metadata will be at:');
  console.log(`  Token #1: ipfs://${metadataCid}/1`);
  console.log(`  Token #2: ipfs://${metadataCid}/2`);
  console.log(`  ... etc`);
  console.log('');
}

main().catch(console.error);
