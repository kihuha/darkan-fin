import "server-only";

import { betterAuth } from "better-auth";
import { customSession } from "better-auth/plugins";
import { Pool } from "pg";
import db from "@/utils/db";
import { requireEnv } from "@/utils/server/env";

const database_url = requireEnv("DATABASE_URL");
const better_auth_secret = requireEnv("BETTER_AUTH_SECRET");
const better_auth_url = requireEnv("BETTER_AUTH_URL");

export const auth = betterAuth({
  database: new Pool({ connectionString: database_url }),
  secret: better_auth_secret,
  baseURL: better_auth_url,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
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
