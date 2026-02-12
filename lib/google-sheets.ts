import type { BookingState } from "@/types/frontend/booking"

export async function submitBookingToGoogleSheets(bookingState: BookingState): Promise<boolean> {
  try {
    // Replace with your actual Google Apps Script deployment URL
    const SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || ""

    if (!SCRIPT_URL) {
      console.warn("[v0] Google Sheets URL not configured")
      return false
    }

    const payload = {
      timestamp: new Date().toISOString(),
      guestCount: bookingState.guestCount,
      guests: bookingState.guests.map((guest) => ({
        name: guest.name,
        phone: guest.phone,
        email: guest.email,
        date: guest.date,
        timeSlot: guest.timeSlot,
        pickup: guest.pickup || "",
        note: guest.note || "",
      })),
      options: {
        transfer: bookingState.options.transfer,
        flycam: bookingState.options.flycam,
        luggage: bookingState.options.luggage,
      },
      discountCode: bookingState.discountCode?.code || "",
      subtotal: bookingState.subtotal,
      discountAmount: bookingState.discountAmount,
      total: bookingState.total,
    }

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("[v0] Booking submitted to Google Sheets successfully")
    return true
  } catch (error) {
    console.error("[v0] Failed to submit booking to Google Sheets:", error)
    return false
  }
}
