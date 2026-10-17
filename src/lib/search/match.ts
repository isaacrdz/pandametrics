// Client-side matching for the command palette's pages and actions, and the highlight of the
// matched part of a survey name. Accents and case never matter ("configuracion" finds
// "Configuración"), like the SQL search behind the surveys and people results.

// One character without its accents, lowercased (may be empty for a lone combining mark)
function foldChar(character: string): string {
  return character.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Accents removed, lowercased, spaces collapsed and trimmed
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function startsAWord(text: string, word: string): boolean {
  return text.startsWith(word) || text.includes(` ${word}`);
}

// How well one query word matches: start of the label, start of one of its words, anywhere in it,
// or the start of a word in one of the keywords (aliases in both languages)
function wordScore(label: string, keywords: string[], word: string): number {
  if (label.startsWith(word)) return 3;
  if (startsAWord(label, word)) return 2;
  if (label.includes(word)) return 1;
  if (keywords.some((keyword) => startsAWord(keyword, word))) return 1;
  return 0;
}

// 0 when it does not match; otherwise higher is better. Every word of the query has to match the
// label or a keyword, and a label that starts with the whole query gets a bonus. A blank query
// matches everything equally
export function matchScore(label: string, query: string, keywords: readonly string[] = []): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 1;

  const normalizedLabel = normalize(label);
  const normalizedKeywords = keywords.map(normalize);
  let score = 0;
  for (const word of normalizedQuery.split(" ")) {
    const points = wordScore(normalizedLabel, normalizedKeywords, word);
    if (points === 0) return 0;
    score += points;
  }
  return normalizedLabel.startsWith(normalizedQuery) ? score + 2 : score;
}

export interface HighlightParts {
  before: string;
  match: string;
  after: string;
}

// The first part of `text` that matches `query`, ignoring accents and case, split so the match can
// be highlighted with the original characters ("Satisfacción" stays accented). null without a match
export function highlightMatch(text: string, query: string): HighlightParts | null {
  const needle = normalize(query);
  if (!needle) return null;

  // The folded text, and for each of its characters the index of the original character it came from
  let folded = "";
  const origin: number[] = [];
  Array.from(text).reduce((offset, character) => {
    // One entry per UTF-16 unit, since indexOf counts units (an emoji takes two)
    const piece = foldChar(character);
    folded += piece;
    for (let unit = 0; unit < piece.length; unit++) origin.push(offset);
    return offset + character.length;
  }, 0);

  const start = folded.replace(/\s/g, " ").indexOf(needle);
  if (start === -1) return null;
  const from = origin[start];
  const lastOrigin = origin[start + needle.length - 1];
  // The end of the last original character in the match (a surrogate pair takes two), plus any
  // combining marks after it, so a decomposed "é" is never split from its accent
  let to = lastOrigin + Array.from(text.slice(lastOrigin))[0].length;
  while (to < text.length && /\p{M}/u.test(text[to])) to += 1;
  return { before: text.slice(0, from), match: text.slice(from, to), after: text.slice(to) };
}
