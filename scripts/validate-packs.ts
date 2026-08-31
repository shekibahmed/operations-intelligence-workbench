import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const packsDirectory = resolve(import.meta.dirname, "../scenario-packs");

try {
  const entries = await readdir(packsDirectory, { withFileTypes: true });
  const packDirectories = entries.filter((entry) => entry.isDirectory());
  console.log(
    `Pack validation command is wired; ${packDirectories.length} pack director${packDirectories.length === 1 ? "y" : "ies"} discovered. Full file loading lands in OIW-103.`,
  );
} catch (error) {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  if (code !== "ENOENT") {
    throw error;
  }
  console.log(`Pack validation command is wired; no ${join("scenario-packs")} directory exists in this contract-freeze task.`);
}
