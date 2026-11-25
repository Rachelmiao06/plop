"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { content } from "./content";
import { ViewControls } from "./ViewControls";

// The canvas is loaded in the browser only; the server never renders 3D.
const SnowCanvas = dynamic(() => import("./SnowCanvas"), { ssr: false });

/**
 * The full-screen snow scene. Anything passed as children is drawn inside
 * the 3D scene and can call useSnow() and useSnowLayout().
 */
export function SnowScene({ children }: { children?: ReactNode }) {
  return (
    <section className="relative h-full w-full touch-none overflow-hidden overscroll-none bg-background select-none">
      <h1 className="sr-only">{content.title}</h1>
      <SnowCanvas>{children}</SnowCanvas>
      <ViewControls />
    </section>
  );
}
