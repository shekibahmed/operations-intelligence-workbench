# Agent Run: OIW-004a

## State
COMPLETE

## Changed files
- `scenario-packs/asset-reliability/narrative/` — README.md, entities.md,
  storyline.md, expected-outcomes.md, edge-cases.md, and
  `artifacts/{smoke,demo,edge}/` (45 artifacts: 9 smoke, 25 demo, 11 edge).
- `scenario-packs/process-exceptions/narrative/` — same five docs plus
  `artifacts/{smoke,demo,edge}/` (28 artifacts: 9 smoke, 12 demo, 7 edge).
- `scenario-packs/document-assurance/narrative/` — same five docs plus
  `artifacts/{smoke,demo,edge}/` (28 artifacts: 9 smoke, 12 demo, 7 edge).
- `docs/agent-runs/OIW-004a.md` (this file).

Total: 116 files (101 artifacts + 15 narrative docs).

## Commits
On branch `agent/claude/OIW-004a-narrative-fixtures`:
1. `a653bc6` — `content: author narrative fixtures for three scenario packs
   (OIW-004a)` — all `scenario-packs/**/narrative/**` content (116 files).
2. `docs: add OIW-004a agent-run record` — this file (hash follows this
   commit; see `git log` on the branch).

## Tests run and results
No code was written — this is a content-only task (functional requirement:
no TypeScript, no schemas, no rules). `pnpm lint` / `pnpm typecheck` /
`pnpm test` / `pnpm build` / `pnpm validate:packs` / `pnpm architecture:check`
do not exist yet (they land with OIW-001, per `SESSION.md`), so none were run
— noted per `AGENTS.md`'s instruction to say so rather than skip silently.

Self-check performed instead, per the task packet's "Required Tests" note
(cross-reference every artifact ID between `storyline.md` and
`expected-outcomes.md`): for each of the three packs, every artifact ID
present on disk under `artifacts/{smoke,demo,edge}/` was confirmed present
in both `storyline.md` and `expected-outcomes.md` via a scripted grep pass
(45/45 for asset-reliability, 28/28 for process-exceptions, 28/28 for
document-assurance — zero misses on the final pass). Also grepped the full
`scenario-packs/` tree for common real-world organisation/brand/jurisdiction
names — no hits.

## Acceptance criteria status
- **Volumes met**: Asset Reliability 9 smoke (≥8) / 25 demo (≥25) / 11 edge
  (≥10) — pass. Process Exceptions and Document Assurance each 9 smoke (≥8)
  / 12 demo (≥12) / 7 edge (≥6) — pass. (Smoke sets carry one extra artifact
  each — see Assumptions and deviations, JSON-format fix.)
- **Stable IDs throughout**: pass. Format `<pack>-<set>-NNN`, zero-padded,
  filename doubles as the ID (no embedded ID metadata inside raw content,
  matching how a real system would receive these artifacts).
- **Histories coherent across artifacts**: pass. Each pack's demo set is
  built from named recurring entities (assets, batches/supplier lots,
  contracts/parties) with explicit repeat-fault / repeated-deviation /
  conflicting-provision threads, verified by direct review of the primary
  arcs (Asset Reliability's A-142 brake trio + escalation; Process
  Exceptions' B-2205/B-2210/KM-LOT-448 supplier-lot escalation; Document
  Assurance's Project Falcon liability-cap conflict).
- **Every artifact mapped to expected outcomes in prose**: pass, see
  self-check above.
- **Injection, duplicate, and high-risk-approval cases present in every
  pack**: pass. Each pack has exactly one prompt-injection-style edge
  artifact (verified inert — manipulative text embedded in otherwise normal
  content, with no mechanism by which it could act), at least one exact
  duplicate artifact, and a high-risk decision path requiring approval
  (the primary demo arc in each pack, reinforced by a dedicated
  thin-evidence edge case in the edge set).
- **No real data**: pass, verified by grep (see Tests section) and manual
  spot review of all three README.md/entities.md files.
- **Edge-case category coverage** (functional requirement 5): every pack
  covers missing identifier, conflicting dates, ambiguous entity reference,
  negated statement, duplicate artifact, prompt-injection-style artifact,
  and a high-risk/inadequate-evidence decision. Asset Reliability
  additionally covers unsupported language, low-quality/OCR extraction,
  same-day conflicting status, and a near-duplicate ("repeated artifact")
  case distinct from the exact duplicate — these four are PRD §21.2
  extras, not strictly required by the task packet, added there because
  Asset Reliability is the full-volume pack.
- **Leadership/operations/technical tellings** (functional requirement 8,
  PRD §38): each pack's `storyline.md` interleaves all three lenses
  throughout, and each `README.md` gives the required three-paragraph
  leadership/operations/technical summary.

## Architectural decisions
- **Directory layout**: `narrative/artifacts/{smoke,demo,edge}/` subdirectories
  per pack, one file per artifact, named `<pack>-<set>-NNN.<ext>`. This
  keeps the artifact ID = filename (simplest possible traceability) and
  keeps the three PRD §21.2 dataset tiers physically separated, which
  should make it straightforward for OIW-004b to walk each tier
  independently when generating expected-extraction JSON.
- **No embedded metadata inside raw artifact content**: informal
  messages/emails have no injected "Artifact ID:" header — they read as a
  real person would have written them. Traceability comes entirely from
  the filename plus the entry in `expected-outcomes.md`. Document-style
  artifacts (contracts, inspection reports) do carry a plausible in-world
  reference number (work order, contract ref) where realistic, but that
  number does not need to match the artifact filename.
- **Format assignment**: `.txt` (informal messages/emails/notes), `.csv`
  (tabular logs), `.json` (system-generated payloads: sensor/analyzer/
  compliance-tracker exports), `.md` with `--- page N ---` markers
  (PDF-destined contracts/inspection/compliance reports, per A7's
  known-text-layer approach — actual PDF generation is OIW-004b's job).
- **JSON-format fix (post-authoring)**: the three drafting sub-agents
  collectively produced zero `.json` artifacts, missing functional
  requirement 4's explicit "JSON payloads" format. Rather than re-running
  authoring, I added one JSON smoke-set artifact per pack myself
  (`*-smoke-009.json`) representing a machine-generated system export
  (BMS sensor-gateway reading, in-line analyzer reading, compliance-tracker
  export) tied to an existing entity for coherence, and wired each into
  its pack's `storyline.md` and `expected-outcomes.md` (including fixing
  the resulting stale artifact-count references in both files and in the
  Process Exceptions README). This is the reason each pack's smoke set is
  9 rather than 8.
- **Decision/Approval artifacts are deliberately absent from the narrative
  set**: per PRD §9.13, an Approval is "the human response to a Decision,"
  recorded in the running application (the Decision Centre), not a source
  artifact ingested from outside. All three packs' primary storylines end
  with a Decision proposed and pending — not approved or rejected — which
  is itself a deliberate, explicit design choice (documented in each
  pack's `storyline.md`/`expected-outcomes.md`) so that OIW-004b's gold set
  can exercise an in-flight `approval_policy=required, status=pending`
  state rather than only closed ones.

## Assumptions and deviations
- Task packet functional requirement 5 lists edge-case categories without
  specifying exact counts; I asked each drafting agent for coverage of
  every named category plus enough extra edge cases to comfortably clear
  the ≥10 (Asset Reliability) / ≥6 (other two) minimums. Actual: 11 / 7 / 7.
- Introduced minor entities not explicitly named in the task packet but
  needed to make specific edge cases genuinely ambiguous or to fill
  otherwise-unlabelled roles, all documented in each pack's `entities.md`:
  - Asset Reliability: asset `A-140` exists solely to make `edge-003`'s
    truncated-ID ambiguity real (a second plausible forklift, not part of
    any demo storyline).
  - Process Exceptions: batch `B-2211` (Compound RM-09, Line 2) for the
    unrelated-thread demo artifacts, since the explicitly-named batch
    codes were all committed to the main storyline or smoke/edge reuse.
  - Document Assurance: two additional named people, Marcus Ibori
    (Authorised Reviewer) and Elena Cho (Internal Reviewer), to fill roles
    implied by the demo/edge storyline (an authorised approver distinct
    from the review owner, and a routine internal reviewer for the smoke
    set) that weren't pre-assigned in my spec.
- Process Exceptions' `demo-004` (supervisor hypothesises a B-2190/
  KM-LOT-448 supplier pattern) is in deliberate tension with `edge-004`
  (an earlier email ruling B-2190 out as supplier-related) — both authored
  intentionally so an extraction/rules system must treat demo-004's
  hypothesis as unconfirmed and let the independently-corroborated
  B-2210 batch (demo-005/006) be the actual pattern-confirming evidence,
  not the earlier, already-negated claim. Called out explicitly in that
  pack's `expected-outcomes.md` so it reads as intentional, not an error.
- Calendar: each pack uses its own self-contained 2026 timeline (Asset
  Reliability: Jan–Aug; Process Exceptions: Jan–Feb; Document Assurance:
  Jan–Jul) since packs load into isolated synthetic workspaces per PRD
  §13.2 and have no cross-pack time dependency.
- Company/place names, all fictional: Northgate Distribution Center,
  Ferrow Industrial Services, Coastal Fleet Maintenance (Asset
  Reliability); Rivermill Processing Plant, Kestrel Materials Co., Drayton
  Supply Partners (Process Exceptions); Vantage Logistics Partners,
  Consolidated Freight Underwriters, Meridian Compliance Services, State
  of Ashford (Document Assurance).

## Dependency requests
None. No code, no packages.

## Known limitations / follow-up
- This narrative content is the input to OIW-004b, which must still author
  `manifest.yaml`, schemas, rules, dashboards, and — critically — the
  expected-extraction JSON files (per amendment A1) keyed by artifact
  checksum. OIW-004b's author should treat each pack's `expected-outcomes.md`
  as the prose gold set to formalize, not re-derive independently.
- I did not generate PDF binaries (out of scope per the task packet's
  Non-Goals and A7); the `.md` files with `--- page N ---` markers are the
  known-text-layer source OIW-004b should render from.
- Two edge-case artifacts per pack are intentionally adversarial
  (prompt-injection-style) and one per pack is intentionally
  under-evidenced (high-risk/thin-evidence). These are the pack authors'
  own crafted fixtures, not adversarial input from an external red-team —
  flagging so OIW-005 (evaluation/threat plan) and any future security
  review know these specific artifact IDs exist and are safe/expected
  test material, not something to be filtered out of the pack.

### Contract-needs section (for OIW-001)

Observations made while authoring content that the OIW-001 contract freeze
should account for:

1. **Explicit negative/negated findings, distinct from missing evidence.**
   Several edge cases (`edge-004` in every pack) are inspection notes or
   reviewer notes that explicitly rule something out ("no wear observed,"
   "ruled out," "does NOT apply"). This is a confirmed-absent finding, not
   an `insufficient-evidence` abstention (§22.3) and not a normal positive
   observation — the `Observation` contract needs a way to represent "the
   source explicitly denies X" that a rule engine can distinguish from
   both "X is true" and "X is unknown."

2. **Alternative-candidate values for ambiguous entity resolution.**
   PRD §13.5 already describes this ("original text, extracted value,
   alternative candidate, confidence") but every pack's `edge-003` is a
   concrete case of it (a truncated/ambiguous ID or reference genuinely
   matching two real entities). The `Observation`/review-queue contract
   needs a first-class `alternative_candidates: [{value, confidence}]`
   shape, not just a single `value` + `confidence`.

3. **Duplicate vs. near-duplicate (repeated-artifact) distinction.**
   Every pack has both an exact-duplicate artifact (`edge-005`, identical
   content/checksum) and, in Asset Reliability, a near-duplicate
   (`edge-011`: same underlying event, different work-order number and
   reworded description). These need different handling: checksum-based
   dedup can catch the former; the latter requires similarity-based
   matching and should surface as a *probable* duplicate for human
   confirmation rather than either silently merging or double-counting.
   The fixture-provider lookup-by-checksum contract (amendment A1) only
   naturally covers the exact-duplicate case — the near-duplicate case is
   an entity-resolution/event-assembly concern that should be named
   explicitly in the contract or fact catalogue (amendment A2).

4. **Same-artifact-set direct contradictions ("conflicting status" /
   "conflicting provisions").** `edge-010` (Asset Reliability) and the
   Document Assurance liability-cap thread both require the system to
   hold two directly contradictory Observations about the same Entity
   live at once and surface the conflict, rather than having later-wins
   or first-wins resolution logic pick one silently. This should be a
   named `review_status` state (e.g. `conflicting`), not just `pending`.

5. **Evidence-span addressing per format.** Confirmed all four formats are
   in play: character range for `.txt` (with a wrinkle — multi-message
   chat-log artifacts like `demo-001` need a message-index anchor, not
   just a global character offset, since a chat log is several
   timestamped messages in one artifact), row+column for `.csv` (best
   anchored by a natural key such as `work_order`, not row number, since
   CSVs may have multiple relevant rows), page+paragraph for `.md`
   (PDF-destined, consistent with A7's page-level-only scope), and a
   JSON-pointer-style path for `.json` (the three new smoke-009 payloads
   are simple flat objects, so a top-level key name suffices as the
   evidence reference).

6. **Degraded-extraction-quality flag, separate from confidence.**
   `edge-009` (low-quality/OCR-garbled PDF text) is a case where the
   evidence span itself is still locatable (the right page/paragraph) but
   the underlying text is degraded. This is conceptually different from
   low extraction confidence on a clean source — the contract may want a
   source-quality signal on the `Artifact`/`Artifact Segment` independent
   of the `Observation.confidence` an extractor reports.

7. **Currency/threshold-typed values.** Document Assurance's liability-cap
   conflict needs two concretely different monetary figures compared
   against each other. `Observation.value`/`normalised_value` should
   support a typed numeric-with-unit/currency shape (not just string or
   plain number) so rules can compare thresholds correctly.

8. **Pending/in-flight Decision-Approval state.** All three packs'
   primary demo arcs deliberately end with a Decision proposed and no
   Approval recorded yet (see Architectural decisions above). Confirm the
   `Decision.status` / `Approval` contract supports a stable "awaiting
   approval" state as a first-class, queryable value (not just
   approved/rejected), since dashboards (PRD §13.10, Pending-Approvals
   card) depend on it.

9. **Unsupported-language handling is undefined in the PRD.** `edge-008`
   (Asset Reliability) is a fault message partly in Spanish. PRD §21.2
   lists "unsupported language" as a required edge-case category but the
   PRD doesn't specify expected behavior (full abstention? partial
   extraction of the parts in English? a distinct `status`?). Flagging
   for OIW-001/OIW-005 to define explicitly — `expected-outcomes.md`
   currently states only that the system should not fabricate confident
   field values it cannot actually read.
