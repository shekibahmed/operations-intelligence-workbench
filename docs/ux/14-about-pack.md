# Wireframe: About This Pack (`/w/[workspace]/about-pack`)

See `docs/UX_SPEC.md` §5.14 for behaviour, states and accessibility.

## Desktop and tablet (single scrolling column at both widths)

```text
+----------------------------------------------------------------+
| [Shell top bar]                                                 |
+----------------------------------------------------------------+
| Breadcrumb: <Pack> / About this pack                             |
+----------------------------------------------------------------+
| Pack identity: name, version, description                        |
+----------------------------------------------------------------+
| Entity types defined                                              |
+----------------------------------------------------------------+
| Event types defined                                                |
+----------------------------------------------------------------+
| Observation schemas                                                |
+----------------------------------------------------------------+
| Rules (list, -> rule trace when executed)                          |
+----------------------------------------------------------------+
| Workflows (states / transitions)                                   |
+----------------------------------------------------------------+
| Metrics defined                                                    |
+----------------------------------------------------------------+
| Dashboard definitions                                              |
+----------------------------------------------------------------+
| "None of this is hard-coded in the platform — it is all           |
|  configuration read from this pack's manifest."                    |
+----------------------------------------------------------------+
```

## States

Loading: section skeletons. Error: retry (a manifest load failure here is a
deployment error — the workspace already required a valid manifest to
exist).
