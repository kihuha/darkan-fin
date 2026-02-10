import pgPromise from "pg-promise";

const pgp = pgPromise({});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Use a global to check if instance already exists
let db = (global as any).db;

if (!db) {
  db = pgp(connectionString);
  (global as any).db = db;
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
