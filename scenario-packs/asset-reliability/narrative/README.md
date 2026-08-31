# Asset Reliability Scenario Pack — Narrative Fixtures

From fragmented operational information to accountable decisions: at the
Northgate Distribution Center, a fault doesn't announce itself as a
single clean incident — it shows up as a chat message from an operator,
a maintenance CSV row from six weeks earlier, an inspection PDF, and an
urgent email, scattered across systems and people. The A-142 forklift
arc in this pack is the clearest example: a brake issue reported once,
patched, reported again with sharper safety language, and only then
escalated to a formal hold-from-service request. Left unconnected, that
history looks like four unrelated, low-priority tickets. Connected, it
is the fleet's highest-downtime, highest-risk asset — a pattern only
visible when someone (or something) is actually tracking recurrence
across time, not just responding to the loudest message of the day. That
is the fleet-risk-and-downtime story leadership needs surfaced before an
audit or an incident forces the question.

Operationally, the A-142 fault moves through a recognizable chain: an
informal chat report from an operator (Dana Osei, demo-001) triggers a
follow-up inspection with a defined SLA (Lena Fischer, demo-003,
5-business-day follow-up), which is exceeded before a second,
safety-critical occurrence (Owen Vasquez, demo-004) forces a formal
supervisor escalation (Priya Nandakumar, demo-005) explicitly requesting
the asset be held from service pending review. A technician (Marcus Ibe,
demo-006) confirms the asset is physically tagged out and assigned for
diagnostic work — and the pack deliberately leaves the loop open there,
with no return-to-service approval recorded, because a real hold-from-
service decision is exactly the kind of action that should require
explicit sign-off rather than resolve itself quietly. Every other
storyline in this pack (conveyor belt wear, dock leveler leaks, generator
overheating, compressor refrigerant loss) exercises the same
report-to-action chain at lower stakes, so the difference between routine
maintenance and an approval-gated decision is visible by contrast.

Technically, this pack is an architecture of evidence: each artifact is
raw source material — a chat log, a CSV row, an inspection report,
an email — from which an Observation is extracted (a specific field
value with informal provenance, e.g. "brake grinding noise" tied to
demo-001), which rolls up into an Operational Event (fault-reported,
maintenance-completed, inspection-completed), which can trigger a Signal
(repeat-fault pattern, conflicting operating status, cross-asset install-
batch correlation), which attaches to a Case (A-142 brake reliability),
which may require a Decision and, where the stakes warrant it, a formal
Approval before an asset's status changes. Provenance is preserved at
every step back to the originating artifact ID — including in the edge
cases, where the correct system behavior is often to abstain, flag, or
route to a human rather than extract a confident answer: a missing asset
ID, an ambiguous tag, a negated finding, a duplicate resend, an embedded
prompt-injection attempt, and a same-day status contradiction are all
designed to test that the evidence chain holds up under exactly the kind
of messy, contradictory, and occasionally adversarial input a real
facility produces.
