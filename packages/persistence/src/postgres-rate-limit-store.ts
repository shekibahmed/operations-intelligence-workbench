import type {
  TokenBucketConsumeInput,
  TokenBucketConsumeResult,
  TokenBucketPolicy,
  TokenBucketStore,
} from "@oiw/application";
import type { Sql } from "postgres";

interface StoredRow {
  allowed: boolean;
  tokens: number;
  denial_reported_at_ms: number | null;
  prior_denial_reported_at_ms: number | null;
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
 * Shared, atomic token-bucket store backed by the `rate_limit_buckets`
 * table — the multi-instance counterpart to the process-local
 * `InMemoryTokenBucketStore` (same `TokenBucketStore` port, same refill and
 * denial-report semantics). Selected with `OIW_RATE_LIMIT_STORE=postgres`;
 * the in-memory store stays the default for single-instance deployments.
 *
 * Each `consume` is ONE `INSERT … ON CONFLICT DO UPDATE` statement: refill,
 * decrement and denial-bookkeeping all happen inside the conflict action, so
 * concurrent instances serialise on the primary key and can neither
 * double-spend tokens nor lose a refill. (A data-modifying CTE would NOT be
 * safe here — its statements share one snapshot, so an outer UPDATE cannot
 * see the row its sibling INSERT just created.)
 *
 * The RETURNING row encodes the decision: `allowed` ⇔ the denial stamp is
 * NULL (an allowed consume always clears it, a denied one always leaves it
 * set — including the fresh-insert case, where VALUES plants `$now` when
 * capacity cannot cover the cost). Two denials landing on the exact same
 * millisecond may both set `reportDenial`; the web layer's audit window
 * deduplicates actual audit writes regardless.
 */
export class PostgresTokenBucketStore implements TokenBucketStore {
  private consumeCount = 0;

  constructor(
    /**
     * The raw `postgres` client (not the Drizzle wrapper): the refill maths
     * must run inside the database's single upsert statement, which has no
     * expression in the query builder.
     */
    private readonly client: Sql,
  ) {}

  async consume(input: TokenBucketConsumeInput): Promise<TokenBucketConsumeResult> {
    validatePolicy(input.policy);
    requirePositiveNumber("Token bucket cost", input.cost);
    if (!Number.isFinite(input.nowMs)) throw new Error("Token bucket clock must be finite");

    const auditInterval = input.policy.denialAuditIntervalMs ?? input.policy.refillIntervalMs;
    const rows = await this.client.unsafe<StoredRow[]>(
      // The `prior` CTE reads the pre-statement snapshot of the bucket (the
      // main statement cannot see its own write), letting the RETURNING row
      // carry both the new and the previous denial stamp.
      `WITH prior AS (
        SELECT denial_reported_at_ms FROM rate_limit_buckets WHERE bucket_key = $1::text
      )
      INSERT INTO rate_limit_buckets
        (bucket_key, tokens, refilled_at_ms, denial_reported_at_ms, touched_at_ms)
      VALUES (
        $1::text,
        $2::double precision - CASE WHEN $2::double precision >= $6::double precision THEN $6::double precision ELSE 0 END,
        $3::double precision,
        CASE WHEN $2::double precision >= $6::double precision THEN NULL ELSE $3::double precision END,
        $3::double precision
      )
      ON CONFLICT (bucket_key) DO UPDATE SET
        tokens =
          LEAST($2::double precision, rate_limit_buckets.tokens
            + (GREATEST(0, $3::double precision - rate_limit_buckets.refilled_at_ms) / $4::double precision) * $5::double precision)
          - CASE
              WHEN LEAST($2::double precision, rate_limit_buckets.tokens
                + (GREATEST(0, $3::double precision - rate_limit_buckets.refilled_at_ms) / $4::double precision) * $5::double precision) >= $6::double precision
              THEN $6::double precision ELSE 0
            END,
        refilled_at_ms = $3::double precision,
        denial_reported_at_ms = CASE
          WHEN LEAST($2::double precision, rate_limit_buckets.tokens
            + (GREATEST(0, $3::double precision - rate_limit_buckets.refilled_at_ms) / $4::double precision) * $5::double precision) >= $6::double precision
          THEN NULL
          WHEN rate_limit_buckets.denial_reported_at_ms IS NULL
            OR ($3::double precision - rate_limit_buckets.denial_reported_at_ms) >= $7::double precision
          THEN $3::double precision
          ELSE rate_limit_buckets.denial_reported_at_ms
        END,
        touched_at_ms = $3::double precision
      RETURNING
        denial_reported_at_ms IS NULL AS allowed,
        tokens,
        denial_reported_at_ms,
        (SELECT denial_reported_at_ms FROM prior) AS prior_denial_reported_at_ms`,
      [
        input.key,
        input.policy.capacity,
        input.nowMs,
        input.policy.refillIntervalMs,
        input.policy.refillTokens,
        input.cost,
        auditInterval,
      ],
      // Fixed statement shape; explicit non-prepared mode avoids
      // prepared-statement name collisions across pooled client reloads.
      { prepare: false },
    );

    const row = rows[0];
    if (row === undefined) {
      throw new Error(`Rate-limit bucket write returned no row for key ${JSON.stringify(input.key)}`);
    }

    if (row.allowed) {
      return {
        allowed: true,
        remaining: Math.floor(row.tokens),
        retryAfterMs: 0,
        reportDenial: false,
      };
    }

    const missing = input.cost - row.tokens;
    return {
      allowed: false,
      remaining: Math.floor(row.tokens),
      retryAfterMs: Math.ceil((missing / input.policy.refillTokens) * input.policy.refillIntervalMs),
      // A stamp equal to `nowMs` was set by THIS statement — but only counts
      // as a fresh report when the prior stamp differs (two denials within
      // the same millisecond would otherwise both report).
      reportDenial:
        row.denial_reported_at_ms === input.nowMs &&
        row.prior_denial_reported_at_ms !== input.nowMs,
    };
  }

  /** Deletes buckets idle for the same TTL the in-memory store prunes at. */
  async prune(nowMs: number, policy: TokenBucketPolicy): Promise<void> {
    const idleTtl = Math.max(60 * 60 * 1_000, policy.refillIntervalMs * policy.capacity * 2);
    await this.client.unsafe(`DELETE FROM rate_limit_buckets WHERE touched_at_ms < $1`, [
      nowMs - idleTtl,
    ], { prepare: false });
  }
}
