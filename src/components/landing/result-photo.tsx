"use client";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** A portrait or compact avatar, with a placeholder for missing or unavailable photos. */
export function ResultPhoto({ src, name, variant = "portrait" }: { src: string; name: string; variant?: "portrait" | "avatar" }) {
  const [brokenSrc, setBrokenSrc] = useState("");
  const avatar = variant === "avatar";
  return <div className={cn("relative overflow-hidden bg-brand-50 text-brand-400", avatar ? "h-12 w-12 shrink-0 rounded-full ring-2 ring-white" : "aspect-[4/5]")}>
    {src && brokenSrc !== src ? <Image src={src} alt={name} fill sizes={avatar ? "48px" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 280px"} className="object-cover" onError={() => setBrokenSrc(src)} /> : <div className="grid h-full place-items-center" role="img" aria-label={name}><UserRound className={avatar ? "h-6 w-6" : "h-16 w-16"} aria-hidden /></div>}
  </div>;
}
