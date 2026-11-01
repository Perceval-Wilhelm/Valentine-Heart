"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/telemetry";

export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportClientError(event.error ?? event.message, "window");
    const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason, "promise");
    addEventListener("error", onError);
    addEventListener("unhandledrejection", onRejection);
    return () => {
      removeEventListener("error", onError);
      removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
