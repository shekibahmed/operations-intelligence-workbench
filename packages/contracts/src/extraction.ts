import { z } from "zod";

import {
  ChecksumSchema,
  JsonValueSchema,
  SlugSchema,
  TimestampSchema,
  VersionSchema,
} from "./common.js";
import { ArtifactSegmentLocatorSchema } from "./domain.js";

export const ExtractionEvidenceSchema = z
  .object({
    locator: ArtifactSegmentLocatorSchema,
    excerpt: z.string().min(1),
  })
  .strict();

const ExtractedValueSchema = z
  .object({
    status: z.literal("extracted"),
    schemaKey: SlugSchema,
    value: JsonValueSchema,
    normalisedValue: JsonValueSchema.nullable(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(ExtractionEvidenceSchema).min(1),
  })
  .strict();

const InsufficientEvidenceSchema = z
  .object({
    status: z.literal("insufficient-evidence"),
    schemaKey: SlugSchema,
    value: z.null(),
    normalisedValue: z.null(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(ExtractionEvidenceSchema),
    reason: z.string().min(1),
  })
  .strict();

export const ProposedObservationSchema = z.discriminatedUnion("status", [
  ExtractedValueSchema,
  InsufficientEvidenceSchema,
]);

export const ProviderMetadataSchema = z
  .object({
    providerId: SlugSchema,
    providerVersion: VersionSchema,
    model: z.string().min(1).nullable(),
    deterministic: z.boolean(),
  })
  .strict();

export const ProcessingTraceSchema = z
  .object({
    startedAt: TimestampSchema,
    completedAt: TimestampSchema,
    durationMs: z.number().int().nonnegative(),
    steps: z.array(
      z
        .object({
          name: SlugSchema,
          status: z.enum(["completed", "warning", "failed"]),
          detail: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

export const ExtractionResultSchema = z
  .object({
    artifactChecksum: ChecksumSchema,
    observations: z.array(ProposedObservationSchema),
    warnings: z.array(
      z
        .object({
          code: SlugSchema,
          message: z.string().min(1),
        })
        .strict(),
    ),
    provider: ProviderMetadataSchema,
    processingTrace: ProcessingTraceSchema,
  })
  .strict();

export const ExtractionRequestSchema = z
  .object({
    artifact: z
      .object({
        checksum: ChecksumSchema,
        artifactType: SlugSchema,
        mimeType: z.string().min(1),
        rawText: z.string().nullable(),
        rawReference: z.string().min(1),
        metadata: z.record(z.string(), JsonValueSchema),
      })
      .strict(),
    observationSchema: z.record(z.string(), JsonValueSchema),
    context: z
      .object({
        packId: SlugSchema,
        packVersion: VersionSchema,
        locale: z.string().min(2),
        values: z.record(z.string(), JsonValueSchema),
      })
      .strict(),
  })
  .strict();

export const ClassificationRequestSchema = z
  .object({
    artifactChecksum: ChecksumSchema,
    labels: z.array(SlugSchema).min(1),
    context: z.record(z.string(), JsonValueSchema),
  })
  .strict();

export const ClassificationResultSchema = z
  .object({
    label: SlugSchema.nullable(),
    confidence: z.number().min(0).max(1),
    status: z.enum(["classified", "insufficient-evidence"]),
    reason: z.string().min(1),
    provider: ProviderMetadataSchema,
  })
  .strict();

export const SummaryRequestSchema = z
  .object({
    artifactChecksum: ChecksumSchema,
    purpose: z.string().min(1),
    context: z.record(z.string(), JsonValueSchema),
  })
  .strict();

export const SummaryResultSchema = z
  .object({
    summary: z.string().min(1).nullable(),
    evidence: z.array(ExtractionEvidenceSchema),
    status: z.enum(["summarised", "insufficient-evidence"]),
    provider: ProviderMetadataSchema,
  })
  .strict();

export type ProposedObservation = z.infer<typeof ProposedObservationSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type ExtractionRequest = z.infer<typeof ExtractionRequestSchema>;
export type ClassificationRequest = z.infer<typeof ClassificationRequestSchema>;
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;
export type SummaryRequest = z.infer<typeof SummaryRequestSchema>;
export type SummaryResult = z.infer<typeof SummaryResultSchema>;
