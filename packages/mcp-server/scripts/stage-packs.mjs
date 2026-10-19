import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(packageRoot, "..", "..", "scenario-packs");
const target = resolve(packageRoot, "scenario-packs");

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
console.error(`oiw-mcp: staged scenario packs into ${target}`);
