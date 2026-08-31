import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "oiw1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60;

export interface SessionTokenPayload {
  version: 1;
  sessionId: string;
  workspaceId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface IssueSessionTokenOptions {
  now?: Date;
  ttlSeconds?: number;
  sessionId?: string;
}

export interface SessionCookieDescriptor {
  value: string;
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

function assertSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Session token secret must contain at least 32 bytes");
  }
}

function sign(unsignedToken: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(unsignedToken).digest();
}

function parsePayload(value: unknown): SessionTokenPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const payload = value as Partial<SessionTokenPayload>;
  if (
    payload.version !== 1 ||
    typeof payload.sessionId !== "string" ||
    !UUID_PATTERN.test(payload.sessionId) ||
    typeof payload.workspaceId !== "string" ||
    !UUID_PATTERN.test(payload.workspaceId) ||
    !Number.isInteger(payload.issuedAt) ||
    !Number.isInteger(payload.expiresAt) ||
    payload.expiresAt! <= payload.issuedAt!
  ) {
    return null;
  }
  return payload as SessionTokenPayload;
}

export function issueSessionToken(
  workspaceId: string,
  secret: string,
  options: IssueSessionTokenOptions = {},
): { token: string; payload: SessionTokenPayload } {
  assertSecret(secret);
  if (!UUID_PATTERN.test(workspaceId)) throw new Error("Workspace ID must be a UUID");

  const ttlSeconds = options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("Session token TTL must be a positive integer number of seconds");
  }

  const issuedAt = Math.floor((options.now ?? new Date()).getTime() / 1_000);
  const payload: SessionTokenPayload = {
    version: 1,
    sessionId: options.sessionId ?? randomUUID(),
    workspaceId,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  };
  if (!UUID_PATTERN.test(payload.sessionId)) throw new Error("Session ID must be a UUID");

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const unsignedToken = `${TOKEN_VERSION}.${encodedPayload}`;
  const signature = sign(unsignedToken, secret).toString("base64url");
  return { token: `${unsignedToken}.${signature}`, payload };
}

export function verifySessionToken(
  token: string,
  secrets: string | readonly string[],
  now = new Date(),
): SessionTokenPayload | null {
  const acceptedSecrets = typeof secrets === "string" ? [secrets] : [...secrets];
  if (acceptedSecrets.length === 0) return null;
  for (const secret of acceptedSecrets) assertSecret(secret);

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;
  const encodedPayload = parts[1]!;
  const suppliedSignature = parts[2]!;
  const unsignedToken = `${TOKEN_VERSION}.${encodedPayload}`;

  let suppliedBytes: Buffer;
  try {
    suppliedBytes = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }

  const validSignature = acceptedSecrets.some((secret) => {
    const expected = sign(unsignedToken, secret);
    return suppliedBytes.length === expected.length && timingSafeEqual(suppliedBytes, expected);
  });
  if (!validSignature) return null;

  let payload: SessionTokenPayload | null;
  try {
    payload = parsePayload(JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")));
  } catch {
    return null;
  }
  if (payload === null) return null;

  const nowSeconds = Math.floor(now.getTime() / 1_000);
  if (payload.issuedAt > nowSeconds || payload.expiresAt <= nowSeconds) return null;
  return payload;
}

export function sessionCookie(token: string, maxAge = DEFAULT_SESSION_TTL_SECONDS): SessionCookieDescriptor {
  return { value: token, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge };
}
