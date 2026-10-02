import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { CaptureStages, FrozenSources } from "../../../scripts/casebook/capture.js";

async function next(page: Page): Promise<void> {
  await page.getByTestId("tour-panel").getByRole("button", { name: "Next" }).click();
}
async function exported(page: Page, name: string): Promise<unknown> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name }).click();
  const download = await pending;
  const path = await download.path();
  if (!path) throw new Error("Authenticated export download missing");
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

test.skip(process.env.CASEBOOK_CAPTURE !== "1", "Explicit maintainer capture only; ordinary e2e never writes recordings");

test("capture the source-bound synthetic governed case", async ({ page }) => {
  const output = process.env.CASEBOOK_CAPTURE_RAW;
  if (!output || !process.env.CASEBOOK_CAPTURE_PORT) throw new Error("Run through casebook:capture");
  const sources = JSON.parse(await readFile(resolve(import.meta.dirname, "../../../scenario-packs/asset-reliability/casebook/sources.json"), "utf8")) as FrozenSources;
  const story = JSON.parse(await readFile(resolve(import.meta.dirname, "../../../scenario-packs/asset-reliability/casebook/case.json"), "utf8")) as { capture: { ruleId: string; ruleVersion: string; approvalComment: string } };

  await page.goto("/demo/asset-reliability");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await page.waitForURL(/\/w\/[^/]+\/inbox/);
  const base = new URL(page.url()).pathname.replace(/\/inbox$/, "");
  await next(page);
  await page.locator('[data-tour="tour-process-target"]').click();
  await expect(page.locator('[data-tour="tour-inbox-target-row"]').getByText("Needs review")).toBeVisible();
  await next(page);
  await expect(page.getByRole("button", { name: new RegExp(sources.excerpt.fieldKey) })).toBeVisible();
  const detail = page.locator("dl").filter({ has: page.getByText("Extracted value", { exact: true }) });
  const detailValue = async (label: string) => (await detail.locator("dt").filter({ hasText: new RegExp(`^${label}$`) }).locator("+ dd").innerText()).trim();
  const fieldKey = await detailValue("Field");
  const confidence = await detailValue("Confidence");
  const pendingStatus = await detailValue("Status");
  const excerpt = await page.locator("mark").innerText();
  expect(fieldKey).toBe(sources.excerpt.fieldKey);
  expect(confidence).toBe("70%");
  expect(pendingStatus).toBe("Pending review");
  expect(excerpt).toBe(sources.excerpt.text);
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByText("Review queue is clear")).toBeVisible();
  await next(page);
  await page.waitForURL(new RegExp(`${base}/technical/rules/`), { timeout: 30_000 });
  await expect(page.getByText(`${story.capture.ruleId} · v${story.capture.ruleVersion}`)).toBeVisible();
  await expect(page.getByText(/condition matched/)).toBeVisible();
  const ruleEventId = (await page.locator("section").filter({ has: page.getByRole("heading", { name: "Rule identity", exact: true }) }).locator("code").innerText()).trim();
  const facts = page.getByRole("table", { name: "Fact evaluation" });
  const severityValue = (await facts.getByRole("row").filter({ hasText: "observation(severity-indicator).value" }).locator("td").nth(1).innerText()).trim();
  const aggregateValue = Number((await facts.getByRole("row").filter({ hasText: "related-event-count within 1440h" }).locator("td").nth(1).innerText()).trim());
  expect(severityValue).toBe("safety-critical");
  expect(aggregateValue).toBeGreaterThanOrEqual(2);
  await expect(page.getByText(/Decision proposed — "critical" risk/)).toBeVisible();
  await next(page);
  await page.waitForURL(new RegExp(`${base}/cases`));
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  const href = await page.locator("table tbody tr a").first().getAttribute("href");
  if (!href) throw new Error("Case link missing");
  await next(page);
  await page.waitForURL(new RegExp(`${base}/cases/`));
  await expect(page.getByRole("heading", { name: "Action items" })).toBeVisible();
  const pending = await exported(page, "Export cases as JSON");
  await next(page);
  await page.waitForURL(new RegExp(`${base}/decisions`));
  const card = page.locator('[data-tour="tour-decision-card"]');
  await expect(card.getByText("Risk: critical")).toBeVisible();
  await expect(card.getByRole("button", { name: /Approve decision:/ })).toBeVisible();
  await card.getByRole("button", { name: /Approve decision:/ }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Approve this decision?" });
  const confirm = dialog.getByRole("button", { name: "Approve", exact: true });
  await expect(confirm).toBeDisabled();
  const commentRequired = await confirm.isDisabled();
  await dialog.getByLabel(/Comment/).fill(story.capture.approvalComment);
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(dialog).toBeHidden();
  await expect(card.getByText("Status: Approved")).toBeVisible();
  await page.getByTestId("tour-panel").getByRole("button", { name: "Exit tour" }).click();
  await page.goto(href);
  const final = await exported(page, "Export cases as JSON");
  await page.goto(`${base}/audit?lens=technical`);
  const audit = await exported(page, "Export audit as JSON");
  const stages: CaptureStages = { fieldKey, confidence, excerpt, pendingStatus, queueCleared: true, ruleId: story.capture.ruleId, ruleVersion: story.capture.ruleVersion, ruleEventId, severityValue, aggregateValue, commentRequired, approvalComment: story.capture.approvalComment };
  // Private staging only. The owning runner validates, aliases and atomically saves public fields.
  await writeFile(output, JSON.stringify({ pending, final, audit, stages }), { flag: "wx", mode: 0o600 });
});
