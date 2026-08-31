# UX Specification — Operations Intelligence Workbench

Status: normative for Wave 1+ implementation. Binding alongside `docs/PRD.md`
§6, §8, §13, §19, §20, §22.5, §23 and `docs/PLAN_AMENDMENTS.md` (A5, A7).

## How to use this document

This document specifies **behaviour, hierarchy and states**, not visuals. It
contains no colour, type or component-library decisions (PRD §14 Non-Goals,
task OIW-003 Non-Goals). A frontend agent implementing a P0 route should be
able to build it from this document plus the domain contracts in
`packages/contracts/` without inventing product behaviour.

- Route-by-route detail: §5 below.
- Text wireframes (layout skeletons): `docs/ux/`.
- The guided demonstration script: `docs/DEMO_SCRIPT.md`.
- Every screen spec in §5 names the lens(es) it serves and links to its
  wireframe. Every route in §1's table has exactly one screen spec and one
  wireframe file — see §11 for the consistency check.

Where this document had to resolve an ambiguity the PRD left open, the
decision is marked **[Resolved]** with a one-line rationale. All resolutions
are also logged in `docs/agent-runs/OIW-003.md`.

---

## 1. Information Architecture and Route Map

### 1.1 Route table

| # | Route | Screen | Primary lens(es) | Wireframe |
|---|---|---|---|---|
| R1 | `/` | Product landing page | Leadership | `docs/ux/00-landing.md` |
| R2 | `/demo` | Scenario selector | All | `docs/ux/01-scenario-selector.md` |
| R3 | `/demo/[pack]` | Guided scenario start | All | `docs/ux/02-guided-scenario-start.md` |
| R4 | `/w/[workspace]/overview` | Leadership overview (control tower) | Leadership | `docs/ux/03-leadership-overview.md` |
| R5 | `/w/[workspace]/inbox` | Artifact inbox | Operations | `docs/ux/04-artifact-inbox.md` |
| R6 | `/w/[workspace]/review` | Review queue | Operations | `docs/ux/05-review-queue.md` |
| R7 | `/w/[workspace]/cases` | Case list | Operations | `docs/ux/06-case-list.md` |
| R8 | `/w/[workspace]/cases/[caseId]` | Case detail | Operations | `docs/ux/07-case-detail.md` |
| R9 | `/w/[workspace]/entities` | Entity list | Operations | `docs/ux/08-entity-list.md` |
| R10 | `/w/[workspace]/entities/[entityId]` | Entity detail | Operations | `docs/ux/09-entity-detail.md` |
| R11 | `/w/[workspace]/decisions` | Decision centre | Leadership + Operations | `docs/ux/10-decision-centre.md` |
| R12 | `/w/[workspace]/technical/artifacts/[id]` | Technical inspector — artifact | Technical | `docs/ux/11-technical-artifact-inspector.md` |
| R13 | `/w/[workspace]/technical/rules/[id]` | Technical inspector — rule trace | Technical | `docs/ux/12-technical-rule-trace.md` |
| R14 | `/w/[workspace]/audit` | Audit explorer | Technical | `docs/ux/13-audit-explorer.md` |
| R15 | `/w/[workspace]/about-pack` | Active pack explanation | Technical | `docs/ux/14-about-pack.md` |
| R16 | `/adapt` | Workflow-assessment CTA | Leadership | `docs/ux/15-adapt-cta.md` |

Task OIW-003's ten named P0 screens (scenario selector, leadership overview,
artifact inbox, review queue, case list, case detail, entity detail, decision
centre, technical inspector, audit explorer) map onto R2, R4, R5, R6, R7, R8,
R10, R11, R12, R14. "Technical inspector" in the task packet corresponds to
the two technical routes R12/R13, which share one navigation frame and differ
only by inspected object (artifact vs. rule). **[Resolved]**: entity list
(R9) and rule trace (R13) are not in the task's named ten but are P0 routes
per PRD §19, so they receive full screen specs to satisfy "every route in the
route map has a screen spec."

**[Resolved]** — naming: PRD §19 labels R10 "Entity timeline"; PRD §20.6
titles the equivalent section "Entity Detail" and includes a timeline as one
of several sections. This spec uses "Entity Detail" throughout (matching
§20.6 and the task packet); "timeline" is a section within that screen, not
the screen's name.

### 1.2 Workspace shell (applies to R4–R15)

Every `/w/[workspace]/*` route renders inside one persistent shell:

- **Top bar**: active pack name and icon (from pack `labels.pack_name`),
  synthetic-data notice (persistent, not dismissible — PRD §16.4 and §13.1),
  lens switcher (segmented control: Leadership / Operations / Technical),
  guest session indicator with remaining session time and a **Reset demo**
  action, and the **Adapt this workflow** CTA (§9).
- **Primary navigation** (left rail, desktop; collapsible drawer, tablet):
  Overview, Inbox, Review Queue, Cases, Entities, Decisions, Technical
  (submenu: Artifacts, Rules), Audit, About this pack. All items are always
  present and reachable regardless of the active lens — see §1.3.
  **[Resolved]**: PRD §8.4 says lenses "must display the same underlying
  data" and visitors "may switch lenses freely"; restricting nav by lens
  would fragment that guarantee, so nav visibility is constant and the lens
  instead changes emphasis, defaults and copy (§1.3).
- **Breadcrumb bar**: `<Pack name> / <Section> / <Item>`. The pack-name
  crumb always links to `/w/[workspace]/overview` (the one route PRD §19
  designates the workspace's control tower), independent of the active lens.
  Section crumb links to the section's list route (e.g. `Cases`) when a
  detail route is open.
- **Main content region**: the screen itself (§5).

### 1.3 Lens switching and persistence

- The active lens is carried as a query parameter, `?lens=leadership |
  operations | technical`, appended by the shell on every `/w/[workspace]/*`
  route. This satisfies PRD §8.4 ("current lens should persist in the URL")
  without introducing parallel route trees.
- Switching lenses **re-renders the current route in place**. It never
  navigates to a different route, never resets scenario state (open filters,
  scroll position, in-progress form input), and never creates a second copy
  of workspace state. It changes only:
  1. Which optional detail panels are expanded by default (e.g. the
     "Technical trace" panel on Case Detail is expanded by default only
     under Technical lens; it is present but collapsed under the other two).
  2. Label and copy tone sourced from the pack's lens-scoped label set
     (§8, below).
  3. The primary nav item highlighted as "home" for that lens (Leadership →
     Overview, Operations → Inbox, Technical → Technical/Artifacts), used
     only for highlighting, not forced navigation.
- A route's "Primary lens" in §1.1 sets the **default** lens when a visitor
  arrives at that route with no `lens` param (e.g. arriving at `/w/.../cases`
  with no query defaults to `?lens=operations`). R11 (Decision Centre) has no
  single primary lens; it defaults to whichever lens the visitor was in
  immediately prior, or `leadership` if none.
- Permissions are a separate concern from lenses (PRD §8.4): P0 has no
  authentication, so this distinction is documentation-only in P0 and does
  not gate any UI.

### 1.4 Breadcrumb behaviour detail

| Depth | Example | Behaviour |
|---|---|---|
| 1 | `Asset Reliability` | Always present, always links to Overview. |
| 2 | `Asset Reliability / Cases` | Present on list and detail routes; links to the list route. |
| 3 | `Asset Reliability / Cases / CASE-0231` | Present only on detail/nested routes; not a link (current page). |

Technical routes nest one level deeper implicitly via the "Technical" section
crumb (`Asset Reliability / Technical / Artifacts / ART-0091`), but the
primary nav item is a single "Technical" entry with the Artifacts/Rules
submenu — the breadcrumb, not the nav, carries the extra depth.

---

## 2. Scenario-Selection Journey (PRD §13.1–13.2)

1. **Landing (`/`)** — Leadership-oriented marketing/explainer page. Primary
   CTA: "See it work" → `/demo`. Secondary CTA: "Adapt this workflow" →
   `/adapt`.
2. **Scenario selector (`/demo`)** — Synthetic-data notice is the first thing
   rendered above the pack cards, not a footnote:
   > This demonstration uses synthetic operational information. Select a
   > scenario and follow the information from source to action.
   Three pack cards (Asset Reliability, Process Exception Management,
   Document Assurance) per §20.1. Selecting a card navigates to
   `/demo/[pack]`; it does not yet create a workspace (workspace creation is
   deferred to the explicit Start action on R3, so a visitor can read the
   pack's problem statement before any state is created).
3. **Guided scenario start (`/demo/[pack]`)** — Recaps the pack's problem
   statement, source types, and offers two explicit entry points
   (**[Resolved]**, since PRD §13.2 has the visitor land in the inbox for the
   guided tour while §19 makes Overview the general workspace home — both are
   valid entries, so the screen offers both rather than picking one):
   - **Start guided tour** → creates the synthetic workspace (PRD §13.2 data
     load: assets, locations, historical events, open cases, source
     artifacts, rules, metrics) and navigates to
     `/w/[workspace]/inbox?lens=operations` with the tour overlay active
     (see `docs/DEMO_SCRIPT.md`).
   - **Explore freely** → creates the same workspace, navigates to
     `/w/[workspace]/overview?lens=leadership`, no tour overlay.
   Synthetic-data notice repeats here, adjacent to the Start actions, since
   this is the point workspace creation actually happens.
4. Every subsequent screen keeps the synthetic-data notice visible in the
   shell top bar (§1.2) — it is never a one-time dismissible toast.

---

## 3. The Three Lenses

All three lenses read the same Workspace/Case/Entity/Decision/Signal state
(PRD §9). None of the three lenses owns a separate data model; they are
presentation configurations over one canonical state, switched per §1.3.

### 3.1 Leadership Lens (PRD §8.1)

Audience: prospective business buyer (§6.1). Goal: business impact, risk
summary, decisions, trends, bottlenecks — a buyer conversation.

- Avoids model/extraction detail by default (no confidence scores, no rule
  IDs on Leadership screens) — those remain one click away via "Inspect how
  this was derived" links, never removed, only deferred.
- Primary widgets (§6, below): stat cards, severity breakdown, trend line,
  SLA table, pending-approvals card, activity feed, text/impact card.
- Never presents a Hypothetical or Estimated metric with the same visual
  weight as an Observed one — see §7.

### 3.2 Operations Lens (PRD §8.2)

Audience: operational manager (§6.2). Goal: show how work is executed —
queues, assignments, workflow state, accountability.

- Every case, action item and decision surface must show **owner**, **state**,
  **due date**, and (where applicable) **approval status** — this is an
  acceptance criterion (PRD §9.10–9.13; task OIW-003 acceptance criteria).
- Primary views: Inbox, Review Queue, Cases, Entities (with timelines),
  Decisions.

### 3.3 Technical Lens (PRD §8.3)

Audience: technical evaluator (§6.3). Goal: prove the system is explainable,
controlled and implementable.

- Must expose, for any derived value: evidence span, confidence, extractor
  identity/version, rule trace, entity-resolution trace, provider metadata,
  audit trail, raw API payload, processing duration, and abstention state
  (PRD §22.5 — this is the explainability checklist every Technical screen is
  built to answer).
- The Technical lens is the only lens where confidence scores and rule IDs
  are shown by default rather than behind a toggle.

### 3.4 Pack configuration of lenses

Per PRD §8.4, packs configure **labels and widgets** for each lens, not
behaviour or data shape. A pack manifest's `labels` map supplies, per lens,
the display strings a generic component renders (§8). Packs cannot add,
remove or reorder the fixed widget types (A5) or change which fields a lens
is required to show (§3.1–3.3 above); they can only choose which of the
catalogue widgets appear on their dashboards and what those widgets are
labelled and configured to query (§6).

---

## 4. Guided Tour

`docs/DEMO_SCRIPT.md` is the source of truth for tour copy and step order.
UX-level tour mechanics, common to all three packs:

- The tour is an overlay (spotlight + step panel), not a separate route —
  it runs on top of the normal screens listed in §1.1, so URLs, lens and
  breadcrumb behave exactly as they would without the tour.
- Each step pins one on-screen element, shows step text, and offers **Next**,
  **Back**, and **Exit tour**. Exiting leaves the visitor on the current
  screen with full manual navigation.
- The tour never fabricates data: every value shown in a tour step exists in
  the pack's fixture data and is reachable by the same route/state without
  the tour running.
- Tour progress is not persisted across a page reload in P0 (no server-side
  tour state) — reloading exits the tour silently rather than erroring.

---

## 5. Screen Specifications

Each screen below follows one template: user goal, information hierarchy,
components, states, actions, tablet/desktop behaviour, accessibility. Widget
references point to §6. Wireframe file is linked at the top of each entry.

### 5.1 R1 — Product Landing Page (`/`)

Wireframe: `docs/ux/00-landing.md`. Lens: Leadership only (no switcher — this
route is outside the workspace shell).

- **User goal**: Understand what problem the platform solves and decide
  whether to see it work.
- **Information hierarchy**: Value proposition headline → problem statement
  (PRD §3) → "See it work" primary CTA → three-lens explainer (short, one
  line per lens) → "Adapt this workflow" secondary CTA → footer (links to
  `/demo`, `/adapt`, public repository).
- **Components**: Hero, three-lens summary card row, primary/secondary CTA
  buttons, footer nav.
- **States**: Static content only — no loading/error/empty states (no
  server-dependent data on this route).
- **Actions**: "See it work" → `/demo`. "Adapt this workflow" → `/adapt`.
- **Tablet/desktop**: Lens summary cards stack to one column under 768px;
  three-column row at desktop widths.
- **Accessibility**: Heading levels strictly ordered (h1 hero → h2 sections);
  CTA buttons are real `<button>`/`<a>` elements with visible focus states;
  no content conveyed by colour alone.

### 5.2 R2 — Scenario Selector (`/demo`)

Wireframe: `docs/ux/01-scenario-selector.md`. Lens: All (pre-lens; no
workspace exists yet).

- **User goal**: Choose which of the three packs to explore.
- **Information hierarchy**: Synthetic-data notice (§2) → three pack cards in
  a row, each showing per PRD §20.1: pack name, problem statement, source
  types, example output, estimated demonstration length, three-lens
  description, synthetic-data notice, Start button.
- **Components**: Pack card ×3 (Asset Reliability, Process Exception
  Management, Document Assurance).
- **States**:
  - *Default*: three cards populated from the pack registry.
  - *Loading*: skeleton cards (three placeholders matching card layout) while
    the pack registry loads.
  - *Empty*: if the registry returns zero packs, show one full-width message
    ("No scenario packs are currently available") — this indicates a
    deployment error, not a normal state, and is not expected in the public
    demo.
  - *Error*: registry fetch failure shows a retry action; the synthetic-data
    notice still renders (it is static copy, not data-dependent).
- **Actions**: Selecting a card navigates to `/demo/[pack]`.
- **Tablet/desktop**: Three-column card row at desktop; single column,
  stacked, at tablet width.
- **Accessibility**: Cards are `<article>` regions with a heading per card;
  the whole card is not one giant click target with no visible affordance —
  the Start action inside each card is the focusable, named control.

### 5.3 R3 — Guided Scenario Start (`/demo/[pack]`)

Wireframe: `docs/ux/02-guided-scenario-start.md`. Lens: All.

- **User goal**: Confirm pack choice, understand what's about to happen,
  choose guided vs. free exploration.
- **Information hierarchy**: Pack name + problem statement (recap) →
  synthetic-data notice → what will be created (assets, locations, historical
  events, open cases, source artifacts, rules, metrics — PRD §13.2 list) →
  two entry actions (§2.3).
- **Components**: Recap panel, data-manifest list, two CTA buttons (Start
  guided tour / Explore freely).
- **States**:
  - *Default*: static recap content plus the two actions.
  - *Loading*: after either action is clicked, an inline spinner replaces the
    action row while the workspace is created (PRD §16.2: fixture processing
    should feel immediate — this should typically resolve in under a second
    given deterministic fixtures).
  - *Error*: workspace creation failure shows an inline error with a retry
    action; no partial workspace is left behind (retry is idempotent).
- **Actions**: Start guided tour, Explore freely (§2.3).
- **Tablet/desktop**: Single-column layout at both widths (this screen has no
  dense grid content).
- **Accessibility**: The two entry actions are clearly differentiated by
  label text, not only by position or colour.

### 5.4 R4 — Leadership Overview (`/w/[workspace]/overview`)

Wireframe: `docs/ux/03-leadership-overview.md`. Lens: Leadership.

- **User goal**: Understand current operational state, risk and pending
  decisions at a glance, in an executive/buyer conversation.
- **Information hierarchy** (top to bottom, per PRD §20.2): current
  operational state summary → Critical Signals → Open Cases → Pending
  Decisions → SLA risk → trend chart → repeated-pattern card → impact-
  hypothesis card → recent activity → two navigation CTAs ("View operational
  queue", "Inspect how this was derived").
- **Components** (widget catalogue references, §6): Stat cards (Critical
  Signals, Open Cases, Pending Decisions), Severity breakdown widget, SLA
  table widget (compact/summary form), Trend line widget, Text/impact card
  (repeated-pattern card and impact-hypothesis card each use this widget
  type), Activity feed widget.
- **States**:
  - *Default*: populated widgets per the pack's `dashboard_definitions` for
    the Leadership lens.
  - *Empty*: a freshly created workspace with no processed artifacts yet
    shows all widgets in a zero-state ("No critical signals yet — process an
    artifact to begin", linking to Inbox) rather than hiding the widgets.
  - *Loading*: each widget renders its own skeleton independently (widgets
    load in parallel; one slow widget does not block the others — PRD
    §16.2).
  - *Error*: a widget that fails to load shows an inline retry within its own
    card boundary; it does not fail the whole page.
- **Actions**: "View operational queue" → `/w/[workspace]/inbox`. "Inspect
  how this was derived" → the relevant Technical route for the item in
  context (e.g. from a specific signal, to that signal's triggering rule
  trace).
- **Tablet/desktop**: Widget grid is 3-column at desktop (≥1280px), 2-column
  at tablet (≥768px), never single-column-with-horizontal-scroll (PRD
  §16.3 tablet/desktop usability requirement).
- **Accessibility**: Each widget is a labelled region (`aria-labelledby` its
  own heading); the trend chart provides a text/table alternative for the
  same data, not colour-only encoding of direction.

### 5.5 R5 — Artifact Inbox (`/w/[workspace]/inbox`)

Wireframe: `docs/ux/04-artifact-inbox.md`. Lens: Operations.

- **User goal**: See what has arrived and what needs processing.
- **Information hierarchy**: Filter/sort bar → table, columns per PRD §20.3:
  Source, Artifact type, Received time, Processing status, Linked entity,
  Observations found, Review required, Related case.
- **Components**: Data table with sortable columns, status badges
  (processing status: received / processing / processed / needs-review /
  failed), row action (**Process**).
- **States**:
  - *Default*: paginated table (PRD §16.2 — large fixture sets use pagination
    or virtualisation).
  - *Empty*: "No artifacts have arrived yet" with a pointer back to the tour
    if active.
  - *Loading*: table skeleton (8 placeholder rows).
  - *Error*: inline banner above the table with retry; existing rows (if any
    were already loaded) remain visible rather than being cleared.
  - *Row-level processing state*: clicking **Process** on a row shows an
    inline spinner in that row's status cell; on completion the row updates
    in place (status → processed or needs-review) without a full table
    reload.
- **Actions**: Process (per row), open artifact (row click → Technical
  Inspector, R12, since the inbox itself does not render raw content —
  PRD §20.8 owns that), filter by source/type/status.
- **Tablet/desktop**: At tablet width, lower-priority columns (Related case)
  collapse into an expandable row detail; at desktop all columns are visible
  inline.
- **Accessibility**: Table has a real `<thead>` with scoped headers; status
  is conveyed by a text label plus icon, not colour alone (PRD §16.3).

### 5.6 R6 — Review Queue (`/w/[workspace]/review`)

Wireframe: `docs/ux/05-review-queue.md`. Lens: Operations.

- **User goal**: Resolve ambiguous or low-confidence extractions before they
  become operational fact.
- **Information hierarchy**: Queue list (left rail, one entry per pending
  Observation review) → selected item's two-pane detail: raw source on the
  left, structured observation on the right, with the evidence span
  highlighted in the raw source (PRD §20.4 layout).
- **Components**: Queue list, source viewer pane with evidence highlight,
  observation detail pane (extracted value, confidence, alternative
  candidate if any, evidence citation), action bar.
- **States**:
  - *Default*: queue populated, first item auto-selected.
  - *Empty*: "Review queue is clear" full-pane message — this is a valid,
    expected state (PRD §16.6 abstention path exists but not every workspace
    has pending review at all times).
  - *Loading*: queue list skeleton; detail pane skeleton independently (item
    selection can complete before the queue list finishes, or vice versa).
  - *Error*: action failure (e.g. Accept fails to save) shows an inline
    error on the action bar and leaves the item selected and unsaved rather
    than silently discarding the reviewer's input.
- **Actions** (PRD §20.4): Accept, Correct, Reject, Mark insufficient
  evidence, Link entity, Create entity, Add reviewer note. Completing any
  action advances to the next queue item automatically; the reviewer can also
  navigate the queue manually.
- **Tablet/desktop**: At tablet width the two-pane detail stacks vertically
  (source above, observation below) with the queue list becoming a
  collapsible drawer; at desktop the three regions (queue, source, detail)
  are side by side.
- **Accessibility**: The evidence highlight in the raw source is conveyed by
  more than colour (e.g. underline + background + a visible marker); Accept/
  Correct/Reject are distinct, individually labelled controls, not a single
  ambiguous icon row; focus moves to the newly selected queue item's heading
  after an action completes, so keyboard/screen-reader users aren't stranded
  on a control that just left the page.

### 5.7 R7 — Case List (`/w/[workspace]/cases`)

Wireframe: `docs/ux/06-case-list.md`. Lens: Operations.

- **User goal**: See all open and closed cases, find one to work.
- **Information hierarchy**: Filter/sort bar (status, priority, severity,
  owner) → table: Case title, Status, Priority, Severity, Owner, Due date,
  Related entities (count), SLA indicator.
- **Components**: Data table, status/priority/severity badges, SLA-risk
  indicator (reuses the SLA table widget's per-row treatment, §6.5).
- **States**:
  - *Default*: paginated, sorted by due date ascending by default.
  - *Empty*: "No cases yet" pointing at Inbox/Review Queue as the source of
    new cases.
  - *Loading*: table skeleton.
  - *Error*: inline retry banner, existing rows preserved.
- **Actions**: Row click → Case Detail (R8). Filter/sort controls.
- **Tablet/desktop**: Same column-collapse pattern as Inbox (§5.5) — lower-
  priority columns (Related entities count) collapse into row detail at
  tablet width.
- **Accessibility**: Same table conventions as §5.5; badges carry text labels.

### 5.8 R8 — Case Detail (`/w/[workspace]/cases/[caseId]`)

Wireframe: `docs/ux/07-case-detail.md`. Lens: Operations.

- **User goal**: Understand and progress one case end to end.
- **Information hierarchy** (PRD §20.5 sections, in order): Case summary
  (title, type) → Status/Priority/Owner/SLA → Related entities → Evidence →
  Timeline → Signals → Action items → Decisions → Approval history → Closure
  requirements → Technical trace link.
- **Components**: Summary header, metadata row (status/priority/owner/SLA as
  inline badges/fields), related-entity chips (link to Entity Detail),
  evidence list (link to Technical Inspector), timeline (chronological
  event/observation feed), signal list, action-item checklist (assignee, due
  date, status, completion evidence), decision cards (link to Decision
  Centre entry), approval history list, closure-requirements checklist,
  "View technical trace" link (→ R12/R13 for this case's underlying
  artifacts/rules).
- **States**:
  - *Default*: fully populated per contract fields (PRD §9.10).
  - *Loading*: header renders first (from list-route data already fetched),
    remaining sections skeleton independently.
  - *Empty sections*: a case with no action items yet, for example, shows
    "No action items yet" in that section rather than hiding the section
    heading — every section from §20.5 is always present so the page
    structure never varies case to case.
  - *Error*: section-level retry, consistent with Overview (§5.4).
- **Actions**: Add/complete action item, propose decision (if not yet
  proposed and workflow allows), navigate to related entity/technical trace,
  add case note.
- **Tablet/desktop**: Single scrolling column at tablet width; two-column
  layout at desktop (primary narrative left: summary/timeline/signals;
  secondary right rail: metadata/action items/decisions/closure).
- **Accessibility**: Each of the twelve §20.5 sections is a landmark region
  with its own heading, enabling screen-reader section navigation; the
  action-item checklist uses real checkbox/status semantics, not styled
  `<div>`s.

### 5.9 R9 — Entity List (`/w/[workspace]/entities`)

Wireframe: `docs/ux/08-entity-list.md`. Lens: Operations.

- **User goal**: Browse or search operational entities (assets, locations,
  suppliers, etc. — pack-defined types).
- **Information hierarchy**: Filter bar (entity type, status) → table:
  Display name, Entity type, Status, Open cases (count), Last activity.
- **Components**: Data table, entity-type filter (pack-supplied type list),
  status badge.
- **States**: Default/Empty/Loading/Error follow the same pattern as §5.7
  (Case List) — paginated table, "No entities yet" empty state, skeleton
  loading, inline-retry error.
- **Actions**: Row click → Entity Detail (R10). Filter by type/status.
- **Tablet/desktop**: Same collapse pattern as §5.5/§5.7.
- **Accessibility**: Same table conventions as §5.5.

### 5.10 R10 — Entity Detail (`/w/[workspace]/entities/[entityId]`)

Wireframe: `docs/ux/09-entity-detail.md`. Lens: Operations.

- **User goal**: Understand one entity's full operational history.
- **Information hierarchy** (PRD §20.6 sections): Entity attributes → current
  status → related artifacts → event history (this is the "timeline") →
  open cases → closed cases → repeated patterns → metrics → related
  entities.
- **Components**: Attribute panel, status badge, artifact list (link to
  Technical Inspector), event timeline, case lists (open/closed, links to
  Case Detail), repeated-pattern callout, metric stat cards (with provenance
  badges, §7), related-entity chips.
- **States**: Same default/empty/loading/error pattern as Case Detail
  (§5.8) — every §20.6 section is always structurally present; an entity
  with no closed cases shows "No closed cases" rather than omitting the
  section.
- **Actions**: Navigate to related artifact/case/entity; no entity-detail-
  local mutations in P0 (entity edits, if any, happen via Review Queue's
  "Link entity"/"Create entity" actions, §5.6).
- **Tablet/desktop**: Single column at tablet; two-column at desktop
  (attributes/status/metrics right rail, timeline/cases main column) —
  mirrors Case Detail's layout for consistency.
- **Accessibility**: Same landmark-per-section pattern as Case Detail.

### 5.11 R11 — Decision Centre (`/w/[workspace]/decisions`)

Wireframe: `docs/ux/10-decision-centre.md`. Lens: Leadership + Operations.

- **User goal**: Review and act on proposed Decisions requiring human
  approval — this is where PRD §7.6 ("human approval is a product feature")
  is most visible.
- **Information hierarchy**: Filter (pending / approved / rejected / all) →
  list of Decision cards, each showing per PRD §20.7: Proposed action, Risk
  level, Rationale, Supporting evidence, Triggering rule, Potential
  consequence, Required approver, and the three actions.
- **Components**: Decision card (repeated), risk-level badge, evidence
  citation links, rule-trace link.
- **States**:
  - *Default*: pending decisions listed first, grouped by risk level (highest
    first).
  - *Empty*: "No decisions pending approval" — a normal, positive state, not
    an error.
  - *Loading*: card-list skeleton.
  - *Error*: inline retry; an in-flight approval action that fails shows the
    error on that specific card and leaves the decision in `pending` rather
    than assuming success.
- **Actions**: Approve, Reject, Request more information (PRD §20.7). Every
  action requires the approver to be recorded (PRD §9.13 Approval fields:
  approver, outcome, comment, approved_at) — the UI must collect a comment
  field before Approve/Reject is enabled when the decision's risk level is
  high (PRD §22.4), and always offers an optional comment otherwise.
- **Tablet/desktop**: Card grid is 2-column at desktop, 1-column at tablet.
- **Accessibility**: Each Decision card is a labelled region; Approve/
  Reject/Request-more-information are distinct labelled buttons (never a
  single overloaded control); a confirmation step (not a native `confirm()`)
  is used for Approve/Reject on high-risk decisions, with focus moved into
  the confirmation dialogue and returned to the triggering button on close
  or cancel (PRD §16.3 dialogue focus management).

### 5.12 R12/R13 — Technical Inspector (`/w/[workspace]/technical/artifacts/[id]`, `/w/[workspace]/technical/rules/[id]`)

Wireframe: `docs/ux/11-technical-artifact-inspector.md` and
`docs/ux/12-technical-rule-trace.md`. Lens: Technical.

Both routes share one navigation frame (a tab strip: **Artifact** / **Rule
trace**) so a visitor moving from "what was extracted" to "what fired because
of it" stays in place; the URL still changes per route (each is independently
linkable, e.g. from a Case Detail's evidence citation or triggering-rule
link).

**R12 — Artifact inspector.** Per PRD §20.8:

- **User goal**: Verify exactly how a raw artifact became structured,
  reviewed, operational data.
- **Information hierarchy**: Raw artifact viewer (top or left) → parsed
  representation → extraction schema → proposed observations list (each with
  confidence, evidence coordinates, validation result, review status) →
  entity-resolution candidates → provider metadata → processing duration →
  copyable structured payload (raw JSON).
- **Components**: Raw viewer with evidence-span highlighting (reused from
  Review Queue, §5.6), observation list with confidence badges, JSON payload
  viewer with a "Copy" action, provider-metadata panel (extractor id/version,
  model or rule identifier, timestamp, duration).
- **States**: *Default* fully populated; *Abstained field*: an observation
  with `status: insufficient-evidence` (PRD §22.3) renders explicitly as
  "Insufficient evidence" with the reason string, never as a blank or zero
  value; *Loading*: viewer and list skeleton independently; *Error*: retry,
  raw artifact (if already fetched) stays visible even if derived data fails
  to load, since the artifact itself is immutable and independently
  fetchable (PRD §7.3).
- **Actions**: Copy structured payload, jump to originating Review Queue
  entry if still pending, jump to Rule trace tab for any rule the resulting
  observations fed into.

**R13 — Rule trace.** Per PRD §17.5/§22.5:

- **User goal**: Verify why a rule fired (or didn't) and what it produced.
- **Information hierarchy**: Rule identity (id, version, description) →
  facts evaluated (from the closed fact catalogue, amendment A2) with each
  fact's resolved value → condition evaluation (pass/fail per clause) →
  outcome (Signal/Decision created, or no-op) → state-transition trace →
  audit entries generated by this execution.
- **Components**: Rule header, fact-evaluation table (fact name, resolved
  value, source), condition tree with pass/fail per node, outcome summary,
  linked audit-entry list (→ Audit Explorer, filtered to this execution).
- **States**: Same default/loading/error pattern as R12. *Empty* is not
  applicable — a rule trace only exists for an executed rule.
- **Actions**: Jump to Audit Explorer filtered to this execution; jump to the
  Signal/Decision/Case the rule produced.

- **Tablet/desktop (both)**: At tablet width the raw/parsed panes stack
  vertically; at desktop they sit side by side, matching the Review Queue
  pattern (§5.6) for consistency of "evidence on the left/near, structure on
  the right/near" throughout the product.
- **Accessibility (both)**: JSON payload viewer is a real, selectable text
  region (not an image or canvas render) so it is copyable and readable by
  assistive technology; the fact-evaluation and condition-tree structures use
  proper list/tree semantics.

### 5.13 R14 — Audit Explorer (`/w/[workspace]/audit`)

Wireframe: `docs/ux/13-audit-explorer.md`. Lens: Technical.

- **User goal**: See the append-only record of everything that happened in
  the workspace (PRD §9.15 categories: ingestion, extraction, review,
  correction, rule execution, case creation, assignment, decision proposal,
  approval, closure, export).
- **Information hierarchy**: Filter bar (entry type, actor, date range,
  related object) → chronological entry list, each showing: timestamp, entry
  type, actor (human reviewer, rule id, or system), affected object(s),
  summary.
- **Components**: Filterable, paginated list; entry-type badge; links from
  each entry to the affected object's detail screen.
- **States**:
  - *Default*: reverse-chronological, paginated.
  - *Empty*: only possible immediately after workspace creation before any
    ingestion — "No audit entries yet."
  - *Loading*: list skeleton.
  - *Error*: inline retry, existing entries preserved.
- **Actions**: Filter by type/actor/date/object; open an entry's affected
  object.
- **Tablet/desktop**: List remains single-column at both widths (this is a
  log, not a grid); filter bar collapses into a drawer at tablet width.
- **Accessibility**: List entries are a real ordered/list structure with
  timestamps in a consistent, programmatically readable format; audit
  entries are read-only in the UI at every width (PRD §16.4 — "not editable
  through ordinary application flows" — there is no edit affordance to omit
  on small screens because none exists at any width).

### 5.14 R15 — About This Pack (`/w/[workspace]/about-pack`)

Wireframe: `docs/ux/14-about-pack.md`. Lens: Technical.

- **User goal**: Understand what the active pack configures, as proof the
  core platform is neutral (PRD §13.11 — the primary proof point).
- **Information hierarchy**: Pack identity (name, version, description) →
  entity types defined → event types defined → observation schemas → rules
  (list, link to Rule trace when executed) → workflows (states/transitions)
  → metrics defined → dashboard definitions → a short explainer: "None of
  this is hard-coded in the platform — it is all configuration read from
  this pack's manifest."
- **Components**: Manifest-summary sections (one per manifest field from PRD
  §9.2), each rendered generically from the pack manifest — this screen is
  itself proof that the core doesn't special-case any pack.
- **States**: *Default* fully populated from the active pack's manifest;
  *Loading*: section skeletons; *Error*: retry (a manifest load failure here
  is a deployment error, since the workspace already required a valid
  manifest to exist).
- **Actions**: Links from rules/events/entities out to their live instances
  elsewhere in the workspace where applicable.
- **Tablet/desktop**: Single scrolling column at both widths.
- **Accessibility**: Manifest sections are headed landmarks; this screen is
  a strong candidate for "read the whole page" assistive-technology use, so
  heading order must exactly match the information hierarchy above.

### 5.15 R16 — Adapt CTA (`/adapt`)

Wireframe: `docs/ux/15-adapt-cta.md`. Lens: Leadership.

- **User goal**: Convert interest into a scoped conversation about adapting
  the platform to the visitor's organisation.
- **Information hierarchy**: Headline ("Adapt this workflow to your
  organisation" — PRD §23.2) → short explainer of what happens next → form.
- **Components**: Form fields per PRD §23.2: Organisation, Industry,
  Operational workflow, Current source systems, Approximate information
  volume, Main bottleneck, Current reporting method, Data sensitivity,
  Desired result, Contact details, Scenario being viewed (pre-filled from
  the referring workspace/pack if the visitor arrived via a workspace CTA,
  §9 below; otherwise a select field).
- **States**:
  - *Default*: empty form, "Scenario being viewed" pre-filled where known.
  - *Submitting*: submit button shows a busy state; form fields disabled.
  - *Success*: confirmation message replaces the form; no redirect (visitor
    may want to return to the demo).
  - *Error*: inline field-level validation errors on blur/submit; a
    submission-level error banner if the backend call fails, with form
    values preserved (never cleared on failure).
- **Actions**: Submit. PRD §23.3 (automated assessment output) and event
  tracking (§23.1) are explicitly deferred per amendment A7 — this screen's
  P0 scope is the form and its submission state only; no tracking calls are
  specified here.
- **Tablet/desktop**: Single-column form at both widths; label-above-field
  pattern (not label-beside-field, which compresses poorly at tablet width).
- **Accessibility**: Every field has a programmatically associated `<label>`;
  required fields are marked in text ("required"), not by colour/asterisk
  alone; validation errors are associated to their field via
  `aria-describedby` and announced on submit failure.

---

## 6. Widget Catalogue (Amendment A5)

P0 ships exactly these ~8 widget types. Packs choose which appear and supply
labels/config; packs do not define new widget types or arbitrary queries.
Every widget's data comes from one of the small set of core aggregation
queries specified by the pack's `metrics`/`dashboard_definitions` (PRD §9.2,
§9.14).

### 6.1 Stat card

- **Anatomy**: Label (pack-supplied), primary value, provenance badge (§7),
  optional trend delta (e.g. "+3 this week"), optional click-through target.
- **Configuration surface**: metric key, label, provenance type, optional
  comparison window for the delta, optional click-through route.
- **Used by**: Leadership Overview (Critical Signals, Open Cases, Pending
  Decisions), Entity Detail (metrics section).

### 6.2 Severity breakdown

- **Anatomy**: Horizontal or stacked breakdown of a count by severity tier,
  with each tier's count and label. Severity tiers are pack-defined (e.g.
  critical/high/medium/low) but the widget itself is generic over "count by
  tier."
- **Configuration surface**: metric key (a count grouped by a pack-defined
  severity/tier field), tier order and labels, click-through per tier
  (typically to a filtered Case List).
- **Used by**: Leadership Overview.

### 6.3 List card

- **Anatomy**: Card with a heading, a short list of items (typically 3–5),
  each with a title and one supporting line, and a "View all" link.
- **Configuration surface**: metric/query key (a bounded list, e.g. most
  recent N), item template (title field, supporting-line field), "View all"
  target route.
- **Used by**: Leadership Overview (repeated-pattern card can render as a
  list card variant when it has multiple items), Case Detail's related lists
  reuse this pattern presentationally (not necessarily the identical
  component instance, but the same anatomy).

### 6.4 Trend line

- **Anatomy**: Line chart over a time window, one or more series, plus a
  text/table alternative representation for accessibility (PRD §16.3).
- **Configuration surface**: metric key (a time series), time window,
  series labels, provenance badge if the series includes any non-Observed
  values.
- **Used by**: Leadership Overview.

### 6.5 SLA table

- **Anatomy**: Compact table of items at risk, columns: item name, due date,
  time remaining/overdue-by, risk indicator (text label, not colour-only).
- **Configuration surface**: metric/query key (items with a due date within
  or past a threshold), threshold value, click-through per row to the item's
  detail (Case Detail typically).
- **Used by**: Leadership Overview (SLA risk), Case List (per-row SLA
  indicator reuses this widget's row treatment).

### 6.6 Pending-approvals card

- **Anatomy**: Card with a count, a short list of the highest-risk pending
  decisions (title + risk level), and a "View all" link to Decision Centre.
- **Configuration surface**: none beyond the standard list-card surface
  (§6.3) scoped to Decisions with `status: pending` — this widget is
  effectively a specialised list card; it is catalogued separately because
  PRD §8.1 names it as a distinct primary widget with a fixed data source
  (pending Decisions), not an arbitrary configurable list.
- **Used by**: Leadership Overview.

### 6.7 Activity feed

- **Anatomy**: Reverse-chronological short list of recent notable events
  (case created, decision approved, artifact processed), each with a
  timestamp and one-line summary; "View full audit log" link.
- **Configuration surface**: entry-type filter (which audit-entry categories
  to surface — typically a curated subset, not the full audit log), item
  count.
- **Used by**: Leadership Overview.

### 6.8 Text/impact card

- **Anatomy**: Card with a heading, short narrative or explanatory text, and
  an optional supporting metric with its provenance badge. This is the
  widget type used for the impact-hypothesis card and is the only widget
  type permitted to display Hypothetical or Estimated values as its headline
  content, and even then only with the provenance badge and qualifying
  language visible in the same visual frame (§7).
- **Configuration surface**: heading, body text (pack-supplied, may include
  a metric interpolation), metric key (optional), provenance type.
- **Used by**: Leadership Overview (repeated-pattern card when narrative-only,
  impact-hypothesis card).

---

## 7. Metric Provenance Labelling

PRD §7.9 and §9.14: every Metric is Observed, Calculated, Estimated, or
Hypothetical, and Hypothetical values must never read as measured results.

### 7.1 Badge treatment

- Every metric value rendered anywhere in the product (stat cards, trend
  lines, SLA indicators, entity metrics, impact cards) carries a **text
  badge**, not a colour-only indicator (PRD §16.3): `Observed` /
  `Calculated` / `Estimated` / `Hypothetical`.
- Badge placement is immediately adjacent to the value it describes (inline
  or directly beneath), never in a separate legend the user must cross-
  reference.
- Each badge has a fixed, always-available tooltip/expandable definition:
  - **Observed** — "Recorded directly from a source artifact or explicit
    entry."
  - **Calculated** — "Computed deterministically from Observed data by a
    defined rule or aggregation."
  - **Estimated** — "A system-produced approximation with stated confidence,
    not a direct observation."
  - **Hypothetical** — "An illustrative projection for demonstration
    purposes, not a measured result."

### 7.2 Hypothetical/Estimated safeguards

- Hypothetical values never appear in a Stat card, Severity breakdown, SLA
  table, or Trend line — those widget types are reserved for Observed/
  Calculated data (Estimated may appear there if clearly badged, since
  Estimated is still a system-produced measurement, not an illustration).
  Hypothetical content is confined to the Text/impact card (§6.8), which
  structurally forces the badge and surrounding qualifying language into the
  same visual frame as the number.
- Hypothetical values are never mixed into the same list/table as Observed
  or Calculated values without a per-row badge distinguishing them (e.g. a
  list card must not silently blend real case counts with a hypothetical
  projected count in one undifferentiated list).
- Any Hypothetical value's supporting text must include a qualifier in the
  sentence itself (e.g. "If this pattern continues, illustrative downtime
  exposure could reach ~$X" — not "Downtime exposure: $X").

---

## 8. Language Rules and Pack-Label Flow

Generic core components never contain industry vocabulary (PRD §7.2, §10).

### 8.1 Rule

- Every user-facing string that names a domain concept (an entity type, event
  type, signal type, case type, action type, decision type, or workflow
  state) is resolved through a **label lookup** against the active pack's
  `labels` map, never hard-coded in a component.
- Generic components render by **generic key**, with a generic English
  fallback string if a pack omits a label (so a screen never renders blank or
  a raw key like `entity.asset` to a user) — e.g. fallback "Entity" if
  `labels.entity_types.asset` is absent.
- Structural/procedural copy (button labels like "Approve", "Accept",
  section headings like "Timeline", "Evidence") is core copy and is never
  pack-configurable — only the *domain nouns* are pack-supplied.

### 8.2 Label categories a pack manifest supplies (per PRD §9.2 `labels`)

- Pack name and description.
- Entity type display names (singular/plural) per pack-defined entity type.
- Event type display names.
- Signal type display names.
- Case type display names.
- Action type display names.
- Decision type display names.
- Workflow state display names.

### 8.3 Verification

A screen spec in §5 fails review if it names an industry-specific noun (e.g.
"vehicle," "patient," "batch inspection") anywhere outside an explicitly
pack-sourced example. §5 above uses only generic nouns (Case, Entity, Signal,
Decision, Artifact) plus the Asset Reliability pack's own vocabulary
strictly inside `docs/DEMO_SCRIPT.md`, which is pack-specific by design.

---

## 9. "Adapt This Workflow" CTA Placement

UI placement only — event tracking is deferred per amendment A7 (PRD §23.1
is out of scope for this task).

- **Persistent**: a CTA button/link in the workspace shell top bar (§1.2),
  present on every `/w/[workspace]/*` route.
- **Contextual — Leadership Overview**: a banner variant appears in the
  activity-feed/impact-card area after the visitor has viewed at least one
  Case Detail or Decision in the current session (**[Resolved]**: PRD §14
  requires "clear Adapt this workflow call to action" without specifying a
  trigger condition; gating it on demonstrated engagement, rather than
  showing it immediately on a page with zero context, is a reasonable
  reading and is easy to implement client-side with no tracking dependency —
  a simple session-local "has visited a detail route" flag).
- **Contextual — Case Detail closure**: when a case's closure requirements
  are all satisfied (PRD §20.5 closure requirements section), the closure
  state includes the CTA as a natural "what next" prompt.
- **End of guided tour**: the tour's final step (§4) always ends on the CTA
  as its last pinned element before "Exit tour."
- **Landing and Scenario Selector**: secondary CTA per §2.1/§2.2.

All CTA instances link to `/adapt` (R16) and pass the current pack/scenario
as the pre-fill for "Scenario being viewed" (§5.15) via a query parameter,
e.g. `/adapt?scenario=asset-reliability`.

---

## 10. Screenshot Requirements for Future UI PR Reviews

Any PR that changes a screen in §5 (per `AGENTS.md`: "For UI work, verify
against `docs/UX_SPEC.md` and include screenshots in the PR for visible
changes") must include:

1. **One screenshot per changed screen at desktop width** (≥1280px viewport)
   showing the default/populated state.
2. **One screenshot at tablet width** (≈768–834px viewport) of the same
   screen, demonstrating the tablet/desktop behaviour specified in that
   screen's §5 entry.
3. **Non-default states touched by the PR**: if the PR changes empty,
   loading, or error handling for a screen, include a screenshot of each
   changed state — do not screenshot states the PR left unchanged.
4. **Lens variants**: if the PR changes a screen whose behaviour differs by
   lens (per §1.3 — e.g. Case Detail's technical-trace panel default), one
   screenshot per affected lens.
5. **Before/after pairing**: for a visual or layout change to an existing
   screen, pair each new screenshot with the prior screenshot it replaces.
6. Screenshots are attached directly to the PR description, not linked to an
   external host (PR descriptions are the durable record).

This does not replace the `ux-accessibility-reviewer` subagent's review
against this document and PRD §16.3; screenshots let a human reviewer verify
what the automated review checked.

---

## 11. Internal Consistency Check

- Every route in §1.1 (16 routes) has exactly one numbered entry in §5 and
  one wireframe file in `docs/ux/` — verified by the route-to-wireframe
  column in §1.1 and cross-referenced against the `docs/ux/` file listing
  in §0 of `docs/ux/README.md`.
- Every screen spec in §5 names its lens(es) in its heading line.
- Task OIW-003's acceptance criteria, verified against this document:
  - *Every P0 route is implementable without inventing product behaviour* —
    §5 gives goal/hierarchy/components/states/actions/responsive/
    accessibility for all 16 routes.
  - *The three lenses demonstrably describe the same underlying state* — §3
    plus §1.3 (lens switch never changes route or resets state).
  - *Technical lens exposes evidence, confidence, rule trace and audit* —
    §3.3, §5.12, §5.13.
  - *Leadership lens never presents hypothetical ROI as measured results* —
    §3.1, §7.
  - *Operations lens shows owners, states, due dates and approvals* — §3.2,
    §5.7, §5.8.
  - *No screen is tied to one industry* — §8, verified per-screen in §5 (no
    industry noun outside pack-sourced examples).
