import { expect, test } from "@playwright/test";
import {
  createAssessmentSubmissionRepository,
  createDatabase,
  createPostgresRepositories,
} from "@oiw/persistence";

test("contextual assessment CTA validates and stores a submission", async ({ page }) => {
  await page.goto("/demo/asset-reliability");
  await page.getByRole("button", { name: "Explore freely" }).click();
  await page.waitForURL(/\/w\/[^/]+\/overview/);
  const workspaceSlug = /\/w\/([^/]+)\/overview/.exec(page.url())?.[1];
  if (workspaceSlug === undefined) throw new Error(`Could not extract workspace slug from ${page.url()}`);

  await page.getByRole("link", { name: "Adapt this workflow" }).click();
  await page.waitForURL(/\/adapt\?scenario=asset-reliability/);
  await expect(page.getByLabel("Scenario being viewed")).toHaveValue("asset-reliability");
  await expect(page.getByText(/This assessment stores only/)).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.screenshot({ path: "e2e/screenshots/assessment-cta-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Check the highlighted fields and try again.")).toBeVisible();
  await expect(page.getByText("This field is required.").first()).toBeVisible();

  await page.getByLabel(/Organisation/).fill("Synthetic Assessment Organisation");
  await page.getByLabel(/Industry/).fill("Cross-sector operations");
  await page.getByLabel(/Operational workflow/).fill("Exception intake and accountable review");
  await page.getByLabel(/Current source systems/).fill("Email and spreadsheets");
  await page.getByLabel(/Approximate information volume/).fill("100 synthetic records per week");
  await page.getByLabel(/Main bottleneck/).fill("Manual triage");
  await page.getByLabel(/Current reporting method/).fill("Weekly review");
  await page.getByLabel(/Data sensitivity/).fill("Internal operational metadata");
  await page.getByLabel(/Desired result/).fill("Faster, governed follow-up");
  await page.getByLabel(/Contact details/).fill("synthetic-contact@example.test");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("status")).toContainText("Thanks — we'll follow up shortly.");

  const connection = createDatabase();
  try {
    const workspace = await createPostgresRepositories(connection.database).workspaces.findBySlug(workspaceSlug);
    if (workspace === null) throw new Error("Assessment workspace was not persisted");
    const submissions = await createAssessmentSubmissionRepository(connection.database).listByWorkspace(workspace.id);
    expect(submissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workspaceId: workspace.id,
          scenarioId: "asset-reliability",
          contactDetails: "synthetic-contact@example.test",
        }),
      ]),
    );
  } finally {
    await connection.close();
  }
});
