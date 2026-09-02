import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExportControls } from "@/app/w/[workspace]/ExportControls";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ExportControls", () => {
  it("shows a keyboard-accessible rate-limit error without navigating away", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Too many requests. Try again in 5 seconds." }, { status: 429 }),
      ),
    );
    render(<ExportControls workspace="synthetic-workspace" dataset="cases" />);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: "Export cases as CSV" });
    button.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Too many requests. Try again in 5 seconds.");
    });
    expect(window.location.pathname).toBe("/");
  });
});
