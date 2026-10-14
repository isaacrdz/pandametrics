import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { ReactionValue } from "@/types/survey";

// Mouth (and brows for VERY_BAD) per reaction, in a 48x48 viewBox
const FACE_PATHS: Record<ReactionValue, string[]> = {
  VERY_BAD: ["M13 13 L20 17", "M35 13 L28 17", "M16 34 Q24 26 32 34"],
  BAD: ["M17 33 Q24 28 31 33"],
  GOOD: ["M17 31 H31"],
  VERY_GOOD: ["M17 29 Q24 35 31 29"],
  INCREDIBLE: ["M15 27 Q24 38 33 27"],
};

const SIZE_CLASSES = {
  // Row icon in the dashboard option list
  sm: "size-7 border",
  md: "size-12 border-2 shadow-[0_8px_24px_-10px_var(--face-color)] sm:size-16",
};

interface ReactionFaceProps {
  value: ReactionValue;
  color: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function ReactionFace({ value, color, size = "md", className }: ReactionFaceProps) {
  return (
    <span
      aria-hidden
      style={{ "--face-color": color } as CSSProperties}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-(--face-color)/45 bg-(--face-color)/12 text-(--face-color)",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <svg viewBox="0 0 48 48" className="size-3/5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <circle cx="17" cy="20" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="31" cy="20" r="2.5" fill="currentColor" stroke="none" />
        {FACE_PATHS[value].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
