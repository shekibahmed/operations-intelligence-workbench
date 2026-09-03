export type GuestMutationKind =
  | "workspace-create"
  | "artifact-process"
  | "review"
  | "decision"
  | "reset"
  | "case-action"
  | "export"
  | "analytics"
  | "assessment";

export interface TokenBucketPolicy {
  capacity: number;
  refillTokens: number;
  refillIntervalMs: number;
  denialAuditIntervalMs?: number;
}

export interface TokenBucketConsumeInput {
  key: string;
  cost: number;
  policy: TokenBucketPolicy;
  nowMs: number;
}

export interface TokenBucketConsumeResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  reportDenial: boolean;
}

export interface TokenBucketStore {
  consume(input: TokenBucketConsumeInput): Promise<TokenBucketConsumeResult>;
}

interface StoredBucket {
  tokens: number;
  refilledAtMs: number;
  denialReportedAtMs: number | null;
  touchedAtMs: number;
}

function requirePositiveNumber(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

function validatePolicy(policy: TokenBucketPolicy): void {
  requirePositiveNumber("Token bucket capacity", policy.capacity);
  requirePositiveNumber("Token bucket refill tokens", policy.refillTokens);
  requirePositiveNumber("Token bucket refill interval", policy.refillIntervalMs);
  if (policy.denialAuditIntervalMs !== undefined) {
    requirePositiveNumber("Token bucket denial audit interval", policy.denialAuditIntervalMs);
  }
}

/**
 * Process-local P0 store. The interface is deliberately persistence-agnostic
 * so a shared/atomic hosted store can replace it without changing policy or
 * server-action call sites when the web tier scales beyond one instance.
 */
export class InMemoryTokenBucketStore implements TokenBucketStore {
  private readonly buckets = new Map<string, StoredBucket>();
  private consumptionCount = 0;

  async consume(input: TokenBucketConsumeInput): Promise<TokenBucketConsumeResult> {
    validatePolicy(input.policy);
    requirePositiveNumber("Token bucket cost", input.cost);
    if (!Number.isFinite(input.nowMs)) throw new Error("Token bucket clock must be finite");

    const prior = this.buckets.get(input.key);
    const bucket: StoredBucket = prior ?? {
      tokens: input.policy.capacity,
      refilledAtMs: input.nowMs,
      denialReportedAtMs: null,
      touchedAtMs: input.nowMs,
    };
    const elapsedMs = Math.max(0, input.nowMs - bucket.refilledAtMs);
    const refill = (elapsedMs / input.policy.refillIntervalMs) * input.policy.refillTokens;
    bucket.tokens = Math.min(input.policy.capacity, bucket.tokens + refill);
    bucket.refilledAtMs = input.nowMs;
    bucket.touchedAtMs = input.nowMs;

    if (bucket.tokens >= input.cost) {
      bucket.tokens -= input.cost;
      bucket.denialReportedAtMs = null;
      this.buckets.set(input.key, bucket);
      this.maybePrune(input.nowMs, input.policy);
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
        reportDenial: false,
      };
    }

    const auditInterval = input.policy.denialAuditIntervalMs ?? input.policy.refillIntervalMs;
    const reportDenial =
      bucket.denialReportedAtMs === null || input.nowMs - bucket.denialReportedAtMs >= auditInterval;
    if (reportDenial) bucket.denialReportedAtMs = input.nowMs;
    this.buckets.set(input.key, bucket);
    this.maybePrune(input.nowMs, input.policy);

    const missing = input.cost - bucket.tokens;
    return {
      allowed: false,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: Math.ceil((missing / input.policy.refillTokens) * input.policy.refillIntervalMs),
      reportDenial,
    };
  }

  clear(): void {
    this.buckets.clear();
  }

  private maybePrune(nowMs: number, policy: TokenBucketPolicy): void {
    this.consumptionCount += 1;
    if (this.consumptionCount % 1_000 !== 0) return;
    const idleTtl = Math.max(60 * 60 * 1_000, policy.refillIntervalMs * policy.capacity * 2);
    for (const [key, bucket] of this.buckets) {
      if (nowMs - bucket.touchedAtMs > idleTtl) this.buckets.delete(key);
    }
  }
}

export interface GuestRateLimitCheck {
  mutation: GuestMutationKind;
  ipKey: string;
  sessionKey?: string;
  cost?: number;
}

export interface GuestRateLimitDecision {
  allowed: boolean;
  deniedScopes: Array<"ip" | "session">;
  retryAfterMs: number;
  reportDenial: boolean;
}

export type GuestRateLimitPolicyResolver = (
  mutation: GuestMutationKind,
  scope: "ip" | "session",
) => TokenBucketPolicy;

export class GuestRateLimitService {
  constructor(
    private readonly store: TokenBucketStore,
    private readonly resolvePolicy: GuestRateLimitPolicyResolver,
    private readonly clock: () => number = Date.now,
  ) {}

  async check(input: GuestRateLimitCheck): Promise<GuestRateLimitDecision> {
    if (input.ipKey.trim().length === 0) throw new Error("Guest rate limit requires an IP-derived key");
    const cost = input.cost ?? 1;
    const nowMs = this.clock();
    const scopes: Array<{ scope: "ip" | "session"; identifier: string }> = [
      { scope: "ip", identifier: input.ipKey },
    ];
    if (input.sessionKey !== undefined) {
      if (input.sessionKey.trim().length === 0) throw new Error("Session rate-limit key cannot be empty");
      scopes.push({ scope: "session", identifier: input.sessionKey });
    }

    const results = await Promise.all(
      scopes.map(async ({ scope, identifier }) => ({
        scope,
        result: await this.store.consume({
          key: `${input.mutation}:${scope}:${identifier}`,
          cost,
          policy: this.resolvePolicy(input.mutation, scope),
          nowMs,
        }),
      })),
    );
    const denied = results.filter(({ result }) => !result.allowed);
    return {
      allowed: denied.length === 0,
      deniedScopes: denied.map(({ scope }) => scope),
      retryAfterMs: denied.reduce((maximum, { result }) => Math.max(maximum, result.retryAfterMs), 0),
      reportDenial: denied.some(({ result }) => result.reportDenial),
    };
  }
}
