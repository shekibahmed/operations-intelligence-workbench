/**
 * A Server Action that calls `redirect()` throws an error carrying Next's
 * `NEXT_REDIRECT` digest; the framework's own action-calling runtime
 * normally intercepts this and navigates, but a client `try/catch` around a
 * direct action call can still observe it and must rethrow rather than
 * treat it as a failure (Next.js `redirect()` API reference: "should be
 * called outside the try block" — this is the client-side equivalent when
 * the call itself, not just `redirect()`, is inside a `try`).
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
