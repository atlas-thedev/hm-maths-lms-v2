"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Small "copy to clipboard" button (Student ID, bank reference…). */
export function CopyButton({ value, className, label = false }: { value: string; className?: string; label?: boolean }) {
  const t = useT("common.copy");
  const [done, setDone] = useState(false);
  async function copy() {
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch { /* not available: in-app browsers, http, old phones */ }
    if (!ok) ok = legacyCopy(value);
    if (ok) {
      setDone(true);
      toast.success(t("copied"));
      setTimeout(() => setDone(false), 1800);
    } else {
      toast(value); // last resort: show it so the student can long-press and copy by hand
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t("copy")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md text-xs font-semibold transition",
        label ? "h-9 px-3" : "h-9 w-9 justify-center",
        done ? "text-success-soft-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label ? <span>{done ? t("copied") : t("copy")}</span> : null}
    </button>
  );
}

/** Old-style copy for browsers without the Clipboard API (Facebook / WhatsApp in-app browsers, older iOS). */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
