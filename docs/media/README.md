# Walkthrough media

Reproducible, opt-in pipeline that records each scenario pack's guided tour
from the real app at human pace, then encodes captioned walkthrough videos, a
short trailer, posters and the README hero GIF. Everything shown is synthetic
demo data. No narration or text-to-speech is used.

## What is committed and what is not

Committed (small, reviewable):

| File | What it is |
| --- | --- |
| `hero.gif` | Looping GIF cut from the trailer, for the README (under 7.5 MB) |
| `<pack>.vtt` | WebVTT captions for each walkthrough |
| `<pack>.marks.json` | Timestamped step marks the captions, poster and trailer are cut from |
| `poster-<pack>.jpg` | Poster frame taken at the review step |

Not committed (gitignored, published as release assets instead):

| File | What it is |
| --- | --- |
| `<pack>.webm` | Raw Playwright recording, kept locally so encoding can be re-run |
| `<pack>.mp4` | Walkthrough, H.264 + AAC, under 9.5 MB, captions embedded as a soft track |
| `trailer.mp4` | About 25 s story in five moments, burned-in captions |

`<pack>` is each of `asset-reliability`, `process-exceptions` and
`document-assurance`.

## Prerequisites

- `ffmpeg` and `ffprobe` on `PATH` (libx264, libfreetype, a bold sans font
  such as Liberation Sans or DejaVu Sans).
- A migrated Postgres database in `DATABASE_URL`. The recording creates
  isolated synthetic guest workspaces in it, exactly as a visitor would.
- Playwright's Chromium (`pnpm --filter @oiw/web exec playwright install chromium`).

## Capture and encode

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/oiw
pnpm db:migrate
pnpm media:capture            # build, serve, record all three packs, then encode
pnpm media:capture --no-music # same, without background music
```

`pnpm media:capture` builds the app (skip with `MEDIA_SKIP_BUILD=1` when a
build is current), starts `next start` on a free port with an in-memory rate
limiter and a random session secret, runs `apps/web/playwright.media.config.ts`,
then encodes. A full run takes roughly ten minutes, mostly real-time recording
(about two minutes per pack, because the tour is paced for a first-time
viewer). Set `MEDIA_CAPTURE_PACKS=asset-reliability` to record only some packs.

Re-encode from the existing `.webm` files without recording again:

```bash
pnpm media:encode             # music is added when apps/web/public/media/ambience.mp3 exists
pnpm media:encode --no-music
pnpm media:encode --packs=asset-reliability
```

The capture spec and config refuse to run unless `MEDIA_CAPTURE=1`,
`MEDIA_CAPTURE_PORT` and `MEDIA_CAPTURE_OUT` are set by the runner, and the
spec self-skips otherwise, so CI and the default `pnpm test:e2e` never record.

## Music

The encoder loops `apps/web/public/media/ambience.mp3` at a quiet volume
(0.18) with a 2 s fade in and a 3 s fade out. If the file is missing, or
`--no-music` is passed, the MP4s are written without an audio stream. Credit
the track in `docs/media/CREDITS.md`.

## Publish

The MP4s are too large to commit. Publish them as assets on a rolling release:

```bash
# first time
gh release create media-latest docs/media/*.mp4 \
  --title "Walkthrough media" \
  --notes "Walkthrough videos and trailer for the guided demo. Synthetic data only."

# later runs
gh release upload media-latest docs/media/*.mp4 --clobber
```

Link to the assets from the README as
`https://github.com/<owner>/<repo>/releases/download/media-latest/<file>.mp4`.

## How the pacing works

Each test walks the same guided tour the app ships, step by step, using the
real overlay and real processing, review, rule and approval paths. Between
steps the recorder reads the tour panel and holds for a time scaled to how
much text there is, glides a visible cursor to the spotlighted area, and types
the approval comment one character at a time. Short plain-language captions
for each moment live in `apps/web/e2e/media/presenter.ts`. The trailer is
cut from the asset-reliability recording using the marks; edit
`TRAILER_SEGMENTS` in `scripts/media/encode.ts` to change it.

## Known limits

- The tour panel is a floating overlay and can cover part of the right-hand
  pane on shorter screens (1280 by 800 is the recorded size).
- Caption timing is from wall-clock marks, so it can be off by a fraction of a
  second against the video.
