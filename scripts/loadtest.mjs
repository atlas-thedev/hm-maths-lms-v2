// Load test: N virtual students against a running site. Measures what the site sustains and where it starts to lag.
//
//   node scripts/loadtest.mjs [--url http://127.0.0.1:3100] [--students 2000] [--join-seconds 60] [--hold 60]
//                             [--page /store?year=all] [--cookie "hm_session=…"]
//
// Each virtual student: (1) opens a page once, spread over --join-seconds (the "class starts, everyone joins" burst);
// (2) then, for --hold seconds, sends the portal's background call every 30 s (±20%), like an open tab does.
//
// Without --cookie the test is anonymous: the page is a public one and the poll is a light public read through the same
// /api/rest proxy (it measures the proxy + PostgREST + Postgres path, not login checks). With --cookie (the session
// cookie of ONE test student account — create a throw-away one; every virtual student reuses it) the poll is the real
// portal_pulse call, so session validation is measured too. Run it ON the server against 127.0.0.1 to leave out the
// internet, and on a quiet moment: it is real load. Reports requests/s, p50 / p95 / p99 latency and errors.
const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };
const BASE = arg("url", "http://127.0.0.1:3100").replace(/\/$/, "");
const STUDENTS = Number(arg("students", 500));
const JOIN_S = Number(arg("join-seconds", 60));
const HOLD_S = Number(arg("hold", 60));
const PAGE = arg("page", "/store?year=all");
const COOKIE = arg("cookie", "");
const POLL_MS = 30_000;

const headers = COOKIE ? { cookie: COOKIE } : {};
const pollReq = COOKIE
  ? () => fetch(`${BASE}/api/rest/rpc/portal_pulse`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: "{}" })
  : () => fetch(`${BASE}/api/rest/classes?select=id&limit=1`, { headers });

const stats = { page: [], poll: [], errPage: 0, errPoll: 0 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = async (kind, fn) => {
  const s = performance.now();
  try { const r = await fn(); await r.arrayBuffer(); if (!r.ok) stats[kind === "page" ? "errPage" : "errPoll"]++; }
  catch { stats[kind === "page" ? "errPage" : "errPoll"]++; }
  stats[kind].push(performance.now() - s);
};

async function student(i) {
  await sleep((i / STUDENTS) * JOIN_S * 1000);          // join spread evenly over the window
  await t("page", () => fetch(`${BASE}${PAGE}`, { headers }));
  const end = Date.now() + HOLD_S * 1000;
  while (Date.now() < end) {                            // open tab: one poll every ~30 s
    await sleep(POLL_MS * (0.8 + Math.random() * 0.4));
    if (Date.now() < end) await t("poll", pollReq);
  }
}

const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
const line = (name, a, err, secs) => `${name.padEnd(5)} n=${String(a.length).padStart(6)}  ${(a.length / secs).toFixed(1).padStart(6)} req/s  p50=${pct(a, 0.5)}ms  p95=${pct(a, 0.95)}ms  p99=${pct(a, 0.99)}ms  errors=${err}`;

console.log(`${STUDENTS} virtual students → ${BASE}  (join over ${JOIN_S}s, hold ${HOLD_S}s, ${COOKIE ? "authenticated" : "anonymous"})`);
const t0 = performance.now();
await Promise.all(Array.from({ length: STUDENTS }, (_, i) => student(i)));
const secs = (performance.now() - t0) / 1000;
console.log(`finished in ${secs.toFixed(0)}s`);
console.log(line("page", stats.page, stats.errPage, JOIN_S));
console.log(line("poll", stats.poll, stats.errPoll, Math.max(1, HOLD_S)));
const slow = pct(stats.page, 0.95) > 3000 || pct(stats.poll, 0.95) > 1000 || stats.errPage + stats.errPoll > 0;
console.log(slow ? "RESULT: lag — p95 above the target (page 3 s / poll 1 s) or errors." : "RESULT: OK — p95 within target (page 3 s / poll 1 s), no errors.");
process.exit(slow ? 1 : 0);
