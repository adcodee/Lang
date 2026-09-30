"use client";

import { useState, type ReactNode } from "react";

// Course art lives at /art/ja/{id}.png. JPEGs misnamed .png still load.
// onError falls back so missing LOCKED files (node-learn, node-checkpoint, …)
// keep the old emoji/type instead of a broken image.
export default function JaArt({
  id,
  className,
  fallback,
  alt = "",
  onClick,
}: {
  id: string;
  className?: string;
  fallback?: ReactNode;
  // Decorative by default. Set it where the image carries teaching the page
  // does not otherwise state — the recap panels do.
  alt?: string;
  onClick?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/art/ja/${id}.png`}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setFailed(true)}
    />
  );
}
