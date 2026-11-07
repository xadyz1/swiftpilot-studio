import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { InsertUser, User, users, studioState, leads } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _ready = false;

const DB_PATH = () => {
  const url = (process.env.DATABASE_URL ?? "./data/app.db").trim();
  return url.startsWith("file:") ? url.slice(5) : url;
};

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_ready) {
    _ready = true;
    try {
      const path = DB_PATH();
      if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
      const sqlite = new Database(path);
      sqlite.pragma("journal_mode = WAL");
      _db = drizzle(sqlite);
      // Auto-bootstrap schema — keeps local/dev setup a single command.
      sqlite.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        openId TEXT NOT NULL UNIQUE,
        name TEXT,
        email TEXT,
        loginMethod TEXT,
        passwordHash TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        lastSignedIn INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        brands INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        createdAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS studio_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES users(id),
        payload TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );`);
      // Migrations for already-initialized DBs.
      const cols = sqlite.prepare("SELECT name FROM pragma_table_info('users')").all().map((r: any) => r.name);
      if (!cols.includes('passwordHash')) sqlite.exec('ALTER TABLE users ADD COLUMN passwordHash TEXT');
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export const MASTER_EMAILS = new Set(
  (process.env.MASTER_EMAILS ?? "ivandro.work@gmail.com")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
);

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const isMaster = !!user.email && MASTER_EMAILS.has(user.email.toLowerCase());
  const role = user.role ?? (isMaster ? "admin" : "user");
  await db.insert(users).values({ openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, role, lastSignedIn: new Date(), updatedAt: new Date() })
    .onConflictDoUpdate({ target: users.openId, set: { name: user.name, email: user.email, loginMethod: user.loginMethod, role, lastSignedIn: new Date(), updatedAt: new Date() } });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return rows[0];
}

export async function listUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.createdAt);
}

export async function createUser(input: { email: string; name?: string; role?: "user" | "admin"; passwordHash?: string }): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const email = input.email.toLowerCase().trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("A valid email is required.");
  const existing = await getUserByEmail(email);
  if (existing) return existing;
  const openId = `email:${email}`;
  const role = input.role ?? (MASTER_EMAILS.has(email) ? "admin" : "user");
  await db.insert(users).values({ openId, email, name: input.name?.trim() || email.split("@")[0], loginMethod: "email", role, passwordHash: input.passwordHash ?? null, lastSignedIn: new Date() });
  const created = await getUserByEmail(email);
  if (!created) throw new Error("User could not be created.");
  return created;
}

export async function updateUser(id: number, patch: { name?: string; role?: "user" | "admin"; passwordHash?: string }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (patch.role === undefined && patch.name === undefined && patch.passwordHash === undefined) return;
  await db.update(users).set({ ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.role ? { role: patch.role } : {}), updatedAt: new Date() }).where(eq(users.id, id));
}

export async function saveStudioState(userId: number, payload: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(studioState).where(eq(studioState.userId, userId)).limit(1);
  if (rows[0]) {
    await db.update(studioState).set({ payload, updatedAt: new Date() }).where(eq(studioState.id, rows[0].id));
  } else {
    await db.insert(studioState).values({ userId, payload });
  }
}

export async function loadStudioState(userId: number): Promise<string | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(studioState).where(eq(studioState.userId, userId)).limit(1);
  return rows[0]?.payload;
}

export async function createLead(input: { name: string; email: string; brands: number; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(leads).values({ name: input.name, email: input.email, brands: input.brands, notes: input.notes ?? null });
}
export async function listLeads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(leads.createdAt);
}
