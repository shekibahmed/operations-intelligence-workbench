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
- **Action**: Visitor selects a different pack; tour ends here (each pack's
  own guided path, if any, is out of P0 scope beyond the leadership-only
  outlines below).

---

## Leadership-Only Outline — Process Exception Management

Per amendment A7: packs two and three carry a **Leadership tour only** in
P0, not the full step-by-step above. This outline is intentionally shorter.

1. **Select the pack** (`/demo` → `/demo/process-exception-management`) —
   problem statement: convert shift reports, quality records, production
   notes and operational deviations into structured exception cases (PRD
   §12.2).
2. **Leadership Overview** (`/w/[workspace]/overview?lens=leadership`) —
   arrive directly here (no inbox-first guided path for this pack in P0).
   Point out: Open Exceptions stat, Exceptions-by-process-stage severity
   breakdown, repeated-deviation-rate trend, output-awaiting-decision SLA
   table, pending approvals card.
3. **One example decision** (`/w/[workspace]/decisions`) — show a single
   pre-existing "hold affected output" Decision (PRD §12.2 example approval)
   with its rationale and required supervisor approval, without walking the
   full artifact→review→event→signal chain.
4. **Contrast callout** — same copy pattern as Full Script Step 10: same
   object model, different vocabulary ("exception" instead of "reliability
   case," "batch"/"line"/"shift" instead of "asset"/"component").

## Leadership-Only Outline — Document Assurance

1. **Select the pack** (`/demo` → `/demo/document-assurance`) — problem
   statement: convert policies, contracts, compliance documents and
   checklists into tracked obligations, exceptions and review cases (PRD
   §12.3).
2. **Leadership Overview** (`/w/[workspace]/overview?lens=leadership`) —
   point out: Open Obligations stat, Exceptions-by-risk severity breakdown,
   due-date-exposure SLA table, reviews-awaiting-approval pending-approvals
   card, missing-evidence-count callout (text/impact card).
3. **One example decision** (`/w/[workspace]/decisions`) — show a single
   pre-existing "accept exception" Decision (PRD §12.3 example approval)
   requiring an authorised reviewer's approval.
4. **Contrast callout** — same pattern: "obligation" instead of "case,"
   "party"/"jurisdiction" instead of "asset"/"location."

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
