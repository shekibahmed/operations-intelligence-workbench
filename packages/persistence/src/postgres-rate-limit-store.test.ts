import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { TokenBucketConsumeInput } from "@oiw/application";

import { createDatabase } from "./database.js";
import { PostgresTokenBucketStore } from "./postgres-rate-limit-store.js";

const connection = createDatabase();
const store = new PostgresTokenBucketStore(connection.client);

const POLICY = {
  capacity: 3,
  refillTokens: 3,
  refillIntervalMs: 60_000,
  denialAuditIntervalMs: 60_000,
};

function consume(key: string, nowMs: number, cost = 1): ReturnType<typeof store.consume> {
  const input: TokenBucketConsumeInput = { key, cost, policy: POLICY, nowMs };
  return store.consume(input);
}

beforeAll(async () => {
  const migrationRows = await connection.client<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rate_limit_buckets'
  `;
  if (migrationRows[0]?.count !== "1") {
    throw new Error("Rate-limit store tests require `pnpm db:migrate` first");
  }
});

beforeEach(async () => {
  await connection.client.unsafe("TRUNCATE TABLE rate_limit_buckets");
});

afterAll(async () => {
  await connection.close();
});

describe("PostgresTokenBucketStore", () => {
  it("allows consumption up to capacity, then denies with a retry hint", async () => {
    const key = `cap:${randomUUID()}`;
    const now = 1_000_000;

    for (let index = 0; index < POLICY.capacity; index += 1) {
      const result = await consume(key, now);
      expect(result.allowed).toBe(true);
      expect(result.reportDenial).toBe(false);
    }

    const denied = await consume(key, now);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.reportDenial).toBe(true);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(denied.retryAfterMs).toBeLessThanOrEqual(POLICY.refillIntervalMs);
  });

  it("reports a denial only once per audit window", async () => {
    const key = `audit:${randomUUID()}`;
    const now = 2_000_000;
    // Short audit window vs. refill interval, so the bucket stays drained
    // when the window elapses and the next denial can re-report.
    const policy = { ...POLICY, denialAuditIntervalMs: 1_000 };

    for (let index = 0; index < POLICY.capacity; index += 1) {
      await store.consume({ key, cost: 1, policy, nowMs: now });
    }

    const first = await store.consume({ key, cost: 1, policy, nowMs: now });
    const second = await store.consume({ key, cost: 1, policy, nowMs: now });
    expect(first.reportDenial).toBe(true);
    expect(second.reportDenial).toBe(false);

    const later = await store.consume({ key, cost: 1, policy, nowMs: now + policy.denialAuditIntervalMs });
    expect(later.allowed).toBe(false);
    expect(later.reportDenial).toBe(true);
  });

  it("refills tokens proportionally as time passes", async () => {
    const key = `refill:${randomUUID()}`;
    const start = 3_000_000;
    for (let index = 0; index < POLICY.capacity; index += 1) await consume(key, start);
    expect((await consume(key, start)).allowed).toBe(false);

    // A third of the refill interval has passed → one token refilled.
    const afterThird = await consume(key, start + POLICY.refillIntervalMs / 3);
    expect(afterThird.allowed).toBe(true);
    expect((await consume(key, start + POLICY.refillIntervalMs / 3)).allowed).toBe(false);
  });

  it("stays exact under concurrent consumers (the multi-instance guarantee)", async () => {
    const key = `concurrent:${randomUUID()}`;
    const now = 4_000_000;
    const attempts = 12;

    const results = await Promise.all(
      Array.from({ length: attempts }, () => consume(key, now)),
    );

    const allowed = results.filter((result) => result.allowed);
    const denied = results.filter((result) => !result.allowed);
    expect(allowed).toHaveLength(POLICY.capacity);
    expect(denied).toHaveLength(attempts - POLICY.capacity);

    const stored = await connection.client<{ tokens: number }[]>`
      SELECT tokens FROM rate_limit_buckets WHERE bucket_key = ${key}
    `;
    expect(stored[0]?.tokens).toBe(0);
  });

  it("supports costs larger than one", async () => {
    const key = `cost:${randomUUID()}`;
    const now = 5_000_000;
    const policy = { ...POLICY, capacity: 4, refillTokens: 4 };

    expect((await store.consume({ key, cost: 2, policy, nowMs: now })).allowed).toBe(true);
    expect((await store.consume({ key, cost: 2, policy, nowMs: now })).allowed).toBe(true);
    const denied = await store.consume({ key, cost: 2, policy, nowMs: now });
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBe(Math.ceil((2 / policy.refillTokens) * policy.refillIntervalMs));
  });

  it("rejects invalid policies and costs before touching the database", async () => {
    const key = `invalid:${randomUUID()}`;
    await expect(
      store.consume({ key, cost: 1, policy: { ...POLICY, capacity: 0 }, nowMs: 1 }),
    ).rejects.toThrow("Token bucket capacity");
    await expect(store.consume({ key, cost: 0, policy: POLICY, nowMs: 1 })).rejects.toThrow(
      "Token bucket cost",
    );
    const stored = await connection.client<{ count: string }[]>`
      SELECT count(*)::text AS count FROM rate_limit_buckets WHERE bucket_key = ${key}
    `;
    expect(stored[0]?.count).toBe("0");
  });
});
