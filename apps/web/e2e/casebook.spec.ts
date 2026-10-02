import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";

const artifactURL = new URL("../public/casebook/a-142-repeat-fault.html", import.meta.url);
const servedPath = "/casebook/a-142-repeat-fault.html";
const screenshotDirectory = new URL("./screenshots/", import.meta.url);
const sections = {
  sources: "The original sources",
  review: "Keep uncertainty inspectable",
  rule: "Evaluate an explicit repeat-event rule",
  proposal: "Propose work without authorizing it",
  approval: "Record the governed authorization",
  remaining: "Keep authorization and completion distinct",
  capabilities: "Inspect the engineering",
  provenance: "A historical record, with explicit limits",
  evidence: "Embedded supporting originals",
  "next-steps": "Explore a workflow pilot",
};

test.use({ javaScriptEnabled: false, serviceWorkers: "block" });

// Permit only the document under test; even relative resources are blocked.
// Playwright's inspection scripts do not enable document JavaScript.
async function openReader(context: BrowserContext, page: Page, url: string) {
  const unexpectedRequests: string[] = [];
  context.on("request", (request) => {
    if (request.url() !== url || !request.isNavigationRequest() || request.method() !== "GET") {
      unexpectedRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  await context.route("**/*", (route) => {
    const request = route.request();
    if (request.url() === url && request.isNavigationRequest() && request.method() === "GET") {
      return route.continue();
    }
    return route.abort();
  });
  await page.goto(url);
  return unexpectedRequests;
}

async function expectAccount(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A-142: from scattered brake reports to a governed decision",
  );
  for (const [id, heading] of Object.entries(sections)) {
    await expect(page.locator(`#${id}`).getByRole("heading", { level: 2, name: heading, exact: true })).toBeVisible();
  }
  await expect(page.locator("#sources .source-card")).toHaveCount(6);
  await expect(page.locator("#review blockquote")).toContainText("it had brake work done back in the spring");
  await expect(page.locator("#review")).toContainText("70%");
  await expect(page.locator("#review")).toContainText("pending → accepted");
  await expect(page.locator("#rule .lead")).toContainText("safety-critical severity observation AND at least two related events");
  await expect(page.locator("#rule .lead")).toContainText("60 days");
  await expect(page.locator("#rule .lead")).toContainText("does not require every counted event to be safety-critical");
  await expect(page.locator("#proposal")).toContainText("awaiting-approval");
  await expect(page.locator("#approval")).toContainText("Scripted visitor exercising human-governed UI");
  await expect(page.locator("#remaining")).toContainText("maintenance-team / open");
  await expect(page.locator("#remaining")).toContainText("Not recorded");
  await expect(page.locator("#source-asset-reliability-demo-006")).toContainText("frozen narrative evidence");
  await expect(page.locator("#source-asset-reliability-demo-002")).toContainText("not closure of the later case");

  const limits = page.getByRole("complementary", { name: "What this demonstration establishes" });
  await expect(limits).toBeVisible();
  for (const qualification of [
    "Synthetic demonstration only",
    "not a measured live-model result",
    "No maintenance lead was consulted",
    "does not establish physical removal, completed repairs, production deployment or measured savings",
  ]) await expect(limits).toContainText(qualification);
  expect(await limits.evaluate((element) => element.closest("details"))).toBeNull();
  for (const id of ["review", "rule", "approval", "remaining"]) {
    const qualification = page.locator(`#${id} .qualification`);
    await expect(qualification).toBeVisible();
    expect(await qualification.evaluate((element) => element.closest("details"))).toBeNull();
  }
  await expect(page.locator("#provenance")).toContainText("fixture-intelligence-provider / 1.0.0");
  await expect(page.locator("#provenance")).toContainText("No live model / true");
  await expect(page.locator("#provenance")).toContainText("does not independently verify the original audit hash chain");
  await expect(page.locator("#next-steps")).toContainText("hello@bekaamchor.com");
  await expect(page.locator("#next-steps")).toContainText("Built by Shekib and the Kaamchor team");
  await expect(page.locator("script, link[rel=stylesheet], img, iframe, form, button")).toHaveCount(0);
}

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

async function tabTo(page: Page, target: Locator) {
  for (let count = 0; count < 150; count++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard could not reach ${await target.textContent()}`);
}

async function expectVisibleFocus(target: Locator) {
  await expect(target).toBeFocused();
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, top: rect.top, bottom: rect.bottom, height: innerHeight };
  });
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.style).not.toBe("none");
  expect(focus.top).toBeGreaterThanOrEqual(0);
  expect(focus.bottom).toBeLessThanOrEqual(focus.height);
}

test("complete offline account with no scripts, app session or resource access", async ({ context, page }) => {
  const requests = await openReader(context, page, artifactURL.href);
  await expectAccount(page);
  await expect(page.locator("details[id^=evidence-]")).toHaveCount(14);
  for (const details of await page.locator("details[id^=evidence-]").all()) {
    await details.locator("summary").click();
    await expect(details.locator("pre")).toBeVisible();
    expect((await details.locator("pre").innerText()).trim().length).toBeGreaterThan(100);
    await details.locator("summary").click();
  }
  expect(requests).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test("section navigation and outbound evidence have usable destinations offline", async ({ context, page }) => {
  const requests = await openReader(context, page, artifactURL.href);
  const navigation = page.getByRole("navigation", { name: "Casebook sections" });
  for (const link of await navigation.getByRole("link").all()) {
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^#/);
    await link.click();
    expect(new URL(page.url()).hash).toBe(href);
    await expect(page.locator(href!)).toBeVisible();
  }
  for (const link of await page.locator("a").all()) {
    const href = (await link.getAttribute("href"))!;
    if (href.startsWith("#")) {
      await expect(page.locator(href)).toHaveCount(1);
    } else {
      const destination = new URL(href);
      expect(["https:", "mailto:"]).toContain(destination.protocol);
      if (destination.hostname === "github.com") {
        expect(destination.pathname).toMatch(/^\/shekibahmed\/operations-intelligence-workbench\/(blob|tree)\/[a-f0-9]{40}(\/|$)/);
      }
    }
  }
  await expect(page.locator(".buttons a").nth(0)).toHaveAttribute("href", /^https:\/\/github\.com\//);
  await expect(page.locator(".buttons a").nth(1)).toHaveAttribute("href", "mailto:hello@bekaamchor.com");
  expect(requests).toEqual([]);
});

for (const width of [1280, 390]) {
  test(`keyboard reading, native evidence and next steps at ${width}px`, async ({ context, page }) => {
    await page.setViewportSize({ width, height: 900 });
    const requests = await openReader(context, page, artifactURL.href);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to the case" });
    await expectVisibleFocus(skip);
    await page.keyboard.press("Enter");
    expect(new URL(page.url()).hash).toBe("#main");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Sources", exact: true })).toBeFocused();
    const reviewLink = page.getByRole("navigation").getByRole("link", { name: sections.review, exact: true });
    await tabTo(page, reviewLink);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    const original = page.getByRole("link", { name: "Read the complete supporting original" });
    await expectVisibleFocus(original);
    await page.keyboard.press("Enter");
    expect(new URL(page.url()).hash).toBe("#evidence-asset-reliability-demo-001");
    const details = page.locator("#evidence-asset-reliability-demo-001");
    const summary = details.locator("summary");
    await tabTo(page, summary);
    await expectVisibleFocus(summary);
    // A fragment can natively reveal a disclosure. Start closed before proving
    // both Enter and Space toggle the same native control without scripting.
    if (await details.getAttribute("open") !== null) await page.keyboard.press("Enter");
    await expect(details.locator("pre")).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(details.locator("pre")).toBeVisible();
    await expect(details.locator("pre")).toContainText("it had brake work done back in the spring");
    await page.keyboard.press("Space");
    await expect(details.locator("pre")).toBeHidden();
    for (const cta of await page.locator(".buttons a").all()) {
      await tabTo(page, cta);
      await expectVisibleFocus(cta);
    }
    await expectNoOverflow(page);
    for (const supporting of await page.locator("details[id^=evidence-]").all()) {
      await supporting.locator("summary").click();
    }
    await expectNoOverflow(page);
    await expectAccount(page);
    expect(requests).toEqual([]);
    if (process.env.REGEN_CASEBOOK_SCREENSHOTS === "1") {
      const mode = width === 390 ? "mobile" : "desktop";
      for (const id of ["review", "rule", "remaining", "next-steps"]) {
        await page.locator(`#${id}`).screenshot({ path: fileURLToPath(new URL(`casebook-${mode}-${id}.png`, screenshotDirectory)) });
      }
      await page.locator("#evidence-asset-reliability-demo-001").screenshot({
        path: fileURLToPath(new URL(`casebook-${mode}-original.png`, screenshotDirectory)),
      });
      await page.goto(artifactURL.href);
      await page.screenshot({ path: fileURLToPath(new URL(`casebook-${mode}-opening.png`, screenshotDirectory)) });
      await page.locator(".disclosures").screenshot({
        path: fileURLToPath(new URL(`casebook-${mode}-qualifications.png`, screenshotDirectory)),
      });
    }
  });
}

test("axe finds no serious or critical findings in closed and expanded evidence", async ({ browser }) => {
  // Only the axe scanner uses a script-enabled context; reader proofs above
  // remain script-disabled. The artifact itself still contains no scripts.
  const context = await browser.newContext({ javaScriptEnabled: true, serviceWorkers: "block" });
  try {
    const page = await context.newPage();
    const requests = await openReader(context, page, artifactURL.href);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const expanded of [false, true]) {
        await page.locator("details").evaluateAll((elements, open) => {
          for (const element of elements) (element as HTMLDetailsElement).open = open;
        }, expanded);
        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
        expect(blocking, `${width}px / evidence expanded=${expanded}`).toEqual([]);
        await test.info().attach(`axe-${width}-${expanded ? "expanded" : "closed"}.json`, {
          body: JSON.stringify({ violations: results.violations, incomplete: results.incomplete }, null, 2),
          contentType: "application/json",
        });
      }
    }
    expect(requests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("@http production public file matches disk bytes and reads without cookies or mutations", async ({ browser, context, page, request, baseURL }, testInfo) => {
  test.skip(!baseURL, "Direct-file configuration has no server; ordinary e2e and CASEBOOK_HTTP=1 run HTTP delivery.");
  if (testInfo.project.name === "casebook-http-no-database") {
    const unavailable = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port: 1 });
      socket.once("connect", () => { socket.destroy(); resolve(false); });
      socket.once("error", () => { socket.destroy(); resolve(true); });
      socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
    });
    expect(unavailable, "The dedicated server's database endpoint must be unavailable").toBe(true);
  }
  const response = await request.get(servedPath);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^text\/html/);
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(await response.body()).toEqual(await readFile(artifactURL));
  const requests = await openReader(context, page, new URL(servedPath, baseURL).href);
  await expectAccount(page);
  const servedText = await page.locator("main").innerText();
  const fileContext = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block" });
  try {
    const filePage = await fileContext.newPage();
    const fileRequests = await openReader(fileContext, filePage, artifactURL.href);
    expect(await filePage.locator("main").innerText()).toBe(servedText);
    expect(fileRequests).toEqual([]);
  } finally {
    await fileContext.close();
  }
  await page.getByRole("navigation").getByRole("link", { name: sections.approval, exact: true }).click();
  await page.locator("#evidence-approval-rule summary").click();
  await expect(page.locator("#evidence-approval-rule pre")).toBeVisible();
  expect(requests).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});
