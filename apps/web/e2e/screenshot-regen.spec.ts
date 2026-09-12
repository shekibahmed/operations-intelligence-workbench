import { expect, test, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * README screenshot regeneration harness (`pnpm test:e2e --grep regenerate`).
 * Walks the real guided-tour journey against the Playwright-managed
 * production server and rewrites `docs/screenshots/*.png` — run it whenever
 * the UI's rendered appearance changes so the README stays truthful. Two
 * journeys: one captures the pending Review Queue, the other follows the
 * tour through approval (its beforeNext processing assembles the repeat-
 * fault events and fires the rule) and captures everything else after the
 * tour is dismissed. The output path resolves from this file so it works
 * from any invocation directory. Opt in with REGEN_SCREENSHOTS=1 so routine
 * `pnpm test:e2e` runs never rewrite the committed frames.
 */

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs", "screenshots");

async function goto(page: Page, url: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url);
      return;
    } catch {
      await page.waitForTimeout(1500);
    }
  }
  await page.goto(url);
}

async function tourNext(page: Page) {
  await page.getByTestId("tour-panel").getByRole("button", { name: "Next" }).click();
}

interface Workspace {
  base: string;
}

async function startTourWorkspace(page: Page): Promise<Workspace> {
  await goto(page, "/demo/asset-reliability");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await page.waitForURL(/\/w\/[^/]+\/inbox\?.*tour=1/);
  const match = /\/w\/([^/]+)\/inbox/.exec(page.url());
  if (!match) throw new Error("no workspace slug");
  return { base: `/w/${match[1]}` };
}

test.skip(!process.env.REGEN_SCREENSHOTS, "set REGEN_SCREENSHOTS=1 to rewrite docs/screenshots");

test("regenerate: review queue screenshot", async ({ page }) => {
  test.setTimeout(180_000);

  const a = await startTourWorkspace(page);
  await tourNext(page);
  const targetRow = page.locator('[data-tour="tour-inbox-target-row"]');
  await targetRow.locator('[data-tour="tour-process-target"]').click();
  await expect(targetRow.getByText(/Processed|Needs review/)).toBeVisible();
  await tourNext(page);
  await page.waitForURL(new RegExp(`${a.base}/review`));
  await expect(page.getByRole("button", { name: /previous-repair-reference/ })).toBeVisible();
  await page.getByTestId("tour-panel").getByRole("button", { name: "Exit tour" }).click();
  await expect(page.getByTestId("tour-panel")).toBeHidden();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/review-queue.png` });
});

test("regenerate: journey screenshots", async ({ page }) => {
  test.setTimeout(300_000);

  const b = await startTourWorkspace(page);
  await tourNext(page);
  const row = page.locator('[data-tour="tour-inbox-target-row"]');
  await row.locator('[data-tour="tour-process-target"]').click();
  await expect(row.getByText(/Processed|Needs review/)).toBeVisible();
  await tourNext(page);
  await page.waitForURL(new RegExp(`${b.base}/review`));
  await expect(page.getByRole("button", { name: /previous-repair-reference/ })).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Review queue is clear")).toBeVisible();

  // The tour's Next from review performs the related-artifact processing
  // that assembles the repeat-fault events and fires the rule.
  await tourNext(page);
  await page.waitForURL(new RegExp(`${b.base}/technical/rules/safety-critical-removal-approval`), { timeout: 60000 });
  await expect(page.getByText("safety-critical-removal-approval · v1.0.0")).toBeVisible();

  // Exit the tour at the rule trace and capture it clean.
  await page.getByTestId("tour-panel").getByRole("button", { name: "Exit tour" }).click();
  await expect(page.getByTestId("tour-panel")).toBeHidden();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/rule-trace.png` });

  // Pending proposed decision.
  await goto(page, `${b.base}/decisions`);
  const card = page.locator('[data-tour="tour-decision-card"]');
  await expect(card).toBeVisible();
  await expect(card.getByText("Risk: critical")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/decision-card.png` });

  // Case detail.
  await goto(page, `${b.base}/cases`);
  const caseHref = await page.locator('[data-tour="tour-case-list"] tbody tr a').first().getAttribute("href");
  if (!caseHref) throw new Error("no case link");
  await goto(page, caseHref);
  await expect(page.getByRole("heading", { name: "Action items" })).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/case-detail.png` });

  // Approve, then the leadership dashboard reflecting the approval.
  await goto(page, `${b.base}/decisions`);
  await card.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Approve this decision?" });
  await dialog.getByLabel(/Comment/).fill("Confirmed with the maintenance lead — hold A-142 from service pending inspection.");
  await dialog.getByRole("button", { name: "Approve" }).click();
  await expect(card.getByText("Status: Approved")).toBeVisible();

  await goto(page, `${b.base}/overview?lens=leadership`);
  await expect(page.getByText("Critical Signals")).toBeVisible();
  await expect(page.getByText("Recent activity")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/leadership-dashboard.png` });

  // Audit explorer.
  await goto(page, `${b.base}/audit`);
  await expect(page.getByText(/decision approved/i).first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/audit-explorer.png` });

  // Scenario selector.
  await goto(page, "/demo");
  await expect(page.getByRole("heading", { name: "Asset Reliability" })).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/scenario-selector.png` });
});
