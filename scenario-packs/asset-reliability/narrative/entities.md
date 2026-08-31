# Entities — Asset Reliability Scenario Pack

Synthetic entity roster for the Northgate Distribution Center narrative
set. All entities are fictional. Grouped by entity_type.

## Asset

**A-142** — Talbrook TF-40 electric forklift, Zone C (Shipping). Installed
2022-03-14 (procurement batch NG-2022-FLEET-01, same batch as A-156). This
is the primary demo asset: a recurring brake fault escalates from a soft
pedal complaint through a failed follow-up repair to a safety-critical
brake failure on the yard ramp, ending with the unit held from service
pending review. Status: Out of Service (held pending decision as of
2026-06-03).

**A-118** — Talbrook TF-40 electric forklift, Zone A (Receiving). Installed
2021-11-02 (procurement batch NG-2021-FLEET-02, same batch as A-127).
Minor horn fault resolved by fuse replacement. Status: Operational.

**A-127** — Talbrook TF-40 electric forklift, Zone B (Storage High-Bay).
Installed 2021-11-02 (same batch as A-118). Routine oil/filter history;
also the subject of a same-day conflicting operating-status edge case and
a Spanish-language brake-noise report. Status: Operational (contested —
see edge-010).

**A-140** — Talbrook TF-42 electric forklift, Zone B (Storage High-Bay).
Installed 2023-01-09. Used only in the ambiguous-entity-reference edge
case, where a smudged tag makes it genuinely indistinguishable from A-142
in an operator's message. Status: Operational.

**A-156** — Talbrook TF-40 electric forklift, Zone C (Shipping). Installed
2022-03-14 (same batch as A-142). Passed its annual inspection with a
minor advisory note on brake pad thickness; a follow-up inspection later
explicitly finds no wear and does not confirm the advisory as a defect.
Status: Operational.

**A-163** — Talbrook TF-40 electric forklift, Yard. Installed 2020-08-20,
the oldest forklift in the fleet. Minor tail-light fault; also the subject
of a high-risk, thinly-evidenced structural-crack inspection flag on the
overhead guard. Status: Operational (structural concern flagged but
unconfirmed, pending proper measurement).

**A-210** — Meridian CB-200 belt conveyor, Zone B (Storage High-Bay),
induction line 1. Installed 2021-06-01 (install batch NG-2021-CONV-01,
same batch as A-211). Repeat belt-slippage pattern: a tension adjustment
does not hold, wear is found approaching replacement threshold, slippage
recurs, and a full belt replacement is quoted. Status: Operational
(replacement pending scheduling).

**A-211** — Meridian CB-200 belt conveyor, Zone B (Storage High-Bay),
induction line 2. Installed 2021-06-01 (same batch as A-210). Passed a
routine quarterly inspection with no defects before A-210's wear pattern
emerged; later flagged for a preventive belt-wear check because of its
shared install batch with A-210. Status: Operational.

**A-301** — Corvale DL-15 hydraulic dock leveler, Zone A (Receiving), bay
3. Installed 2020-05-15 (same model/age as A-302). A hydraulic cylinder
seal weep is temporarily patched and a full cylinder replacement is
scheduled. Status: Operational (temporary patch in place, replacement
scheduled).

**A-302** — Corvale DL-15 hydraulic dock leveler, Zone A (Receiving), bay
4. Installed 2020-05-15 (same model/age as A-301). Routine hinge
lubrication completed with no issues found; later flagged for a
preventive hydraulic cylinder inspection because of its shared model/age
with A-301. Status: Operational.

**A-405** — BrightAir RTU-9 rooftop HVAC unit, Maintenance Bay. Installed
2019-09-10. Routine filter replacement, no other issues. Status:
Operational.

**A-501** — Sterling GEN-150 diesel backup generator, Yard. Installed
2021-02-01 (mechanical install batch NG-2021-MECH-YARD/MB, same batch as
A-520). An overheat shutdown is logged as resolved after a coolant
top-up, but a follow-up inspection finds coolant low again and radiator
fin damage, directly contradicting the earlier "resolved" status. Flagged
as a backup-power risk ahead of a facility audit. Status: Operational
(disputed — cooling system findings contradict prior resolution).

**A-520** — Arkwell AC-60 refrigerant compressor, Maintenance Bay.
Installed 2021-02-01 (same install batch as A-501). Repeated breaker
trips traced to a slow refrigerant leak at a corroded line fitting;
fitting replaced and unit returned to service. Status: Operational
(fitting replaced 2026-07-21, monitoring ongoing).

## Component

**Brake assembly (A-142)** — front and rear brake pads and hydraulic
brake lines. Replaced 2026-04-06 by Ferrow Industrial Services after a
soft-pedal complaint; shows uneven wear and line weeping within six
weeks, then fails to hold on an incline.

**Hydraulic lift cylinder (A-142)** — mast lift cylinder, noted for
fluid weeping at a fitting during the 2026-05-21 follow-up inspection.

**Drive motor (A-142 / A-118 / A-127 / A-156)** — standard Talbrook TF-40
drive motor, unremarkable across most units; not implicated in the A-142
brake fault.

**Brake assembly (A-156)** — subject of a minor advisory note (pad
thickness on the lower end of normal range) at the 2026-07-01 annual
inspection, later explicitly cleared as showing no further wear.

**Brake assembly (A-127)** — subject of an informal brake-noise report
written in Spanish (edge case); no corrective artifact exists in this
set.

**Brake assembly (A-140)** — implicated only in the ambiguous smudged-tag
edge case; genuinely unclear whether the soft-pedal report belongs to
A-140 or A-142.

**Conveyor belt (A-210)** — Meridian CB-200 drive belt, installed
2021-06-01. Re-tensioned once, found to have glazing and edge fraying,
slips again, and is ultimately quoted for full replacement.

**Conveyor belt (A-211)** — same install batch as A-210's belt; passed a
routine quarterly inspection with no defects, later flagged for a
preventive wear check.

**Drive chain (A-163)** — standard Talbrook TF-40 drive chain component,
unremarkable; not implicated in any fault in this set.

**Dock-leveler hydraulic cylinder/seal (A-301)** — original cylinder,
installed 2020-05-15. Develops a seal weep, is temporarily patched with
sealant, and is recommended for full replacement within 30 days.

**Dock-leveler hydraulic cylinder/seal (A-302)** — same model/age as
A-301's cylinder; no leak symptoms, but flagged for a preventive
inspection given A-301's failure.

**Control board (A-405 / A-210 / A-163)** — standard control boards
across HVAC and conveyor assets; inspected as part of routine checks,
no defects found in this set.

**Refrigerant compressor/fitting (A-520)** — Arkwell AC-60 compressor and
discharge-line fitting. Slow refrigerant leak traced to a corroded
fitting; fitting replaced 2026-07-21.

**Radiator/coolant system (A-501)** — Sterling GEN-150 cooling system.
Coolant topped up once (temporary fix), then found low again alongside
bent/blocked radiator fins, contradicting the earlier "resolved" status.

## Location

**Zone A (Receiving)** — Northgate Distribution Center receiving dock
area, includes dock bays 1-4. Home to A-118 and dock levelers A-301/A-302.

**Zone B (Storage High-Bay)** — high-bay storage and induction area. Home
to A-127, A-140, A-210, and A-211.

**Zone C (Shipping)** — outbound shipping dock area. Home to A-142 and
A-156.

**Maintenance Bay** — internal repair and equipment bay. Home to A-405
and A-520; also where pulled units such as A-142 are moved for
diagnostic work.

**Yard** — outdoor vehicle and equipment yard, includes the yard ramp
connecting to Zone C. Home to A-163 and A-501.

## Person

**Dana Osei** — forklift operator, primarily working Zone A and Zone C.
First to report both the A-118 horn fault and the initial A-142 brake
complaint.

**Priya Nandakumar** — shift supervisor, Northgate Distribution Center.
Escalates safety-critical issues (A-142 brake failure, A-501 cooling
contradiction) via formal email and coordinates across zones.

**Marcus Ibe** — maintenance technician, Northgate Facilities. Performs
most first-line repairs and temporary fixes (A-405 filter, A-301 seal
patch, A-501 coolant top-up, A-520 breaker reset, final A-142 diagnostic
assignment).

**Lena Fischer** — inspector, Northgate Facilities. Author of all
inspection reports in this set; recurring role connecting fault reports
to formal findings and recommendations across every storyline.

**Owen Vasquez** — forklift operator, second operator referenced in the
roster. Reports the safety-critical A-142 brake failure on the yard ramp
and, separately, the ambiguous smudged-tag brake complaint.

**Tobias Krantz** — technician, Ferrow Industrial Services. Performs the
original A-142 brake pad replacement, the A-301 cylinder replacement
work order, and the A-520 leak test and fitting repair.

## Vendor / Organization

**Northgate Facilities** — internal maintenance and inspection team at
Northgate Distribution Center. Employs Marcus Ibe (technician) and Lena
Fischer (inspector); Priya Nandakumar (shift supervisor) coordinates with
them on escalations.

**Ferrow Industrial Services** — external service vendor specializing in
mobile equipment (forklifts) and mechanical/refrigeration repair.
Technician Tobias Krantz performs brake, hydraulic, and refrigerant work
across multiple storylines.

**Coastal Fleet Maintenance** — external service vendor specializing in
dock equipment and conveyor systems. Represented by service coordinator
Carla Jimenez in correspondence; performs the A-302 hinge lubrication and
quotes the A-210 belt replacement.
