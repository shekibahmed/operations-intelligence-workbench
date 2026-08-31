# @oiw/ingestion

Pack-neutral ingestion and source-format adapters for immutable Artifacts.

`IngestionService.ingest` accepts a workspace/source scope, raw UTF-8 bytes or
text, media metadata and a raw reference. It computes SHA-256 over the exact
input bytes, rejects double-ingestion by workspace-scoped exact checksum, and
stores the Artifact in `received` state with adapter-produced evidence
segments. A duplicate returns the existing Artifact and records an
`artifact-duplicate-detected` Audit Entry containing the attempted raw
reference and linked Artifact ID. Similarity and near-duplicate matching are
intentionally outside this package.

The default `FormatAdapterRegistry` supports:

- plain text: one exact text-range per message in timestamped multi-message
  chat logs, or one range for an ordinary document;
- CSV: zero-based data-row/table-cell coordinates, quoted fields, and a
  conservative recovery for unquoted commas in the trailing narrative field;
- JSON: leaf-value JSON-path coordinates, including arrays and escaped keys;
- PDF fixtures: one-based pages parsed from `--- page N ---` markers.

CSV imports use row segments by default. A caller whose validated pack/source
configuration selects row-as-Artifact behaviour can call `ingestCsvRows`; it
creates one independently checksummed Artifact per data row. P0's PDF adapter
accepts only the known UTF-8 fixture text layer. Real binary PDF parsing is
deferred under plan amendment A7.

The service appends receipt, segmentation, duplicate and failure Audit Entries.
It never mutates raw Artifact fields. `ArtifactProcessingService` in
`@oiw/application` owns the later synchronous transition to `processed`,
`needs-review` or a failed state.
