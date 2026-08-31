import { isRedirectError } from "@/lib/is-redirect-error";

/** Thrown for errors this module already wrote a safe, user-facing message for. */
export class UserFacingActionError extends Error {}

/**
 * Converts a caught server-action error into a client-safe message.
 * `requireWorkspace`'s `redirect()` on an expired/invalid session throws
 * Next's special `NEXT_REDIRECT` error — a `try/catch` around the call must
 * rethrow it (see `is-redirect-error.ts`) rather than turn an intended
 * redirect into a generic `{ ok: false }` result. Known, intentionally
 * informative error classes (this module's own `UserFacingActionError`, and
 * `@oiw/ingestion`/`@oiw/intelligence`'s adapter/provider errors, which all
 * carry a `retryable` flag) pass their message through; anything else is an
 * unexpected internal failure (e.g. a database error) and is logged
 * server-side but not echoed to the client verbatim.
 */
export function toActionErrorMessage(error: unknown, fallback: string): string {
  if (isRedirectError(error)) throw error;
  if (error instanceof UserFacingActionError) return error.message;
  if (error instanceof Error && "retryable" in error) return error.message;
  console.error(error);
  return fallback;
}
