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

/**
 * Real-time bell count + live portal/admin data synchronization.
 * - Polls every 6 seconds while the tab is visible (and immediately on focus/visibilitychange).
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

    const check = async () => {
      if (stop || document.visibilityState !== "visible") return;

      if (area === "student" && enabled) {
        const [{ data: bellData, error: bellErr }, { data: enrData }] = await Promise.all([
          db.rpc("unread_notification_count"),
          db.from("enrollments").select("id, status").order("created_at", { ascending: false }).limit(5),
        ]);

        if (!bellErr && typeof bellData === "number") {
          if (bellData > lastBell.current) {
            toast.info(t("newNotification"));
            router.refresh();
          }
          lastBell.current = bellData;
          setCount(bellData);
        }

        const fp = JSON.stringify((enrData ?? []).map((r: { id: string; status: string }) => `${r.id}:${r.status}`));
        if (lastFingerprint.current !== null && lastFingerprint.current !== fp) {
          router.refresh();
        }
        lastFingerprint.current = fp;
      } else if (area === "admin") {
        const [{ count: pCount }, { data: latestAudit }] = await Promise.all([
          db.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "pending"),
          db.from("admin_audit_logs").select("id").order("created_at", { ascending: false }).limit(1),
        ]);

        if (typeof pCount === "number") {
          if (pCount > lastPending.current) {
            router.refresh();
          }
          lastPending.current = pCount;
          setPendingReceipts(pCount);
        }

        const auditId = latestAudit?.[0]?.id ?? "";
        const fp = `${pCount ?? 0}:${auditId}`;
        if (lastFingerprint.current !== null && lastFingerprint.current !== fp) {
          router.refresh();
        }
        lastFingerprint.current = fp;
      }
    };

    const cleared = () => {
      lastBell.current = 0;
      setCount(0);
    };

    // Initial fingerprint seed
    check();

    const id = setInterval(check, 6_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener(BELL_READ_EVENT, cleared);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (ev.data?.type === DATA_MUTATED_EVENT) {
          router.refresh();
          check();
        }
      };
    } catch {
      bc = null;
    }

    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener(BELL_READ_EVENT, cleared);
      bc?.close();
    };
  }, [enabled, area, router, t]);

  return { bell: count, pendingReceipts };
}
