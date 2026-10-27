import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Images } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, EmptyState, buttonVariants } from "@/components/ui";
import { getAlbum } from "@/lib/gallery-data";
import { getT } from "@/i18n/server";
import { AlbumForm, DeleteAlbumButton, PhotoTile, PhotoUploader } from "../gallery-forms";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("gallery") };
}

export default async function AdminAlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const { db } = await requireAdmin();
  const [t, found] = await Promise.all([getT("admin.gallery"), getAlbum(db, albumId)]);
  if (!found) notFound();
  const { album, photos } = found;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/gallery" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
        <div className="flex gap-2">
          {album.is_published && <Link href={`/gallery/${album.id}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}><Eye /> {t("viewPublic")}</Link>}
          <DeleteAlbumButton id={album.id} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold">{album.title}</h1>
        <Badge variant="secondary">{t(`categories.${album.category}`)}</Badge>
        {!album.is_published && <Badge variant="warning">{t("hidden")}</Badge>}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <PhotoUploader albumId={album.id} />
          {!photos.length ? <EmptyState icon={Images} title={t("noPhotos")} description={t("noPhotosText")} /> : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {photos.map((p, i) => <PhotoTile key={p.id} photo={p} isCover={i === 0} />)}
            </ul>
          )}
        </div>
        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader title={t("details")} />
          <CardContent><AlbumForm album={album} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
