# Wireframe: Guided Scenario Start (`/demo/[pack]`)

See `docs/UX_SPEC.md` §5.3 for behaviour, states and accessibility.

## Desktop and tablet (single column at both widths)

```text
+----------------------------------------------------------------+
| [Logo]                                          < Back to /demo |
+----------------------------------------------------------------+
| Pack name                                                       |
| Problem statement (recap)                                       |
+----------------------------------------------------------------+
| Synthetic-data notice                                           |
+----------------------------------------------------------------+
| This will create a synthetic workspace with:                   |
|   - Assets            - Historical events    - Rules            |
|   - Locations         - Open cases           - Metrics          |
|   - Source artifacts                                            |
+----------------------------------------------------------------+
| > Start guided tour            > Explore freely                 |
+----------------------------------------------------------------+
```

## Loading (after either action)

Action row is replaced in place by an inline spinner + "Creating workspace…";
recap content above stays static.

## Error

Inline error message + > Retry beneath where the spinner was; recap content
unchanged.
