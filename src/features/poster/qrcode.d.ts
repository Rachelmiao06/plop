// The one function the poster uses from `qrcode` (the package ships no types; no @types package on purpose).
declare module "qrcode/lib/core/qrcode" {
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" },
  ): { version: number; modules: { size: number; get(row: number, col: number): number } };
}
