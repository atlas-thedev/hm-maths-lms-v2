"use client";
import { useEffect } from "react";
import { BELL_READ_EVENT } from "@/components/notices-realtime";
import { markNotificationsReadAction } from "../actions";

/** Opening the page marks everything read (the list keeps its "New" highlights until the next visit). */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (!hasUnread) return;
    markNotificationsReadAction().then((ok) => { if (ok) window.dispatchEvent(new Event(BELL_READ_EVENT)); });
  }, [hasUnread]);
  return null;
}
