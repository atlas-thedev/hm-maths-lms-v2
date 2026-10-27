import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

/**
 * Student QR codes (PLAN.md Part 10). The QR holds only an opaque signed code — no name, phone or ID —
 * so a screenshot shared publicly reveals nothing. Format: "HM1.<uuid as base64url>.<signature>".
 * Only the server (which knows JWT_SECRET) can create or check a code.
 */
const PREFIX = "HM1";
const secret = () => process.env.JWT_SECRET || "hm-maths-dev-secret";
const sign = (body: string) => createHmac("sha256", secret()).update(`qr|${body}`).digest("base64url").slice(0, 22);

export function qrToken(userId: string): string {
  const body = Buffer.from(userId.replace(/-/g, ""), "hex").toString("base64url");
  return `${PREFIX}.${body}.${sign(body)}`;
}

/** Returns the student's user id, or null if the code is not one of ours / was tampered with. */
export function verifyQrToken(token: string): string | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, body, sig] = parts;
  const want = Buffer.from(sign(body)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const hex = Buffer.from(body, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The student's QR code as an SVG string (generated on the server). */
export function qrSvg(userId: string): Promise<string> {
  return QRCode.toString(qrToken(userId), { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
}
