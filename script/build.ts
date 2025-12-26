import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

// Packages that must always be external (WASM, native modules, ESM-only)
const forceExternal = [
  "kaspa",
  "kaspa-rpc-client",
  "secp256k1",
  "bip39",
  "hdkey",
  "bech32",
  "bs58check",
];

async function copyWasmFiles() {
  const wasmDir = "server/wasm";
  const distWasmDir = "dist/wasm";
  
  if (existsSync(wasmDir)) {
    await mkdir(distWasmDir, { recursive: true });
    const files = ["kaspa.js", "kaspa.d.ts", "kaspa_bg.wasm", "kaspa_bg.wasm.d.ts", "package.json"];
    for (const file of files) {
      const src = path.join(wasmDir, file);
      const dest = path.join(distWasmDir, file);
      if (existsSync(src)) {
        await copyFile(src, dest);
        console.log(`Copied ${file} to dist/wasm/`);
      }
    }
  }
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("copying WASM files...");
  await copyWasmFiles();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  
  // Combine filtered deps with force-external packages
  const externals = [
    ...allDeps.filter((dep) => !allowlist.includes(dep)),
    ...forceExternal,
  ];
  
  // Remove duplicates
  const uniqueExternals = [...new Set(externals)];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.url": "__importMetaUrl",
    },
    minify: true,
    external: uniqueExternals,
    logLevel: "info",
    banner: {
      js: `
        const __importMetaUrl = require('url').pathToFileURL(__filename).href;
      `,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
