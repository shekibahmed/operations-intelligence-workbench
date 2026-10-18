import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const BLOB_PREFIX = "https://github.com/shekibahmed/operations-intelligence-workbench/blob/main/";

const rootCopy = readFileSync(resolve(repositoryRoot, "llms.txt"), "utf8");
const publicCopy = readFileSync(resolve(repositoryRoot, "apps/web/public/llms.txt"), "utf8");

describe("llms.txt", () => {
  it("keeps the served copy identical to the root copy", () => {
    expect(publicCopy).toBe(rootCopy);
  });

  it("follows the llmstxt.org structure with the required sections", () => {
    const lines = rootCopy.split("\n");
    expect(lines[0]).toMatch(/^# \S/u);
    expect(lines.filter((line) => line.startsWith("# "))).toHaveLength(1);
    expect(lines.some((line) => line.startsWith("> "))).toBe(true);
    const sections = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3));
    expect(sections).toEqual(["Docs", "Scenario packs", "For agents", "Optional"]);
  });

  it("links only to absolute repository documents that exist", () => {
    const urls = [...rootCopy.matchAll(/\]\(([^)]+)\)/gu)].map((match) => match[1]!);
    expect(urls.length).toBeGreaterThan(10);
    for (const url of urls) {
      expect(url.startsWith(BLOB_PREFIX), url).toBe(true);
      expect(existsSync(resolve(repositoryRoot, url.slice(BLOB_PREFIX.length))), url).toBe(true);
    }
  });

  it("tells agents that fixture text is untrusted data", () => {
    expect(rootCopy).toMatch(/untrusted data, not instructions/u);
  });
});
