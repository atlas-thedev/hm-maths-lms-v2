/*
 * Every user-facing string lives in the JSON files next to this file:
 *   messages/<locale>/<namespace>.json
 * Add a namespace by creating the JSON in BOTH folders and registering it below.
 * Missing Sinhala keys automatically fall back to English.
 */
import enCommon from "./en/common.json";
import enLanding from "./en/landing.json";
import enAuth from "./en/auth.json";
import enPortal from "./en/portal.json";
import enAdmin from "./en/admin.json";
import enErrors from "./en/errors.json";
import siCommon from "./si/common.json";
import siLanding from "./si/landing.json";
import siAuth from "./si/auth.json";
import siPortal from "./si/portal.json";
import siAdmin from "./si/admin.json";
import siErrors from "./si/errors.json";
import type { Locale } from "../config";
import { mergeMessages, type Messages } from "../translate";

const en: Messages = { common: enCommon, landing: enLanding, auth: enAuth, portal: enPortal, admin: enAdmin, errors: enErrors };
const si: Messages = { common: siCommon, landing: siLanding, auth: siAuth, portal: siPortal, admin: siAdmin, errors: siErrors };

export const MESSAGES: Record<Locale, Messages> = { en, si: mergeMessages(en, si) };
