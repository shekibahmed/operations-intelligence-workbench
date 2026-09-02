import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * OIW-808 functional requirement 1: an automated axe-core scan of every P0
 * route, exercised against real, seeded workspaces from all three packs
 * (not fixture-free empty screens — a11y defects concentrate in populated
 * tables, badges and dialogs). Fails the build on any "serious"/"critical"
 * impact violation; "moderate"/"minor" findings are collected into the
 * baseline documented in docs/quality/ACCESSIBILITY_AUDIT.md rather than
 * failing CI, since a chunk of those are false positives axe can't resolve
 * without visual judgement (e.g. colour-contrast on `oklch()` custom
 * properties) — see that doc for the accepted list.
 *
 * Walks the same guided-tour path already proven by
 * north-star/process-exceptions-tour/document-assurance-tour.spec.ts to
 * reach each screen's real, non-empty state, since a fresh empty workspace
 * never exercises table rows, status badges or the review/decision panes.
 */

const BLOCKING_IMPACT = new Set(["serious", "critical"]);

interface ScanResult {
  route: string;
  blocking: { id: string; impact: string; help: string; nodes: number }[];
  accepted: { id: string; impact: string; help: string; nodes: number }[];
}

const results: ScanResult[] = [];

async function scan(page: Page, route: string) {
  const axeResults = await new AxeBuilder({ page }).analyze();
  const blocking = axeResults.violations.filter((violation) => BLOCKING_IMPACT.has(violation.impact ?? ""));
  const accepted = axeResults.violations.filter((violation) => !BLOCKING_IMPACT.has(violation.impact ?? ""));
  results.push({
    route,
    blocking: blocking.map((v) => ({ id: v.id, impact: v.impact ?? "unknown", help: v.help, nodes: v.nodes.length })),
    accepted: accepted.map((v) => ({ id: v.id, impact: v.impact ?? "unknown", help: v.help, nodes: v.nodes.length })),
  });
  expect(blocking, `${route}: serious/critical axe violations:\n${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

test.afterAll(async () => {
  const withFindings = results.filter((r) => r.accepted.length > 0);
  if (withFindings.length > 0) {
    console.log(`\naxe baseline (moderate/minor, non-blocking):\n${JSON.stringify(withFindings, null, 2)}`);
  }
});

interface PackConfig {
  id: string;
  packName: string;
  /** The rule the guided tour's `beforeNext` fixture processing drives to firing (`lib/tour/steps.ts`). */
  ruleId: string;
}

const PACKS: PackConfig[] = [
  { id: "asset-reliability", packName: "Asset Reliability", ruleId: "safety-critical-removal-approval" },
  { id: "process-exceptions", packName: "Process Exception Management", ruleId: "hold-affected-output-approval" },
  { id: "document-assurance", packName: "Document Assurance", ruleId: "accept-exception-approval" },
];

const TOUR_PANEL = "tour-panel";

async function tourNext(page: Page) {
  await page.getByTestId(TOUR_PANEL).getByRole("button", { name: "Next" }).click();
}

/**
 * Waits past the Next.js `loading.tsx` Suspense fallback (which renders
 * outside `WorkspaceShell` and so has neither a `<main>` landmark nor an
 * `<h1>` — a real but sub-second transient state, not something to axe-scan
 * as if it were the settled page) before scanning a `/w/[workspace]/*` route.
 */
async function waitForShellReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
}

async function startGuestWorkspace(page: Page, pack: PackConfig): Promise<string> {
  await page.goto(`/demo/${pack.id}`);
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await page.waitForURL(/\/w\/[^/]+\/inbox/);
  const match = /\/w\/([^/]+)\/inbox/.exec(page.url());
  if (!match) throw new Error(`Could not extract workspace slug from ${page.url()}`);
  return `/w/${match[1]}`;
}

test.describe("axe: pack-agnostic routes (no workspace)", () => {
  test("landing, scenario selector, adapt", async ({ page }) => {
    await page.goto("/");
    await scan(page, "/ (landing)");

    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Asset Reliability" })).toBeVisible();
    await scan(page, "/demo (scenario selector)");

    await page.goto("/adapt");
    await scan(page, "/adapt");
  });
});

for (const pack of PACKS) {
  test.describe(`axe: ${pack.packName}`, () => {
    test(`P0 routes, seeded workspace (${pack.id})`, async ({ page }) => {
      test.setTimeout(180_000);

      await page.goto(`/demo/${pack.id}`);
      await expect(page.getByRole("button", { name: "Start guided tour" })).toBeVisible();
      await scan(page, `/demo/${pack.id} (guided start)`);

      const base = await startGuestWorkspace(page, pack);
      await expect(page.getByTestId(TOUR_PANEL)).toBeVisible();
      await waitForShellReady(page);
      await scan(page, `${base}/inbox (tour active)`);

      await tourNext(page);
      const targetRow = page.locator('[data-tour="tour-inbox-target-row"]');
      await targetRow.locator('[data-tour="tour-process-target"]').click();
      await expect(targetRow.getByText(/Processed|Needs review/)).toBeVisible();

      await tourNext(page);
      await page.waitForURL(new RegExp(`${base}/review`), { timeout: 30_000 });
      await waitForShellReady(page);
      await scan(page, `${base}/review (populated, desktop)`);

      await page.setViewportSize({ width: 800, height: 1000 });
      await scan(page, `${base}/review (populated, tablet, drawer closed)`);
      const drawerToggle = page.getByRole("button", { name: /^Queue \(/ });
      if (await drawerToggle.isVisible()) {
        await drawerToggle.click();
        await scan(page, `${base}/review (populated, tablet, drawer open)`);
      }
      await page.setViewportSize({ width: 1280, height: 900 });

      await page.getByRole("button", { name: "Accept" }).click();
      await expect(page.getByText("Review queue is clear")).toBeVisible();

      await tourNext(page);
      await page.waitForURL(new RegExp(`${base}/technical/rules/${pack.ruleId}`), { timeout: 30_000 });
      await waitForShellReady(page);
      await scan(page, `${base}/technical/rules/${pack.ruleId}`);

      await tourNext(page);
      await page.waitForURL(new RegExp(`${base}/cases`));
      await waitForShellReady(page);
      await scan(page, `${base}/cases (populated)`);

      const caseHref = await page.locator('[data-tour="tour-case-list"] tbody tr a').first().getAttribute("href");
      await tourNext(page);
      await page.waitForURL(new RegExp(`${base}/cases/`));
      await waitForShellReady(page);
      await scan(page, `${base}/cases/[caseId]`);

      await page.goto(`${base}/entities`);
      await expect(page.getByRole("heading", { name: "Entities" })).toBeVisible();
      await scan(page, `${base}/entities`);

      const firstEntityLink = page.locator("table tbody tr a").first();
      const entityName = (await firstEntityLink.textContent())?.trim();
      await firstEntityLink.click();
      if (entityName) await expect(page.getByRole("heading", { name: entityName })).toBeVisible();
      await scan(page, `${base}/entities/[entityId]`);

      if (caseHref) {
        await page.goto(caseHref);
        const evidenceSection = page.locator("section", { has: page.getByRole("heading", { name: "Evidence" }) });
        const evidenceHref = await evidenceSection.locator("a").first().getAttribute("href");
        if (evidenceHref) {
          await page.goto(evidenceHref);
          await expect(page.getByRole("tab", { name: "Artifact" })).toHaveAttribute("aria-selected", "true");
          await scan(page, `${base}/technical/artifacts/[id]`);
        }
      }

      await page.goto(`${base}/decisions`);
      await expect(page.getByTestId(TOUR_PANEL)).toBeVisible();
      await waitForShellReady(page);
      await scan(page, `${base}/decisions (pending, tour active)`);

      const card = page.locator('[data-tour="tour-decision-card"]');
      await card.getByRole("button", { name: "Approve" }).click();
      const dialog = page.getByRole("dialog").filter({ hasText: "Approve this decision?" });
      await scan(page, `${base}/decisions (Approve confirmation dialog open)`);
      await dialog.getByLabel(/Comment/).fill("OIW-808 accessibility scan — approving to populate downstream screens.");
      await dialog.getByRole("button", { name: "Approve" }).click();
      await expect(dialog).toBeHidden();
      await expect(card.getByText("Status: Approved")).toBeVisible();

      await tourNext(page);
      await page.waitForURL(new RegExp(`${base}/overview`));
      await waitForShellReady(page);
      await scan(page, `${base}/overview (leadership, populated)`);

      await page.goto(`${base}/overview?lens=operations`);
      await waitForShellReady(page);
      await scan(page, `${base}/overview (operations, populated)`);

      await page.goto(`${base}/overview?lens=technical`);
      await waitForShellReady(page);
      await scan(page, `${base}/overview (technical, populated)`);

      await page.goto(`${base}/audit`);
      await waitForShellReady(page);
      await scan(page, `${base}/audit (populated)`);

      await page.goto(`${base}/about-pack`);
      await waitForShellReady(page);
      await scan(page, `${base}/about-pack`);
    });
  });
}
