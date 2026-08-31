# Accessibility and Responsive Review Criteria

Status: Wave 0 plan, applied by the `ux-accessibility-reviewer` subagent
against every `apps/web` PR. Source: `docs/PRD.md` §16.3 (accessibility
NFRs), §8 (three-lens model), §20 (key screen requirements). Cross-reference
`docs/UX_SPEC.md` (owned by OIW-003) for per-screen state/hierarchy detail —
this document defines the *criteria* a screen is checked against, not the
screen inventory itself.

This is a review checklist, not test code (OIW-005 is documentation-only).
Each criterion below should map to a Playwright/axe assertion when
`apps/web` exists; where noted, a criterion is manual-review-only because it
cannot be reliably automated.

---

## 1. Keyboard Navigation

Required across all three lenses (Leadership, Operations, Technical) and
every core workflow screen (PRD §19 routes):

- Every interactive control (button, link, form field, tab, menu item) is
  reachable via `Tab`/`Shift+Tab` in a logical order matching visual layout.
- Every action reachable by mouse (click a case row, open a review item,
  approve a decision) is also reachable by keyboard (`Enter`/`Space` on a
  focused control).
- No keyboard trap: a user tabbing into a modal, dropdown, or data table can
  tab back out.
- Custom widgets (dropdowns, comboboxes, data tables with row actions) follow
  the corresponding ARIA authoring pattern for keyboard interaction, not just
  visual mimicry of a native control.
- Skip-to-content link or equivalent exists for repeated navigation chrome,
  so keyboard users reach primary content without tabbing through the same
  nav on every route.

**Verification**: automatable — Playwright test tabs through each screen's
primary workflow (e.g. review queue: focus artifact → focus accept button →
activate) and asserts focus order and successful activation.

## 2. Accessible Names

- Every control (button, icon button, form input, link) has an accessible
  name — visible label, `aria-label`, or `aria-labelledby` — not merely a
  `title` attribute or surrounding visual context.
- Icon-only controls (e.g. a close button, an approve/reject icon action in
  the review queue) always carry an explicit accessible name describing the
  action, not just the icon.
- Form fields have a programmatically associated `<label>` (via `for`/`id`
  or wrapping), not a placeholder-only label.
- Accessible names are meaningful out of visual context — "Approve decision
  to hold asset A-142 from service," not "Approve" repeated identically
  across every row of a list, where a screen-reader user tabbing through
  rows can't distinguish which row's control they're on.

**Verification**: automatable — axe-core (or equivalent) scan per screen
flags missing accessible names; targeted assertion for list-row controls
checks name uniqueness/context (not just presence).

## 3. State Not Communicated by Colour Alone

Relevant to this product specifically because severity, confidence, and
review status are core UI concepts (PRD §9.7 confidence, §9.9 signal
severity, §20.4 review queue):

- Severity badges (critical/high/medium/low) pair colour with text or an
  icon+text label, not colour alone.
- Confidence indicators (PRD §9.7) show a numeric or textual confidence
  level, not only a colour gradient.
- Review status (pending/accepted/corrected/rejected) is labelled in text,
  not conveyed only by a coloured dot or row background.
- Approval-required vs. approved states (PRD §22.4) are text-labelled.
- Metric-provenance badges (Observed/Calculated/Estimated/Hypothetical, per
  `ux-accessibility-reviewer`'s existing check) are text, not colour-coded
  only.

**Verification**: manual review (colour-only encoding is a design-pattern
check, not reliably automatable) — reviewer inspects each new badge/status
indicator's markup for an accompanying text node or `aria-label`; automatable
backstop: a contrast-independent check that removing all colour (e.g.
grayscale screenshot) still allows manually distinguishing severity/status
by reading the DOM.

## 4. Tables Have Meaningful Headings

Applies to the Case list, Action Item lists, Entity list, Audit explorer,
and any SLA/dashboard table widget (amendment A5 widget catalogue):

- Data tables use `<table>` with `<th>` (or ARIA `role="columnheader"`)
  elements, not styled `<div>` grids, unless an ARIA grid pattern is fully
  implemented with equivalent semantics.
- Column headers describe the column's content unambiguously ("Due date,"
  not "Date" when multiple date columns could exist).
- Row headers or an equivalent mechanism let a screen-reader user identify
  which row a cell belongs to when navigating cell-by-cell in a wide table
  (e.g. Audit explorer with actor/timestamp/cause/entity columns).
- Sortable columns announce sort state (`aria-sort`) when sorting is
  supported.

**Verification**: automatable — axe-core table-structure rules, plus a
targeted assertion that every `<table>` under test has at least one `<th>`
and no header text is empty/generic.

## 5. Dialogue Focus Management

Applies to any modal/dialog (e.g. approval confirmation, artifact detail
overlay, correction form):

- Opening a dialog moves focus into it (typically to the first focusable
  element or a heading with `tabindex="-1"`), not left behind on the
  triggering control.
- Focus is trapped within the open dialog (`Tab` cycles within it, does not
  escape to background content) while it is open.
- `Escape` closes the dialog (unless the dialog represents a destructive
  in-progress action where accidental dismissal must be prevented — document
  the exception in the screen's UX_SPEC entry if so).
- Closing the dialog returns focus to the control that opened it.
- The dialog has `role="dialog"` (or `alertdialog` for confirmations like an
  approval action) and an accessible name (`aria-labelledby` pointing at its
  visible title).

**Verification**: automatable — Playwright test opens each dialog, asserts
focus moved inside it, tabs to the boundary and asserts it wraps rather than
escaping, closes it, and asserts focus returned to the trigger.

## 6. Lens and Responsive Behaviour

Specific to this product's three-lens model (PRD §8.4) and P0 device scope
(tablet and desktop widths only — mobile is out of scope for P0):

- The three demonstration lenses (Leadership, Operations, Technical) remain
  usable — not merely "not broken" — at both tablet (~768–1024px) and
  desktop (≥1280px) widths: no horizontal scroll on primary content, no
  clipped/overlapping controls, touch targets remain reachable at tablet
  width.
- A lens switch reads/writes the lens via the URL (PRD §8.4) and never
  mutates the underlying scenario/workspace state — verified as a UX
  correctness criterion, but also an accessibility one: a screen-reader or
  keyboard user relying on the URL to bookmark/return to a lens must get the
  same lens back.
- Widget reflow (dashboard cards, tables) at tablet width uses responsive
  stacking, not fixed pixel widths that force horizontal scroll.
- Data tables that cannot reasonably reflow at tablet width provide a
  documented, keyboard-accessible mechanism (e.g. horizontal scroll region
  with visible scroll affordance and correct `tabindex`) rather than losing
  content silently.

**Verification**: automatable for layout breakage — Playwright viewport
tests at tablet/desktop breakpoints assert no horizontal scroll on the root
container and no element overlap for primary controls (bounding-box
overlap check); lens-URL-state assertion is a straightforward integration
test. Manual review for genuine usability (not just "not broken").

---

## 7. Review Cadence

- Every new or materially changed `apps/web` screen is checked against this
  document by the `ux-accessibility-reviewer` subagent before merge (per
  `CLAUDE.md` "Claude-specific workflow").
- This document is re-checked whenever `docs/UX_SPEC.md` adds a new screen
  or widget type, since new interaction patterns (e.g. a new widget in
  amendment A5's catalogue) may introduce criteria not yet listed here.
- Security gate 9 in `docs/SECURITY.md` requires these criteria to pass for
  the three demonstration lenses before public deployment (M3).
