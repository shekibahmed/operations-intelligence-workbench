# Media credits

## Ambient music: `apps/web/public/media/ambience.mp3`

| Field | Value |
| --- | --- |
| Title | Gymnopedies, 1ere. Lent et douloureux (Gymnopedie No. 1) |
| Composer | Erik Satie (1866-1925), composition in the public domain |
| Performer | Robin Alciatore (recording published via Musopen) |
| Source page | https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg |
| Original file | https://upload.wikimedia.org/wikipedia/commons/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg (Ogg Vorbis, 183.6 s, 3,696,351 bytes) |
| Original SHA-1 | `96b2343c81047abd9723488d8540b5a2af688233` (matches the Commons `imageinfo.sha1`) |
| Original SHA-256 | `419e37656856224227086df32d6d481a00a738961e08fca9f6147e472beea53e` |
| Licence | Public domain (the recording itself, not only the composition) |
| Licence statement | https://www.musopen.com/faq.html (quoted on the source page) |
| Committed file SHA-256 | `2b0f45d1e36b9014f8967dd5f5f4f5a111c2675cab28ba8f23f4467c7c63d96b` |

Musopen asks, as a courtesy and not a condition, that derived works credit the
Musopen project. This repository does so here and beside the player.

### Licence evidence

Retrieved 2026-10-18 from the Wikimedia Commons API:

```
https://commons.wikimedia.org/w/api.php?action=query&titles=File:Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg&prop=imageinfo&iiprop=url|extmetadata|size|sha1|mime&format=json&formatversion=2
```

The machine-readable `extmetadata` fields, quoted verbatim:

```
LicenseShortName = "Public domain"   (source: commons-desc-page)
UsageTerms       = "Public domain"
License          = "pd"
Copyrighted      = "False"
AttributionRequired = "false"
Artist           = "Robin Alciatore"
Credit           = "http://www.musopen.com"
Categories       = "PD-author|Robin Alciatore|Audio files of classical music for piano|Audio files of music by Erik Satie|Gymnopedie lent et douloureux"
```

The `Permission` field states: "Public domain music from musopen.com ... The
music on this site is given a public domain license, therefore, there are
technically no restrictions on what you do with it." (quoting
http://www.musopen.com/faq.html). Verify again by re-running the API request
above and checking that `LicenseShortName` is still "Public domain".

### Edits made

Processed only with ffmpeg from the downloaded original; no other source audio:

- 90 s excerpt from the start of the recording (0 s to 90 s).
- Two-pass `loudnorm` to an integrated loudness of about -20 LUFS (measured
  -20.2 LUFS with ebur128), true peak limit -2 dBTP.
- 2 s fade-in and 3 s fade-out.
- Resampled to 44.1 kHz, stereo MP3 at 96 kbps (1,080,886 bytes); source
  metadata tags dropped (`ffprobe` shows only the ffmpeg encoder tag). The fade-out
  was measured: mean level falls from -24 dB at 85 s to -78 dB at 89.8 s.

### Where it is used

- The evidence casebook (`apps/web/public/casebook/a-142-repeat-fault.html`),
  as an optional, off-by-default player. Nothing loads or plays until the reader
  presses play.
- The Pages landing and the walkthrough videos (planned follow-on work that
  reuses this same file).
