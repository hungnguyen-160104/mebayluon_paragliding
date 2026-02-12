// mbl-paragliding/lib/booking/api.ts
import api from "@/lib/api";

export async function getLocations() {
  return api<{ ok: boolean; items: Array<{ key: string; name: string }> }>(
    "/api/booking/locations"
  );
}

export async function createBooking(payload: any, turnstileToken?: string) {
  return api<{
    ok: boolean;
    booking: any;
    message?: string;
    error?: string;
    errorCodes?: string[];
    status?: number;
  }>("/api/booking/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // IMPORTANT: backend của bạn có pickPayload(body) hỗ trợ body.payload
    body: JSON.stringify({ payload, turnstileToken }),
  });
}
