import { LogoMark } from "@/components/logo";

export function AuthCard({ title, subtitle, hashtag, children, wide }: {
  title: string; subtitle?: string; hashtag?: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"} animate-fade-up rounded-3xl border border-white/70 bg-card/90 p-5 shadow-lift backdrop-blur-xl dark:border-white/10 sm:p-9`}>
      <LogoMark tone="tile" className="hidden h-12 w-12 sm:block" />
      <h1 className="font-display text-2xl sm:mt-5 sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      {hashtag ? (
        <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="h-px flex-1 bg-border" />{hashtag}<span className="h-px flex-1 bg-border" />
        </div>
      ) : <div className="h-3 sm:h-6" />}
      {children}
    </div>
  );
}
