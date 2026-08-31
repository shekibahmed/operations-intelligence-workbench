import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Observation } from "@oiw/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ReviewQueuePanel,
  type ReviewQueueEntry,
} from "@/app/w/[workspace]/review/ReviewQueuePanel";

const acceptObservation = vi.fn();
const correctObservation = vi.fn();
const rejectObservation = vi.fn();
const markInsufficientEvidence = vi.fn();
const getObservationRevisions = vi.fn();

vi.mock("@/app/w/[workspace]/review/actions", () => ({
  acceptObservation: (...args: unknown[]) => acceptObservation(...args),
  correctObservation: (...args: unknown[]) => correctObservation(...args),
  rejectObservation: (...args: unknown[]) => rejectObservation(...args),
  markInsufficientEvidence: (...args: unknown[]) => markInsufficientEvidence(...args),
  getObservationRevisions: (...args: unknown[]) => getObservationRevisions(...args),
}));

function baseObservation(overrides: Partial<Observation>): Observation {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    artifactId: "22222222-2222-4222-8222-222222222222",
    entityId: null,
    schemaKey: "previous-repair-reference",
    value: "brake work done in spring",
    normalisedValue: "brake work done in spring",
    derivation: "machine",
    evidenceStatus: "supported",
    evidenceSegmentId: "33333333-3333-4333-8333-333333333333",
    confidence: 0.7,
    extractor: { id: "fixture-intelligence-provider", version: "1.0.0" },
    insufficiencyReason: null,
    reviewStatus: "pending",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-05-18T09:14:00.000Z",
    ...overrides,
  };
}

const RAW_TEXT = "it had brake work done back in the spring so figured someone should take a look";
const EVIDENCE_EXCERPT = "brake work done back in the spring";
const EVIDENCE_START = RAW_TEXT.indexOf(EVIDENCE_EXCERPT);
const EVIDENCE_END = EVIDENCE_START + EVIDENCE_EXCERPT.length;

function textRangeEntry(overrides: Partial<Observation> = {}): ReviewQueueEntry {
  return {
    observation: baseObservation(overrides),
    valueType: "string",
    rawText: RAW_TEXT,
    evidence: {
      kind: "text-range",
      label: `Characters ${EVIDENCE_START}–${EVIDENCE_END}`,
      excerpt: EVIDENCE_EXCERPT,
      textRange: { start: EVIDENCE_START, end: EVIDENCE_END },
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ReviewQueuePanel", () => {
  it("highlights the evidence span inside the raw source via <mark>, not colour alone", () => {
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[textRangeEntry()]} />);

    const mark = screen.getByText(EVIDENCE_EXCERPT);
    expect(mark.tagName).toBe("MARK");
  });

  it("renders a labelled-context block (not a text-range slice) for a page/table-cell/json-path locator", () => {
    const entry: ReviewQueueEntry = {
      observation: baseObservation({}),
      valueType: "string",
      rawText: null,
      evidence: { kind: "page", label: "Page 3", excerpt: "Inspection notes for A-142", textRange: null },
    };
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[entry]} />);

    expect(screen.getByText("Page 3")).toBeInTheDocument();
    expect(screen.getByText("Inspection notes for A-142")).toBeInTheDocument();
  });

  it("Accept commits the proposed value, records the reviewer and advances to the empty state on the last item", async () => {
    acceptObservation.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "accepted" }) });
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[textRangeEntry()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(acceptObservation).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String)));
    await waitFor(() => expect(screen.getByText("Review queue is clear")).toBeInTheDocument());
  });

  it("Correct requires a non-empty value and submits the typed correction", async () => {
    correctObservation.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "corrected" }) });
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[textRangeEntry()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Correct" }));
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));
    expect(correctObservation).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a corrected value");

    fireEvent.change(screen.getByLabelText(/Corrected value/), { target: { value: "work order WO-4471" } });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() =>
      expect(correctObservation).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String), "work order WO-4471"),
    );
  });

  it("Mark insufficient evidence requires a reason before submitting", async () => {
    markInsufficientEvidence.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "corrected" }) });
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[textRangeEntry()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Mark insufficient evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(markInsufficientEvidence).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Reason evidence is insufficient/), { target: { value: "No repair reference is present in this message." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(markInsufficientEvidence).toHaveBeenCalledWith(
        "demo-asset-reliability",
        expect.any(String),
        "No repair reference is present in this message.",
      ),
    );
  });

  it("Reject records the outcome without requiring extra input", async () => {
    rejectObservation.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "rejected" }) });
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[textRangeEntry()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(rejectObservation).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String)));
  });

  it("selecting an alternative candidate accepts that candidate's value and confidence", async () => {
    acceptObservation.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "accepted" }) });
    const entry = textRangeEntry({
      alternativeCandidates: [{ value: "AR-1024", confidence: 0.4 }],
    });
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[entry]} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept this candidate" }));

    await waitFor(() =>
      expect(acceptObservation).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String), {
        value: "AR-1024",
        normalisedValue: "AR-1024",
        confidence: 0.4,
      }),
    );
  });

  it("keeps the item selected and preserves the failed action's error instead of discarding it", async () => {
    acceptObservation.mockResolvedValue({ ok: false, message: "Could not save this review action." });
    render(<ReviewQueuePanel workspace="demo-asset-reliability" entries={[textRangeEntry()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not save this review action."));
    expect(screen.queryByText("Review queue is clear")).not.toBeInTheDocument();
    expect(screen.getByText("previous-repair-reference")).toBeInTheDocument();
  });
});
