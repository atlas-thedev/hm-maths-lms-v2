#!/usr/bin/env node
// i18n checks: (1) en ↔ si key parity + {placeholder} parity, (2) every literal t("key") used in src exists in en.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MSG = join(ROOT, "src/i18n/messages");
const LOCALES = ["en", "si"];
const load = (loc) => Object.fromEntries(readdirSync(join(MSG, loc)).filter((f) => f.endsWith(".json"))
  .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(MSG, loc, f), "utf8"))]));
const msgs = Object.fromEntries(LOCALES.map((l) => [l, load(l)]));

const flatten = (o, p = "", out = {}) => {
  if (Array.isArray(o)) { out[p] = o; o.forEach((v, i) => typeof v === "object" && v && flatten(v, `${p}.${i}`, out)); return out; }
  if (o && typeof o === "object") { if (p) out[p] = o; for (const [k, v] of Object.entries(o)) flatten(v, p ? `${p}.${k}` : k, out); return out; }
  out[p] = o; return out;
};
const en = flatten(msgs.en), si = flatten(msgs.si);
let errors = 0, warnings = 0;
const err = (m) => { errors++; console.error("✗", m); };
const warn = (m) => { warnings++; console.warn("!", m); };
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

for (const [k, v] of Object.entries(en)) {
  if (!(k in si)) { warn(`si missing: ${k}`); continue; }
  if (typeof v === "string") {
    if (typeof si[k] !== "string") err(`type mismatch at ${k}`);
    else if (vars(v) !== vars(si[k])) err(`placeholder mismatch at ${k}: en{${vars(v)}} si{${vars(si[k])}}`);
  } else if (Array.isArray(v) !== Array.isArray(si[k])) err(`type mismatch at ${k}`);
}
for (const k of Object.keys(si)) if (!(k in en)) warn(`si has extra key: ${k}`);

// Static scan of translator usage
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|mjs)$/.test(f)) files.push(p); } };
walk(join(ROOT, "src"));
let checked = 0;
for (const file of files) {
  const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const bindings = [];
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:getT|useT)\(\s*(?:"([^"]*)")?\s*\)/g)) bindings.push({ name: m[1], ns: m[2] ?? "", at: m.index });
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*async[^\n]*getT\("([^"]+)"\)/g)) bindings.push({ name: m[1], ns: m[2], at: m.index });
  for (const name of new Set(bindings.map((b) => b.name))) {
    const re = new RegExp(`(?<![\\w.])${name}(?:\\.raw(?:<[^>]*>)?)?\\(\\s*"([^"]+)"`, "g");
    for (const m of src.matchAll(re)) {
      const b = bindings.filter((x) => x.name === name && x.at <= m.index).pop();
      if (!b) continue;
      const key = b.ns ? `${b.ns}.${m[1]}` : m[1];
      checked++;
      if (!(key in en)) err(`${relative(ROOT, file)}: missing key "${key}"`);
    }
  }
}
console.log(`\ni18n: ${Object.keys(en).length} en keys, ${checked} static usages checked, ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors ? 1 : 0);
