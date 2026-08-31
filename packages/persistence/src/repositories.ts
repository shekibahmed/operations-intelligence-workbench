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

export interface ScopedRepository<T> {
  insert(workspaceId: string, value: T): Promise<T>;
  findById(workspaceId: string, id: string): Promise<T | null>;
  list(workspaceId: string): Promise<T[]>;
}

export interface WorkspaceRepository {
  insert(value: Workspace): Promise<Workspace>;
  findById(workspaceId: string): Promise<Workspace | null>;
  update(workspaceId: string, value: Workspace): Promise<Workspace | null>;
}

export type SourceRepository = ScopedRepository<Source>;

export interface ArtifactRepository extends ScopedRepository<Artifact> {
  updateProcessingStatus(
    workspaceId: string,
    artifactId: string,
    processingStatus: Artifact["processingStatus"],
  ): Promise<Artifact | null>;
}

export interface ArtifactSegmentRepository extends ScopedRepository<ArtifactSegment> {
  listByArtifact(workspaceId: string, artifactId: string): Promise<ArtifactSegment[]>;
}

export interface EntityRepository extends ScopedRepository<Entity> {
  update(workspaceId: string, entityId: string, value: Entity): Promise<Entity | null>;
}

export interface ObservationRepository extends ScopedRepository<Observation> {
  correct(
    workspaceId: string,
    observationId: string,
    value: Observation,
    auditEntry: AuditEntry,
  ): Promise<Observation | null>;
  listByArtifact(workspaceId: string, artifactId: string): Promise<Observation[]>;
  listRevisions(workspaceId: string, observationId: string): Promise<Observation[]>;
}

export interface OperationalEventRepository extends ScopedRepository<OperationalEvent> {
  markForReEvaluation(workspaceId: string, eventId: string): Promise<OperationalEvent | null>;
}

export type SignalRepository = ScopedRepository<Signal>;

export interface CaseRepository extends ScopedRepository<Case> {
  update(workspaceId: string, caseId: string, value: Case): Promise<Case | null>;
}

export interface ActionItemRepository extends ScopedRepository<ActionItem> {
  update(workspaceId: string, actionItemId: string, value: ActionItem): Promise<ActionItem | null>;
}

export interface DecisionRepository extends ScopedRepository<Decision> {
  update(workspaceId: string, decisionId: string, value: Decision): Promise<Decision | null>;
}

export type ApprovalRepository = ScopedRepository<Approval>;

export interface AuditEntryRepository {
  insert(workspaceId: string, value: AuditEntry): Promise<AuditEntry>;
  findById(workspaceId: string, id: string): Promise<AuditEntry | null>;
  list(workspaceId: string): Promise<AuditEntry[]>;
}

export interface PersistenceRepositories {
  workspaces: WorkspaceRepository;
  sources: SourceRepository;
  artifacts: ArtifactRepository;
  artifactSegments: ArtifactSegmentRepository;
  entities: EntityRepository;
  observations: ObservationRepository;
  operationalEvents: OperationalEventRepository;
  signals: SignalRepository;
  cases: CaseRepository;
  actionItems: ActionItemRepository;
  decisions: DecisionRepository;
  approvals: ApprovalRepository;
  auditEntries: AuditEntryRepository;
}
