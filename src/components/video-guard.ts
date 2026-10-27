/*
 * Watermark guard for the video player (browser only).
 *
 * The watermark is drawn by this module — not by React — so it can be put back the moment someone deletes it in the
 * inspector. Every ~0.6 s (and on any change inside the player) it checks that the watermark is still there, still
 * shows the right text, and is really visible (display, opacity, size, filters, hidden parents). Small damage is repaired
 * silently; repeated damage (3 strikes within a minute) locks the player until the page is reloaded.
 * It can also notice open developer tools and pause the video while they are open.
 *
 * Honest limits: this runs in the viewer's own browser, so a determined person can still defeat it, and the YouTube
 * address itself can never be hidden from the Network tab. It stops casual removal and leaves a trail.
 */

export type GuardMessages = { tamper: string; devtools: string };

export interface GuardOptions {
  host: HTMLElement;          // the picture area the watermark lies over
  root: HTMLElement;          // the whole player (lock screen goes here)
  label: string;
  enforce: boolean;           // students: lock on tamper / pause on devtools. Staff: repair only.
  messages: GuardMessages;
  pause: () => void;
  report: (kind: "tamper" | "devtools") => void;
  /** Taps / double-taps on the picture (the guard owns the click shield, so deleting it in the inspector does nothing). */
  onTap: () => void;
  onDoubleTap: () => void;
}

const COUNT = 24;
const IMPORTANT = (css: string) => css.replace(/;/g, " !important;");

function build(host: HTMLElement, label: string): HTMLElement {
  const wide = host.clientWidth >= 640;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("data-player-watermark", "");
  el.style.cssText = IMPORTANT(
    `position:absolute;inset:-20%;z-index:7;pointer-events:none;display:grid;visibility:visible;opacity:.26;overflow:hidden;filter:none;mix-blend-mode:normal;clip-path:none;mask:none;transform:rotate(-18deg);place-items:center;` +
    `grid-template-columns:repeat(${wide ? 4 : 3},minmax(0,1fr));grid-template-rows:repeat(6,minmax(0,1fr));`,
  );
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement("span");
    s.textContent = label;
    s.style.cssText = IMPORTANT(
      `white-space:nowrap;display:block;visibility:visible;opacity:1;color:#fff;font:700 ${wide ? 14 : 10}px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;` +
      `text-shadow:0 0 2px rgba(0,0,0,.9),0 1px 3px rgba(0,0,0,.8);`,
    );
    el.appendChild(s);
  }
  host.appendChild(el);
  return el;
}

/** null = fine, otherwise why not. */
function inspect(node: HTMLElement, host: HTMLElement, label: string): "missing" | "edited" | "style" | "hidden" | "size" | null {
  if (!node.isConnected || node.parentElement !== host) return "missing";
  if (node.childElementCount !== COUNT || node.textContent !== label.repeat(COUNT)) return "edited";
  const cs = getComputedStyle(node);
  if (cs.display !== "grid" || cs.visibility !== "visible" || parseFloat(cs.opacity) < 0.12 || cs.filter !== "none"
    || cs.mixBlendMode !== "normal" || cs.clipPath !== "none" || cs.position !== "absolute") return "style";
  for (const child of Array.from(node.children)) {
    const s = getComputedStyle(child);
    if (s.display === "none" || s.visibility !== "visible" || parseFloat(s.opacity) < 0.5 || s.color !== "rgb(255, 255, 255)" || parseFloat(s.fontSize) < 8) return "style";
  }
  for (let e: HTMLElement | null = host; e && e !== document.body; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) < 0.5) return "hidden";
  }
  const r = node.getBoundingClientRect(), h = host.getBoundingClientRect();
  if (h.width > 0 && (r.width < h.width * 0.9 || r.height < h.height * 0.9)) return "size";
  return null;
}

/** Loads /hm-probe.js once (a plain file: the build strips `debugger` from bundled code). */
let probeLoading = false;
function ensureProbe() {
  if (probeLoading || typeof window === "undefined") return;
  probeLoading = true;
  const el = document.createElement("script");
  el.src = "/hm-probe.js";
  el.async = true;
  document.head.appendChild(el);
}

function devtoolsOpen(): boolean {
  let open = false;
  // The console only reads a logged element's properties while it is open.
  const probe = new Image();
  Object.defineProperty(probe, "id", { get() { open = true; return ""; } });
  console.debug(probe);
  return open;
}

/** The click shield: a transparent layer over the YouTube iframe, so no click ever reaches YouTube (logo, title, "watch on…"). */
function buildShield(host: HTMLElement, tap: () => void, dbl: () => void): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("data-player-shield", "");
  el.style.cssText = IMPORTANT("position:absolute;inset:0;z-index:5;display:block;visibility:visible;opacity:1;pointer-events:auto;background:transparent;");
  el.addEventListener("click", tap);
  el.addEventListener("dblclick", dbl);
  host.appendChild(el);
  return el;
}

function lockIframe(host: HTMLElement) {
  const frame = host.querySelector("iframe");
  if (frame && frame.style.getPropertyValue("pointer-events") !== "none") frame.style.setProperty("pointer-events", "none", "important");
}

function curtain(root: HTMLElement, text: string): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-player-lock", "");
  el.textContent = text;
  el.style.cssText = IMPORTANT("position:absolute;inset:0;z-index:90;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font:600 15px/1.6 system-ui,sans-serif;");
  root.appendChild(el);
  return el;
}

export function startWatermarkGuard(o: GuardOptions): { stop: () => void } {
  let node = build(o.host, o.label);
  let shield = buildShield(o.host, o.onTap, o.onDoubleTap);
  let locked = false, lockEl: HTMLElement | null = null;
  let strikes: number[] = [], badTicks = 0, devHits = 0, devOpen = false, devReported = false, devEl: HTMLElement | null = null;
  const startedAt = Date.now();

  const strike = () => {
    const now = Date.now();
    strikes = [...strikes.filter((t) => now - t < 60_000), now];
    if (o.enforce && strikes.length >= 3 && !locked) {
      locked = true; o.report("tamper"); o.pause();
      lockEl = curtain(o.root, o.messages.tamper);
    }
  };

  const tick = () => {
    if (locked) {                       // keep it locked even if the curtain is deleted
      o.pause();
      if (!lockEl || !lockEl.isConnected) lockEl = curtain(o.root, o.messages.tamper);
      return;
    }
    lockIframe(o.host);
    if (!shield.isConnected || shield.parentElement !== o.host || getComputedStyle(shield).pointerEvents !== "auto" || getComputedStyle(shield).display === "none") {
      shield.remove(); shield = buildShield(o.host, o.onTap, o.onDoubleTap);
    }
    if (Date.now() - startedAt < 2000) return;   // let the page finish animating in
    const bad = inspect(node, o.host, o.label);
    if (bad === "missing" || bad === "edited") {
      node.remove(); node = build(o.host, o.label); badTicks = 0; strike();
    } else if (bad) {
      badTicks++;
      if (bad === "style") { node.style.cssText = ""; node.remove(); node = build(o.host, o.label); }
      if (badTicks >= 3) { badTicks = 0; strike(); }
    } else badTicks = 0;
  };

  const watchDev = () => {
    if (!o.enforce || locked) return;
    // Developer tools are not a concern on phones, and a paused debugger is itself the deterrent on desktops.
    if (window.matchMedia("(pointer: coarse)").matches) return;
    ensureProbe();
    const probe = (window as unknown as { __hmProbe?: () => void }).__hmProbe;
    const t0 = performance.now();
    probe?.();
    const slow = !!probe && performance.now() - t0 > 200;
    const hit = devtoolsOpen() || slow;
    devHits = hit ? devHits + 1 : 0;
    const open = devHits >= (slow ? 1 : 1);
    if (open && !devOpen) {
      devOpen = true; o.pause();
      if (!devReported) { devReported = true; o.report("devtools"); }
      devEl = curtain(o.root, o.messages.devtools);
    } else if (open) { o.pause(); if (devEl && !devEl.isConnected) devEl = curtain(o.root, o.messages.devtools); }
    else if (!open && devOpen) { devOpen = false; devEl?.remove(); devEl = null; }
  };

  const mo = new MutationObserver(tick);
  mo.observe(o.host, { childList: true, subtree: true, attributes: true, characterData: true });
  mo.observe(o.root, { childList: true });
  const i1 = window.setInterval(tick, 600);
  const i2 = window.setInterval(watchDev, 1500);
  return { stop: () => { mo.disconnect(); clearInterval(i1); clearInterval(i2); node.remove(); shield.remove(); lockEl?.remove(); devEl?.remove(); } };
}
