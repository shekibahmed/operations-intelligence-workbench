import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Assembles the static project site into `_site/`.
 *
 * The site is hand-written HTML (`site/`) plus assets that other tasks produce
 * (media, casebook, screenshots, docs). Every optional input may be absent: the
 * build then removes the markup that depends on it and says so in the log.
 */

const root = resolve(import.meta.dirname, "../..");
const siteDir = join(root, "site");
const outputDir = join(root, "_site");

export const SITE_URL = "https://shekibahmed.github.io/operations-intelligence-workbench/";
export const DEMO_FALLBACK_URL = "https://github.com/shekibahmed/operations-intelligence-workbench#how-do-i-run-the-demo";

const RAW_DOCS = ["ARCHITECTURE.md", "DOMAIN_MODEL.md", "PACK_AUTHORING.md", "EVALUATION.md"];
const DOCS_MEDIA_PATTERN = /\.(vtt|jpg|gif)$/i;

export interface LiveDemo { url: string; label: string; configured: boolean }

/** Resolves the live demo link: a configured https URL, or the repo quick start. */
export function resolveLiveDemo(value: string | undefined): LiveDemo {
  const trimmed = (value ?? "").trim();
  if (trimmed === "") return { url: DEMO_FALLBACK_URL, label: "Run the demo locally", configured: false };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("LIVE_DEMO_URL is not a valid absolute URL");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("LIVE_DEMO_URL must be an https URL without credentials");
  }
  return { url: parsed.href, label: "Try the live demo", configured: true };
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Removes `<!--requires id=X all|any=path,path-->...<!--/requires id=X-->`
 * blocks whose files are missing, and unwraps the ones that are satisfied.
 */
export function applyRequirements(html: string, has: (path: string) => boolean, removed: string[]): string {
  const opening = /<!--requires id=([a-z0-9-]+) (all|any)=([^ >]+?)-->/;
  let output = html;
  for (let guard = 0; guard < 1000; guard += 1) {
    const match = opening.exec(output);
    if (!match) break;
    const [open, id, mode, list] = match as unknown as [string, string, "all" | "any", string];
    const close = `<!--/requires id=${id}-->`;
    const start = match.index;
    const closeAt = output.indexOf(close, start + open.length);
    if (closeAt < 0) throw new Error(`Unclosed requires block: ${id}`);
    const paths = list.split(",");
    const satisfied = mode === "all" ? paths.every(has) : paths.some(has);
    if (satisfied) {
      output = output.slice(0, start) + output.slice(start + open.length, closeAt) + output.slice(closeAt + close.length);
    } else {
      removed.push(`${id} (needs ${mode === "all" ? "all" : "any"} of ${paths.join(", ")})`);
      output = output.slice(0, start) + output.slice(closeAt + close.length);
    }
  }
  if (/<!--\/?requires\b/.test(output)) throw new Error("Unbalanced requires markers remain");
  return output;
}

function stripMissingPosters(html: string, has: (path: string) => boolean, removed: string[]): string {
  return html.replace(/ poster="([^"]+)"/g, (whole, path: string) => {
    if (has(path)) return whole;
    removed.push(`poster ${path}`);
    return "";
  });
}

function assertNoRootAbsolute(name: string, content: string): void {
  const hit = /\b(?:href|src|poster|action)\s*=\s*["']\/(?!\/)/i.exec(content) ?? /url\(\s*["']?\/(?!\/)/i.exec(content);
  if (hit) throw new Error(`${name}: root-absolute reference "${hit[0]}" breaks sub-path hosting; use a relative path`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await listFiles(full));
    else found.push(full);
  }
  return found;
}

async function copyMatching(sourceDir: string, targetDir: string, accept: (name: string) => boolean, label: string, log: string[]): Promise<string[]> {
  if (!await exists(sourceDir)) {
    log.push(`skipped ${label}: ${relative(root, sourceDir)} not present`);
    return [];
  }
  const copied: string[] = [];
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !accept(entry.name)) continue;
    await mkdir(targetDir, { recursive: true });
    await cp(join(sourceDir, entry.name), join(targetDir, entry.name));
    copied.push(entry.name);
  }
  if (copied.length === 0) log.push(`skipped ${label}: nothing matched in ${relative(root, sourceDir)}`);
  return copied;
}

export async function buildSite(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const demo = resolveLiveDemo(env.LIVE_DEMO_URL);
  const log: string[] = [];
  const staging = `${outputDir}.${randomUUID()}.tmp`;

  try {
    // 1. Hand-written site files (README.md documents the build; it is not published).
    await mkdir(staging, { recursive: true });
    await cp(siteDir, staging, { recursive: true, filter: (source) => relative(siteDir, source) !== "README.md" });

    // 2. Evidence casebook: copied byte for byte and verified.
    const casebookSource = join(root, "apps/web/public/casebook");
    const casebooks = (await readdir(casebookSource)).filter((name) => name.endsWith(".html")).sort();
    if (casebooks.length === 0) throw new Error("No casebook HTML found in apps/web/public/casebook");
    await mkdir(join(staging, "casebook"), { recursive: true });
    for (const name of casebooks) {
      await cp(join(casebookSource, name), join(staging, "casebook", name));
      const [source, copy] = await Promise.all([readFile(join(casebookSource, name)), readFile(join(staging, "casebook", name))]);
      if (!source.equals(copy)) throw new Error(`Casebook copy differs from source: ${name}`);
    }

    // 3. Media: app public media, docs media (captions, posters, hero gif, credits), release MP4s.
    await copyMatching(join(root, "apps/web/public/media"), join(staging, "media"), () => true, "app media", log);
    await copyMatching(join(root, "docs/media"), join(staging, "media"), (name) => DOCS_MEDIA_PATTERN.test(name) || name === "CREDITS.md", "docs media", log);
    if (env.SITE_MEDIA_DIR) {
      await copyMatching(resolve(root, env.SITE_MEDIA_DIR), join(staging, "media"), (name) => name.toLowerCase().endsWith(".mp4"), "release MP4s", log);
    } else {
      log.push("skipped release MP4s: SITE_MEDIA_DIR is not set");
    }

    // 4. Screenshots, agent files, raw docs.
    const screenshots = await copyMatching(join(root, "docs/screenshots"), join(staging, "img"), (name) => name.endsWith(".png"), "screenshots", log);
    if (screenshots.length === 0) throw new Error("No screenshots found in docs/screenshots");
    const llmsCandidates = [join(root, "llms.txt"), join(root, "apps/web/public/llms.txt")];
    const llms = (await Promise.all(llmsCandidates.map(async (path) => (await exists(path)) ? path : null))).find((path) => path !== null);
    if (llms) await cp(llms, join(staging, "llms.txt"));
    else log.push("skipped llms.txt: not present");
    await mkdir(join(staging, "docs"), { recursive: true });
    await cp(join(root, "AGENTS.md"), join(staging, "AGENTS.md"));
    for (const name of RAW_DOCS) await cp(join(root, "docs", name), join(staging, "docs", name));

    // 5. Transform index.html.
    const has = (path: string): boolean => {
      const clean = path.split(/[?#]/)[0] ?? path;
      return existsSync(join(staging, clean));
    };
    const removed: string[] = [];
    const indexPath = join(staging, "index.html");
    let html = await readFile(indexPath, "utf8");
    html = applyRequirements(html, has, removed);
    html = stripMissingPosters(html, has, removed);
    html = html.replaceAll("{{LIVE_DEMO_URL}}", escapeAttribute(demo.url)).replaceAll("{{LIVE_DEMO_LABEL}}", escapeAttribute(demo.label));
    if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error("Unresolved {{TOKEN}} left in index.html");
    await writeFile(indexPath, html);
    for (const item of removed) log.push(`hidden: ${item}`);
    log.push(demo.configured ? `live demo link: ${demo.url}` : "live demo link: not configured, using repo quick start");

    // 6. Integrity checks over the finished tree.
    const files = await listFiles(staging);
    for (const file of files) {
      if (/\.(html|css|js)$/.test(file)) assertNoRootAbsolute(relative(staging, file), await readFile(file, "utf8"));
    }
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
    for (const match of html.matchAll(/\shref="#([^"]*)"/g)) {
      const target = match[1] ?? "";
      if (target !== "" && target !== "top" && !ids.has(target)) throw new Error(`Dangling in-page link: #${target}`);
    }
    for (const match of html.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)) {
      const value = match[1] ?? "";
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value)) continue;
      if (!has(value)) throw new Error(`index.html references a file that is not in the site: ${value}`);
    }
    for (const match of html.matchAll(/content="(https:\/\/shekibahmed\.github\.io\/operations-intelligence-workbench\/[^"]+)"/g)) {
      const value = match[1] ?? "";
      const path = value.slice(SITE_URL.length);
      if (path !== "" && !has(path)) throw new Error(`Social metadata points at a missing file: ${value}`);
    }

    // 7. Crawler files.
    const pages = ["", ...casebooks.map((name) => `casebook/${name}`)];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${SITE_URL}${page}</loc></url>`).join("\n")}\n</urlset>\n`;
    await writeFile(join(staging, "sitemap.xml"), sitemap);
    await writeFile(join(staging, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);

    // 8. Atomic swap.
    await rm(outputDir, { recursive: true, force: true });
    await rename(staging, outputDir);
    const total = (await listFiles(outputDir)).length;
    for (const line of log) console.log(`  ${line}`);
    console.log(`Site built: ${total} files in ${relative(root, outputDir)}/`);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSite().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Site build failed; previous _site preserved.");
    process.exitCode = 1;
  });
}
