# Wireframe: Audit Explorer (`/w/[workspace]/audit`)

See `docs/UX_SPEC.md` §5.13 for behaviour, states and accessibility.

## Desktop (≥1280px)

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Audit                                       |
+----------------------------------------------------------------+
| Filter: [Type v] [Actor v] [Date range] [Related object]         |
+----------------------------------------------------------------+
| timestamp | type | actor | affected object(s) | summary           |
|-------------------------------------------------------------------|
| entry (-> affected object detail)                                  |
| ...                                                                 |
+----------------------------------------------------------------+
| < Pagination >                                                     |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

List stays single column (a log, not a grid); filter bar collapses into a
drawer opened by a toggle.

## Empty state

"No audit entries yet." (only possible immediately after workspace creation,
before any ingestion)

## Loading / error states

List skeleton / inline retry with existing entries preserved. No edit
affordance exists at any width (audit entries are read-only everywhere).
