# Entities — Process Exceptions Scenario Pack

One entry per named entity referenced across the smoke, demo, and edge artifact
sets. Grouped by entity type.

## Site

- **Rivermill Processing Plant** — fictional bulk-materials processing
  facility. Deliberately generic industrial process (mixing, filling,
  packaging), not tied to a specific real industry. Status: active.

## Lines

- **Line 1 (Mixing)** — primary mixing line; produces the base compound
  batches later filled and packaged downstream. Operated by Tomas Reyes on
  Shift A. Status: active.
- **Line 2 (Filling)** — filling line; fills mixed compound into containers.
  Operated by Ingrid Halvorsen on Shift A. Status: active.
- **Line 2B** — sub-line of Line 2, used for small-format/mini-bottle SKU
  runs. Shares supervision, physical area, and shift crew with Line 2, which
  is what makes references to "Line 2" occasionally ambiguous as to whether
  the main line or the 2B head is meant. Status: active.
- **Line 3 (Packaging)** — packaging line, downstream of Line 2; cartons and
  ships finished product. Status: active.

## Shifts

- **Shift A (Day)** — day shift, the shift most artifacts in this pack are
  drawn from.
- **Shift B (Night)** — night shift.
- **Shift C (Weekend)** — weekend shift; named for completeness, not directly
  featured in this reduced-volume pack's artifacts.

## Products

- **Compound RM-12** — standard Line 1 mix product; batch B-2101 is an
  instance. Unrelated to the KM-LOT-448 incident.
- **Compound RM-18** — Line 3 packaging product; batch B-2110 is an instance.
- **Compound RM-24** — the mix product implicated in the supplier-lot
  incident; batches B-2190, B-2205, and B-2210 are all instances, all run
  against Kestrel Materials Co. binder.
- **Compound RM-09** — Line 2 filling product; batch B-2211 is an instance,
  part of an unrelated minor thread.

## Batches

- **B-2101** — routine Compound RM-12 batch, Line 1, run on Kestrel lot
  KM-LOT-401. Released without incident (smoke-002). Also reused in two edge
  cases (edge-002, edge-007) as the basis for artifact-level data-quality
  hazards unrelated to its own production history. Status: released.
- **B-2110** — routine Compound RM-18 batch, filled on Line 2 and packaged on
  Line 3, run on Drayton lot DR-LOT-220. Released without incident. Status:
  released.
- **B-2190** — earlier Compound RM-24 batch, run on Kestrel lot KM-LOT-448 in
  early January 2026. Showed a viscosity deviation similar in character to
  the later B-2205/B-2210 deviations, but investigation found the actual
  cause was a drifted mixer temperature probe — explicitly ruled out as
  supplier-related. Status: closed, root cause found (not supplier-linked).
- **B-2205** — Compound RM-24 batch, Line 1, run on Kestrel lot KM-LOT-448.
  Showed an 8.2% viscosity deviation affecting 4,200 units; the first batch
  in the escalating supplier-lot storyline. Status: on hold, pending
  disposition as of the storyline's close.
- **B-2210** — Compound RM-24 batch, Line 1, next batch run on Kestrel lot
  KM-LOT-448 after B-2205. Showed a 7.6% viscosity deviation affecting 3,800
  units, confirming a repeat pattern on the same lot. Status: on hold,
  pending disposition as of the storyline's close.
- **B-2211** — Compound RM-09 batch, Line 2, run on Drayton lot DR-LOT-220.
  Minor fill-weight drift, corrected same shift and released — a resolved
  thread shown in contrast to the escalating Line 1 story. Status: released.

## Suppliers

- **Kestrel Materials Co.** — supplies the binder raw material used in
  Compound RM-24 (and others) at Rivermill. Lot KM-LOT-448 from this supplier
  is the subject of the pack's central escalation; lot KM-LOT-401 from the
  same supplier is unrelated and uneventful, underscoring that the concern is
  lot-specific, not a blanket supplier issue.
- **Drayton Supply Partners** — supplies packaging materials (caps, cartons)
  used on Line 2 and Line 3. Lot DR-LOT-220 appears repeatedly across
  artifacts with no issues; included for landscape completeness and to give
  the pack more than one supplier.

## Supplier Lots

- **KM-LOT-448 (Kestrel Materials Co.)** — binder lot linked to viscosity
  deviations on B-2205 and B-2210, and the subject of Priya Nandakumar's
  formal hold request (demo-009). Status: under investigation, hold
  requested pending root cause.
- **KM-LOT-401 (Kestrel Materials Co.)** — earlier, unrelated Kestrel lot.
  No deviations recorded against it in this pack. Status: normal, closed.
- **DR-LOT-220 (Drayton Supply Partners)** — packaging materials lot. No
  issues recorded. Status: normal.

## People

- **Tomas Reyes** — Line 1 (Mixing) operator, Shift A. First to notice and
  flag the B-2205 viscosity trend, and the one who catches the same pattern
  starting on B-2210 the next day. Status: active.
- **Ingrid Halvorsen** — Line 2 (Filling) operator, Shift A. Handles routine
  calibration work and the unrelated minor B-2211 fill-weight thread; also
  the author of the ambiguous Line 2 / Line 2B shift report. Status: active.
- **Priya Nandakumar** — shift supervisor. Logs the resolved inventory
  overage in the smoke set, closes out B-2190's root cause as unrelated to
  KM-LOT-448 in the edge set, then drives the escalation in the demo set from
  root-cause request through the formal hold request on all KM-LOT-448
  output. Status: active. (Name is reused across other OIW scenario packs
  for different individuals; this entity is self-contained to Process
  Exceptions.)
- **Owen Bracewell** — QC lead. Reviews and dispositions QC test results
  across the pack, from routine tolerance checks to the KM-LOT-448 holds.
  Status: active.
