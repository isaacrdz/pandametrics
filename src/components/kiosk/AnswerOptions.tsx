"use client";

import { CheckIcon, StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { ReactionFace } from "@/components/surveys/ReactionFace";
import { cn } from "@/lib/utils";
import type { PublicAnswerOption } from "@/lib/surveys/public";
import type { ReactionValue } from "@/types/survey";

interface AnswerOptionsProps {
  options: PublicAnswerOption[];
  selectedId: string | undefined;
  onSelect: (optionId: string) => void;
  // id of the question h1, which names the radio group
  labelledBy: string;
}

interface RadioGroupProps extends AnswerOptionsProps {
  className?: string;
  renderOption: (option: PublicAnswerOption, index: number, state: { selected: boolean }) => {
    label: string;
    className?: string;
    content: ReactNode;
    onPreview?: (active: boolean) => void;
  };
}

// One radio group per question: Tab enters on the chosen option (or the first), ← / → move and
// select inside the group. ↑ / ↓ stay free for the previous / next question
function RadioGroup({ options, selectedId, onSelect, labelledBy, className, renderOption }: RadioGroupProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.id === selectedId);
  const tabIndexTarget = selectedIndex === -1 ? 0 : selectedIndex;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + step + options.length) % options.length;
    onSelect(options[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={className}>
      {options.map((option, index) => {
        const selected = option.id === selectedId;
        const rendered = renderOption(option, index, { selected });
        return (
          <button
            key={option.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={rendered.label}
            tabIndex={index === tabIndexTarget ? 0 : -1}
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onMouseEnter={() => rendered.onPreview?.(true)}
            onMouseLeave={() => rendered.onPreview?.(false)}
            onFocus={() => rendered.onPreview?.(true)}
            onBlur={() => rendered.onPreview?.(false)}
            className={cn(
              "group/option outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
              rendered.className,
            )}
          >
            {rendered.content}
          </button>
        );
      })}
    </div>
  );
}

const ROW_CLASS = "grid w-full max-w-3xl grid-cols-5 gap-2 sm:gap-6";
const ROW_OPTION_CLASS =
  "flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-2xl sm:gap-3 [@media(max-height:520px)]:gap-1";
const ROW_LABEL_CLASS =
  "w-full text-center text-xs font-semibold break-words text-foreground sm:text-base [@media(max-height:520px)]:text-sm";

// Satisfaction: the five faces from Very bad to Excellent (the order of keys 1–5)
export function FaceOptions(props: AnswerOptionsProps) {
  return (
    <RadioGroup
      {...props}
      className={ROW_CLASS}
      renderOption={(option, _index, { selected }) => ({
        label: option.label,
        className: ROW_OPTION_CLASS,
        content: (
          <>
            <ReactionFace
              value={option.value as ReactionValue}
              color={option.color}
              size="lg"
              selected={selected}
              className="transition-transform duration-200 group-hover/option:scale-105 motion-reduce:transition-none [@media(max-height:520px)]:max-w-20"
            />
            <span className={ROW_LABEL_CLASS}>{option.label}</span>
          </>
        ),
      })}
    />
  );
}

// Rating: five stars; hovering or focusing one previews the fill up to it
export function StarOptions(props: AnswerOptionsProps) {
  const t = useTranslations("ratings");
  const [preview, setPreview] = useState<number | null>(null);
  const selectedIndex = props.options.findIndex((option) => option.id === props.selectedId);
  const filledUpTo = preview ?? selectedIndex;

  return (
    <RadioGroup
      {...props}
      className={ROW_CLASS}
      renderOption={(option, index, { selected }) => ({
        label: t("label", { value: Number(option.value) }),
        className: ROW_OPTION_CLASS,
        onPreview: (active) => setPreview((current) => (active ? index : current === index ? null : current)),
        content: (
          <>
            <span className="relative flex aspect-square w-full max-w-31 items-center justify-center [@media(max-height:520px)]:max-w-20">
              <StarIcon
                aria-hidden
                strokeWidth={1.5}
                className={cn(
                  "size-[85%] transition-[color,transform] duration-200 motion-reduce:transition-none",
                  index <= filledUpTo ? "fill-star text-star" : "fill-star-empty/40 text-star-empty",
                  "group-hover/option:scale-105",
                )}
              />
              {selected && <CheckBadge className="bg-star" />}
            </span>
            <span className={ROW_LABEL_CLASS}>{option.value}</span>
          </>
        ),
      })}
    />
  );
}

// Poll: text cards in the owner's order, with the key number in the corner
export function PollOptions(props: AnswerOptionsProps) {
  return (
    <RadioGroup
      {...props}
      className="flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4"
      renderOption={(option, index, { selected }) => ({
        label: option.label,
        className: cn(
          "relative flex h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-card px-5 text-left shadow-xs transition-colors",
          "sm:h-auto sm:min-h-28 sm:w-60 sm:justify-center sm:px-6 sm:py-8 sm:text-center",
          "hover:border-primary/50 [@media(max-height:520px)]:sm:min-h-20 [@media(max-height:520px)]:sm:py-4",
          selected && "border-primary bg-accent ring-2 ring-primary/30",
        ),
        content: (
          <>
            <span className="min-w-0 text-base font-semibold text-foreground sm:text-lg">{option.label}</span>
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground sm:absolute sm:top-3 sm:left-3"
            >
              {index + 1}
            </span>
            {selected && <CheckBadge className="bg-primary text-primary-foreground" />}
          </>
        ),
      })}
    />
  );
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full text-white ring-2 ring-background",
        className,
      )}
    >
      <CheckIcon className="size-3.5" strokeWidth={3} />
    </span>
  );
}
