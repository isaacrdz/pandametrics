// Copies the ZXing reader .wasm used by the barcode-detector polyfill into public/, so QR scanning
// on Safari / Firefox loads it from this site instead of the jsDelivr CDN (the package default).
// Runs on `postinstall`, so the file always matches the installed zxing-wasm version; the copy
// is gitignored. The kiosk points the polyfill at /vendor/zxing/<version>/ (src/lib/kiosk/qr.ts).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

// zxing-wasm does not export its package.json: resolve its entry (as barcode-detector sees it)
// and walk up to the package root
function findPackageRoot(name, from) {
  let dir = dirname(require.resolve(name, { paths: [from] }));
  while (!existsSync(join(dir, "package.json")) || JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name !== name) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Cannot find the ${name} package root`);
    dir = parent;
  }
  return dir;
}

const packageDir = findPackageRoot("zxing-wasm", dirname(require.resolve("barcode-detector")));
const { version } = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

const targetRoot = root("public/vendor/zxing");
const target = join(targetRoot, version);
// Drop copies of older versions
rmSync(targetRoot, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
copyFileSync(join(packageDir, "dist/reader/zxing_reader.wasm"), join(target, "zxing_reader.wasm"));
console.log(`zxing-wasm ${version} → public/vendor/zxing/${version}/zxing_reader.wasm`);
