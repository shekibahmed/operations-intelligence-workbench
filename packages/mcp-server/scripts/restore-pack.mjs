import { copyFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backup = new URL("../package.json.publish-backup", import.meta.url);
try {
  await copyFile(backup, new URL("../package.json", import.meta.url));
  await rm(backup);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    console.error("oiw-mcp: no package.json backup to restore");
  } else {
    throw error;
  }
}

await rm(resolve(packageRoot, "scenario-packs"), { recursive: true, force: true });
