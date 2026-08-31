# Process Exceptions Scenario Pack — Narrative Fixtures

A shift report should not become operationally invisible after submission.
At Rivermill Processing Plant, an operator's note about a viscosity trend,
a QC lead's deviation reading, and a supervisor's hold request are each
filed in good faith, on schedule, into the normal reporting channels — and
yet, without something actively tracking the thread across shifts and
systems, a single deviation on batch B-2205 can sit unresolved through
three shifts, accumulate a second confirmed instance on B-2210, and grow
into 8,000 units and a whole supplier lot's worth of exposure before
anyone with sign-off authority has a clear, consolidated picture. This pack
exists to make that backlog and exposure story visible: the cost of a
report that gets filed but not followed is not a missing document, it is a
decision that never gets made.

Operationally, this pack traces how an exception moves from source report
to assigned action. Tomas Reyes flags a climbing viscosity reading during
his shift (well before it is officially out of spec); QC confirms the
deviation and applies a hold; the shift handover report escalates it by
name, along with the supplier lot involved; a supervisor requests a
root-cause check, referencing a similar case from weeks earlier; a second
batch on the same lot repeats the pattern; the held inventory itself starts
aging without a disposition call; and a weekly production summary quantifies
the yield-loss trend before the supervisor finally submits a formal,
explicit request to hold all output from that supplier lot pending
investigation — a request that, by design, is still awaiting supervisor/QC
approval when the pack's timeline ends. Every step in that chain has an
implicit SLA (same-shift for routine items, days for an escalating
supplier-linked pattern) and a clear point where authority to act shifts
from operator to QC to supervisor.

Technically, the pack is built to exercise the full evidence chain from raw
artifact through Observation, Operational Event, Signal, Case, Decision,
and Approval, with provenance preserved back to the originating artifact at
every step. The 12-artifact demo storyline deliberately layers evidence of
increasing strength — a precursor trend note, a confirmed single-batch
deviation, a corroborating handover, an unverified pattern hypothesis, an
independently confirmed second-batch deviation, a backlog/aging signal, a
quantified weekly trend, and finally a formal hold request — so that a
correct system must be able to tell a raised suspicion apart from confirmed
cross-batch evidence. The 9-artifact smoke set proves the normal path stays
quiet, and the 7-artifact edge set (missing identifiers, internally
conflicting dates, a genuinely ambiguous line reference, an explicit
negation, an exact duplicate, embedded prompt-injection-style text, and a
high-stakes recommendation resting on incomplete data) is designed so that
the correct extraction is not the confident one but the cautious one:
routing to review, abstaining, flagging, or recognizing a duplicate instead
of guessing.
