# Entities — Document Assurance Scenario Pack

One entry per named entity appearing across the smoke, demo, and edge
artifact sets. Grouped by entity_type.

---

## Party

### Vantage Logistics Partners
- **Entity type:** Party
- **Display name/ID:** Vantage Logistics Partners
- **Backstory:** A logistics services provider organised under the laws
  of the State of Ashford. The organisation's client for two separate
  agreements: the Project Falcon Master Services Agreement (active,
  current engagement) and an older, unrelated mutual NDA that predates
  Project Falcon. The two agreements are a deliberate source of
  ambiguity when either is referred to loosely as "the Vantage
  agreement."
- **Status:** Active client relationship (Project Falcon engagement).

### Consolidated Freight Underwriters
- **Entity type:** Party
- **Display name/ID:** Consolidated Freight Underwriters
- **Backstory:** An insurance underwriting vendor engaged by the
  organisation under a Master Vendor Agreement, currently operating
  under Service Order CFU-SO-2026-0033 to deliver a routine risk
  assessment package. Unrelated to Project Falcon.
- **Status:** Active vendor, routine engagement.

### Meridian Compliance Services
- **Entity type:** Party
- **Display name/ID:** Meridian Compliance Services
- **Backstory:** A compliance auditing firm organised under the laws of
  the State of Ashford. Engaged under a simple mutual NDA as a
  prospective auditing vendor; the relationship has produced no
  exceptions to date.
- **Status:** Active vendor, routine relationship, low activity.

---

## Document

### Project Falcon Master Services Agreement (VLP-FAL-2026-0142)
- **Entity type:** Document
- **Display name/ID:** demo-001 / VLP-FAL-2026-0142
- **Backstory:** The governing agreement for Project Falcon between the
  organisation and Vantage Logistics Partners, executed January 15,
  2026. Contains the quarterly compliance reporting obligation (Clause
  5.3), the insurance certificate obligation (Clause 6.2), the liability
  cap (Clause 8.2), and the precedence clause (Clause 12.1) that becomes
  central to the conflicting-provisions storyline.
- **Status:** Active, amended once (see Amendment No. 1).

### Amendment No. 1 to the Project Falcon MSA (VLP-FAL-2026-0142-A1)
- **Entity type:** Document
- **Display name/ID:** demo-008 / VLP-FAL-2026-0142-A1
- **Backstory:** A legitimate addendum executed May 12, 2026, moving the
  insurance certificate due date under Clause 6.2 from March 1, 2026 to
  May 1, 2026 in response to a broker-side policy consolidation. Leaves
  Clause 8.2 and Clause 12.1 unchanged.
- **Status:** Active, in force alongside the original MSA.

### Vantage Logistics Partners Mutual NDA (pre-Falcon)
- **Entity type:** Document
- **Display name/ID:** VLP-NDA-2024-0019 (referenced only; no dedicated
  artifact file in this pack)
- **Backstory:** An older, standalone mutual non-disclosure agreement
  between the organisation and Vantage Logistics Partners, executed in
  2024, entirely unrelated to Project Falcon. Its existence alongside
  the Project Falcon MSA is what makes references to "the Vantage
  agreement" genuinely ambiguous (see edge-003).
- **Status:** Active, unrelated to Project Falcon.

### Meridian Compliance Services Mutual NDA (MCS-NDA-2026-0007)
- **Entity type:** Document
- **Display name/ID:** smoke-001 / MCS-NDA-2026-0007
- **Backstory:** A simple two-year mutual confidentiality agreement
  executed January 10, 2026 between the organisation and Meridian
  Compliance Services. Single obligation, no issues to date.
- **Status:** Active, routine.

### Internal Data Handling Policy (POL-DH-009)
- **Entity type:** Document
- **Display name/ID:** demo-002 / POL-DH-009
- **Backstory:** An internal policy document, effective January 1, 2026,
  setting a $5,000,000 liability standard for data security incidents
  (Section 4.1). Referenced for operational guidance by engagement
  agreements, including the Project Falcon MSA, and sits at the center
  of the liability-cap conflicting-provisions discrepancy.
- **Status:** Active, internal.

### Internal Data Retention Policy (POL-RET-014)
- **Entity type:** Document
- **Display name/ID:** smoke-002 / POL-RET-014
- **Backstory:** A generic internal policy setting standard retention
  schedules for contracts, reports, correspondence, and reviewer notes.
  No conflicts or exceptions on file.
- **Status:** Active, internal, uneventful.

### Service Order CFU-SO-2026-0033
- **Entity type:** Document
- **Display name/ID:** smoke-007 / CFU-SO-2026-0033
- **Backstory:** A routine service order with Consolidated Freight
  Underwriters for a risk assessment package, with a single delivery
  deadline obligation.
- **Status:** Active, on track.

---

## Jurisdiction

### State of Ashford
- **Entity type:** Jurisdiction
- **Display name/ID:** State of Ashford
- **Backstory:** The fictional governing jurisdiction named in the
  Project Falcon MSA, its Amendment No. 1, and the Consolidated Freight
  Underwriters service order. Used consistently in place of any
  real-world state or country.
- **Status:** N/A (jurisdictional reference only).

---

## Project

### Project Falcon
- **Entity type:** Project
- **Display name/ID:** Project Falcon
- **Backstory:** The organisation's main logistics review and compliance
  monitoring engagement with Vantage Logistics Partners, governed by the
  MSA referenced above. The central storyline of the demo set: obligation
  tracking surfaces a missing insurance certificate and a conflicting
  liability-cap provision that escalates to a formally proposed and
  approved "accept exception" decision.
- **Status:** Active, with one open exception (approved) and one open
  collection item (insurance certificate).

### Project Harbor
- **Entity type:** Project
- **Display name/ID:** Project Harbor
- **Backstory:** A separate, unrelated engagement mentioned only in
  passing for cross-project coherence. Briefly and mistakenly conflated
  with Project Falcon's Clause 8.2 issue by an informal flag; the error
  is corrected in edge-004 without further developing Project Harbor's
  own storyline.
- **Status:** Active, out of scope for this pack beyond the passing
  references.

---

## Obligation

### Quarterly Compliance Reporting (MSA Clause 5.3)
- **Entity type:** Obligation
- **Display name/ID:** Project Falcon MSA Clause 5.3
- **Backstory:** Requires Vantage to have quarterly compliance reports
  delivered within thirty days of each quarter's end. First report due
  April 30, 2026; second due July 30, 2026 (delivered July 2, 2026).
- **Status:** Ongoing, met on time both quarters covered by this pack.

### Insurance Certificate Maintenance (MSA Clause 6.2, as amended)
- **Entity type:** Obligation
- **Display name/ID:** Project Falcon MSA Clause 6.2
- **Backstory:** Requires Vantage to maintain and submit a certificate
  of insurance, originally due March 1, 2026, amended to May 1, 2026 by
  Amendment No. 1. Remains unmet as of the second quarterly report
  (July 2, 2026), overdue relative to both the original and amended
  dates.
- **Status:** Outstanding, overdue.

### Liability Cap (MSA Clause 8.2)
- **Entity type:** Obligation
- **Display name/ID:** Project Falcon MSA Clause 8.2
- **Backstory:** Caps aggregate liability under the MSA, including for
  security incidents, at $2,000,000. Conflicts with the $5,000,000
  figure in Data Handling Policy Section 4.1. The subject of the
  approved "accept exception" decision (demo-011, demo-012).
- **Status:** Conflict formally accepted as an exception, scoped to
  Project Falcon only, pending the January 2027 policy review cycle.

### Data Security Incident Liability Standard (POL-DH-009 Section 4.1)
- **Entity type:** Obligation
- **Display name/ID:** POL-DH-009 Section 4.1
- **Backstory:** Sets a $5,000,000 liability standard for security
  incidents across engagements referencing the policy for operational
  guidance. Conflicts with Project Falcon MSA Clause 8.2 specifically.
- **Status:** Active as general policy; superseded by the accepted
  exception for Project Falcon specifically.

---

## Person

### Nadia Okonkwo
- **Entity type:** Person
- **Display name/ID:** Nadia Okonkwo
- **Backstory:** Review Owner, Review Operations. Signs the Project
  Falcon MSA and its amendment for the organisation, authors the
  quarterly compliance reports, identifies the liability-cap discrepancy,
  and formally proposes the "accept exception" decision.
- **Status:** Active, Review Owner for Project Falcon.

### Priya Deshmukh
- **Entity type:** Person
- **Display name/ID:** Priya Deshmukh
- **Backstory:** Senior Counsel, Vantage Logistics Partners. Signs the
  MSA and its amendment for Vantage; the primary legal contact for
  clarification requests, including the ambiguous insurance-date and
  liability-cap correspondence.
- **Status:** Active, Vantage's legal contact for Project Falcon.

### Marcus Ibori
- **Entity type:** Person
- **Display name/ID:** Marcus Ibori
- **Backstory:** Authorised Reviewer, Review Operations. Approves the
  proposed "accept exception" decision for the Project Falcon liability
  cap conflict, and separately corrects an erroneous flag that had
  conflated Clause 8.2 with Project Harbor.
- **Status:** Active, authorised reviewer.

### Elena Cho
- **Entity type:** Person
- **Display name/ID:** Elena Cho
- **Backstory:** Internal Reviewer, Review Operations, newer to the team.
  Appears in the ambiguous-entity email thread (edge-003), files an
  internal audit checklist with a conflicting due date (edge-002), and
  authors the inadequately-evidenced exception proposal (edge-007).
- **Status:** Active, internal reviewer.

### Tomas Reyes
- **Entity type:** Person
- **Display name/ID:** Tomas Reyes
- **Backstory:** Internal Reviewer, Review Operations, handles the
  routine Meridian Compliance Services and Consolidated Freight
  Underwriters relationships covered in the smoke set.
- **Status:** Active, internal reviewer.

### Dana Whitfield
- **Entity type:** Person
- **Display name/ID:** Dana Whitfield
- **Backstory:** Director of Client Engagements, Meridian Compliance
  Services. Primary external contact for the routine NDA relationship.
- **Status:** Active, external contact.

### Marcus Ellery
- **Entity type:** Person
- **Display name/ID:** Marcus Ellery
- **Backstory:** Account Manager, Consolidated Freight Underwriters.
  Signs the routine service order on Consolidated Freight Underwriters'
  behalf.
- **Status:** Active, external contact.
