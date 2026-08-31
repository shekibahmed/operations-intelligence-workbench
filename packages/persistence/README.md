# Persistence

`@oiw/persistence` is the plain-PostgreSQL/Drizzle adapter for the canonical
OIW contracts. It deliberately has no Supabase SDK dependency. The canonical
migration location is `db/migrations/`; Drizzle's TypeScript schema lives in
`packages/persistence/src/schema.ts`.

## Local setup

```bash
docker compose up -d
pnpm db:migrate
pnpm test
```

The default local connection string is
`postgresql://postgres:postgres@localhost:5432/oiw`. Set `DATABASE_URL` to use
another isolated PostgreSQL database.

Generate a migration after an intentional schema change:

```bash
pnpm db:generate
```

Reset and reapply all migrations to the local database:

```bash
pnpm db:reset
```

`db:reset` refuses non-local hosts unless
`OIW_ALLOW_DATABASE_RESET=true` is explicitly set. Never point the reset
command at a shared or production database.

## Workspace scoping

Every persisted table except the Workspace root itself carries a non-null,
indexed `workspace_id`. Link tables carry the same scope, and composite
foreign keys prevent relationships from crossing workspace boundaries.
Repository methods require `workspaceId` for every read and write; detail
lookups return `null` when an ID belongs to a different workspace.

The Workspace repository uses the requested Workspace ID itself as its scope.
There is intentionally no unscoped workspace-list operation.

## Validation and invariants

- Inputs and hydrated outputs are parsed with the frozen `@oiw/contracts`
  v1.1 schemas. JSONB stores only contract-valid JSON values.
- Artifact source fields are protected by a database trigger. The only
  repository update is `processingStatus`.
- Audit Entries have insert/query methods only; a database trigger rejects
  raw `UPDATE` and `DELETE` attempts as a defence in depth.
- A Decision cannot enter `approved` unless a matching human Approval with an
  approved outcome already exists in the same Workspace.
- Observation evidence, confidence, extractor and review fields mirror the
  v1.1 provenance and abstention contract, including negated evidence,
  alternative candidates and the conflicting review state.

PostgreSQL normalises timestamps to UTC when records are hydrated, preserving
the contracts' offset-aware ISO 8601 requirement.
