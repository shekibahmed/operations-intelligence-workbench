/**
 * OIW-210 wires sessions, workspaces and the artifact inbox to real
 * persisted data; screens whose upstream data doesn't exist yet (no
 * processing engine until OIW-301) stay on the Wave 1 stub content. This
 * banner makes that visible rather than letting stub data pass as real.
 */
export function DemoPreviewNotice() {
  return (
    <p className="rounded-md border border-dashed border-border bg-surface-muted p-2 text-xs text-ink-muted">
      Demo preview — this screen shows sample data until artifact processing
      (rules, extraction, entity resolution) lands in a later wave.
    </p>
  );
}
