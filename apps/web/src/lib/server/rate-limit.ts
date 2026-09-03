import { createHmac, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import {
  GuestRateLimitService,
  InMemoryTokenBucketStore,
  type GuestMutationKind,
  type TokenBucketPolicy,
} from "@oiw/application";
import type { Workspace } from "@oiw/contracts";

import { UserFacingActionError } from "@/lib/server/action-error";
import { buildAuditEntry } from "@/lib/server/audit";
import { getRepositories } from "@/lib/server/db";
import { readSessionPayload } from "@/lib/server/session";

interface MutationDefaults {
  sessionCapacity: number;
  ipCapacity: number;
  refillIntervalMs: number;
}

const DEFAULTS: Record<GuestMutationKind, MutationDefaults> = {
  "workspace-create": { sessionCapacity: 4, ipCapacity: 60, refillIntervalMs: 10 * 60 * 1_000 },
  "artifact-process": { sessionCapacity: 30, ipCapacity: 120, refillIntervalMs: 60 * 1_000 },
  review: { sessionCapacity: 60, ipCapacity: 240, refillIntervalMs: 60 * 1_000 },
  decision: { sessionCapacity: 20, ipCapacity: 80, refillIntervalMs: 60 * 1_000 },
  reset: { sessionCapacity: 3, ipCapacity: 12, refillIntervalMs: 10 * 60 * 1_000 },
  "case-action": { sessionCapacity: 30, ipCapacity: 120, refillIntervalMs: 60 * 1_000 },
  export: { sessionCapacity: 10, ipCapacity: 40, refillIntervalMs: 60 * 1_000 },
  analytics: { sessionCapacity: 180, ipCapacity: 600, refillIntervalMs: 60 * 1_000 },
  assessment: { sessionCapacity: 3, ipCapacity: 12, refillIntervalMs: 60 * 60 * 1_000 },
};

declare global {
  var __oiwGuestRateLimitStore: InMemoryTokenBucketStore | undefined;
  var __oiwGuestRateLimitAuditWindows: Map<string, number> | undefined;
  var __oiwDevRateLimitSalt: string | undefined;
}

function positiveIntegerEnvironment(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function environmentPrefix(mutation: GuestMutationKind): string {
  return `OIW_RATE_LIMIT_${mutation.replaceAll("-", "_").toUpperCase()}`;
}

export function guestRateLimitPolicy(
  mutation: GuestMutationKind,
  scope: "ip" | "session",
): TokenBucketPolicy {
  const defaults = DEFAULTS[mutation];
  const prefix = environmentPrefix(mutation);
  const capacity = positiveIntegerEnvironment(
    `${prefix}_${scope.toUpperCase()}_CAPACITY`,
    scope === "ip" ? defaults.ipCapacity : defaults.sessionCapacity,
  );
  const refillIntervalMs = positiveIntegerEnvironment(
    `${prefix}_REFILL_INTERVAL_MS`,
    defaults.refillIntervalMs,
  );
  return { capacity, refillTokens: capacity, refillIntervalMs, denialAuditIntervalMs: refillIntervalMs };
}

function rateLimitStore(): InMemoryTokenBucketStore {
  globalThis.__oiwGuestRateLimitStore ??= new InMemoryTokenBucketStore();
  return globalThis.__oiwGuestRateLimitStore;
}

function rateLimiter(): GuestRateLimitService {
  return new GuestRateLimitService(rateLimitStore(), guestRateLimitPolicy);
}

function ipSalt(): string {
  const configured = process.env.OIW_RATE_LIMIT_IP_SALT ?? process.env.SESSION_SECRET;
  if (configured !== undefined) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("OIW_RATE_LIMIT_IP_SALT or SESSION_SECRET must be set in production");
  }
  globalThis.__oiwDevRateLimitSalt ??= randomBytes(32).toString("hex");
  return globalThis.__oiwDevRateLimitSalt;
}

function firstForwardedAddress(value: string | null): string | null {
  if (value === null) return null;
  const first = value.split(",", 1)[0]?.trim();
  return first === undefined || first.length === 0 ? null : first.slice(0, 128);
}

const trustedProxyHeaders = new Set([
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
]);

/**
 * Forwarded addresses are trustworthy only when the deployment edge owns
 * and overwrites the selected header. Vercel receives a safe default; every
 * other host must opt in to the one header its trusted proxy controls.
 */
export function clientAddressForRateLimit(
  incoming: Headers,
  environment: Record<string, string | undefined> = process.env,
): string {
  const configured = environment["OIW_TRUSTED_PROXY_HEADER"]?.trim().toLowerCase();
  const header =
    configured === undefined
      ? environment["VERCEL"] === "1"
        ? "x-vercel-forwarded-for"
        : null
      : configured === "none"
        ? null
        : configured;
  if (header !== null && !trustedProxyHeaders.has(header)) {
    throw new Error(
      "OIW_TRUSTED_PROXY_HEADER must be none, x-vercel-forwarded-for, x-forwarded-for or x-real-ip",
    );
  }
  return header === null ? "unknown" : (firstForwardedAddress(incoming.get(header)) ?? "unknown");
}

async function privacyPreservingIpKey(): Promise<string> {
  const incoming = await headers();
  const address = clientAddressForRateLimit(incoming);
  return createHmac("sha256", ipSalt()).update(address).digest("hex");
}

export class GuestRateLimitError extends UserFacingActionError {
  readonly status = 429;
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
    super(`Too many requests. Try again in ${String(retryAfterSeconds)} seconds.`);
    this.name = "GuestRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function reserveAuditWindow(key: string, intervalMs: number, nowMs: number): boolean {
  globalThis.__oiwGuestRateLimitAuditWindows ??= new Map();
  const windows = globalThis.__oiwGuestRateLimitAuditWindows;
  const priorEnd = windows.get(key) ?? 0;
  if (priorEnd > nowMs) return false;
  windows.set(key, nowMs + intervalMs);
  if (windows.size > 1_000) {
    for (const [candidate, end] of windows) if (end <= nowMs) windows.delete(candidate);
  }
  return true;
}

async function auditDeniedMutation(
  mutation: GuestMutationKind,
  workspace: Workspace | null,
  sessionId: string | undefined,
  ipKey: string,
  deniedScopes: Array<"ip" | "session">,
  retryAfterSeconds: number,
): Promise<void> {
  const intervalMs = guestRateLimitPolicy(mutation, "ip").denialAuditIntervalMs!;
  const auditKey = `${mutation}:${workspace?.id ?? ipKey}`;
  if (!reserveAuditWindow(auditKey, intervalMs, Date.now())) return;

  if (workspace === null) {
    console.warn("Guest mutation rate limit exceeded", { mutation, deniedScopes, retryAfterSeconds, ipKey });
    return;
  }

  try {
    const repositories = getRepositories();
    const occurredAt = new Date().toISOString();
    const entry = await buildAuditEntry(repositories, {
      workspaceId: workspace.id,
      occurredAt,
      action: "guest-rate-limit-exceeded",
      actor: sessionId === undefined ? { type: "system", id: "guest-rate-limiter" } : { type: "human", id: sessionId },
      subject: { type: "workspace", id: workspace.id },
      cause: "Guest mutation was rejected before operational state changed",
      data: { mutation, deniedScopes, retryAfterSeconds, ipKey },
    });
    await repositories.auditEntries.insert(workspace.id, entry);
  } catch (error) {
    console.error("Could not persist guest rate-limit audit entry", error);
  }
}

/** Enforces independent IP and session buckets before any guest mutation. */
export async function enforceGuestRateLimit(
  mutation: GuestMutationKind,
  workspace?: Workspace,
  cost = 1,
  sessionKeyOverride?: string,
): Promise<void> {
  const [payload, ipKey] = await Promise.all([readSessionPayload(), privacyPreservingIpKey()]);
  const decision = await rateLimiter().check({
    mutation,
    ipKey,
    ...(sessionKeyOverride === undefined && payload === null
      ? {}
      : { sessionKey: sessionKeyOverride ?? payload!.sessionId }),
    cost,
  });
  if (decision.allowed) return;

  let auditWorkspace = workspace ?? null;
  if (auditWorkspace === null && payload !== null) {
    const candidate = await getRepositories().workspaces.findById(payload.workspaceId);
    if (candidate !== null && (candidate.expiresAt === null || Date.parse(candidate.expiresAt) > Date.now())) {
      auditWorkspace = candidate;
    }
  }
  const error = new GuestRateLimitError(decision.retryAfterMs);
  if (decision.reportDenial) {
    await auditDeniedMutation(
      mutation,
      auditWorkspace,
      payload?.sessionId,
      ipKey,
      decision.deniedScopes,
      error.retryAfterSeconds,
    );
  }
  throw error;
}
