import { expect, test, type Page } from "@playwright/test";

/**
 * The M1 exit artifact (OIW-602/OIW-804): a single visitor journey through
 * every PRD §13 step, driven substantially through the real guided tour
 * overlay (UX_SPEC §4), with a real state assertion at each step against
 * real Postgres — no fixture/mock data, no fabricated UI state. Every value
 * asserted below either comes from the seeded asset-reliability fixture set
 * or was produced by a real write during this test run.
 */

const TOUR_PANEL = "tour-panel";

async function tourNext(page: Page, { keyboard = false }: { keyboard?: boolean } = {}) {
  const panel = page.getByTestId(TOUR_PANEL);
  const next = panel.getByRole("button", { name: "Next" });
  if (keyboard) {
    await next.focus();
    await next.press("Enter");
  } else {
    await next.click();
  }
}

test("north-star: PRD §13 asset-reliability journey — scenario selection through approved decision, real dashboards and audit trail", async ({
  page,
}) => {
  test.setTimeout(150_000);

  const base = await test.step("scenario selection creates a real, isolated workspace and starts the guided tour", async () => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Asset Reliability" })).toBeVisible();
    await page.getByRole("link", { name: "Start with Asset Reliability" }).click();

    await expect(page).toHaveURL(/\/demo\/asset-reliability/);
    await expect(page.getByRole("button", { name: "Start guided tour" })).toBeVisible();
    await page.getByRole("button", { name: "Start guided tour" }).click();

    await page.waitForURL(/\/w\/[^/]+\/inbox\?.*tour=1/);
    const match = /\/w\/([^/]+)\/inbox/.exec(page.url());
    if (!match) throw new Error(`Could not extract workspace slug from ${page.url()}`);
    return `/w/${match[1]}`;
  });

  await test.step("the tour overlay opens on Inbox, keyboard-focused, pinning the real artifact table", async () => {
    const panel = page.getByTestId(TOUR_PANEL);
    await expect(panel).toBeVisible();
    await expect(panel.getByText("New artifacts have arrived")).toBeVisible();
    await expect(panel).toBeFocused();
    await expect(page.locator('[data-tour="tour-inbox-table"]')).toBeVisible();
    await expect(page.locator('[data-tour="tour-inbox-target-row"]')).toBeVisible();
    // 25 real seeded artifacts (packages/application/README.md demo fixture set).
    await expect(page.locator("table tbody tr")).toHaveCount(25);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: "e2e/screenshots/north-star-tour-inbox-arrival-desktop.png", fullPage: true });
  });

  await test.step("advancing the tour by keyboard alone reaches the process step", async () => {
    await tourNext(page, { keyboard: true });
    await expect(page.getByTestId(TOUR_PANEL).getByText("Process the artifact")).toBeVisible();
    await expect(page.locator('[data-tour="tour-process-target"]')).toBeVisible();
  });

  await test.step("processing the brake-fault artifact extracts real fields and routes one ambiguous field to review", async () => {
    const targetRow = page.locator('[data-tour="tour-inbox-target-row"]');
    await targetRow.locator('[data-tour="tour-process-target"]').click();
    await expect(targetRow.getByText("Needs review")).toBeVisible();
    // 6 fields extracted; only previous-repair-reference falls below the confidence threshold.
    await expect(targetRow.locator("td").nth(5)).toHaveText("6");
  });

  await test.step("tour Next navigates to the Review Queue, which shows the real ambiguous A-142 observation with its evidence highlighted", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/review`));
    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible();
    await expect(page.getByRole("button", { name: /previous-repair-reference/ })).toBeVisible();
    await expect(page.locator("mark")).toHaveText("it had brake work done back in the spring");
    await expect(page.getByText(/Confidence/)).toBeVisible();
  });

  await test.step("accepting the observation resolves the review and assembles a real fault-reported Event", async () => {
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Review queue is clear")).toBeVisible();
  });

  await test.step("tour Next processes the related historical artifacts for real and navigates to the firing rule's trace", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/technical/rules/safety-critical-removal-approval`), { timeout: 30_000 });
    await expect(page.getByText("safety-critical-removal-approval · v1.0.0")).toBeVisible();
    await expect(page.getByText(/condition matched/)).toBeVisible();
    await expect(page.getByText(/severity-indicator/).first()).toBeVisible();
    await expect(page.getByText(/related-event-count/).first()).toBeVisible();
    await expect(page.getByText(/Decision proposed — "critical" risk/)).toBeVisible();
  });

  await test.step("tour Next shows the real critical Reliability Case", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/cases`));
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Reliability Case");
    await expect(rows.first()).toContainText("critical");
  });

  const caseHref = await test.step("the case list row links to a real Case Detail with owner, due date and the required inspection action", async () => {
    const href = await page.locator('[data-tour="tour-case-list"] tbody tr a').first().getAttribute("href");
    if (!href) throw new Error("Case list row is missing its link");

    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/cases/`));
    await expect(page.getByText("Severity: critical").first()).toBeVisible();
    await expect(page.getByText("Priority: urgent")).toBeVisible();
    await expect(page.getByText("maintenance-team").first()).toBeVisible();
    await expect(page.getByText("No due date")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Action items" })).toBeVisible();
    return href;
  });

  await test.step("tour Next reaches the Decision Centre with the real hold-from-service Decision awaiting approval", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/decisions`));
    await expect(page.getByText(/Remove From Service/)).toBeVisible();
    await expect(page.getByText("Risk: critical")).toBeVisible();
    await expect(page.getByText("Asset Removal Approval")).toBeVisible();
  });

  await test.step("approving requires a comment for this high-risk decision, and records a real, audited Approval", async () => {
    const card = page.locator('[data-tour="tour-decision-card"]');
    await card.getByRole("button", { name: "Approve" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: "Approve this decision?" });
    const confirmButton = dialog.getByRole("button", { name: "Approve" });
    await expect(confirmButton).toBeDisabled();
    await dialog.getByLabel(/Comment/).fill("Confirmed with the maintenance lead — hold A-142 from service.");
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();
    await expect(dialog).toBeHidden();
    await expect(card.getByText("Status: Approved")).toBeVisible();
  });

  await test.step("tour Next shows the Leadership dashboard reflecting the approval with real, non-zero values and a visibly badged hypothetical card", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/overview`));
    await expect(page.getByText("The dashboard reflects the approval")).toBeVisible();

    const dashboard = page.locator('[data-tour="tour-dashboard-grid"]');
    await expect(dashboard.getByText("Critical Signals")).toBeVisible();
    await expect(dashboard.getByText("Open Reliability Cases")).toBeVisible();

    // StatCard sets `aria-labelledby="stat-<slugified label>"` (components/widgets/StatCard.tsx).
    const criticalSignalsValue = await page.locator('[aria-labelledby="stat-critical-signals"] span').first().textContent();
    expect(criticalSignalsValue?.trim()).not.toBe("0");
    const openCasesValue = await page.locator('[aria-labelledby="stat-open-reliability-cases"] span').first().textContent();
    expect(openCasesValue?.trim()).toBe("1");

    // The impact-hypothesis card is the only widget permitted to show a
    // Hypothetical value (UX_SPEC §7.2) — its badge must be visibly present.
    await expect(dashboard.getByText("Estimated Downtime Exposure")).toBeVisible();
    await expect(dashboard.getByText("Hypothetical", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: "e2e/screenshots/north-star-leadership-overview-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 800, height: 1000 });
    await page.screenshot({ path: "e2e/screenshots/north-star-leadership-overview-tablet.png", fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await test.step("tour Next reaches the Audit Explorer, which shows the real, ordered chain from extraction to approval", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/audit`));
    const list = page.locator('[data-tour="tour-audit-list"]');
    await expect(list.getByText(/event assembled/i).first()).toBeVisible();
    await expect(list.getByText(/rule evaluated/i).first()).toBeVisible();
    await expect(list.getByText(/case created/i).first()).toBeVisible();
    await expect(list.getByText(/decision proposed/i).first()).toBeVisible();
    await expect(list.getByText(/decision approved/i).first()).toBeVisible();
  });

  await test.step("the technical inspector shows the real extraction and evidence for the processed artifact", async () => {
    await page.goto(caseHref);
    const evidenceSection = page.locator("section", { has: page.getByRole("heading", { name: "Evidence" }) });
    const evidenceHref = await evidenceSection.locator("a").first().getAttribute("href");
    if (!evidenceHref) throw new Error("Case Detail's Evidence section has no link to the Technical Inspector");

    await page.goto(evidenceHref);
    await expect(page.getByRole("tab", { name: "Artifact" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Checksum (SHA-256)")).toBeVisible();
    await expect(page.getByText(/Confidence/).first()).toBeVisible();
  });

  await test.step("tour Next by keyboard reaches the final step, pinned on the Adapt CTA present in the shell", async () => {
    await page.goto(`${base}/audit?lens=technical`);
    await expect(page.getByTestId(TOUR_PANEL)).toBeVisible();
    await tourNext(page, { keyboard: true });
    await expect(page.getByTestId(TOUR_PANEL).getByText("See it applied to your own operations")).toBeVisible();
    await expect(page.locator('[data-tour="tour-adapt-cta"]')).toBeVisible();
    await expect(page.getByTestId(TOUR_PANEL).getByRole("button", { name: "Next" })).toHaveCount(0);
  });

  await test.step("Exit tour dismisses the overlay and leaves full manual navigation", async () => {
    const exitButton = page.getByTestId(TOUR_PANEL).getByRole("button", { name: "Exit tour" });
    await exitButton.focus();
    await exitButton.press("Enter");
    await expect(page.getByTestId(TOUR_PANEL)).toBeHidden();
    await page.reload();
    await expect(page.getByTestId(TOUR_PANEL)).toBeHidden();
  });

  await test.step("the Operations and Technical lenses render the pack's own real dashboards for the same workspace", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`${base}/overview?lens=operations`);
    await expect(page.getByRole("radio", { name: "Operations" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Average Time to Triage")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/north-star-operations-overview-desktop.png", fullPage: true });

    await page.goto(`${base}/overview?lens=technical`);
    await expect(page.getByRole("radio", { name: "Technical" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Repeat Fault Signals")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/north-star-technical-overview-desktop.png", fullPage: true });
  });
});
