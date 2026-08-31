# Wireframe: Artifact Inbox (`/w/[workspace]/inbox?lens=operations`)

See `docs/UX_SPEC.md` §5.5 for behaviour, states and accessibility.

## Desktop (≥1280px)

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Inbox                                      |
+----------------------------------------------------------------+
| Filter: [Source v] [Type v] [Status v]                          |
+----------------------------------------------------------------+
| Source | Type | Received | Status | Entity | Obs. | Review | Case |
|--------|------|----------|--------|--------|------|--------|------|
| row    | row  | row      | row    | row    | row  | row    | row  |
| ...                                                     [>Process]|
+----------------------------------------------------------------+
| < Pagination >                                                   |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Lower-priority column (Related case) collapses into an expandable row
detail (chevron toggle per row); remaining columns stay inline.

## Empty state

Table region replaced by "No artifacts have arrived yet" message, filter bar
still shown (disabled/no-op until data exists).

## Loading state

8 skeleton rows matching column layout.

## Row-level processing state

Clicking Process replaces that row's Status cell with an inline spinner;
on completion the row's Status/Entity/Observations/Review/Case cells update
in place.
