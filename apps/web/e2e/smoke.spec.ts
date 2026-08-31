import { expect, test, type Locator, type Page } from "@playwright/test";

import { caseIds, entityIds } from "../src/lib/stub/ids";
import { stubRuleTrace } from "../src/lib/stub/rule-trace";

/**
 * Starts a real guest workspace through the guided-start flow (creates +
 * seeds against local Postgres, sets the ADR-007 session cookie on `page`'s
 * browser context) and returns the resulting `/w/[slug]` base path.
 */
async function startGuestWorkspace(page: Page): Promise<string> {
  await page.goto("/demo/asset-reliability");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await page.waitForURL(/\/w\/[^/]+\/inbox/);
  const match = /\/w\/([^/]+)\/inbox/.exec(page.url());
  if (!match) throw new Error(`Could not extract workspace slug from ${page.url()}`);
  return `/w/${match[1]}`;
}

test("selector -> guided start -> inbox journey creates a real, isolated workspace", async ({ page }) => {
  await test.step("scenario selector lists the pack", async () => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Asset Reliability" })).toBeVisible();
  });

  const base = await test.step("guided start creates and seeds a real workspace", async () => {
    return startGuestWorkspace(page);
  });

  await test.step("inbox lists the pack's real demo artifacts", async () => {
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    // asset-reliability's `demo` fixture set ships 25 artifacts (packages/application/README.md).
    await expect(page.locator("table tbody tr")).toHaveCount(25);
  });

  const artifactHref = await test.step("artifact row links to the technical inspector for a real artifact ID", async () => {
    const href = await page.locator("table tbody tr a").first().getAttribute("href");
    if (!href) throw new Error("Inbox row is missing its technical-inspector link");
    return href;
  });

  await test.step("technical inspector shows real raw content, checksum and metadata", async () => {
    await page.goto(artifactHref);
    await expect(page.getByRole("tab", { name: "Artifact" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Checksum (SHA-256)")).toBeVisible();
  });

  await test.step("reset restores the workspace to its original seeded state", async () => {
    // Triggered from the Inbox (not Overview, its redirect target) so
    // `waitForURL` observes a genuine navigation rather than trivially
    // matching a URL the page was already on.
    await page.goto(`${base}/inbox`);
    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset demo" }).click();
    await page.waitForURL(`${base}/overview*`);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("25 artifacts ingested")).toBeVisible();

    await page.goto(`${base}/inbox`);
    await expect(page.locator("table tbody tr")).toHaveCount(25);
  });
});

test("a fresh browser session cannot access another session's workspace (ADR-007)", async ({ page, browser }) => {
  const base = await startGuestWorkspace(page);

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  try {
    await otherPage.goto(`${base}/overview`);
    await expect(otherPage).toHaveURL(/\/demo$/);
  } finally {
    await otherContext.close();
  }
});

test("stub-marked screens (no upstream data yet) stay reachable and lens-switching keeps the same route", async ({ page }) => {
  const base = await startGuestWorkspace(page);

  const STUB_ROUTES: { path: string; heading: string | RegExp }[] = [
    { path: `${base}/cases`, heading: "Cases" },
    { path: `${base}/cases/${caseIds.open}`, heading: /Repeat brake-assembly fault/ },
    { path: `${base}/entities`, heading: "Entities" },
    { path: `${base}/entities/${entityIds.assetPrimary}`, heading: "AR-1042" },
    { path: `${base}/decisions`, heading: "Decisions" },
    { path: `${base}/technical/rules/${stubRuleTrace.ruleId}`, heading: new RegExp(stubRuleTrace.ruleId) },
    { path: `${base}/audit`, heading: "Audit" },
    { path: `${base}/about-pack`, heading: "Asset Reliability" },
  ];

  for (const route of STUB_ROUTES) {
    const response = await page.goto(route.path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(route.heading).first()).toBeVisible();
  }

  await page.goto(`${base}/cases`);
  await expect(page).toHaveURL(/lens=operations/);
  await page.getByRole("radio", { name: "Technical" }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/cases\\?.*lens=technical`));
});

test("root and marketing routes render without a session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Turn scattered operational information/)).toBeVisible();

  await page.goto("/adapt");
  await expect(page.getByText(/Adapt this workflow/)).toBeVisible();
});

test("screenshots of changed screens", async ({ page }) => {
  const base = await startGuestWorkspace(page);

  const SCREENSHOT_TARGETS: { path: string; name: string; heading: string | RegExp }[] = [
    { path: `${base}/overview`, name: "overview", heading: "Overview" },
    { path: `${base}/inbox`, name: "inbox", heading: "Inbox" },
    { path: `${base}/review`, name: "review", heading: "Review Queue" },
    { path: `${base}/cases/${caseIds.open}`, name: "case-detail", heading: /Repeat brake-assembly fault/ },
    { path: `${base}/decisions`, name: "decision-centre", heading: "Decisions" },
  ];

  for (const target of SCREENSHOT_TARGETS) {
    // `target.path` omits `?lens=`, so the first response is a client-side
    // redirect to the section's default lens (src/lib/resolve-lens.ts);
    // waiting for the real heading (rather than screenshotting right after
    // `goto`) avoids capturing that intermediate, still-redirecting frame —
    // a race that only shows up once a page's content depends on a real
    // (non-instant) data fetch, as Overview/Inbox now do.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(target.path);
    await expect(page.getByRole("heading", { name: target.heading }).first()).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/${target.name}-desktop.png`, fullPage: true });

    await page.setViewportSize({ width: 800, height: 1000 });
    await page.goto(target.path);
    await expect(page.getByRole("heading", { name: target.heading }).first()).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/${target.name}-tablet.png`, fullPage: true });
  }
});

/**
 * Finds the inbox row for the pack's informal "brake-fault" chat message
 * (PRD §13.4-13.5 demo journey; `asset-reliability-demo-001`) by sniffing
 * each row's Technical Inspector page for its known raw text, since the
 * inbox table itself never renders artifact body content (UX_SPEC §5.5) and
 * artifact IDs are content-derived, not something a test can precompute
 * without reaching into `@oiw/application`'s internals.
 */
async function findBrakeFaultRow(page: Page, base: string): Promise<{ href: string; row: Locator }> {
  await page.goto(`${base}/inbox`);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  const hrefs = await page.locator("table tbody tr a").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")));

  for (const href of hrefs) {
    if (href === null) continue;
    // In-page `fetch` (not `page.request`, a separate HTTP client that does
    // not apply Chromium's localhost-is-a-secure-context exception) so the
    // `Secure` ADR-007 session cookie is actually sent to this http://
    // dev/test server, same as a real navigation would send it.
    const found = await page.evaluate(async (url) => {
      const response = await fetch(`${url}?lens=technical`, { credentials: "same-origin" });
      return (await response.text()).includes("grinding noise when I brake hard");
    }, href);
    if (found) {
      return { href, row: page.locator("table tbody tr", { has: page.locator(`a[href="${href}"]`) }) };
    }
  }
  throw new Error("Could not locate the informal brake-fault artifact in the inbox");
}

test("processing the brake-fault artifact populates the review queue; accepting it resolves the review and the inbox status (OIW-406 journey)", async ({
  page,
}) => {
  const base = await startGuestWorkspace(page);

  const { href: artifactHref, row } = await findBrakeFaultRow(page, base);
  await row.getByRole("button", { name: "Process" }).click();
  await expect(row.getByText("Needs review")).toBeVisible();
  await expect(row.locator("td").nth(5)).toHaveText("6"); // Observations column: 6 fields extracted; only previous-repair-reference falls below the confidence threshold

  await test.step("the low-confidence observation is queued for review with its evidence highlighted", async () => {
    await page.goto(`${base}/review`);
    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible();
    await expect(page.getByRole("button", { name: /previous-repair-reference/ })).toBeVisible();
    await expect(page.locator("mark")).toHaveText("it had brake work done back in the spring");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: "e2e/screenshots/review-populated-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 800, height: 1000 });
    await page.screenshot({ path: "e2e/screenshots/review-populated-tablet.png", fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await test.step("accepting the observation clears the queue, audits the reviewer and syncs the inbox status", async () => {
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Review queue is clear")).toBeVisible();

    await page.goto(`${base}/inbox`);
    await expect(row.getByText("Processed")).toBeVisible();

    await page.goto(artifactHref);
    const observationItem = page.locator("li", { hasText: "previous-repair-reference" });
    await expect(observationItem.getByText("Accepted", { exact: true })).toBeVisible();
  });
});
