import { expect, test } from "@playwright/test";

import { artifactIds, caseIds, entityIds } from "../src/lib/stub/ids";

const WORKSPACE = "demo-asset-reliability";
const BASE = `/w/${WORKSPACE}`;

const ROUTES: { path: string; heading: string | RegExp }[] = [
  { path: "/", heading: /Turn scattered operational information/ },
  { path: "/demo", heading: "Asset Reliability" },
  { path: "/demo/asset-reliability", heading: "Asset Reliability" },
  { path: "/adapt", heading: /Adapt this workflow/ },
  { path: `${BASE}/overview`, heading: "Overview" },
  { path: `${BASE}/inbox`, heading: "Inbox" },
  { path: `${BASE}/review`, heading: "Review Queue" },
  { path: `${BASE}/cases`, heading: "Cases" },
  { path: `${BASE}/cases/${caseIds.open}`, heading: /Repeat brake-assembly fault/ },
  { path: `${BASE}/entities`, heading: "Entities" },
  { path: `${BASE}/entities/${entityIds.assetPrimary}`, heading: "AR-1042" },
  { path: `${BASE}/decisions`, heading: "Decisions" },
  { path: `${BASE}/technical/artifacts/${artifactIds.informal}`, heading: /field-message/ },
  { path: `${BASE}/technical/rules/repeat-fault-safety-hold`, heading: /repeat-fault-safety-hold/ },
  { path: `${BASE}/audit`, heading: "Audit" },
  { path: `${BASE}/about-pack`, heading: "Asset Reliability" },
];

for (const route of ROUTES) {
  test(`renders ${route.path}`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(route.heading).first()).toBeVisible();
  });
}

test("lens switch keeps the same route", async ({ page }) => {
  await page.goto(`${BASE}/cases`);
  await expect(page).toHaveURL(/lens=operations/);
  await page.getByRole("radio", { name: "Technical" }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/cases\\?.*lens=technical`));
});

const SCREENSHOT_TARGETS: { path: string; name: string }[] = [
  { path: `${BASE}/overview`, name: "overview" },
  { path: `${BASE}/inbox`, name: "inbox" },
  { path: `${BASE}/review`, name: "review" },
  { path: `${BASE}/cases/${caseIds.open}`, name: "case-detail" },
  { path: `${BASE}/decisions`, name: "decision-centre" },
];

for (const target of SCREENSHOT_TARGETS) {
  test(`screenshot ${target.name} desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(target.path);
    await page.screenshot({ path: `e2e/screenshots/${target.name}-desktop.png`, fullPage: true });
  });

  test(`screenshot ${target.name} tablet`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1000 });
    await page.goto(target.path);
    await page.screenshot({ path: `e2e/screenshots/${target.name}-tablet.png`, fullPage: true });
  });
}
