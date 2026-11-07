import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { StudioError } from './safety';
import { createUser, getUserByEmail, listUsers, updateUser, getDb, MASTER_EMAILS, loadStudioState, saveStudioState } from '../db';
import type { User } from '../../drizzle/schema';

const COOKIE = 'sp_session';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const SECRET = (process.env.MANUS_JWT_SECRET ?? process.env.SESSION_SECRET ?? 'swiftpilot-local-dev-secret').trim();

type SessionPayload = { uid: number; email: string; exp: number };

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');
const sign = (payload: string) => createHmac('sha256', SECRET).update(payload).digest('base64url');

function issueCookie(res: Response, user: User): void {
  const payload: SessionPayload = { uid: user.id, email: user.email ?? '', exp: Date.now() + MAX_AGE };
  const raw = b64(JSON.stringify(payload));
  res.setHeader('Set-Cookie', `${COOKIE}=${raw}.${sign(raw)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE / 1000}`);
}

export function readSession(req: Request): SessionPayload | null {
  const header = req.headers.cookie ?? '';
  const raw = header.split(';').map(p => p.trim()).find(p => p.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [data, sig] = raw.split('.');
  if (!data || !sig) return null;
  const expected = sign(data);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(unb64(data)) as SessionPayload;
    return typeof payload.exp === 'number' && payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

const loginSchema = z.object({ email: z.string().trim().email().max(320), name: z.string().trim().max(120).optional() }).strict();

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new StudioError('Enter a valid email address.', 400);
  const email = parsed.data.email.toLowerCase();
  const user = await createUser({ email, name: parsed.data.name, role: MASTER_EMAILS.has(email) ? 'admin' : 'user' });
  issueCookie(res, user);
  res.json({ authenticated: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export function logout(_req: Request, res: Response): void {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ authenticated: false });
}

export async function me(req: Request, res: Response): Promise<void> {
  const db = await getDb();
  if (!db) { res.json({ authenticated: false, mode: 'local' }); return; }
  const session = readSession(req);
  if (!session) { res.json({ authenticated: false, mode: 'server' }); return; }
  const user = await getUserByEmail(session.email);
  if (!user) { res.json({ authenticated: false, mode: 'server' }); return; }
  res.json({ authenticated: true, mode: 'server', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export function requireSession(req: Request): SessionPayload {
  const session = readSession(req);
  if (!session) throw new StudioError('Sign in required.', 401);
  return session;
}

export async function requireAdminUser(req: Request): Promise<User> {
  const session = requireSession(req);
  const user = await getUserByEmail(session.email);
  if (!user || (user.role !== 'admin' && !MASTER_EMAILS.has(user.email?.toLowerCase() ?? ''))) {
    throw new StudioError('Master access required.', 403);
  }
  return user;
}

const userPatch = z.object({ id: z.number().int().positive(), name: z.string().trim().max(120).optional(), role: z.enum(['user', 'admin']).optional() }).strict();
const userCreate = z.object({ email: z.string().trim().email().max(320), name: z.string().trim().max(120).optional(), role: z.enum(['user', 'admin']).optional() }).strict();

export async function adminUsers(req: Request, res: Response): Promise<void> {
  const session = requireSession(req);
  const self = await getUserByEmail(session.email);
  if (!self || (self.role !== 'admin' && !MASTER_EMAILS.has(self.email?.toLowerCase() ?? ''))) throw new StudioError('Master access required.', 403);
  if (req.method === 'GET') {
    const rows = await listUsers();
    res.json({ users: rows.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, loginMethod: u.loginMethod, lastSignedIn: u.lastSignedIn })) });
    return;
  }
  if (req.method === 'POST') {
    const parsed = userCreate.safeParse(req.body);
    if (!parsed.success) throw new StudioError('Provide a valid email (and optionally name/role).', 400);
    const created = await createUser({ email: parsed.data.email.toLowerCase(), name: parsed.data.name, role: parsed.data.role });
    res.status(201).json({ user: { id: created.id, name: created.name, email: created.email, role: created.role } });
    return;
  }
  if (req.method === 'PATCH') {
    const parsed = userPatch.safeParse(req.body);
    if (!parsed.success) throw new StudioError('Provide the user id and the fields to update.', 400);
    // A master can never demote itself — protects against lockouts.
    if (self.id === parsed.data.id && parsed.data.role === 'user' && MASTER_EMAILS.has(self.email?.toLowerCase() ?? '')) {
      throw new StudioError('The master account cannot be demoted.', 400);
    }
    await updateUser(parsed.data.id, { name: parsed.data.name, role: parsed.data.role });
    res.json({ ok: true });
    return;
  }
  res.status(405).end();
}

export async function studioStateHandler(req: Request, res: Response): Promise<void> {
  const session = requireSession(req);
  const user = await getUserByEmail(session.email);
  if (!user) throw new StudioError('Account not found.', 401);
  if (req.method === 'GET') {
    const payload = await loadStudioState(user.id);
    res.json({ payload: payload ? JSON.parse(payload) : null });
    return;
  }
  if (req.method === 'PUT') {
    const body = req.body;
    if (!body || typeof body.payload !== 'object') throw new StudioError('Provide the workspace payload.', 400);
    const text = JSON.stringify(body.payload);
    if (text.length > 2 * 1024 * 1024) throw new StudioError('The workspace payload is too large (2MB max).', 400);
    await saveStudioState(user.id, text);
    res.json({ ok: true });
    return;
  }
  res.status(405).end();
}
