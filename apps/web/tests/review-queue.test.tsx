import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Entity, Observation } from "@oiw/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ReviewQueuePanel,
  type ReviewQueueEntry,
} from "@/app/w/[workspace]/review/ReviewQueuePanel";
import type { PackLabels } from "@/lib/pack-labels";

const acceptObservation = vi.fn();
const correctObservation = vi.fn();
const rejectObservation = vi.fn();
const markInsufficientEvidence = vi.fn();
const linkEntityAction = vi.fn();
const createEntityAction = vi.fn();
const addReviewerNote = vi.fn();
const getObservationRevisions = vi.fn();
const getObservationNotes = vi.fn();

vi.mock("@/app/w/[workspace]/review/actions", () => ({
  acceptObservation: (...args: unknown[]) => acceptObservation(...args),
  correctObservation: (...args: unknown[]) => correctObservation(...args),
  rejectObservation: (...args: unknown[]) => rejectObservation(...args),
  markInsufficientEvidence: (...args: unknown[]) => markInsufficientEvidence(...args),
  linkEntityAction: (...args: unknown[]) => linkEntityAction(...args),
  createEntityAction: (...args: unknown[]) => createEntityAction(...args),
  addReviewerNote: (...args: unknown[]) => addReviewerNote(...args),
  getObservationRevisions: (...args: unknown[]) => getObservationRevisions(...args),
  getObservationNotes: (...args: unknown[]) => getObservationNotes(...args),
}));

const LABELS: PackLabels = {
  packId: "asset-reliability",
  packName: "Asset Reliability",
  packDescription: "Test pack",
  entityTypes: { asset: { singular: "Asset", plural: "Assets" } },
  eventTypes: {},
  signalTypes: {},
  caseTypes: {},
  actionTypes: {},
  decisionTypes: {},
  workflowStates: {},
};

const ENTITY_TYPES = [{ id: "asset", displayName: "Asset" }];

function entity(overrides: Partial<Entity>): Entity {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    workspaceId: "workspace-1",
    entityType: "asset",
    displayName: "A-140",
    externalReference: "A-140",
    aliases: [],
    attributes: {},
    status: "operational",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPanel(entries: ReviewQueueEntry[], entities: Entity[] = [entity({})]) {
  return render(
    <ReviewQueuePanel workspace="demo-asset-reliability" entries={entries} entities={entities} entityTypes={ENTITY_TYPES} labels={LABELS} />,
  );
}

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
    renderPanel([textRangeEntry()]);

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
    renderPanel([entry]);

    expect(screen.getByText("Page 3")).toBeInTheDocument();
    expect(screen.getByText("Inspection notes for A-142")).toBeInTheDocument();
  });

  it("Accept commits the proposed value, records the reviewer and advances to the empty state on the last item", async () => {
    acceptObservation.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "accepted" }) });
    renderPanel([textRangeEntry()]);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(acceptObservation).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String)));
    await waitFor(() => expect(screen.getByText("Review queue is clear")).toBeInTheDocument());
  });

  it("Correct requires a non-empty value and submits the typed correction", async () => {
    correctObservation.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "corrected" }) });
    renderPanel([textRangeEntry()]);

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
    renderPanel([textRangeEntry()]);

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
    renderPanel([textRangeEntry()]);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(rejectObservation).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String)));
  });

  it("selecting an alternative candidate accepts that candidate's value and confidence", async () => {
    acceptObservation.mockResolvedValue({ ok: true, observation: baseObservation({ reviewStatus: "accepted" }) });
    const entry = textRangeEntry({
      alternativeCandidates: [{ value: "AR-1024", confidence: 0.4 }],
    });
    renderPanel([entry]);

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
    renderPanel([textRangeEntry()]);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not save this review action."));
    expect(screen.queryByText("Review queue is clear")).not.toBeInTheDocument();
    expect(screen.getByText("previous-repair-reference")).toBeInTheDocument();
  });

  it("Link entity searches the workspace's entities and links the selected one without advancing the queue", async () => {
    const linkedEntityId = "44444444-4444-4444-8444-444444444444";
    linkEntityAction.mockResolvedValue({ ok: true, observation: baseObservation({ entityId: linkedEntityId }) });
    renderPanel([textRangeEntry()], [entity({ id: linkedEntityId }), entity({ id: "other", displayName: "L-01", entityType: "asset", externalReference: "L-01" })]);

    fireEvent.click(screen.getByRole("button", { name: "Link entity" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Search entities"), { target: { value: "A-140" } });
    expect(within(dialog).queryByRole("radio", { name: /L-01/ })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("radio", { name: /A-140/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Link" }));

    await waitFor(() => expect(linkEntityAction).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String), linkedEntityId));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("A-140 (Asset)")).toBeInTheDocument();
    expect(screen.getByText("previous-repair-reference")).toBeInTheDocument();
  });

  it("Create entity requires a display name, then creates and links a new entity without advancing the queue", async () => {
    const createdId = "55555555-5555-4555-8555-555555555555";
    createEntityAction.mockResolvedValue({
      ok: true,
      observation: baseObservation({ entityId: createdId }),
      entity: entity({ id: createdId, displayName: "New Pump", externalReference: null }),
    });
    renderPanel([textRangeEntry()], []);

    fireEvent.click(screen.getByRole("button", { name: "Create entity" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create and link" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a display name");
    expect(createEntityAction).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText("Display name"), { target: { value: "New Pump" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create and link" }));

    await waitFor(() =>
      expect(createEntityAction).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String), {
        entityType: "asset",
        displayName: "New Pump",
        externalReference: "",
      }),
    );
    await waitFor(() => expect(screen.getByText("New Pump (Asset)")).toBeInTheDocument());
    expect(screen.getByText("previous-repair-reference")).toBeInTheDocument();
  });

  it("Add reviewer note persists free text without advancing the queue and surfaces it in the history panel", async () => {
    getObservationRevisions.mockResolvedValue([]);
    getObservationNotes.mockResolvedValue([]);
    addReviewerNote.mockResolvedValue({
      ok: true,
      note: {
        id: "note-1",
        workspaceId: "workspace-1",
        occurredAt: "2026-05-18T09:20:00.000Z",
        action: "observation-note-added",
        actor: { type: "human", id: "guest-1" },
        subject: { type: "observation", id: "11111111-1111-4111-8111-111111111111" },
        cause: "Waiting on parts",
        data: {},
        previousEntryHash: null,
        entryHash: "hash",
      },
    });
    renderPanel([textRangeEntry()]);

    fireEvent.click(screen.getByRole("button", { name: "View history" }));
    await waitFor(() => expect(getObservationNotes).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String)));
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add reviewer note" }));
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(addReviewerNote).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a note before saving.");

    fireEvent.change(screen.getByLabelText("Reviewer note"), { target: { value: "Waiting on parts" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() =>
      expect(addReviewerNote).toHaveBeenCalledWith("demo-asset-reliability", expect.any(String), "Waiting on parts"),
    );
    await waitFor(() => expect(screen.getByText(/Waiting on parts/)).toBeInTheDocument());
    expect(screen.getByText("previous-repair-reference")).toBeInTheDocument();
  });
});
