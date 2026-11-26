/** The QR code's squares for a link: `true` = dark. Plain function, safe anywhere (no canvas). */
import { create } from "qrcode/lib/core/qrcode";

export function qrMatrix(text: string): boolean[][] {
  // "M" keeps a long Chinese-name link small while still forgiving a smudge or a phone held at an angle.
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  return Array.from({ length: modules.size }, (_, r) => Array.from({ length: modules.size }, (_, c) => !!modules.get(r, c)));
}
