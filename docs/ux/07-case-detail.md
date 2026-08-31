# Wireframe: Case Detail (`/w/[workspace]/cases/[caseId]?lens=operations`)

See `docs/UX_SPEC.md` §5.8 for behaviour, states and accessibility.

## Desktop (≥1280px) — two column: narrative left, metadata right rail

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Cases / <Case title>                        |
+----------------------------------------------------------------+
| Case summary (title, type)               | Status  | Priority   |
|                                           | Owner   | SLA        |
+-------------------------------------------+---------------------+
| Related entities (chips)                 | Action items          |
+-------------------------------------------+ [ ] item  assignee due|
| Evidence (list, links to inspector)      | [x] item  assignee due|
+-------------------------------------------+------------------------+
| Timeline (chronological feed)            | Decisions              |
|                                           | [card -> decision ctr] |
+-------------------------------------------+------------------------+
| Signals (list)                           | Approval history       |
+-------------------------------------------+------------------------+
|                                           | Closure requirements   |
|                                           | [ ] requirement        |
+-------------------------------------------+------------------------+
| > View technical trace                                            |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Single scrolling column, sections in this order top to bottom: Case summary,
Status/Priority/Owner/SLA, Related entities, Evidence, Timeline, Signals,
Action items, Decisions, Approval history, Closure requirements, Technical
trace link.

## States

- Header renders first (already available from the Case List route);
  remaining sections skeleton independently while loading.
- Any empty section (e.g. no action items yet) still renders its heading with
  "No action items yet" — sections are never hidden.
- Section-level error shows an inline retry within that section only.
