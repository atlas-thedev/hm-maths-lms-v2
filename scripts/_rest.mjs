// Shared helpers for the test scripts: loads the app's own PostgREST client (src/lib/db/rest.ts) and
// mints session / service tokens with the same HS256 secret PostgREST is configured with.
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export async function loadRestClient() {
  // rest.ts is TypeScript with no imports: transpile it on the fly.
  const src = readFileSync(new URL("../src/lib/db/rest.ts", import.meta.url), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dir = mkdtempSync(path.join(tmpdir(), "rest-"));
  writeFileSync(path.join(dir, "rest.mjs"), out);
  return (await import(pathToFileURL(path.join(dir, "rest.mjs")).href)).RestClient;
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
export function mintToken(secret, claims, ttl = 600) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iat: now, exp: now + ttl, ...claims })}`;
  return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
}

export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) { console.error(`Missing env: ${missing.join(", ")}\nStart a local stack with:  bash scripts/dev-stack.sh up && eval "$(bash scripts/dev-stack.sh env)"`); process.exit(1); }
  return Object.fromEntries(names.map((n) => [n, process.env[n]]));
}
