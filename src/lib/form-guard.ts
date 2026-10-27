import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SIGNUP_HONEYPOT } from "@/lib/constants";

/**
 * Invisible bot check for the sign-up form (replaces the captcha): a signed "issued at" ticket rendered
 * with the page, plus a hidden honeypot field. Bots that post instantly, reuse a ticket or fill the
 * honeypot are rejected; real students never see anything.
 */
const MIN_MS = 4 * 1000;
const MAX_MS = 3 * 60 * 60 * 1000;
export const HONEYPOT = SIGNUP_HONEYPOT;
const secret = () => process.env.CAPTCHA_SECRET || process.env.JWT_SECRET || "hm-maths-dev-secret";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createFormTicket(): string {
  const issued = Date.now();
  const nonce = randomBytes(9).toString("base64url");
  return `${issued}.${nonce}.${sign(`signup|${issued}|${nonce}`)}`;
}

export type TicketCheck = { ok: true; nonce: string } | { ok: false; reason: "invalid" | "fast" | "expired" };

export function checkFormTicket(ticket: string, honeypot: string): TicketCheck {
  if (honeypot.trim()) return { ok: false, reason: "invalid" };
  const [issuedStr, nonce, sig] = String(ticket).split(".");
  const issued = Number(issuedStr);
  if (!issued || !nonce || !sig) return { ok: false, reason: "invalid" };
  const expected = Buffer.from(sign(`signup|${issued}|${nonce}`));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return { ok: false, reason: "invalid" };
  const age = Date.now() - issued;
  if (age < MIN_MS) return { ok: false, reason: "fast" };
  if (age > MAX_MS) return { ok: false, reason: "expired" };
  return { ok: true, nonce };
}
