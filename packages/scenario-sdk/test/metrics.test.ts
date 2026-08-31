import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackFromDirectory } from "../src/loader.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

describe("Scenario Pack metric catalogues", () => {
  it.each(["asset-reliability", "document-assurance", "process-exceptions"])(
    "validates every %s metric and dashboard reference",
    async (packId) => {
      const result = await loadPackFromDirectory(resolve(repositoryRoot, "scenario-packs", packId));
      expect(result.status).toBe("loaded");
      if (result.status !== "loaded") throw new Error(`${packId} did not load`);
      expect(result.pack.metricDefinitions.size).toBeGreaterThan(0);
      for (const dashboard of Object.values(result.pack.dashboards)) {
        for (const widget of dashboard.widgets) {
          expect(result.pack.metricDefinitions.has(String(widget.parameters["metricId"]))).toBe(true);
        }
      }
    },
  );
});
