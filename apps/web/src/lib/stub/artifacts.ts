import type { Artifact, ArtifactSegment, Source } from "@oiw/contracts";

import { artifactChecksums, artifactIds, segmentIds, sourceIds, workspaceId } from "@/lib/stub/ids";

export const stubSources: Source[] = [
  {
    id: sourceIds.informal,
    workspaceId,
    sourceType: "message-channel",
    name: "Field report channel",
    configuration: {},
    createdAt: "2026-08-31T08:00:00.000Z",
  },
  {
    id: sourceIds.maintenance,
    workspaceId,
    sourceType: "maintenance-export",
    name: "Maintenance system export",
    configuration: {},
    createdAt: "2026-08-31T08:00:00.000Z",
  },
  {
    id: sourceIds.inspection,
    workspaceId,
    sourceType: "document-upload",
    name: "Inspection document intake",
    configuration: {},
    createdAt: "2026-08-31T08:00:00.000Z",
  },
];

export const stubArtifacts: Artifact[] = [
  {
    id: artifactIds.informal,
    workspaceId,
    sourceId: sourceIds.informal,
    artifactType: "field-message",
    mimeType: "text/plain",
    receivedAt: "2026-08-31T09:12:00.000Z",
    occurredAt: "2026-08-31T09:10:00.000Z",
    rawReference: "fixtures/asset-reliability/field-message-0091.txt",
    rawText:
      "Operator note: the brake assembly on unit AR-1042 is making a grinding noise on the north loop, flagged for review before next shift.",
    checksum: artifactChecksums.informal,
    metadata: { channel: "radio-log" },
    processingStatus: "received",
  },
  {
    id: artifactIds.maintenance,
    workspaceId,
    sourceId: sourceIds.maintenance,
    artifactType: "maintenance-record",
    mimeType: "text/csv",
    receivedAt: "2026-08-31T09:05:00.000Z",
    occurredAt: "2026-08-15T14:00:00.000Z",
    rawReference: "fixtures/asset-reliability/maintenance-0044.csv",
    rawText: "asset_id,component,action,performed_at\nAR-1042,brake-assembly,replaced-pad,2026-08-15T14:00:00Z",
    checksum: artifactChecksums.maintenance,
    metadata: {},
    processingStatus: "processed",
  },
  {
    id: artifactIds.inspection,
    workspaceId,
    sourceId: sourceIds.inspection,
    artifactType: "inspection-report",
    mimeType: "application/pdf",
    receivedAt: "2026-08-31T09:18:00.000Z",
    occurredAt: "2026-08-30T16:00:00.000Z",
    rawReference: "fixtures/asset-reliability/inspection-0017.pdf",
    rawText: "Inspection notes: component wear observed on brake assembly, north loop units, recommend follow-up.",
    checksum: artifactChecksums.inspection,
    metadata: { pageCount: 3 },
    processingStatus: "processed",
  },
  {
    id: artifactIds.sensor,
    workspaceId,
    sourceId: sourceIds.maintenance,
    artifactType: "sensor-export",
    mimeType: "text/csv",
    receivedAt: "2026-08-31T09:25:00.000Z",
    occurredAt: null,
    rawReference: "fixtures/asset-reliability/sensor-0003.csv",
    rawText: null,
    checksum: artifactChecksums.sensor,
    metadata: {},
    processingStatus: "received",
  },
];

export const stubArtifactSegments: ArtifactSegment[] = [
  {
    id: segmentIds.informalAsset,
    artifactId: artifactIds.informal,
    locator: { kind: "text-range", start: 46, end: 53 },
    excerpt: "AR-1042",
    checksum: null,
    createdAt: "2026-08-31T09:13:00.000Z",
  },
  {
    id: segmentIds.informalSymptom,
    artifactId: artifactIds.informal,
    locator: { kind: "text-range", start: 20, end: 55 },
    excerpt: "brake assembly on unit AR-1042 is making a grinding noise",
    checksum: null,
    createdAt: "2026-08-31T09:13:00.000Z",
  },
  {
    id: segmentIds.maintenanceRow,
    artifactId: artifactIds.maintenance,
    locator: { kind: "table-cell", row: 1, column: "component" },
    excerpt: "AR-1042,brake-assembly,replaced-pad,2026-08-15T14:00:00Z",
    checksum: null,
    createdAt: "2026-08-31T09:06:00.000Z",
  },
  {
    id: segmentIds.inspectionPage,
    artifactId: artifactIds.inspection,
    locator: { kind: "page", page: 2 },
    excerpt: "component wear observed on brake assembly, north loop units",
    checksum: null,
    createdAt: "2026-08-31T09:19:00.000Z",
  },
];

export function findArtifactById(id: string): Artifact | undefined {
  return stubArtifacts.find((artifact) => artifact.id === id);
}

export function findSegmentById(id: string | null): ArtifactSegment | undefined {
  if (id === null) return undefined;
  return stubArtifactSegments.find((segment) => segment.id === id);
}

export function segmentsForArtifact(artifactId: string): ArtifactSegment[] {
  return stubArtifactSegments.filter((segment) => segment.artifactId === artifactId);
}
