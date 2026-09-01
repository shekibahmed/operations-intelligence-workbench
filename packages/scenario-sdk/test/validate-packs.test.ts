import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  type PackValidationOutput,
  validatePackDirectories,
} from "../../../scripts/validate-packs.js";

const registryFixtures = resolve(import.meta.dirname, "fixtures/registry");

describe("validatePackDirectories", () => {
  it("validates an underscore-prefixed fixture under a distinct template label", async () => {
    const lines: string[] = [];
    const output: PackValidationOutput = {
      log: (message) => lines.push(message),
      error: (message) => lines.push(message),
    };

    await validatePackDirectories(registryFixtures, output);

    expect(lines).toContain(
      "TEMPLATE OK    packages/scenario-sdk/test/fixtures/registry/_template (template-fixture@1.0.0)",
    );
    expect(lines.some((line) => line.startsWith("SKIP  ") && line.includes("_template"))).toBe(false);
  });

  it("returns a failure status when an underscore-prefixed template is invalid", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oiw-pack-validation-"));
    const templateDirectory = join(directory, "_invalid-template");
    await mkdir(templateDirectory);
    await writeFile(join(templateDirectory, "manifest.yaml"), 'schemaVersion: "invalid"\n', "utf8");
    const lines: string[] = [];

    try {
      const status = await validatePackDirectories(directory, {
        log: (message) => lines.push(message),
        error: (message) => lines.push(message),
      });

      expect(status).toBe(1);
      expect(lines.some((line) => line.includes("TEMPLATE FAIL") && line.includes("_invalid-template"))).toBe(
        true,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
