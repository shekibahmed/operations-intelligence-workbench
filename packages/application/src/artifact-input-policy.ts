const textDecoder = new TextDecoder("utf-8", { fatal: true });

export const DEFAULT_MAX_ARTIFACT_BYTES = 1_048_576;
export const DEFAULT_MAX_ARTIFACTS_PER_WORKSPACE = 100;
export const ALLOWED_ARTIFACT_MIME_TYPES = [
  "application/json",
  "application/pdf",
  "text/csv",
  "text/plain",
] as const;

export type AllowedArtifactMimeType = (typeof ALLOWED_ARTIFACT_MIME_TYPES)[number];

const allowedMimeTypes = new Set<string>(ALLOWED_ARTIFACT_MIME_TYPES);
const extensionsByMime: Record<AllowedArtifactMimeType, ReadonlySet<string>> = {
  "application/json": new Set(["json"]),
  "application/pdf": new Set(["pdf"]),
  "text/csv": new Set(["csv"]),
  "text/plain": new Set(["txt", "text"]),
};

export interface ArtifactInputPolicyOptions {
  maxBytes?: number;
  maxArtifactsPerWorkspace?: number;
}

export interface ArtifactInput {
  content: Uint8Array;
  mimeType: string;
  fileName?: string;
}

export interface ValidatedArtifactInput extends ArtifactInput {
  mimeType: AllowedArtifactMimeType;
  byteLength: number;
}

export class ArtifactInputPolicyError extends Error {
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "ArtifactInputPolicyError";
  }
}

function positiveInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

function normaliseMimeType(value: string): string {
  return value.split(";", 1)[0]!.trim().toLowerCase();
}

function extension(fileName: string): string | null {
  const base = fileName.trim().toLowerCase();
  const separator = base.lastIndexOf(".");
  return separator <= 0 || separator === base.length - 1 ? null : base.slice(separator + 1);
}

function decodeText(content: Uint8Array): string {
  try {
    return textDecoder.decode(content);
  } catch {
    throw new ArtifactInputPolicyError("Artifact content is not valid UTF-8 text.");
  }
}

/** Server-side boundary for future manual/upload ingestion. Content is only inspected as bytes/text; it is never executed. */
export class ArtifactInputPolicy {
  private readonly maxBytes: number;
  private readonly maxArtifactsPerWorkspace: number;

  constructor(options: ArtifactInputPolicyOptions = {}) {
    this.maxBytes = positiveInteger("Artifact byte limit", options.maxBytes ?? DEFAULT_MAX_ARTIFACT_BYTES);
    this.maxArtifactsPerWorkspace = positiveInteger(
      "Artifact count limit",
      options.maxArtifactsPerWorkspace ?? DEFAULT_MAX_ARTIFACTS_PER_WORKSPACE,
    );
  }

  validate(input: ArtifactInput): ValidatedArtifactInput {
    const mimeType = normaliseMimeType(input.mimeType);
    if (!allowedMimeTypes.has(mimeType)) {
      throw new ArtifactInputPolicyError("This artifact type is not supported.");
    }
    if (input.content.byteLength === 0) throw new ArtifactInputPolicyError("Artifact content cannot be empty.");
    if (input.content.byteLength > this.maxBytes) {
      throw new ArtifactInputPolicyError(`Artifact exceeds the ${String(this.maxBytes)} byte limit.`);
    }

    const allowedMimeType = mimeType as AllowedArtifactMimeType;
    if (input.fileName !== undefined) {
      const suffix = extension(input.fileName);
      if (suffix === null || !extensionsByMime[allowedMimeType].has(suffix)) {
        throw new ArtifactInputPolicyError("Artifact filename does not match its declared type.");
      }
    }

    if (allowedMimeType === "application/pdf") {
      const signature = new TextDecoder("ascii").decode(input.content.subarray(0, 5));
      if (signature !== "%PDF-") throw new ArtifactInputPolicyError("Artifact content does not match its declared type.");
    } else {
      const decoded = decodeText(input.content);
      if (decoded.includes("\u0000")) {
        throw new ArtifactInputPolicyError("Artifact text contains unsupported binary data.");
      }
      if (allowedMimeType === "application/json") {
        try {
          JSON.parse(decoded);
        } catch {
          throw new ArtifactInputPolicyError("Artifact content is not valid JSON.");
        }
      }
    }

    return { ...input, mimeType: allowedMimeType, byteLength: input.content.byteLength };
  }

  validateWorkspaceCount(currentArtifactCount: number): void {
    if (!Number.isSafeInteger(currentArtifactCount) || currentArtifactCount < 0) {
      throw new Error("Current artifact count must be a non-negative safe integer");
    }
    if (currentArtifactCount >= this.maxArtifactsPerWorkspace) {
      throw new ArtifactInputPolicyError("This workspace has reached its artifact limit.");
    }
  }
}
