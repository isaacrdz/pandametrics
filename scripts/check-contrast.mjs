// Fails when a theme token pair is below WCAG AA: 4.5:1 for text, 3:1 for UI (focus rings).
// Reads the values straight from src/app/globals.css (:root and .dark). Run with `yarn lint`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CSS_PATH = fileURLToPath(new URL("../src/app/globals.css", import.meta.url));

const TEXT = 4.5;
const UI = 3;

// [foreground token, background token, minimum ratio, what it is]
const PAIRS = [
  ["foreground", "background", TEXT, "body text"],
  ["card-foreground", "card", TEXT, "card text"],
  ["muted-foreground", "background", TEXT, "muted text on the page"],
  ["muted-foreground", "card", TEXT, "muted text on cards"],
  ["muted-foreground", "muted", TEXT, "muted text on muted surfaces"],
  ["secondary-foreground", "secondary", TEXT, "secondary buttons"],
  ["primary-foreground", "primary", TEXT, "primary buttons"],
  ["primary", "background", TEXT, "pink text on the page"],
  ["primary", "card", TEXT, "pink text on cards"],
  ["primary", "accent", TEXT, "pink text on accent tints (poll counts)"],
  ["accent-foreground", "accent", TEXT, "accent text (active nav, tiles)"],
  ["highlight-foreground", "highlight", TEXT, "highlight card"],
  ["inverse-foreground", "inverse", TEXT, "dark CTA banner"],
  ["brand", "inverse", TEXT, "pink eyebrow on the dark CTA banner"],
  ["primary", "card", TEXT, "card-colored buttons with pink text"],
  ["sidebar-foreground", "sidebar", TEXT, "sidebar items"],
  ["sidebar-accent-foreground", "sidebar-accent", TEXT, "active sidebar item"],
  ["success-foreground", "card", TEXT, "success text"],
  ["destructive", "card", TEXT, "destructive text"],
  ["ring", "background", UI, "focus ring on the page"],
  ["ring", "card", UI, "focus ring on cards"],
  ["brand", "inverse", UI, "focus ring on the dark CTA banner"],
  ["control-border", "card", UI, "checkbox border on cards"],
  ["control-border", "background", UI, "checkbox border on the page"],
];

function readBlock(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing ${selector} block in globals.css`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

function resolve(tokens, name, seen = new Set()) {
  const value = tokens[name];
  if (value === undefined) throw new Error(`Unknown token --${name}`);
  const ref = value.match(/^var\(--([\w-]+)\)$/);
  if (!ref) return value;
  if (seen.has(name)) throw new Error(`Circular token --${name}`);
  return resolve(tokens, ref[1], seen.add(name));
}

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const css = readFileSync(CSS_PATH, "utf8");
const light = readBlock(css, ":root");
const themes = { light, dark: { ...light, ...readBlock(css, ".dark") } };
let failures = 0;

for (const [theme, tokens] of Object.entries(themes)) {
  for (const [fg, bg, min, label] of PAIRS) {
    const a = resolve(tokens, fg);
    const b = resolve(tokens, bg);
    if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) {
      throw new Error(`${theme}: --${fg} / --${bg} must be 6-digit hex to be checked (${a} / ${b})`);
    }
    const value = ratio(a, b);
    if (value < min) {
      failures++;
      console.error(`${theme}: ${label} --${fg} ${a} on --${bg} ${b} is ${value.toFixed(2)}:1, needs ${min}:1`);
    }
  }
}

if (failures > 0) process.exit(1);
console.log(`Contrast OK: ${PAIRS.length} pairs in light and dark`);
