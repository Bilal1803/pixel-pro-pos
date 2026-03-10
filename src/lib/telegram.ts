import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget Telegram notification.
 * Never throws — silently logs errors.
 */
export async function sendTelegramNotification(
  companyId: string,
  eventType: "sale" | "shift_open" | "shift_close" | "cash",
  message: string
) {
  try {
    await supabase.functions.invoke("send-telegram", {
      body: { company_id: companyId, event_type: eventType, message },
    });
  } catch (e) {
    console.warn("Telegram notification failed:", e);
  }
}
