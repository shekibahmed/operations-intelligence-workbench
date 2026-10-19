import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../package.json", import.meta.url);
const original = await readFile(path, "utf8");
const pkg = JSON.parse(original);
if (pkg.devDependencies === undefined) {
  console.error("oiw-mcp: package.json has no devDependencies to strip");
} else {
  await writeFile(new URL("../package.json.publish-backup", import.meta.url), original);
  delete pkg.devDependencies;
  await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`);
}
