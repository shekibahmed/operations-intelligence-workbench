# Wireframe: Product Landing Page (`/`)

See `docs/UX_SPEC.md` §5.1 for behaviour, states and accessibility.

## Desktop (≥1280px)

```text
+----------------------------------------------------------------+
| [Logo]                                   About  Repo  > Adapt  |
+----------------------------------------------------------------+
|                                                                  |
|   Headline: what the platform does                             |
|   Sub-headline: problem statement (PRD §3)                     |
|                                                                  |
|   > See it work            > Adapt this workflow (secondary)   |
|                                                                  |
+----------------------------------------------------------------+
|  Three lenses, same operational state:                         |
|  +------------+   +------------+   +------------+              |
|  | Leadership |   | Operations |   | Technical  |              |
|  | one line   |   | one line   |   | one line   |              |
|  +------------+   +------------+   +------------+              |
+----------------------------------------------------------------+
| Footer: > Demo  > Adapt  > Repository                          |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Lens cards stack to one column, in the same order (Leadership, Operations,
Technical); hero and CTAs remain full width, unchanged order.

## Deviation note (2026-09-13, OIW-907 expansion)

The shipped page (`apps/web/src/app/page.tsx`) keeps this wireframe's
hero → lens-cards → footer spine and adds pipeline, capability-grid,
scenario-pack, quick-start, and firm-CTA sections. Behaviour stays per
`docs/UX_SPEC.md` §5.1; the additions are a recorded deviation (see the
§5.1 note and `docs/agent-runs/OIW-907.md`), not a spec rewrite.
