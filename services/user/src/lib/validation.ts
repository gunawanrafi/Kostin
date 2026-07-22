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
