import { redirect } from "next/navigation";

// Notices now live on the notifications (bell) page.
export default function NoticesPage() {
  redirect("/dashboard/notifications?filter=updates");
}
