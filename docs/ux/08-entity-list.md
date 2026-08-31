# Wireframe: Entity List (`/w/[workspace]/entities?lens=operations`)

See `docs/UX_SPEC.md` §5.9 for behaviour, states and accessibility.

## Desktop (≥1280px)

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Entities                                    |
+----------------------------------------------------------------+
| Filter: [Entity type v] [Status v]                                |
+----------------------------------------------------------------+
| Display name | Entity type | Status | Open cases | Last activity |
|---------------------------------------------------------------- |
| row (click -> entity detail)                                     |
+----------------------------------------------------------------+
| < Pagination >                                                   |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Same collapse pattern as Case List (§06): lower-priority column (Last
activity) folds into row detail.

## Empty / loading / error states

Same pattern as Case List: "No entities yet" / table skeleton / inline retry
with existing rows preserved.
