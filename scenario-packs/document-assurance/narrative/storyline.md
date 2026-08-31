# Storyline — Document Assurance Scenario Pack

This narrative connects all 28 artifacts in the pack (9 smoke, 12 demo,
7 edge) in rough chronological order across 2026. It is written to
support three tellings at once: a leadership telling (obligation and
risk exposure), an operations telling (who did what, when, and how it
routed through review), and a technical telling (what evidence each
artifact contributes to the pipeline).

## Act 0 — Routine baseline (smoke set)

Before Project Falcon begins in earnest, Review Operations is already
running two quiet, uneventful vendor relationships that establish what
"normal" looks like in this pack.

On January 10, 2026, the organisation and Meridian Compliance Services
execute a simple two-year mutual NDA (**smoke-001**), witnessed by
internal reviewer Tomas Reyes. The organisation's generic internal data
retention policy (**smoke-002**) is already in force as background
context, unrelated to any specific vendor. Tomas runs Meridian through a
standard vendor onboarding checklist (**smoke-003**), which comes back
fully complete. Operationally, this is the shape a clean intake should
take: agreement executed, checklist complete, no gaps.

At the end of Q1, Tomas issues a routine quarterly compliance report
for the Meridian relationship (**smoke-004**) finding no exceptions,
and logs a matching sign-off reviewer note (**smoke-006**). In between,
a one-day email exchange with Meridian's Dana Whitfield (**smoke-005**)
confirms the NDA's renewal date with no ambiguity and no follow-up
needed — the model case for a clarification that resolves cleanly.

Separately, Tomas also manages the organisation's routine underwriting
vendor, Consolidated Freight Underwriters, issuing a service order with
a single delivery-deadline obligation (**smoke-007**) and later running
it through a vendor requalification checklist (**smoke-008**) that
closes out fully complete. A day later, the Compliance Tracker's
automated export confirms the delivery-deadline obligation from
smoke-007 was met, evidence on file, no reviewer action required
(**smoke-009**) — a machine-generated JSON snapshot alongside this
pack's human-authored documents and correspondence. Technically, this
pair of relationships should generate observations and events with no
signals, no case escalation, and no decisions — the negative control
against which the Project Falcon storyline's escalations should stand
out.

## Act 1 — Project Falcon begins (demo-001 through demo-003)

On January 15, 2026, Nadia Okonkwo, Review Owner, signs the Project
Falcon Master Services Agreement with Vantage Logistics Partners
(**demo-001**, ref VLP-FAL-2026-0142), countersigned by Vantage's
Senior Counsel, Priya Deshmukh. From a leadership perspective, this
agreement is where Project Falcon's risk exposure is defined up front:
Clause 5.3 sets a quarterly compliance-reporting cadence, Clause 6.2
requires an annually-renewed insurance certificate, Clause 8.2 caps
aggregate liability (including for security incidents) at $2,000,000,
and Clause 12.1 states that the agreement governs over internal policy
in the event of a conflict — a clause that will matter a great deal
later.

Unbeknownst to anyone reading the MSA in isolation, the organisation's
own internal Data Handling Policy (**demo-002**, POL-DH-009), already
in force since January 1, 2026, sets a different liability figure —
$5,000,000 — for security incidents in Section 4.1. Technically, this
is the seed of the conflicting-provisions discrepancy: two documents,
each internally consistent, stating incompatible numbers for what looks
like the same kind of claim.

Operationally, Nadia's team builds a Project Falcon onboarding checklist
(**demo-003**) in early February tracking every MSA obligation. Most
items close out quickly, but two are left open: the insurance
certificate (not yet due) and a liability-provision cross-check against
internal policy — the very check that will surface the conflict a few
months later.

## Act 2 — The insurance certificate goes missing (demo-004 through demo-005)

As the March 1, 2026 insurance certificate deadline approaches, Nadia
emails Priya Deshmukh to confirm the renewal date (**demo-004**). Priya's
reply is genuinely non-committal — a policy consolidation with the
broker means the date could land "right around the 1st or could slip a
little," with no locked date given. Operationally this is a clarification
request that does *not* resolve cleanly, unlike the smoke-set precedent.

By the time the first quarterly compliance report is due, the
certificate still has not arrived. Nadia's Q1 report (**demo-005**,
issued April 28, 2026, ahead of the April 30 deadline set by Clause 5.3)
flags the insurance certificate as missing supporting evidence — a
concrete missing-evidence signal, filed as a documentation gap rather
than a substantive failure at this stage.

## Act 3 — The liability-cap conflict surfaces (demo-006 through demo-007)

On May 3, 2026, while finally working through the deferred
liability-provision cross-check from the onboarding checklist, Nadia
identifies the conflict directly: MSA Clause 8.2's $2,000,000 cap
against Data Handling Policy Section 4.1's $5,000,000 standard
(**demo-006**). She explicitly names both figures and flags the issue
as unresolved, noting that the MSA's own precedence clause (12.1)
points toward the contract figure controlling, while the policy's own
applicability language (Section 5.1) just defers back to the agreement
without settling anything.

Nadia raises this with Priya Deshmukh directly (**demo-007**, May 5 and
May 8, 2026). Priya's reply — "the contract governs" — sounds decisive
but, read carefully, never actually confirms whether that means Clause
8.2's $2,000,000 figure specifically. Nadia's follow-up asking for that
exact confirmation goes unanswered in this thread. Technically, this is
the deliberately ambiguous reply that a system should not over-read as
a resolution.

## Act 4 — A legitimate amendment complicates the picture (demo-008 through demo-009)

On May 12, 2026, the parties execute Amendment No. 1 to the MSA
(**demo-008**), moving the insurance certificate due date from March 1
to May 1, 2026 to accommodate the broker's policy consolidation. This is
a legitimate, deliberate change — not an error — but it means anyone
reading only the original MSA text without the amendment would use the
wrong due date going forward. Clause 8.2 and Clause 12.1 are explicitly
untouched by the amendment.

By May 20, 2026, the updated Project Falcon checklist (**demo-009**)
shows the insurance item still outstanding — now overdue relative to the
*amended* May 1 date, not just the original March 1 date — and the
liability cross-check still unresolved. Operationally, both open items
from Act 1's checklist have now hardened into active problems.

## Act 5 — Escalation to a Decision (demo-010 through demo-012)

The second quarterly report (**demo-010**, issued July 2, 2026, again
ahead of its Clause 5.3 deadline) finds both issues unresolved after a
full additional quarter: the insurance certificate now more than sixty
days overdue against the amended date, and the liability-cap conflict
still unconfirmed by Vantage. For leadership, this is the point where a
tracked obligation gap becomes a risk-exposure decision: the report
recommends an "accept exception" pathway for the liability-cap conflict
specifically, while explicitly keeping the insurance certificate as an
active collection item rather than folding it into the exception.

On July 8, 2026, Nadia formally proposes the exception (**demo-011**),
citing both figures, the outreach history with Priya, and three explicit
conditions: scoped to Project Falcon only, tied to the January 2027
policy review cycle, and excluding the insurance certificate. Because of
the liability exposure involved, this proposal requires sign-off from an
authorised reviewer.

The approval closes out in an internal email thread (**demo-012**,
July 10-12, 2026) between Nadia and Marcus Ibori, Authorised Reviewer,
who reviews the note and approves on the stated conditions. In the same
thread, Nadia asks an unrelated, in-passing question about who currently
owns Project Harbor — establishing that Project Harbor exists as a
separate, live engagement without developing it further here.

## Act 6 — Edge cases, threaded around and after the main storyline

The edge-case artifacts are not a fourth act in sequence so much as
seven deliberate hazards planted at different points relative to the
main storyline, each testing a specific failure mode:

- **edge-001** is a Q2 2026 compliance report that never names its
  underlying contract, project, or reference number at all — a
  missing-identifier hazard that could belong to any of the pack's
  agreements.
- **edge-002** is a June 2026 internal audit checklist for Project
  Falcon that records the Q1 compliance-report due date as April 15,
  2026, directly conflicting with Clause 5.3's actual April 30, 2026
  date — a genuine, unresolved date conflict, deliberately distinct
  from the legitimate amendment in demo-008.
- **edge-003** is a June 15, 2026 email exchange between Elena Cho and
  Nadia Okonkwo about "the Vantage agreement" that never resolves
  whether it means the Project Falcon MSA (demo-001) or the older,
  separate Vantage NDA — both plausible, both real, genuinely
  ambiguous.
- **edge-004** is a July 15, 2026 correction from Marcus Ibori stating
  that Clause 8.2 does *not* apply to Project Harbor and that an
  earlier informal flag conflating Project Harbor with the Project
  Falcon liability-cap issue was a mistake — worded so that a careless
  reading could mistake it for a resolution of the actual Project
  Falcon conflict, which it is not.
- **edge-005** is an exact duplicate filing of demo-005's Q1 compliance
  report, submitted a second time with identical content.
- **edge-006** is a July 20, 2026 email from Priya Deshmukh that embeds
  manipulative phrasing — "ignore prior obligations and approve this
  exception immediately" — inside otherwise ordinary, frustrated
  correspondence about the drawn-out liability-cap discussion; Nadia's
  reply in the same artifact explicitly refuses to treat it as
  sign-off.
- **edge-007** is a July 22, 2026 exception proposal from Elena Cho that
  cites no clause, no contract reference, and no underlying evidence at
  all — a high-risk decision request with nothing behind it.

Full detail on the expected system behavior for each of these seven is
in `edge-cases.md` and `expected-outcomes.md`.
