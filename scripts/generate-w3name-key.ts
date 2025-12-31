import * as Name from "w3name";

async function generateKey() {
  console.log("Generating new W3Name IPNS key...\n");
  
  const name = await Name.create();
  
  console.log("IPNS Name (public identifier):");
  console.log(name.toString());
  console.log("");
  
  // Get key bytes - w3name uses .raw or .bytes depending on version
  const key = name.key as any;
  const keyBytes = key.raw || key.bytes || key._key;
  
  if (!keyBytes) {
    console.log("Key structure:", JSON.stringify(Object.keys(key)));
    console.log("Key proto:", Object.getOwnPropertyNames(Object.getPrototypeOf(key)));
    
    // Try to get the private key by marshalling
    if (typeof key.marshal === "function") {
      const marshalled = key.marshal();
      console.log("\nW3NAME_KEY (base64 - add this as a secret):");
      console.log(Buffer.from(marshalled).toString("base64"));
    }
    return;
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
