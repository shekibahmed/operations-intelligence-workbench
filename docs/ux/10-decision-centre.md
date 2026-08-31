# Wireframe: Decision Centre (`/w/[workspace]/decisions`)

See `docs/UX_SPEC.md` §5.11 for behaviour, states and accessibility.

## Desktop (≥1280px) — 2-column card grid

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Decisions                                   |
+----------------------------------------------------------------+
| Filter: [Pending v] [Approved] [Rejected] [All]                  |
+----------------------------------------------------------------+
| +----------------------+  +----------------------+               |
| | Proposed action      |  | Proposed action      |               |
| | Risk level: [badge]  |  | Risk level: [badge]  |               |
| | Rationale             |  | Rationale             |               |
| | Supporting evidence   |  | Supporting evidence   |               |
| | Triggering rule       |  | Triggering rule       |               |
| | Potential consequence |  | Potential consequence |               |
| | Required approver     |  | Required approver     |               |
| | [Approve][Reject]     |  | [Approve][Reject]     |               |
| | [Request more info]   |  | [Request more info]   |               |
| +----------------------+  +----------------------+               |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Single-column card list, same card contents and order.

## Empty state

"No decisions pending approval." (positive state, not an error)

## Loading / error states

Card-list skeleton; a failed approval action shows its error on that card
only and leaves the decision `pending`.

## High-risk approve/reject confirmation

Approve/Reject on a high-risk decision opens a focus-managed confirmation
dialogue requiring a comment before the action is enabled; focus returns to
the triggering button on close/cancel.
