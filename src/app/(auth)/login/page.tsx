import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";
import { Sticker } from "@/components/sticker";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("auth.login"))("metaTitle") };
}

/** Students sign in with their mobile number or Student ID + password (no third-party sign-in). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, t] = await Promise.all([searchParams, getT("auth.login")]);
  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-3 flex justify-center sm:mb-4"><Sticker name="wave" size={56} /></div>
      <LoginForm next={next} />
    </AuthCard>
  );
}
