// Locale-independent helpers. Numbers, percentages and dates go through next-intl's useFormatter.

export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
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
