import { Button } from "@/components/ui/Button";

/**
 * "Adapt this workflow" CTA (UX_SPEC §9). No tracking — amendment A7 defers
 * FR-120/121; this is a plain link to `/adapt` with the active pack as the
 * pre-fill for "Scenario being viewed".
 */
export function AdaptCta({ scenario, variant = "secondary" }: { scenario: string; variant?: "primary" | "secondary" }) {
  return (
    <Button data-tour="tour-adapt-cta" variant={variant} type="button" className="whitespace-nowrap">
      <a href={`/adapt?scenario=${encodeURIComponent(scenario)}`}>Adapt this workflow</a>
    </Button>
  );
}
