import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Unique identifier for the user's login (email for built-in auth, openId for OAuth). */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Per-user studio workspace persistence. The entire SiteProject list +
 * active project id are serialized as JSON so the browser-local planner can
 * sync to a shared store later without schema churn.
 */
export const studioState = sqliteTable("studio_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  /** Serialized { projects: SiteProject[], activeProjectId: string } payload. */
  payload: text("payload").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type StudioState = typeof studioState.$inferSelect;
export type InsertStudioState = typeof studioState.$inferInsert;
