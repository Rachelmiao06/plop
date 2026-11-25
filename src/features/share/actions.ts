/** Small browser helpers shared by the share button and the invite sheet. */

export const isWeChat = () => typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);

/** Copies text; falls back to the old textarea trick in older webviews (WeChat's included). */
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** The system share sheet. "shared" / "closed" (the person dismissed it) / "unavailable" (use copy instead). */
export async function systemShare(data: ShareData): Promise<"shared" | "closed" | "unavailable"> {
  if (typeof navigator.share !== "function") return "unavailable";
  try {
    await navigator.share(data);
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "closed";
    return "unavailable";
  }
}

/** Storage can be blocked (private windows, some webviews): never let that break sharing. */
export const store = {
  get(area: "local" | "session", key: string): string | null {
    try {
      return (area === "local" ? window.localStorage : window.sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: "local" | "session", key: string, value: string) {
    try {
      (area === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
    } catch {
      // not remembered, that's all
    }
  },
};
