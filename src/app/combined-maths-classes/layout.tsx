import { PublicShell } from "@/components/landing/public-shell";

export default function CentersLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
