"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/telemetry";
import "@/styles/valentine.css";

// Replaces the root layout when it fails, so it brings its own <html> and styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error, "boundary"), [error]);

  return (
    <html lang="en">
      <body>
        <main className="notice">
          <h1>The light flickered</h1>
          <p>Something went wrong while drawing the heart.</p>
          <button className="send" type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
