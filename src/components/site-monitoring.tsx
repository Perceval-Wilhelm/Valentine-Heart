"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { prepareMonitoringEvent } from "@/lib/monitoring";

export function SiteMonitoring({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <>
      <Analytics debug={false} beforeSend={prepareMonitoringEvent} />
      <SpeedInsights debug={false} beforeSend={prepareMonitoringEvent} />
    </>
  );
}
