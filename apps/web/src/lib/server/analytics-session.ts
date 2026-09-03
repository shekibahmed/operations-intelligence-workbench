import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const ANALYTICS_SESSION_COOKIE_NAME = "oiw_analytics_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function getOrCreateAnalyticsSessionId(): Promise<string> {
  const store = await cookies();
  const current = store.get(ANALYTICS_SESSION_COOKIE_NAME)?.value;
  if (current !== undefined && UUID_PATTERN.test(current)) return current;

  const sessionId = randomUUID();
  store.set(ANALYTICS_SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return sessionId;
}
