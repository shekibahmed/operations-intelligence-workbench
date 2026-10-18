# Launch kit (OIW-917)

Drafts for announcing Operations Intelligence Workbench. Nothing here has been posted. Read the owner notes in each file before using it.

## Files

- `CHECKLIST.md`: master plan, pre-flight checks, schedule, measurement and "do not" rules. Start here.
- `SHOW_HN.md`: Show HN title, post text, first comment and a table of numbers to re-verify.
- `ARTICLE.md`: long-form article on governed decisions and human approval.
- `LINKEDIN.md`: LinkedIn posts, carousel scripts and a facts table.
- `REDDIT.md`: per-subreddit post drafts and a fact-check status section.
- `LISTINGS.md`: awesome-list and registry submissions with draft entries.
- `carousels/`: four rendered 1080x1350 PDFs, each next to its source `.html`.
  - `1-chat-message-governed-decision`
  - `2-review-queue-for-humans`
  - `3-bypass-our-own-approval-gate`
  - `4-adversarial-test-corpus`

## Order of use

1. `CHECKLIST.md`: resolve pre-flight items (demo URL, Pages, release tag, re-run tests and eval).
2. `LISTINGS.md`: repo metadata and listings that need no demo.
3. `ARTICLE.md`: publish first so other posts can link to it.
4. `SHOW_HN.md`: post once the demo is warm; the schedule is the owner's choice.
5. `LINKEDIN.md` with `carousels/`: after Show HN.
6. `REDDIT.md`: last, spaced out per subreddit rules.

## Pending placeholders and URLs (link-checked 2026-10-18)

- Pages site, `#walkthroughs`, casebook, `media/trailer.mp4` and `llms.txt` (https://shekibahmed.github.io/operations-intelligence-workbench/): live, all 200 on 2026-10-18.
- PRs #21, #25, #26, #27, #29 and #39 are merged. Dependabot open alerts: 0 (2026-10-18). Re-run the link check and the alert count before posting.
- Injection counts: 12 instruction-style fixtures (4 formats times 3 packs, the README figure); 30 fixtures in the full matrix (10 classes times 3 packs, `docs/quality/INJECTION_TEST_MATRIX.md`).
- Demo host (`operations-intelligence-workbench.onrender.com`, `/demo`, `/llms.txt`): 200 on 2026-10-18. Check the demo is warm before posting.
- Release `v0.1.0`: 404, not yet cut.
- `http://localhost:3000/demo` is a local example, not checkable.
- `<NPM_PACKAGE>` and other angle-bracket placeholders: fill in at submission. The `$(uname` mcp-publisher URL is a shell template and is not a real link.
