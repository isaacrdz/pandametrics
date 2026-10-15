// Generates the brand assets from the logo sources. Run once and commit the outputs:
//
//   node scripts/brand-assets.mjs
//
// Icons: design/logo.svg (the vector panda, transparent, 1875×2048 drawing area) is
// optimized with SVGO into a square SVG for the Logo component and the favicon, and
// rendered to the PNG icons. See docs/logo-and-surfaces.md section 2.
//
// Hero and Open Graph images: design/logo-source.png (5504×3072, ~9 MB, losslessly recompressed from the original
// 14.7 MB export, identical pixels). It lives outside src/ so it is never
// imported or shipped. Crops and sizes are documented in docs/landing.md section 4.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { optimize } from "svgo";

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

const SOURCE = root("design/logo-source.png");
const VECTOR_SOURCE = root("design/logo.svg");

// Square box around the panda (drawing spans x 88–1810, y 79–1968) with a small margin,
// so the icon is square and never stretched
const SQUARE_VIEW_BOX = "-35 40 1968 1968";

// Brand pink behind the panda on the iOS home screen icon (iOS fills transparency with black)
const APPLE_ICON = { size: 180, padding: 22, background: "#db8396" };

// Panda with hood and paws, cut just above the "PANDA" letters (hero illustration)
const HERO = { left: 1706, top: 92, width: 2092, height: 1813 };

const OG_ALT = "Panda Metrics logo: a panda in a hoodie on a pink background";

const log = (file, width, height, bytes) =>
  console.log(`${file.padEnd(36)} ${width}×${height}  ${(bytes / 1024).toFixed(1)} KB`);

// Square viewBox, size from CSS (no width / height / preserveAspectRatio / style)
const squareSvg = readFileSync(VECTOR_SOURCE, "utf8")
  .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SQUARE_VIEW_BOX}">`);
const logoSvg = optimize(squareSvg, {
  multipass: true,
  plugins: [{ name: "preset-default", params: { floatPrecision: 1 } }],
}).data;

for (const file of ["src/assets/brand/logo.svg", "src/app/icon.svg"]) {
  mkdirSync(dirname(root(file)), { recursive: true });
  writeFileSync(root(file), logoSvg);
  log(file, 1968, 1968, Buffer.byteLength(logoSvg));
}

const renderLogo = (size) => sharp(Buffer.from(logoSvg), { density: 72 }).resize(size, size).png().toBuffer();

const iconInfo = await sharp(await renderLogo(512)).png({ compressionLevel: 9 }).toFile(root("src/app/icon.png"));
log("src/app/icon.png", iconInfo.width, iconInfo.height, iconInfo.size);

const { size, padding, background } = APPLE_ICON;
const appleInfo = await sharp({ create: { width: size, height: size, channels: 3, background } })
  .composite([{ input: await renderLogo(size - padding * 2), left: padding, top: padding }])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(root("src/app/apple-icon.png"));
log("src/app/apple-icon.png", appleInfo.width, appleInfo.height, appleInfo.size);

const ASSETS = [
  { file: "src/assets/brand/panda-hero.webp", build: (img) => img.extract(HERO).resize({ width: 1200 }).webp({ quality: 82 }) },
  { file: "src/app/opengraph-image.png", build: (img) => img.resize(1200, 630, { fit: "cover" }).png({ compressionLevel: 9, palette: true }) },
  { file: "src/app/twitter-image.png", build: (img) => img.resize(1200, 630, { fit: "cover" }).png({ compressionLevel: 9, palette: true }) },
];

for (const { file, build } of ASSETS) {
  const output = root(file);
  mkdirSync(dirname(output), { recursive: true });
  const info = await build(sharp(SOURCE)).toFile(output);
  log(file, info.width, info.height, info.size);
}

for (const file of ["src/app/opengraph-image.alt.txt", "src/app/twitter-image.alt.txt"]) {
  // No trailing newline: Next uses the file content verbatim as og:image:alt
  writeFileSync(root(file), OG_ALT);
}
