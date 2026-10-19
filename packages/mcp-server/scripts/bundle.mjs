import { build } from "esbuild";
import { chmod, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["@modelcontextprotocol/sdk", "zod", "yaml"],
  sourcemap: true,
  legalComments: "none",
};

await build({
  ...shared,
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
});

await build({
  ...shared,
  entryPoints: ["src/cli.ts"],
  outfile: "dist/cli.js",
  banner: { js: "#!/usr/bin/env node" },
});

await chmod("dist/cli.js", 0o755);

const keptJavaScript = new Set(["cli.js", "index.js", "cli.js.map", "index.js.map"]);

async function pruneEmit(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await pruneEmit(path);
        return;
      }
      if (entry.name.includes(".test.")) {
        await rm(path);
        return;
      }
      if ((entry.name.endsWith(".js") || entry.name.endsWith(".js.map")) && !keptJavaScript.has(entry.name)) {
        await rm(path);
      }
    }),
  );
}

await pruneEmit("dist");
