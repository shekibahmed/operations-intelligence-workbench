/**
 * Pure helpers for the media encoder: marks validation, WebVTT building and the
 * music filter chain. Kept free of ffmpeg and file access so they can be tested.
 */

export interface Mark {
  id: string;
  caption: string;
  t: number;
}

export interface MarksFile {
  schemaVersion: 1;
  pack: string;
  viewport: { width: number; height: number };
  endsAt: number;
  marks: Mark[];
}

export const MUSIC_VOLUME = 0.85;

export function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Validates a parsed marks file so a bad or stale recording fails with a clear message. */
export function parseMarks(raw: unknown, pack: string): MarksFile {
  const marks = raw as Partial<MarksFile> | null;
  requireThat(
    marks !== null && typeof marks === "object" && marks.schemaVersion === 1 && Array.isArray(marks.marks) && marks.marks.length > 0,
    `${pack}: marks file is empty or from an unknown version`,
  );
  requireThat(typeof marks.endsAt === "number" && Number.isFinite(marks.endsAt), `${pack}: marks file has no end time`);
  return marks as MarksFile;
}

export function markTime(marks: MarksFile, id: string): number {
  const found = marks.marks.find((entry) => entry.id === id);
  requireThat(found !== undefined, `${marks.pack}: no mark named ${id}`);
  return found.t;
}

export function timestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
}

export function wrap(text: string, width = 42): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line !== "" && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line === "" ? word : `${line} ${word}`;
    }
  }
  if (line !== "") lines.push(line);
  return lines.join("\n");
}

/** WebVTT captions from the marks; `trim` is how much of the raw recording's start was cut. */
export function buildVtt(marks: MarksFile, trim: number): string {
  const cues = marks.marks.map((mark, index) => {
    const start = Math.max(0, mark.t - trim);
    const end = (marks.marks[index + 1]?.t ?? marks.endsAt) - trim;
    return `${index + 1}\n${timestamp(start)} --> ${timestamp(Math.max(end, start + 0.5))}\n${wrap(mark.caption)}\n`;
  });
  return `WEBVTT\n\n${cues.join("\n")}`;
}

/** Looped background music, quiet, with a 2 s fade in and a 3 s fade out. */
export function musicChain(inputLabel: string, seconds: number): string {
  return `[${inputLabel}]volume=${MUSIC_VOLUME},afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, seconds - 3).toFixed(2)}:d=3[a]`;
}
