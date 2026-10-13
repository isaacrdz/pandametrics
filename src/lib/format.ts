const LOCALE = "es-MX";

const numberFormat = new Intl.NumberFormat(LOCALE);

const percentFormat = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 0,
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatPercent(share: number): string {
  return percentFormat.format(share);
}

export function formatResponses(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? "respuesta" : "respuestas"}`;
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "full" }).format(date);
}

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
