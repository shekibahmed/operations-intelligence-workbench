# Text Wireframes

Layout skeletons for every P0 route (`docs/PRD.md` §19). Each file is a text
wireframe of one screen — component placement and relative hierarchy only,
no visual design (colour, type, spacing values). Behaviour, states and
accessibility requirements for each screen live in `docs/UX_SPEC.md` §5;
these files are the layout companion, referenced from each screen's entry
there.

Wireframe convention: `[Component]` marks a named component from
`docs/UX_SPEC.md` §6 (widget catalogue) where applicable; a box drawn with
`+--+` lines represents a layout region; `>` marks a navigation/action
control.

| File | Route |
|---|---|
| `00-landing.md` | `/` |
| `01-scenario-selector.md` | `/demo` |
| `02-guided-scenario-start.md` | `/demo/[pack]` |
| `03-leadership-overview.md` | `/w/[workspace]/overview` |
| `04-artifact-inbox.md` | `/w/[workspace]/inbox` |
| `05-review-queue.md` | `/w/[workspace]/review` |
| `06-case-list.md` | `/w/[workspace]/cases` |
| `07-case-detail.md` | `/w/[workspace]/cases/[caseId]` |
| `08-entity-list.md` | `/w/[workspace]/entities` |
| `09-entity-detail.md` | `/w/[workspace]/entities/[entityId]` |
| `10-decision-centre.md` | `/w/[workspace]/decisions` |
| `11-technical-artifact-inspector.md` | `/w/[workspace]/technical/artifacts/[id]` |
| `12-technical-rule-trace.md` | `/w/[workspace]/technical/rules/[id]` |
| `13-audit-explorer.md` | `/w/[workspace]/audit` |
| `14-about-pack.md` | `/w/[workspace]/about-pack` |
| `15-adapt-cta.md` | `/adapt` |
