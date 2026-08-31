import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import {
  issueSessionToken,
  sessionCookie,
  verifySessionToken,
  type SessionTokenPayload,
} from "@oiw/application";

export const SESSION_COOKIE_NAME = "oiw_session";

declare global {
  var __oiwDevSessionSecret: string | undefined;
}

/**
 * ADR-007 requires a signed guest-session cookie. `SESSION_SECRET` should be
 * set in any deployed environment; for local `pnpm dev` we generate a
 * process-local secret so the demo works without extra setup — guest
 * sessions never need to survive a server restart.
 */
function sessionSecrets(): string[] {
  const current = process.env.SESSION_SECRET;
  if (current !== undefined) {
    const previous = process.env.SESSION_SECRET_PREVIOUS;
    return previous !== undefined ? [current, previous] : [current];
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (>=32 bytes) in production.");
  }

  globalThis.__oiwDevSessionSecret ??= randomBytes(32).toString("hex");
  return [globalThis.__oiwDevSessionSecret];
}

export async function setSessionCookie(workspaceId: string): Promise<void> {
  const [secret] = sessionSecrets();
  const { token } = issueSessionToken(workspaceId, secret!);
  const descriptor = sessionCookie(token);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, descriptor.value, {
    httpOnly: descriptor.httpOnly,
    secure: descriptor.secure,
    sameSite: descriptor.sameSite,
    path: descriptor.path,
    maxAge: descriptor.maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function readSessionPayload(): Promise<SessionTokenPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined) return null;
  return verifySessionToken(token, sessionSecrets());
}
