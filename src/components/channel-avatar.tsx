import Image from "next/image";
import { TelegramGlyph, WhatsAppIcon } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

/** Round channel picture with the Telegram / WhatsApp badge. Without a picture the app icon fills the circle. */
export function ChannelAvatar({ image, kind, className, ring = "ring-white", badgeBg = "bg-white" }: { image: string; kind: "telegram" | "whatsapp"; className?: string; ring?: string; badgeBg?: string }) {
  return (
    <span className="relative shrink-0">
      {image
        ? <Image src={image} alt="" width={56} height={56} className={cn("h-14 w-14 rounded-full object-cover shadow ring-2", ring, className)} />
        : <span className={cn("grid h-14 w-14 place-items-center rounded-full bg-muted shadow ring-2", ring, className)}>{kind === "telegram" ? <TelegramGlyph className="h-7 w-7" /> : <WhatsAppIcon className="h-7 w-7" />}</span>}
      <span className={cn("absolute -bottom-0.5 -right-0.5 rounded-full p-0.5", badgeBg)}>{kind === "telegram" ? <TelegramGlyph className="h-4 w-4" /> : <WhatsAppIcon className="h-4 w-4" />}</span>
    </span>
  );
}
