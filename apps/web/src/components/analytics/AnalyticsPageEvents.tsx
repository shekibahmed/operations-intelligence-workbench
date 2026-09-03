"use client";

import { useEffect, useRef } from "react";
import type {
  ProductAnalyticsEventContext,
  ProductAnalyticsEventName,
} from "@oiw/application";

import { emitProductAnalyticsEvent } from "@/lib/product-analytics";

export interface AnalyticsPageEventDefinition {
  name: ProductAnalyticsEventName;
  context?: ProductAnalyticsEventContext | undefined;
}

export function AnalyticsPageEvents({ events }: { events: AnalyticsPageEventDefinition[] }) {
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    for (const event of events) void emitProductAnalyticsEvent(event.name, event.context);
  }, [events]);

  return null;
}
