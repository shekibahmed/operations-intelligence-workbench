# Release Checklist — M3 / M4

Status: Wave 4 security evidence refreshed by OIW-812. Defines the gate each milestone must clear before being
declared done, per `docs/PRD.md` §36 (release milestones) and §34
(definition of done). This checklist is additive to, not a replacement for,
the Definition of Done in PRD §34 — every item there still applies to every
task; this document is milestone-level, not task-level.

---

## M3 — Public Demonstration

Per PRD §36, M3 demonstrates: hosted product, guided tour, public
repository, technical documentation, commercial adaptation CTA. Amendment A7
re-stages exports (FR-110) and analytics/CTA tracking (FR-120/121) to Waves
4–5, and requires only the Asset Reliability pack complete with tour for M1
— by M3 all three packs are expected per the original M2/M3 sequencing, with
reduced fixture sets acceptable for packs two and three per A7.

### Functional completeness

- [ ] All P0 functional requirements from `docs/PRD.md` §15 pass their
      mapped verification method in `docs/EVALUATION.md` §3, **excluding**
      FR-110/120/121 (re-staged out of P0 by amendment A7).
- [ ] All three Scenario Packs (Asset Reliability, Process Exceptions,
      Document Assurance) are registered and pass the pack contract tests in
      `docs/EVALUATION.md` §2.
- [ ] The north-star demonstration journey (PRD §13, all ten steps) works
      end-to-end for at least the Asset Reliability pack, with a Playwright
      test covering it (PRD §16.6 "public demonstration journey has an
      end-to-end test").
- [ ] Guided tour exists for Leadership lens on all three packs; Operations
      and Technical tours may be reduced/absent per amendment A7 ("Leadership
      tour only for packs two and three initially").
- [ ] Scenario reset (FR-005) verified to restore identical seeded state.

### Quality gates

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:contracts`,
      `pnpm build`, `pnpm validate:packs`, `pnpm architecture:check` all pass
      on the release commit.
- [ ] `pnpm eval` passes for all three packs at the thresholds in
      `docs/EVALUATION.md` §4–8.
- [ ] `pnpm test:e2e` passes, including the approval-bypass tests
      (`docs/EVALUATION.md` §9) and workspace-isolation tests
      (`docs/EVALUATION.md` §10).
- [ ] Every acceptance criterion in every merged task packet under
      `docs/tasks/` is marked pass in that task's `docs/agent-runs/*.md`.

### Security

- [x] Every threat row in `docs/SECURITY.md` §§2–3 has a Closed-with-
      evidence or Accepted-risk-with-owner/rationale disposition.
- [ ] All ten public-deployment gates in `docs/SECURITY.md` §5 are satisfied,
      including the deployment-time checks that cannot close in source CI.
- [ ] `security-reviewer` subagent has returned PASS on the most recent PR
      touching ingestion, API routes, persistence, rendering, or the
      approval engine.
- [ ] No live-provider API key is required for the default public path — the
      fixture provider is the default (PRD §17.7).
- [ ] Rate limiting and TTL expiry verified against the guest-session threat
      analysis in `docs/SECURITY.md` §2 in the actual deployed environment,
      not only in CI.
- [ ] `OIW_TRUSTED_PROXY_HEADER` matches the deployed edge and the edge strips
      client-supplied copies; Vercel uses `x-vercel-forwarded-for` per
      `docs/DEPLOYMENT.md` §4.
- [ ] The process-local distributed-rate-limit Accepted risk is explicitly
      acknowledged in the release record, with upstream traffic controls and
      alerts enabled; otherwise replace it with a shared atomic store before
      launch.
- [ ] The hourly `pnpm demo:expire` job is installed, monitored, and proven in
      Preview with one disposable expired Workspace.
- [ ] Unauthenticated, expired and cross-Workspace Case/Audit exports return
      opaque 404 responses; formula-bearing OIW-805 fixtures download with
      spreadsheet-neutralised CSV cells (automated evidence:
      `tests/security/export-download.test.ts` and
      `tests/security/export-injection-fixtures.test.ts`).
- [ ] Parallel opposing Decision outcomes were exercised on the release
      commit (`tests/security/approval-concurrency.test.ts`): one outcome and
      one Approval persisted.
- [ ] Credential review combines `pnpm architecture:check` with manual diff,
      full-history and Vercel/Supabase environment inspection. The scanner's
      generic-token/JWT/Supabase/PostgreSQL coverage is not treated as a
      substitute for manual review.

### Accessibility

- [ ] All six criteria in `docs/quality/ACCESSIBILITY.md` §1–6 pass for the
      three demonstration lenses on the primary workflow screens (PRD §19
      routes reachable from the guided tour).
- [ ] Tablet and desktop responsive checks pass (mobile explicitly out of
      P0 scope).

### Public repository (PRD §37)

- [ ] README answers all ten questions listed in PRD §37, in order.
- [ ] Repository contains: architecture diagram, three scenario summaries,
      quick start, demo commands, security model (link to
      `docs/SECURITY.md`), evaluation model (link to `docs/EVALUATION.md`),
      pack authoring guide, contribution guide, roadmap, professional
      adaptation link.
- [ ] No secret, credential, or real customer/organisation data anywhere in
      the repository history that will become public (not just the current
      commit — a squash/history check, since the repo goes public at this
      milestone per amendment A9).
- [ ] Repository visibility changed from private to public only after every
      other item in this checklist is complete (amendment A9: "private until
      M3, public at launch").
- [ ] Licence file present and correct (Apache-2.0, amendment A9).

### Content (PRD §38)

- [ ] Leadership, Operations, and Technical assets exist for at least
      Release One (Asset Reliability).
- [ ] Demonstration release framing matches the PRD §38 title patterns.

### Sign-off

- [ ] Lead orchestration thread confirms `SESSION.md` reflects the merged
      state matching this checklist before declaring M3 complete.

---

## M4 — Client Adaptation Kit

Per PRD §36, M4 delivers: discovery questionnaire, pack-scoping worksheet,
entity-mapping template, source-inventory template, rule-definition
template, approval-policy template, pilot success-metric template,
deployment decision template. M4 is documentation/template deliverables, not
new application functionality — its checklist is correspondingly about
completeness and consistency with the shipped platform, not test coverage.

### Template completeness

- [ ] Discovery questionnaire exists and references the canonical domain
      model (PRD §9) so answers map directly to pack-authoring decisions.
- [ ] Pack-scoping worksheet exists and cross-references the Scenario Pack
      specification (PRD §11) required-contents list, so a filled-out
      worksheet is directly actionable by whoever authors the resulting pack.
- [ ] Entity-mapping template exists and covers entity types, aliasing
      (ties to `docs/EVALUATION.md` §7 entity-resolution scope: exact match +
      alias table + ambiguity-to-review, no fuzzy engine), and external
      reference fields (PRD §9.6).
- [ ] Source-inventory template exists and covers every Source type example
      in PRD §9.3 (message stream, email inbox, file upload, CSV import, API,
      form, sensor gateway, manual entry) with a column for which P0
      ingestion path (PRD FR-010–013) each real source would map to.
- [ ] Rule-definition template exists and is scoped to the closed fact
      catalogue v1 (amendment A2) — the template should make it obvious which
      facts are available, not invite a client to ask for arbitrary logic.
- [ ] Approval-policy template exists and covers the PRD §22.4 example
      Decision types (asset removal, material-output rejection, compliance
      exception acceptance, formal vendor escalation, high-risk case closure,
      mandatory-state override) as a starting checklist, not an exhaustive
      list presented as complete.
- [ ] Pilot success-metric template exists and is consistent with amendment
      A5's constrained widget/metric catalogue — a client should not be
      offered a metric the platform cannot render.
- [ ] Deployment-decision template exists and explicitly surfaces the
      public-demo vs. client-deployment risk differences in
      `docs/SECURITY.md` §6 (identity model, data sensitivity, connector
      scope) as decision inputs, so a client-pilot conversation doesn't
      silently assume public-demo mitigations suffice.

### Consistency

- [ ] Every template cross-references the specific PRD section or amendment
      it depends on, so it stays traceable as the PRD evolves.
- [ ] No template proposes a capability that P0 does not actually have
      (exports, analytics/CTA tracking, fuzzy entity resolution, external
      write-back) without explicitly labelling it as a future/P1+ capability
      per amendment A7's re-staging.

### Sign-off

- [ ] Lead orchestration thread confirms M4 templates are reviewed against
      the then-current PRD/amendments (this checklist may be stale by the
      time M4 is scheduled — re-verify PRD §14–15 scope before using it
      unmodified).

---

## Notes on Untestable-as-Specified Items

Recorded per the OIW-005 task packet's handoff instruction:

- "Guided tour completion" and "CTA events measurable" (FR-120/121) have no
  verification method in `docs/EVALUATION.md` §3 because they are re-staged
  out of P0 by amendment A7. This checklist's M3 section excludes them
  explicitly rather than silently dropping them, so a future Wave 4/5 task
  knows to add both a verification method to `docs/EVALUATION.md` and a
  checklist item here when that FR is re-activated.
- "Hosted product" (M3 deliverable, PRD §36) has no single automatable test
  — it is verified by the combination of the security gates (§5,
  `docs/SECURITY.md` §5) and a manual smoke pass against the actual deployed
  URL. Flagging this as inherently manual rather than inventing a synthetic
  automated proxy for "is it actually live and working."
