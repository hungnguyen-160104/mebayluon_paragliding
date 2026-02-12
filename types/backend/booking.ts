// types/backend/booking.ts
/**
 * Booking related types for backend
 */

export interface Booking {
  _id: string;
  spotId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numberOfGuests: number;
  startDate: Date;
  endDate: Date;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  totalPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingPayload {
  spotId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numberOfGuests: number;
  startDate: Date;
  endDate: Date;
  notes?: string;
}
