"use client";
import { Plus } from "lucide-react";

/** Scrolls to the "New paper" card and focuses its title field. */
export function NewPaperButton({ label }: { label: string }) {
  return (
    <button type="button"
      onClick={() => {
        const card = document.getElementById("new");
        card?.scrollIntoView({ behavior: "smooth", block: "start" });
        const input = card?.querySelector<HTMLInputElement>('input[name="title"]');
        if (input) {
          window.setTimeout(() => input.focus({ preventScroll: true }), 350);
          card?.classList.add("ring-2", "ring-primary/50");
          window.setTimeout(() => card?.classList.remove("ring-2", "ring-primary/50"), 1600);
        }
      }}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:-translate-y-px">
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}
