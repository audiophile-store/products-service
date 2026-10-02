import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({ connectionString });

pool.on("error", (error) => {
  console.error("Unexpected error on idle PostgreSQL connection", error);
});