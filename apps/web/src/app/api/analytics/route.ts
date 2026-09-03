import { NextResponse } from "next/server";

import {
  parseProductAnalyticsEventContext,
  parseProductAnalyticsEventName,
} from "@oiw/application";

import { getOrCreateAnalyticsSessionId } from "@/lib/server/analytics-session";
import {
  activeAnalyticsWorkspace,
  recordProductAnalyticsEvent,
} from "@/lib/server/product-analytics";
import { enforceGuestRateLimit, GuestRateLimitError } from "@/lib/server/rate-limit";

const MAX_BODY_BYTES = 4_096;

export async function POST(request: Request): Promise<Response> {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    const raw = JSON.parse(text) as Record<string, unknown>;
    const allowedKeys = new Set(["id", "name", "context"]);
    if (Object.keys(raw).some((key) => !allowedKeys.has(key))) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const id = typeof raw["id"] === "string" ? raw["id"] : undefined;
    const name = parseProductAnalyticsEventName(raw["name"]);
    const context = parseProductAnalyticsEventContext(raw["context"]);
    const [workspace, sessionId] = await Promise.all([
      activeAnalyticsWorkspace(),
      getOrCreateAnalyticsSessionId(),
    ]);
    await enforceGuestRateLimit("analytics", workspace ?? undefined, 1, sessionId);
    await recordProductAnalyticsEvent({
      ...(id === undefined ? {} : { id }),
      workspace,
      sessionId,
      name,
      context,
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    if (error instanceof GuestRateLimitError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
