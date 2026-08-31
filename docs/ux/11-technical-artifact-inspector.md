# Wireframe: Technical Inspector — Artifact (`/w/[workspace]/technical/artifacts/[id]`)

See `docs/UX_SPEC.md` §5.12 for behaviour, states and accessibility.

## Desktop (≥1280px) — raw/parsed side by side

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Technical / Artifacts / <id>                |
+----------------------------------------------------------------+
| Tabs: [Artifact] [Rule trace]                                    |
+----------------------------------------------------------------+
| Raw artifact viewer          | Proposed observations             |
| (evidence spans highlighted) |  - field: value  conf: 0.xx        |
|                               |    evidence coords, validation     |
|                               |    review status                   |
|                               |  (insufficient-evidence shown       |
|                               |   explicitly, not blank)            |
+-------------------------------+-------------------------------------+
| Parsed representation         | Entity-resolution candidates        |
+-------------------------------+-------------------------------------+
| Extraction schema              | Provider metadata (extractor id/   |
|                                 | version, model/rule id, duration)  |
+-------------------------------+-------------------------------------+
| Copyable structured payload (JSON, selectable text)                 |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Raw/parsed panes stack vertically (raw above, parsed/observations below).

## States

Loading: viewer and list skeleton independently. Error: raw artifact stays
visible if already fetched even when derived data fails (artifact is
immutable and fetched independently).
