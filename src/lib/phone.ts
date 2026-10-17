// Phone numbers: Mexico and the United States / Canada get a country picker and are formatted as
// they are typed; any other country is typed in full with its "+" code. Stored as E.164
// ("+525512345678", "+14155550134"), so search by digits keeps working. No library: two plans.

export type PhoneCountry = "MX" | "US" | "OTHER";
export type NationalCountry = Exclude<PhoneCountry, "OTHER">;

export const DIAL_CODES: Record<NationalCountry, string> = { MX: "52", US: "1" };

// Both plans are 10 digits since Mexico's 2019 change
export const NATIONAL_DIGITS = 10;

// Mexico City (55, 56), Guadalajara (33) and Monterrey (81) have 2-digit area codes; the rest 3
const MX_TWO_DIGIT_AREAS = new Set(["55", "56", "33", "81"]);

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

// Groups as many digits as there are, so it also formats a number being typed:
// MX "55 1234 5678" / "222 123 4567"; US "(415) 555-0134" (no parenthesis before the 4th digit)
export function formatNational(country: NationalCountry, digits: string): string {
  const d = digits.slice(0, NATIONAL_DIGITS);
  if (country === "US") {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  const area = MX_TWO_DIGIT_AREAS.has(d.slice(0, 2)) ? 2 : 3;
  const middle = area === 2 ? 4 : 3;
  return [d.slice(0, area), d.slice(area, area + middle), d.slice(area + middle)].filter(Boolean).join(" ");
}

// What the field holds: "+52 55 1234 5678", "+1 (415) 555-0134", or the text typed for another
// country; empty without digits, so the optional field stays empty
export function composePhone(country: PhoneCountry, national: string): string {
  if (country === "OTHER") return national;
  const digits = digitsOf(national);
  return digits ? `+${DIAL_CODES[country]} ${formatNational(country, digits)}` : "";
}

// Text typed or pasted into the number box, for the selected country. A full international number
// ("+1 415…", "+52 1 55…", "52 55…" with 12 digits) switches to its country; Mexico's old mobile "1"
// after +52 is dropped. Mexico and the US keep at most 10 digits
export function readPhoneInput(country: PhoneCountry, text: string): { country: PhoneCountry; national: string } {
  const trimmed = text.trim();
  let digits = digitsOf(trimmed);

  if (trimmed.startsWith("+")) {
    if (digits.startsWith("52")) return readPhoneInput("MX", digits.slice(2).replace(/^1(?=\d{10}$)/, ""));
    if (digits.startsWith("1")) return readPhoneInput("US", digits.slice(1));
    // As typed, spaces included (trimming would eat each space as it is typed)
    return { country: "OTHER", national: text.trimStart() };
  }
  if (country === "OTHER") return { country, national: text };

  if (country === "MX") {
    if (digits.length === 13 && digits.startsWith("521")) digits = digits.slice(3);
    else if (digits.length === 12 && digits.startsWith("52")) digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  // Neither plan has numbers starting with 0 or 1: those are prefixes (Mexico's old "1" for mobiles
  // and "01" long distance, the US "1"), dropped even when typed one key at a time
  digits = digits.replace(/^[01]+/, "");
  return { country, national: digits.slice(0, NATIONAL_DIGITS) };
}

// A stored or typed value split for the picker and the box. Empty → the default country. A bare
// 10-digit number (saved before country codes were required) counts as Mexican
export function splitPhone(value: string, fallback: NationalCountry = "MX"): { country: PhoneCountry; national: string } {
  const trimmed = value.trim();
  if (!trimmed) return { country: fallback, national: "" };
  if (!trimmed.startsWith("+") && digitsOf(trimmed).length === NATIONAL_DIGITS) return { country: "MX", national: digitsOf(trimmed) };
  // Another country's number keeps a trailing space: it is the field's text while typing
  return readPhoneInput("OTHER", trimmed.startsWith("+") ? value.trimStart() : `+${trimmed}`);
}

export type PhoneError = "invalidPhoneMx" | "invalidPhoneUs" | "invalidPhone";

// Validates what the field holds and returns E.164, or the message key of the problem
export function parsePhone(value: string): { ok: true; phone: string } | { ok: false; error: PhoneError } {
  const { country, national } = splitPhone(value);
  if (country === "MX") {
    const digits = digitsOf(national);
    return digits.length === NATIONAL_DIGITS ? { ok: true, phone: `+52${digits}` } : { ok: false, error: "invalidPhoneMx" };
  }
  if (country === "US") {
    const digits = digitsOf(national);
    // North American area codes and exchanges never start with 0 or 1
    return digits.length === NATIONAL_DIGITS && /^[2-9]\d{2}[2-9]/.test(digits)
      ? { ok: true, phone: `+1${digits}` }
      : { ok: false, error: "invalidPhoneUs" };
  }
  const digits = digitsOf(national);
  const valid = /^\+[\d\s().-]+$/.test(national.trim()) && digits.length >= 7 && digits.length <= 15;
  return valid ? { ok: true, phone: `+${digits}` } : { ok: false, error: "invalidPhone" };
}

// For lists and tables: Mexico and the US formatted, anything else as stored
export function formatPhone(stored: string): string {
  const { country, national } = splitPhone(stored);
  if (country !== "OTHER" && digitsOf(national).length === NATIONAL_DIGITS) return composePhone(country, national);
  return stored;
}
