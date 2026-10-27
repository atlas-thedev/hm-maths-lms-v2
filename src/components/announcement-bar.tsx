"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Megaphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneSoft, toneBorder, type Tone } from "@/components/ui/tone";
import { useT } from "@/i18n/client";

export type Announcement = { text: string; link?: string; tone: "info" | "success" | "warning" | "danger" | "brand" };

/** Site-wide banner (Developer panel → Site controls). Students can hide it; a new message shows again. */
export function AnnouncementBar({ text, link, tone }: Announcement) {
  const t = useT("common");
  const key = `hm_ann_${hash(text)}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => { try { setHidden(localStorage.getItem(key) === "1"); } catch { setHidden(false); } }, [key]);
  if (hidden || !text) return null;
  const tn = tone as Tone;
  return (
    <div role="status" className={cn("mb-4 flex items-start gap-3 rounded-2xl border p-3 text-sm", toneSoft[tn], toneBorder[tn])} data-testid="announcement">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 whitespace-pre-line font-medium">
        {text}
        {link ? <Link href={link} className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2">{t("actions.open")} <ArrowRight className="h-3.5 w-3.5" /></Link> : null}
      </p>
      <button type="button" aria-label={t("actions.close")} onClick={() => { setHidden(true); try { localStorage.setItem(key, "1"); } catch { /* private mode */ } }}
        className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
