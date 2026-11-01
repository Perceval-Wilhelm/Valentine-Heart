"use client";

import { useEffect } from "react";
import { valentine } from "@/content/valentine";
import { reportClientError } from "@/lib/telemetry";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error, "boundary"), [error]);
  const { title, body, retry } = valentine.failure;

  return (
    <main className="notice">
      <h1>{title}</h1>
      <p>{body}</p>
      <button className="send" type="button" onClick={reset}>
        {retry}
      </button>
    </main>
  );
}
