// Locale-independent helpers. Numbers, percentages and dates go through next-intl's useFormatter.

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
// A word starts at its first letter, number or emoji: punctuation around it ("(Ana)", "- López") is skipped
const WORD_START = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

// The whole first character as the eye sees it: "Á" from a decomposed "Ángel", an emoji with its
// skin tone or joiners, never half of a surrogate pair
function firstCharacter(word: string): string | null {
  const start = word.search(WORD_START);
  if (start === -1) return null;
  const [first] = graphemes.segment(word.slice(start));
  return first.segment.normalize("NFC").toUpperCase();
}

function initialsOf(words: string[]): string {
  return words
    .map(firstCharacter)
    .filter((character) => character !== null)
    .slice(0, 2)
    .join("");
}

// Avatar letters: the first two words of the name, otherwise the email's local part split on
// . _ - ("ana.lopez@…" → "AL"; "+tags" ignored), and "?" when neither has a letter
export function getInitials(name: string | null, email?: string | null): string {
  const fromName = name ? initialsOf(name.split(/\s+/)) : "";
  if (fromName) return fromName;

  const local = email?.split("@")[0].split("+")[0] ?? "";
  return initialsOf(local.split(/[._-]+/)) || "?";
}

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Calendar days between `date` and `now` in a timezone: 0 = same day, 1 = yesterday.
// en-CA formats as YYYY-MM-DD, so the parts are numeric in every locale.
const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();

function dayNumber(date: Date, timeZone: string): number {
  let formatter = dayKeyFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    dayKeyFormatters.set(timeZone, formatter);
  }
  const [year, month, day] = formatter.format(date).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function getDayOffset(date: Date, now: Date, timeZone: string): number {
  return dayNumber(now, timeZone) - dayNumber(date, timeZone);
}
