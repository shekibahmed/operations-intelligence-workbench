import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildVtt, markTime, musicChain, parseMarks, requireThat, timestamp, type MarksFile } from "./captions.js";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const mediaDirectory = resolve(root, "docs/media");
const musicFile = resolve(root, "apps/web/public/media/ambience.mp3");

/** Packs recorded by the capture spec, in the order they are encoded. */
export const PACKS = ["asset-reliability", "process-exceptions", "document-assurance"] as const;

const MAX_MP4_BYTES = 9.5 * 1024 * 1024;
const MAX_GIF_BYTES = 7.5 * 1024 * 1024;
const FPS = 25;

async function ffmpeg(args: string[]): Promise<void> {
  try {
    await exec("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    const detail = error instanceof Error && "stderr" in error ? String((error as { stderr: unknown }).stderr) : String(error);
    throw new Error(`ffmpeg failed: ${detail.slice(0, 1500)}`);
  }
}

interface ProbeStream {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
}
export interface Probe {
  file: string;
  bytes: number;
  seconds: number;
  streams: string[];
}

export async function probe(file: string): Promise<Probe> {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height", "-of", "json", file]);
  const parsed = JSON.parse(stdout) as { format: { duration?: string; size?: string }; streams: ProbeStream[] };
  let seconds = Number(parsed.format.duration);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    // Browser-recorded WebM often has no duration header; decode once to find it.
    const result = await exec("ffmpeg", ["-hide_banner", "-i", file, "-f", "null", "-"], { maxBuffer: 64 * 1024 * 1024 }).catch((error: { stderr?: string }) => ({ stderr: error.stderr ?? "" }));
    const times = [...String(result.stderr).matchAll(/time=(\d+):(\d+):(\d+\.\d+)/g)];
    const last = times.at(-1);
    requireThat(last !== undefined, `Could not determine the duration of ${file}`);
    seconds = Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]);
  }
  const bytes = Number(parsed.format.size) || (await stat(file)).size;
  return {
    file,
    bytes,
    seconds,
    streams: parsed.streams.map((s) => (s.codec_type === "video" ? `${s.codec_type}:${s.codec_name}:${s.width}x${s.height}` : `${s.codec_type}:${s.codec_name}`)),
  };
}

async function loadMarks(pack: string): Promise<MarksFile> {
  const file = resolve(mediaDirectory, `${pack}.marks.json`);
  requireThat(existsSync(file), `${file} is missing; run pnpm media:capture first`);
  return parseMarks(JSON.parse(await readFile(file, "utf8")), pack);
}

interface Job {
  /** ffmpeg input arguments, including every `-i`. */
  inputs: string[];
  /** Filter graph that must label its outputs `[v]` and, when `audio`, `[a]`. */
  graph: string;
  audio: boolean;
  /** Index of a subtitle input to embed as a soft caption track. */
  subtitleInput?: number;
  seconds: number;
  out: string;
}

const VIDEO_ARGS = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
const AUDIO_ARGS = ["-c:a", "aac", "-b:a", "96k", "-ar", "44100"];

/** H.264 at CRF 27; if that is over the size cap, a two-pass encode aimed below it. */
async function encodeMp4(job: Job, work: string): Promise<void> {
  const common = [...job.inputs, "-filter_complex", job.graph, "-t", job.seconds.toFixed(2)];
  const extras = [
    "-map", "[v]",
    ...(job.audio ? ["-map", "[a]", ...AUDIO_ARGS] : []),
    ...(job.subtitleInput !== undefined ? ["-map", `${job.subtitleInput}:s`, "-c:s", "mov_text", "-metadata:s:s:0", "language=eng"] : []),
  ];
  await ffmpeg([...common, ...extras, ...VIDEO_ARGS, "-crf", "27", job.out]);
  if ((await stat(job.out)).size <= MAX_MP4_BYTES) return;

  const audioBits = job.audio ? 96_000 : 0;
  const targetBits = Math.floor(((MAX_MP4_BYTES * 0.92) * 8) / job.seconds - audioBits);
  const passlog = resolve(work, "pass");
  await ffmpeg([...common, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-b:v", String(targetBits), "-pass", "1", "-passlogfile", passlog, "-an", "-sn", "-f", "null", "/dev/null"]);
  await ffmpeg([...common, ...extras, ...VIDEO_ARGS, "-b:v", String(targetBits), "-pass", "2", "-passlogfile", passlog, job.out]);
  requireThat((await stat(job.out)).size <= MAX_MP4_BYTES, `${job.out} is still over ${MAX_MP4_BYTES} bytes after a two-pass encode`);
}

const MUSIC_INPUT = ["-stream_loop", "-1", "-i", musicFile];

async function encodeWalkthrough(pack: string, withMusic: boolean, work: string): Promise<{ trim: number }> {
  const marks = await loadMarks(pack);
  const raw = resolve(mediaDirectory, `${pack}.webm`);
  requireThat(existsSync(raw), `${raw} is missing; run pnpm media:capture first`);
  // Drop the blank browser start-up and begin just before the first thing worth seeing.
  const trim = Math.max(0, markTime(marks, marks.marks[0]!.id) - 1);
  const seconds = marks.endsAt - trim;
  const vtt = resolve(mediaDirectory, `${pack}.vtt`);
  await writeFile(vtt, buildVtt(marks, trim));

  const inputs = ["-ss", trim.toFixed(2), "-i", raw, ...(withMusic ? MUSIC_INPUT : []), "-i", vtt];
  const graph = `[0:v]fps=${FPS},format=yuv420p[v]${withMusic ? `;${musicChain("1:a", seconds)}` : ""}`;
  await encodeMp4({ inputs, graph, audio: withMusic, subtitleInput: withMusic ? 2 : 1, seconds, out: resolve(mediaDirectory, `${pack}.mp4`) }, work);

  // The poster is the approved decision: at this step the tour panel sits beside the
  // card, whereas on the review step it covers the Confidence and Status rows.
  const approved = markTime(marks, "decision-approved");
  await ffmpeg(["-i", raw, "-ss", (approved + 2).toFixed(2), "-frames:v", "1", "-q:v", "3", resolve(mediaDirectory, `poster-${pack}.jpg`)]);
  return { trim };
}

/**
 * Five asset-reliability moments in story order. Each clip starts at a named
 * mark (plus `from` seconds), plays `len` source seconds, sped up by `speed`.
 */
interface Clip {
  mark: string;
  from: number;
  len: number;
  speed: number;
}
interface TrailerSegment {
  caption: string;
  clips: Clip[];
}
export const TRAILER_SEGMENTS: TrailerSegment[] = [
  {
    caption: "1. A report arrives. AI extracts each fact and its confidence",
    clips: [
      { mark: "inbox-arrival", from: 1.2, len: 2.6, speed: 2 },
      { mark: "inbox-extracted", from: -2.4, len: 4.4, speed: 1.4 },
    ],
  },
  {
    caption: "2. Uncertain facts go to a human reviewer",
    clips: [
      { mark: "review-ambiguity", from: 1.4, len: 4, speed: 1.6 },
      { mark: "review-accepted", from: -2.2, len: 3.2, speed: 1.2 },
    ],
  },
  {
    caption: "3. A rule fires, every condition is visible",
    clips: [{ mark: "rule-trace", from: 1.4, len: 7, speed: 1.4 }],
  },
  {
    caption: "4. A person approves the proposed action",
    clips: [
      { mark: "decision-approval", from: 1.4, len: 2.6, speed: 1.6 },
      { mark: "decision-comment", from: 0.5, len: 8, speed: 2.4 },
      { mark: "decision-approved", from: 0.3, len: 1.5, speed: 1 },
    ],
  },
  {
    caption: "5. Dashboards update from that approval",
    clips: [{ mark: "dashboard-update", from: 1.4, len: 6, speed: 1.5 }],
  },
];

const SYNTHETIC_LABEL = "Synthetic demo data";

async function fontFile(): Promise<string> {
  for (const query of ["Liberation Sans:bold", "DejaVu Sans:bold", "sans:bold"]) {
    try {
      const { stdout } = await exec("fc-match", ["-f", "%{file}", query]);
      if (stdout.trim() !== "" && existsSync(stdout.trim())) return stdout.trim();
    } catch {
      // fc-match unavailable; try the next candidate.
    }
  }
  throw new Error("No bold sans font found for trailer captions (install Liberation Sans or DejaVu Sans)");
}

async function encodeTrailer(withMusic: boolean, work: string): Promise<void> {
  const pack = "asset-reliability";
  const marks = await loadMarks(pack);
  const raw = resolve(mediaDirectory, `${pack}.webm`);
  requireThat(existsSync(raw), `${raw} is missing; run pnpm media:capture first`);
  const font = await fontFile();

  const parts: string[] = [];
  const labels: string[] = [];
  let total = 0;
  let clipIndex = 0;
  for (const [segmentIndex, segment] of TRAILER_SEGMENTS.entries()) {
    const captionFile = resolve(work, `caption-${segmentIndex}.txt`);
    // Every trailer frame, and so every hero GIF frame, says the data is synthetic.
    await writeFile(captionFile, `${segment.caption}\n${SYNTHETIC_LABEL}`);
    const lengths = segment.clips.map((clip) => clip.len / clip.speed);
    const segmentSeconds = lengths.reduce((sum, value) => sum + value, 0);
    for (const [i, clip] of segment.clips.entries()) {
      const start = Math.max(0, markTime(marks, clip.mark) + clip.from);
      const label = `c${clipIndex}`;
      const shown = lengths[i]!;
      // Quick fade at the cut points keeps jumps between moments from feeling abrupt.
      const fades = `${i === 0 ? `fade=t=in:st=0:d=0.3,` : ""}${i === segment.clips.length - 1 ? `fade=t=out:st=${Math.max(0, shown - 0.3).toFixed(2)}:d=0.3,` : ""}`;
      const caption = `drawtext=fontfile='${font}':textfile='${captionFile}':fontsize=30:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=14:x=28:y=h-th-30`;
      parts.push(`[0:v]trim=start=${start.toFixed(2)}:end=${(start + clip.len).toFixed(2)},setpts=(PTS-STARTPTS)/${clip.speed},fps=${FPS},${caption},${fades}format=yuv420p[${label}]`);
      labels.push(`[${label}]`);
      clipIndex += 1;
    }
    total += segmentSeconds;
  }
  parts.push(`${labels.join("")}concat=n=${labels.length}:v=1:a=0[v]`);
  if (withMusic) parts.push(musicChain("1:a", total));
  await encodeMp4(
    { inputs: ["-i", raw, ...(withMusic ? MUSIC_INPUT : [])], graph: parts.join(";"), audio: withMusic, seconds: total, out: resolve(mediaDirectory, "trailer.mp4") },
    work,
  );
  // Sidecar captions mirror the burned-in captions so players and accessibility
  // checkers find a text track; the site does not show it by default.
  let cursor = 0;
  const cues: string[] = ["WEBVTT", ""];
  for (const segment of TRAILER_SEGMENTS) {
    const seconds = segment.clips.reduce((sum, clip) => sum + clip.len / clip.speed, 0);
    cues.push(`${timestamp(cursor)} --> ${timestamp(cursor + seconds)}`, segment.caption, SYNTHETIC_LABEL, "");
    cursor += seconds;
  }
  await writeFile(resolve(mediaDirectory, "trailer.vtt"), cues.join("\n"));
  // Poster: the middle of the rule-trace segment, where every condition is visible.
  const ruleStart = TRAILER_SEGMENTS.slice(0, 2).reduce((sum, segment) => sum + segment.clips.reduce((s2, clip) => s2 + clip.len / clip.speed, 0), 0);
  await ffmpeg(["-ss", (ruleStart + 2).toFixed(2), "-i", resolve(mediaDirectory, "trailer.mp4"), "-frames:v", "1", "-q:v", "3", resolve(mediaDirectory, "poster-trailer.jpg")]);
}

/** Palette-based GIF from the trailer; steps down frame rate and width until it fits. */
async function encodeHeroGif(work: string): Promise<void> {
  const trailer = resolve(mediaDirectory, "trailer.mp4");
  const out = resolve(mediaDirectory, "hero.gif");
  const attempts = [
    { fps: 12, width: 960, colors: 256 },
    { fps: 10, width: 800, colors: 256 },
    { fps: 10, width: 800, colors: 160 },
    { fps: 8, width: 720, colors: 128 },
  ];
  for (const { fps, width, colors } of attempts) {
    const palette = resolve(work, "palette.png");
    const scale = `fps=${fps},scale=${width}:-1:flags=lanczos`;
    await ffmpeg(["-i", trailer, "-vf", `${scale},palettegen=max_colors=${colors}:stats_mode=diff`, palette]);
    await ffmpeg(["-i", trailer, "-i", palette, "-lavfi", `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, "-loop", "0", out]);
    if ((await stat(out)).size <= MAX_GIF_BYTES) return;
  }
  throw new Error(`hero.gif is still over ${MAX_GIF_BYTES} bytes at the smallest setting`);
}

export interface EncodeOptions {
  noMusic?: boolean;
  packs?: readonly string[];
}

/** Encodes every pack's walkthrough, then the trailer and hero GIF, and prints an ffprobe summary. */
export async function encodeAll(options: EncodeOptions = {}): Promise<Probe[]> {
  const withMusic = options.noMusic !== true && existsSync(musicFile);
  console.log(withMusic ? `Music: ${musicFile.replace(root, ".")}` : "Music: none (no track requested or apps/web/public/media/ambience.mp3 is absent)");
  const work = await mkdtemp(resolve(tmpdir(), "oiw-media-encode-"));
  try {
    for (const pack of options.packs ?? PACKS) {
      console.log(`Encoding ${pack} walkthrough`);
      await encodeWalkthrough(pack, withMusic, work);
    }
    if ((options.packs ?? PACKS).includes("asset-reliability")) {
      console.log("Encoding trailer and hero GIF");
      await encodeTrailer(withMusic, work);
      await encodeHeroGif(work);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }

  const outputs: Probe[] = [];
  for (const pack of options.packs ?? PACKS) outputs.push(await probe(resolve(mediaDirectory, `${pack}.mp4`)));
  if ((options.packs ?? PACKS).includes("asset-reliability")) {
    outputs.push(await probe(resolve(mediaDirectory, "trailer.mp4")), await probe(resolve(mediaDirectory, "hero.gif")));
  }
  for (const entry of outputs) {
    console.log(`${entry.file.replace(`${root}/`, "")}  ${(entry.bytes / 1024 / 1024).toFixed(2)} MB  ${entry.seconds.toFixed(1)} s  ${entry.streams.join(" ")}`);
  }
  return outputs;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const packsArg = args.find((entry) => entry.startsWith("--packs="));
  encodeAll({
    noMusic: args.includes("--no-music") || process.env.MEDIA_NO_MUSIC === "1",
    ...(packsArg !== undefined ? { packs: packsArg.slice("--packs=".length).split(",") } : {}),
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
