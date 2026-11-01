type MonitoringEvent = { type: string; url: string };

export function prepareMonitoringEvent<T extends MonitoringEvent>(event: T): T | null {
  // Hobby uses page views and performance only; never forward custom events.
  if (event.type !== "pageview" && event.type !== "vital") return null;

  try {
    const url = new URL(event.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
