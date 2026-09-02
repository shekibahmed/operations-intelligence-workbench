import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { WorkspaceExportService, type ExportRepositories } from "@oiw/application";
import type { Case } from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { CsvAdapter } from "../../packages/ingestion/src/index.js";

const workspaceId = "10000000-0000-4000-8000-000000000001";
const timestamp = "2026-09-02T00:00:00.000Z";
const fixturePaths = [
  "scenario-packs/asset-reliability/fixtures/edge-cases/artifacts/asset-reliability-edge-017.csv",
  "scenario-packs/process-exceptions/fixtures/edge-cases/artifacts/process-exceptions-edge-013.csv",
  "scenario-packs/document-assurance/fixtures/edge-cases/artifacts/document-assurance-edge-013.csv",
] as const;

function exportRepositories(caseRecord: Case): ExportRepositories {
  const empty = { list: async () => [] };
  return {
    cases: { list: async () => [caseRecord] },
    signals: empty,
    actionItems: empty,
    decisions: empty,
    approvals: empty,
    auditEntries: empty,
  };
}

describe("OIW-805 formula fixtures at the OIW-811 export boundary", () => {
  it.each(fixturePaths)("neutralises the extracted formula cell from %s", async (fixturePath) => {
    const raw = await readFile(resolve(process.cwd(), fixturePath), "utf8");
    const formulaCell = new CsvAdapter()
      .segment(raw)
      .map(({ excerpt }) => excerpt)
      .find((value) => value.startsWith("=HYPERLINK"));
    expect(formulaCell).toBeDefined();

    const caseRecord: Case = {
      id: "20000000-0000-4000-8000-000000000001",
      workspaceId,
      caseType: "test-case",
      title: formulaCell!,
      status: "open",
      priority: "medium",
      severity: "medium",
      owner: null,
      dueAt: null,
      relatedEntityIds: [],
      relatedEventIds: [],
      relatedSignalIds: [],
      closureRequirementIds: [],
      reEvaluationStatus: "current",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const document = await new WorkspaceExportService(exportRepositories(caseRecord)).exportCases(
      workspaceId,
      "csv",
    );
    const csv = [...document.chunks].join("");

    expect(csv).toContain(`"'${formulaCell!.replaceAll('"', '""')}"`);
    expect(csv).not.toContain(`,"${formulaCell!.replaceAll('"', '""')}",`);
  });
});
