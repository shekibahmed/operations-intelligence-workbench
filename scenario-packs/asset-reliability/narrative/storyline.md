# Storyline — Asset Reliability Scenario Pack

Chronological narrative across all 45 artifacts (9 smoke, 25 demo, 11
edge) at the Northgate Distribution Center, spanning 2026-01-08 through
2026-08-17. Organized by storyline (A-E), with smoke and edge artifacts
placed in time relative to the main storylines in the final section.

Each storyline section is written to support three readings at once, per
PRD §38: a leadership view (fleet risk and downtime), an operations view
(who did what, when, against what SLA), and a technical view (what
evidence and extraction each artifact yields as it moves from raw text to
structured record).

## Storyline A — A-142 repeat brake fault (primary demo arc)

This is the flagship arc: a recurring brake fault on forklift A-142
escalates from an informal complaint to a documented safety-critical
failure, ending in a formal hold-from-service decision. It mirrors the
PRD §13 trio of informal report → inspection → escalation.

- **demo-002** (2026-04-06) — Prior maintenance CSV. Ferrow Industrial
  Services technician Tobias Krantz replaces A-142's front and rear brake
  pads after a soft-pedal complaint, work order FIS-4471. Operationally,
  this is the baseline repair everything else measures against. From a
  leadership lens, this is the first (invisible, at the time) dollar and
  downtime signal on what becomes the fleet's top repeat-fault asset.
  Technically, this establishes the structured maintenance-history
  observation that later artifacts reference and that a system should be
  able to retrieve when scoring recurrence.

- **demo-001** (2026-05-18) — Informal fault message. Operator Dana Osei
  reports brake grinding and a spongy pedal on A-142 in Zone C, six weeks
  after the pad replacement. This is the informal report that should
  generate the first Observation and Operational Event for this episode.
  Operationally it is a low-friction channel (chat) that nonetheless
  carries safety-relevant content.

- **demo-003** (2026-05-21) — Inspection report (PDF-destined). Inspector
  Lena Fischer finds uneven pad wear and fluid weeping at a brake-line
  fitting, explicitly connects it to the April repair, and sets a
  follow-up SLA of 5 business days (by 2026-05-26). This is the artifact
  that should raise a Signal for repeat-fault pattern and elevate
  severity beyond the informal report alone.

- **demo-004** (2026-06-02) — Second fault occurrence, escalated
  severity. A different operator, Owen Vasquez, reports the brakes
  failing to hold on the yard ramp incline under load — "nearly rolled
  into the rack." This closes the repeat-fault loop (three
  brake-related events on one asset in under two months) and is the
  clearest safety-critical language in the pack.

- **demo-005** (2026-06-02) — Supervisor escalation email. Priya
  Nandakumar formally requests A-142 be held from service, citing the
  full history (demo-002, demo-001, demo-003, demo-004) in one place.
  This is the artifact that should drive Case creation and a
  Decision/Approval requirement before any return-to-service action.

- **demo-006** (2026-06-03) — Manual repair-update text. Marcus Ibe
  confirms A-142 is towed in, tagged out of service, and assigned for a
  full diagnostic; explicitly states it is not to return to the floor
  without sign-off. This is the artifact that should close the loop on
  the hold-from-service instruction and set the asset's operating status
  ahead of any downstream approval.

Leadership framing: A-142 becomes the pack's highest-downtime,
highest-severity asset (confirmed later in demo-025's fleet rollup).
Operations framing: three days elapse between the ramp incident
(demo-004/005) and the asset being physically tagged out (demo-006) — a
concrete SLA data point. Technical framing: this arc alone exercises
observation extraction from chat, CSV, PDF-style report, formal email,
and free-text repair log, plus repeat-fault signal detection and
approval-gating logic.

## Storyline B — A-210/A-211 conveyor belt slippage

A moderate-severity, non-safety repeat-fault pattern that also
demonstrates cross-asset reasoning via shared install batch.

- **demo-007** (2026-03-10) — Informal message. Warehouse lead reports
  intermittent belt slippage on A-210 under load.
- **demo-008** (2026-03-10) — Maintenance CSV. Same-day belt tension
  adjustment by Marcus Ibe, resolved.
- **demo-009** (2026-03-16) — Inspection report. Tension holding, but
  belt wear (glazing, edge fraying) is approaching replacement threshold;
  inspector cross-references A-211 (same 2021-06-01 install batch) and
  recommends a preventive check even though A-211 has no reported issues.
- **demo-010** (2026-03-24) — Second informal message, ~2 weeks after
  demo-008. Slippage recurs at the same spot; the earlier tension
  adjustment did not hold.
- **demo-011** (2026-03-27) — Service-provider email. Coastal Fleet
  Maintenance (Carla Jimenez) quotes a full belt replacement rather than
  another adjustment, citing the wear description from demo-009.

Leadership framing: a lower-severity but still budget-relevant repeat
fault — the fix-and-recur pattern is exactly what a fleet risk view
should surface even without a safety angle. Operations framing: the
14-day gap between demo-008 and demo-010 demonstrates a repeat-fault
window shorter than the routine PM interval. Technical framing: this arc
is the pack's clearest test of cross-asset linkage (A-210 to A-211) via
shared install-batch metadata rather than shared fault history.

## Storyline C — A-301/A-302 dock leveler hydraulic leak

A slower-moving, lower-urgency arc showing a temporary fix explicitly
flagged as non-permanent, plus a preventive cross-reference to a sibling
asset.

- **demo-012** (2026-02-05) — Informal message. Receiving staff (Dana
  Osei) spots a fresh hydraulic fluid puddle under dock leveler A-301.
- **demo-013** (2026-02-06) — Manual repair-update text. Marcus Ibe finds
  a cylinder seal weep and applies a temporary sealant patch, explicitly
  noting it is not a real fix.
- **demo-014** (2026-02-11) — Inspection report. Patch is holding but is
  called out as temporary; recommends full cylinder replacement within
  30 days and flags sibling asset A-302 (same model, same install date)
  for a preventive inspection.
- **demo-015** (2026-02-13) — Maintenance CSV. Cylinder-replacement work
  order for A-301 scheduled for 2026-03-10, within the 30-day window.

Leadership framing: a contained, well-managed risk — useful as a
counterexample to A-142 when demonstrating that not every fault escalates
to a hold-from-service decision. Operations framing: a clean
temporary-fix-to-scheduled-repair chain with an explicit SLA (30 days)
that the CSV work order satisfies. Technical framing: tests whether a
system correctly treats "temporary patch, holding" as distinct from
"resolved," and correctly proposes a preventive action on a sibling asset
that has no fault of its own.

## Storyline D — A-501 generator overheating (conflicting operating status)

A deliberate test of status contradiction: an artifact recorded as
"resolved" is directly contradicted by a later inspection.

- **demo-016** (2026-04-14) — Informal message. Marcus Ibe reports A-501
  shutting down on an overheat alarm during a routine monthly backup-power
  test.
- **demo-017** (2026-04-15) — Manual repair-update text. Coolant topped
  up, no further alarm during a 20-minute test; status explicitly set to
  OPERATIONAL and the issue logged as resolved.
- **demo-018** (2026-04-29) — Inspection report, ~2 weeks after demo-017.
  Coolant is low again and radiator fins are bent/blocked, which the
  report explicitly states contradicts the prior "resolved" status — the
  top-up masked the symptom rather than fixing the cause.
- **demo-019** (2026-05-04) — Supervisor email. Priya Nandakumar flags
  A-501 as a backup-power risk ahead of a facility audit specifically
  because the recorded status doesn't match the inspection findings.

Leadership framing: this is the pack's clearest "don't trust the
last-recorded status" story — exactly the kind of gap a facility audit
would catch, and exactly what an accountable operational record should
prevent. Operations framing: two weeks separate the "resolved" record
from the contradiction being found, a realistic window for a masked fault
to resurface. Technical framing: demo-017 and demo-018 are a deliberately
constructed conflicting-status pair — both are internally consistent on
their own, and only contradict each other when compared, which is
precisely the reconciliation a Signal/Case layer should perform.

## Storyline E — A-520 compressor refrigerant leak and fleet rollup

A parallel repeat-fault arc that resolves cleanly, plus a cross-cutting
rollup artifact that ties the whole pack together for a leadership view.

- **demo-020** (2026-07-06) — Informal message. Marcus Ibe reports A-520
  tripping its breaker for the third time in a week.
- **demo-021** (2026-07-06) — Maintenance CSV. Same-day breaker reset and
  refrigerant top-up, explicitly logged as a temporary measure pending a
  leak diagnostic.
- **demo-022** (2026-07-10) — Inspection report. Refrigerant already
  reading low again after four days, pointing to a slow leak; inspector
  cross-references A-501 (same 2021-02-01 mechanical install batch) as a
  second unit from that batch showing a slow fluid-loss pattern this
  year — a reference to Storyline D's finding, not a contradiction of it.
- **demo-023** (2026-07-17) — Service-provider email. Ferrow Industrial
  Services (Tobias Krantz) confirms a slow leak at a corroded discharge
  fitting via leak test.
- **demo-024** (2026-07-21) — Manual repair-update text. Fitting
  replaced, post-repair leak check clean, A-520 returned to service.
- **demo-025** (2026-08-17) — Maintenance CSV, six-month fleet rollup
  (2026-02-01 through 2026-07-31). Ranks A-142, A-210, and A-501 as the
  top three repeat-fault assets fleet-wide by downtime and recurrence,
  explicitly tying Storylines A, B, and D together for a leadership
  summary; A-520 and A-301 appear as lower-ranked but still-notable
  entries.

Leadership framing: demo-025 is the pack's dedicated leadership artifact
— a single rollup that should be derivable from (and cross-checkable
against) every other Storyline A/B/D artifact's downtime and recurrence
data. Operations framing: A-520's arc is a model resolution — temporary
fix, diagnostic, vendor confirmation, permanent fix, all within about two
weeks — a useful contrast to A-142's unresolved arc. Technical framing:
demo-022's cross-reference to A-501 is a same-category-different-system
link (fitting/seal degradation pattern across an install batch) that
should not be conflated with an actual shared fault.

## Smoke and edge artifacts — placement in time

Smoke artifacts are simple, independent, single-asset artifacts
interspersed throughout the timeline as routine background activity.
Edge artifacts are placed close to related storyline events where that
proximity is what creates the hazard being tested (e.g., ambiguity,
duplication), and otherwise spread through the year.

| Date | Artifact | Context |
|---|---|---|
| 2026-01-08 | edge-001 | Missing-identifier fault report, precedes any named-asset activity that week. |
| 2026-01-15 | smoke-001 | A-118 horn fault (routine, resolved later by edge-002). |
| 2026-01-20 | smoke-002 | A-127 routine oil/filter change, work order NG-WO-10412. |
| 2026-01-21 | edge-011 | Near-duplicate CSV of smoke-002's service event, different work order number (NG-WO-10413) and minor wording differences. |
| 2026-01-25 | smoke-003 | A-211 routine quarterly inspection, no defects — baseline before demo-009 later flags it for a preventive check. |
| 2026-01-30 | edge-002 | Conflicting-dates CSV closing out smoke-001's horn fault on A-118 (completion date recorded earlier than the report date). |
| 2026-02-02 | smoke-004 | Coastal Fleet Maintenance confirms routine A-302 hinge lubrication, independent of the later demo-014 preventive-inspection flag. |
| 2026-02-05 to 2026-02-13 | demo-012 – demo-015 | Storyline C (A-301/A-302). |
| 2026-02-18 | smoke-005 | A-405 HVAC filter replacement, routine. |
| 2026-03-02 | smoke-006 | A-163 tail-light fault, routine, precedes edge-007's unrelated structural flag on the same asset. |
| 2026-03-05 | edge-008 | Spanish-language brake-noise report on A-127, unresolved in this artifact set. |
| 2026-03-10 to 2026-03-27 | demo-007 – demo-011 | Storyline B (A-210/A-211). |
| 2026-04-06 | demo-002 | Storyline A prior repair (chronologically first Storyline A artifact). |
| 2026-04-14 to 2026-05-04 | demo-016 – demo-019 | Storyline D (A-501). |
| 2026-04-20 | edge-009 | Low-quality/garbled-OCR routine quarterly inspection text for A-118. |
| 2026-05-10 | edge-007 | High-risk, thin-evidence structural-crack flag on A-163. |
| 2026-05-18 | demo-001 | Storyline A informal fault report on A-142. |
| 2026-05-18/19 | edge-005 | Exact duplicate resend of demo-001. |
| 2026-05-19 | edge-003 | Ambiguous "A-14_" brake complaint (A-142 vs A-140). |
| 2026-05-21 | demo-003 | Storyline A inspection report. |
| 2026-06-02 to 2026-06-03 | demo-004 – demo-006 | Storyline A escalation and hold-from-service. |
| 2026-06-05 | edge-006 | Prompt-injection-style message pushing for A-142's premature return to service. |
| 2026-06-05 | smoke-007 | A-520 routine scheduled maintenance, no issues — baseline shortly before Storyline E begins. |
| 2026-07-01 | smoke-008 | A-156 annual inspection, passed, with a minor advisory note on brake pad thickness. |
| 2026-02-20 | smoke-009 | Automated BMS sensor-gateway JSON reading confirms normal filter differential pressure on A-405, two days after smoke-005's filter replacement. |
| 2026-07-06 to 2026-08-17 | demo-020 – demo-025 | Storyline E (A-520 and fleet rollup). |
| 2026-07-15 | edge-004 | Negated-statement inspection on A-156, explicitly not confirming the smoke-008 advisory note as a defect. |
| 2026-08-03 | edge-010 | Same-day conflicting operating status for A-127 (in service vs. out of service). |

All 45 artifact IDs appear above: smoke-001 through smoke-009,
demo-001 through demo-025, and edge-001 through edge-011.
