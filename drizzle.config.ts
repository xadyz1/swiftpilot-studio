import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    // SQLite: DATABASE_URL is a file path (e.g. ./data/app.db or file:./data/app.db)
    url: process.env.DATABASE_URL ?? "./data/app.db",
  },
});
