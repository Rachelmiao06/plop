"use client";

// Prints the live value of a CSS token, so colour values are only ever written in globals.css.
export function TokenValue({ name }: { name: string }) {
  return (
    <code
      className="font-mono text-xs uppercase"
      ref={(el) => {
        if (!el) return;
        el.textContent = getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim();
      }}
    />
  );
}
