import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { LensSwitcher } from "@/components/shell/LensSwitcher";
import { defaultLensForSection, isLens } from "@/lib/lens";

describe("lens helpers", () => {
  it("recognises only the three valid lens values", () => {
    expect(isLens("leadership")).toBe(true);
    expect(isLens("operations")).toBe(true);
    expect(isLens("technical")).toBe(true);
    expect(isLens("marketing")).toBe(false);
    expect(isLens(null)).toBe(false);
    expect(isLens(undefined)).toBe(false);
  });

  it("maps each workspace section to its UX_SPEC §1.3 default lens", () => {
    expect(defaultLensForSection("overview")).toBe("leadership");
    expect(defaultLensForSection("inbox")).toBe("operations");
    expect(defaultLensForSection("review")).toBe("operations");
    expect(defaultLensForSection("cases")).toBe("operations");
    expect(defaultLensForSection("technical-artifact")).toBe("technical");
    expect(defaultLensForSection("audit")).toBe("technical");
  });

  it("Decisions has no single primary lens (resolved via last-visited lens instead)", () => {
    expect(defaultLensForSection("decisions")).toBeNull();
  });
});

describe("LensSwitcher", () => {
  it("renders a radiogroup with the active lens checked", () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("lens=operations") as never);

    render(<LensSwitcher activeLens="operations" />);

    const group = screen.getByRole("radiogroup", { name: "Lens" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Operations" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Leadership" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Technical" })).toHaveAttribute("aria-checked", "false");
  });

  it("switching lenses replaces the route in place (same pathname, new lens param) without navigating away", async () => {
    const replace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as never);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("lens=leadership") as never);

    render(<LensSwitcher activeLens="leadership" />);
    await userEvent.click(screen.getByRole("radio", { name: "Technical" }));

    expect(replace).toHaveBeenCalledTimes(1);
    const [href, options] = replace.mock.calls[0] as [string, { scroll: boolean }];
    expect(href).toContain("lens=technical");
    expect(options).toEqual({ scroll: false });
  });
});
