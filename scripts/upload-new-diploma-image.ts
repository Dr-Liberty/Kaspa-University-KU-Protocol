/**
 * Upload new generic diploma image to IPFS via Pinata
 * Run with: npx tsx scripts/upload-new-diploma-image.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

async function uploadDiplomaImage(): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('PINATA_API_KEY and PINATA_SECRET_KEY must be set');
  }

  const imagePath = path.join(process.cwd(), 'attached_assets/Screenshot_2026-01-02_004957_1768058228182.png');
  
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at: ${imagePath}`);
  }

  console.log('[Upload] Reading diploma image...');
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', imageBlob, 'kudiploma-generic.png');
  
  const pinataMetadata = JSON.stringify({
    name: 'KUDIPLOMA Generic Diploma Image',
    keyvalues: {
      platform: 'Kaspa University',
      type: 'nft-collection-image',
      network: 'mainnet',
      version: '2'
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  console.log('[Upload] Uploading to Pinata...');
  
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
  console.log(`[Upload] Success! IPFS Hash: ${result.IpfsHash}`);
  console.log(`[Upload] Size: ${result.PinSize} bytes`);
  console.log(`[Upload] Gateway URL: https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
  
  return result.IpfsHash;
}

async function main() {
  console.log('='.repeat(60));
  console.log('KUDIPLOMA - Upload Generic Diploma Image');
  console.log('='.repeat(60));
  console.log('');

  const cid = await uploadDiplomaImage();

  console.log('');
  console.log('='.repeat(60));
  console.log('NEXT STEPS');
  console.log('='.repeat(60));
  console.log('');
  console.log(`1. Update DIPLOMA_IMAGE_CID in scripts/deploy-diploma-metadata.ts:`);
  console.log(`   const DIPLOMA_IMAGE_CID = '${cid}';`);
  console.log('');
  console.log(`2. Run metadata upload script:`);
  console.log(`   npx tsx scripts/deploy-diploma-metadata.ts`);
  console.log('');
  console.log(`3. Update server/routes.ts with new CIDs`);
  console.log('');
}

main().catch(console.error);
