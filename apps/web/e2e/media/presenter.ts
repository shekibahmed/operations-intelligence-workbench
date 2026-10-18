import type { Locator, Page } from "@playwright/test";

/** One timestamped moment in a recording; `t` is seconds from the start of the video. */
export interface Mark {
  id: string;
  /** Plain-language caption for a viewer who has never seen the product. */
  caption: string;
  t: number;
}

export interface MarksFile {
  schemaVersion: 1;
  pack: string;
  viewport: { width: number; height: number };
  /** Total recorded length in seconds, measured when the last beat finished. */
  endsAt: number;
  marks: Mark[];
}

/**
 * Drives a page at human pace: eased cursor glides, deliberate pauses, slow
 * typing, and a mark log aligned to the recording's clock. `origin` must be
 * taken immediately before the page (and therefore the video) is created.
 */
export class Presenter {
  readonly marks: Mark[] = [];
  private readonly origin: number;

  constructor(
    readonly page: Page,
    origin: number,
  ) {
    this.origin = origin;
  }

  now(): number {
    return Math.round(((Date.now() - this.origin) / 1000) * 100) / 100;
  }

  mark(id: string, caption: string): void {
    this.marks.push({ id, caption, t: this.now() });
  }

  async hold(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Moves the picture of the pointer smoothly, then the real mouse to the same spot. */
  async glideTo(x: number, y: number, ms = 900): Promise<void> {
    const viewport = this.page.viewportSize() ?? { width: 1280, height: 800 };
    const px = Math.max(8, Math.min(viewport.width - 8, x));
    const py = Math.max(8, Math.min(viewport.height - 8, y));
    await this.page.evaluate(
      async ([gx, gy, duration]) => {
        const glide = (window as unknown as { __oiwGlide?: (x: number, y: number, ms: number) => Promise<void> }).__oiwGlide;
        if (glide !== undefined) await glide(gx!, gy!, duration!);
      },
      [px, py, ms] as const,
    );
    await this.page.mouse.move(px, py);
  }

  /** Glides to a point inside the element (default: its centre). Returns false if it is not on screen. */
  async glideToLocator(locator: Locator, fx = 0.5, fy = 0.5, ms = 900): Promise<boolean> {
    const box = await locator.boundingBox();
    if (box === null) return false;
    await this.glideTo(box.x + box.width * fx, box.y + box.height * fy, ms);
    return true;
  }

  /** Scrolls the element into view, glides to it, pauses so the viewer sees where, then clicks. */
  async click(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box === null) throw new Error("Cannot click an element that is not on screen");
    await this.glideTo(box.x + box.width / 2, box.y + box.height / 2, 800);
    await this.hold(300);
    await locator.click();
  }

  /** Types like a person: the text appears gradually, not all at once. */
  async type(locator: Locator, text: string): Promise<void> {
    await this.click(locator);
    await locator.pressSequentially(text, { delay: 45 });
  }
}

/** Reading time scaled to how much text the viewer has to take in. */
export function readingBeatMs(wordCount: number): number {
  return Math.max(3000, Math.min(6000, 2000 + wordCount * 80));
}

/** Short, neutral captions shared by every pack's walkthrough, keyed by the tour step they accompany. */
export const CAPTIONS: Readonly<Record<string, string>> = {
  scenario: "Pick a scenario. Everything shown here is synthetic demo data.",
  start: "Starting creates a private demo workspace, already loaded with sample data.",
  "inbox-arrival": "New reports arrive as raw text, spreadsheets and documents.",
  "inbox-process": "One click runs AI extraction. No outside model is needed for this demo.",
  "inbox-extracted": "The raw report becomes structured fields, each with a confidence score.",
  "review-ambiguity": "Anything uncertain goes to a person. Original text on the left, evidence on the right.",
  "review-accepted": "A human confirms the fact, so it can be trusted.",
  "rule-trace": "A fixed rule checks the facts and fires. Every condition it tested is shown.",
  "case-list": "A case is opened automatically, with an owner, priority and evidence.",
  "case-detail": "The follow-up actions are already assigned.",
  "decision-approval": "The system proposes an action but never acts alone. High-risk choices need a person.",
  "decision-comment": "The approver records why, in their own words.",
  "decision-approved": "Approved, and recorded.",
  "dashboard-update": "The dashboards update from that single approval.",
  "technical-trace": "Every step is kept in an audit trail, in order.",
  "adapt-cta": "Same flow, applied to your own operations.",
};
