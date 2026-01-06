import pgPromise from "pg-promise";

// Initialize pg-promise
const pgp = pgPromise({
  // Optional: Add custom configuration here
  // Example: error logging, query logging, etc.
});

// Connection configuration
const connectionConfig = {
  host: "localhost",
  port: 5432,
  database: "darkanfin",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
};

// Create and export the database instance
const db = pgp(connectionConfig);

export default db;
