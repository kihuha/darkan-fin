import { z } from "zod";

export const familyInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email("A valid email address is required")
    .max(320, "Email must be less than 320 characters"),
});

export const familyInviteTokenSchema = z.object({
  token: z.string().min(10, "Invite token is required"),
});

export const familyInviteRevokeSchema = z.object({
  inviteId: z
    .string()
    .min(1, "Invite ID is required")
    .regex(/^\d+$/, "Invite ID is invalid"),
});

export type FamilyInviteInput = z.infer<typeof familyInviteSchema>;
export type FamilyInviteTokenInput = z.infer<typeof familyInviteTokenSchema>;
export type FamilyInviteRevokeInput = z.infer<typeof familyInviteRevokeSchema>;
