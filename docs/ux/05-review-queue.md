# Wireframe: Review Queue (`/w/[workspace]/review?lens=operations`)

See `docs/UX_SPEC.md` §5.6 for behaviour, states and accessibility.

## Desktop (≥1280px) — three regions side by side

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Review Queue                                |
+----------------------------------------------------------------+
| Queue      | Raw source (evidence highlighted)  | Observation   |
| list       |                                     | detail        |
|            |  "...the [brake assembly] on..."    | Field: value   |
| > item 1   |                                     | Confidence: .. |
|   item 2   |                                     | Alt candidate  |
|   item 3   |                                     | Evidence cite  |
|            |                                     |                |
|            |                                     +----------------+
|            |                                     | [Accept]       |
|            |                                     | [Correct]      |
|            |                                     | [Reject]       |
|            |                                     | [Mark insuff.] |
|            |                                     | [Link entity]  |
|            |                                     | [Create entity]|
|            |                                     | [Add note]     |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Queue list becomes a collapsible drawer (opened via a toggle in the top of
the pane); raw source stacks above observation detail (source, then
detail, then action bar), single column.

## Empty state

Full-pane message: "Review queue is clear." No queue list, no detail panes.

## Loading state

Queue list skeleton and detail-pane skeleton load independently.

## Error state (action failure)

Inline error banner on the action bar; selected item and unsaved input are
preserved, not discarded.
