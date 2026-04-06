import { z } from "zod";

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).trim().optional(),
  avatarUrl: z.string().url().max(512).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
