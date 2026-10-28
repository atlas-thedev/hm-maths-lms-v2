"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label, className }: { label: string; className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className ?? "h-9 gap-1.5 text-xs font-medium"}
      onClick={() => window.print()}
    >
      <Printer className="h-3.5 w-3.5 text-muted-foreground" /> {label}
    </Button>
  );
}
