"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function scorePassword(p: string) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++;
  return Math.max(1, s);
}

export function PasswordInput({ meter, onValue, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { meter?: boolean; onValue?: (v: string) => void }) {
  const t = useT("auth");
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const score = scorePassword(value);
  const labels = t.raw<string[]>("register.strength") ?? [];
  const colors = ["bg-destructive", "bg-brand-500", "bg-warning", "bg-success"];
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input {...props} type={show ? "text" : "password"} className={cn("pr-11", className)}
          onChange={(e) => { setValue(e.target.value); onValue?.(e.target.value); props.onChange?.(e); }} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("password.hide") : t("password.show")}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {meter ? (
        <div>
          <div className="grid grid-cols-4 gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-colors", value && i < score ? colors[score - 1] : "bg-muted")} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{value ? <b className="font-semibold text-foreground">{labels[score - 1]} · </b> : null}{t("register.strengthHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
