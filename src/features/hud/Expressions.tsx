"use client";

/**
 * A snowman's face that can change its expression, from Rachel's art only: the head is her thrower cut-out (as
 * `SnowmanFace`), and for any mood but calm her drawn eyes and mouth are covered with a patch of the same cut-out's
 * own crayon snow (cut from the plain belly, soft-edged), and one of her six expression faces
 * (`public/assets/hud/faces/`, white strokes on transparent, tinted with `--ink-deep`) is laid on top. The sheet's
 * mouths sit lower than the cut-out's, so eyes and mouth are placed separately: each half of the expression lines up
 * with the cut-out's own eyes and mouth. "Sulky" is her calm eyes with the straining wavy mouth.
 */
import type { CSSProperties } from "react";

import type { SnowmanLook } from "./content";
import { FACE_ART, SnowmanFace } from "./Doodles";

export type Mood = "calm" | "happy" | "surprised" | "straining" | "dizzy" | "laugh" | "sulky";
type Sheet = Exclude<Mood, "calm" | "sulky"> | "calm";

/**
 * Where things are on each cut-out, in the source image's pixels: the drawn eyes and mouth centres, and a plain spot
 * of crayon snow (on the belly) the patch is cut from.
 */
const CUTOUT: Record<
  SnowmanLook,
  {
    eyes: readonly [readonly [number, number], readonly [number, number]];
    mouth: readonly [number, number];
    plain: readonly [number, number];
  }
> = {
  bucket: {
    eyes: [
      [117, 174],
      [202, 174],
    ],
    mouth: [159, 199],
    plain: [190, 335],
  },
  redHat: {
    eyes: [
      [114, 195],
      [210, 195],
    ],
    mouth: [162, 226],
    plain: [150, 385],
  },
};

/**
 * Each expression on the 256 px sheet: the row splitting eyes from mouth, the eyes' and the mouth's middle row. The
 * eyes are 101 px apart and centred, on every face.
 */
const SHEET: Record<Sheet, { split: number; eyes: number; mouth: number }> = {
  calm: { split: 130, eyes: 101, mouth: 157 },
  happy: { split: 133, eyes: 101, mouth: 159 },
  surprised: { split: 118, eyes: 93, mouth: 151 },
  straining: { split: 142, eyes: 106, mouth: 163 },
  dizzy: { split: 143, eyes: 106, mouth: 165 },
  laugh: { split: 118, eyes: 90, mouth: 155 },
};
const SHEET_SIZE = 256;
const SHEET_EYES = 101;
/** Patch sizes in source pixels: a circle over each eye, an oval over the mouth. */
const PATCH = { eye: 32, mouthW: 58, mouthH: 28 };

const parts: Record<Exclude<Mood, "calm">, { eyes: Sheet; mouth: Sheet }> = {
  happy: { eyes: "happy", mouth: "happy" },
  surprised: { eyes: "surprised", mouth: "surprised" },
  straining: { eyes: "straining", mouth: "straining" },
  dizzy: { eyes: "dizzy", mouth: "dizzy" },
  laugh: { eyes: "laugh", mouth: "laugh" },
  sulky: { eyes: "calm", mouth: "straining" },
};

/** Every expression file, for preloading so the first swap never blinks. */
export const EXPRESSION_FILES = Object.keys(SHEET).map((s) => `/assets/hud/faces/face-${s}.png`);

export function ExpressiveFace({ look, size, mood }: { look: SnowmanLook; size: number; mood: Mood }) {
  const art = FACE_ART[look];
  const cut = CUTOUT[look];
  const k = size / art.side; // source px → screen px
  // Screen position of a source point.
  const at = ([x, y]: readonly [number, number]) => [(x - art.x) * k, (y - art.y) * k] as const;
  const [[lx, ly], [rx]] = [at(cut.eyes[0]), at(cut.eyes[1])];
  const my = at(cut.mouth)[1];
  const cx = (lx + rx) / 2;
  const centre = [(cut.eyes[0][0] + cut.eyes[1][0]) / 2, (cut.eyes[0][1] + cut.mouth[1]) / 2];
  const shift = [cut.plain[0] - centre[0], cut.plain[1] - centre[1]];

  // One soft-edged patch of the cut-out's own plain snow over a source point.
  const patch = (p: readonly [number, number], w: number, h: number, key: string) => {
    const [px, py] = at(p);
    const sw = w * k;
    const sh = h * k;
    return (
      <span
        key={key}
        className="absolute bg-no-repeat"
        style={{
          left: px - sw / 2,
          top: py - sh / 2,
          width: sw,
          height: sh,
          backgroundImage: `url(${art.src})`,
          backgroundSize: `${art.w * k}px ${art.h * k}px`,
          backgroundPosition: `${-(p[0] + shift[0] - w / 2) * k}px ${-(p[1] + shift[1] - h / 2) * k}px`,
          maskImage: "radial-gradient(closest-side, #000 62%, transparent)",
          WebkitMaskImage: "radial-gradient(closest-side, #000 62%, transparent)",
        }}
      />
    );
  };

  // One half (eyes or mouth) of a sheet face, lined up with the cut-out's own.
  const half = (sheet: Sheet, which: "eyes" | "mouth") => {
    const s = SHEET[sheet];
    const kd = (rx - lx) / SHEET_EYES; // sheet px → screen px
    const from = which === "eyes" ? 0 : s.split;
    const to = which === "eyes" ? s.split : SHEET_SIZE;
    const anchor = which === "eyes" ? s.eyes : s.mouth;
    const target = which === "eyes" ? ly : my;
    const url = `url(/assets/hud/faces/face-${sheet}.png)`;
    const style: CSSProperties = {
      left: cx - (SHEET_SIZE / 2) * kd,
      top: target - (anchor - from) * kd,
      width: SHEET_SIZE * kd,
      height: (to - from) * kd,
      maskImage: url,
      WebkitMaskImage: url,
      maskSize: `${SHEET_SIZE * kd}px ${SHEET_SIZE * kd}px`,
      WebkitMaskSize: `${SHEET_SIZE * kd}px ${SHEET_SIZE * kd}px`,
      maskPosition: `0 ${-from * kd}px`,
      WebkitMaskPosition: `0 ${-from * kd}px`,
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
    };
    return <span key={which} className="absolute bg-ink-deep" style={style} />;
  };

  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <SnowmanFace look={look} size={size} />
      {mood !== "calm" && (
        <>
          {patch(cut.eyes[0], PATCH.eye, PATCH.eye, "l")}
          {patch(cut.eyes[1], PATCH.eye, PATCH.eye, "r")}
          {patch(cut.mouth, PATCH.mouthW, PATCH.mouthH, "m")}
          {half(parts[mood].eyes, "eyes")}
          {half(parts[mood].mouth, "mouth")}
        </>
      )}
    </span>
  );
}
