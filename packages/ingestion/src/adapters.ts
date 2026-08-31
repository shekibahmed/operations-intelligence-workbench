import { createHash } from "node:crypto";

import type { Artifact, ArtifactSegment } from "@oiw/contracts";

export interface SegmentDraft {
  locator: ArtifactSegment["locator"];
  excerpt: string;
}

export interface FormatAdapter {
  readonly id: string;
  supports(artifact: Pick<Artifact, "artifactType" | "mimeType" | "metadata">): boolean;
  segment(rawText: string): SegmentDraft[];
  locate(rawText: string, locator: ArtifactSegment["locator"]): string | null;
}

export class UnsupportedArtifactFormatError extends Error {
  readonly retryable = false;

  constructor(mimeType: string) {
    super(`No ingestion adapter supports MIME type "${mimeType}"`);
    this.name = "UnsupportedArtifactFormatError";
  }
}

export class InvalidArtifactContentError extends Error {
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "InvalidArtifactContentError";
  }
}

function fullTextSegment(rawText: string): SegmentDraft[] {
  return rawText.length === 0
    ? []
    : [{ locator: { kind: "text-range", start: 0, end: rawText.length }, excerpt: rawText }];
}

export class PlainTextAdapter implements FormatAdapter {
  readonly id = "plain-text";

  supports(artifact: Pick<Artifact, "mimeType">): boolean {
    return artifact.mimeType.startsWith("text/") && artifact.mimeType !== "text/csv";
  }

  segment(rawText: string): SegmentDraft[] {
    const messageHeader = /^([^\n,]+),\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s*$/gmu;
    const starts = [...rawText.matchAll(messageHeader)].map((match) => match.index);
    if (starts.length < 2) return fullTextSegment(rawText);

    return starts.map((start, index) => {
      const nextStart = starts[index + 1] ?? rawText.length;
      const untrimmed = rawText.slice(start, nextStart);
      const excerpt = untrimmed.trimEnd();
      return {
        locator: { kind: "text-range", start, end: start + excerpt.length },
        excerpt,
      };
    });
  }

  locate(rawText: string, locator: ArtifactSegment["locator"]): string | null {
    if (locator.kind !== "text-range" || locator.end > rawText.length) return null;
    return rawText.slice(locator.start, locator.end);
  }
}

interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

function parseCsv(rawText: string): ParsedCsv {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  const pushRecord = (): void => {
    record.push(field);
    field = "";
    if (record.some((value) => value.length > 0)) records.push(record);
    record = [];
  };

  for (let index = 0; index < rawText.length; index += 1) {
    const character = rawText[index]!;
    if (quoted) {
      if (character === '"' && rawText[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      pushRecord();
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (quoted) throw new InvalidArtifactContentError("CSV contains an unterminated quoted field");
  if (field.length > 0 || record.length > 0) pushRecord();
  if (records.length === 0) throw new InvalidArtifactContentError("CSV contains no header row");

  const [headers, ...rows] = records;
  if (headers!.some((header) => header.length === 0)) {
    throw new InvalidArtifactContentError("CSV header names must be non-empty");
  }
  if (new Set(headers).size !== headers!.length) {
    throw new InvalidArtifactContentError("CSV header names must be unique");
  }
  for (const [index, row] of rows.entries()) {
    if (row.length > headers!.length && headers!.length >= 2) {
      rows[index] = [
        ...row.slice(0, headers!.length - 2),
        row.slice(headers!.length - 2, -1).join(","),
        row.at(-1)!,
      ];
      continue;
    }
    if (row.length < headers!.length) {
      throw new InvalidArtifactContentError(
        `CSV row ${index} has ${row.length} cells; expected ${headers!.length}`,
      );
    }
  }
  return { headers: headers!, rows };
}

function encodeCsvCell(value: string): string {
  return /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export class CsvAdapter implements FormatAdapter {
  readonly id = "csv";

  supports(artifact: Pick<Artifact, "mimeType">): boolean {
    return artifact.mimeType === "text/csv" || artifact.mimeType === "application/csv";
  }

  segment(rawText: string): SegmentDraft[] {
    const parsed = parseCsv(rawText);
    return parsed.rows.flatMap((row, rowIndex) =>
      row.map((excerpt, columnIndex) => ({
        locator: {
          kind: "table-cell" as const,
          row: rowIndex,
          column: parsed.headers[columnIndex]!,
        },
        excerpt,
      })),
    );
  }

  splitRows(rawText: string): string[] {
    const parsed = parseCsv(rawText);
    const header = parsed.headers.map(encodeCsvCell).join(",");
    return parsed.rows.map(
      (row) => `${header}\n${row.map(encodeCsvCell).join(",")}\n`,
    );
  }

  locate(rawText: string, locator: ArtifactSegment["locator"]): string | null {
    if (locator.kind !== "table-cell") return null;
    const parsed = parseCsv(rawText);
    const columnIndex = parsed.headers.indexOf(locator.column);
    return columnIndex < 0 ? null : (parsed.rows[locator.row]?.[columnIndex] ?? null);
  }
}

function jsonPathForProperty(parent: string, property: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(property)
    ? `${parent}.${property}`
    : `${parent}[${JSON.stringify(property)}]`;
}

function jsonExcerpt(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function collectJsonSegments(value: unknown, path = "$", output: SegmentDraft[] = []): SegmentDraft[] {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectJsonSegments(child, `${path}[${index}]`, output));
  } else if (typeof value === "object" && value !== null) {
    for (const [property, child] of Object.entries(value)) {
      collectJsonSegments(child, jsonPathForProperty(path, property), output);
    }
  } else {
    output.push({ locator: { kind: "json-path", path }, excerpt: jsonExcerpt(value) });
  }
  return output;
}

function parseJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText) as unknown;
  } catch (error) {
    throw new InvalidArtifactContentError(`JSON parsing failed: ${(error as Error).message}`);
  }
}

export class JsonAdapter implements FormatAdapter {
  readonly id = "json";

  supports(artifact: Pick<Artifact, "mimeType">): boolean {
    return artifact.mimeType === "application/json" || artifact.mimeType.endsWith("+json");
  }

  segment(rawText: string): SegmentDraft[] {
    return collectJsonSegments(parseJson(rawText));
  }

  locate(rawText: string, locator: ArtifactSegment["locator"]): string | null {
    if (locator.kind !== "json-path") return null;
    return this.segment(rawText).find(
      (segment) => segment.locator.kind === "json-path" && segment.locator.path === locator.path,
    )?.excerpt ?? null;
  }
}

interface PdfPage {
  page: number;
  excerpt: string;
}

function parsePdfTextPages(rawText: string): PdfPage[] {
  const marker = /^--- page (\d+) ---\s*$/gmu;
  const matches = [...rawText.matchAll(marker)];
  if (matches.length === 0) {
    throw new InvalidArtifactContentError(
      "PDF fixture text must contain one or more '--- page N ---' markers",
    );
  }

  const pages = matches.map((match, index) => {
    const page = Number(match[1]);
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? rawText.length;
    return { page, excerpt: rawText.slice(start, end).trim() };
  });
  if (pages.some(({ page }, index) => page !== index + 1)) {
    throw new InvalidArtifactContentError("PDF fixture page markers must be sequential and one-based");
  }
  return pages;
}

export class PdfTextAdapter implements FormatAdapter {
  readonly id = "pdf-text";

  supports(artifact: Pick<Artifact, "mimeType" | "metadata">): boolean {
    return artifact.mimeType === "application/pdf" || artifact.metadata["sourceFormat"] === "pdf-text-layer";
  }

  segment(rawText: string): SegmentDraft[] {
    return parsePdfTextPages(rawText).map(({ page, excerpt }) => ({
      locator: { kind: "page", page },
      excerpt,
    }));
  }

  locate(rawText: string, locator: ArtifactSegment["locator"]): string | null {
    if (locator.kind !== "page") return null;
    return parsePdfTextPages(rawText).find(({ page }) => page === locator.page)?.excerpt ?? null;
  }
}

export class FormatAdapterRegistry {
  constructor(
    private readonly adapters: readonly FormatAdapter[] = [
      new CsvAdapter(),
      new JsonAdapter(),
      new PdfTextAdapter(),
      new PlainTextAdapter(),
    ],
  ) {}

  adapterFor(artifact: Pick<Artifact, "artifactType" | "mimeType" | "metadata">): FormatAdapter {
    const adapter = this.adapters.find((candidate) => candidate.supports(artifact));
    if (adapter === undefined) throw new UnsupportedArtifactFormatError(artifact.mimeType);
    return adapter;
  }

  segment(artifact: Artifact): SegmentDraft[] {
    if (artifact.rawText === null) {
      throw new InvalidArtifactContentError("P0 adapters require a UTF-8 text payload");
    }
    return this.adapterFor(artifact).segment(artifact.rawText);
  }

  locate(artifact: Artifact, locator: ArtifactSegment["locator"]): string | null {
    if (artifact.rawText === null) return null;
    return this.adapterFor(artifact).locate(artifact.rawText, locator);
  }
}

export function segmentChecksum(excerpt: string): string {
  return createHash("sha256").update(excerpt).digest("hex");
}
