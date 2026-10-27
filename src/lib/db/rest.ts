/**
 * Minimal PostgREST client (browser + server). PostgREST is a plain HTTP API, so this is a small
 * query builder over `fetch`: select (with embedded tables + counts), insert, update, upsert, delete,
 * filters, order/limit, single/maybeSingle and rpc. It replaces a third-party client library.
 *
 * Results follow the shape `{ data, error, count, status }` and never throw (network failures come
 * back as `error`). Row data is typed `any` — callers cast to their own row types.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type DbError = { message: string; details?: string; hint?: string; code?: string };
export type DbResult<T = any[]> = { data: T | null; error: DbError | null; count: number | null; status: number };

type Method = "GET" | "HEAD" | "POST" | "PATCH" | "DELETE";
type Opts = { headers?: Record<string, string>; fetch?: typeof fetch };
type FilterValue = string | number | boolean | null;

/** Values inside `in.(…)` that contain a separator must be double-quoted (with `\` escapes). */
const quoteIn = (v: FilterValue) => {
  const s = String(v);
  return /[,()"\\\s]/.test(s) ? `"${s.replace(/[\\"]/g, "\\$&")}"` : s;
};

/** `R` is the row data: a list (`any[]`) until `single()` / `maybeSingle()` narrows it to one row (`any`). */
export class Query<R = any[]> implements PromiseLike<DbResult<R>> {
  private method: Method = "GET";
  private body: unknown = undefined;
  private readonly params = new URLSearchParams();
  private readonly prefer: string[] = [];
  private mode: "many" | "single" | "maybe" = "many";
  private wantsRows = false; // a mutation that returns the changed rows

  constructor(private readonly base: string, private readonly path: string, private readonly opts: Opts, method: Method = "GET", body?: unknown) {
    this.method = method;
    this.body = body;
  }

  // ── choosing what to return ────────────────────────────────────────────────
  select(columns = "*", o: { count?: "exact" | "planned" | "estimated"; head?: boolean } = {}) {
    // Whitespace outside quotes is meaningless to PostgREST; strip it so column lists can be written freely.
    let inQuote = false;
    const cleaned = [...columns].filter((c) => { if (c === '"') inQuote = !inQuote; return inQuote || !/\s/.test(c); }).join("");
    this.params.set("select", cleaned);
    if (this.method !== "GET" && this.method !== "HEAD") { this.prefer.push("return=representation"); this.wantsRows = true; }
    if (o.head) this.method = "HEAD";
    if (o.count) this.prefer.push(`count=${o.count}`);
    return this;
  }

  // ── filters ────────────────────────────────────────────────────────────────
  filter(column: string, operator: string, value: FilterValue | string) { this.params.append(column, `${operator}.${value}`); return this; }
  eq(c: string, v: FilterValue) { return this.filter(c, "eq", v); }
  neq(c: string, v: FilterValue) { return this.filter(c, "neq", v); }
  gt(c: string, v: FilterValue) { return this.filter(c, "gt", v); }
  gte(c: string, v: FilterValue) { return this.filter(c, "gte", v); }
  lt(c: string, v: FilterValue) { return this.filter(c, "lt", v); }
  lte(c: string, v: FilterValue) { return this.filter(c, "lte", v); }
  like(c: string, pattern: string) { return this.filter(c, "like", pattern); }
  ilike(c: string, pattern: string) { return this.filter(c, "ilike", pattern); }
  is(c: string, v: null | boolean) { return this.filter(c, "is", String(v)); }
  in(c: string, values: readonly FilterValue[]) { return this.filter(c, "in", `(${values.map(quoteIn).join(",")})`); }
  contains(c: string, v: string | readonly unknown[] | Record<string, unknown>) {
    return this.filter(c, "cs", typeof v === "string" ? v : Array.isArray(v) ? `{${v.map((x) => quoteIn(x as FilterValue)).join(",")}}` : JSON.stringify(v));
  }
  not(c: string, operator: string, v: FilterValue | readonly FilterValue[]) {
    return this.filter(c, `not.${operator}`, operator === "in" && Array.isArray(v) ? `(${v.map(quoteIn).join(",")})` : String(v));
  }
  or(filters: string) { this.params.append("or", `(${filters})`); return this; }
  match(query: Record<string, FilterValue>) { for (const [k, v] of Object.entries(query)) this.eq(k, v); return this; }

  // ── shaping ────────────────────────────────────────────────────────────────
  order(column: string, o: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    const dir = o.ascending === false ? "desc" : "asc";
    const nulls = o.nullsFirst === undefined ? "" : o.nullsFirst ? ".nullsfirst" : ".nullslast";
    const prev = this.params.get("order");
    this.params.set("order", `${prev ? prev + "," : ""}${column}.${dir}${nulls}`);
    return this;
  }
  limit(n: number) { this.params.set("limit", String(n)); return this; }
  range(from: number, to: number) { this.params.set("offset", String(from)); this.params.set("limit", String(to - from + 1)); return this; }
  /** Exactly one row, or an error (for updates/deletes the change is rolled back if it isn't exactly one). */
  single() { this.mode = "single"; return this as unknown as Query<any>; }
  /** Zero or one row: `data` is null when nothing matched; more than one row is an error. */
  maybeSingle() { this.mode = "maybe"; return this as unknown as Query<any>; }

  // ── running ────────────────────────────────────────────────────────────────
  then<A = DbResult<R>, B = never>(onfulfilled?: ((v: DbResult<R>) => A | PromiseLike<A>) | null, onrejected?: ((e: unknown) => B | PromiseLike<B>) | null): Promise<A | B> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<DbResult<R>> {
    const headers: Record<string, string> = { ...this.opts.headers };
    if (this.body !== undefined) headers["Content-Type"] = "application/json";
    headers.Accept = this.mode === "single" ? "application/vnd.pgrst.object+json" : "application/json";
    if (this.prefer.length) headers.Prefer = [headers.Prefer, ...this.prefer].filter(Boolean).join(",");
    const qs = this.params.toString();
    const url = `${this.base}/${this.path}${qs ? `?${qs}` : ""}`;
    let res: Response;
    try {
      res = await (this.opts.fetch ?? fetch)(url, { method: this.method, headers, body: this.body === undefined ? undefined : JSON.stringify(this.body) });
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e), code: "" }, count: null, status: 0 };
    }

    const text = this.method === "HEAD" ? "" : await res.text();
    let json: unknown = null;
    if (text) { try { json = JSON.parse(text); } catch { json = null; } }

    if (!res.ok) {
      const e = (json && typeof json === "object" ? json : {}) as Partial<DbError>;
      // 406 from the "exactly one row" Accept header → same code PostgREST documents.
      const message = e.message ?? (res.status === 406 ? "JSON object requested, multiple (or no) rows returned" : res.statusText || "Request failed");
      return { data: null, error: { message, details: e.details, hint: e.hint, code: e.code ?? (res.status === 406 ? "PGRST116" : "") }, count: null, status: res.status };
    }

    let count: number | null = null;
    const range = res.headers.get("content-range");
    if (range) { const total = range.split("/")[1]; if (total && total !== "*") count = Number(total); }

    let data: unknown = json;
    if (this.mode === "maybe" && (this.method === "GET" || this.wantsRows)) {
      const rows = Array.isArray(json) ? json : json === null ? [] : [json];
      if (rows.length > 1) {
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", details: `Results contain ${rows.length} rows, application/vnd.pgrst.object+json requires 1 row`, code: "PGRST116" }, count, status: 406 };
      }
      data = rows[0] ?? null;
    }
    return { data: (data as R) ?? null, error: null, count, status: res.status };
  }
}

/** Bulk writes whose rows have different keys need an explicit column list, or PostgREST rejects them. */
function withColumns<Q extends Query<any>>(q: Q, values: unknown): Q {
  if (Array.isArray(values) && values.length) {
    const cols = [...new Set(values.flatMap((row) => Object.keys(row as object)))];
    if (cols.length) {
      (q as any).params.set("columns", cols.map((c) => `"${c}"`).join(","));
      (q as any).prefer.push("missing=default"); // a key a row leaves out gets the column default, not NULL
    }
  }
  return q;
}

export class RestClient {
  private readonly base: string;
  constructor(url: string, private readonly opts: Opts = {}) { this.base = url.replace(/\/+$/, ""); }

  from(table: string) {
    const t = encodeURIComponent(table);
    return {
      select: (columns?: string, o?: Parameters<Query["select"]>[1]) => new Query(this.base, t, this.opts).select(columns, o),
      insert: (values: unknown) => withColumns(new Query(this.base, t, this.opts, "POST", values), values),
      upsert: (values: unknown, o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) => {
        const q = withColumns(new Query(this.base, t, this.opts, "POST", values), values);
        (q as any).prefer.push(`resolution=${o.ignoreDuplicates ? "ignore" : "merge"}-duplicates`);
        if (o.onConflict) (q as any).params.set("on_conflict", o.onConflict);
        return q;
      },
      update: (values: unknown) => new Query(this.base, t, this.opts, "PATCH", values),
      delete: () => new Query(this.base, t, this.opts, "DELETE"),
    };
  }

  /** Calls a Postgres function: `rpc("name", { arg: value })`. */
  rpc(fn: string, args: Record<string, unknown> = {}, o: { head?: boolean; count?: "exact" | "planned" | "estimated" } = {}) {
    const q = new Query<any>(this.base, `rpc/${encodeURIComponent(fn)}`, this.opts, o.head ? "HEAD" : "POST", o.head ? undefined : args);
    if (o.count) (q as any).prefer.push(`count=${o.count}`);
    return q;
  }
}
