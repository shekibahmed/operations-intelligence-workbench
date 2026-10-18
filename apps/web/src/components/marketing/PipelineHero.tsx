import type { ComponentType, CSSProperties, SVGProps } from "react";

import {
  IconBranch,
  IconChecklist,
  IconClock,
  IconEye,
  IconFiles,
  IconLock,
  IconScan,
  IconShieldCheck,
  IconZap,
} from "@/components/marketing/icons";

interface PipelineNode {
  label: string;
  note: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** A step that waits for a person; the packet pauses here. */
  human?: boolean;
}

/** Neutral wording only — the stages are pack-independent. */
export const PIPELINE_NODES: readonly PipelineNode[] = [
  { label: "Source", note: "raw report", icon: IconFiles },
  { label: "Artifact", note: "immutable copy", icon: IconLock },
  { label: "Observation", note: "cited fields", icon: IconScan },
  { label: "Review", note: "human check", icon: IconEye, human: true },
  { label: "Event", note: "assembled", icon: IconZap },
  { label: "Rule", note: "deterministic", icon: IconBranch },
  { label: "Case / Decision", note: "proposed", icon: IconChecklist },
  { label: "Approval", note: "human sign-off", icon: IconShieldCheck, human: true },
  { label: "Audit", note: "append-only", icon: IconClock },
];

/**
 * Seconds (from the start of the 10 s packet loop) at which the packet
 * reaches each node. Must stay in step with the `pipe-travel-*` keyframes
 * in globals.css; the two human steps include a short dwell.
 */
const ARRIVAL_SECONDS = [0.4, 1.1, 1.8, 2.5, 4.0, 4.7, 5.4, 6.1, 7.6] as const;
/** Intro (stagger-in + connector draw) finishes before the loop starts. */
const INTRO_SECONDS = 1.4;

/**
 * One report's path from source to approved decision, as a figure with an
 * ordered list. Motion is decorative CSS (see `.pipe-*` in globals.css) and
 * is gated on `prefers-reduced-motion: no-preference`, so the default state
 * is the complete static diagram.
 */
export function PipelineHero() {
  return (
    <figure className="relative w-full max-w-5xl rounded-2xl border border-border-strong bg-surface p-5 text-left shadow-card sm:p-7">
      <figcaption className="mb-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
          One report, nine stages
        </span>
        <span className="mt-1 block text-sm text-ink-muted">
          How a single report travels from source to an approved decision. Highlighted stages wait
          for a person.
        </span>
      </figcaption>
      <div className="mx-auto w-full max-w-xs lg:max-w-none">
        <div className="pipe relative">
          <ol className="relative m-0 grid list-none grid-cols-1 p-0 lg:grid-cols-9" role="list">
            {PIPELINE_NODES.map((node, index) => {
              const arrival = ARRIVAL_SECONDS[index] ?? 0;
              const style = {
                "--i": index,
                "--glow-delay": `${(INTRO_SECONDS + arrival - 0.4).toFixed(2)}s`,
              } as CSSProperties;
              const Icon = node.icon;
              return (
                <li
                  key={node.label}
                  style={style}
                  className="relative flex items-start gap-4 pb-5 last:pb-0 lg:flex-col lg:items-center lg:gap-3 lg:pb-0 lg:text-center"
                >
                  <span
                    aria-hidden="true"
                    className={`pipe-node${
                      node.human ? " pipe-node--human pipe-node--long" : ""
                    } flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}
                  >
                    <Icon />
                  </span>
                  <span className="pipe-text block min-w-0 pt-0.5 lg:px-1 lg:pt-0">
                    <span className="block text-sm font-semibold text-ink">{node.label}</span>
                    <span className="block text-xs leading-snug text-ink-muted">{node.note}</span>
                  </span>
                  {index < PIPELINE_NODES.length - 1 ? (
                    <span aria-hidden="true" className="pipe-link" />
                  ) : null}
                </li>
              );
            })}
          </ol>
          <span
            aria-hidden="true"
            className="pipe-track"
            style={{ "--loop-delay": `${INTRO_SECONDS}s` } as CSSProperties}
          >
            <span className="pipe-packet" />
          </span>
        </div>
      </div>
    </figure>
  );
}
