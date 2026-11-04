import Image from "next/image";
import Link from "next/link";
import { Award, Camera } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Badge, Card, CardContent, CardHeader, Field, Input, PageHeader, SubmitButton } from "@/components/ui";
import { requireDeveloper } from "@/lib/auth";
import { getStudentResults, getTeacherPortraits, type StudentResult } from "@/lib/public-results";
import { addPortraitAction, deletePortraitAction, deleteResultAction, saveResultAction } from "./actions";

export const metadata = { title: "Results & teacher photos" };
export const dynamic = "force-dynamic";

function ResultForm({ result }: { result?: StudentResult }) {
  const id = result?.id ?? "new";
  return <ActionForm action={saveResultAction} resetOnSuccess={!result} className="space-y-4">
    {result && <input type="hidden" name="id" value={result.id} />}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Student name" htmlFor={`name-${id}`}><Input id={`name-${id}`} name="name" required maxLength={120} defaultValue={result?.name} /></Field>
      <Field label="A/L exam year" htmlFor={`year-${id}`}><Input id={`year-${id}`} name="exam_year" type="number" min={1900} max={2100} required defaultValue={result?.exam_year} /></Field>
      <Field label="Exam index number (optional)" htmlFor={`number-${id}`}><Input id={`number-${id}`} name="exam_number" maxLength={40} defaultValue={result?.exam_number} /></Field>
      <Field label="Grades / results" htmlFor={`grades-${id}`} hint="For example: A A B"><Input id={`grades-${id}`} name="grades" required maxLength={80} defaultValue={result?.grades} /></Field>
    </div>
    <Field label="Special achievement (optional)" htmlFor={`distinction-${id}`} hint="For example: Colombo District Rank 1. Filling this makes the result a large featured card."><Input id={`distinction-${id}`} name="distinction" maxLength={120} defaultValue={result?.distinction} /></Field>
    <div><p className="mb-2 text-sm font-semibold">Student photo (optional)</p><FileUpload bucket="public-results" prefix="students" name="photo_url" publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} defaultValue={result?.photo_url} />
      {result?.photo_url && <label className="mt-2 flex gap-2 text-sm"><input type="checkbox" name="remove_photo" /> Remove photo and use placeholder</label>}</div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={result?.is_published ?? false} className="mt-1" /> Publish on the public results page</label>
    <SubmitButton pendingText="Saving…">{result ? "Save changes" : "Add result"}</SubmitButton>
  </ActionForm>;
}
export default async function DevResultsPage() {
  const { db } = await requireDeveloper();
  const [results, portraits] = await Promise.all([getStudentResults(db, true), getTeacherPortraits(db)]);
  return <div className="space-y-6">
    <PageHeader title="Results & teacher photos" description="Manage the public results page and rotating photos in the About the teacher section." />
    <p className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">Published results and index numbers are public. Uploaded photos use public links even for drafts and may remain cached after removal; only upload and publish with the student’s permission.</p>
    <Card><CardHeader icon={Camera} title="Teacher photos" description="Upload multiple portraits. A different photo appears on each refresh in the same browser tab. If there are none, the Brand & SEO teacher photo is used." /><CardContent className="space-y-4">
      <ActionForm action={addPortraitAction} resetOnSuccess className="space-y-3"><FileUpload bucket="public-results" prefix="teacher" name="photo_url" publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} label="Upload teacher photo" /><SubmitButton pendingText="Adding…">Add photo</SubmitButton></ActionForm>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{portraits.map((p) => <div key={p.id} className="space-y-2 rounded-xl border p-2"><div className="relative aspect-[4/5] overflow-hidden rounded-lg"><Image src={p.photo_url} alt="Teacher portrait" fill sizes="200px" className="object-cover" /></div><ActionForm action={deletePortraitAction} confirm="Remove this teacher photo from rotation?"><input type="hidden" name="id" value={p.id} /><SubmitButton variant="outline" size="sm">Remove</SubmitButton></ActionForm></div>)}</div>
    </CardContent></Card>
    <Card><CardHeader icon={Award} title="Add a student result" description="Add a distinction for a prominent featured result; leave it blank for a regular result. New results start unpublished." /><CardContent><ResultForm /></CardContent></Card>
    <Card><CardHeader icon={Award} title={`Manage results (${results.length})`} description="Edit, publish, unpublish or delete results. Photo uploads are optional." /><CardContent className="space-y-3">
      <Link href="/results" className="text-sm font-semibold text-primary underline">View public results page ↗</Link>
      {results.length === 0 && <p className="text-sm text-muted-foreground">No results added yet.</p>}
      {results.map((r) => <details key={r.id} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{r.name} · {r.exam_year} · {r.grades} <Badge variant={r.is_published ? "success" : "secondary"}>{r.is_published ? "Published" : "Draft"}</Badge></summary><div className="mt-5 space-y-4"><ResultForm result={r} /><ActionForm action={deleteResultAction} confirm="Delete this result? This cannot be undone."><input type="hidden" name="id" value={r.id} /><SubmitButton variant="outline">Delete result</SubmitButton></ActionForm></div></details>)}
    </CardContent></Card>
  </div>;
}
