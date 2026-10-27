"use client";
import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { createDeveloperAction, removeDeveloperAction, signOutAction } from "../actions";

export function CreateDeveloperForm() {
  return (
    <ActionForm action={createDeveloperAction} resetOnSuccess className="space-y-3">
      <Field label="Name" htmlFor="d-name"><Input id="d-name" name="full_name" required minLength={2} /></Field>
      <Field label="E-mail (login)" htmlFor="d-email"><Input id="d-email" name="email" type="email" required autoComplete="off" /></Field>
      <Field label="Password (new accounts)" htmlFor="d-pw" hint="At least 10 characters."><PasswordInput id="d-pw" name="password" autoComplete="new-password" /></Field>
      <SubmitButton block pendingText="Saving…">Add developer</SubmitButton>
    </ActionForm>
  );
}

export function RemoveDeveloperButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={removeDeveloperAction} confirm={`Remove developer access from ${name}? The account stays as an owner.`}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="danger-soft">Remove</SubmitButton>
    </ActionForm>
  );
}

export function SignOutForm({ scope, label }: { scope: "students" | "everyone"; label: string }) {
  return (
    <ActionForm action={signOutAction} confirm={`${label}? They will need to sign in again.`}>
      <input type="hidden" name="scope" value={scope} />
      <SubmitButton block variant={scope === "everyone" ? "destructive" : "outline"} pendingText="Signing out…">{label}</SubmitButton>
    </ActionForm>
  );
}
