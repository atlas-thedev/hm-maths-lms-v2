"use client";
import { RestClient } from "./rest";

/**
 * Browser client. Database calls go through the app's /api/rest proxy, which attaches the
 * httpOnly session token server-side (so RLS applies); uploads go to /api/storage/upload.
 */
export function createClient() {
  const base = typeof window === "undefined" ? "http://localhost/api/rest" : `${window.location.origin}/api/rest`;
  const rest = new RestClient(base, { fetch: (i, init) => fetch(i, { ...init, credentials: "same-origin" }) });
  return {
    from: rest.from.bind(rest),
    rpc: rest.rpc.bind(rest),
    storage: {
      from: (bucket: string) => ({
        async upload(path: string, file: File | Blob, opts?: { contentType?: string; upsert?: boolean }) {
          const fd = new FormData();
          fd.set("bucket", bucket);
          fd.set("path", path);
          if (opts?.upsert) fd.set("upsert", "1");
          fd.set("file", opts?.contentType && file instanceof File ? new File([file], file.name, { type: opts.contentType }) : file);
          try {
            const res = await fetch("/api/storage/upload", { method: "POST", body: fd, credentials: "same-origin" });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) return { data: null, error: { message: j.error ?? `Upload failed (${res.status})` } };
            return { data: { path: j.path as string }, error: null };
          } catch (e) {
            return { data: null, error: { message: (e as Error).message } };
          }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `/api/storage/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}` } };
        },
      }),
    },
  };
}
