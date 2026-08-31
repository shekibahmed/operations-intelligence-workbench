# Wireframe: Case List (`/w/[workspace]/cases?lens=operations`)

See `docs/UX_SPEC.md` §5.7 for behaviour, states and accessibility.

## Desktop (≥1280px)

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Cases                                       |
+----------------------------------------------------------------+
| Filter: [Status v] [Priority v] [Severity v] [Owner v]           |
+----------------------------------------------------------------+
| Title | Status | Priority | Severity | Owner | Due | Entities | SLA |
|-------|--------|----------|----------|-------|-----|----------|-----|
| row (click -> case detail)                                       |
| ...                                                               |
+----------------------------------------------------------------+
| < Pagination >                                                   |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Related-entities count column collapses into expandable row detail; other
columns remain inline.

## Empty state

"No cases yet" message, pointing to Inbox/Review Queue.

## Loading / error states

Table skeleton / inline retry banner with existing rows preserved — same
pattern as Artifact Inbox.
