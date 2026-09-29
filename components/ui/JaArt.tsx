"use client";

import { useState, type ReactNode } from "react";

// Course art lives at /art/ja/{id}.png. JPEGs misnamed .png still load.
// onError falls back so missing LOCKED files (node-learn, node-checkpoint, …)
// keep the old emoji/type instead of a broken image.
export default function JaArt({
  id,
  className,
  fallback,
}: {
  id: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/art/ja/${id}.png`}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
