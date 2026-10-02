import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { projectCapture, saveRecording } from "./capture.js";

import { exportsInput } from "./capture-fixture.js";

describe("casebook capture export boundary", () => {
  it("preserves the observed aggregate and outstanding work while removing private identifiers", () => {
    const result = projectCapture(exportsInput());
    expect(result.rule.relatedEventCount).toBe(4);
    expect(result.proposal.status).toBe("awaiting-approval");
    expect(result.approval.decisionRef).toBe(result.proposal.ref);
    expect(result.case.status).toBe("open");
    expect(result.case.actionItems[0]?.status).toBe("open");
    expect(JSON.stringify(result)).not.toMatch(/workspace-private|session-private|decision-private|case-private|event-private/);
  });

  it.each(["approval", "review", "reference"])("rejects missing or inconsistent %s evidence", (broken) => {
    const input = exportsInput();
    if (broken === "approval") input.final.records[0]!.approvals = [];
    if (broken === "review") input.audit.records = input.audit.records.filter((entry) => entry.action !== "observation-accepted");
    if (broken === "reference") input.final.records[0]!.approvals[0]!.decisionId = "another-decision";
    expect(() => projectCapture(input)).toThrow();
  });

  it("requires the real UI comment gate and matching displayed rule aggregate", () => {
    const input = exportsInput();
    input.stages.commentRequired = false;
    expect(() => projectCapture(input)).toThrow(/comment/i);
    input.stages.commentRequired = true;
    input.stages.aggregateValue = 2;
    expect(() => projectCapture(input)).toThrow(/aggregate/i);
  });

  it("preserves a prior recording when export validation fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oiw-casebook-proof-"));
    const destination = join(directory, "recording.json");
    try {
      await writeFile(destination, "previous validated recording\n");
      const input = exportsInput();
      input.audit.records = [];
      await expect(saveRecording(destination, input, { sourceRevision: "a".repeat(40) })).rejects.toThrow();
      expect(await readFile(destination, "utf8")).toBe("previous validated recording\n");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
