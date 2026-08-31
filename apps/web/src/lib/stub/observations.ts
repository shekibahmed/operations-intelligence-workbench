import type { Observation } from "@oiw/contracts";

import { artifactIds, entityIds, observationIds, segmentIds } from "@/lib/stub/ids";

const maintenanceActionObservationId = "9d5f5a2e-7c8b-5a3e-8f1a-2c9b6d4e1a70";

const extractor = { id: "fixture-intelligence-provider", version: "1.0.0" } as const;

export const stubObservations: Observation[] = [
  {
    id: observationIds.assetId,
    artifactId: artifactIds.informal,
    entityId: entityIds.assetPrimary,
    schemaKey: "asset-id",
    value: "AR-1042",
    normalisedValue: "AR-1042",
    derivation: "machine",
    evidenceStatus: "supported",
    evidenceSegmentId: segmentIds.informalAsset,
    confidence: 0.62,
    extractor,
    insufficiencyReason: null,
    reviewStatus: "pending",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-08-31T09:13:05.000Z",
  },
  {
    id: observationIds.symptom,
    artifactId: artifactIds.informal,
    entityId: entityIds.assetPrimary,
    schemaKey: "symptom",
    value: "grinding noise, brake assembly",
    normalisedValue: "grinding-noise",
    derivation: "machine",
    evidenceStatus: "supported",
    evidenceSegmentId: segmentIds.informalSymptom,
    confidence: 0.91,
    extractor,
    insufficiencyReason: null,
    reviewStatus: "not-required",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-08-31T09:13:05.000Z",
  },
  {
    id: observationIds.severity,
    artifactId: artifactIds.informal,
    entityId: entityIds.assetPrimary,
    schemaKey: "severity-suggestion",
    value: "critical",
    normalisedValue: "critical",
    derivation: "machine",
    evidenceStatus: "supported",
    evidenceSegmentId: segmentIds.informalSymptom,
    confidence: 0.88,
    extractor,
    insufficiencyReason: null,
    reviewStatus: "not-required",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-08-31T09:13:05.000Z",
  },
  {
    id: maintenanceActionObservationId,
    artifactId: artifactIds.maintenance,
    entityId: entityIds.assetPrimary,
    schemaKey: "maintenance-action",
    value: "replaced-pad",
    normalisedValue: "replaced-pad",
    derivation: "machine",
    evidenceStatus: "supported",
    evidenceSegmentId: segmentIds.maintenanceRow,
    confidence: 0.99,
    extractor,
    insufficiencyReason: null,
    reviewStatus: "not-required",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-08-31T09:06:10.000Z",
  },
  {
    id: observationIds.condition,
    artifactId: artifactIds.inspection,
    entityId: entityIds.assetPrimary,
    schemaKey: "operating-condition",
    value: null,
    normalisedValue: null,
    derivation: "machine",
    evidenceStatus: "insufficient-evidence",
    evidenceSegmentId: null,
    confidence: 0.21,
    extractor,
    insufficiencyReason: "No operating-condition indicator found in the inspected text.",
    reviewStatus: "not-required",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-08-31T09:19:10.000Z",
  },
];

export const maintenanceActionObservation = maintenanceActionObservationId;

export function findObservationById(id: string): Observation | undefined {
  return stubObservations.find((observation) => observation.id === id);
}

/**
 * Review Queue detail (UX_SPEC §5.6) needs an alternative candidate and raw
 * excerpt alongside the Observation contract, which are review-workflow
 * concerns not modelled in `packages/contracts`. Kept local to `apps/web`.
 */
export interface ReviewQueueItem {
  observation: Observation;
  rawExcerpt: string;
  alternativeCandidate: string | null;
}

export const stubReviewQueue: ReviewQueueItem[] = [
  {
    observation: stubObservations[0]!,
    rawExcerpt: "the brake assembly on unit AR-1042 is making a grinding noise",
    alternativeCandidate: "AR-1024",
  },
];
