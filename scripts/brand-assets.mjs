// Generates the brand assets from the logo source. Run once and commit the outputs:
//
//   node scripts/brand-assets.mjs
//
// Source: design/logo-source.png (5504×3072, ~9 MB, losslessly recompressed from the original
// 14.7 MB export, identical pixels). It lives outside src/ so it is never
// imported or shipped. Crops and sizes are documented in docs/landing.md section 4.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

const SOURCE = root("design/logo-source.png");

// Square crop of the panda head on pink (app icons and logo tile)
const HEAD = { left: 1844, top: 154, width: 1816, height: 1816 };

// Panda with hood and paws, cut just above the "PANDA" letters (hero illustration)
const HERO = { left: 1706, top: 92, width: 2092, height: 1813 };

const OG_ALT = "Panda Metrics logo: a panda in a hoodie on a pink background";

const ASSETS = [
  { file: "src/app/icon.png", build: (img) => img.extract(HEAD).resize(512, 512).png({ compressionLevel: 9, palette: true }) },
  { file: "src/app/apple-icon.png", build: (img) => img.extract(HEAD).resize(180, 180).png({ compressionLevel: 9, palette: true }) },
  { file: "src/assets/brand/logo-icon.webp", build: (img) => img.extract(HEAD).resize(128, 128).webp({ quality: 88 }) },
  { file: "src/assets/brand/panda-hero.webp", build: (img) => img.extract(HERO).resize({ width: 1200 }).webp({ quality: 82 }) },
  { file: "src/app/opengraph-image.png", build: (img) => img.resize(1200, 630, { fit: "cover" }).png({ compressionLevel: 9, palette: true }) },
  { file: "src/app/twitter-image.png", build: (img) => img.resize(1200, 630, { fit: "cover" }).png({ compressionLevel: 9, palette: true }) },
];

for (const { file, build } of ASSETS) {
  const output = root(file);
  mkdirSync(dirname(output), { recursive: true });
  const info = await build(sharp(SOURCE)).toFile(output);
  console.log(`${file.padEnd(36)} ${info.width}×${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}

for (const file of ["src/app/opengraph-image.alt.txt", "src/app/twitter-image.alt.txt"]) {
  // No trailing newline: Next uses the file content verbatim as og:image:alt
  writeFileSync(root(file), OG_ALT);
}
