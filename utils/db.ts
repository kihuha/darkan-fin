import "server-only";

import pgPromise, { type IDatabase, type IMain } from "pg-promise";
import { requireEnv } from "@/utils/server/env";
import { logError, logInfo } from "@/utils/server/logger";

const pgp: IMain = pgPromise({});

const connectionString = requireEnv("DATABASE_URL");

declare global {
  var db: IDatabase<unknown> | undefined;
}

const globalDb = global.db;
const db: IDatabase<unknown> = globalDb ?? pgp(connectionString);

if (!globalDb) {
  global.db = db;
  logInfo("db.client.created");
} else {
  logInfo("db.client.reused");
}

export const closeDbConnection = async () => {
  try {
    await pgp.end();
    logInfo("db.client.closed");
  } catch (error) {
    logError("db.client.close_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
};

export default db;
