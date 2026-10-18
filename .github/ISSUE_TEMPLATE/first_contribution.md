---
name: First contribution
about: Claim or propose a small, bounded contribution before opening a pull request
title: "[First contribution] "
labels: good first issue
assignees: ""
---

Read [`docs/contributing/FIRST_CONTRIBUTIONS.md`](../../docs/contributing/FIRST_CONTRIBUTIONS.md)
first. Open this issue before the pull request, and wait for a maintainer to confirm
the intended outcome.

## Challenge type

- [ ] 1. Contradictory or hazardous artifact (a new edge-case fixture)
- [ ] 2. Independently justified evidence span (one existing fixture)
- [ ] 3. Missing expected outcome (gold entry or notes)
- [ ] 4. Source-backed documentation correction

## Target

The pack and artifact id, or the document and line, you want to change:

## What you think is correct, and why

State the expected behaviour or the corrected claim. Quote the source passage, or the
code, test or command output, that supports it. A counterexample or a competing
reading of an existing fixture is welcome on its own.

## Planned file set

List the files from the guide's file set for your challenge type.

## Checks

- [ ] All content is synthetic; no real organisation, person or customer text
- [ ] The change stays inside the file set for this challenge type
- [ ] I will run `pnpm validate:packs` and `pnpm eval --pack <pack-id>` and paste the results
