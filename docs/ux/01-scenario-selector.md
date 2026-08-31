# Wireframe: Scenario Selector (`/demo`)

See `docs/UX_SPEC.md` §5.2 for behaviour, states and accessibility.

## Desktop (≥1280px)

```text
+----------------------------------------------------------------+
| [Logo]                                                          |
+----------------------------------------------------------------+
| Synthetic-data notice (persistent, not dismissible)             |
+----------------------------------------------------------------+
| +----------------+  +----------------+  +----------------+     |
| | Asset          |  | Process        |  | Document       |     |
| | Reliability    |  | Exception Mgmt |  | Assurance      |     |
| |                |  |                |  |                |     |
| | problem stmt   |  | problem stmt   |  | problem stmt   |     |
| | source types   |  | source types   |  | source types   |     |
| | example output |  | example output |  | example output |     |
| | ~length        |  | ~length        |  | ~length        |     |
| | 3-lens desc    |  | 3-lens desc    |  | 3-lens desc    |     |
| | synth notice   |  | synth notice   |  | synth notice   |     |
| | > Start        |  | > Start        |  | > Start        |     |
| +----------------+  +----------------+  +----------------+     |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Cards stack in a single column, same internal layout and field order.

## Loading state

Three skeleton cards in the same grid position, matching card outline only.

## Empty / error state

Full-width message region replaces the card row; synthetic-data notice above
remains rendered (static copy, not data-dependent).
