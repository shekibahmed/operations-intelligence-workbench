import { Badge } from "@/components/ui/Badge";

export type MetricClassification = "observed" | "calculated" | "estimated" | "hypothetical";

const DEFINITIONS: Record<MetricClassification, string> = {
  observed: "Recorded directly from a source artifact or explicit entry.",
  calculated: "Computed deterministically from Observed data by a defined rule or aggregation.",
  estimated: "A system-produced approximation with stated confidence, not a direct observation.",
  hypothetical: "An illustrative projection for demonstration purposes, not a measured result.",
};

const LABEL: Record<MetricClassification, string> = {
  observed: "Observed",
  calculated: "Calculated",
  estimated: "Estimated",
  hypothetical: "Hypothetical",
};

/** Text-badge provenance label required on every metric value (UX_SPEC §7.1). */
export function ProvenanceBadge({ classification }: { classification: MetricClassification }) {
  return (
    <Badge tone={classification === "hypothetical" ? "warn" : "neutral"}>
      <span title={DEFINITIONS[classification]}>{LABEL[classification]}</span>
    </Badge>
  );
}
