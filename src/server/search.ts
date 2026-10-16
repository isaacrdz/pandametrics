import "server-only";

// Helpers for the accent- and case-insensitive table searches in SQL (users here, surveys in
// phase 3). The query text always travels as a bound parameter; these only build the LIKE
// pattern, escaping the characters LIKE treats as wildcards so they match literally.

// Used with `ESCAPE '\'` in the SQL
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

// "%<escaped query>%"; lowercasing and f_unaccent() are applied to it in SQL, like to the column
export function containsPattern(value: string): string {
  return `%${escapeLike(value.trim())}%`;
}

// Phone search compares digits only, so "+52 55 1234" finds "+525512345678"
export function digitsPattern(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits ? `%${digits}%` : null;
}
