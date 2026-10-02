import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderCasebook } from "../../packages/ui/src/casebook.js";
import { loadCasebook } from "./evidence.js";

const output = resolve(import.meta.dirname, "../../apps/web/public/casebook/a-142-repeat-fault.html");

export async function buildCasebook(definitionPath: string, check: boolean): Promise<void> {
  const html = renderCasebook(await loadCasebook(definitionPath));
  if (check) {
    const previous = await readFile(output);
    if (!previous.equals(Buffer.from(html, "utf8"))) throw new Error("Casebook output drifted. Review inputs, then run pnpm casebook:build intentionally.");
    return;
  }
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, html, { flag: "wx" });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args[2] === "--check";
  if ((args.length !== 2 && !(args.length === 3 && check)) || args[0] !== "--definition" || !args[1]) {
    console.error("Usage: casebook/build.ts --definition <case.json> [--check]");
    process.exitCode = 1;
  } else {
    buildCasebook(args[1], check).then(() => {
      console.log(check ? "Casebook matches its historical inputs." : "Validated standalone casebook generated.");
    }).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Casebook generation failed; prior artifact preserved.");
      process.exitCode = 1;
    });
  }
}
