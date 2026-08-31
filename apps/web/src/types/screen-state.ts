/**
 * Every screen in UX_SPEC §5 names default/empty/loading/error states. Wave 1
 * has no live backend (OIW-201 non-goal), so these are demonstrated through a
 * `?state=` query param against static stub data rather than real fetch
 * failures. Wave 2 engine work replaces this with real request states.
 */
export const SCREEN_STATES = ["default", "empty", "loading", "error"] as const;

export type ScreenState = (typeof SCREEN_STATES)[number];

export function resolveScreenState(value: string | string[] | undefined): ScreenState {
  const raw = Array.isArray(value) ? value[0] : value;
  return (SCREEN_STATES as readonly string[]).includes(raw ?? "") ? (raw as ScreenState) : "default";
}
