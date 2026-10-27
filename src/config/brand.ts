/**
 * ════════════════════════════════════════════════════════════════
 *  Brand settings — name, logo and browser colours in one place.
 *  Colours of the site itself live in src/theme/theme.css.
 * ════════════════════════════════════════════════════════════════
 *
 * Swapping the logo:
 *   1. Put the file in public/brand/ (SVG or PNG with a transparent background works best),
 *      e.g. public/brand/logo.svg
 *   2. Set `logo.image` below to "/brand/logo.svg".
 *   3. Set `logo.onTile` to false if the image already has its own background.
 * Leave `logo.image` null to use the built-in "hm" mark (it follows the --brand-* colours automatically).
 *
 * Text shown to visitors (headings, taglines in both languages) stays in src/i18n/messages/*.
 */
export const BRAND = {
  /** Short name: header, tab title, app name on the phone home screen. */
  name: "HM Maths",
  /** Long name: install prompt, search results. */
  fullName: "HM Maths | Hasitha Madusanka",
  /** Teacher / organisation, used for search-engine data and the footer. */
  owner: "Hasitha Madusanka",
  description: "A/L Combined Mathematics classes by Hasitha Madusanka",

  logo: {
    /** Path to a custom logo file in /public (e.g. "/brand/logo.svg"), or null for the built-in mark. */
    image: null as string | null,
    /** Show the logo on the dark rounded tile (true) or on its own (false). */
    onTile: false,
  },

  /** Browser / phone status-bar colour and the installed-app splash colours. */
  themeColor: { light: "#faf8f6", dark: "#0c0a09" },
  appBackground: "#141414",
} as const;
