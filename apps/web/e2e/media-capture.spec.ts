import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Locator } from "@playwright/test";

import { getTourSteps } from "../src/lib/tour/steps";
import { installFakeCursor } from "./media/cursor";
import { CAPTIONS, Presenter, readingBeatMs, type MarksFile } from "./media/presenter";

/**
 * OIW-913: records each pack's guided tour from the real app at human pace,
 * for the walkthrough videos, trailer and README hero GIF. Driven by the
 * same overlay and the same step list the shipped tour uses, so nothing on
 * screen is staged. Self-skips unless the explicit runner (`pnpm
 * media:capture`) opted in, so CI and default `test:e2e` runs are unaffected.
 */
test.skip(process.env.MEDIA_CAPTURE !== "1", "Explicit maintainer capture only; ordinary e2e never records media");

const VIEWPORT = { width: 1280, height: 800 };
const APPROVAL_COMMENT = "Reviewed the cited evidence; approving the proposed action (synthetic demo).";

const PACKS = [
  { id: "asset-reliability", name: "Asset Reliability" },
  { id: "process-exceptions", name: "Process Exception Management" },
  { id: "document-assurance", name: "Document Assurance" },
] as const;

const wanted = new Set((process.env.MEDIA_CAPTURE_PACKS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));

for (const pack of PACKS) {
  test(`record the ${pack.id} walkthrough`, async ({ browser }) => {
    test.skip(wanted.size > 0 && !wanted.has(pack.id), "Pack not selected for this run");
    const out = process.env.MEDIA_CAPTURE_OUT;
    const baseURL = test.info().project.use.baseURL;
    if (!out || !baseURL) throw new Error("Run through pnpm media:capture");
    await mkdir(out, { recursive: true });

    const steps = getTourSteps(pack.id);
    if (steps === undefined) throw new Error(`No guided tour for ${pack.id}`);

    const rawDirectory = resolve(out, `.raw-${pack.id}`);
    const context = await browser.newContext({
      baseURL,
      viewport: VIEWPORT,
      recordVideo: { dir: rawDirectory, size: VIEWPORT },
    });
    await context.addInitScript(installFakeCursor);
    // The video starts when the page is created, so the mark clock does too.
    const origin = Date.now();
    const page = await context.newPage();
    const video = page.video();
    const presenter = new Presenter(page, origin);
    const consoleProblems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleProblems.push(message.text().slice(0, 200));
    });

    const panel = page.getByTestId("tour-panel");

    /** Waits until the page shows the given step: its panel title, its spotlighted target, then a calm beat. */
    async function settle(index: number): Promise<void> {
      const step = steps![index]!;
      await expect(panel.locator("h2")).toHaveText(step.title, { timeout: 45_000 });
      await expect(page.locator(step.target).first()).toBeVisible({ timeout: 45_000 });
      await expect(page.locator("#main-content")).toBeVisible();
      await presenter.hold(700);
    }

    async function readBeat(index: number): Promise<void> {
      const step = steps![index]!;
      const text = (await panel.locator("h2 ~ p").allInnerTexts()).join(" ");
      const target = page.locator(step.target).first();
      // Draw the eye to the spotlighted area, then give the viewer time to read.
      await presenter.glideToLocator(target, 0.08, 0.1, 1000);
      await presenter.hold(readingBeatMs(text.split(/\s+/).filter(Boolean).length));
    }

    async function clickNext(): Promise<void> {
      await presenter.click(panel.getByRole("button", { name: "Next" }));
    }

    async function pickedUpBy(locator: Locator): Promise<void> {
      await expect(locator).toBeVisible({ timeout: 45_000 });
    }

    try {
      // Scenario selection and start.
      await page.goto("/demo");
      await expect(page.getByRole("heading", { name: pack.name })).toBeVisible();
      await presenter.hold(1200);
      presenter.mark("scenario", CAPTIONS.scenario!);
      await presenter.glideTo(640, 420, 700);
      await presenter.hold(2600);
      await presenter.click(page.getByRole("link", { name: `Start with ${pack.name}` }));
      await expect(page).toHaveURL(new RegExp(`/demo/${pack.id}`));
      const start = page.getByRole("button", { name: "Start guided tour" });
      await expect(start).toBeVisible();
      await presenter.hold(900);
      presenter.mark("start", CAPTIONS.start!);
      await presenter.glideToLocator(start, 0.5, 0.5, 800);
      await presenter.hold(2800);
      await presenter.click(start);
      await page.waitForURL(/\/w\/[^/]+\/inbox/);

      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index]!;
        await settle(index);
        presenter.mark(step.id, CAPTIONS[step.id] ?? step.title);
        await readBeat(index);

        if (step.id === "inbox-process") {
          const row = page.locator('[data-tour="tour-inbox-target-row"]');
          await presenter.click(row.locator('[data-tour="tour-process-target"]'));
          await pickedUpBy(row.getByText(/Processed|Needs review/));
          await presenter.hold(700);
          presenter.mark("inbox-extracted", CAPTIONS["inbox-extracted"]!);
          await presenter.glideToLocator(row, 0.55, 0.5, 900);
          await presenter.hold(3400);
        } else if (step.id === "review-ambiguity") {
          await presenter.click(page.getByRole("button", { name: "Accept", exact: true }));
          await pickedUpBy(page.getByText("Review queue is clear"));
          await presenter.hold(700);
          presenter.mark("review-accepted", CAPTIONS["review-accepted"]!);
          await presenter.hold(3000);
        } else if (step.id === "decision-approval") {
          const card = page.locator('[data-tour="tour-decision-card"]');
          await presenter.click(card.getByRole("button", { name: /Approve decision:/ }));
          const dialog = page.getByRole("dialog").filter({ hasText: "Approve this decision?" });
          await pickedUpBy(dialog);
          await presenter.hold(1200);
          presenter.mark("decision-comment", CAPTIONS["decision-comment"]!);
          const commentField = dialog.getByLabel(/Comment/);
          await presenter.type(commentField, APPROVAL_COMMENT);
          await expect(commentField).toHaveValue(APPROVAL_COMMENT);
          await presenter.hold(1200);
          await presenter.click(dialog.getByRole("button", { name: "Approve", exact: true }));
          await expect(dialog).toBeHidden();
          await pickedUpBy(card.getByText("Status: Approved"));
          await presenter.hold(600);
          presenter.mark("decision-approved", CAPTIONS["decision-approved"]!);
          await presenter.glideToLocator(card, 0.4, 0.5, 900);
          await presenter.hold(3200);
        }

        if (step.next.kind === "none") {
          await presenter.hold(1500);
        } else {
          await clickNext();
        }
      }

      // The encoder cuts the trailer and captions from these marks, so check them before they are saved.
      for (const step of steps) {
        expect(presenter.marks.some((mark) => mark.id === step.id), `no mark recorded for tour step ${step.id}`).toBe(true);
      }
      for (const id of ["inbox-extracted", "review-accepted", "decision-comment", "decision-approved"]) {
        expect(presenter.marks.some((mark) => mark.id === id), `no mark recorded for ${id}`).toBe(true);
      }
      const times = presenter.marks.map((mark) => mark.t);
      expect(times, "marks must not go backwards in time").toEqual([...times].sort((a, b) => a - b));

      const endsAt = presenter.now();
      const marksFile: MarksFile = { schemaVersion: 1, pack: pack.id, viewport: VIEWPORT, endsAt, marks: presenter.marks };
      await writeFile(resolve(out, `${pack.id}.marks.json`), `${JSON.stringify(marksFile, null, 2)}\n`);
    } finally {
      await context.close();
      if (video !== null) await video.saveAs(resolve(out, `${pack.id}.webm`));
      await video?.delete();
      await rm(rawDirectory, { recursive: true, force: true });
    }
    // A page error during a recording means the tour regressed; do not publish media of it.
    expect(consoleProblems, `console errors seen during ${pack.id}`).toEqual([]);
  });
}

