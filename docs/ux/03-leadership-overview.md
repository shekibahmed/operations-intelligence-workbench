# Wireframe: Leadership Overview (`/w/[workspace]/overview?lens=leadership`)

See `docs/UX_SPEC.md` §5.4 for behaviour, states and accessibility, and §6
for widget definitions.

## Desktop (≥1280px) — 3-column widget grid

```text
+----------------------------------------------------------------+
| [Shell top bar: pack name | synth notice | lens switch | CTA]  |
+----------------------------------------------------------------+
| Breadcrumb: <Pack>                                              |
+----------------------------------------------------------------+
| [Stat: Critical  ] [Stat: Open      ] [Stat: Pending           |
| [Signals          ] [Cases          ] [Decisions               ]|
+----------------------------------------------------------------+
| [Severity breakdown widget    ] [SLA table widget              ]|
+----------------------------------------------------------------+
| [Trend line widget            ] [Text/impact: repeated-pattern ]|
+----------------------------------------------------------------+
| [Text/impact: impact-hypothesis card   ] [Activity feed widget ]|
+----------------------------------------------------------------+
| > View operational queue        > Inspect how this was derived |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px) — 2-column widget grid

Same widget order, top to bottom, reflowed to two columns; stat cards remain
three across only if they fit — otherwise wrap to a second row of one.

## Empty state

Every widget renders its zero-state copy in place (no widget is hidden);
example: Critical Signals stat shows "0" with sub-text "No critical signals
yet — process an artifact to begin" linking to Inbox.

## Loading state

Each widget box shows its own skeleton independently; widgets do not wait on
each other.
