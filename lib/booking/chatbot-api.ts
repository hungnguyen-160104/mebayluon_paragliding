// mbl-paragliding/lib/booking/chatbot-api.ts
import api from "@/lib/api";

export async function notifyTelegram(payload: any) {
  return api<{ ok: boolean; telegram?: Array<{ chat_id: string }> }>("/api/notify-telegram", {
    method: "POST",
    body: JSON.stringify({ payload }),
  });
}
