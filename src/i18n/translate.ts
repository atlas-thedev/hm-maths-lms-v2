/* Shared (server + client) translation helpers. Messages are plain nested JSON objects. */
export type Messages = { [k: string]: unknown };
export type Vars = Record<string, string | number | null | undefined>;

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return cur;
}

export function interpolate(str: string, vars?: Vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}

/** Deep-merge `primary` over `fallback` so missing translations fall back to English. */
export function mergeMessages(fallback: Messages, primary: Messages): Messages {
  const out: Messages = Array.isArray(fallback) ? ([...(fallback as unknown[])] as unknown as Messages) : { ...fallback };
  for (const [k, v] of Object.entries(primary)) {
    const f = (fallback as Messages)[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && f && typeof f === "object" && !Array.isArray(f)
      ? mergeMessages(f as Messages, v as Messages) : v;
  }
  return out;
}

export function makeT(messages: Messages, ns?: string) {
  const t = (key: string, vars?: Vars): string => {
    const full = ns ? `${ns}.${key}` : key;
    const v = getPath(messages, full);
    if (typeof v === "string") return interpolate(v, vars);
    if (typeof v === "number") return String(v);
    if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing key: ${full}`);
    return full;
  };
  /** Raw value (arrays / objects) for lists such as FAQ items. */
  const raw = <T = unknown>(key: string): T => getPath(messages, ns ? `${ns}.${key}` : key) as T;
  return Object.assign(t, { raw });
}
export type T = ReturnType<typeof makeT>;

/** Map a raw Postgres error message to a friendly translated one (errors.db in the JSON files). */
export function dbError(t: T, message: string | undefined | null): string {
  const map = t.raw<Record<string, string>>("errors.db") ?? {};
  const msg = String(message ?? "");
  return map[msg] ?? (msg || t("errors.generic.unknown"));
}
