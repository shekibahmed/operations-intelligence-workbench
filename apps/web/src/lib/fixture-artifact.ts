import type { Artifact } from "@oiw/contracts";

/**
 * `SeedService` persists `rawReference` as
 * `fixture://<packId>/<version>/<fixtureSet>/<fixture-artifact-id>`
 * (`packages/application/src/seed-service.ts`) — a stable, deterministic
 * identifier from the pack's own fixture manifest, unlike the artifact's
 * database `id` (content-checksum derived). The guided tour (asset-reliability
 * only, UX_SPEC §4) uses this to find its known demo artifacts without
 * sniffing raw content.
 */
export function fixtureArtifactId(artifact: Pick<Artifact, "rawReference">): string | null {
  const segments = artifact.rawReference.split("/");
  return segments.length > 0 ? (segments[segments.length - 1] ?? null) : null;
}
