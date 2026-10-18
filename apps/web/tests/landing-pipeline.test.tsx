import { act, render, screen, within } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";
import { CountUp } from "@/components/marketing/CountUp";
import { PIPELINE_NODES, PipelineHero } from "@/components/marketing/PipelineHero";
import { Stats } from "@/components/marketing/Stats";
import { stubPacks } from "@/lib/stub/packs";

const EXPECTED_LABELS = [
  "Source",
  "Artifact",
  "Observation",
  "Review",
  "Event",
  "Rule",
  "Case / Decision",
  "Approval",
  "Audit",
];

describe("PipelineHero", () => {
  it("renders the nine stages as an ordered list inside a captioned figure", () => {
    const { container } = render(<PipelineHero />);
    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    expect(figure?.querySelector("figcaption")).not.toBeNull();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(9);
    expect(PIPELINE_NODES.map((node) => node.label)).toEqual(EXPECTED_LABELS);
    items.forEach((item, index) => {
      expect(within(item).getByText(EXPECTED_LABELS[index] as string)).toBeInTheDocument();
    });
  });

  it("keeps decorative motion elements out of the accessibility tree", () => {
    const { container } = render(<PipelineHero />);
    // Connectors and the travelling packet carry no text and are hidden from
    // assistive tech; everything exposed to it is the stage list itself.
    const decorative = container.querySelectorAll("[aria-hidden='true']");
    expect(decorative.length).toBeGreaterThanOrEqual(9);
    for (const node of decorative) {
      expect(node.textContent?.trim()).toBe("");
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
  });
});

describe("CountUp", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  function digits(container: HTMLElement) {
    return container.querySelector("[aria-hidden='true']");
  }

  it("renders the final value for assistive tech and visually when IntersectionObserver is missing", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<CountUp value={1} decimals={3} />);
    expect(container.querySelector(".sr-only")?.textContent).toBe("1.000");
    expect(digits(container)?.textContent).toBe("1.000");
  });

  it("does not animate when reduced motion is requested", () => {
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
        disconnect = vi.fn();
      },
    );
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    const { container } = render(<CountUp value={9} />);
    expect(observe).not.toHaveBeenCalled();
    expect(digits(container)?.textContent).toBe("9");
    expect(container.querySelector(".sr-only")?.textContent).toBe("9");
  });

  describe("with IntersectionObserver and no motion preference", () => {
    let trigger: (isIntersecting: boolean) => void;
    let disconnect: ReturnType<typeof vi.fn>;
    let frames: Map<number, FrameRequestCallback>;
    let now: number;
    let nextFrame: number;

    /** Runs the pending animation frames after moving the clock forward. */
    function advance(ms: number) {
      now += ms;
      const pending = [...frames.entries()];
      frames.clear();
      act(() => {
        for (const [, callback] of pending) callback(now);
      });
    }

    beforeEach(() => {
      disconnect = vi.fn();
      frames = new Map();
      now = 1000;
      nextFrame = 1;
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
            trigger = (isIntersecting) => callback([{ isIntersecting }]);
          }
          observe = vi.fn();
          disconnect = disconnect;
        },
      );
      vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        const id = nextFrame++;
        frames.set(id, callback);
        return id;
      });
      vi.stubGlobal("cancelAnimationFrame", (id: number) => {
        frames.delete(id);
      });
      vi.spyOn(performance, "now").mockImplementation(() => now);
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("starts at zero, passes through intermediate values, ends on the final value and keeps it for screen readers", () => {
      const { container } = render(<CountUp value={3} durationMs={1000} />);
      expect(digits(container)?.textContent).toBe("0");
      expect(container.querySelector(".sr-only")?.textContent).toBe("3");

      act(() => trigger(false));
      expect(frames.size).toBe(0);
      expect(digits(container)?.textContent).toBe("0");

      act(() => trigger(true));
      advance(300);
      const mid = Number(digits(container)?.textContent);
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThan(3);

      advance(1000);
      expect(digits(container)?.textContent).toBe("3");
      expect(container.querySelector(".sr-only")?.textContent).toBe("3");
    });

    it("disconnects the observer, cancels the frame and restores the final text on unmount", () => {
      const { container, unmount } = render(<CountUp value={3} durationMs={1000} />);
      const node = digits(container) as HTMLElement;
      act(() => trigger(true));
      advance(200);
      expect(frames.size).toBe(1);

      unmount();
      expect(disconnect).toHaveBeenCalled();
      expect(frames.size).toBe(0);
      expect(node.textContent).toBe("3");
    });
  });
});

describe("Stats", () => {
  it("renders the four truthful figures, with the evaluation qualifier and provenance badge", () => {
    const { container } = render(<Stats packCount={3} lensCount={3} stageCount={9} />);
    const values = screen.getAllByRole("definition");
    expect(values).toHaveLength(4);
    expect(
      values.map((value) => value.querySelector(".sr-only")?.textContent),
    ).toEqual(["3", "3", "9", "1.000"]);

    expect(screen.getByText(/evaluation score on synthetic fixtures/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "how it is measured" })).toHaveAttribute(
      "href",
      "https://github.com/shekibahmed/operations-intelligence-workbench/blob/main/docs/EVALUATION.md",
    );

    // UX_SPEC 7.1: the 1.000 metric carries a text provenance badge beside it.
    const badge = within(values[3] as HTMLElement).getByText("Calculated");
    expect(badge).toHaveAttribute("title", expect.stringMatching(/deterministically/));
    expect(container.querySelectorAll("[title]")).toHaveLength(1);
  });
});

describe("LandingPage wiring", () => {
  function renderLanding() {
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as never);
    return render(<LandingPage />);
  }

  it("derives the at-a-glance figures from the pack registry and the pipeline", () => {
    renderLanding();
    const glance = screen.getByRole("region", { name: "At a glance" });
    const values = within(glance)
      .getAllByRole("definition")
      .map((value) => value.querySelector(".sr-only")?.textContent);
    expect(values).toEqual([String(stubPacks.length), "3", String(PIPELINE_NODES.length), "1.000"]);
    expect(PIPELINE_NODES).toHaveLength(9);
  });

  it("links the hosted walkthrough without embedding a video", () => {
    const { container } = renderLanding();
    expect(screen.getByRole("link", { name: "Watch the 2-minute walkthrough" })).toHaveAttribute(
      "href",
      "https://shekibahmed.github.io/operations-intelligence-workbench/#walkthroughs",
    );
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByRole("link", { name: "Read the evidence casebook" })).toHaveAttribute(
      "href",
      "/casebook/a-142-repeat-fault.html",
    );
  });

  it("marks the existing how-it-works and capability cards for scroll reveal", () => {
    const { container } = renderLanding();
    expect(container.querySelectorAll(".reveal-on-scroll").length).toBeGreaterThan(0);
  });
});
