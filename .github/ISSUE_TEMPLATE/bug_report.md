---
name: Bug report
about: Something in the merged repository doesn't behave the way its own documentation or tests claim
title: "[Bug] "
labels: bug
assignees: ""
---

## What happened

A clear description of the observed behaviour.

## What you expected

What the behaviour should be, and where that expectation comes from (a
specific line in `docs/PRD.md`, `docs/ARCHITECTURE.md`, a docstring, or an
existing test).

## Steps to reproduce

1.
2.
3.

## Which pack / route / package

- Scenario Pack (if applicable):
- Route (if applicable, e.g. `/w/[workspace]/review`):
- Package (if applicable, e.g. `packages/application`):

## Environment

- Node.js version:
- pnpm version:
- OS:
- Commit / branch:

## Relevant output

Paste command output, stack trace, or a screenshot. Do not paste secrets,
connection strings, or session cookies.

## Have you checked

- [ ] `pnpm lint && pnpm typecheck && pnpm test` on a clean clone reproduces
      the issue (or the issue is specifically that one of these unexpectedly
      fails).
- [ ] This isn't a documented, currently-true limitation (see the root
      `README.md`'s "What is intentionally excluded?" section and
      `SESSION.md`'s tracked debt).
