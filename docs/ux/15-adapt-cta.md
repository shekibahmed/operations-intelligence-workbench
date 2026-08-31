# Wireframe: Adapt CTA (`/adapt`)

See `docs/UX_SPEC.md` §5.15 for behaviour, states and accessibility.

## Desktop and tablet (single-column form at both widths)

```text
+----------------------------------------------------------------+
| [Logo]                                                           |
+----------------------------------------------------------------+
| Headline: "Adapt this workflow to your organisation"             |
| Short explainer of what happens next                             |
+----------------------------------------------------------------+
| Label                                                              |
| [ Organisation                                    ]                |
| Label                                                              |
| [ Industry                                         ]                |
| Label                                                              |
| [ Operational workflow                             ]                |
| Label                                                              |
| [ Current source systems                           ]                |
| Label                                                              |
| [ Approximate information volume                   ]                |
| Label                                                              |
| [ Main bottleneck                                   ]                |
| Label                                                              |
| [ Current reporting method                          ]                |
| Label                                                              |
| [ Data sensitivity                                  ]                |
| Label                                                              |
| [ Desired result                                    ]                |
| Label                                                              |
| [ Contact details                                   ]                |
| Label                                                              |
| [ Scenario being viewed (pre-filled if known)       ]                |
+----------------------------------------------------------------+
| > Submit                                                            |
+----------------------------------------------------------------+
```

## States

- Default: empty form, "Scenario being viewed" pre-filled from referring CTA
  when present.
- Submitting: submit button busy, fields disabled.
- Success: confirmation message replaces the form (no redirect).
- Error: field-level validation errors on blur/submit (`aria-describedby`);
  submission-level error banner on backend failure, form values preserved.
