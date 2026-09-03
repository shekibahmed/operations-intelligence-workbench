---
name: Scenario Pack proposal
about: Propose a new Scenario Pack, or a substantial addition to an existing one
title: "[Pack] "
labels: scenario-pack
assignees: ""
---

## Pack identity

- Proposed `pack-id` (kebab-case, permanent once shipped — see
  `docs/PACK_AUTHORING.md` §1): 
- Working title / one-line description:

## The operational problem

What real (but fictional/synthetic) operational scenario does this pack
model? Follow the pattern of the three shipped packs
(`scenario-packs/asset-reliability`, `process-exceptions`,
`document-assurance`'s `README.md` openers) — one or two sentences naming
the fictional organisation and the information-loss problem, per PRD §3.

## Why this is neutral, not a variant of an existing pack

Explain what's genuinely different about this pack's vocabulary, entities,
workflow and rules versus the three shipped packs — a pack that's mostly a
relabelling of an existing one is better contributed as fixtures/edge-cases
to that pack instead.

## Sketch

- Entity types:
- Observation schemas (the facts you'd extract):
- Event types, and what disambiguates them from each other (see
  `docs/PACK_AUTHORING.md` §3 — this is the most common defect class in this
  repository's pack-authoring history):
- Workflow states and the approval-gated transition:
- At least one rule proposing a high-risk, approval-gated Decision:
- Roughly how many smoke / demo / edge-case fixtures you'd expect
  (`docs/PACK_AUTHORING.md` §9 sizing guidance: ~8 smoke, ~25–40 demo, ~20
  gold total).

## Have you read

- [ ] `docs/PACK_AUTHORING.md` in full, including the troubleshooting table
- [ ] `scenario-packs/_template/` (the scaffold you'd start from)
- [ ] The "Neutrality rules" section (`docs/PACK_AUTHORING.md` §5) — nothing
      proposed above should require a change to a core package
