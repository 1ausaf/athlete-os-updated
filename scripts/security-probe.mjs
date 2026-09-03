#!/usr/bin/env node
/**
 * Black-box security probe — attacks a RUNNING deployment the way a hostile
 * client would: forged Host headers, forged trust headers, persona cookies
 * where they don't belong. The frontend is bypassed entirely.
 *
 * Uses node:http(s) directly because WHATWG fetch strips the Host header
 * (a forbidden header name), which would silently neuter every host-based
 * probe.
 *
 *   node scripts/security-probe.mjs [baseUrl]   (default http://localhost:3000)
 *
 * Exit code 0 = all probes hold; 1 = at least one failed.
 */

import http from "node:http";
import https from "node:https";

const BASE = new URL(process.argv[2] ?? "http://localhost:3000");
const APEX = process.env.PLATFORM_APEX ?? "powa.com";

function request(path, headers = {}) {
  const mod = BASE.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(
      {
        hostname: BASE.hostname,
        port: BASE.port || (BASE.protocol === "https:" ? 443 : 80),
        path,
        method: "GET",
        headers,
      },
      (res) => {
        res.resume(); // drain
        resolve({ status: res.statusCode ?? 0, headers: res.headers });
      },
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

let failures = 0;
const results = [];

async function probe(name, path, headers, check) {
  try {
    const res = await request(path, headers);
    const ok = check(res);
    results.push(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${res.status})`}`);
    if (!ok) failures++;
  } catch (err) {
    results.push(`FAIL  ${name} — ${err.message}`);
    failures++;
  }
}

const loc = (res) => String(res.headers.location ?? "");
const redirects = (res) => [307, 308].includes(res.status);

// --- demo host stays the demo -----------------------------------------
await probe("demo: marketing serves", "/", {}, (r) => r.status === 200);
await probe(
  "demo: persona staff access (fictional data)",
  "/staff/athletes",
  { cookie: "aos-demo-role=owner" },
  (r) => r.status === 200,
);

// --- tenant hosts ------------------------------------------------------
await probe(
  "tenant: root redirects to sign-in",
  "/",
  { host: `lps.${APEX}` },
  (r) => redirects(r) && loc(r).includes("/auth/sign-in"),
);
await probe(
  "tenant: sign-in renders",
  "/auth/sign-in",
  { host: `lps.${APEX}` },
  (r) => r.status === 200,
);
await probe(
  "tenant: persona cookie CANNOT open the live roster",
  "/staff/roster",
  { host: `lps.${APEX}`, cookie: "aos-demo-role=owner" },
  // persona/pilot identities are not real auth — the page must bounce
  (r) => redirects(r),
);

// --- forged trust headers ----------------------------------------------
await probe(
  "forged x-powa-mode cannot demote an unknown tenant host to demo",
  "/auth/sign-in",
  { host: `nope.${APEX}`, "x-powa-mode": "demo", "x-powa-slug": "demo" },
  (r) => r.status === 404,
);
await probe(
  "unknown tenant host 404s",
  "/auth/sign-in",
  { host: `ghost.${APEX}` },
  (r) => r.status === 404,
);
await probe(
  "persona cookie cannot resurrect an unknown host",
  "/staff/athletes",
  { host: `ghost.${APEX}`, cookie: "aos-demo-role=owner" },
  (r) => r.status === 404,
);

// --- platform host ------------------------------------------------------
await probe(
  "apex: app paths bounce to marketing",
  "/staff/athletes",
  { host: APEX },
  (r) => redirects(r) || r.status === 307,
);
await probe(
  "www 308s to apex",
  "/",
  { host: `www.${APEX}` },
  (r) => r.status === 308 && loc(r).includes(`https://${APEX}`),
);

// --- removed pages stay removed -----------------------------------------
for (const p of ["/about", "/pricing", "/style-guide"]) {
  await probe(`retired page 404s: ${p}`, p, {}, (r) => r.status === 404);
}

// --- baseline security headers ------------------------------------------
await probe("security headers present", "/", {}, (r) =>
  r.headers["x-content-type-options"] === "nosniff" &&
  r.headers["x-frame-options"] === "DENY",
);

console.log(results.join("\n"));
console.log(
  failures === 0
    ? `\nALL PROBES HELD (${results.length})`
    : `\n${failures} PROBE(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
