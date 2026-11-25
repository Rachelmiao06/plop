/**
 * WeChat ignores Open Graph tags. Without an Official Account and its JS-SDK, a chat link card takes the page
 * title, the description meta and the FIRST image in <body> that is at least 300 x 300. So this must be the first
 * thing a page renders. It is loaded and in the layout but invisible (not `display: none`, which WeChat skips).
 */
import { SHARE } from "./content";

/** `src` / `size`: another square card (the invite page uses its own). Default: the game's share card. */
export function WeChatShareImage({ src = SHARE.squareImage.src, size = SHARE.squareImage.size }: { src?: string; size?: number }) {
  return (
    // A plain <img> on purpose: WeChat reads the raw src, not an optimiser URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden
      data-wechat-share-image
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
}
