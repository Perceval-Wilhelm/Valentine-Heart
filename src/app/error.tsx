"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/telemetry";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error, "boundary"), [error]);

  return (
    <main className="notice">
      <h1>The light flickered</h1>
      <p>Something went wrong while drawing the heart.</p>
      <button className="send" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
