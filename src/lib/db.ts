import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env");
}

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  globalThis.__sql ??
  postgres(connectionString, {
    ssl: "require",
    max: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;
