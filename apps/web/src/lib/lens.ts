export const LENSES = ["leadership", "operations", "technical"] as const;

export type Lens = (typeof LENSES)[number];

export const LENS_LABEL: Record<Lens, string> = {
  leadership: "Leadership",
  operations: "Operations",
  technical: "Technical",
};

export const LENS_COOKIE = "oiw-last-lens";

export function isLens(value: string | null | undefined): value is Lens {
  return value !== null && value !== undefined && (LENSES as readonly string[]).includes(value);
}

/**
 * Default lens per workspace section, per UX_SPEC §1.3. Decisions (no single
 * primary lens) is resolved by the caller using the last-visited lens.
 */
export function defaultLensForSection(section: WorkspaceSection): Lens | null {
  switch (section) {
    case "overview":
      return "leadership";
    case "inbox":
    case "review":
    case "cases":
    case "case-detail":
    case "entities":
    case "entity-detail":
      return "operations";
    case "technical-artifact":
    case "technical-rule":
    case "audit":
    case "about-pack":
      return "technical";
    case "decisions":
      return null;
  }
}

export type WorkspaceSection =
  | "overview"
  | "inbox"
  | "review"
  | "cases"
  | "case-detail"
  | "entities"
  | "entity-detail"
  | "decisions"
  | "technical-artifact"
  | "technical-rule"
  | "audit"
  | "about-pack";

/** The nav item highlighted as "home" for a given lens, per UX_SPEC §1.3. */
export const LENS_HOME_SECTION: Record<Lens, WorkspaceSection> = {
  leadership: "overview",
  operations: "inbox",
  technical: "technical-artifact",
};
