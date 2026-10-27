import Image from "next/image";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BankDetails } from "@/components/bank-details";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/lib/types";
import { formatLKR } from "@/lib/utils";
import { getT } from "@/i18n/server";
import { OrderForm } from "./order-form";

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { db, user, profile } = await requireUser();
  const defaultAddress = [profile.address, [profile.city, profile.postal_code].filter(Boolean).join(" ")].filter(Boolean).join("\n");
  const t = await getT("portal.order");
  const { data } = await db.from("products").select("*").eq("id", productId).eq("is_active", true).maybeSingle();
  if (!data) notFound();
  const p = data as Product;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
          <div className="relative aspect-[16/9] bg-gradient-brand">
            {p.image_url ? <Image src={p.image_url} alt={p.title} fill className="object-cover" sizes="800px" /> :
              <Package className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/40" />}
          </div>
          <div className="p-5">
            <h1 className="font-display text-2xl font-bold">{p.title}</h1>
            {p.description && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{p.description}</p>}
            <p className="mt-3 font-display text-xl font-bold">{formatLKR(p.price)}</p>
          </div>
        </div>
        <Card><CardContent className="pt-5 sm:pt-5"><BankDetails amount={t("amount", { price: formatLKR(p.price) })} /></CardContent></Card>
      </div>
      <Card className="lg:sticky lg:top-20 lg:self-start">
        <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
        <CardContent><OrderForm productId={p.id} userId={user.id} defaultAddress={defaultAddress} /></CardContent>
      </Card>
    </div>
  );
}
