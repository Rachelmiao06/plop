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
 * 6. Opens the invite card with and without a name and group (`/invite`, `/invite?from=test&score=12`, with `g=`, with a
 *    preset wager `w=` and an unknown one): the title must name the
 *    inviter for WeChat's chat card, and the first image in the body must be the invite's own square card.
 * 7. The leaderboard API (`/api/scores`, demo mode without Supabase keys): a bad group is refused, a good score is
 *    taken and then listed, a rude nickname and an impossible score are refused; play-style numbers (for the funny
 *    titles) are taken with a score and impossible ones refused; "今日最惨" shows only for a ticked box and clears when
 *    unticked. The test page `/dev/leaderboard`
 *    is one of the pages in step 3. Then snowballs (`/api/snowballs`): a throw at someone not on the board, at
 *    yourself or from a rude name is refused, a throw lands and counts, the same friend again must wait, the hit
 *    shows in the inbox until marked seen. Then sticker reactions (`/api/reactions`): unknown stickers, yourself and
 *    names not on the board are refused; a sticker lands, a new one replaces it, the owner's inbox has it until seen,
 *    and it can be taken back.
 * 8. The web app manifest ("add to home screen"): the home page links `/manifest.webmanifest`, it answers JSON
 *    named "Plop!" with `display: standalone`, and each of its icons (192, 512 and a maskable one) loads as an image.
 * 9. Fetches a page that does not exist: it must answer 404.
 * 10. Fails if the server printed an error while doing all this.
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
      // A preset wager rides along (`w=`); an unknown one is simply dropped.
      ["/invite?g=test1234&from=test&score=12&w=cocoa", "test 邀请你来打雪仗 · Plop!"],
      ["/invite?g=test1234&from=test&w=bogus", "test 邀请你来打雪仗 · Plop!"],
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

    console.log("\nLeaderboard API (/api/scores):");
    const group = `smoke${String(port).slice(-3).padStart(3, "0")}`;
    const post = (body) =>
      fetch(base + "/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT),
      });
    const expect = async (label, res, status, check = () => true) => {
      const json = await res.json().catch(() => ({}));
      if (res.status !== status) fail(`${label}: answered ${res.status} ${JSON.stringify(json)}, expected ${status}`);
      else if (!check(json)) fail(`${label}: unexpected answer ${JSON.stringify(json)}`);
      else pass(`${label} ${status}`);
    };
    const good = { group, name: "Smoke", score: 7, rounds: 3, mode: "turns" };
    await expect("GET bad group", await get(base + "/api/scores?g=nope"), 400, (j) => j.error === "bad_group");
    await expect("POST good score", await post(good), 200, (j) => j.entry?.best === 7 && j.rank === 1);
    await expect("GET lists it", await get(`${base}/api/scores?g=${group}`), 200, (j) => j.scores?.[0]?.name === "Smoke");
    await expect("POST rude name", await post({ ...good, name: "傻逼" }), 400, (j) => j.error === "rude_name");
    const stats = { clears: 2, streak: 2, bumps: 1, stars: 1, throws: 3, fullPower: 3 };
    await expect("POST with play-style numbers", await post({ ...good, name: "Styler", stats }), 200, (j) => j.entry?.stats?.bestStreak === 2 && j.players >= 2);
    await expect("POST impossible numbers", await post({ ...good, name: "Styler", stats: { ...stats, throws: 9 } }), 400, (j) => j.error === "bad_stats");
    await expect("POST impossible score", await post({ ...good, score: 9999 }), 400, (j) => j.error === "bad_score");
    // "今日最惨": only a ticked box puts today's lowest throw on the board; unticking takes it off.
    const oopsStats = { clears: 0, streak: 0, bumps: 0, stars: 0, throws: 3, fullPower: 0, worst: 0 };
    await expect("POST opting in to today's oops", await post({ ...good, name: "Oopsy", score: 2, stats: oopsStats, oops: true }), 200, (j) => j.entry?.oops?.low === 0);
    await expect("GET shows today's oops", await get(`${base}/api/scores?g=${group}`), 200, (j) => j.scores?.some((s) => s.name === "Oopsy" && s.oops?.low === 0));
    await expect("POST unticked clears it", await post({ ...good, name: "Oopsy", score: 2, stats: { ...oopsStats, worst: 1 }, oops: false }), 200, (j) => !j.entry?.oops);
    await expect("POST oops not a yes/no", await post({ ...good, name: "Oopsy", oops: "yes" }), 400, (j) => j.error === "bad_stats");
    await expect("POST impossible worst throw", await post({ ...good, name: "Oopsy", stats: { ...oopsStats, worst: 99 } }), 400, (j) => j.error === "bad_stats");

    console.log("\nSnowballs API (/api/snowballs):");
    const ball = (body) =>
      fetch(base + "/api/snowballs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, ...body }),
        signal: AbortSignal.timeout(TIMEOUT),
      });
    await expect("GET bad group", await get(base + "/api/snowballs?g=nope"), 400, (j) => j.error === "bad_group");
    await expect("throw at someone not on the board", await ball({ action: "throw", from: "Pal", to: "Nobody" }), 404, (j) => j.error === "not_on_board");
    await expect("throw at yourself", await ball({ action: "throw", from: "Smoke", to: "smoke" }), 400, (j) => j.error === "same_person");
    await expect("rude thrower", await ball({ action: "throw", from: "傻逼", to: "Smoke" }), 400, (j) => j.error === "rude_name");
    await expect("throw lands", await ball({ action: "throw", from: "Pal", to: "Smoke" }), 200, (j) => j.thrown === true && j.today >= 1);
    await expect("same friend again waits", await ball({ action: "throw", from: "Pal", to: "Smoke" }), 200, (j) => j.thrown === false && j.retrySeconds > 0);
    await expect("GET counts today", await get(`${base}/api/snowballs?g=${group}`), 200, (j) => j.today?.smoke >= 1);
    await expect("inbox has the hit", await ball({ action: "inbox", me: "Smoke" }), 200, (j) => j.hits?.[0]?.from === "Pal");
    await expect("mark seen", await ball({ action: "seen", me: "Smoke" }), 200, (j) => j.ok === true);
    await expect("inbox empty after seen", await ball({ action: "inbox", me: "Smoke" }), 200, (j) => Array.isArray(j.hits) && j.hits.length === 0);
    await expect("bad action", await ball({ action: "melt", me: "Smoke" }), 400, (j) => j.error === "bad_action");

    console.log("\nSticker reactions (/api/reactions):");
    const sticker = (body) =>
      fetch(base + "/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, ...body }),
        signal: AbortSignal.timeout(TIMEOUT),
      });
    await expect("GET bad group", await get(base + "/api/reactions?g=nope"), 400, (j) => j.error === "bad_group");
    await expect("unknown sticker", await sticker({ action: "react", from: "Pal", to: "Smoke", kind: "poop" }), 400, (j) => j.error === "bad_kind");
    await expect("sticker on yourself", await sticker({ action: "react", from: "Smoke", to: "SMOKE", kind: "star" }), 400, (j) => j.error === "same_person");
    await expect("sticker on someone not on the board", await sticker({ action: "react", from: "Pal", to: "Nobody", kind: "star" }), 404, (j) => j.error === "not_on_board");
    await expect("sticker lands", await sticker({ action: "react", from: "Pal", to: "Smoke", kind: "star" }), 200, (j) => j.counts?.smoke?.star === 1);
    await expect("changed sticker replaces it", await sticker({ action: "react", from: "Pal", to: "Smoke", kind: "lol" }), 200, (j) => j.counts?.smoke?.lol === 1 && !j.counts?.smoke?.star);
    await expect("GET counts", await get(`${base}/api/reactions?g=${group}`), 200, (j) => j.counts?.smoke?.lol === 1);
    await expect("owner's inbox has it", await sticker({ action: "inbox", me: "Smoke" }), 200, (j) => j.got?.[0]?.from === "Pal" && j.got[0].kind === "lol");
    await expect("giver sees what they gave", await sticker({ action: "inbox", me: "Pal" }), 200, (j) => j.given?.smoke === "lol");
    await expect("mark seen", await sticker({ action: "seen", me: "Smoke" }), 200, (j) => j.ok === true);
    await expect("inbox empty after seen", await sticker({ action: "inbox", me: "Smoke" }), 200, (j) => Array.isArray(j.got) && j.got.length === 0);
    await expect("take it back", await sticker({ action: "react", from: "Pal", to: "Smoke", kind: null }), 200, (j) => !j.counts?.smoke?.lol);

    console.log("\nWeb app manifest (add to home screen):");
    try {
      if (!/<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/.test(home))
        fail("the home page has no <link rel=\"manifest\" href=\"/manifest.webmanifest\">");
      const res = await get(base + "/manifest.webmanifest");
      const type = res.headers.get("content-type") ?? "";
      const manifest = await res.json().catch(() => null);
      if (res.status !== 200) fail(`/manifest.webmanifest answered ${res.status}`);
      else if (!manifest) fail(`/manifest.webmanifest is not JSON (${type})`);
      else if (manifest.name !== "Plop!" || manifest.display !== "standalone")
        fail(`/manifest.webmanifest: name "${manifest.name}", display "${manifest.display}"`);
      else {
        pass(`/manifest.webmanifest "${manifest.name}", ${manifest.display} (${type})`);
        const icons = manifest.icons ?? [];
        for (const need of ["192x192", "512x512"])
          if (!icons.some((i) => i.sizes === need && (i.purpose ?? "any").includes("any"))) fail(`manifest has no ${need} icon`);
        if (!icons.some((i) => (i.purpose ?? "").includes("maskable"))) fail("manifest has no maskable icon");
        for (const icon of icons) {
          const pic = await get(base + icon.src);
          const picType = pic.headers.get("content-type") ?? "";
          await pic.arrayBuffer();
          if (pic.status !== 200) fail(`manifest icon ${icon.src} answered ${pic.status}`);
          else if (!picType.startsWith("image/")) fail(`manifest icon ${icon.src} is not an image (${picType})`);
          else pass(`${icon.src} ${icon.sizes} ${icon.purpose ?? "any"} (${picType})`);
        }
      }
    } catch (e) {
      fail(`/manifest.webmanifest did not answer (${e.message})`);
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
