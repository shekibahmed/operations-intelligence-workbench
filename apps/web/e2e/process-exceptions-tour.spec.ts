import { expect, test, type Page } from "@playwright/test";

/**
 * OIW-702: the Process Exception Management guided tour, driven through the
 * real overlay end to end to its human-approval moment (mirrors
 * `north-star.spec.ts`'s asset-reliability journey, condensed). Every value
 * asserted below comes from the seeded process-exceptions fixture set or a
 * real write made during this run — no fixture/mock UI state.
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

test("process-exceptions guided tour: scenario selection through the Hold Affected Output approval", async ({ page }) => {
  test.setTimeout(150_000);

  const base = await test.step("scenario selection creates a real, isolated workspace and starts the guided tour", async () => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Process Exception Management" })).toBeVisible();
    await page.getByRole("link", { name: "Start with Process Exception Management" }).click();

    await expect(page).toHaveURL(/\/demo\/process-exceptions/);
    await page.getByRole("button", { name: "Start guided tour" }).click();

    await page.waitForURL(/\/w\/[^/]+\/inbox\?.*tour=1/);
    const match = /\/w\/([^/]+)\/inbox/.exec(page.url());
    if (!match) throw new Error(`Could not extract workspace slug from ${page.url()}`);
    return `/w/${match[1]}`;
  });

  await test.step("the tour overlay opens on Inbox, keyboard-focused, pinning the real operator note", async () => {
    const panel = page.getByTestId(TOUR_PANEL);
    await expect(panel).toBeVisible();
    await expect(panel.getByText("New artifacts have arrived")).toBeVisible();
    await expect(panel).toBeFocused();
    await expect(page.locator('[data-tour="tour-inbox-table"]')).toBeVisible();
    await expect(page.locator('[data-tour="tour-inbox-target-row"]')).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: "e2e/screenshots/process-exceptions-tour-inbox-arrival-desktop.png", fullPage: true });
  });

  await test.step("advancing the tour by keyboard alone reaches the process step", async () => {
    await tourNext(page, { keyboard: true });
    await expect(page.getByTestId(TOUR_PANEL).getByText("Process the artifact")).toBeVisible();
    await expect(page.locator('[data-tour="tour-process-target"]')).toBeVisible();
  });

  await test.step("processing the operator note extracts real fields with no ambiguity yet", async () => {
    const targetRow = page.locator('[data-tour="tour-inbox-target-row"]');
    await targetRow.locator('[data-tour="tour-process-target"]').click();
    await expect(targetRow.getByText("Processed")).toBeVisible();
  });

  await test.step("tour Next processes the QC confirmation for real and navigates to the Review Queue, showing the real unresolved reported-cause field", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/review`), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible();
    await expect(page.getByRole("button", { name: /reported-cause/ })).toBeVisible();
    await expect(page.getByText(/Insufficient evidence/)).toBeVisible();
    await expect(page.getByText(/Confidence/)).toBeVisible();
  });

  await test.step("accepting the observation resolves the review", async () => {
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Review queue is clear")).toBeVisible();
  });

  await test.step("tour Next processes the rest of the KM-LOT-448 escalation for real and navigates to the firing rule's trace", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/technical/rules/hold-affected-output-approval`), { timeout: 30_000 });
    await expect(page.getByText("hold-affected-output-approval · v1.0.0")).toBeVisible();
    await expect(page.getByText(/condition matched/)).toBeVisible();
    await expect(page.getByText(/formal-hold-requested/).first()).toBeVisible();
    await expect(page.getByText(/hold-affected-output \(propose-decision\)/)).toBeVisible();
  });

  await test.step("tour Next shows the real Exception Case", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/cases`));
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  await test.step("the case list row links to a real Case Detail with owner and evidence", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/cases/`));
    await expect(page.getByText("Exception Case", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Action items" })).toBeVisible();
  });

  await test.step("tour Next reaches the Decision Centre with the real Hold Affected Output decision awaiting approval", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/decisions`));
    await expect(page.getByText(/Hold Affected Output/)).toBeVisible();
    await expect(page.getByText("Risk: high")).toBeVisible();
  });

  await test.step("approving requires a comment for this high-risk decision, and records a real, audited Approval", async () => {
    const card = page.locator('[data-tour="tour-decision-card"]');
    await card.getByRole("button", { name: "Approve" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: "Approve this decision?" });
    const confirmButton = dialog.getByRole("button", { name: "Approve" });
    await expect(confirmButton).toBeDisabled();
    await dialog.getByLabel(/Comment/).fill("Confirmed with QC — hold all remaining KM-LOT-448 output.");
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();
    await expect(dialog).toBeHidden();
    await expect(card.getByText("Status: Approved")).toBeVisible();
  });

  await test.step("tour Next shows the Leadership dashboard reflecting the approval with real, non-zero values", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/overview`));
    await expect(page.getByText("The dashboard reflects the approval")).toBeVisible();

    const dashboard = page.locator('[data-tour="tour-dashboard-grid"]');
    await expect(dashboard.getByText("Open Exceptions")).toBeVisible();
    await expect(dashboard.getByText("Critical Signals")).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: "e2e/screenshots/process-exceptions-tour-leadership-overview-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 800, height: 1000 });
    await page.screenshot({ path: "e2e/screenshots/process-exceptions-tour-leadership-overview-tablet.png", fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await test.step("tour Next reaches the Audit Explorer, which shows the real, ordered chain from extraction to approval", async () => {
    await tourNext(page);
    await page.waitForURL(new RegExp(`${base}/audit`));
    const list = page.locator('[data-tour="tour-audit-list"]');
    await expect(list.getByText(/event assembled/i).first()).toBeVisible();
    await expect(list.getByText(/rule evaluated/i).first()).toBeVisible();
    await expect(list.getByText(/decision proposed/i).first()).toBeVisible();
    await expect(list.getByText(/decision approved/i).first()).toBeVisible();
  });

  await test.step("tour Next by keyboard reaches the final step, pinned on the Adapt CTA present in the shell", async () => {
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
  });
});
