"use client";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState } from "react";

export function ResultPhoto({ src, name }: { src: string; name: string }) {
  const [broken, setBroken] = useState(false);
  return <div className="relative aspect-[4/5] overflow-hidden bg-brand-50 text-brand-400">
    {src && !broken ? <Image src={src} alt={name} fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover" onError={() => setBroken(true)} /> : <div className="grid h-full place-items-center" aria-label={name}><UserRound className="h-16 w-16" aria-hidden /></div>}
  </div>;
}
