import { z } from "zod";

export const createBookingSchema = z.object({
  listingId: z.string().min(1),
  roomId: z.string().min(1).optional(),
  checkIn: z.coerce.date(),
  durationMonths: z.number().int().min(1).max(24),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const documentQuerySchema = z.object({
  type: z.enum(["KTM", "KTP"]),
});
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;

export const listBookingsQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListBookingsQueryInput = z.infer<typeof listBookingsQuerySchema>;

// Session-recovery draft: every field optional since the client saves
// whatever partial state it has after each wizard step (room -> date ->
// duration -> documents -> payment -> agreement).
export const bookingDraftSchema = z.object({
  listingId: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  checkIn: z.coerce.date().optional(),
  durationMonths: z.number().int().min(1).max(24).optional(),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.string().trim().max(50).optional(),
  step: z.string().trim().max(50).optional(),
});
export type BookingDraftInput = z.infer<typeof bookingDraftSchema>;
