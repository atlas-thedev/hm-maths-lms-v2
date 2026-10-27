import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Images, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, EmptyState, PageHeader, buttonVariants, cardVariants } from "@/components/ui";
import { getAlbumCards } from "@/lib/gallery-data";
import { cn } from "@/lib/utils";
import { getFormat, getT } from "@/i18n/server";
import { AlbumForm } from "./gallery-forms";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("gallery") };
}

export default async function AdminGalleryPage() {
  const { db } = await requireAdmin();
  const [t, f, albums] = await Promise.all([getT("admin.gallery"), getFormat(), getAlbumCards(db)]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Images}>
        <Link href="/gallery" target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}><Eye /> {t("viewPublic")}</Link>
      </PageHeader>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {!albums.length ? <EmptyState icon={Images} title={t("empty")} description={t("emptyText")} /> : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {albums.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/gallery/${a.id}`} className={cn(cardVariants({ variant: "interactive" }), "group block overflow-hidden")}>
                    <div className="relative aspect-[4/3] bg-muted">
                      {a.cover ? <Image src={a.cover} alt="" fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover transition duration-500 group-hover:scale-105" />
                        : <span className="absolute inset-0 grid place-items-center text-muted-foreground"><Images className="h-10 w-10" /></span>}
                      {!a.is_published && <Badge variant="warning" className="absolute left-2 top-2 shadow"><EyeOff /> {t("hidden")}</Badge>}
                    </div>
                    <div className="space-y-1 p-3.5">
                      <p className="line-clamp-1 font-display font-bold">{a.title}</p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <Badge variant="secondary">{t(`categories.${a.category}`)}</Badge>
                        <span>{t("photosN", { n: a.count })}</span>
                        {a.taken_on && <span>· {f.date(a.taken_on)}</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader icon={Plus} title={t("new")} description={t("newHint")} />
          <CardContent><AlbumForm /></CardContent>
        </Card>
      </div>
    </div>
  );
}
