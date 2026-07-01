"use client";

import { useEffect } from "react";

// Route-level error boundary. The most common failure in production is a
// ChunkLoadError right after a new deploy (the loaded page references chunk
// hashes that were just replaced) — a reload fetches the fresh manifest and
// fixes it. We auto-reload once for those, and otherwise offer a retry.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    /ChunkLoadError|Loading chunk|Loading CSS chunk/i.test(error?.message ?? "");

  useEffect(() => {
    if (isChunkError && typeof window !== "undefined") {
      const key = "lang-chunk-reloaded";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [isChunkError]);

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <div className="text-5xl">🥋</div>
      <h1 className="mt-4 text-xl font-extrabold text-ink">
        {isChunkError ? "Refreshing to the latest version…" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {isChunkError
          ? "The app just updated. Reloading to get the new version."
          : "Give it another go — your progress is saved."}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn-brand" onClick={() => window.location.reload()}>
          Reload
        </button>
        <button className="btn-ghost" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
