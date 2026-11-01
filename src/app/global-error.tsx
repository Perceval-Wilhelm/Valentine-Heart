"use client";

import { useEffect } from "react";
import { valentine } from "@/content/valentine";
import { reportClientError } from "@/lib/telemetry";
import "@/styles/valentine.css";

// Replaces the root layout when it fails, so it brings its own <html> and styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error, "boundary"), [error]);
  const { title, body, retry } = valentine.failure;

  return (
    <html lang={valentine.lang}>
      <body>
        <main className="notice">
          <h1>{title}</h1>
          <p>{body}</p>
          <button className="send" type="button" onClick={reset}>
            {retry}
          </button>
        </main>
      </body>
    </html>
  );
}
