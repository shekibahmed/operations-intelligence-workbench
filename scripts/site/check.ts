import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve } from "node:path";

/**
 * Browser checks for the built site (`_site/`): sub-path serving, no external
 * requests, page weight, axe-core at desktop and phone width, the reduced-motion
 * diagram, and screenshots.
 *
 *   pnpm exec tsx scripts/site/check.ts [--out <dir>] [--url <base>]
 *
 * Screenshots go to --out (default: a temporary directory).
 *
 * Without --url the script serves `_site/` itself under the repository sub-path,
 * which is where GitHub Pages serves it. Playwright and axe come from apps/web.
 */

const root = resolve(import.meta.dirname, "../..");
const siteDir = join(root, "_site");
const SUBPATH = "/operations-intelligence-workbench/";
const WEIGHT_BUDGET = 1_500_000;

interface PwRequest { url(): string; resourceType(): string }
interface PwRoute { request(): PwRequest; continue(): Promise<void>; abort(): Promise<void> }
interface PwResponse { request(): PwRequest; body(): Promise<Buffer> }
interface PwLocator { screenshot(options: { path: string }): Promise<unknown>; scrollIntoViewIfNeeded(): Promise<void>; click(): Promise<void>; count(): Promise<number>; focus(): Promise<void> }
interface PwPage {
  goto(url: string, options?: { waitUntil?: string }): Promise<unknown>;
  screenshot(options: { path: string; fullPage?: boolean }): Promise<unknown>;
  evaluate<T>(expression: string): Promise<T>;
  on(event: "response", handler: (response: PwResponse) => void): void;
  waitForTimeout(ms: number): Promise<void>;
  keyboard: { press(key: string): Promise<void> };
  locator(selector: string): PwLocator;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
}
interface PwContext { newPage(): Promise<PwPage>; route(pattern: string, handler: (route: PwRoute) => Promise<void>): Promise<void>; close(): Promise<void> }
interface PwBrowser { newContext(options: { viewport: { width: number; height: number }; reducedMotion: "reduce" | "no-preference" }): Promise<PwContext>; close(): Promise<void> }
interface AxeViolation { id: string; impact?: string | null; help: string; nodes: Array<{ target: unknown }> }
type AxeBuilderCtor = new (options: { page: PwPage }) => { analyze(): Promise<{ violations: AxeViolation[] }> };

const webRequire = createRequire(join(root, "apps/web/package.json"));
const { chromium } = webRequire("@playwright/test") as { chromium: { launch(): Promise<PwBrowser> } };
const axeModule = webRequire("@axe-core/playwright") as { default?: AxeBuilderCtor; AxeBuilder?: AxeBuilderCtor };
const AxeBuilder: AxeBuilderCtor = (axeModule.AxeBuilder ?? axeModule.default) as AxeBuilderCtor;
if (typeof AxeBuilder !== "function") throw new Error("@axe-core/playwright did not export AxeBuilder");

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg",
  ".mp4": "video/mp4", ".vtt": "text/vtt; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
  ".md": "text/markdown; charset=utf-8",
};

function serve(): Promise<{ server: Server; base: string }> {
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (!url.pathname.startsWith(SUBPATH)) { response.writeHead(404).end("outside sub-path"); return; }
      let relative = normalize(decodeURIComponent(url.pathname.slice(SUBPATH.length)));
      if (relative.startsWith("..")) { response.writeHead(403).end(); return; }
      if (relative === "" || relative === ".") relative = "index.html";
      const file = join(siteDir, relative);
      try {
        const info = await stat(file);
        if (!info.isFile()) throw new Error("not a file");
        response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "content-length": info.size });
        createReadStream(file).pipe(response);
      } catch {
        response.writeHead(404).end("not found");
      }
    })();
  });
  return new Promise((done) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      done({ server, base: `http://127.0.0.1:${port}${SUBPATH}` });
    });
  });
}

const failures: string[] = [];
function expect(condition: boolean, message: string): void {
  console.log(`${condition ? "PASS" : "FAIL"}  ${message}`);
  if (!condition) failures.push(message);
}

async function scrollThrough(page: PwPage): Promise<void> {
  await page.evaluate("window.scrollTo(0, 0)");
  const height = await page.evaluate<number>("document.documentElement.scrollHeight");
  for (let y = 0; y < height; y += 500) {
    await page.evaluate("window.scrollBy(0, 500)");
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300);
  await page.evaluate("window.scrollTo(0, 0)");
}

async function checkViewport(browser: PwBrowser, base: string, out: string, label: string, width: number, height: number, reducedMotion: "reduce" | "no-preference"): Promise<void> {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const external: string[] = [];
  const origin = new URL(base).origin;
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith(origin) || url.startsWith("data:")) await route.continue();
    else { external.push(url); await route.abort(); }
  });
  const page = await context.newPage();
  let weight = 0;
  let mediaWeight = 0;
  page.on("response", (response) => {
    void response.body().then((body) => {
      if (response.request().resourceType() === "media") mediaWeight += body.length;
      else weight += body.length;
    }).catch(() => undefined);
  });
  const tag = `${label}-${width}`;
  await page.goto(base, { waitUntil: "networkidle" });
  await scrollThrough(page);
  await page.waitForTimeout(500);
  console.log(`\n== ${tag} (${reducedMotion === "reduce" ? "reduced motion" : "motion"}) ==`);

  expect(external.length === 0, `${tag}: no external requests${external.length ? ` (${external.join(", ")})` : ""}`);
  expect(weight < WEIGHT_BUDGET, `${tag}: page weight ${(weight / 1024).toFixed(0)} KiB < ${(WEIGHT_BUDGET / 1024).toFixed(0)} KiB (media ${(mediaWeight / 1024).toFixed(0)} KiB excluded)`);
  expect(await page.evaluate<number>("document.querySelectorAll('h1').length") === 1, `${tag}: exactly one h1`);
  expect(await page.evaluate<boolean>("['header','nav','main','footer'].every(t => document.querySelector(t) !== null)"), `${tag}: header, nav, main, footer landmarks`);
  expect(await page.evaluate<boolean>("document.documentElement.scrollWidth <= window.innerWidth"), `${tag}: no horizontal page scroll`);
  expect(await page.evaluate<boolean>("Array.from(document.querySelectorAll('video')).every(v => !v.autoplay && v.getAttribute('preload') === 'none')"), `${tag}: videos do not autoplay and preload none`);
  expect(await page.evaluate<boolean>("(() => { const a = document.querySelector('audio#music-audio'); return a === null || (!a.hasAttribute('autoplay') && a.getAttribute('preload') === 'none'); })()"), `${tag}: background audio is not autoplay`);

  if (reducedMotion === "reduce") {
    expect(await page.evaluate<boolean>("(() => { const p = document.querySelector('.pipe__packet'); return p !== null && getComputedStyle(p).display === 'none'; })()"), `${tag}: travelling packet is not rendered`);
    expect(await page.evaluate<boolean>("document.getAnimations().length === 0"), `${tag}: no running animations`);
    expect(await page.evaluate<boolean>("(() => { const r = Array.from(document.querySelectorAll('.stage__ring')); return r.length === 9 && r.every(x => Number(getComputedStyle(x).opacity) > 0); })()"), `${tag}: all nine stages drawn lit in the static diagram`);
  } else {
    expect(await page.evaluate<boolean>("document.querySelectorAll('.stage').length === 9"), `${tag}: nine pipeline stages`);
    expect(await page.evaluate<boolean>("(() => { const p = document.querySelector('.pipe__packet'); return p !== null && getComputedStyle(p).display !== 'none'; })()"), `${tag}: travelling packet is rendered`);
    // Motion only changes transform and opacity.
    expect(await page.evaluate<boolean>("document.getAnimations().every(a => !a.effect || a.effect.getKeyframes().every(f => Object.keys(f).every(k => ['offset','easing','composite','computedOffset','transform','opacity'].includes(k))))"), `${tag}: animations only touch transform and opacity`);
  }

  const toggle = page.locator("#music-toggle");
  if (await toggle.count() > 0) {
    expect(await page.evaluate<boolean>("(() => { const b = document.getElementById('music-toggle'); return b !== null && b.getAttribute('aria-pressed') === 'false' && b.textContent === 'Background music: off'; })()"), `${tag}: music toggle starts off`);
  } else {
    console.log(`INFO  ${tag}: music toggle not present (no ambience.mp3)`);
  }

  if (width >= 900 && reducedMotion === "no-preference") {
    await page.locator(".stage:nth-child(4) .stage__btn").focus();
    await page.waitForTimeout(300);
    expect(await page.evaluate<boolean>("Number(getComputedStyle(document.querySelector('.stage:nth-child(4) .stage__desc')).opacity) === 1"), `${tag}: keyboard focus reveals the stage tooltip`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    expect(await page.evaluate<boolean>("Number(getComputedStyle(document.querySelector('.stage:nth-child(4) .stage__desc')).opacity) === 0"), `${tag}: Escape dismisses the focused stage tooltip`);
    await page.evaluate("document.activeElement && document.activeElement.blur()");
  }

  const axe = await new AxeBuilder({ page }).analyze();
  for (const violation of axe.violations) console.log(`  axe ${violation.impact ?? "?"}: ${violation.id} - ${violation.help} (${violation.nodes.length} nodes: ${violation.nodes.slice(0, 3).map((node) => JSON.stringify(node.target)).join(" ")})`);
  expect(axe.violations.length === 0, `${tag}: axe-core reports no violations`);

  await mkdir(out, { recursive: true });
  await page.evaluate("window.scrollTo(0, 0)");
  // Grow the viewport to the page height instead of using fullPage, so media queries stay stable.
  const fullHeight = await page.evaluate<number>("document.documentElement.scrollHeight");
  await page.setViewportSize({ width, height: fullHeight });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${tag}-full.png`) });
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300);
  await page.locator("#pipeline").scrollIntoViewIfNeeded();
  if (reducedMotion === "no-preference") await page.waitForTimeout(3600);
  await page.locator("#pipeline").screenshot({ path: join(out, `${tag}-pipeline.png`) });
  await page.evaluate("window.scrollTo(0, 0)");
  await page.screenshot({ path: join(out, `${tag}-hero.png`) });
  await context.close();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const option = (name: string): string | undefined => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
  const out = resolve(option("--out") ?? join(tmpdir(), "oiw-site-check"));
  let server: Server | undefined;
  let base = option("--url");
  if (!base) ({ server, base } = await serve());
  if (!base.endsWith("/")) base += "/";
  console.log(`Checking ${base}`);
  const browser = await chromium.launch();
  try {
    await checkViewport(browser, base, out, "desktop", 1440, 900, "no-preference");
    await checkViewport(browser, base, out, "mobile", 390, 844, "no-preference");
    await checkViewport(browser, base, out, "desktop-reduced", 1440, 900, "reduce");
    await checkViewport(browser, base, out, "mobile-reduced", 390, 844, "reduce");
  } finally {
    await browser.close();
    server?.close();
  }
  console.log(`\nScreenshots: ${out}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nAll site checks passed.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
