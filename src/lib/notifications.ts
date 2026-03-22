import { supabase } from "./supabase";

export type NotificationType = "request_approved" | "request_rejected" | "payment_success";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
}

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];

  const { data: requests } = await supabase
    .from("lead_requests")
    .select(
      `
      id,
      status,
      reviewed_at,
      leads (
        title,
        company_name
      )
    `
    )
    .eq("user_id", userId)
    .in("status", ["approved", "rejected"])
    .not("reviewed_at", "is", null)
    .order("reviewed_at", { ascending: false })
    .limit(20);

  for (const row of requests || []) {
    const lead = (row as any).leads;
    const title = lead?.title || "Lead Request";
    const company = lead?.company_name || "Unknown Company";
    const status = (row as any).status;

    notifications.push({
      id: `req_${(row as any).id}`,
      type: status === "approved" ? "request_approved" : "request_rejected",
      title: status === "approved" ? "Request Approved" : "Request Rejected",
      message:
        status === "approved"
          ? `Your request for "${title}" (${company}) was approved.`
          : `Your request for "${title}" (${company}) was rejected.`,
      createdAt: (row as any).reviewed_at,
    });
  }

  const { data: payments } = await supabase
    .from("purchased_leads")
    .select(
      `
      id,
      amount,
      paid_at,
      leads (
        title,
        company_name
      )
    `
    )
    .eq("user_id", userId)
    .eq("payment_status", "completed")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(20);

  for (const row of payments || []) {
    const lead = (row as any).leads;
    const title = lead?.title || "Lead";
    const company = lead?.company_name || "Unknown Company";
    notifications.push({
      id: `pay_${(row as any).id}`,
      type: "payment_success",
      title: "Payment Successful",
      message: `Payment completed for "${title}" (${company}).`,
      createdAt: (row as any).paid_at,
    });
  }

  return notifications
    .filter((n) => !!n.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);
}

