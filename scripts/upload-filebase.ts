/**
 * Upload KUDIPLOMA collection to Filebase IPFS via S3 API
 * 
 * Run with: npx tsx scripts/upload-filebase.ts
 */

import * as fs from 'fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const ACCESS_KEY = process.env.FILEBASE_ACCESS_KEY;
const SECRET_KEY = process.env.FILEBASE_SECRET_KEY;
const BUCKET = 'kudiploma';
const DIPLOMA_IMAGE_PATH = 'attached_assets/generated_images/kudiploma_final.png';
const MAX_SUPPLY = 10000;

const s3 = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY!,
    secretAccessKey: SECRET_KEY!,
  },
});

async function uploadFile(key: string, body: Buffer | string, contentType: string): Promise<string | null> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: typeof body === 'string' ? Buffer.from(body) : body,
    ContentType: contentType,
  });
  
  await s3.send(command);
  
  // Get the CID from object metadata
  const headCommand = new HeadObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  
  const headResponse = await s3.send(headCommand);
  return headResponse.Metadata?.cid || null;
}

async function main() {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('FILEBASE_ACCESS_KEY and FILEBASE_SECRET_KEY must be set');
  }

  console.log('='.repeat(60));
  console.log('KUDIPLOMA UPLOAD via Filebase S3 API');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Upload diploma image
  console.log('Step 1: Uploading diploma image...');
  const imageBuffer = fs.readFileSync(DIPLOMA_IMAGE_PATH);
  const imageCid = await uploadFile('kudiploma.png', imageBuffer, 'image/png');
  console.log('Image uploaded! CID:', imageCid);

  if (!imageCid) {
    throw new Error('Failed to get image CID');
  }

  // Step 2: Upload each metadata file
  console.log(`Step 2: Uploading ${MAX_SUPPLY} metadata files...`);
  
  for (let tokenId = 1; tokenId <= MAX_SUPPLY; tokenId++) {
    const metadata = {
      name: `Kaspa University Diploma #${tokenId}`,
      description: "This NFT is minted for free on the Kaspa.university platform after completing all courses. Ownership does not guarantee that the holder has completed the courses. Please verify on chain KU Protocol Quiz Proofs via the Kaspa.University Education Explorer for authenticity.",
      image: `ipfs://${imageCid}`,
      attributes: [
        { traitType: "Platform", value: "Kaspa University" },
        { traitType: "Type", value: "Completion Diploma" },
        { traitType: "Courses Completed", value: 16 },
        { traitType: "Network", value: "Kaspa" }
      ]
    };
    
    await uploadFile(`metadata/${tokenId}`, JSON.stringify(metadata), 'application/json');
    
    if (tokenId % 500 === 0) console.log(`  ${tokenId}/${MAX_SUPPLY} uploaded...`);
  }

  // Get the metadata folder CID (last file should give us folder CID)
  console.log('Getting metadata folder CID...');
  const metadataCid = await uploadFile('metadata/_index', '{}', 'application/json');
  
  console.log('');
  console.log('='.repeat(60));
  console.log('SUCCESS!');
  console.log('='.repeat(60));
  console.log('');
  console.log('Image CID:', imageCid);
  console.log('');
  console.log('NOTE: Filebase assigns CIDs per-file, not per-folder.');
  console.log('For KRC-721, we need a folder CID. Check Filebase dashboard');
  console.log('for the "metadata" folder CID, or use the image CID for now.');
  console.log('');
  console.log('DEPLOYMENT VALUES FOR KaspacomDAGs:');
  console.log('  Collection Name: KUTEST7');
  console.log('  Total Supply: 10000');
  console.log('  Metadata URL: ipfs://' + imageCid + ' (or folder CID from dashboard)');
  console.log('  Mint Price: 20000');
}

main().catch(e => console.error('Error:', e.message || e));
