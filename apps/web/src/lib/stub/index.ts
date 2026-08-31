export * from "@/lib/stub/artifacts";
export * from "@/lib/stub/audit";
export * from "@/lib/stub/cases";
export * from "@/lib/stub/decisions";
export * from "@/lib/stub/entities";
export * from "@/lib/stub/events";
export * from "@/lib/stub/ids";
export * from "@/lib/stub/labels";
export * from "@/lib/stub/metrics";
export * from "@/lib/stub/observations";
export * from "@/lib/stub/rule-trace";
export * from "@/lib/stub/signals";
export * from "@/lib/stub/workspace";

import { assetReliabilityLabels } from "@/lib/stub/labels";
import type { PackLabels } from "@/lib/pack-labels";

export { resolveLabel } from "@/lib/pack-labels";
export type { PackLabels } from "@/lib/pack-labels";

/** P0 always runs the Asset Reliability pack's stub content (no pack registry yet — Wave 2). */
export function getPackLabels(): PackLabels {
  return assetReliabilityLabels;
}
