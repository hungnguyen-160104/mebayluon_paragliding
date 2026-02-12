export interface GuestInfo {
  id: string
  name: string
  phone: string
  email: string
  date: string
  timeSlot: "morning" | "afternoon" | "evening"
  pickup?: string
  note?: string
}

export interface BookingOptions {
  transfer: boolean
  flycam: boolean
  luggage: boolean
}

export interface DiscountCode {
  code: string
  type: "percent" | "flat"
  value: number
}

export interface BookingState {
  step: number
  guestCount: number
  guests: GuestInfo[]
  options: BookingOptions
  discountCode?: DiscountCode
  subtotal: number
  discountAmount: number
  total: number
}
