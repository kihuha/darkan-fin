import "server-only";

import { betterAuth } from "better-auth";
import { bearer, customSession } from "better-auth/plugins";
import { Pool } from "pg";
import db from "@/utils/db";
import { requireEnv } from "@/utils/server/env";

const database_url = requireEnv("DATABASE_URL");
const better_auth_secret = requireEnv("BETTER_AUTH_SECRET");
const better_auth_url = requireEnv("BETTER_AUTH_URL");

const trustedOriginsFromEnv = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const trustedOrigins = Array.from(
  new Set(
    [
      better_auth_url,
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
      process.env.APP_URL,
      process.env.EXPO_PUBLIC_AUTH_ORIGIN,
      ...trustedOriginsFromEnv,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://192.168.*.*:*",
      "http://172.20.*.*:*",
      "http://10.*.*.*:*",
      "exp://**",
    ].filter((origin): origin is string => Boolean(origin)),
  ),
);

export const auth = betterAuth({
  database: new Pool({ connectionString: database_url }),
  secret: better_auth_secret,
  baseURL: better_auth_url,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.tx(async (t) => {
            const { id: familyId } = await t.one<{ id: string }>(
              `INSERT INTO family (name) VALUES ($1) RETURNING id`,
              [`${user.name}'s Family`],
            );

            await t.none(
              `INSERT INTO family_member (family_id, user_id, role)
               VALUES ($1, $2, 'admin')`,
              [familyId, user.id],
            );

            await t.none(
              `INSERT INTO category (family_id, name, type, amount, repeats, description)
               VALUES ($1, 'Uncategorized', 'expense', 0, FALSE, 'Default category for uncategorized items')
               ON CONFLICT DO NOTHING`,
              [familyId],
            );
          });
        },
      },
    },
  },
  plugins: [
    bearer(),
    customSession(async ({ user, session }) => {
      const family = await db.oneOrNone<{ family_id: string }>(
        `SELECT family_id
         FROM family_member
         WHERE user_id = $1`,
        [user.id],
      );

      return {
        session,
        user: {
          ...user,
          family_id: family?.family_id ?? null,
        },
      };
    }),
  ],
});
