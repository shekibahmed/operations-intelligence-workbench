# Project site

The public site at <https://shekibahmed.github.io/operations-intelligence-workbench/>
is hand-written static HTML. The Next.js app cannot be exported statically
because its routes are backed by a database, so the site is a separate,
self-contained page that links to the repository and the demo.

## What is here

| Path | Purpose |
|---|---|
| `site/index.html` | The page. Uses relative URLs only, so it works under the repository sub-path. |
| `site/assets/site.css`, `site/assets/site.js` | Styles and progressive enhancement. System fonts, no external requests. |
| `site/.nojekyll` | Tells Pages to serve files as they are. |
| `scripts/site/build.ts` | Assembles `_site/` (`pnpm site:build`). |
| `scripts/site/check.ts` | Browser checks against the built site. |
| `.github/workflows/pages.yml` | Builds and deploys on push to `main`. |

## Build

```bash
pnpm install --frozen-lockfile
pnpm site:build          # writes _site/ (git-ignored)
```

`site:build` copies `site/` and then pulls in files that other parts of the
repository own:

| Source | Destination in `_site/` |
|---|---|
| `apps/web/public/casebook/*.html` | `casebook/` (checked byte for byte against the source) |
| `apps/web/public/media/*` | `media/` (background music) |
| `docs/media/*.vtt`, `*.jpg`, `*.gif`, `CREDITS.md` | `media/` (captions, posters, hero gif, credits) |
| `$SITE_MEDIA_DIR/*.mp4` | `media/` (walkthrough videos) |
| `docs/screenshots/*.png` | `img/` |
| `llms.txt` | `llms.txt` |
| `AGENTS.md`, `docs/{ARCHITECTURE,DOMAIN_MODEL,PACK_AUTHORING,EVALUATION}.md` | raw Markdown for agents |

It also writes `sitemap.xml` and `robots.txt`, and fails the build on any
root-absolute `href="/..."` or `src="/..."` (those break under the sub-path), any
dangling in-page anchor, and any reference to a file that is not in the site.

### Optional inputs

Everything in the table above except the casebook and screenshots is optional.
In `index.html`, markup that depends on an optional file is wrapped in
`<!--requires id=NAME all|any=path,path-->...<!--/requires id=NAME-->`. The
build removes the block when the files are absent (and logs `hidden: NAME`),
and unwraps it when they are present. So the site builds with or without the
videos, captions, posters, music and `llms.txt`, and picks each one up on the
next build after it lands. A missing `poster` file just drops the attribute.

### Live demo link

`index.html` contains `{{LIVE_DEMO_URL}}` and `{{LIVE_DEMO_LABEL}}`. The build
resolves them from the `LIVE_DEMO_URL` environment variable:

- unset or empty: the button points at the repository quick start and reads
  "Run the demo locally" (it never claims a hosted demo that does not exist);
- an `https://` URL: the button points there and reads "Try the live demo";
- anything else fails the build.

In CI the value comes from the repository variable `LIVE_DEMO_URL`
(Settings, Secrets and variables, Actions, Variables).

## Check

```bash
pnpm site:build
pnpm exec tsx scripts/site/check.ts --out ./site-check   # needs Playwright's Chromium; screenshots go to --out
```

The check serves `_site/` under `/operations-intelligence-workbench/` (like
Pages), then loads the page at 1440 px, 390 px and with reduced motion at both
widths. It asserts: no external requests, page weight under 1.5 MB excluding
audio and video, one `h1` and the landmarks, no horizontal scroll, videos and
audio not autoplaying, only `transform` and `opacity` animated, the static
diagram under reduced motion, and no axe-core violations. It writes full-page,
hero and pipeline screenshots. Playwright and axe come from `apps/web`.

## Deploy and refresh

`.github/workflows/pages.yml` runs on push to `main` when site inputs change, on
manual dispatch, and when a release is published. It downloads the `.mp4`
assets of the `media-latest` release into `.site-media/`, builds, and deploys
with `actions/deploy-pages`.

One-time setup: Settings, Pages, Source "GitHub Actions". Optionally set the
`LIVE_DEMO_URL` repository variable.

To refresh the videos: upload new `.mp4` files to the `media-latest` release,
then run the workflow manually (Actions, Pages, Run workflow). Re-uploading
assets to an existing release does not publish a release event.

The `github-pages` environment only accepts deployments from `main`. A release
event runs on the release tag, so for that event the workflow only dispatches
itself on `main` and the deploy runs there.

## Editing the page

Keep motion to `transform` and `opacity`, keep `prefers-reduced-motion`
working, use relative URLs, and keep the copy plain: the data is synthetic and
the demo provider is deterministic, and the page says so. Do not add analytics,
third-party scripts or web fonts.
