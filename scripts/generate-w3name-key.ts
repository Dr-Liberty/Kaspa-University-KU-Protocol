import * as Name from "w3name";

async function generateKey() {
  console.log("Generating new W3Name IPNS key...\n");
  
  const name = await Name.create();
  
  console.log("IPNS Name (public identifier):");
  console.log(name.toString());
  console.log("");
  
  // The key has a 'bytes' getter that returns the private key bytes
  // For w3name, the key is stored differently - need to check actual structure
  const key = name.key as any;
  
  // Try different ways to get the raw key bytes
  let keyBytes: Uint8Array;
  if (key.bytes) {
    keyBytes = key.bytes;
  } else if (key._key) {
    keyBytes = key._key;
  } else if (key.marshal) {
    keyBytes = key.marshal();
  } else {
    // Print out the key structure to understand it
    console.log("Key structure:", Object.keys(key));
    console.log("Key prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(key)));
    throw new Error("Could not extract key bytes");
  }
  
  const base64Key = Buffer.from(keyBytes).toString("base64");
  
  console.log("W3NAME_KEY (base64 - add this as a secret):");
  console.log(base64Key);
  console.log("");
  
  console.log("IPNS URL for buri:");
  console.log(`ipns://${name.toString()}/`);
  console.log("");
  
  console.log("Instructions:");
  console.log("1. Copy the W3NAME_KEY value above");
  console.log("2. Add it as a secret in your Replit project");
  console.log("3. The IPNS URL will be used as the collection buri");
}

generateKey().catch(console.error);
