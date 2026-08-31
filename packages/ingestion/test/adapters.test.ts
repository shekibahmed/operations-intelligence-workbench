import { describe, expect, it } from "vitest";

import {
  CsvAdapter,
  InvalidArtifactContentError,
  JsonAdapter,
  PdfTextAdapter,
  PlainTextAdapter,
} from "../src/adapters.js";

describe("format adapters", () => {
  it("creates one exact text-range segment per chat message", () => {
    const raw = [
      "[Synthetic chat]",
      "",
      "Alex Kim, 2026-01-01 09:00",
      "First message.",
      "",
      "Riley Chen, 2026-01-01 09:01",
      "Second message.",
      "",
    ].join("\n");
    const segments = new PlainTextAdapter().segment(raw);

    expect(segments).toHaveLength(2);
    expect(segments.map(({ excerpt }) => excerpt)).toEqual([
      "Alex Kim, 2026-01-01 09:00\nFirst message.",
      "Riley Chen, 2026-01-01 09:01\nSecond message.",
    ]);
    for (const segment of segments) {
      if (segment.locator.kind !== "text-range") throw new Error("Expected a text range");
      expect(raw.slice(segment.locator.start, segment.locator.end)).toBe(segment.excerpt);
    }
  });

  it("parses quoted CSV cells and uses zero-based data-row locators", () => {
    const raw = 'record_id,detail,status\nR-1,"contains, comma",Open\nR-2,"two ""quotes""",Closed\n';
    const adapter = new CsvAdapter();

    expect(adapter.segment(raw)).toEqual([
      { locator: { kind: "table-cell", row: 0, column: "record_id" }, excerpt: "R-1" },
      { locator: { kind: "table-cell", row: 0, column: "detail" }, excerpt: "contains, comma" },
      { locator: { kind: "table-cell", row: 0, column: "status" }, excerpt: "Open" },
      { locator: { kind: "table-cell", row: 1, column: "record_id" }, excerpt: "R-2" },
      { locator: { kind: "table-cell", row: 1, column: "detail" }, excerpt: 'two "quotes"' },
      { locator: { kind: "table-cell", row: 1, column: "status" }, excerpt: "Closed" },
    ]);
    expect(adapter.splitRows(raw)).toEqual([
      'record_id,detail,status\nR-1,"contains, comma",Open\n',
      'record_id,detail,status\nR-2,"two ""quotes""",Closed\n',
    ]);
  });

  it("fails malformed CSV instead of silently shifting cells", () => {
    expect(() => new CsvAdapter().segment("a,b\n1\n")).toThrow(InvalidArtifactContentError);
  });

  it("recovers unquoted commas in a trailing narrative column before a status column", () => {
    expect(new CsvAdapter().segment("id,detail,status\nR-1,first, second,Open\n")).toEqual([
      { locator: { kind: "table-cell", row: 0, column: "id" }, excerpt: "R-1" },
      { locator: { kind: "table-cell", row: 0, column: "detail" }, excerpt: "first, second" },
      { locator: { kind: "table-cell", row: 0, column: "status" }, excerpt: "Open" },
    ]);
  });

  it("creates JSON-path locators for nested leaves and arrays", () => {
    const raw = JSON.stringify({ record_id: "R-1", nested: { value: 4 }, flags: [true, false] });
    expect(new JsonAdapter().segment(raw)).toEqual([
      { locator: { kind: "json-path", path: "$.record_id" }, excerpt: "R-1" },
      { locator: { kind: "json-path", path: "$.nested.value" }, excerpt: "4" },
      { locator: { kind: "json-path", path: "$.flags[0]" }, excerpt: "true" },
      { locator: { kind: "json-path", path: "$.flags[1]" }, excerpt: "false" },
    ]);
  });

  it("creates one-based page segments from PDF fixture markers", () => {
    const raw = "--- page 1 ---\n\nFirst page.\n\n--- page 2 ---\n\nSecond page.\n";
    const adapter = new PdfTextAdapter();
    expect(adapter.segment(raw)).toEqual([
      { locator: { kind: "page", page: 1 }, excerpt: "First page." },
      { locator: { kind: "page", page: 2 }, excerpt: "Second page." },
    ]);
    expect(adapter.locate(raw, { kind: "page", page: 2 })).toBe("Second page.");
  });
});
