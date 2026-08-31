import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  issueSessionToken,
  sessionCookie,
  verifySessionToken,
} from "../src/session-token.js";

const currentSecret = "current-session-secret-that-is-at-least-32-bytes";
const previousSecret = "previous-session-secret-that-is-at-least-32-bytes";
const now = new Date("2026-08-31T12:00:00.000Z");

describe("session tokens", () => {
  it("binds an opaque session to a workspace and emits secure cookie attributes", () => {
    const workspaceId = randomUUID();
    const issued = issueSessionToken(workspaceId, currentSecret, {
      now,
      ttlSeconds: 900,
      sessionId: "11111111-1111-4111-8111-111111111111",
    });

    expect(verifySessionToken(issued.token, currentSecret, now)).toEqual(issued.payload);
    expect(issued.payload.workspaceId).toBe(workspaceId);
    expect(sessionCookie(issued.token, 900)).toEqual({
      value: issued.token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
  });

  it("rejects payload and signature tampering", () => {
    const issued = issueSessionToken(randomUUID(), currentSecret, { now });
    const [version, payload, signature] = issued.token.split(".");
    const parsed = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) as {
      workspaceId: string;
    };
    parsed.workspaceId = randomUUID();
    const tamperedPayload = Buffer.from(JSON.stringify(parsed)).toString("base64url");

    expect(
      verifySessionToken(`${version}.${tamperedPayload}.${signature}`, currentSecret, now),
    ).toBeNull();
    expect(
      verifySessionToken(
        `${version}.${payload}.${signature!.startsWith("a") ? "b" : "a"}${signature!.slice(1)}`,
        currentSecret,
        now,
      ),
    ).toBeNull();
  });

  it("enforces expiry and supports verification-secret rotation", () => {
    const issued = issueSessionToken(randomUUID(), previousSecret, { now, ttlSeconds: 60 });

    expect(
      verifySessionToken(issued.token, [currentSecret, previousSecret], new Date(now.getTime() + 59_000)),
    ).toEqual(issued.payload);
    expect(
      verifySessionToken(issued.token, [currentSecret, previousSecret], new Date(now.getTime() + 60_000)),
    ).toBeNull();
    expect(verifySessionToken(issued.token, currentSecret, now)).toBeNull();
  });
});
