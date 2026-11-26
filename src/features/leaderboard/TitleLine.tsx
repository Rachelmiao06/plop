"use client";

/**
 * A funny title, drawn without a box: Rachel's star doodle and the title in berry handwriting, with its short
 * English line beneath (or beside, small). It pops in a beat after whatever is above it.
 */
import type { CSSProperties } from "react";
import { StarDoodle } from "@/features/hud/Doodles";
import { lb } from "./boardStyles";
import { TEXT } from "./content";
import type { TitleId } from "./titles";

export function TitleLine({ id, big = false, className = "" }: { id: TitleId; big?: boolean; className?: string }) {
  const t = TEXT.titles[id];
  return (
    <p
      className={`mx-auto flex w-fit flex-col items-center leading-tight ${lb.note} ${className}`}
      style={{ "--lb-note-in": "0.6s", "--lb-note-over": 0.14, animationDelay: big ? "0.35s" : "0s" } as CSSProperties}
    >
      <span className="flex items-center gap-1">
        <span className={lb.star}>
          <StarDoodle size={big ? 20 : 14} />
        </span>
        <span className={`font-heading font-bold text-berry-deep ${big ? "text-2xl" : "text-base"}`}>{t.zh}</span>
      </span>
      <span className={`font-sans opacity-75 ${big ? "text-xs" : "text-[10px]"}`}>{t.en}</span>
    </p>
  );
}
