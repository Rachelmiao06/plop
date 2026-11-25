#!/usr/bin/env node
/**
 * Smoke test: does every page load?
 *
 * 1. Builds the app if there is no build yet (`npm run build`).
 * 2. Starts the production server (`next start`) on a free port.
 * 3. Finds every page under `src/app` (each `page.tsx`, so new `/dev/*` pages are picked up on their own)
 *    and fetches it: it must answer 200 with HTML that has the "Plop!" title and no Next.js error page.
 * 4. Reads the home page's <head> and fetches the icons and the share card it points to: each must answer 200
 *    with an image.
 * 5. Checks the first image in the home page body is the WeChat share image (at least 300 px) and loads.
 * 6. Opens the invite card with and without a name and group (`/invite`, `/invite?from=test&score=12`, with `g=`): the title must name the
 *    inviter for WeChat's chat card, and the first image in the body must be the invite's own square card.
 * 7. Fetches a page that does not exist: it must answer 404.
 * 8. Fails if the server printed an error while doing all this.
 *
 * It does NOT run the page in a browser: client-side JavaScript errors, WebGL, the 3D scene, the loading screen
 * fading out and any interaction are not covered. It only proves the server can render every page.
 *
 * Usage: `node scripts/smoke.mjs` (after `npm run build`, or it builds first).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const APP = join(ROOT, "src", "app");
const TIMEOUT = 60_000;

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};
const pass = (msg) => console.log(`  ✓ ${msg}`);

/** Every route with a page.tsx. Route groups "(x)" vanish from the URL; dynamic "[x]" routes are skipped. */
function findRoutes(dir = APP) {
  const routes = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name.startsWith("_") || name.startsWith("@")) continue;
      routes.push(...findRoutes(full));
    } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) {
      const parts = relative(APP, dir).split(sep).filter(Boolean);
      if (parts.some((p) => p.startsWith("["))) {
        console.log(`  - skipped dynamic route /${parts.join("/")}`);
        continue;
      }
      routes.push("/" + parts.filter((p) => !(p.startsWith("(") && p.endsWith(")"))).join("/"));
    }
  }
  return routes.sort();
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function get(url) {
  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT) });
  return res;
}

async function waitForServer(base, server) {
  const until = Date.now() + TIMEOUT;
  while (Date.now() < until) {
    if (server.exitCode !== null) throw new Error(`server exited early (code ${server.exitCode})`);
    try {
      await fetch(base, { signal: AbortSignal.timeout(2000) });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error("server did not start in time");
}

/** Signs that Next.js rendered its error page instead of ours. */
const ERROR_MARKERS = [
  'id="__next_error__"',
  "Application error: a server-side exception has occurred",
  "Internal Server Error",
];

async function main() {
  if (!existsSync(join(ROOT, ".next", "BUILD_ID"))) {
    console.log("No build found, running npm run build…");
    const built = spawnSync("npm", ["run", "build"], { stdio: "inherit" });
    if (built.status !== 0) process.exit(built.status ?? 1);
  }

  const port = await freePort();
  const base = `http://localhost:${port}`;
  const log = [];
  const server = spawn(join(ROOT, "node_modules", ".bin", "next"), ["start", "-p", String(port)], {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => log.push(String(d)));
  server.stderr.on("data", (d) => log.push(String(d)));

  try {
    await waitForServer(base, server);
    console.log(`Server up at ${base}\n\nPages:`);

    const routes = findRoutes();
    let home = "";
    for (const route of routes) {
      try {
        const res = await get(base + route);
        const body = await res.text();
        if (route === "/") home = body;
        const type = res.headers.get("content-type") ?? "";
        if (res.status !== 200) fail(`${route} answered ${res.status}`);
        else if (!type.includes("text/html")) fail(`${route} is not HTML (${type})`);
        else if (ERROR_MARKERS.some((m) => body.includes(m))) fail(`${route} rendered an error page`);
        else if (!/<title>[^<]*Plop!/.test(body)) fail(`${route} has no "Plop!" title`);
        else pass(`${route} 200`);
      } catch (e) {
        fail(`${route} did not answer (${e.message})`);
      }
    }

    console.log("\nIcons and share card (from the home page's <head>):");
    const wanted = [
      ["favicon", /<link[^>]+rel="icon"[^>]+href="([^"]*favicon[^"]*)"/],
      ["icon", /<link[^>]+rel="icon"[^>]+href="(\/icon[^"]*)"/],
      ["apple-icon", /<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"/],
      ["share card (og:image)", /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/],
      ["share card (twitter:image)", /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/],
    ];
    for (const [label, pattern] of wanted) {
      const found = home.match(pattern)?.[1]?.replaceAll("&amp;", "&");
      if (!found) {
        fail(`${label}: no tag in the home page`);
        continue;
      }
      // Absolute share-card URLs point at the deployed site; fetch the same path from this server.
      const url = new URL(found, base);
      const local = base + url.pathname + url.search;
      try {
        const res = await get(local);
        const type = res.headers.get("content-type") ?? "";
        await res.arrayBuffer();
        if (res.status !== 200) fail(`${label} ${url.pathname} answered ${res.status}`);
        else if (!type.startsWith("image/")) fail(`${label} ${url.pathname} is not an image (${type})`);
        else pass(`${label} ${url.pathname} (${type})`);
      } catch (e) {
        fail(`${label} did not answer (${e.message})`);
      }
    }

    // WeChat (no Official Account) takes the first <img> in <body> of at least 300 x 300 for its chat card.
    console.log("\nWeChat card image (first image in the home page body):");
    const first = home.split(/<body[^>]*>/)[1]?.match(/<img\b[^>]*>/)?.[0] ?? "";
    const src = first.match(/\ssrc="([^"]+)"/)?.[1];
    const width = Number(first.match(/\swidth="(\d+)"/)?.[1] ?? 0);
    if (!first.includes("data-wechat-share-image") || !src) fail("the first image in <body> is not the WeChat share image");
    else if (width < 300) fail(`WeChat share image is ${width}px wide, needs at least 300`);
    else {
      const res = await get(base + src);
      await res.arrayBuffer();
      if (res.status === 200) pass(`${src} (${width}px, first image)`);
      else fail(`WeChat share image ${src} answered ${res.status}`);
    }

    // The invite card: the title is WeChat's chat-card title, so it must say who invites; the first body image is
    // the card picture.
    console.log("\nInvite card:");
    const invites = [
      ["/invite", "有人邀请你来打雪仗 · Plop!"],
      ["/invite?from=test&score=12", "test 邀请你来打雪仗 · Plop!"],
      ["/invite?g=test1234&from=test&score=12", "test 邀请你来打雪仗 · Plop!"],
    ];
    for (const [path, title] of invites) {
      try {
        const res = await get(base + path);
        const body = await res.text();
        const img = body.split(/<body[^>]*>/)[1]?.match(/<img\b[^>]*>/)?.[0] ?? "";
        const imgSrc = img.match(/\ssrc="([^"]+)"/)?.[1] ?? "";
        const imgWidth = Number(img.match(/\swidth="(\d+)"/)?.[1] ?? 0);
        if (res.status !== 200) fail(`${path} answered ${res.status}`);
        else if (ERROR_MARKERS.some((m) => body.includes(m))) fail(`${path} rendered an error page`);
        else if (!body.includes(`<title>${title}</title>`)) fail(`${path} has no "${title}" title`);
        else if (!img.includes("data-wechat-share-image") || !imgSrc.includes("/invite/") || imgWidth < 300)
          fail(`${path}: the first image in <body> is not the invite card (${imgSrc || "none"}, ${imgWidth}px)`);
        else {
          const pic = await get(base + imgSrc);
          await pic.arrayBuffer();
          if (pic.status !== 200) fail(`${path}: invite card image ${imgSrc} answered ${pic.status}`);
          else pass(`${path} 200, "${title}", ${imgSrc} (${imgWidth}px, first image)`);
        }
      } catch (e) {
        fail(`${path} did not answer (${e.message})`);
      }
    }

    console.log("\nMissing page:");
    const missing = await get(base + "/this-page-does-not-exist");
    await missing.text();
    if (missing.status === 404) pass("/this-page-does-not-exist 404");
    else fail(`/this-page-does-not-exist answered ${missing.status}, expected 404`);
  } catch (e) {
    fail(e.message);
  } finally {
    server.kill("SIGTERM");
  }

  const errors = log
    .join("")
    .split("\n")
    .filter((l) => /⨯|\bError\b|Unhandled|exception/i.test(l));
  console.log("\nServer log:");
  if (errors.length) errors.forEach((l) => fail(`server said: ${l.trim()}`));
  else pass("no errors");

  if (failures.length) {
    console.log(`\nSmoke test FAILED (${failures.length} problem${failures.length > 1 ? "s" : ""}).`);
    process.exit(1);
  }
  console.log("\nSmoke test passed.");
}

main();
