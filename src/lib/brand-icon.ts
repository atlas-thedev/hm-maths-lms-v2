/** Changes whenever the uploaded logo or the tile choice changes, so browsers and Google reload the icons. */
export function iconVersion(b: { logoUrl: string; logoDarkUrl: string; logoOnTile: boolean }) {
  const s = `${b.logoUrl}|${b.logoDarkUrl}|${b.logoOnTile}`;
  return b.logoUrl ? [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36) : "0";
}
