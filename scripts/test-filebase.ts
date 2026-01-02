import { S3Client, PutObjectCommand, ListBucketsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const ACCESS_KEY = process.env.FILEBASE_ACCESS_KEY!;
const SECRET_KEY = process.env.FILEBASE_SECRET_KEY!;

const s3 = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true,
});

async function main() {
  console.log('Testing Filebase connection...');
  
  try {
    const listCmd = new ListBucketsCommand({});
    const result = await s3.send(listCmd);
    console.log('Buckets found:', result.Buckets?.map(b => b.Name).join(', ') || 'none');
  } catch (e: any) {
    console.log('List buckets error:', e.message);
  }
  
  try {
    const cmd = new PutObjectCommand({
      Bucket: 'kudiploma',
      Key: 'test.txt',
      Body: Buffer.from('Hello IPFS from Kaspa University'),
      ContentType: 'text/plain',
    });
    await s3.send(cmd);
    console.log('Upload success!');
    
    const headCmd = new HeadObjectCommand({
      Bucket: 'kudiploma',
      Key: 'test.txt',
    });
    const headResult = await s3.send(headCmd);
    console.log('File CID:', headResult.Metadata?.cid);
  } catch (e: any) {
    console.log('Upload error:', e.Code || e.name, '-', e.message);
  }
}

main();
