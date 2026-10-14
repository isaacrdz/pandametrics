"use client";

import { useMemo } from "react";
import { create } from "qrcode";

const MARGIN = 2;

interface QrCodeProps {
  value: string;
  label: string;
  className?: string;
}

// QRCode.create is synchronous: the modules are drawn as one SVG path, no effect or state
export function QrCode({ value, label, className }: QrCodeProps) {
  const { size, path } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: "M" });
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.data[row * modules.size + col]) d += `M${col + MARGIN} ${row + MARGIN}h1v1h-1z`;
      }
    }
    return { size: modules.size + MARGIN * 2, path: d };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#111111" />
    </svg>
  );
}
