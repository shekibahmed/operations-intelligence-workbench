import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackFromDirectory } from "../src/loader.js";

const fixturesRoot = resolve(import.meta.dirname, "fixtures/packs");

function fixture(name: string): string {
  return resolve(fixturesRoot, name);
}

describe("loadPackFromDirectory", () => {
  it("loads a valid pack into a typed ScenarioPack, tolerating absent demo/edge-case fixture dirs", async () => {
    const result = await loadPackFromDirectory(fixture("valid"));
    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") {
      throw new Error("expected pack to load");
    }
    expect(result.pack.manifest.id).toBe("example-pack");
    expect(result.pack.manifest.version).toBe("1.0.0");
    expect(result.pack.workflows.default?.id).toBe("default");
    expect(result.pack.rules).toHaveLength(1);
    expect(result.pack.metricDefinitions.get("open-cases")?.aggregation).toBe("count-where");
    expect(result.pack.dashboards.leadership.widgets[0]?.type).toBe("stat-card");
    expect(result.pack.labels).toMatchObject({ entitySingular: "Record" });
    expect(result.warnings.map((warning) => warning.path)).toEqual(
      expect.arrayContaining(["./fixtures/demo", "./fixtures/edge-cases"]),
    );
    expect(result.warnings.every((warning) => warning.severity === "warning")).toBe(true);
  });

  it("fails a bad manifest with a path-annotated error naming the manifest file", async () => {
    const result = await loadPackFromDirectory(fixture("invalid-manifest"));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected pack to be invalid");
    }
    expect(result.errors.some((issue) => issue.path.startsWith("manifest.yaml"))).toBe(true);
  });

  it("fails a rule that references an undeclared event type", async () => {
    const result = await loadPackFromDirectory(fixture("invalid-unknown-event-type"));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected pack to be invalid");
    }
    expect(
      result.errors.some(
        (issue) => issue.path.startsWith("./rules/default.rules.json") && issue.message.includes("phantom-event"),
      ),
    ).toBe(true);
  });

  it("fails a rule that references a fact kind outside the closed catalogue", async () => {
    const result = await loadPackFromDirectory(fixture("invalid-unknown-fact"));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected pack to be invalid");
    }
    expect(result.errors.some((issue) => issue.path.startsWith("./rules/default.rules.json"))).toBe(true);
  });

  it("fails a workflow transition that targets an undeclared state", async () => {
    const result = await loadPackFromDirectory(fixture("invalid-workflow-state"));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected pack to be invalid");
    }
    expect(result.errors.some((issue) => issue.path.startsWith("./workflows/default.workflow.json"))).toBe(true);
  });

  it("fails a dashboard widget outside the fixed widget catalogue", async () => {
    const result = await loadPackFromDirectory(fixture("invalid-widget-type"));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected pack to be invalid");
    }
    expect(result.errors.some((issue) => issue.path.startsWith("./dashboards/leadership.json"))).toBe(true);
  });

  it("fails a dashboard widget whose metricId does not resolve", async () => {
    const temporaryPack = await mkdtemp(resolve(tmpdir(), "oiw-metric-reference-"));
    try {
      await cp(fixture("valid"), temporaryPack, { recursive: true });
      const dashboardPath = resolve(temporaryPack, "dashboards/leadership.json");
      const dashboard = JSON.parse(await readFile(dashboardPath, "utf8"));
      dashboard.widgets[0].parameters.metricId = "unknown-metric";
      await writeFile(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);
      const result = await loadPackFromDirectory(temporaryPack);
      expect(result.status).toBe("invalid");
      if (result.status !== "invalid") throw new Error("expected pack to be invalid");
      expect(
        result.errors.some(
          ({ path, message }) =>
            path.endsWith("parameters.metricId") && message.includes("unknown-metric"),
        ),
      ).toBe(true);
    } finally {
      await rm(temporaryPack, { recursive: true, force: true });
    }
  });

  it("fails a Metric aggregation outside the v1.5 closed vocabulary", async () => {
    const temporaryPack = await mkdtemp(resolve(tmpdir(), "oiw-metric-aggregation-"));
    try {
      await cp(fixture("valid"), temporaryPack, { recursive: true });
      const metricPath = resolve(temporaryPack, "metrics/default.metrics.json");
      const metrics = JSON.parse(await readFile(metricPath, "utf8"));
      metrics[0].aggregation = "arbitrary-query";
      await writeFile(metricPath, `${JSON.stringify(metrics, null, 2)}\n`);
      const result = await loadPackFromDirectory(temporaryPack);
      expect(result.status).toBe("invalid");
      if (result.status !== "invalid") throw new Error("expected pack to be invalid");
      expect(
        result.errors.some(
          ({ path }) => path === "./metrics/default.metrics.json#0.aggregation",
        ),
      ).toBe(true);
    } finally {
      await rm(temporaryPack, { recursive: true, force: true });
    }
  });

  it("fails a fixture artifact with no matching expected extraction", async () => {
    const result = await loadPackFromDirectory(fixture("invalid-missing-extraction"));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected pack to be invalid");
    }
    expect(
      result.errors.some((issue) => issue.path === "./fixtures/smoke/extractions/example-smoke-002.json"),
    ).toBe(true);
  });

  it("skips a pack directory that only has narrative/ content", async () => {
    const skippedDirectory = resolve(fixturesRoot, "narrative-only");
    const result = await loadPackFromDirectory(skippedDirectory);
    expect(result.status).toBe("skipped");
  });

  it("reports an invalid error for a directory with neither manifest.yaml nor narrative/", async () => {
    const emptyDirectory = resolve(fixturesRoot, "empty");
    const result = await loadPackFromDirectory(emptyDirectory);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected pack to be invalid");
    }
    expect(result.errors[0]?.path).toBe("manifest.yaml");
  });
});
