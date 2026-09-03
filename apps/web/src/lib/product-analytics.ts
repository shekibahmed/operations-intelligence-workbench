import type {
  ProductAnalyticsEventContext,
  ProductAnalyticsEventName,
} from "@oiw/application";

export async function emitProductAnalyticsEvent(
  name: ProductAnalyticsEventName,
  context: ProductAnalyticsEventContext = {},
): Promise<void> {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        id: globalThis.crypto.randomUUID(),
        name,
        context: { ...context, path: window.location.pathname },
      }),
    });
  } catch {
    // Product analytics is deliberately best-effort and never blocks the UI.
  }
}
