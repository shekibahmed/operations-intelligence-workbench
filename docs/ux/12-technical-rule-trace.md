# Wireframe: Technical Inspector — Rule Trace (`/w/[workspace]/technical/rules/[id]`)

See `docs/UX_SPEC.md` §5.12 for behaviour, states and accessibility.

## Desktop (≥1280px)

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / Technical / Rules / <id>                    |
+----------------------------------------------------------------+
| Tabs: [Artifact] [Rule trace]                                    |
+----------------------------------------------------------------+
| Rule identity: id, version, description                          |
+----------------------------------------------------------------+
| Fact evaluation table         | Condition tree (pass/fail nodes)  |
| fact | resolved value | src   |  AND                              |
|                                |   +- condition A: pass            |
|                                |   +- condition B: fail            |
+-------------------------------+-------------------------------------+
| Outcome: Signal/Decision created, or no-op                          |
+----------------------------------------------------------------+
| State-transition trace                                              |
+----------------------------------------------------------------+
| Linked audit entries (-> Audit Explorer, filtered to this run)     |
+----------------------------------------------------------------+
```

## Tablet (≈768–834px)

Fact-evaluation table stacks above condition tree, single column.

## States

Loading: sections skeleton independently. No empty state (a trace only
exists for an executed rule). Error: inline retry.
