"use client";
import { useState } from "react";
import { Megaphone, Power, UserPlus } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Alert, Badge, Card, CardContent, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AccessSettings, AnnouncementSettings, MaintenanceSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { saveAccessAction, saveAnnouncementAction, saveMaintenanceAction } from "../actions";

/** Big on/off switch row. */
function Switch({ name, checked, onChange, label, hint, danger }: { name: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; danger?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition", checked && (danger ? "border-destructive/40 bg-destructive-soft/60" : "border-primary/30 bg-accent/60"))}>
      <span className="min-w-0"><span className="block font-semibold">{label}</span>{hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}</span>
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? (danger ? "bg-destructive" : "bg-primary") : "bg-input")}>
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </span>
    </label>
  );
}

/** "2026-10-23T09:00:00.000Z" → value for <input type="datetime-local"> in the viewer's time zone. */
const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function MaintenanceForm({ initial }: { initial: MaintenanceSettings }) {
  const [on, setOn] = useState(initial.enabled);
  return (
    <Card className={cn(on && "ring-2 ring-destructive/30")}>
      <CardHeader icon={Power} title="Maintenance mode" action={<Badge variant={initial.enabled ? "destructive" : "secondary"}>{initial.enabled ? "ON now" : "Off now"}</Badge>}
        description="Visitors and students see a maintenance screen. Staff (admins, owners, developers) keep full access, and the sign-in page stays open." />
      <CardContent>
        <ActionForm action={saveMaintenanceAction} className="space-y-4">
          <Switch name="enabled" checked={on} onChange={setOn} danger label="Turn on maintenance mode" hint="Takes effect on the next page load for everyone." />
          <Field label="Message on the maintenance screen" htmlFor="m-message" hint="Leave empty for the default message (shown in English or Sinhala).">
            <Textarea id="m-message" name="message" defaultValue={initial.message} maxLength={600} placeholder="We're upgrading the class portal. Back soon!" />
          </Field>
          <Field label="Expected back (optional)" htmlFor="m-until">
            <Input id="m-until" name="until" type="datetime-local" defaultValue={toLocalInput(initial.until)} />
          </Field>
          {on && <Alert variant="warning">Students won't be able to use the site until you turn this off.</Alert>}
          <SubmitButton block variant={on ? "destructive" : "default"} pendingText="Saving…">{on ? "Save, maintenance ON" : "Save, site open"}</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

export function AnnouncementForm({ initial }: { initial: AnnouncementSettings }) {
  const [on, setOn] = useState(initial.enabled);
  const [text, setText] = useState(initial.text);
  const [tone, setTone] = useState(initial.tone);
  return (
    <Card>
      <CardHeader icon={Megaphone} title="Announcement banner" description="A banner at the top of the student and admin pages. People can close it; a new message shows again." />
      <CardContent>
        <ActionForm action={saveAnnouncementAction} className="space-y-4">
          <Switch name="enabled" checked={on} onChange={setOn} label="Show the banner" />
          <Field label="Message" htmlFor="a-text"><Textarea id="a-text" name="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Model paper this Saturday at 9 AM, bring your calculator!" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Colour" htmlFor="a-tone">
              <Select id="a-tone" name="tone" value={tone} onChange={(e) => setTone(e.target.value as AnnouncementSettings["tone"])}>
                <option value="info">Blue (info)</option><option value="brand">Brand</option><option value="success">Green</option><option value="warning">Amber</option><option value="danger">Red (urgent)</option>
              </Select>
            </Field>
            <Field label="Who sees it" htmlFor="a-aud">
              <Select id="a-aud" name="audience" defaultValue={initial.audience}><option value="all">Everyone</option><option value="students">Students only</option><option value="staff">Staff only</option></Select>
            </Field>
            <Field label="Link (optional)" htmlFor="a-link"><Input id="a-link" name="link" defaultValue={initial.link} placeholder="/dashboard/events" /></Field>
          </div>
          {text && <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">Preview</p><AnnouncementBar text={text} tone={tone} /></div>}
          <SubmitButton block pendingText="Saving…">Save banner</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

export function AccessForm({ initial }: { initial: AccessSettings }) {
  const [open, setOpen] = useState(initial.registrationOpen);
  return (
    <Card>
      <CardHeader icon={UserPlus} title="Student sign-ups" description="Close sign-ups to pause new registrations. Existing students can still sign in." />
      <CardContent>
        <ActionForm action={saveAccessAction} className="space-y-4">
          <Switch name="registrationOpen" checked={open} onChange={setOpen} label="Allow new sign-ups" />
          {!open && (
            <Field label="Message on the sign-up page (optional)" htmlFor="r-msg">
              <Textarea id="r-msg" name="registrationClosedMessage" defaultValue={initial.registrationClosedMessage} maxLength={400} placeholder="2027 batch registrations open on 1 November." />
            </Field>
          )}
          <SubmitButton block pendingText="Saving…">Save</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
