"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type ComponentProps } from "react";
import { GlobeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FLAG_FRAME_CLASS, MexicoFlag, UnitedStatesFlag } from "@/components/layout/LanguageFlag";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  composePhone,
  DIAL_CODES,
  formatNational,
  readPhoneInput,
  splitPhone,
  type PhoneCountry,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

const COUNTRIES: PhoneCountry[] = ["MX", "US", "OTHER"];

function CountryMark({ country }: { country: PhoneCountry }) {
  if (country === "OTHER") return <GlobeIcon aria-hidden className="size-4 text-muted-foreground" />;
  const Flag = country === "MX" ? MexicoFlag : UnitedStatesFlag;
  return (
    <span aria-hidden className={FLAG_FRAME_CLASS}>
      <Flag />
    </span>
  );
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

// Where the caret goes in the formatted text: right after its count-th digit
function caretAfterDigits(text: string, count: number): number {
  if (count === 0) return text.search(/\d/) === -1 ? text.length : text.search(/\d/);
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text[index]) && ++seen === count) return index + 1;
  }
  return text.length;
}

interface PhoneInputProps extends Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "defaultValue"> {
  // The full number: "+52 55 1234 5678", "+1 (415) 555-0134", another country's "+44 …", or ""
  value: string;
  onChange: (value: string) => void;
  // Classes for both the picker and the box (height, radius, background)
  controlClassName?: string;
}

// A country picker (Mexico, United States / Canada, other) and the number, formatted as it is typed.
// The form gets one string; the schema validates it per country and stores E.164
export function PhoneInput({ value, onChange, controlClassName, className, disabled, ref, ...props }: PhoneInputProps) {
  const t = useTranslations("form.phone");
  const inputRef = useRef<HTMLInputElement>(null);
  // The picker follows the value; while the box is empty it keeps the last choice
  const [chosen, setChosen] = useState<PhoneCountry>(() => splitPhone(value).country);
  const parts = value ? splitPhone(value) : null;
  const country = parts?.country ?? chosen;
  const shown = country === "OTHER" ? (parts?.national ?? "") : formatNational(country, digitsOf(parts?.national ?? ""));
  // After a reformat, the caret goes back next to the digit it was after
  const pendingCaret = useRef<number | null>(null);
  // A country was picked: the menu closes onto the number, not back onto the picker
  const focusNumberOnClose = useRef(false);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current === null || !input || document.activeElement !== input) return;
    const position = caretAfterDigits(input.value, pendingCaret.current);
    input.setSelectionRange(position, position);
    pendingCaret.current = null;
  });

  function commit(next: { country: PhoneCountry; national: string }) {
    setChosen(next.country);
    onChange(composePhone(next.country, next.national));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    // A full international number (typed "+" or pasted) picks its country
    if (country === "OTHER" || text.trimStart().startsWith("+")) {
      commit(readPhoneInput(country, text));
      return;
    }

    const caret = event.target.selectionStart ?? text.length;
    let digits = digitsOf(text);
    let before = digitsOf(text.slice(0, caret)).length;
    // Backspace over a space, parenthesis or dash: delete the digit before it instead
    if (text.length < shown.length && digits === digitsOf(shown) && before > 0) {
      digits = digits.slice(0, before - 1) + digits.slice(before);
      before -= 1;
    }
    const next = readPhoneInput(country, digits);
    // Pasted with the country code ("52…", "1…"): the code is dropped, so the caret goes to the end
    pendingCaret.current = next.national.length < digits.length ? next.national.length : Math.min(before, next.national.length);
    commit(next);
  }

  function handleCountry(next: string) {
    const picked = next as PhoneCountry;
    setChosen(picked);
    // Mexico ↔ US keep the digits; another country is typed in full, code included, so it starts empty
    onChange(picked === "OTHER" || country === "OTHER" ? "" : composePhone(picked, parts?.national ?? ""));
    focusNumberOnClose.current = true;
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={country} onValueChange={handleCountry} disabled={disabled}>
        {/* Stretched to the box's height (the trigger's own size rule beats a plain h-*), and one
            width for every code, so the box doesn't move when the country changes */}
        <SelectTrigger
          aria-label={t("country")}
          className={cn(
            "shrink-0 gap-2 border-input",
            controlClassName,
            "w-28 justify-between self-stretch px-3 data-[size=default]:h-auto",
          )}
        >
          <span className="flex items-center gap-2">
            <CountryMark country={country} />
            <span className="tabular-nums">{country === "OTHER" ? "+" : `+${DIAL_CODES[country]}`}</span>
          </span>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          onCloseAutoFocus={(event) => {
            if (!focusNumberOnClose.current) return;
            focusNumberOnClose.current = false;
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          {COUNTRIES.map((option) => (
            <SelectItem key={option} value={option} className="py-2">
              <CountryMark country={option} />
              <span>{t(`countries.${option}`)}</span>
              {option !== "OTHER" && <span className="text-muted-foreground tabular-nums">{`+${DIAL_CODES[option]}`}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        {...props}
        ref={(element) => {
          inputRef.current = element;
          // The form's ref too (react-hook-form focuses the field on errors)
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        type="tel"
        inputMode="tel"
        autoComplete={country === "OTHER" ? "tel" : "tel-national"}
        disabled={disabled}
        value={shown}
        onChange={handleChange}
        placeholder={t(`placeholders.${country}`)}
        className={cn("min-w-0 flex-1 tabular-nums", controlClassName)}
      />
    </div>
  );
}
