/**
 * Upload 100-token metadata folder to Filebase for testnet
 */

import * as fs from 'fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const ACCESS_KEY = process.env.FILEBASE_ACCESS_KEY;
const SECRET_KEY = process.env.FILEBASE_SECRET_KEY;
const BUCKET = 'kudiploma';
const IMAGE_CID = 'QmaJGqYfWHBAWAPnenz4yKZ3n8M3fD3YUt73EszaoizCj4';
const MAX_SUPPLY = 100;

const s3 = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY!,
    secretAccessKey: SECRET_KEY!,
  },
  forcePathStyle: true,
});

async function uploadFile(key: string, body: string): Promise<string | null> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: Buffer.from(body),
    ContentType: 'application/json',
  }));
  
  const headResponse = await s3.send(new HeadObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
  return headResponse.Metadata?.cid || null;
}

async function main() {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('Keys not set');
  }

  console.log('Uploading 100 metadata files for testnet...');
  console.log('Image CID:', IMAGE_CID);
  
  let lastCid = '';
  
  for (let tokenId = 1; tokenId <= MAX_SUPPLY; tokenId++) {
    const metadata = {
      name: `Kaspa University Diploma #${tokenId}`,
      description: "This NFT is minted for free on the Kaspa.university platform after completing all courses. Ownership does not guarantee that the holder has completed the courses. Please verify on chain KU Protocol Quiz Proofs via the Kaspa.University Education Explorer for authenticity.",
      image: `ipfs://${IMAGE_CID}`,
      attributes: [
        { traitType: "Platform", value: "Kaspa University" },
        { traitType: "Type", value: "Completion Diploma" },
        { traitType: "Courses Completed", value: 16 },
        { traitType: "Network", value: "Kaspa" }
      ]
    };
    
    const cid = await uploadFile(`metadata/${tokenId}`, JSON.stringify(metadata));
    if (cid) lastCid = cid;
    
    if (tokenId % 25 === 0) console.log(`  ${tokenId}/${MAX_SUPPLY} uploaded...`);
  }

  console.log('');
  console.log('SUCCESS!');
  console.log('');
  console.log('Image CID:', IMAGE_CID);
  console.log('Last metadata CID:', lastCid);
  console.log('');
  console.log('NOTE: Filebase gives per-file CIDs. Check dashboard for folder structure.');
  console.log('You may need to use the Pinata test folder CID that worked earlier:');
  console.log('  ipfs://QmQ2QpDvY8FM3VcNxekBisPnWUAs8WTpadDK96Ynipecmr');
}

main().catch(e => console.error('Error:', e.message));
