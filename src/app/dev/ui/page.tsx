import { AlertTriangle, BookOpen, CheckCircle2, CreditCard, FileText, Info, Radio, ShoppingBag, Star, Trophy, Wallet } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { LogoMark } from "@/components/logo";
import { BRAND } from "@/config/brand";
import {
  ActionCard, Alert, Avatar, Badge, Button, ButtonLink, Card, CardAction, CardContent, CardHeader, CardSubheading, ChipButton, ChipGroup, ChipLink,
  CountBadge, EmptyState, SkeletonGrid, SkeletonRows, SkeletonStats, HeroCard, HeroChip, HeroPanel, IconTile, Input, ListRow, MetricTile, PageHeader, ProgressBar, Select, StatCard, type Tone,
} from "@/components/ui";

export const metadata = { title: "UI kit", robots: { index: false, follow: false } };

const TONES: Tone[] = ["brand", "success", "warning", "danger", "info", "highlight", "neutral", "dark"];
const SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * Living style guide for staff: every UI-library component in every tone.
 * Colours: src/theme/theme.css · Name & logo: src/config/brand.ts · Components: src/components/ui
 */
export default async function UiKitPage() {
  await requireDeveloper();
  return (
    <div className="space-y-8">
      <PageHeader title="UI kit" description="Every component in the HM Maths UI library. Every component in every tone. Colours follow the theme set in Theme &amp; colours (or src/theme/theme.css); logo and name live in src/config/brand.ts." />

      <Section title="Brand">
        <div className="flex flex-wrap items-center gap-4">
          <LogoMark tone="tile" className="h-14 w-14" />
          <LogoMark className="h-12 w-12" />
          <div><p className="font-display text-xl font-bold">{BRAND.name}</p><p className="text-sm text-muted-foreground">{BRAND.fullName}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1 sm:grid-cols-11">
          {SCALE.map((k) => (
            <div key={k} className="text-center text-[10px] text-muted-foreground">
              <div className="h-10 rounded-lg ring-1 ring-black/5" style={{ background: `hsl(var(--brand-${k}))` }} />{k}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["bg-gradient-brand", "bg-gradient-dark", "bg-gradient-brand-soft", "bg-class-revision"].map((g) => (
            <div key={g} className={`grid h-16 place-items-center rounded-xl text-xs font-semibold ${g} ${g.includes("soft") ? "text-foreground" : "text-white"}`}>{g}</div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          {(["default", "secondary", "outline", "ghost", "soft", "success", "destructive", "danger-soft", "gradient", "link"] as const).map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
          <Button size="sm">Small</Button><Button size="lg">Large</Button><Button size="icon" aria-label="Star"><Star /></Button>
          <ButtonLink href="/dev/ui">Button link</ButtonLink>
        </div>
        <div className="mt-3 rounded-2xl bg-gradient-brand p-4"><Button variant="inverse">Inverse (on brand)</Button></div>
      </Section>

      <Section title="Tones, badges, icon tiles, chips">
        <div className="flex flex-wrap gap-2">
          {(["default", "solid", "secondary", "outline", "success", "warning", "destructive", "info", "highlight"] as const).map((v) => <Badge key={v} variant={v}>{v}</Badge>)}
          <CountBadge count={7} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {TONES.map((t) => <div key={t} className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground"><IconTile icon={Star} tone={t} /><IconTile icon={Star} tone={t} variant="solid" />{t}</div>)}
          <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground"><IconTile sticker="star" size="lg" />sticker</div>
        </div>
        <ChipGroup className="mt-4">
          <ChipLink href="/dev/ui" active>Active chip</ChipLink><ChipLink href="/dev/ui">Chip link</ChipLink><ChipButton>Chip button</ChipButton>
        </ChipGroup>
      </Section>

      <Section title="Alerts & progress">
        <div className="space-y-2">
          <Alert>Info, something worth knowing.</Alert>
          <Alert variant="success">Saved successfully.</Alert>
          <Alert variant="warning">Waiting for approval.</Alert>
          <Alert variant="error">Slip rejected, please upload again.</Alert>
        </div>
        <div className="mt-4 space-y-2">{(["brand", "success", "warning", "info"] as Tone[]).map((t, i) => <ProgressBar key={t} value={30 + i * 20} tone={t} />)}</div>
      </Section>

      <Section title="Cards">
        <HeroCard symbol="∑">
          <p className="text-sm text-white/90">HeroCard</p>
          <h3 className="font-display text-2xl font-extrabold">Welcome back</h3>
          <div className="mt-3 flex flex-wrap gap-2"><HeroChip>Panadura</HeroChip><HeroChip>2027 A/L</HeroChip></div>
          <HeroPanel className="mt-4 max-w-xs"><p className="text-sm">HeroPanel</p><ButtonLink href="/dev/ui" variant="inverse" size="sm" className="mt-2">Join now</ButtonLink></HeroPanel>
        </HeroCard>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ActionCard href="/dev/ui" title="My Classes" description="1 active this month" sticker="binders" />
          <ActionCard href="/dev/ui" title="Papers" description="3 papers sat" icon={FileText} />
          <StatCard label="Total paid" value="LKR 8,800" icon={Wallet} hint="3 payments" />
          <StatCard label="Pending" value="2" icon={AlertTriangle} tone="warning" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ActionCard layout="row" href="/dev/ui" title="Store & orders" description="Row layout" icon={ShoppingBag} tone="info" />
          <MetricTile icon={Trophy} tone="warning" label="All-island" value="#6" sub="of 120 students" />
        </div>
        <Card className="mt-3">
          <CardHeader sticker="mailbox" title="Card with header" description="CardHeader + CardAction" action={<CardAction href="/dev/ui">View all</CardAction>} />
          <CardContent className="space-y-2">
            <CardSubheading icon={CreditCard}>List rows</CardSubheading>
            <ListRow icon={Radio} tone="danger" title="Live: Vectors" subtitle="Today, 5:00 PM" href="/dev/ui" />
            <ListRow icon={BookOpen} tone="brand" title="2027 Theory · October" trailing={<Badge variant="success">Approved</Badge>} />
            <ListRow leading={<Avatar name="Kavindu Perera" />} title="Kavindu Perera" subtitle="20275147" trailing={<CheckCircle2 className="h-4 w-4 text-success-soft-foreground" />} />
          </CardContent>
        </Card>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Card variant="muted" padding="md">muted</Card><Card variant="outline" padding="md">outline</Card><Card variant="brand" padding="md">brand</Card>
        </div>
      </Section>

      <Section title="Loading skeletons">
        <p className="mb-3 text-sm text-muted-foreground">Each page has a <code>loading.tsx</code> that shows one of these presets while its data loads: dashboard, overview, stats, list, grid, detail, form, board.</p>
        <div className="space-y-4"><SkeletonStats n={2} /><SkeletonRows n={2} /><SkeletonGrid n={2} /></div>
      </Section>

      <Section title="Forms">
        <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Input" /><Select defaultValue=""><option value="">Select</option></Select></div>
      </Section>

      <EmptyState icon={Info} title="EmptyState" description="Shown when a list has nothing yet." />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      <Card padding="md">{children}</Card>
    </section>
  );
}
