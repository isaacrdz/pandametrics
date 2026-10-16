"use client";

import { parseSurveyCode } from "@/lib/surveys/code";

// QR reading for the kiosk code entry. Chrome / Android have a native BarcodeDetector; Safari and
// Firefox get the barcode-detector ponyfill (ZXing compiled to WebAssembly). The ponyfill is a
// dynamic import, so its code only downloads when someone scans or uploads, and its .wasm is
// served from this site (scripts/copy-zxing-wasm.mjs) instead of the package's default CDN.

interface DetectedBarcode {
  rawValue: string;
}

interface QrDetector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface NativeBarcodeDetectorClass {
  new (options: { formats: string[] }): QrDetector;
  getSupportedFormats(): Promise<string[]>;
}

let detectorPromise: Promise<QrDetector> | null = null;

async function createDetector(): Promise<QrDetector> {
  const Native = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorClass }).BarcodeDetector;
  if (Native) {
    const formats: string[] = await Native.getSupportedFormats().catch(() => []);
    if (formats.includes("qr_code")) return new Native({ formats: ["qr_code"] });
  }

  const { BarcodeDetector, ZXING_WASM_VERSION, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? `/vendor/zxing/${ZXING_WASM_VERSION}/${path}` : prefix + path,
    },
  });
  return new BarcodeDetector({ formats: ["qr_code"] });
}

// One detector per page; a failed load is retried on the next call
export function getQrDetector(): Promise<QrDetector> {
  detectorPromise ??= createDetector().catch((error: unknown) => {
    detectorPromise = null;
    throw error;
  });
  return detectorPromise;
}

export type QrReadResult =
  // A Panda Metrics survey code
  | { status: "code"; code: string }
  // A QR was read but it holds no survey code
  | { status: "notSurvey" }
  | { status: "none" };

export async function detectCode(source: ImageBitmapSource): Promise<QrReadResult> {
  const detector = await getQrDetector();
  const barcodes = await detector.detect(source);
  if (barcodes.length === 0) return { status: "none" };

  for (const barcode of barcodes) {
    const code = parseSurveyCode(barcode.rawValue);
    if (code) return { status: "code", code };
  }
  return { status: "notSurvey" };
}
