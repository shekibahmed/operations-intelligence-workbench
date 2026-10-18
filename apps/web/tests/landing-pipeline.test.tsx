import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CountUp } from "@/components/marketing/CountUp";
import { PIPELINE_NODES, PipelineHero } from "@/components/marketing/PipelineHero";
import { Stats } from "@/components/marketing/Stats";

describe("PipelineHero", () => {
  it("renders the nine stages as an ordered list inside a captioned figure", () => {
    const { container } = render(<PipelineHero />);
    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    expect(figure?.querySelector("figcaption")).not.toBeNull();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(9);
    expect(PIPELINE_NODES).toHaveLength(9);
    expect(items.map((item) => item.querySelector("span.block > span.block")?.textContent)).toEqual([
      "Source",
      "Artifact",
      "Observation",
      "Review",
      "Event",
      "Rule",
      "Case / Decision",
      "Approval",
      "Audit",
    ]);
  });

  it("keeps decorative motion elements out of the accessibility tree", () => {
    const { container } = render(<PipelineHero />);
    expect(container.querySelector(".pipe-packet")?.closest("[aria-hidden='true']")).not.toBeNull();
    for (const link of container.querySelectorAll(".pipe-link")) {
      expect(link).toHaveAttribute("aria-hidden", "true");
    }
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
    expect(container.querySelector(".sr-only")).toHaveTextContent("1.000");
    expect(digits(container)).toHaveTextContent("1.000");
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
    expect(digits(container)).toHaveTextContent("9");
    expect(container.querySelector(".sr-only")).toHaveTextContent("9");
  });

  describe("with IntersectionObserver and no motion preference", () => {
    let trigger: (isIntersecting: boolean) => void;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
            trigger = (isIntersecting) => callback([{ isIntersecting }]);
          }
          observe = vi.fn();
          disconnect = vi.fn();
        },
      );
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    });

    it("starts at zero, counts up on intersection and always keeps the final value for screen readers", () => {
      const { container } = render(<CountUp value={3} />);
      expect(digits(container)).toHaveTextContent("0");
      expect(container.querySelector(".sr-only")).toHaveTextContent("3");

      act(() => trigger(false));
      expect(digits(container)).toHaveTextContent("0");

      act(() => trigger(true));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(digits(container)).toHaveTextContent("3");
      expect(container.querySelector(".sr-only")).toHaveTextContent("3");
    });
  });
});

describe("Stats", () => {
  it("shows four figures with the evaluation qualifier linking to the method doc", () => {
    render(<Stats packCount={3} lensCount={3} stageCount={9} />);
    expect(screen.getAllByRole("definition")).toHaveLength(4);
    expect(screen.getByText(/evaluation score on synthetic fixtures/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "how it is measured" })).toHaveAttribute(
      "href",
      "https://github.com/shekibahmed/operations-intelligence-workbench/blob/main/docs/EVALUATION.md",
    );
  });
});
