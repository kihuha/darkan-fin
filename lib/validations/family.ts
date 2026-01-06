import { z } from "zod";

const email_format_schema = z.email("A valid email address is required");

export const family_invite_schema = z.object({
  email: z
    .string()
    .trim()
    .max(320, "Email must be less than 320 characters")
    .refine(
      (value) => email_format_schema.safeParse(value).success,
      "A valid email address is required",
    )
    .transform((value) => value.toLowerCase()),
});

export const family_invite_token_schema = z.object({
  token: z.string().trim().min(10, "Invite token is required").max(512),
});

export const family_invite_revoke_schema = z.object({
  invite_id: z.coerce
    .number({ error: "Invite ID is required" })
    .int("Invite ID is invalid")
    .positive("Invite ID is invalid"),
});

export type FamilyInviteInput = z.infer<typeof family_invite_schema>;
export type FamilyInviteTokenInput = z.infer<typeof family_invite_token_schema>;
export type FamilyInviteRevokeInput = z.infer<typeof family_invite_revoke_schema>;

// Backwards-compatible aliases while callers migrate to snake_case names.
export const familyInviteSchema = family_invite_schema;
export const familyInviteTokenSchema = family_invite_token_schema;
export const familyInviteRevokeSchema = family_invite_revoke_schema;
