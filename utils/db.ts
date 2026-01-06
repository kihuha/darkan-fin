import pgPromise from "pg-promise";

// Initialize pg-promise
const pgp = pgPromise({
  // Optional: Add custom configuration here
  // Example: error logging, query logging, etc.
});

// Require DATABASE_URL for connection string clarity
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Create and export the database instance
const db = pgp(connectionString);

export default db;
