import {
  ActionItemSchema,
  ApprovalSchema,
  ArtifactSchema,
  ArtifactSegmentSchema,
  AuditEntrySchema,
  CaseSchema,
  DecisionSchema,
  EntitySchema,
  ObservationSchema,
  OperationalEventSchema,
  SignalSchema,
  SourceSchema,
  WorkspaceSchema,
} from "@oiw/contracts";
import type {
  ActionItem,
  Approval,
  Artifact,
  ArtifactSegment,
  AuditEntry,
  Case,
  Decision,
  Entity,
  Observation,
  OperationalEvent,
  Signal,
  Source,
  Workspace,
} from "@oiw/contracts";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { PersistenceDatabase } from "./database.js";
import type { PersistenceRepositories, ScopedRepository } from "./repositories.js";
import {
  actionItemEvidenceSegments,
  actionItems,
  approvals,
  artifactSegments,
  artifacts,
  auditEntries,
  caseEntities,
  caseEvents,
  cases,
  caseSignals,
  decisionEvidenceSegments,
  decisions,
  entities,
  eventEntities,
  eventObservations,
  observations,
  observationRevisions,
  operationalEvents,
  signalEvents,
  signalEvidenceSegments,
  signals,
  sources,
  workspaces,
} from "./schema.js";

interface RuntimeSchema<T> {
  parse(value: unknown): T;
}

function validate<T>(schema: RuntimeSchema<T>, value: unknown): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return schema.parse(value);
  }

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (key.endsWith("At") && typeof entry === "string") {
        return [key, new Date(entry).toISOString()];
      }
      return [key, entry];
    }),
  );
  return schema.parse(normalized);
}

function requireWorkspace(workspaceId: string, value: { workspaceId: string }): void {
  if (workspaceId !== value.workspaceId) {
    throw new Error("Repository workspace scope does not match the record workspaceId");
  }
}

function requireIdentity(id: string, value: { id: string }): void {
  if (id !== value.id) {
    throw new Error("Repository record ID does not match the value ID");
  }
}

function first<T>(values: T[]): T | null {
  return values[0] ?? null;
}

function withoutWorkspaceId<T extends { workspaceId: string }>(
  value: T,
): Omit<T, "workspaceId"> {
  const copy: Partial<T> = { ...value };
  delete copy.workspaceId;
  return copy as Omit<T, "workspaceId">;
}

export function createPostgresRepositories(database: PersistenceDatabase): PersistenceRepositories {
  async function findWorkspace(workspaceId: string): Promise<Workspace | null> {
    const rows = await database
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const row = first(rows);
    return row === null ? null : validate(WorkspaceSchema, row);
  }

  async function findSource(workspaceId: string, id: string): Promise<Source | null> {
    const rows = await database
      .select()
      .from(sources)
      .where(and(eq(sources.workspaceId, workspaceId), eq(sources.id, id)))
      .limit(1);
    const row = first(rows);
    return row === null ? null : validate(SourceSchema, row);
  }

  async function listSources(workspaceId: string): Promise<Source[]> {
    const rows = await database
      .select()
      .from(sources)
      .where(eq(sources.workspaceId, workspaceId))
      .orderBy(asc(sources.createdAt), asc(sources.id));
    return rows.map((row) => validate(SourceSchema, row));
  }

  async function findArtifact(workspaceId: string, id: string): Promise<Artifact | null> {
    const rows = await database
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.workspaceId, workspaceId), eq(artifacts.id, id)))
      .limit(1);
    const row = first(rows);
    return row === null ? null : validate(ArtifactSchema, row);
  }

  async function listArtifacts(workspaceId: string): Promise<Artifact[]> {
    const rows = await database
      .select()
      .from(artifacts)
      .where(eq(artifacts.workspaceId, workspaceId))
      .orderBy(asc(artifacts.receivedAt), asc(artifacts.id));
    return rows.map((row) => validate(ArtifactSchema, row));
  }

  async function findArtifactSegment(
    workspaceId: string,
    id: string,
  ): Promise<ArtifactSegment | null> {
    const rows = await database
      .select()
      .from(artifactSegments)
      .where(and(eq(artifactSegments.workspaceId, workspaceId), eq(artifactSegments.id, id)))
      .limit(1);
    const row = first(rows);
    if (row === null) return null;
    return validate(ArtifactSegmentSchema, withoutWorkspaceId(row));
  }

  async function listArtifactSegments(
    workspaceId: string,
    artifactId?: string,
  ): Promise<ArtifactSegment[]> {
    const predicate =
      artifactId === undefined
        ? eq(artifactSegments.workspaceId, workspaceId)
        : and(
            eq(artifactSegments.workspaceId, workspaceId),
            eq(artifactSegments.artifactId, artifactId),
          );
    const rows = await database
      .select()
      .from(artifactSegments)
      .where(predicate)
      .orderBy(asc(artifactSegments.createdAt), asc(artifactSegments.id));
    return rows.map((row) => validate(ArtifactSegmentSchema, withoutWorkspaceId(row)));
  }

  async function findEntity(workspaceId: string, id: string): Promise<Entity | null> {
    const rows = await database
      .select()
      .from(entities)
      .where(and(eq(entities.workspaceId, workspaceId), eq(entities.id, id)))
      .limit(1);
    const row = first(rows);
    return row === null ? null : validate(EntitySchema, row);
  }

  async function listEntities(workspaceId: string): Promise<Entity[]> {
    const rows = await database
      .select()
      .from(entities)
      .where(eq(entities.workspaceId, workspaceId))
      .orderBy(asc(entities.createdAt), asc(entities.id));
    return rows.map((row) => validate(EntitySchema, row));
  }

  function observationFromRow(row: typeof observations.$inferSelect): Observation {
    const { alternativeCandidates } = row;
    const value = withoutWorkspaceId(row);
    delete (value as { alternativeCandidates?: unknown }).alternativeCandidates;
    return validate(ObservationSchema, {
      ...value,
      ...(alternativeCandidates === null ? {} : { alternativeCandidates }),
    });
  }

  async function findObservation(workspaceId: string, id: string): Promise<Observation | null> {
    const rows = await database
      .select()
      .from(observations)
      .where(and(eq(observations.workspaceId, workspaceId), eq(observations.id, id)))
      .limit(1);
    const row = first(rows);
    return row === null ? null : observationFromRow(row);
  }

  async function listObservations(workspaceId: string, artifactId?: string): Promise<Observation[]> {
    const predicate =
      artifactId === undefined
        ? eq(observations.workspaceId, workspaceId)
        : and(eq(observations.workspaceId, workspaceId), eq(observations.artifactId, artifactId));
    const rows = await database
      .select()
      .from(observations)
      .where(predicate)
      .orderBy(asc(observations.createdAt), asc(observations.id));
    return rows.map(observationFromRow);
  }

  async function listObservationRevisions(
    workspaceId: string,
    observationId: string,
  ): Promise<Observation[]> {
    const rows = await database
      .select({ snapshot: observationRevisions.snapshot })
      .from(observationRevisions)
      .where(
        and(
          eq(observationRevisions.workspaceId, workspaceId),
          eq(observationRevisions.observationId, observationId),
        ),
      )
      .orderBy(asc(observationRevisions.recordedAt), asc(observationRevisions.id));
    return rows.map(({ snapshot }) => validate(ObservationSchema, snapshot));
  }

  async function findOperationalEvent(
    workspaceId: string,
    id: string,
  ): Promise<OperationalEvent | null> {
    const rows = await database
      .select()
      .from(operationalEvents)
      .where(and(eq(operationalEvents.workspaceId, workspaceId), eq(operationalEvents.id, id)))
      .limit(1);
    const row = first(rows);
    if (row === null) return null;
    const [entityRows, observationRows] = await Promise.all([
      database
        .select({ id: eventEntities.entityId })
        .from(eventEntities)
        .where(and(eq(eventEntities.workspaceId, workspaceId), eq(eventEntities.eventId, id)))
        .orderBy(asc(eventEntities.entityId)),
      database
        .select({ id: eventObservations.observationId })
        .from(eventObservations)
        .where(and(eq(eventObservations.workspaceId, workspaceId), eq(eventObservations.eventId, id)))
        .orderBy(asc(eventObservations.observationId)),
    ]);
    return validate(OperationalEventSchema, {
      id: row.id,
      workspaceId: row.workspaceId,
      eventType: row.eventType,
      occurredAt: row.occurredAt,
      recordedAt: row.recordedAt,
      entityIds: entityRows.map(({ id: entityId }) => entityId),
      observationIds: observationRows.map(({ id: observationId }) => observationId),
      attributes: row.attributes,
      assembly: { assemblerId: row.assemblerId, assemblerVersion: row.assemblerVersion },
      reEvaluationStatus: row.reEvaluationStatus,
    });
  }

  async function listOperationalEvents(workspaceId: string): Promise<OperationalEvent[]> {
    const ids = await database
      .select({ id: operationalEvents.id })
      .from(operationalEvents)
      .where(eq(operationalEvents.workspaceId, workspaceId))
      .orderBy(asc(operationalEvents.recordedAt), asc(operationalEvents.id));
    return Promise.all(ids.map(async ({ id }) => (await findOperationalEvent(workspaceId, id))!));
  }

  async function findSignal(workspaceId: string, id: string): Promise<Signal | null> {
    const rows = await database
      .select()
      .from(signals)
      .where(and(eq(signals.workspaceId, workspaceId), eq(signals.id, id)))
      .limit(1);
    const row = first(rows);
    if (row === null) return null;
    const [eventRows, evidenceRows] = await Promise.all([
      database
        .select({ id: signalEvents.eventId })
        .from(signalEvents)
        .where(and(eq(signalEvents.workspaceId, workspaceId), eq(signalEvents.signalId, id)))
        .orderBy(asc(signalEvents.eventId)),
      database
        .select({ id: signalEvidenceSegments.artifactSegmentId })
        .from(signalEvidenceSegments)
        .where(
          and(
            eq(signalEvidenceSegments.workspaceId, workspaceId),
            eq(signalEvidenceSegments.signalId, id),
          ),
        )
        .orderBy(asc(signalEvidenceSegments.artifactSegmentId)),
    ]);
    return validate(SignalSchema, {
      id: row.id,
      workspaceId: row.workspaceId,
      signalType: row.signalType,
      severity: row.severity,
      eventIds: eventRows.map(({ id: eventId }) => eventId),
      evidenceSegmentIds: evidenceRows.map(({ id: evidenceId }) => evidenceId),
      rule: { id: row.ruleId, version: row.ruleVersion },
      rationale: row.rationale,
      createdAt: row.createdAt,
    });
  }

  async function listSignals(workspaceId: string): Promise<Signal[]> {
    const ids = await database
      .select({ id: signals.id })
      .from(signals)
      .where(eq(signals.workspaceId, workspaceId))
      .orderBy(asc(signals.createdAt), asc(signals.id));
    return Promise.all(ids.map(async ({ id }) => (await findSignal(workspaceId, id))!));
  }

  async function findCase(workspaceId: string, id: string): Promise<Case | null> {
    const rows = await database
      .select()
      .from(cases)
      .where(and(eq(cases.workspaceId, workspaceId), eq(cases.id, id)))
      .limit(1);
    const row = first(rows);
    if (row === null) return null;
    const [entityRows, eventRows, signalRows] = await Promise.all([
      database.select({ id: caseEntities.entityId }).from(caseEntities).where(and(eq(caseEntities.workspaceId, workspaceId), eq(caseEntities.caseId, id))).orderBy(asc(caseEntities.entityId)),
      database.select({ id: caseEvents.eventId }).from(caseEvents).where(and(eq(caseEvents.workspaceId, workspaceId), eq(caseEvents.caseId, id))).orderBy(asc(caseEvents.eventId)),
      database.select({ id: caseSignals.signalId }).from(caseSignals).where(and(eq(caseSignals.workspaceId, workspaceId), eq(caseSignals.caseId, id))).orderBy(asc(caseSignals.signalId)),
    ]);
    return validate(CaseSchema, {
      ...row,
      relatedEntityIds: entityRows.map(({ id: entityId }) => entityId),
      relatedEventIds: eventRows.map(({ id: eventId }) => eventId),
      relatedSignalIds: signalRows.map(({ id: signalId }) => signalId),
    });
  }

  async function listCases(workspaceId: string): Promise<Case[]> {
    const ids = await database.select({ id: cases.id }).from(cases).where(eq(cases.workspaceId, workspaceId)).orderBy(asc(cases.createdAt), asc(cases.id));
    return Promise.all(ids.map(async ({ id }) => (await findCase(workspaceId, id))!));
  }

  async function findActionItem(workspaceId: string, id: string): Promise<ActionItem | null> {
    const rows = await database.select().from(actionItems).where(and(eq(actionItems.workspaceId, workspaceId), eq(actionItems.id, id))).limit(1);
    const row = first(rows);
    if (row === null) return null;
    const evidenceRows = await database
      .select({ id: actionItemEvidenceSegments.artifactSegmentId })
      .from(actionItemEvidenceSegments)
      .where(and(eq(actionItemEvidenceSegments.workspaceId, workspaceId), eq(actionItemEvidenceSegments.actionItemId, id)))
      .orderBy(asc(actionItemEvidenceSegments.artifactSegmentId));
    return validate(ActionItemSchema, {
      ...row,
      completionEvidenceSegmentIds: evidenceRows.map(({ id: evidenceId }) => evidenceId),
    });
  }

  async function listActionItems(workspaceId: string): Promise<ActionItem[]> {
    const ids = await database.select({ id: actionItems.id }).from(actionItems).where(eq(actionItems.workspaceId, workspaceId)).orderBy(asc(actionItems.createdAt), asc(actionItems.id));
    return Promise.all(ids.map(async ({ id }) => (await findActionItem(workspaceId, id))!));
  }

  async function findDecision(workspaceId: string, id: string): Promise<Decision | null> {
    const rows = await database.select().from(decisions).where(and(eq(decisions.workspaceId, workspaceId), eq(decisions.id, id))).limit(1);
    const row = first(rows);
    if (row === null) return null;
    const evidenceRows = await database
      .select({ id: decisionEvidenceSegments.artifactSegmentId })
      .from(decisionEvidenceSegments)
      .where(and(eq(decisionEvidenceSegments.workspaceId, workspaceId), eq(decisionEvidenceSegments.decisionId, id)))
      .orderBy(asc(decisionEvidenceSegments.artifactSegmentId));
    return validate(DecisionSchema, {
      ...row,
      evidenceSegmentIds: evidenceRows.map(({ id: evidenceId }) => evidenceId),
    });
  }

  async function listDecisions(workspaceId: string): Promise<Decision[]> {
    const ids = await database.select({ id: decisions.id }).from(decisions).where(eq(decisions.workspaceId, workspaceId)).orderBy(asc(decisions.createdAt), asc(decisions.id));
    return Promise.all(ids.map(async ({ id }) => (await findDecision(workspaceId, id))!));
  }

  async function findApproval(workspaceId: string, id: string): Promise<Approval | null> {
    const rows = await database.select().from(approvals).where(and(eq(approvals.workspaceId, workspaceId), eq(approvals.id, id))).limit(1);
    const row = first(rows);
    return row === null ? null : validate(ApprovalSchema, row);
  }

  async function listApprovals(workspaceId: string): Promise<Approval[]> {
    const rows = await database.select().from(approvals).where(eq(approvals.workspaceId, workspaceId)).orderBy(asc(approvals.approvedAt), asc(approvals.id));
    return rows.map((row) => validate(ApprovalSchema, row));
  }

  async function findAuditEntry(workspaceId: string, id: string): Promise<AuditEntry | null> {
    const rows = await database.select().from(auditEntries).where(and(eq(auditEntries.workspaceId, workspaceId), eq(auditEntries.id, id))).limit(1);
    const row = first(rows);
    return row === null ? null : validate(AuditEntrySchema, row);
  }

  async function listAuditEntries(workspaceId: string): Promise<AuditEntry[]> {
    const rows = await database.select().from(auditEntries).where(eq(auditEntries.workspaceId, workspaceId)).orderBy(asc(auditEntries.occurredAt), asc(auditEntries.id));
    return rows.map((row) => validate(AuditEntrySchema, row));
  }

  const sourceRepository: ScopedRepository<Source> = {
    async insert(workspaceId, input) {
      const value = validate(SourceSchema, input);
      requireWorkspace(workspaceId, value);
      await database.insert(sources).values(value);
      return (await findSource(workspaceId, value.id))!;
    },
    findById: findSource,
    list: listSources,
  };

  return {
    workspaces: {
      async insert(input) {
        const value = validate(WorkspaceSchema, input);
        await database.insert(workspaces).values(value);
        return (await findWorkspace(value.id))!;
      },
      findById: findWorkspace,
      async update(workspaceId, input) {
        const value = validate(WorkspaceSchema, input);
        requireIdentity(workspaceId, value);
        await database
          .update(workspaces)
          .set({
            name: value.name,
            slug: value.slug,
            activePackId: value.activePackId,
            mode: value.mode,
            resetAt: value.resetAt,
            expiresAt: value.expiresAt,
          })
          .where(eq(workspaces.id, workspaceId));
        return findWorkspace(workspaceId);
      },
    },
    sources: sourceRepository,
    artifacts: {
      async insert(workspaceId, input) {
        const value = validate(ArtifactSchema, input);
        requireWorkspace(workspaceId, value);
        await database.insert(artifacts).values(value);
        return (await findArtifact(workspaceId, value.id))!;
      },
      findById: findArtifact,
      list: listArtifacts,
      async updateProcessingStatus(workspaceId, artifactId, processingStatus) {
        await database
          .update(artifacts)
          .set({ processingStatus })
          .where(and(eq(artifacts.workspaceId, workspaceId), eq(artifacts.id, artifactId)));
        return findArtifact(workspaceId, artifactId);
      },
    },
    artifactSegments: {
      async insert(workspaceId, input) {
        const value = validate(ArtifactSegmentSchema, input);
        await database.insert(artifactSegments).values({ ...value, workspaceId });
        return (await findArtifactSegment(workspaceId, value.id))!;
      },
      findById: findArtifactSegment,
      list: (workspaceId) => listArtifactSegments(workspaceId),
      listByArtifact: listArtifactSegments,
    },
    entities: {
      async insert(workspaceId, input) {
        const value = validate(EntitySchema, input);
        requireWorkspace(workspaceId, value);
        await database.insert(entities).values(value);
        return (await findEntity(workspaceId, value.id))!;
      },
      findById: findEntity,
      list: listEntities,
      async update(workspaceId, entityId, input) {
        const value = validate(EntitySchema, input);
        requireWorkspace(workspaceId, value);
        requireIdentity(entityId, value);
        await database.update(entities).set({
          entityType: value.entityType,
          displayName: value.displayName,
          externalReference: value.externalReference,
          aliases: value.aliases,
          attributes: value.attributes,
          status: value.status,
          updatedAt: value.updatedAt,
        }).where(and(eq(entities.workspaceId, workspaceId), eq(entities.id, entityId)));
        return findEntity(workspaceId, entityId);
      },
    },
    observations: {
      async insert(workspaceId, input) {
        const value = validate(ObservationSchema, input);
        await database.insert(observations).values({
          ...value,
          workspaceId,
          alternativeCandidates: value.alternativeCandidates ?? null,
        });
        return (await findObservation(workspaceId, value.id))!;
      },
      findById: findObservation,
      list: (workspaceId) => listObservations(workspaceId),
      listByArtifact: listObservations,
      listRevisions: listObservationRevisions,
      async correct(workspaceId, observationId, input, auditInput) {
        const value = validate(ObservationSchema, input);
        const auditEntry = validate(AuditEntrySchema, auditInput);
        requireIdentity(observationId, value);
        requireWorkspace(workspaceId, auditEntry);
        await database.transaction(async (transaction) => {
          const currentRows = await transaction
            .select()
            .from(observations)
            .where(and(eq(observations.workspaceId, workspaceId), eq(observations.id, observationId)))
            .limit(1);
          const currentRow = first(currentRows);
          if (currentRow === null) return;

          await transaction.insert(observationRevisions).values({
            id: randomUUID(),
            workspaceId,
            observationId,
            snapshot: observationFromRow(currentRow),
            recordedAt: value.reviewedAt ?? value.createdAt,
          });
          await transaction.update(observations).set({
            artifactId: value.artifactId,
            entityId: value.entityId,
            schemaKey: value.schemaKey,
            value: value.value,
            normalisedValue: value.normalisedValue,
            alternativeCandidates: value.alternativeCandidates ?? null,
            derivation: value.derivation,
            evidenceStatus: value.evidenceStatus,
            evidenceSegmentId: value.evidenceSegmentId,
            confidence: value.confidence,
            extractor: value.extractor,
            insufficiencyReason: value.insufficiencyReason,
            reviewStatus: value.reviewStatus,
            reviewedBy: value.reviewedBy,
            reviewedAt: value.reviewedAt,
          }).where(and(eq(observations.workspaceId, workspaceId), eq(observations.id, observationId)));

          const impactedEventRows = await transaction
            .select({ id: eventObservations.eventId })
            .from(eventObservations)
            .where(
              and(
                eq(eventObservations.workspaceId, workspaceId),
                eq(eventObservations.observationId, observationId),
              ),
            );
          const impactedEventIds = impactedEventRows.map(({ id }) => id);
          if (impactedEventIds.length > 0) {
            await transaction
              .update(operationalEvents)
              .set({ reEvaluationStatus: "required" })
              .where(
                and(
                  eq(operationalEvents.workspaceId, workspaceId),
                  inArray(operationalEvents.id, impactedEventIds),
                ),
              );
            const impactedCaseRows = await transaction
              .select({ id: caseEvents.caseId })
              .from(caseEvents)
              .where(
                and(
                  eq(caseEvents.workspaceId, workspaceId),
                  inArray(caseEvents.eventId, impactedEventIds),
                ),
              );
            const impactedCaseIds = impactedCaseRows.map(({ id }) => id);
            if (impactedCaseIds.length > 0) {
              await transaction
                .update(cases)
                .set({ reEvaluationStatus: "required" })
                .where(
                  and(eq(cases.workspaceId, workspaceId), inArray(cases.id, impactedCaseIds)),
                );
            }
          }
          await transaction.insert(auditEntries).values(auditEntry);
        });
        return findObservation(workspaceId, observationId);
      },
    },
    operationalEvents: {
      async insert(workspaceId, input) {
        const value = validate(OperationalEventSchema, input);
        requireWorkspace(workspaceId, value);
        await database.transaction(async (transaction) => {
          await transaction.insert(operationalEvents).values({
            id: value.id,
            workspaceId,
            eventType: value.eventType,
            occurredAt: value.occurredAt,
            recordedAt: value.recordedAt,
            attributes: value.attributes,
            assemblerId: value.assembly.assemblerId,
            assemblerVersion: value.assembly.assemblerVersion,
            reEvaluationStatus: value.reEvaluationStatus,
          });
          if (value.entityIds.length > 0) {
            await transaction.insert(eventEntities).values(value.entityIds.map((entityId) => ({ workspaceId, eventId: value.id, entityId })));
          }
          await transaction.insert(eventObservations).values(value.observationIds.map((observationId) => ({ workspaceId, eventId: value.id, observationId })));
        });
        return (await findOperationalEvent(workspaceId, value.id))!;
      },
      findById: findOperationalEvent,
      list: listOperationalEvents,
      async markForReEvaluation(workspaceId, eventId) {
        await database
          .update(operationalEvents)
          .set({ reEvaluationStatus: "required" })
          .where(
            and(eq(operationalEvents.workspaceId, workspaceId), eq(operationalEvents.id, eventId)),
          );
        return findOperationalEvent(workspaceId, eventId);
      },
    },
    signals: {
      async insert(workspaceId, input) {
        const value = validate(SignalSchema, input);
        requireWorkspace(workspaceId, value);
        await database.transaction(async (transaction) => {
          await transaction.insert(signals).values({
            id: value.id,
            workspaceId,
            signalType: value.signalType,
            severity: value.severity,
            ruleId: value.rule.id,
            ruleVersion: value.rule.version,
            rationale: value.rationale,
            createdAt: value.createdAt,
          });
          await transaction.insert(signalEvents).values(value.eventIds.map((eventId) => ({ workspaceId, signalId: value.id, eventId })));
          await transaction.insert(signalEvidenceSegments).values(value.evidenceSegmentIds.map((artifactSegmentId) => ({ workspaceId, signalId: value.id, artifactSegmentId })));
        });
        return (await findSignal(workspaceId, value.id))!;
      },
      findById: findSignal,
      list: listSignals,
    },
    cases: {
      async insert(workspaceId, input) {
        const value = validate(CaseSchema, input);
        requireWorkspace(workspaceId, value);
        await database.transaction(async (transaction) => {
          await transaction.insert(cases).values({
            id: value.id, workspaceId, caseType: value.caseType, title: value.title, status: value.status,
            priority: value.priority, severity: value.severity, owner: value.owner, dueAt: value.dueAt,
            closureRequirementIds: value.closureRequirementIds, reEvaluationStatus: value.reEvaluationStatus,
            createdAt: value.createdAt, updatedAt: value.updatedAt,
          });
          if (value.relatedEntityIds.length > 0) await transaction.insert(caseEntities).values(value.relatedEntityIds.map((entityId) => ({ workspaceId, caseId: value.id, entityId })));
          if (value.relatedEventIds.length > 0) await transaction.insert(caseEvents).values(value.relatedEventIds.map((eventId) => ({ workspaceId, caseId: value.id, eventId })));
          if (value.relatedSignalIds.length > 0) await transaction.insert(caseSignals).values(value.relatedSignalIds.map((signalId) => ({ workspaceId, caseId: value.id, signalId })));
        });
        return (await findCase(workspaceId, value.id))!;
      },
      findById: findCase,
      list: listCases,
      async update(workspaceId, caseId, input) {
        const value = validate(CaseSchema, input);
        requireWorkspace(workspaceId, value);
        requireIdentity(caseId, value);
        await database.transaction(async (transaction) => {
          await transaction.update(cases).set({
            caseType: value.caseType, title: value.title, status: value.status, priority: value.priority,
            severity: value.severity, owner: value.owner, dueAt: value.dueAt,
            closureRequirementIds: value.closureRequirementIds, reEvaluationStatus: value.reEvaluationStatus,
            updatedAt: value.updatedAt,
          }).where(and(eq(cases.workspaceId, workspaceId), eq(cases.id, caseId)));
          await transaction.delete(caseEntities).where(and(eq(caseEntities.workspaceId, workspaceId), eq(caseEntities.caseId, caseId)));
          await transaction.delete(caseEvents).where(and(eq(caseEvents.workspaceId, workspaceId), eq(caseEvents.caseId, caseId)));
          await transaction.delete(caseSignals).where(and(eq(caseSignals.workspaceId, workspaceId), eq(caseSignals.caseId, caseId)));
          if (value.relatedEntityIds.length > 0) await transaction.insert(caseEntities).values(value.relatedEntityIds.map((entityId) => ({ workspaceId, caseId, entityId })));
          if (value.relatedEventIds.length > 0) await transaction.insert(caseEvents).values(value.relatedEventIds.map((eventId) => ({ workspaceId, caseId, eventId })));
          if (value.relatedSignalIds.length > 0) await transaction.insert(caseSignals).values(value.relatedSignalIds.map((signalId) => ({ workspaceId, caseId, signalId })));
        });
        return findCase(workspaceId, caseId);
      },
    },
    actionItems: {
      async insert(workspaceId, input) {
        const value = validate(ActionItemSchema, input);
        requireWorkspace(workspaceId, value);
        await database.transaction(async (transaction) => {
          await transaction.insert(actionItems).values({
            id: value.id, workspaceId, caseId: value.caseId, actionType: value.actionType,
            title: value.title, assignee: value.assignee, status: value.status, dueAt: value.dueAt,
            completedAt: value.completedAt, createdAt: value.createdAt,
          });
          if (value.completionEvidenceSegmentIds.length > 0) await transaction.insert(actionItemEvidenceSegments).values(value.completionEvidenceSegmentIds.map((artifactSegmentId) => ({ workspaceId, actionItemId: value.id, artifactSegmentId })));
        });
        return (await findActionItem(workspaceId, value.id))!;
      },
      findById: findActionItem,
      list: listActionItems,
      async update(workspaceId, actionItemId, input) {
        const value = validate(ActionItemSchema, input);
        requireWorkspace(workspaceId, value);
        requireIdentity(actionItemId, value);
        await database.transaction(async (transaction) => {
          await transaction.update(actionItems).set({
            caseId: value.caseId, actionType: value.actionType, title: value.title, assignee: value.assignee,
            status: value.status, dueAt: value.dueAt, completedAt: value.completedAt,
          }).where(and(eq(actionItems.workspaceId, workspaceId), eq(actionItems.id, actionItemId)));
          await transaction.delete(actionItemEvidenceSegments).where(and(eq(actionItemEvidenceSegments.workspaceId, workspaceId), eq(actionItemEvidenceSegments.actionItemId, actionItemId)));
          if (value.completionEvidenceSegmentIds.length > 0) await transaction.insert(actionItemEvidenceSegments).values(value.completionEvidenceSegmentIds.map((artifactSegmentId) => ({ workspaceId, actionItemId, artifactSegmentId })));
        });
        return findActionItem(workspaceId, actionItemId);
      },
    },
    decisions: {
      async insert(workspaceId, input) {
        const value = validate(DecisionSchema, input);
        requireWorkspace(workspaceId, value);
        await database.transaction(async (transaction) => {
          await transaction.insert(decisions).values({
            id: value.id, workspaceId, caseId: value.caseId, decisionType: value.decisionType,
            proposal: value.proposal, rationale: value.rationale, riskLevel: value.riskLevel,
            approvalPolicyId: value.approvalPolicyId, status: value.status, createdAt: value.createdAt,
            decidedAt: value.decidedAt,
          });
          await transaction.insert(decisionEvidenceSegments).values(value.evidenceSegmentIds.map((artifactSegmentId) => ({ workspaceId, decisionId: value.id, artifactSegmentId })));
        });
        return (await findDecision(workspaceId, value.id))!;
      },
      findById: findDecision,
      list: listDecisions,
      async update(workspaceId, decisionId, input) {
        const value = validate(DecisionSchema, input);
        requireWorkspace(workspaceId, value);
        requireIdentity(decisionId, value);
        await database.transaction(async (transaction) => {
          await transaction.update(decisions).set({
            caseId: value.caseId, decisionType: value.decisionType, proposal: value.proposal,
            rationale: value.rationale, riskLevel: value.riskLevel, approvalPolicyId: value.approvalPolicyId,
            status: value.status, decidedAt: value.decidedAt,
          }).where(and(eq(decisions.workspaceId, workspaceId), eq(decisions.id, decisionId)));
          await transaction.delete(decisionEvidenceSegments).where(and(eq(decisionEvidenceSegments.workspaceId, workspaceId), eq(decisionEvidenceSegments.decisionId, decisionId)));
          await transaction.insert(decisionEvidenceSegments).values(value.evidenceSegmentIds.map((artifactSegmentId) => ({ workspaceId, decisionId, artifactSegmentId })));
        });
        return findDecision(workspaceId, decisionId);
      },
    },
    approvals: {
      async insert(workspaceId, input) {
        const value = validate(ApprovalSchema, input);
        requireWorkspace(workspaceId, value);
        await database.insert(approvals).values(value);
        return (await findApproval(workspaceId, value.id))!;
      },
      findById: findApproval,
      list: listApprovals,
    },
    auditEntries: {
      async insert(workspaceId, input) {
        const value = validate(AuditEntrySchema, input);
        requireWorkspace(workspaceId, value);
        await database.insert(auditEntries).values(value);
        return (await findAuditEntry(workspaceId, value.id))!;
      },
      findById: findAuditEntry,
      list: listAuditEntries,
    },
  };
}
