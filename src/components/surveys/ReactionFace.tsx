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

interface ReactionFaceProps {
  value: ReactionValue;
  color: string;
  className?: string;
}

export function ReactionFace({ value, color, className }: ReactionFaceProps) {
  return (
    <span
      aria-hidden
      style={{ "--face-color": color } as CSSProperties}
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-(--face-color)/45 bg-(--face-color)/12 text-(--face-color) shadow-[0_8px_24px_-10px_var(--face-color)] sm:size-16",
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
