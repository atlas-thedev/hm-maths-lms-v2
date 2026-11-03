"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/db/client";
import { useT } from "@/i18n/client";

/** Fired by the notifications page after it marks everything read, so the bell clears instantly. */
export const BELL_READ_EVENT = "hm:bell-read";
/** Fired whenever the user updates their avatar or profile name for 0ms real-time UI sync. */
export const PROFILE_SYNC_EVENT = "hm:profile-sync";
/** Fired after any form/server action mutation so all components and open tabs refresh immediately. */
export const DATA_MUTATED_EVENT = "hm:data-mutated";

const CHANNEL_NAME = "hm_realtime_v1";

export type ProfileSyncPayload = {
  avatar?: string | null;
  name?: string;
};

/** Broadcasts a profile change (avatar URL or name) immediately to the current page and all open tabs. */
export function broadcastProfileSync(payload: ProfileSyncPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProfileSyncPayload>(PROFILE_SYNC_EVENT, { detail: payload }));
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: PROFILE_SYNC_EVENT, payload });
    bc.close();
  } catch {
    // BroadcastChannel unsupported in older environments
  }
}

/** Broadcasts a data mutation so all open tabs refresh their server components in real time. */
export function broadcastDataMutation(scope = "all") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DATA_MUTATED_EVENT, { detail: { scope } }));
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: DATA_MUTATED_EVENT, scope });
    bc.close();
  } catch {
    // ignore
  }
}

/** Background check every ~30 s (±20% so thousands of tabs don't tick in step); focus / other tabs / actions check at once. */
const POLL_MS = 30_000;
/** A focus / visibility burst (alt-tab, tab switching) checks at most this often. */
const MIN_GAP_MS = 5_000;

/**
 * Real-time bell count + live portal/admin data synchronization.
 * - ONE small request (portal_pulse / admin_pulse) every ~30 seconds while the tab is visible, and right away on
 *   focus. It used to be two requests every 6 s per tab: with ~2,000 students online that alone was ~670 requests/s.
 * - Syncs across open browser tabs via BroadcastChannel.
 * - For students: tracks unread notifications + enrollment/order status changes and auto-refreshes.
 * - For admins/owners: tracks pending receipts, pending orders, and latest audit logs in real time.
 */
export function useBellCount(initial: number, enabled: boolean, area: "student" | "admin" = "student", initialPendingReceipts = 0) {
  const router = useRouter();
  const t = useT("common.notices");
  const [count, setCount] = useState(initial);
  const [pendingReceipts, setPendingReceipts] = useState(initialPendingReceipts);
  const lastBell = useRef(initial);
  const lastPending = useRef(initialPendingReceipts);
  const lastFingerprint = useRef<string | null>(null);

  useEffect(() => {
    lastBell.current = initial;
    setCount(initial);
  }, [initial]);

  useEffect(() => {
    lastPending.current = initialPendingReceipts;
    setPendingReceipts(initialPendingReceipts);
  }, [initialPendingReceipts]);

  useEffect(() => {
    const db = createClient();
    let stop = false;

    let lastRun = 0;
    let busy = false;
    const check = async (force = false) => {
      if (stop || busy || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastRun < MIN_GAP_MS) return;
      lastRun = now;
      busy = true;
      try {
        if (area === "student" && enabled) {
          const { data, error } = await db.rpc("portal_pulse");
          const pulse = data as { unread?: number; fp?: string } | null;
          if (error || !pulse) return;

          if (typeof pulse.unread === "number") {
            if (pulse.unread > lastBell.current) {
              toast.info(t("newNotification"));
              router.refresh();
            }
            lastBell.current = pulse.unread;
            setCount(pulse.unread);
          }

          const fp = pulse.fp ?? "";
          if (lastFingerprint.current !== null && lastFingerprint.current !== fp) {
            router.refresh();
          }
          lastFingerprint.current = fp;
        } else if (area === "admin") {
          const { data, error } = await db.rpc("admin_pulse");
          const pulse = data as { pending?: number; audit?: string } | null;
          if (error || !pulse) return;

          const pCount = Number(pulse.pending ?? 0);
          if (pCount > lastPending.current) {
            router.refresh();
          }
          lastPending.current = pCount;
          setPendingReceipts(pCount);

          const fp = `${pCount}:${pulse.audit ?? ""}`;
          if (lastFingerprint.current !== null && lastFingerprint.current !== fp) {
            router.refresh();
          }
          lastFingerprint.current = fp;
        }
      } finally {
        busy = false;
      }
    };
    const onWake = () => { void check(); };

    const cleared = () => {
      lastBell.current = 0;
      setCount(0);
    };

    // Initial fingerprint seed
    void check(true);

    // Self-rescheduling timer with jitter (a plain setInterval would put every tab on the same beat).
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      void check();
      timer = setTimeout(tick, POLL_MS * (0.8 + Math.random() * 0.4));
    };
    timer = setTimeout(tick, POLL_MS * (0.8 + Math.random() * 0.4));
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener(BELL_READ_EVENT, cleared);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (ev.data?.type === DATA_MUTATED_EVENT) {
          router.refresh();
          void check(true);
        }
      };
    } catch {
      bc = null;
    }

    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener(BELL_READ_EVENT, cleared);
      bc?.close();
    };
  }, [enabled, area, router, t]);

  return { bell: count, pendingReceipts };
}
