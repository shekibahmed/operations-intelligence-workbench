import { readFile } from "node:fs/promises";

import { expect, test, type Download, type Page } from "@playwright/test";

const SYNTHETIC_NOTICE = "Synthetic demo data only";

async function tourNext(page: Page): Promise<void> {
  await page.getByTestId("tour-panel").getByRole("button", { name: "Next" }).click();
}

async function downloadFrom(page: Page, accessibleName: string, keyboard = false): Promise<{ download: Download; text: string }> {
  const pendingDownload = page.waitForEvent("download");
  const button = page.getByRole("button", { name: accessibleName });
  if (keyboard) {
    await button.focus();
    await button.press("Enter");
  } else {
    await button.click();
  }
  const download = await pendingDownload;
  const path = await download.path();
  if (path === null) throw new Error(`Download ${download.suggestedFilename()} has no local path`);
  return { download, text: await readFile(path, "utf8") };
}

test("advanced workspace case and audit exports download as safe CSV and JSON from all specified UI placements", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await page.goto("/demo/asset-reliability");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await page.waitForURL(/\/w\/[^/]+\/inbox/);
  const match = /\/w\/([^/]+)\/inbox/.exec(page.url());
  if (!match) throw new Error(`Could not extract workspace slug from ${page.url()}`);
  const base = `/w/${match[1]}`;

  await tourNext(page);
  await page.locator('[data-tour="tour-process-target"]').click();
  await tourNext(page);
  await page.getByRole("button", { name: "Accept" }).click();
  await tourNext(page);
  await page.waitForURL(new RegExp(`${base}/technical/rules/`), { timeout: 30_000 });
  await tourNext(page);
  await page.waitForURL(new RegExp(`${base}/cases`));
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  await page.getByTestId("tour-panel").getByRole("button", { name: "Exit tour" }).click();

  await page.screenshot({ path: "e2e/screenshots/export-case-list-desktop.png" });
  const casesCsv = await downloadFrom(page, "Export cases as CSV", true);
  expect(casesCsv.download.suggestedFilename()).toMatch(/^cases-[a-z0-9._-]+\.csv$/);
  expect(casesCsv.text).toContain('"syntheticDataNotice","id","workspaceId"');
  expect(casesCsv.text).toContain(SYNTHETIC_NOTICE);
  expect(casesCsv.text).toContain('"signalCount","signalsSummary"');

  const caseHref = await page.locator("table tbody tr a").first().getAttribute("href");
  if (caseHref === null) throw new Error("Case list row has no detail link");
  await page.goto(caseHref);
  await expect(page.getByRole("heading", { name: "Action items" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/export-case-detail-desktop.png" });
  const casesJson = await downloadFrom(page, "Export cases as JSON");
  const casesPayload = JSON.parse(casesJson.text) as {
    syntheticDataNotice: string;
    records: Array<{ signals: unknown[]; actionItems: unknown[]; decisions: unknown[] }>;
  };
  expect(casesPayload.syntheticDataNotice).toContain(SYNTHETIC_NOTICE);
  expect(casesPayload.records).toHaveLength(1);
  expect(casesPayload.records[0]?.signals.length).toBeGreaterThan(0);
  expect(casesPayload.records[0]?.actionItems.length).toBeGreaterThan(0);
  expect(casesPayload.records[0]?.decisions.length).toBeGreaterThan(0);

  await page.goto(`${base}/audit?lens=technical`);
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/export-audit-desktop.png" });
  const auditCsv = await downloadFrom(page, "Export audit as CSV");
  expect(auditCsv.text).toContain('"previousEntryHash","entryHash"');
  expect(auditCsv.text).toContain(SYNTHETIC_NOTICE);

  const auditJson = await downloadFrom(page, "Export audit as JSON");
  const auditPayload = JSON.parse(auditJson.text) as {
    syntheticDataNotice: string;
    records: Array<{ action: string; previousEntryHash: string | null; entryHash: string }>;
  };
  expect(auditPayload.syntheticDataNotice).toContain(SYNTHETIC_NOTICE);
  expect(auditPayload.records.filter((entry) => entry.action === "export").length).toBeGreaterThanOrEqual(4);
  expect(auditPayload.records.at(-1)?.entryHash).toMatch(/^[0-9a-f]{64}$/);
  expect(auditPayload.records.at(-1)?.previousEntryHash).toMatch(/^[0-9a-f]{64}$/);
});
