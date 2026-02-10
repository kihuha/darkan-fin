import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { customSession } from "better-auth/plugins";
import db from "./db";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    customSession(async ({ user, session }) => {
      try {
        const family = await db.query(
          `SELECT family_id FROM family_member WHERE user_id = $1`,
          [user.id],
        );

        if (!family || family.length === 0) {
          throw new Error("Family not found");
        }

        return {
          session,
          user: {
            ...user,
            family_id: family[0].family_id,
          },
        };
      } catch (error) {
        console.error("Error in customSession plugin:", error);
        throw error;
      }
    }),
  ],
});
