// lib/validation-schemas.ts
import { z } from 'zod';

/**
 * Common validation schemas used across the application
 */

// Auth schemas
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginPayload = z.infer<typeof LoginSchema>;

// Booking schemas
export const CreateBookingSchema = z.object({
  spotId: z.string().min(1, 'Spot ID is required'),
  guestName: z.string().min(2, 'Guest name must be at least 2 characters'),
  guestEmail: z.string().email('Invalid email address'),
  guestPhone: z.string().min(10, 'Phone number must be at least 10 characters'),
  numberOfGuests: z.number().int().min(1, 'At least 1 guest required'),
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format'),
  notes: z.string().optional(),
});

export type CreateBookingPayload = z.infer<typeof CreateBookingSchema>;

// Post/Blog schemas
export const CreatePostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  featuredImage: z.string().url('Invalid image URL').optional(),
  type: z.enum(['blog', 'product']).optional().default('blog'),
  published: z.boolean().default(false),
});

export type CreatePostPayload = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = CreatePostSchema.partial();
export type UpdatePostPayload = z.infer<typeof UpdatePostSchema>;

// Product schemas
export const CreateProductSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  price: z.number().positive('Price must be positive'),
  image: z.string().url('Invalid image URL').optional(),
  category: z.string().optional(),
  inStock: z.boolean().default(true),
});

export type CreateProductPayload = z.infer<typeof CreateProductSchema>;

// Chat message schema
export const ChatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

export type ChatMessagePayload = z.infer<typeof ChatMessageSchema>;

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sort: z.string().optional(),
});

export type PaginationPayload = z.infer<typeof PaginationSchema>;

/**
 * Safe parse helper - returns result instead of throwing
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error };
  }
  return { success: true, data: result.data };
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  errors.errors.forEach((error) => {
    const path = error.path.join('.');
    formatted[path] = error.message;
  });
  return formatted;
}
