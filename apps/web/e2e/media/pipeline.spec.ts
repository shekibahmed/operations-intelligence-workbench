import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

import { buildVtt, markTime, musicChain, parseMarks, timestamp, wrap, type MarksFile } from "../../../../scripts/media/captions";
import { TRAILER_SEGMENTS } from "../../../../scripts/media/encode";
import { CAPTIONS, readingBeatMs } from "./presenter";

/**
 * OIW-913: checks the media pipeline's pure logic and its refusal behaviour.
 * No browser, ffmpeg or server is used, so these run in ordinary `test:e2e`
 * and a regression in the encoder's inputs cannot go unnoticed until someone
 * records media again.
 */

const root = resolve(import.meta.dirname, "../../../..");

const marksFile: MarksFile = {
  schemaVersion: 1,
  pack: "example",
  viewport: { width: 1280, height: 800 },
  endsAt: 20,
  marks: [
    { id: "first", caption: "First moment", t: 2 },
    { id: "second", caption: "A much longer caption that has to be wrapped over several lines for readers", t: 8.5 },
    { id: "third", caption: "Last moment", t: 19.9999 },
  ],
};

test.describe("caption timestamps and wrapping", () => {
  test("formats milliseconds, rounds, clamps at zero and carries into hours", () => {
    expect(timestamp(0)).toBe("00:00:00.000");
    expect(timestamp(-3)).toBe("00:00:00.000");
    expect(timestamp(1.2345)).toBe("00:00:01.235");
    expect(timestamp(59.9996)).toBe("00:01:00.000");
    expect(timestamp(3599.9999)).toBe("01:00:00.000");
    expect(timestamp(3661.5)).toBe("01:01:01.500");
  });

  test("wraps at 42 characters without splitting words", () => {
    const wrapped = wrap("A much longer caption that has to be wrapped over several lines for readers");
    for (const line of wrapped.split("\n")) expect(line.length).toBeLessThanOrEqual(42);
    expect(wrapped.replace(/\n/g, " ")).toBe("A much longer caption that has to be wrapped over several lines for readers");
    expect(wrap("short")).toBe("short");
  });
});

test.describe("WebVTT from marks", () => {
  test("cues are ordered, numbered, non-overlapping and end at the recording's end", () => {
    const vtt = buildVtt(marksFile, 1);
    expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
    const cues = [...vtt.matchAll(/(\d+)\n(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})\n/g)];
    expect(cues.map((cue) => cue[1])).toEqual(["1", "2", "3"]);
    const seconds = (value: string) => {
      const [h, m, s] = value.split(":").map(Number);
      return h! * 3600 + m! * 60 + s!;
    };
    for (const [index, cue] of cues.entries()) {
      expect(seconds(cue[3]!)).toBeGreaterThan(seconds(cue[2]!));
      if (index > 0) expect(seconds(cue[2]!)).toBeGreaterThanOrEqual(seconds(cues[index - 1]![3]!) - 0.001);
    }
    expect(cues[0]![2]).toBe("00:00:01.000");
    expect(cues[0]![3]).toBe("00:00:07.500");
  });

  test("a trim larger than the first mark clamps the first cue to zero", () => {
    expect(buildVtt(marksFile, 5)).toContain("00:00:00.000 --> 00:00:03.500");
  });

  test("a final cue shorter than half a second is stretched to half a second", () => {
    expect(buildVtt(marksFile, 0)).toContain("00:00:20.000 --> 00:00:20.500");
  });
});

test.describe("marks validation", () => {
  test("rejects an empty marks file, an unknown version and a missing end time", () => {
    expect(() => parseMarks({ schemaVersion: 1, marks: [], endsAt: 5 }, "example")).toThrow(/empty or from an unknown version/);
    expect(() => parseMarks({ schemaVersion: 2, marks: marksFile.marks, endsAt: 5 }, "example")).toThrow(/unknown version/);
    expect(() => parseMarks(null, "example")).toThrow(/unknown version/);
    expect(() => parseMarks({ schemaVersion: 1, marks: marksFile.marks }, "example")).toThrow(/no end time/);
    expect(parseMarks(marksFile, "example").marks).toHaveLength(3);
  });

  test("a mark that was never recorded is a named error", () => {
    expect(markTime(marksFile, "second")).toBe(8.5);
    expect(() => markTime(marksFile, "review-accepted")).toThrow("example: no mark named review-accepted");
  });
});

test.describe("trailer and music", () => {
  test("every moment the trailer cuts from has a caption, so the recorder always marks it", () => {
    const names = TRAILER_SEGMENTS.flatMap((segment) => segment.clips.map((clip) => clip.mark));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(Object.keys(CAPTIONS), `trailer mark ${name}`).toContain(name);
  });

  test("trailer runs 20 to 30 seconds of output and tells the confidence story in order", () => {
    const seconds = TRAILER_SEGMENTS.flatMap((segment) => segment.clips).reduce((sum, clip) => sum + clip.len / clip.speed, 0);
    expect(seconds).toBeGreaterThanOrEqual(20);
    expect(seconds).toBeLessThanOrEqual(30);
    expect(TRAILER_SEGMENTS[0]!.caption).toMatch(/confidence/i);
    expect(TRAILER_SEGMENTS.map((segment) => segment.caption.charAt(0))).toEqual(["1", "2", "3", "4", "5"]);
  });

  test("music is quiet, fades in over 2 s and out over 3 s, and a short clip never fades out before zero", () => {
    expect(musicChain("1:a", 25)).toBe("[1:a]volume=0.85,afade=t=in:st=0:d=2,afade=t=out:st=22.00:d=3[a]");
    expect(musicChain("1:a", 1)).toContain("afade=t=out:st=0.00:d=3");
  });

  test("reading beats stay between 3 and 6 seconds", () => {
    expect(readingBeatMs(0)).toBe(3000);
    expect(readingBeatMs(40)).toBe(5200);
    expect(readingBeatMs(500)).toBe(6000);
  });
});

/** Runs a TypeScript snippet with tsx in a child whose environment is exactly `env`. */
function runChild(args: string[], env: Record<string, string>) {
  return spawnSync(process.execPath, ["--import", "tsx", ...args], { cwd: resolve(root, "apps/web"), env: env as NodeJS.ProcessEnv, encoding: "utf8", timeout: 60_000 });
}

test.describe("refusal behaviour", () => {
  const configUrl = pathToFileURL(resolve(root, "apps/web/playwright.media.config.ts")).href;
  const loadConfig = ["--input-type=module", "-e", `await import(${JSON.stringify(configUrl)});`];
  const base = { PATH: process.env.PATH ?? "" };

  test("the capture config refuses to load without the runner's variables", () => {
    for (const env of [
      base,
      { ...base, MEDIA_CAPTURE: "1" },
      { ...base, MEDIA_CAPTURE: "1", MEDIA_CAPTURE_PORT: "4301" },
      { ...base, MEDIA_CAPTURE_PORT: "4301", MEDIA_CAPTURE_OUT: "out" },
    ]) {
      const result = runChild(loadConfig, env);
      expect(result.status, result.stderr).not.toBe(0);
      expect(result.stderr).toContain("Use pnpm media:capture");
    }
  });

  test("the capture config rejects privileged and invalid ports", () => {
    for (const port of ["80", "1023", "abc", "4300.5"]) {
      const result = runChild(loadConfig, { ...base, MEDIA_CAPTURE: "1", MEDIA_CAPTURE_PORT: port, MEDIA_CAPTURE_OUT: "out" });
      expect(result.status, `port ${port}`).not.toBe(0);
    }
  });

  test("the capture config loads when the runner supplies everything", () => {
    const result = runChild(loadConfig, { ...base, MEDIA_CAPTURE: "1", MEDIA_CAPTURE_PORT: "4301", MEDIA_CAPTURE_OUT: "out" });
    expect(result.status, result.stderr).toBe(0);
  });

  test("the capture runner refuses without DATABASE_URL, and without ffmpeg on PATH", () => {
    const runner = resolve(root, "scripts/media/capture.ts");
    const noDatabase = runChild([runner], base);
    expect(noDatabase.status).toBe(1);
    expect(noDatabase.stderr).toContain("Set DATABASE_URL");

    const noFfmpeg = runChild([runner], { PATH: "", DATABASE_URL: "postgresql://localhost/none" });
    expect(noFfmpeg.status).toBe(1);
    expect(noFfmpeg.stderr).toContain("ffmpeg is required");
  });
});
