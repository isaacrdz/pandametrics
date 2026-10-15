# Survey Kiosk Phase 4 — QR Scanning Spec

## Overview

Phase 4 of 4 of the public kiosk: enable "Scan QR" (camera) and "Upload QR image" on the code entry screen, so a survey can be opened from its QR on every browser, including Safari and Firefox.

Full research in `docs/survey-kiosk.md` (section 8).

## Decisions (from the research)

- Native `BarcodeDetector` where it exists, and the `barcode-detector` polyfill (npm 3.2.2, zxing-wasm) otherwise. It is loaded with a dynamic `import()` only when scanning or uploading.
- The zxing `.wasm` is **self-hosted** from `public/`, so the kiosk makes no third-party requests.
- The camera is always released: on close, on unmount and on success.
- Every scanned or uploaded value goes through `parseSurveyCode` (phase 1).

## Requirements

### Detector (`src/lib/kiosk/qr.ts`, client only)

- `getQrDetector()`:
  - returns `new BarcodeDetector({ formats: ["qr_code"] })`;
  - when `globalThis.BarcodeDetector` is missing or does not support `qr_code`, it `await import("barcode-detector/…")` (the entry the package documents for a ponyfill), configured to load the wasm from `/vendor/zxing/…`;
  - caches the instance.
- Copy the wasm file from `node_modules` into `public/vendor/zxing/` with a small script (`scripts/copy-zxing-wasm.mjs`), wired to `postinstall` or run once and committed. Document which in the script header. Check the exact file name and the configuration option in the package README at implementation time.
- `detectCode(source: ImageBitmapSource)` → the first QR `rawValue` parsed with `parseSurveyCode`, or `null`.

### Scanner dialog (`src/components/kiosk/QrScannerDialog.tsx`)

- Add shadcn `dialog`.
- Opened by "Scan QR" (now enabled, tooltip removed).
- Content: title "Scan the QR code", a square `<video>` preview (`playsInline muted autoPlay`, rounded-2xl, `bg-muted`) with a corner frame overlay, a muted hint "Point the camera at the survey's QR code", and an outline "Upload QR image instead" button.
- **Starting**:
  - `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })`;
  - then `detectCode(video)` every 250 ms, with no new detect while one is still running.
- **On a code**: stop, close, and navigate to `/s?code=…`, the same path as Continue (fullscreen request plus the `KIOSK` entry flag from phase 3).
- **Cleanup**: stop every track and clear the interval on dialog close, unmount and success, so the camera indicator turns off.
- **Error states**, shown in the dialog in place of the video, each with "Upload QR image instead":
  - permission denied: "Allow camera access to scan";
  - no camera / `NotFoundError`: "No camera found";
  - insecure context (`!isSecureContext`): "The camera needs a secure (HTTPS) connection";
  - a QR without a valid code: an inline "This QR is not a Panda Metrics survey" while it keeps scanning.

### Image upload

- "Upload QR image" (now enabled): a hidden `<input type="file" accept="image/*">`, cleared after each pick.
- File → `createImageBitmap(file)` → `detectCode` → navigate, or an inline `role="alert"` error under the buttons: "No QR code found in that image".
- Works from the code entry and from the scanner dialog's fallback button.

### Messages

- `kiosk.qr` in en / es:
  - "Escanear el código QR", "Apunta la cámara al código QR de la encuesta", "Subir imagen QR en su lugar";
  - "Permite el acceso a la cámara para escanear", "No se encontró una cámara", "La cámara necesita una conexión segura (HTTPS)";
  - "Este QR no es de una encuesta de Panda Metrics", "No se encontró un código QR en esa imagen".
- Remove the phase 1 "Coming soon" tooltip on these buttons.

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`.
- **Camera**: scan the share panel's QR (screen or printed PNG) in Chrome, Safari (macOS and iOS) and Firefox → opens the survey.
- **Upload**: upload the downloaded `panda-XXXXXX.png` → opens the survey. A photo without a QR → error.
- **Cleanup**: closing the dialog (Esc, close button, outside click) and succeeding all turn off the camera light. Reopening works.
- **Denied permission** shows its message and the upload fallback works.
- **Network**: no request goes to a third-party CDN during scanning. The polyfill chunk loads only after Scan / Upload is used, and the code entry's initial JS does not grow.
- 375 / 1280, light and dark, English and Spanish: the dialog fits, no overflow, focus is trapped and returns to "Scan QR" on close.

## References

- @docs/survey-kiosk.md
- @context/screenshots/survey-landing-1.png
- @src/components/surveys/form/SharePanel.tsx
- `barcode-detector` README (npm 3.2.2)
