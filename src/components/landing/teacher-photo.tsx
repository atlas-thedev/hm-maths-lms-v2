"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Rotate once per page load, not during a visit. Remember the actual URL so edits to the list are safe. */
export function TeacherPhoto({ photos, fallback, fallbackIsReal, alt }: { photos: string[]; fallback: string; fallbackIsReal: boolean; alt: string }) {
  const [src, setSrc] = useState(photos[0] || fallback);
  const chosen = useRef(false);
  useEffect(() => {
    if (chosen.current || !photos.length) return;
    chosen.current = true;
    try {
      const last = sessionStorage.getItem("hm-teacher-portrait");
      const i = photos.indexOf(last || "");
      const next = photos[i < 0 ? 0 : (i + 1) % photos.length];
      sessionStorage.setItem("hm-teacher-portrait", next);
      setSrc(next);
    } catch { setSrc(photos[Math.floor(Math.random() * photos.length)]); }
  }, [photos]);
  return <Image src={src} alt={alt} width={800} height={1000} onError={() => { if (src !== fallback) setSrc(fallback); }} className={`w-full object-cover ${photos.length || fallbackIsReal ? "aspect-[4/5]" : "aspect-square"}`} />;
}
