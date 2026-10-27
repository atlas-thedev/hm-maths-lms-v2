import "server-only";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { asRole, asService } from "./pg";
import { hmacHex, type Claims } from "./jwt";

export const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage-data");
type Err = { message: string; statusCode?: string };

export function safeObjectPath(bucket: string, name: string): string | null {
  if (!/^[a-z0-9-]+$/.test(bucket)) return null;
  if (!name || name.includes("..") || name.startsWith("/") || name.includes("\\") || name.includes("\0")) return null;
  const full = path.join(STORAGE_DIR, bucket, name);
  return full.startsWith(path.join(STORAGE_DIR, bucket) + path.sep) ? full : null;
}

/** Real file type from the first bytes — never trust the browser's claimed type or the file name. */
const SNIFF: { mime: string; exts: string[]; test: (b: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", exts: ["pdf"], test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/png", exts: ["png"], test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", exts: ["jpg", "jpeg"], test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", exts: ["webp"], test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];
export function sniffType(bytes: Uint8Array) { return SNIFF.find((t) => bytes.length >= 12 && t.test(bytes)) ?? null; }
/** Folder segments + file name: letters, digits, "_", "-", "." only; single allowed extension. */
const NAME_RE = /^([A-Za-z0-9_-]{1,64}\/){0,4}[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}\.(pdf|png|jpe?g|webp)$/i;

const enc = (name: string) => name.split("/").map(encodeURIComponent).join("/");

export async function signedUrl(bucket: string, name: string, expiresIn: number, download?: boolean) {
  const exp = Math.floor(Date.now() / 1000) + Math.max(10, expiresIn);
  const sig = await hmacHex(`${bucket}/${name}:${exp}`);
  return `/api/storage/object/${bucket}/${enc(name)}?exp=${exp}&sig=${sig}${download ? "&download=1" : ""}`;
}
export const publicUrl = (bucket: string, name: string) => `/api/storage/public/${bucket}/${enc(name)}`;

/** File bucket API (upload / remove / signed urls), authorised by the storage.objects RLS policies. */
export function bucketApi(claims: Claims | null, bucket: string) {
  return {
    async upload(name: string, body: ArrayBuffer | Uint8Array | Blob, opts?: { contentType?: string; upsert?: boolean }): Promise<{ data: { path: string } | null; error: Err | null }> {
      const full = safeObjectPath(bucket, name);
      if (!full) return { data: null, error: { message: "Invalid file path" } };
      if (!NAME_RE.test(name)) return { data: null, error: { message: "Invalid file name", statusCode: "400" } };
      const bytes = body instanceof Blob ? new Uint8Array(await body.arrayBuffer()) : body instanceof Uint8Array ? body : new Uint8Array(body);
      const sniffed = sniffType(bytes);
      const ext = name.split(".").pop()!.toLowerCase();
      if (!sniffed || !sniffed.exts.includes(ext)) return { data: null, error: { message: "Only real PDF, JPG, PNG or WEBP files are allowed", statusCode: "415" } };
      const type = sniffed.mime;
      const [b] = await asService(async (c) => (await c.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = $1", [bucket])).rows);
      if (!b) return { data: null, error: { message: "Bucket not found" } };
      if (b.file_size_limit && bytes.byteLength > Number(b.file_size_limit)) return { data: null, error: { message: "The file is too large", statusCode: "413" } };
      if (b.allowed_mime_types?.length && !b.allowed_mime_types.includes(type)) return { data: null, error: { message: `File type ${type} is not allowed`, statusCode: "415" } };
      try {
        await asRole(claims, async (c) => {
          if (opts?.upsert) await c.query("delete from storage.objects where bucket_id = $1 and name = $2", [bucket, name]);
          await c.query("insert into storage.objects (bucket_id, name, owner, metadata) values ($1, $2, $3, $4)",
            [bucket, name, claims?.sub ?? null, JSON.stringify({ mimetype: type, size: bytes.byteLength })]);
          await mkdir(path.dirname(full), { recursive: true });
          await writeFile(full, bytes);
        });
      } catch (e) {
        const msg = (e as { code?: string; message?: string });
        if (msg.code === "23505") return { data: null, error: { message: "The resource already exists", statusCode: "409" } };
        if (msg.code === "42501") return { data: null, error: { message: "new row violates row-level security policy", statusCode: "403" } };
        return { data: null, error: { message: msg.message ?? "Upload failed" } };
      }
      return { data: { path: name }, error: null };
    },

    async remove(names: string[]): Promise<{ data: { name: string }[] | null; error: Err | null }> {
      try {
        const rows = await asRole(claims, async (c) =>
          (await c.query("delete from storage.objects where bucket_id = $1 and name = any($2) returning name", [bucket, names])).rows as { name: string }[]);
        for (const r of rows) { const f = safeObjectPath(bucket, r.name); if (f) await unlink(f).catch(() => {}); }
        return { data: rows, error: null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } };
      }
    },

    async createSignedUrls(names: string[], expiresIn: number, opts?: { download?: boolean }) {
      try {
        const visible = new Set(await asRole(claims, async (c) =>
          (await c.query("select name from storage.objects where bucket_id = $1 and name = any($2)", [bucket, names])).rows.map((r) => r.name as string)));
        const data = await Promise.all(names.map(async (n) => visible.has(n)
          ? { path: n, signedUrl: await signedUrl(bucket, n, expiresIn, opts?.download), error: null }
          : { path: n, signedUrl: "", error: "Object not found" }));
        return { data, error: null as Err | null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } };
      }
    },

    async createSignedUrl(name: string, expiresIn: number, opts?: { download?: boolean }) {
      const { data, error } = await this.createSignedUrls([name], expiresIn, opts);
      if (error || !data?.[0]?.signedUrl) return { data: null, error: error ?? { message: "Object not found" } };
      return { data: { signedUrl: data[0].signedUrl }, error: null };
    },

    getPublicUrl(name: string) {
      return { data: { publicUrl: publicUrl(bucket, name) } };
    },
  };
}

export async function fileExists(full: string) {
  try { return (await stat(full)).isFile(); } catch { return false; }
}
