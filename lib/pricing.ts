import type { BookingOptions, DiscountCode } from "@/types/frontend/booking"

export const BASE_FARE = 2_190_000
export const OPTION_PRICES = {
  transfer: 300_000,
  flycam: 400_000,
  luggage: 200_000,
}

export const DISCOUNT_CODES: Record<string, DiscountCode> = {
  WELCOME10: { code: "WELCOME10", type: "percent", value: 10 },
  SAPA2024: { code: "SAPA2024", type: "flat", value: 200_000 },
  EARLYBIRD: { code: "EARLYBIRD", type: "percent", value: 15 },
}

export function calculateTotal(
  guestCount: number,
  options: BookingOptions,
  discountCode?: DiscountCode,
): { subtotal: number; discountAmount: number; total: number } {
  let subtotal = guestCount * BASE_FARE

  if (options.transfer) {
    subtotal += OPTION_PRICES.transfer
  }
  if (options.flycam) {
    subtotal += guestCount * OPTION_PRICES.flycam
  }
  if (options.luggage) {
    subtotal += guestCount * OPTION_PRICES.luggage
  }

  let discountAmount = 0
  if (discountCode) {
    if (discountCode.type === "percent") {
      discountAmount = Math.round((subtotal * discountCode.value) / 100)
    } else {
      discountAmount = discountCode.value
    }
  }

  const total = Math.max(0, subtotal - discountAmount)

  return { subtotal, discountAmount, total }
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
}
