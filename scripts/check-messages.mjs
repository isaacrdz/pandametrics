// Fails when the message files do not have exactly the same keys.
// Run with `yarn lint`. Plain JavaScript so it works on any supported Node version.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MESSAGES_DIR = new URL("../src/messages/", import.meta.url);
const LOCALES = ["en", "es"];

function flattenKeys(value, prefix = "") {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function loadKeys(locale) {
  const path = fileURLToPath(new URL(`${locale}.json`, MESSAGES_DIR));
  return new Set(flattenKeys(JSON.parse(readFileSync(path, "utf8"))));
}

const [reference, ...others] = LOCALES;
const referenceKeys = loadKeys(reference);
let failed = false;

for (const locale of others) {
  const keys = loadKeys(locale);
  const missing = [...referenceKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !referenceKeys.has(key));

  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    if (missing.length > 0) console.error(`${locale}.json is missing: ${missing.join(", ")}`);
    if (extra.length > 0) console.error(`${locale}.json has extra keys: ${extra.join(", ")}`);
  }
}

if (failed) process.exit(1);
console.log(`Messages OK: ${referenceKeys.size} keys in ${LOCALES.join(", ")}`);
