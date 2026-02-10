import pgPromise, { type IDatabase, type IMain } from "pg-promise";

const pgp: IMain = pgPromise({});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

declare global {
  var db: IDatabase<unknown> | undefined;
}

const globalDb = global.db;
const db: IDatabase<unknown> = globalDb ?? pgp(connectionString);

if (!globalDb) {
  global.db = db;
  console.log("Created new database instance");
} else {
  console.log("Using existing database instance");
}

export const closeDbConnection = async () => {
  try {
    await pgp.end();
    console.log("Database connection closed successfully.");
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
};

export default db;
