import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * OIW-910: the landing pipeline figure is decorative motion that must degrade
 * to a complete static diagram under `prefers-reduced-motion: reduce`, and the
 * page must stay axe-clean (zero violations of any impact, not just
 * serious/critical) in both motion states.
 */

const NINE = 9;

async function runningAnimationsInPipe(page: Page) {
  return page.evaluate(
    () =>
      document
        .querySelector(".pipe")
        ?.getAnimations({ subtree: true })
        .filter((animation) => animation.playState === "running").length ?? -1,
  );
}

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
}

test.describe("landing pipeline, reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("shows the complete static diagram with nothing animating", async ({ page }) => {
    await page.goto("/");
    const pipe = page.locator(".pipe");
    await expect(pipe).toBeVisible();

    await expect(pipe.locator(".pipe-node")).toHaveCount(NINE);
    await expect(pipe.locator(".pipe-text")).toHaveCount(NINE);
    for (const selector of [".pipe-node", ".pipe-text"]) {
      const opacities = await pipe
        .locator(selector)
        .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).opacity));
      expect(opacities, selector).toEqual(Array(NINE).fill("1"));
    }
    await expect(pipe.locator(".pipe-text").first()).toBeVisible();
    await expect(pipe.locator(".pipe-text").last()).toBeVisible();

    expect(await pipe.locator(".pipe-packet").evaluate((node) => getComputedStyle(node).opacity)).toBe("0");
    expect(await runningAnimationsInPipe(page)).toBe(0);
  });

  test("has no axe violations of any impact", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".pipe")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe("landing pipeline, normal motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("animates the figure", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".pipe")).toBeVisible();
    await expect.poll(() => runningAnimationsInPipe(page)).toBeGreaterThan(0);
  });

  test("has no axe violations of any impact once the intro has finished", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".pipe")).toBeVisible();
    // Wait only for the finite, time-based intro animations: the packet loops
    // forever and scroll-driven reveals never "finish" on a view timeline.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.timeline instanceof DocumentTimeline &&
              animation.effect?.getComputedTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
    expect(await axeViolations(page)).toEqual([]);
  });
});
