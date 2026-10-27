"use client";
import Link from "next/link";
import { useState } from "react";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { Field, Input, buttonVariants } from "@/components/ui";
import { useT } from "@/i18n/client";
import { cn, whatsappLink } from "@/lib/utils";

export function ForgotHelp({ whatsapp, phone }: { whatsapp: string; phone: string }) {
  const t = useT("auth.forgot");
  const [id, setId] = useState("");
  const wa = whatsappLink(whatsapp, t("waText", { id: id.trim() || "—" }));
  const steps = t.raw<string[]>("steps") ?? [];
  return (
    <div className="space-y-5">
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
            <span className="pt-0.5 text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>
      <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")}>
        <Input id="identifier" value={id} onChange={(e) => setId(e.target.value)} placeholder={t("identifierPlaceholder")} inputMode="text" autoComplete="username" />
      </Field>
      <div className="grid gap-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg", block: true }), "bg-whatsapp text-white hover:bg-whatsapp/90")}>
            <WhatsAppIcon className="h-5 w-5" /> {t("whatsapp")}
          </a>
        )}
        <a href={`tel:${phone.replace(/\s/g, "")}`} className={buttonVariants({ variant: "outline", size: "lg", block: true })}>
          <Phone /> {t("call", { phone })}
        </a>
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("staffNote")}</p>
      <Link href="/login" className="block text-center text-sm font-semibold text-primary hover:underline">{t("backToLogin")}</Link>
    </div>
  );
}
