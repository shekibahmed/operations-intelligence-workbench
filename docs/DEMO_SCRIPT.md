# Demonstration Script

The guided-tour content and step order for the north-star demonstration
journey (`docs/PRD.md` §13). This is the copy/step source of truth referenced
by `docs/UX_SPEC.md` §4 (tour mechanics) and §5 (screen behaviour).

Tour mechanics (overlay, Next/Back/Exit, no separate route, no fabricated
data) are specified once in `docs/UX_SPEC.md` §4 and not repeated per step
below — each step here names only its screen, pinned element, and copy.

---

## Full Guided Demonstration — Asset Reliability

This is the primary public demonstration (PRD §13: "The primary guided
demonstration should use the Asset Reliability Pack"). Entered via
`/demo/[pack]` → **Start guided tour** (`docs/UX_SPEC.md` §2 step 3), which
creates the workspace and lands on the Inbox with the tour active.

### Step 0 — Arrival (`/demo`)

- **Screen**: Scenario Selector (R2).
- **Pinned element**: The Asset Reliability pack card.
- **Copy**:
  > This demonstration uses synthetic operational information. Select a
  > scenario and follow the information from source to action.
- **Action**: Visitor selects Asset Reliability → `/demo/asset-reliability`.

### Step 1 — Select a pack (`/demo/asset-reliability`)

- **Screen**: Guided Scenario Start (R3).
- **Pinned element**: **Start guided tour** button.
- **Copy**:
  > Selecting this pack creates an isolated synthetic workspace with assets,
  > locations, historical events, open cases, source artifacts, rules and
  > metrics already loaded — nothing here affects any other visitor.
- **Action**: Visitor clicks **Start guided tour**. System creates the
  workspace and navigates to `/w/[workspace]/inbox?lens=operations` with the
  tour active.

### Step 2 — View incoming artifacts (`/w/[workspace]/inbox`)

- **Screen**: Artifact Inbox (R5).
- **Pinned element**: The inbox table, highlighting three specific rows.
- **Copy**:
  > Three new artifacts have arrived: an informal message describing a
  > braking problem, a maintenance CSV showing a previous repair, and an
  > inspection PDF referring to wear in the same component. None of this is
  > structured yet — it's raw input.
- **Fixture rows shown** (per PRD §13.3):
  1. Informal message — braking problem.
  2. Maintenance CSV — previous repair record.
  3. Inspection PDF — component wear note.
- **Action**: Tour advances the visitor's attention to row 1 (the informal
  message).

### Step 3 — Process an artifact (`/w/[workspace]/inbox`)

- **Screen**: Artifact Inbox (R5), row 1.
- **Pinned element**: The **Process** action on the informal-message row.
- **Copy**:
  > Click Process. The fixture intelligence provider extracts structured
  > fields from the raw text — deterministically, with no external model
  > call required.
- **Action**: Visitor clicks **Process**. Row updates in place; extraction
  yields (PRD §13.4): asset ID, component, symptom, severity suggestion,
  operating condition, evidence spans, confidence values.
- **Follow-up copy** (after processing completes):
  > One field came back ambiguous, so it's been routed to the Review Queue
  > instead of becoming fact automatically.

### Step 4 — Review uncertainty (`/w/[workspace]/review`)

- **Screen**: Review Queue (R6).
- **Pinned element**: The queue item for the ambiguous asset identifier.
- **Copy**:
  > This is the ambiguous field: the asset identifier. On the left is the
  > original text; on the right, the extracted value, an alternative
  > candidate, the system's confidence, and the exact evidence span
  > highlighted in the source. Nothing here is quietly assumed — a human
  > confirms it.
- **Displayed fields** (PRD §13.5): original text, extracted value,
  alternative candidate, confidence, exact evidence, Accept / Correct /
  Reject actions.
- **Action**: Visitor reviews and clicks **Accept** (or **Correct**, if the
  alternative candidate is the right one in the fixture data — the pack's
  gold answer determines which the tour recommends).

### Step 5 — Form an event (system, no dedicated screen)

- **Copy** (shown as a transitional tour toast, not tied to one screen):
  > With the ambiguity resolved, the system assembles a `fault-reported`
  > Event from the accepted observations.
- No screen pin — this step narrates a backend transition the visitor will
  see reflected in the next steps (Case Detail's timeline, Audit Explorer).

### Step 6 — Generate a signal (`/w/[workspace]/technical/rules/[id]`)

- **Screen**: Technical Inspector — Rule trace (R13).
- **Pinned element**: The condition tree, both firing clauses.
- **Copy**:
  > A deterministic rule checked two things: whether the same component had
  > a related fault recently, and whether the current report contains a
  > safety indicator. Both are true here — see the rule trace. The result:
  > critical severity, a repeat-fault signal, a required inspection, and a
  > proposed hold-from-service decision.
- **Rule outcome shown** (PRD §13.7): critical severity, repeat-fault
  signal, required inspection, proposed hold-from-service decision.

### Step 7 — Create case and tasks (`/w/[workspace]/cases/[caseId]`)

- **Screen**: Case Detail (R8).
- **Pinned element**: Case summary header, then Action items section.
- **Copy**:
  > A Reliability Case has been created automatically, with an owner, a due
  > date, priority, the supporting evidence, related history, and the
  > required actions already attached.
- **Fields shown** (PRD §13.8): owner, due date, priority, evidence, related
  history, required actions.

### Step 8 — Approve a decision (`/w/[workspace]/decisions`)

- **Screen**: Decision Centre (R11).
- **Pinned element**: The hold-from-service Decision card.
- **Copy**:
  > The system proposes holding the asset from service — but it will not act
  > on its own. You must explicitly approve or reject this. The rule trace
  > alongside explains exactly why approval is required.
- **Action**: Visitor clicks **Approve**, provides the required comment
  (high-risk decision — PRD §22.4), confirms.

### Step 9 — Observe dashboard changes

- **Screen A**: Leadership Overview (R4), `?lens=leadership`.
  - **Copy**:
    > Switch to the Leadership lens. Critical cases, asset availability,
    > pending work, repeat-fault count and the risk summary have all updated
    > from the single approval you just made.
  - **Fields shown** (PRD §13.10): critical cases, asset availability,
    pending work, repeat-fault count, risk summary.
- **Screen B**: Artifact Inbox / Case Detail, `?lens=operations`.
  - **Copy**:
    > In the Operations lens: a new case, an assigned inspection, a due
    > time, and a pending action.
- **Screen C**: Technical Inspector + Audit Explorer, `?lens=technical`.
  - **Copy**:
    > In the Technical lens: the full extraction trace, evidence, rule
    > execution, state changes and audit records — the same event, fully
    > explainable.

### Step 10 — Switch scenarios (`/demo`)

- **Screen**: Scenario Selector (R2).
- **Pinned element**: The Document Assurance pack card (tour recommends this
  as the contrast pack, since its vocabulary — obligations, parties,
  jurisdictions — is maximally different from Asset Reliability's).
- **Copy**:
  > Now switch to Document Assurance. The same lifecycle — artifact, review,
  > event, signal, case, decision, approval — plays out again, but with
  > different terminology, schemas, workflows and dashboards. This is the
  > proof that the core platform is neutral.
- **Action**: Visitor selects a different pack; the Asset Reliability tour
  ends here. Document Assurance and Process Exception Management each carry
  their own full guided tour, below, rather than a separate contrast-only
  path.

---

## Full Guided Demonstration — Process Exception Management

Amendment A7/L2 originally deferred packs two and three to a Leadership-only
outline in P0. Per product-owner request (2026-09-01), that deferral is
superseded: this pack now carries the same full click-through tour as Asset
Reliability, in the pack's own vocabulary, implemented in
`apps/web/src/lib/tour/steps.ts`. It walks the KM-LOT-448 supplier-lot
escalation (`docs/agent-runs/OIW-701.md`) from first symptom to the
supervisor/QC hold-affected-output approval.

### Step 0 — Arrival (`/demo`)

- **Screen**: Scenario Selector (R2).
- **Pinned element**: The Process Exception Management pack card.
- **Action**: Visitor selects Process Exception Management →
  `/demo/process-exceptions`.

### Step 1 — Select a pack (`/demo/process-exceptions`)

- **Screen**: Guided Scenario Start (R3).
- **Pinned element**: **Start guided tour** button.
- **Action**: Visitor clicks **Start guided tour**. System creates the
  workspace and navigates to `/w/[workspace]/inbox?lens=operations` with the
  tour active.

### Step 2 — View incoming artifacts (`/w/[workspace]/inbox`)

- **Screen**: Artifact Inbox (R5).
- **Pinned element**: The inbox table, highlighting Tomas Reyes's operator
  note.
- **Copy**:
  > Tomas Reyes's operator note flags a viscosity trend climbing mid-mix on
  > batch B-2205, Kestrel lot KM-LOT-448 — not yet out of spec, but trending
  > the wrong way. None of this is structured yet — it's raw input.

### Step 3 — Process an artifact (`/w/[workspace]/inbox`)

- **Screen**: Artifact Inbox (R5), the pinned row.
- **Pinned element**: The **Process** action on the operator-note row
  (`process-exceptions-demo-001`).
- **Action**: Visitor clicks **Process**. Extraction yields batch, line,
  supplier lot and process-stage fields, all high-confidence — no review
  needed yet.
- **Convenience action**: Clicking **Next** for real-processes
  `process-exceptions-demo-002` (QC's confirmation record) through the same
  `processArtifact` path a manual click would use, so the ambiguous field the
  next step reviews is real, non-fabricated data.

### Step 4 — Review uncertainty (`/w/[workspace]/review`)

- **Screen**: Review Queue (R6).
- **Pinned element**: The queue item for the unresolved `reported-cause`
  field.
- **Copy**:
  > QC's confirmation record for B-2205 came in too: an 8.2% viscosity
  > deviation, 4,200 units affected — but the reported cause is explicitly
  > "under investigation." That's routed to the Review Queue instead of
  > becoming a determined root cause automatically.
- **Action**: Visitor reviews the evidence, then clicks **Accept**.

### Step 5 — Form an event (system, no dedicated screen)

Real processing continues: clicking **Next** for real-processes
`process-exceptions-demo-003` through `-009` — Priya's escalation email
cross-referencing B-2190, B-2210's independent confirmation of the same
pattern, the inventory-backlog note, the yield-loss production summary, and
Priya's formal hold request — through the same `processArtifact` path.

### Step 6 — Generate a signal (`/w/[workspace]/technical/rules/hold-affected-output-approval`)

- **Screen**: Technical Inspector — Rule trace (R13).
- **Pinned element**: The condition tree.
- **Copy**:
  > A deterministic rule checked whether a formal hold request had been
  > recorded for a supplier lot. Priya's escalation — citing two consecutive
  > deviations on KM-LOT-448 and the mounting quarantine backlog — made that
  > true. The result: a high-risk Hold Affected Output decision awaiting
  > supervisor/QC approval.

### Step 7 — Create case and tasks (`/w/[workspace]/cases/[caseId]`)

- **Screen**: Case Detail (R8).
- **Copy**:
  > The Exception Case links the KM-LOT-448 pattern across both batches, the
  > quarantine backlog, the supporting evidence, and the required
  > investigation actions already attached.

### Step 8 — Approve a decision (`/w/[workspace]/decisions`)

- **Screen**: Decision Centre (R11).
- **Pinned element**: The Hold Affected Output Decision card.
- **Action**: Visitor clicks **Approve**, provides the required comment
  (high-risk decision), confirms.

### Step 9 — Observe dashboard changes (`/w/[workspace]/overview`)

- **Screen**: Leadership Overview (R4), `?lens=leadership`.
- **Copy**:
  > Switch to the Leadership lens. Open Exceptions, critical signals and
  > decisions awaiting approval have all updated from the single approval
  > you just made.

### Step 10 — Full trace and switch scenarios

- **Screen**: Audit Explorer (R14), then the Adapt CTA in the shell —
  extraction, review, event assembly, rule execution, case and decision
  creation, and the approval, in order. Tour ends here; the visitor may
  switch to another pack from `/demo` for the neutrality contrast (same
  copy pattern as the Asset Reliability script's Step 10).

## Full Guided Demonstration — Document Assurance

Also superseding the A7/L2 leadership-only deferral (product-owner request,
2026-09-01). Walks the Project Falcon liability-cap conflict
(`docs/agent-runs/OIW-701.md`) from the MSA's execution to the
authorised-reviewer accept-exception approval.

### Step 0 — Arrival (`/demo`)

- **Screen**: Scenario Selector (R2).
- **Pinned element**: The Document Assurance pack card.
- **Action**: Visitor selects Document Assurance → `/demo/document-assurance`.

### Step 1 — Select a pack (`/demo/document-assurance`)

- **Screen**: Guided Scenario Start (R3).
- **Pinned element**: **Start guided tour** button.
- **Action**: Visitor clicks **Start guided tour**.

### Step 2 — View incoming artifacts (`/w/[workspace]/inbox`)

- **Screen**: Artifact Inbox (R5).
- **Pinned element**: The inbox table, highlighting the Project Falcon MSA.
- **Copy**:
  > Nadia Okonkwo signs the Project Falcon Master Services Agreement with
  > Vantage Logistics Partners — the liability cap, insurance and reporting
  > obligations that will matter later are all set here. None of this is
  > structured yet — it's raw input.

### Step 3 — Process an artifact (`/w/[workspace]/inbox`)

- **Screen**: Artifact Inbox (R5), the pinned row.
- **Pinned element**: The **Process** action on the MSA row
  (`document-assurance-demo-001`).
- **Action**: Visitor clicks **Process**. Extraction yields the document
  reference and its clauses — no review needed yet.
- **Convenience action**: Clicking **Next** for real-processes the internal
  Data Handling Policy and the Project Falcon onboarding checklist
  (`document-assurance-demo-002`, `-003`) and Nadia's clarification email to
  Vantage's counsel (`-004`), so the ambiguous field the next step reviews is
  real, non-fabricated data.

### Step 4 — Review uncertainty (`/w/[workspace]/review`)

- **Screen**: Review Queue (R6).
- **Pinned element**: The queue item for the unresolved `due-date` field.
- **Copy**:
  > As the insurance certificate deadline approaches, Nadia asks Vantage's
  > counsel to confirm the renewal date — but the reply gives no locked
  > date, only a range. That's routed to the Review Queue instead of
  > becoming a determined due date automatically.
- **Action**: Visitor reviews the evidence, then clicks **Accept**.

### Step 5 — Form an event (system, no dedicated screen)

Real processing continues: clicking **Next** for real-processes
`document-assurance-demo-005` through `-011` — the missing-evidence
compliance report, the liability-cap conflict's identification, the
ambiguous "the contract governs" reply, the legitimate MSA amendment, the
still-outstanding checklist, the second missed-deadline compliance report,
and Nadia's formal exception proposal — through the same `processArtifact`
path.

### Step 6 — Generate a signal (`/w/[workspace]/technical/rules/accept-exception-approval`)

- **Screen**: Technical Inspector — Rule trace (R13).
- **Pinned element**: The condition tree.
- **Copy**:
  > A deterministic rule checked whether a reviewer had formally proposed
  > accepting an exception. Nadia's proposal — citing the MSA's liability
  > cap against the internal policy's higher figure, the outreach history,
  > and three explicit conditions — made that true. The result: a high-risk
  > Accept Exception decision awaiting an authorised reviewer's approval.

### Step 7 — Create case and tasks (`/w/[workspace]/cases/[caseId]`)

- **Screen**: Case Detail (R8).
- **Copy**:
  > The Review Case links the liability-cap conflict, the missing insurance
  > certificate, the supporting evidence and the required follow-up actions
  > to Project Falcon.

### Step 8 — Approve a decision (`/w/[workspace]/decisions`)

- **Screen**: Decision Centre (R11).
- **Pinned element**: The Accept Exception Decision card.
- **Action**: Visitor clicks **Approve**, provides the required comment
  (high-risk decision), confirms.

### Step 9 — Observe dashboard changes (`/w/[workspace]/overview`)

- **Screen**: Leadership Overview (R4), `?lens=leadership`.
- **Copy**:
  > Switch to the Leadership lens. Open review cases and exceptions awaiting
  > approval reflect the single approval you just made.

### Step 10 — Full trace and switch scenarios

- **Screen**: Audit Explorer (R14), then the Adapt CTA in the shell. Tour
  ends here; the visitor may switch to another pack from `/demo` for the
  neutrality contrast (same copy pattern as the Asset Reliability script's
  Step 10): same object model — artifact, review, event, signal, case,
  decision, approval — different vocabulary ("obligation" instead of "case,"
  "party"/"jurisdiction" instead of "asset"/"location").

---

## Fixture data dependency note

Every value referenced in the Full Guided Demonstration above (asset
identifier ambiguity, the specific rule conditions, the resulting Decision)
must exist in the Asset Reliability pack's fixture set and expected-
extraction files (amendment A1) — this script does not invent data; it
narrates data that OIW-004a/OIW-004b are responsible for authoring. Where
this script names a specific outcome (e.g. "one field came back ambiguous"),
that is a requirement on the fixture author, not a description of an
existing fixture — flagged in `docs/agent-runs/OIW-003.md` as a dependency
for OIW-004b.

## Implementation note (OIW-602)

The demo fixture set's real repeat-fault/safety-critical rule conditions
(`related-event-count >= 2` for `repeated-fault-escalation`, plus a
safety-critical indicator for `safety-critical-removal-approval`) need more
than the single brake-fault message processed in isolation to fire
deterministically — the pack's real gold sequence (`docs/agent-runs/OIW-506.md`)
processes four other related artifacts about the same asset
(`asset-reliability-demo-002` through `-005`) alongside the brake-fault
message (`-001`). Steps 2–3 above still read as "process the informal
message" from the visitor's point of view: the guided tour (UX_SPEC §4)
pins that one artifact for the visitor to Process by hand, then — after the
visitor accepts the resulting review item — a real, non-fabricated
convenience action processes the four other related fixtures through the
same `processArtifact` path a manual click would use, so step 6's rule
trace and step 7's Case reflect real data without asking the visitor to
hunt through a 25-row inbox five times. See `apps/web/README.md`'s
"OIW-602 — dashboard wiring and guided tour" section.
