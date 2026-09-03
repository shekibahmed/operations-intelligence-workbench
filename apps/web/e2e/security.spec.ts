import { Buffer } from "node:buffer";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { issueSessionToken } from "@oiw/application";

const sessionSecret = "e2e-test-session-secret-not-for-production-use";

async function startGuestWorkspace(page: Page): Promise<string> {
  await page.goto("/demo/asset-reliability");
  await page.getByRole("button", { name: "Explore freely" }).click();
  await page.waitForURL(/\/w\/[^/]+\/overview/);
  const match = /\/w\/([^/]+)\/overview/.exec(page.url());
  if (!match) throw new Error(`Could not extract workspace slug from ${page.url()}`);
  return `/w/${match[1]}`;
}

async function replaceSessionCookie(context: BrowserContext, value: string): Promise<void> {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "oiw_session",
      value,
      url: "http://127.0.0.1:4300",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  const installed = (await context.cookies("http://127.0.0.1:4300")).find(
    ({ name }) => name === "oiw_session",
  );
  expect(installed?.value).toBe(value);
}

function decodeWorkspaceId(token: string): string {
  const payload = token.split(".")[1];
  if (payload === undefined) throw new Error("Session token has no payload");
  return (JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { workspaceId: string }).workspaceId;
}

function tamperSignature(token: string): string {
  const [version, payload, signature] = token.split(".");
  if (version === undefined || payload === undefined || signature === undefined) {
    throw new Error("Session token does not have three segments");
  }

  const tamperedSignature = `${signature.startsWith("a") ? "b" : "a"}${signature.slice(1)}`;
  return `${version}.${payload}.${tamperedSignature}`;
}

test("HTTP boundary rejects forged, expired and tampered guest cookies without workspace disclosure", async ({ page, context }) => {
  const base = await startGuestWorkspace(page);
  const cookie = (await context.cookies()).find(({ name }) => name === "oiw_session");
  expect(cookie).toBeDefined();
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax" });

  const workspaceId = decodeWorkspaceId(cookie!.value);
  const attacks = [
    {
      name: "forged",
      token: issueSessionToken(workspaceId, "attacker-secret-that-is-definitely-32-bytes").token,
    },
    {
      name: "expired",
      token: issueSessionToken(workspaceId, sessionSecret, {
        now: new Date("2000-01-01T00:00:00.000Z"),
        ttlSeconds: 1,
      }).token,
    },
    {
      name: "tampered",
      token: tamperSignature(cookie!.value),
    },
  ];

  for (const attack of attacks) {
    await test.step(`${attack.name} cookie`, async () => {
      await replaceSessionCookie(context, attack.token);
      const response = await page.goto(`${base}/overview`);
      expect(response).not.toBeNull();
      expect(new URL(response!.url()).pathname).toBe("/demo");

      const rejectedRequest = response!.request().redirectedFrom();
      expect(rejectedRequest).not.toBeNull();
      expect(new URL(rejectedRequest!.url()).pathname).toBe(`${base}/overview`);
      expect((await rejectedRequest!.response())?.status()).toBe(307);
      await expect(page.getByText(/workspace not found/i)).toHaveCount(0);
    });
  }
});

test("HTTP direct-object references and URL tampering cannot cross guest workspaces", async ({ page, browser }) => {
  const baseA = await startGuestWorkspace(page);
  await page.goto(`${baseA}/inbox`);
  const artifactHrefA = await page.locator("table tbody tr a").first().getAttribute("href");
  if (artifactHrefA === null) throw new Error("Workspace A has no artifact link");
  await page.goto(`${baseA}/entities`);
  const entityHrefA = await page.locator("table tbody tr a").first().getAttribute("href");
  if (entityHrefA === null) throw new Error("Workspace A has no entity link");

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  try {
    const baseB = await startGuestWorkspace(pageB);

    await pageB.goto(`${baseA}/overview`);
    await expect(pageB).toHaveURL(/\/demo$/);

    await pageB.goto(artifactHrefA.replace(baseA, baseB));
    await expect(pageB.getByText("This page could not be found.")).toBeVisible();
    await expect(pageB.getByText("Checksum (SHA-256)")).toHaveCount(0);

    await pageB.goto(entityHrefA.replace(baseA, baseB));
    await expect(pageB.getByText("This page could not be found.")).toBeVisible();
    await expect(pageB.getByText("Synthetic workspace")).toHaveCount(0);

    const exportAttempt = await pageB.evaluate(async (url) => {
      const response = await fetch(url, { credentials: "same-origin" });
      return { status: response.status, body: await response.text() };
    }, `${baseA}/exports/cases/json`);
    expect(exportAttempt.status).toBe(404);
    expect(exportAttempt.body).not.toContain(baseA);
    expect(exportAttempt.body).not.toContain(artifactHrefA);
  } finally {
    await contextB.close();
  }
});
