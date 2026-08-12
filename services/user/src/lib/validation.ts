import { z } from "zod";

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    bio: z.string().trim().max(500).optional(),
    university: z.string().trim().max(150).optional(),
    major: z.string().trim().max(150).optional(),
    yearOfStudy: z.number().int().min(1).max(10).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

// PUT semantics: the whole lifestyle object is replaced, so every field is
// required (matches the shape documented on UserProfile.lifestyle).
export const lifestyleSchema = z.object({
  sleepTime: z.enum(["early", "late"]),
  noiseLevel: z.enum(["quiet", "moderate", "loud"]),
  smoking: z.boolean(),
  pets: z.boolean(),
  guests: z.enum(["never", "occasionally", "frequently"]),
  cleaningFreq: z.enum(["daily", "weekly", "monthly"]),
});
export type LifestyleInput = z.infer<typeof lifestyleSchema>;

// D3 · Kriteria Penyewa — the owner's screening preferences.
//
// Every field maps onto something the platform can actually observe about an
// applicant today, so the criteria mean something when an owner reads an
// application next to them:
//   minDurationMonths      → booking.durationMonths
//   requireVerifiedAccount → users.status === ACTIVE
//   requireKtm / requireKtp→ booking.ktmUrl / booking.ktpUrl
//   allowSmoking / allowPets → the applicant's UserProfile.lifestyle
//   preferredUniversities  → UserProfile.university
//
// Deliberately absent: a minimum match score. Scoring needs ai-service, which
// does not exist — a stored threshold nothing computes against would be a
// setting that silently does nothing.
//
// PUT semantics like lifestyleSchema: the whole object is replaced, so every
// field is required and a partial payload is a 400 rather than a silent
// merge that leaves the owner unsure what is actually saved.
export const screeningCriteriaSchema = z.object({
  minDurationMonths: z.number().int().min(1).max(24),
  requireVerifiedAccount: z.boolean(),
  requireKtm: z.boolean(),
  requireKtp: z.boolean(),
  allowSmoking: z.boolean(),
  allowPets: z.boolean(),
  preferredUniversities: z.array(z.string().trim().min(1).max(150)).max(20),
  notes: z.string().trim().max(500),
});
export type ScreeningCriteriaInput = z.infer<typeof screeningCriteriaSchema>;

export const inviteParentSchema = z
  .object({
    parentEmail: z.string().trim().toLowerCase().email().optional(),
    parentPhone: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, "Invalid phone number")
      .optional(),
  })
  .refine((body) => body.parentEmail ?? body.parentPhone, {
    message: "Either parentEmail or parentPhone is required",
  });
export type InviteParentInput = z.infer<typeof inviteParentSchema>;
