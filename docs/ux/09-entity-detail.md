# Wireframe: Entity Detail (`/w/[workspace]/entities/[entityId]?lens=operations`)

See `docs/UX_SPEC.md` §5.10 for behaviour, states and accessibility.

## Desktop (≥1280px) — two column, mirrors Case Detail

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Entities / <Entity name>                    |
+----------------------------------------------------------------+
| Event history (timeline)                 | Attributes             |
|                                           | Current status         |
+-------------------------------------------+-------------------------+
| Related artifacts (list)                 | Metrics (stat cards +   |
|                                           |  provenance badges)     |
+-------------------------------------------+-------------------------+
| Open cases (list -> case detail)         | Related entities (chips)|
+-------------------------------------------+-------------------------+
| Closed cases (list -> case detail)       |                          |
+-------------------------------------------+-------------------------+
| Repeated patterns (callout)                                          |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Single scrolling column, order: Attributes, Current status, Related
artifacts, Event history, Open cases, Closed cases, Repeated patterns,
Metrics, Related entities.

## States

Same as Case Detail: every §20.6 section always present (empty sections show
"No closed cases" etc.); section-level loading/error.
