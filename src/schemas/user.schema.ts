import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 characters")
    .max(25, "Phone number cannot exceed 25 characters")
    .optional(),
  bio: z.string().trim().max(500, "Bio cannot exceed 500 characters").optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

