/**
 * Upload 10,000 token metadata folder to Pinata for KUDIPLOMA
 * Uses Pinata's batch directory upload with wrapWithDirectory
 */

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const IMAGE_CID = 'QmaJGqYfWHBAWAPnenz4yKZ3n8M3fD3YUt73EszaoizCj4';
const MAX_SUPPLY = 10000;
const BATCH_SIZE = 500; // Upload in batches

interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
}

function createMetadata(tokenId: number): TokenMetadata {
  return {
    name: `Kaspa University Diploma #${tokenId}`,
    description: "This NFT is minted for free on the Kaspa.university platform after completing all courses. Ownership does not guarantee that the holder has completed the courses. Please verify on chain KU Protocol Quiz Proofs via the Kaspa.University Education Explorer for authenticity.",
    image: `ipfs://${IMAGE_CID}`,
    attributes: [
      { trait_type: "Platform", value: "Kaspa University" },
      { trait_type: "Type", value: "Completion Diploma" },
      { trait_type: "Courses Completed", value: 16 },
      { trait_type: "Network", value: "Kaspa" }
    ]
  };
}

async function uploadBatch(files: Map<string, string>, batchNum: number): Promise<string> {
  const formData = new FormData();
  
  for (const [fileName, content] of files) {
    const blob = new Blob([content], { type: "application/json" });
    formData.append("file", blob, `metadata/${fileName}`);
  }

  formData.append("pinataMetadata", JSON.stringify({
    name: `kudiploma-batch-${batchNum}`,
    keyvalues: { platform: "Kaspa University", type: "metadata-batch" }
  }));

  formData.append("pinataOptions", JSON.stringify({
    wrapWithDirectory: true
  }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      "pinata_api_key": PINATA_API_KEY!,
      "pinata_secret_api_key": PINATA_SECRET_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${errorText}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

async function uploadAllAtOnce(): Promise<void> {
  console.log("============================================================");
  console.log("KUDIPLOMA FULL METADATA UPLOAD TO PINATA");
  console.log("============================================================");
  console.log("");
  console.log(`Image CID: ${IMAGE_CID}`);
  console.log(`Total tokens: ${MAX_SUPPLY}`);
  console.log("");

  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error("PINATA_API_KEY and PINATA_SECRET_KEY must be set");
  }

  console.log("Creating metadata folder with all tokens...");
  
  const formData = new FormData();
  
  for (let tokenId = 1; tokenId <= MAX_SUPPLY; tokenId++) {
    const metadata = createMetadata(tokenId);
    const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    formData.append("file", blob, `kudiploma-metadata/${tokenId}`);
    
    if (tokenId % 1000 === 0) {
      console.log(`  Created ${tokenId}/${MAX_SUPPLY} metadata files...`);
    }
  }

  console.log("");
  console.log("Uploading to Pinata (this may take a few minutes)...");

  formData.append("pinataMetadata", JSON.stringify({
    name: "kudiploma-metadata",
    keyvalues: { 
      platform: "Kaspa University", 
      type: "nft-metadata-folder",
      maxSupply: MAX_SUPPLY.toString()
    }
  }));

  formData.append("pinataOptions", JSON.stringify({
    wrapWithDirectory: true
  }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      "pinata_api_key": PINATA_API_KEY!,
      "pinata_secret_api_key": PINATA_SECRET_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${errorText}`);
  }

  const result = await response.json();
  const folderCid = result.IpfsHash;

  console.log("");
  console.log("============================================================");
  console.log("SUCCESS!");
  console.log("============================================================");
  console.log("");
  console.log("Folder CID:", folderCid);
  console.log("buri value:", `ipfs://${folderCid}/kudiploma-metadata`);
  console.log("");
  console.log("Verify metadata:");
  console.log(`  Token 1: https://gateway.pinata.cloud/ipfs/${folderCid}/kudiploma-metadata/1`);
  console.log(`  Token 100: https://gateway.pinata.cloud/ipfs/${folderCid}/kudiploma-metadata/100`);
  console.log(`  Token 10000: https://gateway.pinata.cloud/ipfs/${folderCid}/kudiploma-metadata/10000`);
  console.log("");
  console.log("Update MAINNET_DEPLOYMENT_RUNBOOK.md with this buri value!");
}

uploadAllAtOnce().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
