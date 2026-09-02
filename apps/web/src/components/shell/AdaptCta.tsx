import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from "@/components/ui/Button";

/**
 * "Adapt this workflow" CTA (UX_SPEC §9). No tracking — amendment A7 defers
 * FR-120/121; this is a plain link to `/adapt` with the active pack as the
 * pre-fill for "Scenario being viewed". A real `<a>` styled like `Button`,
 * not a `<button>` wrapping an `<a>` — nesting interactive elements is
 * invalid markup that axe-core (and some assistive tech) reject outright.
 */
export function AdaptCta({ scenario, variant = "secondary" }: { scenario: string; variant?: "primary" | "secondary" }) {
  return (
    <a
      data-tour="tour-adapt-cta"
      href={`/adapt?scenario=${encodeURIComponent(scenario)}`}
      className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES[variant]} whitespace-nowrap`}
    >
      Adapt this workflow
    </a>
  );
}
