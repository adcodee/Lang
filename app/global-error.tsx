"use client";

import { useEffect } from "react";

// Catches errors in the root layout itself. Same chunk-error auto-recovery as
// app/error.tsx; must render its own <html>/<body>.
export default function GlobalError({
  error,
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
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "3rem" }}>🥋</div>
        <h1>{isChunkError ? "Refreshing…" : "Something went wrong"}</h1>
        <p>The app just updated — reloading to the latest version.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "1rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "1rem",
            border: "none",
            background: "#4a7043",
            color: "white",
            fontWeight: "bold",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
